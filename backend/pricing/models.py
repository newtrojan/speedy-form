from django.db import models  # noqa: F401
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from decimal import Decimal


class PricingConfig(models.Model):
    """Singleton model for global pricing configuration"""

    standard_labor_rate = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("150.00")
    )
    complex_labor_rate = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("200.00")
    )

    environmental_fee = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("5.00")
    )
    disposal_fee = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("10.00")
    )

    markup_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal("1.30")
    )

    mobile_fee_tier_1_distance = models.PositiveIntegerField(default=15)
    mobile_fee_tier_1_amount = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("25.00")
    )

    mobile_fee_tier_2_distance = models.PositiveIntegerField(default=30)
    mobile_fee_tier_2_amount = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("50.00")
    )

    mobile_fee_tier_3_amount = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("75.00")
    )

    max_mobile_service_distance = models.PositiveIntegerField(default=50)

    quote_expiration_days = models.PositiveIntegerField(default=7)

    class Meta:
        verbose_name = _("pricing configuration")
        verbose_name_plural = _("pricing configuration")

    def save(self, *args, **kwargs):
        if not self.pk and PricingConfig.objects.exists():
            raise ValidationError("There can be only one PricingConfig instance")
        return super(PricingConfig, self).save(*args, **kwargs)

    def __str__(self):
        return "Global Pricing Configuration"

    @classmethod
    def get_instance(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def calculate_mobile_fee(self, distance_miles):
        if distance_miles > self.max_mobile_service_distance:
            return None  # Or raise error

        if distance_miles <= self.mobile_fee_tier_1_distance:
            return self.mobile_fee_tier_1_amount
        elif distance_miles <= self.mobile_fee_tier_2_distance:
            return self.mobile_fee_tier_2_amount
        else:
            return self.mobile_fee_tier_3_amount


class InsuranceProvider(models.Model):
    name = models.CharField(_("provider name"), max_length=255)
    code = models.CharField(_("provider code"), max_length=50, unique=True)

    uses_custom_pricing = models.BooleanField(default=False)
    markup_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=1.00
    )

    requires_pre_approval = models.BooleanField(default=False)
    average_approval_time_hours = models.PositiveIntegerField(default=24)

    claims_phone = models.CharField(max_length=20, blank=True)
    claims_email = models.EmailField(blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class PricingProfile(models.Model):
    """
    Comprehensive pricing configuration for a shop.

    Based on industry-standard "List-Less" methodology where prices are
    calculated as discounts from NAGS list price.

    One shop can have multiple profiles (e.g., default, insurance-specific),
    but only one can be is_default=True per shop.
    """

    PRICE_RULE_TYPE_CHOICES = [
        ("percent_off_list", "% Off Application Provider"),
        ("flat_amount", "Flat Amount"),
        ("cost_plus", "Cost Plus"),
    ]

    LABOR_TYPE_CHOICES = [
        ("flat", "Flat"),
        ("multiplier", "Multiplier"),
    ]

    # === Identity ===
    name = models.CharField(max_length=255)
    shop = models.ForeignKey(
        "shops.Shop",
        on_delete=models.CASCADE,
        related_name="pricing_profiles",
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Default profile for this shop when no specific match",
    )
    is_active = models.BooleanField(default=True)

    # === Price Rule Type ===
    price_rule_type = models.CharField(
        max_length=20,
        choices=PRICE_RULE_TYPE_CHOICES,
        default="percent_off_list",
    )

    # === Glass Category Discounts (% off NAGS list) ===
    # These are the discount percentages applied to NAGS list price
    glass_discount_dw = models.DecimalField(
        _("Domestic Windshield Discount %"),
        max_digits=5,
        decimal_places=2,
        default=Decimal("48.00"),
        help_text="Discount % for DW (Domestic Windshield)",
    )
    glass_discount_dt = models.DecimalField(
        _("Domestic Tempered Discount %"),
        max_digits=5,
        decimal_places=2,
        default=Decimal("48.00"),
        help_text="Discount % for DT (Domestic Tempered)",
    )
    glass_discount_fw = models.DecimalField(
        _("Foreign Windshield Discount %"),
        max_digits=5,
        decimal_places=2,
        default=Decimal("48.00"),
        help_text="Discount % for FW (Foreign Windshield)",
    )
    glass_discount_ft = models.DecimalField(
        _("Foreign Tempered Discount %"),
        max_digits=5,
        decimal_places=2,
        default=Decimal("48.00"),
        help_text="Discount % for FT (Foreign Tempered)",
    )
    glass_discount_oem = models.DecimalField(
        _("OEM Discount %"),
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Discount % for OEM (Original Equipment)",
    )

    # === Labor Configuration ===
    labor_type = models.CharField(
        max_length=10,
        choices=LABOR_TYPE_CHOICES,
        default="multiplier",
        help_text="Flat = fixed amount, Multiplier = hours × rate",
    )

    # Labor rates per glass category (used when labor_type = 'multiplier')
    labor_rate_dw = models.DecimalField(
        _("DW Labor Rate"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("44.80"),
    )
    labor_rate_dt = models.DecimalField(
        _("DT Labor Rate"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("44.80"),
    )
    labor_rate_fw = models.DecimalField(
        _("FW Labor Rate"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("44.80"),
    )
    labor_rate_ft = models.DecimalField(
        _("FT Labor Rate"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("44.80"),
    )

    # Flat labor amount (used when labor_type = 'flat')
    labor_flat_amount = models.DecimalField(
        _("Flat Labor Amount"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("44.80"),
        help_text="Fixed labor charge when labor_type is 'flat'",
    )

    # === Kit / Urethane Fee (Tiered by labor hours) ===
    kit_fee_1_hour = models.DecimalField(
        _("Kit Fee (1 hour)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("23.00"),
    )
    kit_fee_1_5_hour = models.DecimalField(
        _("Kit Fee (1.5 hours)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("46.00"),
    )
    kit_fee_2_hour = models.DecimalField(
        _("Kit Fee (2 hours)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("46.00"),
    )
    kit_fee_2_5_hour = models.DecimalField(
        _("Kit Fee (2.5 hours)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("46.00"),
    )
    kit_fee_3_plus_hour = models.DecimalField(
        _("Kit Fee (3+ hours)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("46.00"),
    )
    kit_fee_other = models.DecimalField(
        _("Other Kit Fee"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Optional flat fee for non-standard kits",
    )

    # === Moulding & Hardware ===
    moulding_markup_percent = models.DecimalField(
        _("Moulding Markup %"),
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Markup percentage on moulding cost",
    )
    moulding_flat_fee = models.DecimalField(
        _("Moulding Flat Fee"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Alternative flat fee for moulding",
    )
    hardware_markup_percent = models.DecimalField(
        _("Hardware Markup %"),
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Markup percentage on hardware cost",
    )
    hardware_flat_fee = models.DecimalField(
        _("Hardware Flat Fee"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Alternative flat fee for hardware",
    )

    # === Chip Repair Pricing ===
    chip_repair_wr1 = models.DecimalField(
        _("Chip #1 (WR-1)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("49.00"),
        help_text="First chip repair price",
    )
    chip_repair_wr2 = models.DecimalField(
        _("Chip #2 (WR-2)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("29.00"),
        help_text="Second chip repair price",
    )
    chip_repair_wr3 = models.DecimalField(
        _("Chip #3+ (WR-3)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("29.00"),
        help_text="Third and subsequent chips (each)",
    )

    # === Crack Repair Pricing ===
    crack_repair_cr1 = models.DecimalField(
        _('Crack 0-6" (CR-1)'),
        max_digits=6,
        decimal_places=2,
        default=Decimal("59.00"),
        help_text="Crack repair 0-6 inches",
    )
    crack_repair_cr2 = models.DecimalField(
        _('Crack 6-12" (CR-2)'),
        max_digits=6,
        decimal_places=2,
        default=Decimal("79.00"),
        help_text="Crack repair 6-12 inches",
    )
    crack_repair_cr3 = models.DecimalField(
        _('Crack 12+" (CR-3)'),
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Crack 12+ inches - typically recommend replacement",
    )

    # === ADAS Calibration Fees ===
    calibration_static = models.DecimalField(
        _("Static Calibration"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("195.00"),
        help_text="Camera calibration with target board in shop",
    )
    calibration_dynamic = models.DecimalField(
        _("Dynamic Calibration"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("295.00"),
        help_text="Requires road test to recalibrate",
    )
    calibration_dual = models.DecimalField(
        _("Dual Calibration"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("395.00"),
        help_text="Both static AND dynamic required",
    )

    # === Mobile Service Fees ===
    mobile_fee_base = models.DecimalField(
        _("Mobile Fee (0-30 miles)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("49.00"),
    )
    mobile_fee_extended_base = models.DecimalField(
        _("Mobile Fee Extended Base (31-60 miles)"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("49.00"),
    )
    mobile_fee_per_mile = models.DecimalField(
        _("Per Mile Fee (31-60 miles)"),
        max_digits=4,
        decimal_places=2,
        default=Decimal("1.50"),
        help_text="Additional per-mile charge for 31-60 mile range",
    )
    mobile_max_distance = models.PositiveIntegerField(
        _("Max Mobile Distance (miles)"),
        default=60,
    )

    # === Admin Fee (Insurance Claims) ===
    admin_fee = models.DecimalField(
        _("Admin Fee"),
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Fee added for insurance claims",
    )

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("pricing profile")
        verbose_name_plural = _("pricing profiles")
        ordering = ["-is_default", "name"]
        constraints = [
            # Only one default profile per shop
            models.UniqueConstraint(
                fields=["shop"],
                condition=models.Q(is_default=True),
                name="unique_default_profile_per_shop",
            ),
        ]

    def __str__(self):
        default_marker = " (Default)" if self.is_default else ""
        return f"{self.shop.name} - {self.name}{default_marker}"

    def clean(self):
        """Validate that only one default profile exists per shop."""
        if self.is_default:
            existing = PricingProfile.objects.filter(
                shop=self.shop, is_default=True
            ).exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError(
                    "A default pricing profile already exists for this shop."
                )

    def get_glass_discount(self, prefix_code: str) -> Decimal:
        """Get discount percentage for a glass category prefix code."""
        prefix_upper = prefix_code.upper()[:2] if prefix_code else ""

        # Map prefix to discount field
        # DW, DB, DD, DL, DP, DQ, DR, DS, DV, DY → Domestic
        # FW, FB, FD, FL, FP, FQ, FR, FS, FV → Foreign
        if prefix_upper.startswith("D"):
            if prefix_upper == "DW":
                return self.glass_discount_dw
            else:
                return self.glass_discount_dt  # Domestic tempered/other
        elif prefix_upper.startswith("F"):
            if prefix_upper == "FW":
                return self.glass_discount_fw
            else:
                return self.glass_discount_ft  # Foreign tempered/other
        elif prefix_upper == "OE" or prefix_upper == "OEM":
            return self.glass_discount_oem
        else:
            # Default to domestic windshield
            return self.glass_discount_dw

    def get_labor_rate(self, prefix_code: str) -> Decimal:
        """Get labor rate for a glass category prefix code."""
        if self.labor_type == "flat":
            return self.labor_flat_amount

        prefix_upper = prefix_code.upper()[:2] if prefix_code else ""

        if prefix_upper.startswith("D"):
            if prefix_upper == "DW":
                return self.labor_rate_dw
            else:
                return self.labor_rate_dt
        elif prefix_upper.startswith("F"):
            if prefix_upper == "FW":
                return self.labor_rate_fw
            else:
                return self.labor_rate_ft
        else:
            return self.labor_rate_dw

    def get_kit_fee(self, labor_hours: Decimal) -> Decimal:
        """Get kit fee based on labor hours."""
        hours = float(labor_hours)
        if hours <= 1.0:
            return self.kit_fee_1_hour
        elif hours <= 1.5:
            return self.kit_fee_1_5_hour
        elif hours <= 2.0:
            return self.kit_fee_2_hour
        elif hours <= 2.5:
            return self.kit_fee_2_5_hour
        else:
            return self.kit_fee_3_plus_hour

    def get_mobile_fee(self, distance_miles: float) -> Decimal | None:
        """
        Calculate mobile service fee based on distance.
        Returns None if outside service area.
        """
        if distance_miles > self.mobile_max_distance:
            return None  # Outside service area

        if distance_miles <= 30:
            return self.mobile_fee_base
        else:
            # 31-60 mile range: base + per-mile charge
            extra_miles = distance_miles - 30
            return self.mobile_fee_extended_base + (
                self.mobile_fee_per_mile * Decimal(str(extra_miles))
            )

    def calculate_glass_price(
        self, nags_list_price: Decimal, prefix_code: str
    ) -> Decimal:
        """
        Calculate selling price from NAGS list price.

        Formula: List Price × (1 - Discount%)
        Example: $400 × (1 - 0.48) = $208
        """
        discount_percent = self.get_glass_discount(prefix_code)
        return nags_list_price * (Decimal("1") - (discount_percent / Decimal("100")))

    def calculate_labor(self, labor_hours: Decimal, prefix_code: str) -> Decimal:
        """
        Calculate labor cost.

        If flat: return flat amount
        If multiplier: hours × category rate
        """
        if self.labor_type == "flat":
            return self.labor_flat_amount
        else:
            rate = self.get_labor_rate(prefix_code)
            return labor_hours * rate

    def calculate_chip_repair(self, chip_count: int) -> Decimal:
        """Calculate total chip repair cost."""
        if chip_count <= 0:
            return Decimal("0.00")

        total = self.chip_repair_wr1  # First chip
        if chip_count >= 2:
            total += self.chip_repair_wr2  # Second chip
        if chip_count >= 3:
            # Third and beyond
            total += self.chip_repair_wr3 * (chip_count - 2)

        return total

    def get_calibration_fee(self, calibration_type: str) -> Decimal:
        """Get calibration fee by type."""
        cal_type = calibration_type.lower() if calibration_type else ""
        if cal_type == "static":
            return self.calibration_static
        elif cal_type == "dynamic":
            return self.calibration_dynamic
        elif cal_type in ("dual", "double", "both"):
            return self.calibration_dual
        else:
            # Default to dynamic if unknown
            return self.calibration_dynamic
