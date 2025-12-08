"""
NAGS Database Client for vehicle parts lookup.

This service queries the read-only NAGS MySQL database to find glass parts
by Year/Make/Model when AUTOBOLT is unavailable. It also provides pricing
data for NAGS part numbers returned by AUTOBOLT.

IMPORTANT: NAGS has NO calibration data. Quotes using NAGS fallback for
vehicle lookup will require CSR review.
"""

import logging
from decimal import Decimal
from typing import Any

from vehicles.nags_models import (
    NAGSGlass,
    NAGSGlassConfig,
    NAGSGlassPrice,
    NAGSMake,
    NAGSMakeModel,
    NAGSVehicle,
    NAGSVehicleGlass,
)
from vehicles.services.types import GlassPart

logger = logging.getLogger(__name__)


class NAGSClient:
    """
    Client for querying the NAGS MySQL database.

    Provides:
    - Vehicle-to-parts lookup by Year/Make/Model
    - Part pricing lookup by NAGS part number
    - Part specifications (features, tube qty, etc.)
    """

    def lookup_parts_by_vehicle(
        self,
        year: int,
        make: str,
        model: str,
        glass_type: str = "windshield",
    ) -> list[GlassPart]:
        """
        Look up glass parts for a vehicle by Year/Make/Model.

        Args:
            year: Vehicle year
            make: Vehicle make (e.g., "Nissan")
            model: Vehicle model (e.g., "Rogue")
            glass_type: Glass type filter ("windshield", "back_glass", etc.)

        Returns:
            List of GlassPart objects with NAGS data (no calibration)
        """
        try:
            # Step 1: Find the make ID
            make_id = self._find_make_id(make)
            if not make_id:
                logger.warning(f"NAGS make not found: {make}")
                return []

            # Step 2: Find the model ID
            model_id = self._find_model_id(make_id, model)
            if not model_id:
                logger.warning(f"NAGS model not found: {model} for make {make}")
                return []

            # Step 3: Find matching vehicles
            vehicles = self._find_vehicles(make_id, model_id, year)
            if not vehicles:
                logger.warning(f"NAGS vehicles not found: {year} {make} {model}")
                return []

            # Step 4: Get glass parts for all matching vehicles
            parts = []
            veh_ids = [v.veh_id for v in vehicles]
            glass_parts = self._get_vehicle_glass_parts(veh_ids, glass_type)

            for vg in glass_parts:
                glass_part = self._build_glass_part(vg)
                if glass_part:
                    parts.append(glass_part)

            logger.info(
                f"NAGS found {len(parts)} parts for {year} {make} {model} ({glass_type})"
            )
            return parts

        except Exception as e:
            logger.error(f"NAGS lookup failed: {e}")
            return []

    def get_part_price(
        self,
        nags_part_number: str,
        color_code: str = "GT",
        region: str = "U",
    ) -> Decimal | None:
        """
        Get the current list price for a NAGS part number.

        Args:
            nags_part_number: NAGS glass ID (e.g., "FW03898")
            color_code: Glass color code (GT=Green Tint, default)
            region: Region code (U=US)

        Returns:
            NAGS list price or None if not found
        """
        try:
            # Get the most recent active price
            price_record = (
                NAGSGlassPrice.objects.using("nags")
                .filter(
                    nags_glass_id=nags_part_number,
                    prc_status_cd="A",
                    region_cd=region,
                )
                .order_by("-eff_dt")
                .first()
            )

            if price_record:
                return price_record.prc

            # Try without color filter
            price_record = (
                NAGSGlassPrice.objects.using("nags")
                .filter(
                    nags_glass_id=nags_part_number,
                    prc_status_cd="A",
                    region_cd=region,
                )
                .order_by("-eff_dt")
                .first()
            )

            if price_record:
                return price_record.prc

            logger.warning(f"NAGS price not found for {nags_part_number}")
            return None

        except Exception as e:
            logger.error(f"NAGS price lookup failed for {nags_part_number}: {e}")
            return None

    def get_glass_config(
        self,
        nags_part_number: str,
    ) -> dict[str, Any]:
        """
        Get glass configuration from NAGS_GLASS_CFG.

        Returns labor hours and hardware flags for pricing calculations.

        Args:
            nags_part_number: NAGS glass ID (e.g., "FW05555")

        Returns:
            Dict with nags_labor, moulding_required, clips_required
        """
        defaults = {
            "nags_labor": Decimal("1.5"),
            "moulding_required": False,
            "clips_required": False,
            "atchmnt_dsc": "",
        }

        try:
            config = (
                NAGSGlassConfig.objects.using("nags")
                .filter(nags_glass_id=nags_part_number)
                .first()
            )

            if config:
                return {
                    "nags_labor": config.nags_labor or Decimal("1.5"),
                    "moulding_required": config.mlding_flag == "Y",
                    "clips_required": config.clips_flag == "Y",
                    "atchmnt_dsc": config.atchmnt_dsc or "",
                }

            logger.debug(f"NAGS glass config not found for {nags_part_number}")
            return defaults

        except Exception as e:
            logger.error(f"NAGS glass config lookup failed for {nags_part_number}: {e}")
            return defaults

    def get_part_details(self, nags_part_number: str) -> dict[str, Any] | None:
        """
        Get full details for a NAGS part number.

        Returns specifications, pricing, and features.
        """
        try:
            glass = (
                NAGSGlass.objects.using("nags")
                .filter(nags_glass_id=nags_part_number)
                .first()
            )

            if not glass:
                return None

            # Get pricing
            price = self.get_part_price(nags_part_number)

            # Build features list
            features = self._extract_features(glass)

            return {
                "nags_glass_id": glass.nags_glass_id,
                "prefix_cd": glass.prefix_cd,
                "list_price": str(price) if price else None,
                "tube_qty": str(glass.tube_qty) if glass.tube_qty else "1.5",
                "features": features,
                "is_domestic": glass.is_domestic,
                "is_windshield": glass.is_windshield,
                "superseded_by": glass.superseding_nags_glass_id,
            }

        except Exception as e:
            logger.error(f"NAGS part details lookup failed for {nags_part_number}: {e}")
            return None

    def enrich_autobolt_part(self, part: GlassPart) -> GlassPart:
        """
        Enrich an AUTOBOLT part with NAGS pricing and configuration data.

        AUTOBOLT provides calibration but not list price or labor hours.
        NAGS provides:
        - List price (NAGS_GLASS_PRC)
        - Tube qty (NAGS_GLASS)
        - Labor hours (NAGS_GLASS_CFG.NAGS_LABOR)
        - Hardware flags (NAGS_GLASS_CFG.MLDING_FLAG, CLIPS_FLAG)

        Args:
            part: GlassPart from AUTOBOLT with nags_part_number

        Returns:
            Same GlassPart with NAGS data added
        """
        if not part.nags_part_number:
            return part

        # Get NAGS list price
        price = self.get_part_price(part.nags_part_number)
        if price:
            part.nags_list_price = price

        # Get tube qty if not set
        if part.tube_qty == Decimal("1.5"):  # Default value
            details = self.get_part_details(part.nags_part_number)
            if details and details.get("tube_qty"):
                try:
                    part.tube_qty = Decimal(details["tube_qty"])
                except (ValueError, TypeError):
                    pass

        # Get glass config (labor hours, hardware flags)
        config = self.get_glass_config(part.nags_part_number)
        part.nags_labor = config["nags_labor"]
        part.moulding_required = config["moulding_required"]
        part.clips_required = config["clips_required"]

        logger.debug(
            f"Enriched {part.nags_part_number}: price=${part.nags_list_price}, "
            f"labor={part.nags_labor}h, moulding={part.moulding_required}, "
            f"clips={part.clips_required}"
        )

        return part

    def _find_make_id(self, make: str) -> int | None:
        """Find the NAGS make ID for a make name."""
        # Try exact match first
        make_record = (
            NAGSMake.objects.using("nags")
            .filter(make_nm__iexact=make)
            .first()
        )
        if make_record:
            return make_record.make_id

        # Try partial match
        make_record = (
            NAGSMake.objects.using("nags")
            .filter(make_nm__icontains=make)
            .first()
        )
        if make_record:
            return make_record.make_id

        return None

    def _find_model_id(self, make_id: int, model: str) -> int | None:
        """Find the NAGS model ID for a model name within a make."""
        # Try exact match first
        model_record = (
            NAGSMakeModel.objects.using("nags")
            .filter(make_id=make_id, model_nm__iexact=model)
            .first()
        )
        if model_record:
            return model_record.model_id

        # Try partial match
        model_record = (
            NAGSMakeModel.objects.using("nags")
            .filter(make_id=make_id, model_nm__icontains=model)
            .first()
        )
        if model_record:
            return model_record.model_id

        return None

    def _find_vehicles(
        self,
        make_id: int,
        model_id: int,
        year: int,
    ) -> list[NAGSVehicle]:
        """Find matching vehicles in NAGS."""
        return list(
            NAGSVehicle.objects.using("nags")
            .filter(make_id=make_id, model_id=model_id, year=year)
        )

    def _get_vehicle_glass_parts(
        self,
        veh_ids: list[int],
        glass_type: str,
    ) -> list[NAGSVehicleGlass]:
        """Get glass parts for vehicles, filtered by glass type."""
        # Map glass type to prefix codes
        prefix_map = {
            "windshield": ("DW", "FW"),  # Domestic/Foreign Windshield
            "back_glass": ("DB", "FB"),  # Domestic/Foreign Back
            "door_front_left": ("DT", "FT"),  # Door glass (tempered)
            "door_front_right": ("DT", "FT"),
            "door_rear_left": ("DT", "FT"),
            "door_rear_right": ("DT", "FT"),
        }

        prefixes = prefix_map.get(glass_type, ("DW", "FW"))

        # Get vehicle-glass mappings
        veh_glass = NAGSVehicleGlass.objects.using("nags").filter(
            veh_id__in=veh_ids,
            nags_glass_id__startswith=prefixes[0][:1],  # Filter by first char (D or F)
        )

        # Further filter by prefix
        return [
            vg for vg in veh_glass
            if vg.nags_glass_id[:2] in prefixes
        ]

    def _build_glass_part(self, veh_glass: NAGSVehicleGlass) -> GlassPart | None:
        """Build a GlassPart from NAGS vehicle-glass mapping."""
        try:
            # Get glass details
            glass = (
                NAGSGlass.objects.using("nags")
                .filter(nags_glass_id=veh_glass.nags_glass_id)
                .first()
            )

            if not glass:
                return None

            # Get pricing
            price = self.get_part_price(veh_glass.nags_glass_id)

            # Get glass config (labor hours, hardware flags)
            config = self.get_glass_config(veh_glass.nags_glass_id)

            # Extract features
            features = self._extract_features(glass)

            # Parse additional labor
            additional_labor = ""
            if veh_glass.additional_nags_labor:
                try:
                    labor_hours = float(veh_glass.additional_nags_labor)
                    if labor_hours > 0:
                        additional_labor = f"+{labor_hours} hrs"
                except ValueError:
                    additional_labor = veh_glass.additional_nags_labor

            return GlassPart(
                nags_part_number=glass.nags_glass_id,
                full_part_number=None,  # NAGS doesn't have color suffix
                prefix_cd=glass.prefix_cd,
                nags_list_price=price,
                calibration_type=None,  # NAGS has NO calibration data
                calibration_required=False,  # Unknown from NAGS
                features=features,
                tube_qty=glass.tube_qty or Decimal("1.5"),
                nags_labor=config["nags_labor"],
                additional_labor=additional_labor,
                moulding_required=config["moulding_required"],
                clips_required=config["clips_required"],
                source="nags",
            )

        except Exception as e:
            logger.error(f"Failed to build GlassPart for {veh_glass.nags_glass_id}: {e}")
            return None

    def _extract_features(self, glass: NAGSGlass) -> list[str]:
        """Extract feature list from NAGS glass record."""
        features = []

        if glass.ant_flag == "Y":
            features.append("Antenna")
        if glass.encap_flag == "Y":
            features.append("Encapsulated")
        if glass.hds_up_disp_flag == "Y":
            features.append("Heads-Up Display")
        if glass.heated_flag == "Y":
            features.append("Heated")
        if glass.slider_flag == "Y":
            features.append("Slider")
        if glass.solar_flag == "Y":
            features.append("Solar")

        return features


class NAGSLookupError(Exception):
    """Exception raised for NAGS lookup errors."""

    pass
