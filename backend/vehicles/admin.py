from django.contrib import admin  # noqa: F401
from .models import MockVehicleData


@admin.register(MockVehicleData)
class MockVehicleDataAdmin(admin.ModelAdmin):
    list_display = ("year", "make", "model", "trim", "vin", "license_plate", "state")
    search_fields = ("vin", "license_plate", "make", "model")
    list_filter = ("year", "make", "state")
    readonly_fields = ("created_at", "updated_at")
