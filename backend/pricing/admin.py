from django.contrib import admin  # noqa: F401
from .models import PricingConfig, InsuranceProvider, PricingProfile


@admin.register(PricingConfig)
class PricingConfigAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        # Singleton pattern: prevent adding if one exists
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)


@admin.register(InsuranceProvider)
class InsuranceProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "uses_custom_pricing", "is_active")
    search_fields = ("name", "code")
    list_filter = ("uses_custom_pricing", "is_active")


@admin.register(PricingProfile)
class PricingProfileAdmin(admin.ModelAdmin):
    list_display = (
        "shop",
        "name",
        "is_default",
        "is_active",
        "price_rule_type",
        "labor_type",
    )
    search_fields = ("shop__name", "name")
    list_filter = ("is_default", "is_active", "price_rule_type", "labor_type")
    fieldsets = (
        (
            None,
            {"fields": ("name", "shop", "is_default", "is_active", "price_rule_type")},
        ),
        (
            "Glass Discounts (%)",
            {
                "fields": (
                    "glass_discount_dw",
                    "glass_discount_dt",
                    "glass_discount_fw",
                    "glass_discount_ft",
                    "glass_discount_oem",
                )
            },
        ),
        (
            "Labor",
            {
                "fields": (
                    "labor_type",
                    "labor_rate_dw",
                    "labor_rate_dt",
                    "labor_rate_fw",
                    "labor_rate_ft",
                    "labor_flat_amount",
                )
            },
        ),
        (
            "Kit/Urethane Fees",
            {
                "fields": (
                    "kit_fee_1_hour",
                    "kit_fee_1_5_hour",
                    "kit_fee_2_hour",
                    "kit_fee_2_5_hour",
                    "kit_fee_3_plus_hour",
                    "kit_fee_other",
                )
            },
        ),
        (
            "Calibration Fees",
            {
                "fields": (
                    "calibration_static",
                    "calibration_dynamic",
                    "calibration_dual",
                )
            },
        ),
        (
            "Mobile Fees",
            {
                "fields": (
                    "mobile_fee_base",
                    "mobile_fee_extended_base",
                    "mobile_fee_per_mile",
                    "mobile_max_distance",
                )
            },
        ),
        (
            "Chip/Crack Repair",
            {
                "fields": (
                    "chip_repair_wr1",
                    "chip_repair_wr2",
                    "chip_repair_wr3",
                    "crack_repair_cr1",
                    "crack_repair_cr2",
                    "crack_repair_cr3",
                )
            },
        ),
        (
            "Moulding & Hardware",
            {
                "fields": (
                    "moulding_markup_percent",
                    "moulding_flat_fee",
                    "hardware_markup_percent",
                    "hardware_flat_fee",
                )
            },
        ),
        ("Admin", {"fields": ("admin_fee",)}),
    )
