from django.db import models  # noqa: F401
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.utils import timezone
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


class ShopPricingRule(models.Model):
    PRICING_STRATEGY_CHOICES = [
        ("percentage_discount", "Percentage Discount"),
        ("fixed_discount", "Fixed Amount Discount"),
        ("fixed_price", "Fixed Price"),
    ]

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="pricing_rules"
    )
    manufacturer = models.CharField(max_length=100)  # e.g. 'nags', 'pgw'

    pricing_strategy = models.CharField(max_length=50, choices=PRICING_STRATEGY_CHOICES)
    discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    discount_amount = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    fixed_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    glass_type = models.CharField(
        max_length=100, blank=True, null=True
    )  # Optional filter

    priority = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["-priority"]
        unique_together = ("shop", "manufacturer", "glass_type", "pricing_strategy")

    def __str__(self):
        return f"{self.shop.name} - {self.manufacturer} ({self.pricing_strategy})"

    def is_valid_now(self):
        now = timezone.now()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True

    def calculate_price(self, list_price):
        if self.pricing_strategy == "percentage_discount":
            if self.discount_percentage is None:
                return list_price
            return list_price * (1 - (self.discount_percentage / 100))
        elif self.pricing_strategy == "fixed_discount":
            return list_price - self.discount_amount
        elif self.pricing_strategy == "fixed_price":
            return self.fixed_price
        return list_price
