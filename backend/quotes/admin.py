from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Quote, QuoteLineItem, QuoteStateLog
import csv
from django.http import HttpResponse


class QuoteLineItemInline(admin.TabularInline):
    model = QuoteLineItem
    extra = 0
    fields = ("type", "description", "unit_price", "quantity", "subtotal")
    readonly_fields = ("subtotal",)


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
        "short_id",
        "vehicle_display",
        "customer_email",
        "total_price",
        "state_badge",
        "created_at",
        "age_display",
    )
    list_filter = ("state", "service_type", "payment_type", "created_at")
    search_fields = ("id", "vin", "customer__email", "customer__phone")
    inlines = [QuoteLineItemInline, QuoteStateLogInline]
    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "task_id",
        "vehicle_info_display",
        "pricing_details_display",
    )
    date_hierarchy = "created_at"
    actions = ["validate_quotes", "export_to_csv"]

    fieldsets = (
        (
            "Quote Information",
            {"fields": ("id", "state", "task_id", "created_at", "updated_at")},
        ),
        ("Vehicle", {"fields": ("vin", "vehicle_info_display", "glass_type")}),
        (
            "Customer",
            {"fields": ("customer",)},
        ),
        (
            "Service",
            {
                "fields": (
                    "service_type",
                    "service_address",
                    "shop",
                )
            },
        ),
        ("Payment", {"fields": ("payment_type", "insurance_provider")}),
        (
            "Pricing",
            {
                "fields": (
                    "total_price",
                    "pricing_details_display",
                )
            },
        ),
        ("Internal", {"fields": ("internal_notes",)}),
    )

    @admin.display(description="ID")
    def short_id(self, obj):
        return str(obj.id)[:8]

    @admin.display(description="Vehicle")
    def vehicle_display(self, obj):
        info = obj.vehicle_info
        if not info:
            return obj.vin
        return (
            f"{info.get('year', '')} {info.get('make', '')} " f"{info.get('model', '')}"
        )

    @admin.display(description="Customer")
    def customer_email(self, obj):
        return obj.customer.email if obj.customer else "-"

    @admin.display(description="State")
    def state_badge(self, obj):
        colors = {
            "pending_validation": "#FFA500",  # Orange
            "sent": "#2196F3",  # Blue
            "customer_approved": "#4CAF50",  # Green
            "rejected": "#F44336",  # Red
            "expired": "#9E9E9E",  # Gray
            "converted": "#8BC34A",  # Light Green
        }
        color = colors.get(obj.state, "#000000")
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_state_display(),
        )

    @admin.display(description="Age")
    def age_display(self, obj):
        delta = timezone.now() - obj.created_at
        hours = int(delta.total_seconds() / 3600)
        if hours < 24:
            return f"{hours}h"
        days = hours // 24
        return f"{days}d"

    @admin.display(description="Vehicle Info")
    def vehicle_info_display(self, obj):
        import json

        return format_html("<pre>{}</pre>", json.dumps(obj.vehicle_info, indent=2))

    @admin.display(description="Pricing Details")
    def pricing_details_display(self, obj):
        import json

        return format_html("<pre>{}</pre>", json.dumps(obj.pricing_details, indent=2))

    @admin.action(description="Validate selected quotes")
    def validate_quotes(self, request, queryset):
        count = 0
        for quote in queryset.filter(state="pending_validation"):
            try:
                quote.send_to_customer()
                quote.save()
                QuoteStateLog.objects.create(
                    quote=quote,
                    from_state="pending_validation",
                    to_state="sent",
                    user=request.user,
                    notes="Bulk validated via admin",
                )
                count += 1
            except Exception:
                pass
        self.message_user(request, f"Successfully validated {count} quotes.")

    @admin.action(description="Export selected to CSV")
    def export_to_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="quotes.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "ID",
                "Vehicle",
                "Customer",
                "Total",
                "State",
                "Created",
            ]
        )

        for quote in queryset:
            writer.writerow(
                [
                    str(quote.id),
                    self.vehicle_display(quote),
                    quote.customer.email,
                    quote.total_price,
                    quote.state,
                    quote.created_at.strftime("%Y-%m-%d %H:%M"),
                ]
            )

        return response


@admin.register(QuoteStateLog)
class QuoteStateLogAdmin(admin.ModelAdmin):
    list_display = ("quote", "from_state", "to_state", "user", "timestamp")
    list_filter = ("to_state", "timestamp")
    search_fields = ("quote__id", "user__username")
    readonly_fields = (
        "quote",
        "from_state",
        "to_state",
        "user",
        "timestamp",
        "notes",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
