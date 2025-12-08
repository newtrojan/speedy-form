"""
NHTSA API Client for free VIN decoding.

This is a fallback when AUTOBOLT API is unavailable. It provides only
vehicle identification (Year, Make, Model, Body Style) - NO parts data
and NO calibration information.

IMPORTANT: Quotes generated from NHTSA fallback will require CSR review
because calibration data is unavailable.
"""

import logging
from typing import Any

import requests

from vehicles.services.types import VehicleLookupResult

logger = logging.getLogger(__name__)


class NHTSAClient:
    """
    Client for the free NHTSA VIN decoding API.

    Used as a fallback when AUTOBOLT is unavailable. Returns only
    basic vehicle info - parts must be looked up separately via NAGS.
    """

    BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles"
    DEFAULT_TIMEOUT = 15

    def decode_vin(self, vin: str) -> VehicleLookupResult:
        """
        Decode a VIN using the free NHTSA API.

        Args:
            vin: 17-character VIN

        Returns:
            VehicleLookupResult with basic vehicle info (no parts)

        Raises:
            NHTSAAPIError: If the API call fails
        """
        url = f"{self.BASE_URL}/DecodeVinValues/{vin.upper()}?format=json"

        try:
            response = requests.get(url, timeout=self.DEFAULT_TIMEOUT)
            response.raise_for_status()
            data = response.json()

            # NHTSA returns results in a specific format
            results = data.get("Results", [])
            if not results:
                logger.warning(f"NHTSA returned no results for VIN {vin}")
                raise NHTSAAPIError(f"No vehicle data found for VIN: {vin}")

            vehicle_data = results[0]

            # Check for error codes in response
            error_code = vehicle_data.get("ErrorCode", "")
            if error_code and error_code != "0":
                # Error codes like "1" mean partial data, "6" means invalid VIN
                error_text = vehicle_data.get("ErrorText", "Unknown error")
                if "6" in str(error_code):
                    logger.warning(f"NHTSA invalid VIN: {vin} - {error_text}")
                    raise NHTSAAPIError(f"Invalid VIN: {vin}")
                # Log but continue for partial data
                logger.info(f"NHTSA partial data for VIN {vin}: {error_text}")

            # Parse the response
            return self._parse_response(vehicle_data, vin.upper())

        except requests.exceptions.Timeout:
            logger.error(f"NHTSA request timed out for VIN {vin}")
            raise NHTSAAPIError("NHTSA API request timed out")
        except requests.exceptions.RequestException as e:
            logger.error(f"NHTSA request failed: {e}")
            raise NHTSAAPIError(f"NHTSA API request failed: {e}")

    def _parse_response(self, data: dict[str, Any], vin: str) -> VehicleLookupResult:
        """Parse NHTSA response into VehicleLookupResult."""
        # Extract year - NHTSA returns as string
        year_str = data.get("ModelYear", "")
        try:
            year = int(year_str) if year_str else 0
        except ValueError:
            year = 0

        # Extract make and model
        make = data.get("Make", "") or ""
        model = data.get("Model", "") or ""

        # Extract body style - NHTSA has multiple fields
        body_class = data.get("BodyClass", "") or ""
        vehicle_type = data.get("VehicleType", "") or ""
        body_style = body_class or vehicle_type or None

        # Extract additional info that might be useful
        trim = data.get("Trim", "") or None
        series = data.get("Series", "") or None

        # NHTSA doesn't provide parts or calibration data
        # Quotes from this path MUST be flagged for CSR review
        result = VehicleLookupResult(
            source="nhtsa+nags",  # Will need NAGS for parts
            vin=vin,
            year=year,
            make=make,
            model=model,
            body_style=body_style,
            trim=trim if trim else (series if series else None),
            parts=[],  # No parts from NHTSA - must use NAGS
            needs_part_selection=False,  # Will be set after NAGS lookup
            needs_calibration_review=True,  # ALWAYS true for NHTSA path
            needs_manual_review=False,
            confidence="medium",  # Lower confidence without calibration data
            review_reason="No calibration data available (NHTSA/NAGS fallback)",
            raw_response=data,
        )

        # Validate we have minimum required data
        if not year or not make or not model:
            result.needs_manual_review = True
            result.confidence = "low"
            result.review_reason = (
                f"Incomplete vehicle data from NHTSA "
                f"(Year: {year}, Make: {make}, Model: {model})"
            )

        return result

    def get_vin_details(self, vin: str) -> dict[str, Any]:
        """
        Get raw VIN details for debugging/inspection.

        Returns the full NHTSA response without parsing.
        """
        url = f"{self.BASE_URL}/DecodeVinValues/{vin.upper()}?format=json"

        try:
            response = requests.get(url, timeout=self.DEFAULT_TIMEOUT)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"NHTSA request failed: {e}")
            raise NHTSAAPIError(f"NHTSA API request failed: {e}")


class NHTSAAPIError(Exception):
    """Exception raised for NHTSA API errors."""

    pass
