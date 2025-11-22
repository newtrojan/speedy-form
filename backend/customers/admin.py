from django.contrib import admin  # noqa: F401
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "first_name",
        "last_name",
        "phone",
        "postal_code",
        "created_at",
    )
    search_fields = ("email", "phone", "first_name", "last_name")
    list_filter = ("created_at", "sms_opt_in", "email_opt_in")
    readonly_fields = ("created_at", "updated_at")
