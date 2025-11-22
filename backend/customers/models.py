from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _


class Customer(models.Model):
    email = models.EmailField(_("email address"), unique=True, db_index=True)
    phone = models.CharField(_("phone number"), max_length=20)  # E.164 format
    first_name = models.CharField(_("first name"), max_length=150, blank=True)
    last_name = models.CharField(_("last name"), max_length=150, blank=True)

    # Address
    street_address = models.CharField(_("street address"), max_length=255, blank=True)
    street_address_2 = models.CharField(
        _("street address 2"), max_length=255, blank=True
    )
    city = models.CharField(_("city"), max_length=100, blank=True)
    state = models.CharField(_("state"), max_length=100, blank=True)
    postal_code = models.CharField(
        _("postal code"), max_length=20, db_index=True, blank=True
    )

    # Geolocation
    location = models.PointField(_("location"), null=True, blank=True, srid=4326)

    # Marketing
    sms_opt_in = models.BooleanField(_("SMS opt-in"), default=False)
    email_opt_in = models.BooleanField(_("email opt-in"), default=False)

    # Analytics
    total_jobs = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("customer")
        verbose_name_plural = _("customers")
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["postal_code"]),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        """
        Return the first_name plus the last_name, with a space in between.
        """
        full_name = "%s %s" % (self.first_name, self.last_name)
        return full_name.strip()

    def has_complete_address(self):
        return all([self.street_address, self.city, self.state, self.postal_code])
