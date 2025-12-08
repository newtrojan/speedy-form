"""
Pricing service for calculating auto glass quotes.

Uses PricingProfile for shop-specific pricing rules and
VehicleLookupResult for vehicle/part information.
"""

import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING

from pricing.models import PricingProfile

# Price bounds for auto-send validation
REPLACEMENT_PRICE_MIN = Decimal("500.00")
REPLACEMENT_PRICE_MAX = Decimal("1200.00")

if TYPE_CHECKING:
    from shops.models import Shop
    from vehicles.services.types import GlassPart, VehicleLookupResult

logger = logging.getLogger(__name__)


class PricingError(Exception):
    """Base exception for pricing errors."""

    pass


@dataclass
class ChipRepairPricing:
    """Result of a chip repair pricing calculation."""

    # Shop info
    shop_id: int
    shop_name: str

    # Pricing breakdown
    chip_count: int
    chip_repair_cost: Decimal
    mobile_fee: Decimal
    subtotal: Decimal
    tax: Decimal
    total: Decimal

    # Line items for quote
    line_items: list[dict]

    # Flags
    needs_manual_review: bool = False
    confidence: str = "high"
    review_reason: str | None = None

    @property
    def needs_review(self) -> bool:
        """Check if quote needs CSR review."""
        return self.needs_manual_review

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "vehicle": None,  # No vehicle for chip repair
            "part": None,
            "shop": {
                "id": self.shop_id,
                "name": self.shop_name,
            },
            "pricing": {
                "chip_repair_cost": str(self.chip_repair_cost),
                "mobile_fee": str(self.mobile_fee),
                "subtotal": str(self.subtotal),
                "tax": str(self.tax),
                "total": str(self.total),
            },
            "line_items": [
                {
                    "type": item["type"],
                    "description": item["description"],
                    "unit_price": str(item["unit_price"]),
                    "quantity": item["quantity"],
                    "subtotal": str(item["subtotal"]),
                }
                for item in self.line_items
            ],
            "flags": {
                "needs_manual_review": self.needs_manual_review,
                "needs_review": self.needs_review,
                "confidence": self.confidence,
                "review_reason": self.review_reason,
            },
        }


@dataclass
class QuotePricing:
    """Result of a pricing calculation."""

    # Vehicle info
    vin: str
    year: int
    make: str
    model: str
    body_style: str | None

    # Part info
    nags_part_number: str
    part_description: str
    features: list[str]
    photo_urls: list[str]

    # Shop info
    shop_id: int
    shop_name: str

    # Pricing breakdown
    glass_cost: Decimal
    labor_cost: Decimal
    kit_fee: Decimal
    moulding_fee: Decimal
    hardware_fee: Decimal
    calibration_fee: Decimal
    mobile_fee: Decimal
    subtotal: Decimal
    tax: Decimal
    total: Decimal

    # Line items for quote
    line_items: list[dict]

    # Flags from lookup
    needs_part_selection: bool
    needs_calibration_review: bool
    needs_manual_review: bool
    confidence: str
    review_reason: str | None

    # Price validation flags
    price_out_of_bounds: bool = False
    missing_nags_price: bool = False

    def check_price_bounds(self) -> bool:
        """
        Check if total is within acceptable range for auto-send.

        Returns True if price is within bounds, False otherwise.
        Sets price_out_of_bounds flag and updates review_reason if out of bounds.
        """
        if self.total < REPLACEMENT_PRICE_MIN or self.total > REPLACEMENT_PRICE_MAX:
            self.price_out_of_bounds = True
            reason = (
                f"Price ${self.total} outside bounds "
                f"(${REPLACEMENT_PRICE_MIN}-${REPLACEMENT_PRICE_MAX})"
            )
            if self.review_reason:
                self.review_reason = f"{self.review_reason}; {reason}"
            else:
                self.review_reason = reason
            return False
        return True

    @property
    def needs_review(self) -> bool:
        """Check if quote needs CSR review."""
        return (
            self.needs_part_selection
            or self.needs_calibration_review
            or self.needs_manual_review
            or self.price_out_of_bounds
            or self.missing_nags_price
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "vehicle": {
                "vin": self.vin,
                "year": self.year,
                "make": self.make,
                "model": self.model,
                "body_style": self.body_style,
            },
            "part": {
                "nags_part_number": self.nags_part_number,
                "description": self.part_description,
                "features": self.features,
                "photo_urls": self.photo_urls,
            },
            "shop": {
                "id": self.shop_id,
                "name": self.shop_name,
            },
            "pricing": {
                "glass_cost": str(self.glass_cost),
                "labor_cost": str(self.labor_cost),
                "kit_fee": str(self.kit_fee),
                "moulding_fee": str(self.moulding_fee),
                "hardware_fee": str(self.hardware_fee),
                "calibration_fee": str(self.calibration_fee),
                "mobile_fee": str(self.mobile_fee),
                "subtotal": str(self.subtotal),
                "tax": str(self.tax),
                "total": str(self.total),
            },
            "line_items": [
                {
                    "type": item["type"],
                    "description": item["description"],
                    "unit_price": str(item["unit_price"]),
                    "quantity": item["quantity"],
                    "subtotal": str(item["subtotal"]),
                }
                for item in self.line_items
            ],
            "flags": {
                "needs_part_selection": self.needs_part_selection,
                "needs_calibration_review": self.needs_calibration_review,
                "needs_manual_review": self.needs_manual_review,
                "price_out_of_bounds": self.price_out_of_bounds,
                "missing_nags_price": self.missing_nags_price,
                "needs_review": self.needs_review,
                "confidence": self.confidence,
                "review_reason": self.review_reason,
            },
        }


