"""
AUTOBOLT API Client with digest authentication.

This client handles VIN decoding, plate-to-VIN lookup, and part lookups
using the AUTOBOLT API. All successful responses are cached to avoid
repeat paid API calls.

Authentication uses HMAC-SHA256 digest:
- Header: AutoBoltAuth version="1", timestamp=..., digest=..., nonce=..., userid=...
- Digest: base64(sha256(nonce + timestamp + sharedSecret))
"""

import hashlib
import base64
import time
import string
import random
import logging

import requests
from django.conf import settings

from core.exceptions import AutoboltAPIError
from vehicles.models import AutoboltAPICache
from vehicles.services.types import GlassPart, VehicleLookupResult

logger = logging.getLogger(__name__)


class AutoboltClient:
    """
    Client for the AUTOBOLT vehicle data API.

    Handles authentication, caching, and response parsing.
    """

    BASE_URL = "https://api.myautobolt.com"
    DEFAULT_TIMEOUT = 30
    CACHE_TTL_DAYS = 30

    def __init__(self):
        self.user_id = getattr(settings, "AUTOBOLT_USER_ID", "")
        self.shared_secret = getattr(settings, "AUTOBOLT_API_KEY", "")
        self.cache_ttl_days = getattr(
            settings, "AUTOBOLT_CACHE_TTL_DAYS", self.CACHE_TTL_DAYS
        )

        if not self.user_id or not self.shared_secret:
            logger.warning(
                "AUTOBOLT credentials not configured. "
                "Set AUTOBOLT_USER_ID and AUTOBOLT_API_KEY in settings."
            )

    def _generate_nonce(self, length: int = 20) -> str:
        """Generate a random alphanumeric nonce."""
        chars = string.ascii_letters + string.digits
        return "".join(random.choice(chars) for _ in range(length))

    def _generate_digest(self, nonce: str, timestamp: int) -> str:
        """Generate HMAC-SHA256 digest for authentication."""
        unhashed = nonce + str(timestamp) + self.shared_secret
        hash_bytes = hashlib.sha256(unhashed.encode("utf-8")).digest()
        return base64.b64encode(hash_bytes).decode("utf-8")

    def _generate_auth_header(self) -> str:
        """Generate the AutoBoltAuth authentication header."""
        timestamp = int(time.time())
        nonce = self._generate_nonce()
        digest = self._generate_digest(nonce, timestamp)
        return (
            f'AutoBoltAuth version="1", timestamp={timestamp}, '
            f'digest="{digest}", nonce="{nonce}", userid="{self.user_id}"'
        )

    def _get_headers(self) -> dict[str, str]:
        """Get request headers with authentication."""
        return {
            "Authorization": self._generate_auth_header(),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        payload: dict | None = None,
        timeout: int | None = None,
    ) -> tuple[int, dict | None]:
        """
        Make an authenticated request to the AUTOBOLT API.

        Returns:
            Tuple of (status_code, response_json or None)
        """
        url = f"{self.BASE_URL}{endpoint}"
        timeout = timeout or self.DEFAULT_TIMEOUT

        try:
            if method.upper() == "POST":
                response = requests.post(
                    url,
                    headers=self._get_headers(),
                    json=payload,
                    timeout=timeout,
                )
            else:
                response = requests.get(
                    url,
                    headers=self._get_headers(),
                    timeout=timeout,
                )

            # Handle different status codes
            if response.status_code == 200:
                return response.status_code, response.json()
            elif response.status_code == 204:
                # No content - VIN/plate not found
                logger.info(f"AUTOBOLT returned 204 for {endpoint}")
                return response.status_code, None
            elif response.status_code == 401:
                logger.error("AUTOBOLT authentication failed")
                raise AutoboltAPIError("Authentication failed - check API credentials")
            elif response.status_code == 422:
                logger.warning(f"AUTOBOLT validation error for {endpoint}")
                return response.status_code, None
            elif response.status_code == 429:
                logger.warning("AUTOBOLT rate limit exceeded")
                raise AutoboltAPIError("Rate limit exceeded - try again later")
            else:
                logger.error(
                    f"AUTOBOLT request failed: {response.status_code} - {response.text}"
                )
                raise AutoboltAPIError(
                    f"API request failed with status {response.status_code}"
                )

        except requests.exceptions.Timeout:
            logger.error(f"AUTOBOLT request timed out for {endpoint}")
            raise AutoboltAPIError("Request timed out")
        except requests.exceptions.RequestException as e:
            logger.error(f"AUTOBOLT request failed: {e}")
            raise AutoboltAPIError(f"Request failed: {e}")

    def _parse_parts(self, data: dict, source: str = "autobolt") -> list[GlassPart]:
        """Parse parts from AUTOBOLT response into GlassPart objects."""
        parts = []
        part_ids = data.get("parts", [])
        parts_by_id = data.get("partsById", {})

        for part_id in part_ids:
            if part_id not in parts_by_id:
                continue

            part_data = parts_by_id[part_id]

            # Extract calibration type
            calibration_type = None
            calibrations = part_data.get("calibrations", [])
            if calibrations:
                # May have multiple calibrations - join them
                cal_names = [c["calibrationType"]["name"] for c in calibrations]
                if len(cal_names) == 1:
                    calibration_type = cal_names[0]
                elif len(cal_names) > 1:
                    calibration_type = "Dual: " + " + ".join(cal_names)

            # Extract features
            features = [f["name"] for f in part_data.get("features", [])]

            # Get NAGS part number (amNumber is the full part number with color suffix)
            # e.g., "FW05555GTYN" -> nags_part_number = "FW05555", full = "FW05555GTYN"
            full_part_number = part_data.get("amNumber", "")
            # NAGS glass ID is the first 7 chars of amNumber (strip color suffix like GTYN)
            nags_part_number = full_part_number[:7] if full_part_number else ""

            # Also extract prefix_cd for pricing calculations (first 2 chars, e.g., "FW")
            prefix_cd = full_part_number[:2] if full_part_number else ""

            # Extract photo URLs
            # Try multiple possible key names from Autobolt API
            photo_urls = (
                part_data.get("photoUrls", [])
                or part_data.get("photos", [])
                or part_data.get("images", [])
                or part_data.get("imageUrls", [])
            )

            # Log for debugging if photos are present
            if photo_urls:
                logger.info(f"Found {len(photo_urls)} photos for part {nags_part_number}")
            else:
                # Log available keys to help identify correct key name
                available_keys = [k for k in part_data.keys() if 'photo' in k.lower() or 'image' in k.lower()]
                if available_keys:
                    logger.warning(
                        f"Part {nags_part_number}: No photoUrls found, but found related keys: {available_keys}"
                    )
                else:
                    logger.debug(f"Part {nags_part_number}: No photo URLs in response")

            glass_part = GlassPart(
                nags_part_number=nags_part_number,
                full_part_number=full_part_number,
                prefix_cd=prefix_cd,
                calibration_type=calibration_type,
                features=features,
                photo_urls=photo_urls,
                source=source,
            )
            parts.append(glass_part)

        return parts

    def decode_vin(
        self,
        vin: str,
        kind: str = "Windshield",
        country: str = "US",
    ) -> VehicleLookupResult:
        """
        Decode a VIN to get vehicle info and glass parts.

        Args:
            vin: 17-character VIN
            kind: Glass type ("Windshield" or "Back")
            country: Country code ("US" or "CA")

        Returns:
            VehicleLookupResult with vehicle info and parts
        """
        # Check cache first
        cached = AutoboltAPICache.get_cached_response(
            request_type="vin_decode",
            request_key=vin.upper(),
            country=country,
            kind=kind,
        )
        if cached:
            logger.info(f"Cache hit for VIN {vin}")
            return self._cached_to_result(cached)

        # Make API request
        payload = {"country": country, "vin": vin.upper(), "kind": kind}
        status_code, data = self._make_request("POST", "/v2/decode", payload)

        # Cache the response
        if data:
            AutoboltAPICache.cache_response(
                request_type="vin_decode",
                request_key=vin.upper(),
                country=country,
                kind=kind,
                response_data=data,
                http_status=status_code,
                ttl_days=self.cache_ttl_days,
            )

        if not data:
            raise AutoboltAPIError(f"Vehicle not found for VIN: {vin}")

        # Parse response
        return self._parse_response(data, vin=vin.upper())

    def decode_plate(
        self,
        plate_number: str,
        state: str,
        kind: str = "Windshield",
        country: str = "US",
    ) -> VehicleLookupResult:
        """
        Decode a license plate to get VIN, vehicle info, and glass parts.

        Args:
            plate_number: License plate number
            state: 2-letter state code
            kind: Glass type ("Windshield" or "Back")
            country: Country code ("US" or "CA")

        Returns:
            VehicleLookupResult with vehicle info and parts
        """
        # Normalize plate
        plate_clean = plate_number.replace(" ", "").replace("-", "").upper()
        state_upper = state.upper()
        cache_key = f"{plate_clean}:{state_upper}"

        # Check cache first
        cached = AutoboltAPICache.get_cached_response(
            request_type="plate_decode",
            request_key=cache_key,
            country=country,
            kind=kind,
        )
        if cached:
            logger.info(f"Cache hit for plate {plate_clean}")
            return self._cached_to_result(cached)

        # Make API request
        payload = {
            "country": country,
            "plate": {"number": plate_clean, "state": state_upper},
            "kind": kind,
        }
        status_code, data = self._make_request("POST", "/v2/decode-plate", payload)

        # Cache the response
        if data:
            AutoboltAPICache.cache_response(
                request_type="plate_decode",
                request_key=cache_key,
                country=country,
                kind=kind,
                response_data=data,
                http_status=status_code,
                ttl_days=self.cache_ttl_days,
            )

        if not data:
            raise AutoboltAPIError(
                f"Vehicle not found for plate: {plate_number} ({state})"
            )

        # Parse response
        return self._parse_response(data, plate=plate_clean, state=state_upper)

    def _parse_response(
        self,
        data: dict,
        vin: str | None = None,
        plate: str | None = None,
        state: str | None = None,
    ) -> VehicleLookupResult:
        """Parse AUTOBOLT API response into VehicleLookupResult."""
        # Extract VIN (may be in response for plate decode)
        response_vin = data.get("vin", vin or "")

        # Parse parts
        parts = self._parse_parts(data, source="autobolt")

        # Build result
        result = VehicleLookupResult(
            source="autobolt",
            vin=response_vin,
            year=data.get("year", 0),
            make=data.get("make", ""),
            model=data.get("model", ""),
            body_style=data.get("bodyStyle"),
            parts=parts,
            raw_response=data,
        )

        return result

    def _cached_to_result(self, cached: AutoboltAPICache) -> VehicleLookupResult:
        """Convert a cached response to VehicleLookupResult."""
        data = cached.response_data

        # Parse parts from cached data
        parts = self._parse_parts(data, source="cache")

        return VehicleLookupResult(
            source="cache",
            vin=cached.vin or data.get("vin", ""),
            year=cached.year or data.get("year", 0),
            make=cached.make or data.get("make", ""),
            model=cached.model or data.get("model", ""),
            body_style=data.get("bodyStyle"),
            parts=parts,
            raw_response=data,
        )
