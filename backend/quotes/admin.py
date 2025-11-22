from django.contrib import admin  # noqa: F401
from .models import Quote, QuoteLineItem, QuoteStateLog


class QuoteLineItemInline(admin.TabularInline):
    model = QuoteLineItem
    extra = 0


class QuoteStateLogInline(admin.TabularInline):
    model = QuoteStateLog
    readonly_fields = ("from_state", "to_state", "user", "timestamp", "notes")
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "state",
        "customer",
        "vehicle_info_summary",
        "total_price",
        "created_at",
    )
    list_filter = ("state", "service_type", "payment_type", "created_at")
    search_fields = ("id", "vin", "customer__email", "customer__phone")
    inlines = [QuoteLineItemInline, QuoteStateLogInline]
    readonly_fields = ("id", "created_at", "updated_at", "task_id")

    @admin.display(description="Vehicle")
    def vehicle_info_summary(self, obj):
        info = obj.vehicle_info
        if not info:
            return obj.vin
        return f"{info.get('year', '')} {info.get('make', '')} {info.get('model', '')}"


@admin.register(QuoteStateLog)
class QuoteStateLogAdmin(admin.ModelAdmin):
    list_display = ("quote", "from_state", "to_state", "user", "timestamp")
    list_filter = ("to_state", "timestamp")
    search_fields = ("quote__id", "user__username")
    readonly_fields = ("quote", "from_state", "to_state", "user", "timestamp", "notes")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