class PricingService:
    """
    Service for calculating auto glass quotes using PricingProfile.

    Uses list-less pricing methodology:
    - Glass cost = NAGS list price × (1 - category discount%)
    - Labor = flat amount or hours × rate
    - Kit fee = tiered by tube_qty
    - Calibration = Static ($195) / Dynamic ($295) / Dual ($395)
    - Mobile fee = distance-based tiers
    """

    def calculate_quote(
        self,
        lookup_result: "VehicleLookupResult",
        shop: "Shop",
        service_type: str,
        distance_miles: float | None = None,
    ) -> QuotePricing:
        """
        Calculate a quote for the given vehicle lookup result.

        Args:
            lookup_result: VehicleLookupResult from VehicleLookupService
            shop: Shop model instance
            service_type: "mobile" or "in_store"
            distance_miles: Distance for mobile service (required if mobile)

        Returns:
            QuotePricing with full pricing breakdown

        Raises:
            PricingError: If pricing cannot be calculated
        """
        # Get the shop's pricing profile
        profile = self._get_pricing_profile(shop)

        # Get the primary part (first part)
        part = lookup_result.primary_part
        if not part:
            raise PricingError("No parts available for pricing")

        # Track if NAGS price is missing (for failsafe flag)
        missing_nags_price = False
        if part.nags_list_price is None:
            logger.warning(
                f"Part {part.nags_part_number} missing NAGS list price - "
                "quote will need CSR review"
            )
            missing_nags_price = True
            if not lookup_result.review_reason:
                lookup_result.review_reason = "Missing NAGS list price"

        # Calculate each pricing component
        glass_cost = self._calculate_glass_cost(part, profile)
        labor_cost = self._calculate_labor_cost(part, profile)
        kit_fee = self._calculate_kit_fee(part, profile)
        moulding_fee = self._calculate_moulding_fee(part, profile)
        hardware_fee = self._calculate_hardware_fee(part, profile)
        calibration_fee = self._calculate_calibration_fee(part, profile)
        mobile_fee = self._calculate_mobile_fee(service_type, distance_miles, profile)

        # Calculate totals
        subtotal = (
            glass_cost + labor_cost + kit_fee + moulding_fee +
            hardware_fee + calibration_fee + mobile_fee
        )
        tax = Decimal("0.00")  # Tax not implemented for MVP
        total = subtotal + tax

        # Build line items
        line_items = self._build_line_items(
            part=part,
            glass_cost=glass_cost,
            labor_cost=labor_cost,
            kit_fee=kit_fee,
            moulding_fee=moulding_fee,
            hardware_fee=hardware_fee,
            calibration_fee=calibration_fee,
            mobile_fee=mobile_fee,
        )

        # Build part description
        part_description = self._build_part_description(part)

        logger.info(
            f"Calculated quote for {lookup_result.vin}: "
            f"glass=${glass_cost}, labor=${labor_cost}, kit=${kit_fee}, "
            f"moulding=${moulding_fee}, hardware=${hardware_fee}, "
            f"cal=${calibration_fee}, mobile=${mobile_fee}, total=${total}"
        )

        quote_pricing = QuotePricing(
            # Vehicle info
            vin=lookup_result.vin,
            year=lookup_result.year,
            make=lookup_result.make,
            model=lookup_result.model,
            body_style=lookup_result.body_style,
            # Part info
            nags_part_number=part.nags_part_number,
            part_description=part_description,
            features=part.features,
            photo_urls=part.photo_urls,
            # Shop info
            shop_id=shop.id,
            shop_name=shop.name,
            # Pricing
            glass_cost=glass_cost,
            labor_cost=labor_cost,
            kit_fee=kit_fee,
            moulding_fee=moulding_fee,
            hardware_fee=hardware_fee,
            calibration_fee=calibration_fee,
            mobile_fee=mobile_fee,
            subtotal=subtotal,
            tax=tax,
            total=total,
            # Line items
            line_items=line_items,
            # Flags from lookup
            needs_part_selection=lookup_result.needs_part_selection,
            needs_calibration_review=lookup_result.needs_calibration_review,
            needs_manual_review=lookup_result.needs_manual_review,
            confidence=lookup_result.confidence,
            review_reason=lookup_result.review_reason,
            # Price validation flags
            missing_nags_price=missing_nags_price,
        )

        # Check price bounds for auto-send validation
        quote_pricing.check_price_bounds()

        return quote_pricing

    def _get_pricing_profile(self, shop: "Shop") -> PricingProfile:
        """Get the default pricing profile for a shop."""
        # Try to get the default profile first
        profile = PricingProfile.objects.filter(
            shop=shop,
            is_default=True,
            is_active=True,
        ).first()

        if profile:
            return profile

        # Fall back to any active profile
        profile = PricingProfile.objects.filter(
            shop=shop,
            is_active=True,
        ).first()

        if profile:
            logger.warning(
                f"Shop {shop.name} has no default pricing profile, using: {profile.name}"
            )
            return profile

        # No profile found - this is a configuration error
        raise PricingError(
            f"Shop {shop.name} has no active pricing profile configured"
        )

    def _calculate_glass_cost(
        self,
        part: "GlassPart",
        profile: PricingProfile,
    ) -> Decimal:
        """
        Calculate glass cost using list-less pricing.

        Formula: NAGS List Price × (1 - Category Discount%)
        """
        if part.nags_list_price is None:
            return Decimal("0.00")

        return profile.calculate_glass_price(part.nags_list_price, part.prefix_cd)

    def _calculate_labor_cost(
        self,
        part: "GlassPart",
        profile: PricingProfile,
    ) -> Decimal:
        """
        Calculate labor cost using NAGS_LABOR hours.

        If profile.labor_type == 'flat': return flat amount
        If profile.labor_type == 'multiplier': return nags_labor × rate
        """
        return profile.calculate_labor(part.nags_labor, part.prefix_cd)

    def _calculate_kit_fee(
        self,
        part: "GlassPart",
        profile: PricingProfile,
    ) -> Decimal:
        """
        Calculate kit/urethane fee based on tube_qty (labor hours).

        Tiered pricing:
        - 1 hour: $23
        - 1.5 hours: $46
        - 2+ hours: $46
        """
        return profile.get_kit_fee(part.tube_qty)

    def _calculate_calibration_fee(
        self,
        part: "GlassPart",
        profile: PricingProfile,
    ) -> Decimal:
        """
        Calculate ADAS calibration fee based on calibration type.

        - Static: $195
        - Dynamic: $295
        - Dual: $395
        - None: $0
        """
        if not part.calibration_required or not part.calibration_type:
            return Decimal("0.00")

        # Parse calibration type
        cal_type = part.calibration_type.lower()

        if "dual" in cal_type or "both" in cal_type:
            return profile.calibration_dual
        elif "dynamic" in cal_type:
            return profile.calibration_dynamic
        elif "static" in cal_type:
            return profile.calibration_static
        else:
            # Unknown calibration type - use dynamic as default
            logger.warning(
                f"Unknown calibration type '{part.calibration_type}', using dynamic"
            )
            return profile.calibration_dynamic

    def _calculate_moulding_fee(
        self,
        part: "GlassPart",
        profile: PricingProfile,
    ) -> Decimal:
        """
        Calculate moulding fee if required.

        Uses flat fee from PricingProfile when MLDING_FLAG='Y' in NAGS.
        """
        if part.moulding_required and profile.moulding_flat_fee > 0:
            return profile.moulding_flat_fee
        return Decimal("0.00")

    def _calculate_hardware_fee(
        self,
        part: "GlassPart",
        profile: PricingProfile,
    ) -> Decimal:
        """
        Calculate hardware/clip fee if required.

        Uses flat fee from PricingProfile when CLIPS_FLAG='Y' in NAGS.
        """
        if part.clips_required and profile.hardware_flat_fee > 0:
            return profile.hardware_flat_fee
        return Decimal("0.00")

    def _calculate_mobile_fee(
        self,
        service_type: str,
        distance_miles: float | None,
        profile: PricingProfile,
    ) -> Decimal:
        """
        Calculate mobile service fee based on distance.

        - 0-30 miles: $49 flat
        - 31-60 miles: $49 + $1.50/mile over 30
        - In-store: $0
        """
        if service_type != "mobile":
            return Decimal("0.00")

        if distance_miles is None:
            # Default to base mobile fee if distance unknown
            return profile.mobile_fee_base

        fee = profile.get_mobile_fee(distance_miles)
        if fee is None:
            # Outside service area
            raise PricingError(
                f"Distance {distance_miles} miles exceeds max mobile range "
                f"({profile.mobile_max_distance} miles)"
            )

        return fee

    def _build_line_items(
        self,
        part: "GlassPart",
        glass_cost: Decimal,
        labor_cost: Decimal,
        kit_fee: Decimal,
        moulding_fee: Decimal,
        hardware_fee: Decimal,
        calibration_fee: Decimal,
        mobile_fee: Decimal,
    ) -> list[dict]:
        """Build line items for the quote."""
        line_items = []

        # Glass/Part
        if glass_cost > 0:
            line_items.append({
                "type": "part",
                "description": f"Windshield - {part.nags_part_number}",
                "unit_price": glass_cost,
                "quantity": 1,
                "subtotal": glass_cost,
            })

        # Labor
        if labor_cost > 0:
            line_items.append({
                "type": "labor",
                "description": f"Installation Labor ({part.nags_labor}h)",
                "unit_price": labor_cost,
                "quantity": 1,
                "subtotal": labor_cost,
            })

        # Kit/Urethane fee
        if kit_fee > 0:
            line_items.append({
                "type": "fee",
                "description": f"Urethane Kit ({part.tube_qty} tubes)",
                "unit_price": kit_fee,
                "quantity": 1,
                "subtotal": kit_fee,
            })

        # Moulding fee
        if moulding_fee > 0:
            line_items.append({
                "type": "fee",
                "description": "Moulding Fee",
                "unit_price": moulding_fee,
                "quantity": 1,
                "subtotal": moulding_fee,
            })

        # Hardware/Clips fee
        if hardware_fee > 0:
            line_items.append({
                "type": "fee",
                "description": "Hardware/Clips Fee",
                "unit_price": hardware_fee,
                "quantity": 1,
                "subtotal": hardware_fee,
            })

        # Calibration
        if calibration_fee > 0:
            cal_desc = f"ADAS Calibration ({part.calibration_type or 'Required'})"
            line_items.append({
                "type": "calibration",
                "description": cal_desc,
                "unit_price": calibration_fee,
                "quantity": 1,
                "subtotal": calibration_fee,
            })

        # Mobile fee
        if mobile_fee > 0:
            line_items.append({
                "type": "fee",
                "description": "Mobile Service Fee",
                "unit_price": mobile_fee,
                "quantity": 1,
                "subtotal": mobile_fee,
            })

        return line_items

    def _build_part_description(self, part: "GlassPart") -> str:
        """Build a human-readable part description."""
        desc_parts = []

        # Add features
        if part.features:
            desc_parts.extend(part.features[:3])  # Limit to 3 features

        # Add calibration if required
        if part.calibration_required and part.calibration_type:
            desc_parts.append(f"{part.calibration_type} Calibration Required")

        return ", ".join(desc_parts) if desc_parts else "Standard Glass"

    def calculate_chip_repair(
        self,
        chip_count: int,
        shop: "Shop",
        service_type: str,
        distance_miles: float | None = None,
    ) -> ChipRepairPricing:
        """
        Calculate chip repair pricing.

        Chip repairs don't require vehicle identification - just count chips.

        Pricing logic (from PricingProfile):
        - Chip 1 (WR-1): chip_repair_wr1 (default $49)
        - Chip 2 (WR-2): chip_repair_wr2 (default $29)
        - Chip 3 (WR-3): chip_repair_wr3 (default $29)
        - Chip 4+: Recommend replacement instead

        Args:
            chip_count: Number of chips (1-3)
            shop: Shop model instance
            service_type: "mobile" or "in_store"
            distance_miles: Distance for mobile service (required if mobile)

        Returns:
            ChipRepairPricing with pricing breakdown

        Raises:
            PricingError: If chip_count > 3 or pricing cannot be calculated
        """
        if chip_count > 3:
            raise PricingError(
                "More than 3 chips requires replacement. "
                "Please select 'Windshield Replacement' instead."
            )

        if chip_count < 1:
            raise PricingError("Chip count must be at least 1")

        # Get pricing profile
        profile = self._get_pricing_profile(shop)

        # Calculate chip repair cost using PricingProfile method
        chip_repair_cost = profile.calculate_chip_repair(chip_count)

        # Calculate mobile fee if applicable
        mobile_fee = Decimal("0.00")
        if service_type == "mobile":
            mobile_fee = self._calculate_mobile_fee(service_type, distance_miles, profile)

        # Calculate totals
        subtotal = chip_repair_cost + mobile_fee
        tax = Decimal("0.00")  # Tax not implemented for MVP
        total = subtotal + tax

        # Build line items
        line_items = self._build_chip_repair_line_items(
            chip_count=chip_count,
            profile=profile,
            mobile_fee=mobile_fee,
        )

        logger.info(
            f"Calculated chip repair quote for shop {shop.name}: "
            f"chips={chip_count}, repair=${chip_repair_cost}, "
            f"mobile=${mobile_fee}, total=${total}"
        )

        return ChipRepairPricing(
            shop_id=shop.id,
            shop_name=shop.name,
            chip_count=chip_count,
            chip_repair_cost=chip_repair_cost,
            mobile_fee=mobile_fee,
            subtotal=subtotal,
            tax=tax,
            total=total,
            line_items=line_items,
        )

    def _build_chip_repair_line_items(
        self,
        chip_count: int,
        profile: PricingProfile,
        mobile_fee: Decimal,
    ) -> list[dict]:
        """Build line items for chip repair quote."""
        line_items = []

        # First chip (WR-1)
        if chip_count >= 1:
            line_items.append({
                "type": "chip_repair",
                "description": "Chip Repair #1 (WR-1)",
                "unit_price": profile.chip_repair_wr1,
                "quantity": 1,
                "subtotal": profile.chip_repair_wr1,
            })

        # Second chip (WR-2)
        if chip_count >= 2:
            line_items.append({
                "type": "chip_repair",
                "description": "Chip Repair #2 (WR-2)",
                "unit_price": profile.chip_repair_wr2,
                "quantity": 1,
                "subtotal": profile.chip_repair_wr2,
            })

        # Third chip (WR-3)
        if chip_count >= 3:
            line_items.append({
                "type": "chip_repair",
                "description": "Chip Repair #3 (WR-3)",
                "unit_price": profile.chip_repair_wr3,
                "quantity": 1,
                "subtotal": profile.chip_repair_wr3,
            })

        # Mobile fee
        if mobile_fee > 0:
            line_items.append({
                "type": "fee",
                "description": "Mobile Service Fee",
                "unit_price": mobile_fee,
                "quantity": 1,
                "subtotal": mobile_fee,
            })

        return line_items
