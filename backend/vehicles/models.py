from django.db import models  # noqa: F401
from django.utils.translation import gettext_lazy as _


class MockVehicleData(models.Model):
    license_plate = models.CharField(_("license plate"), max_length=20)
    state = models.CharField(_("state"), max_length=2)
    vin = models.CharField(_("VIN"), max_length=17, unique=True, db_index=True)

    year = models.PositiveIntegerField(_("year"))
    make = models.CharField(_("make"), max_length=100)
    model = models.CharField(_("model"), max_length=100)
    trim = models.CharField(_("trim"), max_length=100, blank=True)
    body_style = models.CharField(_("body style"), max_length=100, blank=True)

    glass_parts = models.JSONField(_("glass parts data"), default=dict)

    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("mock vehicle data")
        verbose_name_plural = _("mock vehicle data")
        indexes = [
            models.Index(fields=["license_plate", "state"]),
            models.Index(fields=["vin"]),
        ]
        unique_together = ("license_plate", "state")

    def __str__(self):
        return f"{self.year} {self.make} {self.model} ({self.vin})"

    def get_glass_options(self):
        return self.glass_parts
