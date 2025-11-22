from django.contrib import admin  # noqa: F401
from .models import Shop, ServiceArea


class ServiceAreaInline(admin.TabularInline):
    model = ServiceArea
    extra = 1


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "city",
        "state",
        "phone",
        "offers_mobile_service",
        "is_active",
    )
    search_fields = ("name", "city", "postal_code")
    list_filter = ("state", "offers_mobile_service", "is_active")
    inlines = [ServiceAreaInline]


@admin.register(ServiceArea)
class ServiceAreaAdmin(admin.ModelAdmin):
    list_display = ("shop", "postal_code", "is_active")
    search_fields = ("postal_code", "shop__name")
    list_filter = ("is_active",)
