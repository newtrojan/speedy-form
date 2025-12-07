"""
Vehicle Lookup Service - Orchestrates all vehicle/part lookup sources.

This service coordinates lookups across:
1. AUTOBOLT (primary) - VIN/Plate to Parts with calibration data
2. NHTSA (fallback) - VIN to Year/Make/Model only
3. NAGS (backup) - Year/Make/Model to Parts (no calibration)

The service determines if a quote needs CSR review based on:
- Multiple parts returned → needs_part_selection
- No calibration data (NHTSA/NAGS path) → needs_calibration_review
- Incomplete data → needs_manual_review
"""

import logging
from typing import Literal

from core.exceptions import AutoboltAPIError
from vehicles.services.autobolt_client import AutoboltClient
from vehicles.services.nags_client import NAGSClient, NAGSLookupError
from vehicles.services.nhtsa_client import NHTSAClient, NHTSAAPIError
from vehicles.services.types import GlassPart, VehicleLookupResult

logger = logging.getLogger(__name__)


class VehicleLookupService:
    """
    Orchestrates vehicle and parts lookups from multiple sources.

    Lookup chain:
    1. AUTOBOLT (paid, cached) - provides VIN decode + parts + calibration
    2. NHTSA (free) - provides VIN decode only (Year/Make/Model)
    3. NAGS (read-only DB) - provides parts by Year/Make/Model (no calibration)

    Results include flags indicating if CSR review is needed.
    """

    def __init__(self):
        self.autobolt = AutoboltClient()
        self.nhtsa = NHTSAClient()
        self.nags = NAGSClient()

    def lookup_by_vin(
        self,
        vin: str,
        glass_type: str = "windshield",
        country: str = "US",
    ) -> VehicleLookupResult:
        """
        Look up vehicle and parts by VIN.

        Tries AUTOBOLT first, falls back to NHTSA + NAGS if unavailable.

        Args:
            vin: 17-character VIN
            glass_type: Type of glass ("windshield", "back_glass", etc.)
            country: Country code ("US" or "CA")

        Returns:
            VehicleLookupResult with vehicle info, parts, and review flags
        """
        # Map glass_type to AUTOBOLT kind
        kind = self._glass_type_to_kind(glass_type)

        # Try AUTOBOLT first (primary source)
        try:
            logger.info(f"Attempting AUTOBOLT VIN lookup for {vin}")
            result = self.autobolt.decode_vin(vin, kind=kind, country=country)

            # Enrich parts with NAGS pricing
            result = self._enrich_with_nags_pricing(result)

            logger.info(
                f"AUTOBOLT success: {result.year} {result.make} {result.model}, "
                f"{len(result.parts)} parts"
            )
            return result

        except AutoboltAPIError as e:
            logger.warning(f"AUTOBOLT failed for {vin}: {e}")
            # Fall through to NHTSA

        # AUTOBOLT unavailable - try NHTSA + NAGS fallback
        return self._fallback_lookup_by_vin(vin, glass_type)

    def lookup_by_plate(
        self,
        plate: str,
        state: str,
        glass_type: str = "windshield",
        country: str = "US",
    ) -> VehicleLookupResult:
        """
        Look up vehicle and parts by license plate.

        Only AUTOBOLT supports plate-to-VIN lookup. If unavailable,
        raises an error (cannot fall back for plate lookup).

        Args:
            plate: License plate number
            state: 2-letter state code
            glass_type: Type of glass ("windshield", "back_glass", etc.)
            country: Country code ("US" or "CA")

        Returns:
            VehicleLookupResult with vehicle info, parts, and review flags

        Raises:
            VehicleLookupError: If plate lookup fails
        """
        kind = self._glass_type_to_kind(glass_type)

        try:
            logger.info(f"Attempting AUTOBOLT plate lookup for {plate} ({state})")
            result = self.autobolt.decode_plate(plate, state, kind=kind, country=country)

            # Enrich parts with NAGS pricing
            result = self._enrich_with_nags_pricing(result)

            logger.info(
                f"AUTOBOLT plate success: {result.year} {result.make} {result.model}, "
                f"VIN: {result.vin}, {len(result.parts)} parts"
            )
            return result

        except AutoboltAPIError as e:
            logger.error(f"AUTOBOLT plate lookup failed for {plate}: {e}")
            # Cannot fall back for plate lookup - NHTSA doesn't support plate
            raise VehicleLookupError(
                f"Plate lookup unavailable: {e}",
                error_type="api_error",
                recoverable=False,
            )

    def lookup_by_vehicle_info(
        self,
        year: int,
        make: str,
        model: str,
        glass_type: str = "windshield",
    ) -> VehicleLookupResult:
        """
        Look up parts by Year/Make/Model directly.

        Uses NAGS database only. No calibration data available.

        Args:
            year: Vehicle year
            make: Vehicle make
            model: Vehicle model
            glass_type: Type of glass

        Returns:
            VehicleLookupResult with parts (needs_calibration_review=True)
        """
        logger.info(f"NAGS direct lookup for {year} {make} {model} ({glass_type})")

        parts = self.nags.lookup_parts_by_vehicle(year, make, model, glass_type)

        # Build result
        result = VehicleLookupResult(
            source="nags",
            vin="",  # No VIN in direct lookup
            year=year,
            make=make,
            model=model,
            body_style=None,
            parts=parts,
            needs_part_selection=len(parts) > 1,
            needs_calibration_review=True,  # Always true for NAGS-only
            needs_manual_review=len(parts) == 0,
            confidence="medium" if parts else "low",
            review_reason=self._build_review_reason(parts, has_calibration=False),
        )

        return result

    def _fallback_lookup_by_vin(
        self,
        vin: str,
        glass_type: str,
    ) -> VehicleLookupResult:
        """
        Fallback lookup using NHTSA (vehicle info) + NAGS (parts).

        This path ALWAYS requires CSR review due to missing calibration data.
        """
        logger.info(f"Attempting NHTSA + NAGS fallback for {vin}")

        # Step 1: Get vehicle info from NHTSA
        try:
            nhtsa_result = self.nhtsa.decode_vin(vin)
        except NHTSAAPIError as e:
            logger.error(f"NHTSA fallback failed for {vin}: {e}")
            raise VehicleLookupError(
                f"Vehicle lookup failed: {e}",
                error_type="not_found",
                recoverable=False,
            )

        # Step 2: Get parts from NAGS using NHTSA vehicle info
        if nhtsa_result.year and nhtsa_result.make and nhtsa_result.model:
            try:
                parts = self.nags.lookup_parts_by_vehicle(
                    nhtsa_result.year,
                    nhtsa_result.make,
                    nhtsa_result.model,
                    glass_type,
                )
                nhtsa_result.parts = parts

                # Update flags based on NAGS results
                if len(parts) > 1:
                    nhtsa_result.needs_part_selection = True
                if len(parts) == 0:
                    nhtsa_result.needs_manual_review = True
                    nhtsa_result.confidence = "low"

                # Build review reason
                nhtsa_result.review_reason = self._build_review_reason(
                    parts, has_calibration=False
                )

                logger.info(
                    f"NHTSA + NAGS fallback success: {nhtsa_result.year} "
                    f"{nhtsa_result.make} {nhtsa_result.model}, {len(parts)} parts"
                )

            except NAGSLookupError as e:
                logger.warning(f"NAGS lookup failed: {e}")
                nhtsa_result.needs_manual_review = True
                nhtsa_result.confidence = "low"
                nhtsa_result.review_reason = f"NAGS lookup failed: {e}"

        return nhtsa_result

    def _enrich_with_nags_pricing(
        self,
        result: VehicleLookupResult,
    ) -> VehicleLookupResult:
        """
        Enrich AUTOBOLT parts with NAGS list pricing.

        AUTOBOLT provides calibration but not list price.
        NAGS provides list price for pricing calculations.
        """
        for part in result.parts:
            if part.nags_part_number and part.nags_list_price is None:
                try:
                    enriched = self.nags.enrich_autobolt_part(part)
                    # Update in place (part is a reference)
                except Exception as e:
                    logger.warning(
                        f"Failed to enrich part {part.nags_part_number} with NAGS: {e}"
                    )

        return result

    def _glass_type_to_kind(self, glass_type: str) -> str:
        """Map our glass_type to AUTOBOLT kind parameter."""
        kind_map = {
            "windshield": "Windshield",
            "back_glass": "Back",
            "door_front_left": "Door",
            "door_front_right": "Door",
            "door_rear_left": "Door",
            "door_rear_right": "Door",
            "vent_front_left": "Vent",
            "vent_front_right": "Vent",
            "vent_rear_left": "Vent",
            "vent_rear_right": "Vent",
        }
        return kind_map.get(glass_type, "Windshield")

    def _build_review_reason(
        self,
        parts: list[GlassPart],
        has_calibration: bool,
    ) -> str | None:
        """Build the review reason string based on lookup results."""
        reasons = []

        if len(parts) > 1:
            reasons.append(f"Multiple parts available ({len(parts)} options)")

        if len(parts) == 0:
            reasons.append("No parts found")

        if not has_calibration and parts:
            reasons.append("No calibration data (NHTSA/NAGS fallback)")

        # Check for parts missing pricing
        missing_price = [p for p in parts if p.nags_list_price is None]
        if missing_price:
            reasons.append(f"{len(missing_price)} part(s) missing NAGS pricing")

        return "; ".join(reasons) if reasons else None


class VehicleLookupError(Exception):
    """Exception raised for vehicle lookup errors."""

    def __init__(
        self,
        message: str,
        error_type: Literal[
            "invalid_vin",
            "invalid_plate",
            "not_found",
            "api_error",
            "rate_limited",
            "timeout",
        ] = "api_error",
        recoverable: bool = True,
        retry_after: int | None = None,
    ):
        super().__init__(message)
        self.error_type = error_type
        self.recoverable = recoverable
        self.retry_after = retry_after
