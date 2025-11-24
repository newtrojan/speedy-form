from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _


class Shop(models.Model):
    name = models.CharField(_("shop name"), max_length=255)
    street_address = models.CharField(_("street address"), max_length=255)
    city = models.CharField(_("city"), max_length=100)
    state = models.CharField(_("state"), max_length=100)
    postal_code = models.CharField(_("postal code"), max_length=20)

    phone = models.CharField(_("phone number"), max_length=20)
    email = models.EmailField(_("email address"))

    location = models.PointField(_("location"), srid=4326)

    offers_mobile_service = models.BooleanField(default=True)
    max_mobile_radius_miles = models.PositiveIntegerField(default=50)

    business_hours = models.JSONField(default=dict)

    is_accepting_jobs = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    auto_approve_quotes = models.BooleanField(
        default=False,
        help_text=_(
            "Automatically approve and send quotes to customers without manual review"
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def get_full_address(self):
        return f"{self.street_address}, {self.city}, {self.state} {self.postal_code}"


class ServiceArea(models.Model):
    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name="service_areas"
    )
    postal_code = models.CharField(_("postal code"), max_length=20, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["postal_code"]),
            models.Index(fields=["shop", "postal_code"]),
        ]
        unique_together = ("shop", "postal_code")

    def __str__(self):
        return f"{self.shop.name} - {self.postal_code}"
