"""
Data types for vehicle lookup services.

These dataclasses represent the unified response format from all vehicle
lookup sources (AUTOBOLT, NHTSA, NAGS).
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal


@dataclass
class GlassPart:
    """
    Represents a glass part option for a vehicle.

    May come from AUTOBOLT (with calibration) or NAGS (without calibration).
    """

    # Part identification
    nags_part_number: str  # Base NAGS number (e.g., "FW03898")
    full_part_number: str | None = None  # Full part with suffix (e.g., "FW03898GTYN")
    prefix_cd: str = ""  # Glass category prefix (FW, DW, DT, FT, etc.)

    # Pricing (from NAGS database)
    nags_list_price: Decimal | None = None

    # Calibration (from AUTOBOLT only)
    calibration_type: str | None = None  # None, "Static", "Dynamic", "Dual"
    calibration_required: bool = False

    # Glass features
    features: list[str] = field(default_factory=list)

    # Installation details (from NAGS)
    tube_qty: Decimal = Decimal("1.5")  # Urethane tubes needed
    additional_labor: str = ""  # Extra labor notes

    # Source tracking
    source: str = "unknown"  # "autobolt", "nags", "manual"

    def __post_init__(self):
        """Extract prefix from part number if not set."""
        if not self.prefix_cd and self.nags_part_number:
            # Extract first 2 chars as prefix (e.g., "FW" from "FW03898")
            self.prefix_cd = self.nags_part_number[:2] if len(self.nags_part_number) >= 2 else ""

        # Set calibration_required based on calibration_type
        if self.calibration_type and self.calibration_type.lower() != "none":
            self.calibration_required = True


@dataclass
class VehicleLookupResult:
    """
    Result of a vehicle/part lookup from any source.

    Contains vehicle info, available parts, and flags indicating
    whether the quote needs CSR review.
    """

    # Source tracking
    source: Literal["autobolt", "nhtsa+nags", "nags", "cache", "manual"]

    # Vehicle identification
    vin: str
    year: int
    make: str
    model: str
    body_style: str | None = None
    trim: str | None = None

    # Available parts (may be multiple!)
    parts: list[GlassPart] = field(default_factory=list)

    # Flags for quote state determination
    needs_part_selection: bool = False  # True if len(parts) > 1
    needs_calibration_review: bool = False  # True if calibration_type is None from NHTSA path
    needs_manual_review: bool = False  # True if any other issue requiring CSR

    # Confidence level
    confidence: Literal["high", "medium", "low"] = "high"

    # Review reason (if any)
    review_reason: str | None = None

    # Raw response data (for debugging/audit)
    raw_response: dict = field(default_factory=dict)

    def __post_init__(self):
        """Set flags based on parts."""
        # Auto-set needs_part_selection if multiple parts
        if len(self.parts) > 1:
            self.needs_part_selection = True
            if not self.review_reason:
                self.review_reason = f"Multiple parts available ({len(self.parts)} options)"

        # Auto-set needs_calibration_review if from NHTSA path (no calibration data)
        if self.source in ("nhtsa+nags", "nags"):
            # Check if any part has calibration info - if none do, flag for review
            has_calibration_info = any(
                p.calibration_type is not None for p in self.parts
            )
            if not has_calibration_info and self.parts:
                self.needs_calibration_review = True
                self.confidence = "medium"
                if not self.review_reason:
                    self.review_reason = "No calibration data available (NHTSA/NAGS fallback)"

    @property
    def needs_review(self) -> bool:
        """Check if this lookup result requires CSR review."""
        return (
            self.needs_part_selection
            or self.needs_calibration_review
            or self.needs_manual_review
        )

    @property
    def primary_part(self) -> GlassPart | None:
        """Get the primary (first) part, if available."""
        return self.parts[0] if self.parts else None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "source": self.source,
            "vin": self.vin,
            "year": self.year,
            "make": self.make,
            "model": self.model,
            "body_style": self.body_style,
            "trim": self.trim,
            "parts": [
                {
                    "nags_part_number": p.nags_part_number,
                    "full_part_number": p.full_part_number,
                    "prefix_cd": p.prefix_cd,
                    "nags_list_price": str(p.nags_list_price) if p.nags_list_price else None,
                    "calibration_type": p.calibration_type,
                    "calibration_required": p.calibration_required,
                    "features": p.features,
                    "tube_qty": str(p.tube_qty),
                    "source": p.source,
                }
                for p in self.parts
            ],
            "needs_part_selection": self.needs_part_selection,
            "needs_calibration_review": self.needs_calibration_review,
            "needs_manual_review": self.needs_manual_review,
            "needs_review": self.needs_review,
            "confidence": self.confidence,
            "review_reason": self.review_reason,
        }
