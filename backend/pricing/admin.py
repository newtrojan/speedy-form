from django.contrib import admin  # noqa: F401
from .models import PricingConfig, InsuranceProvider, ShopPricingRule


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


@admin.register(ShopPricingRule)
class ShopPricingRuleAdmin(admin.ModelAdmin):
    list_display = (
        "shop",
        "name",
        "manufacturer",
        "pricing_strategy",
        "priority",
        "is_active",
    )
    search_fields = ("shop__name", "name", "manufacturer")
    list_filter = ("pricing_strategy", "manufacturer", "is_active")
