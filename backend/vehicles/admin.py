from django.contrib import admin  # noqa: F401
from .models import AutoboltAPICache


@admin.register(AutoboltAPICache)
class AutoboltAPICacheAdmin(admin.ModelAdmin):
    list_display = (
        "request_type",
        "request_key",
        "vin",
        "year",
        "make",
        "model",
        "http_status",
        "created_at",
        "expires_at",
    )
    search_fields = ("vin", "request_key", "make", "model", "nags_part_number")
    list_filter = ("request_type", "http_status", "country", "kind")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"
