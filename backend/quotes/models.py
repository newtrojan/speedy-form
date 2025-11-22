from django.db import models  # noqa: F401
import uuid
from django.utils.translation import gettext_lazy as _
from django_fsm import FSMField, transition
from django.contrib.auth import get_user_model

User = get_user_model()


class Quote(models.Model):
    STATE_CHOICES = [
        ("draft", "Draft"),
        ("pending_validation", "Pending Validation"),
        ("sent", "Sent to Customer"),
        ("customer_approved", "Customer Approved"),
        ("scheduled", "Appointment Scheduled"),
        ("converted", "Converted to Job"),
        ("expired", "Expired"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    vin = models.CharField(_("VIN"), max_length=17)
    vehicle_info = models.JSONField(default=dict)

    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT, related_name="quotes"
    )
    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.PROTECT, related_name="quotes"
    )

    postal_code = models.CharField(_("postal code"), max_length=20, db_index=True)

    GLASS_TYPE_CHOICES = [
        ("windshield", "Windshield"),
        ("door_front_left", "Door Front Left"),
        ("door_front_right", "Door Front Right"),
        ("door_rear_left", "Door Rear Left"),
        ("door_rear_right", "Door Rear Right"),
        ("back_glass", "Back Glass"),
        ("vent_front_left", "Vent Front Left"),
        ("vent_front_right", "Vent Front Right"),
        ("vent_rear_left", "Vent Rear Left"),
        ("vent_rear_right", "Vent Rear Right"),
    ]
    glass_type = models.CharField(max_length=50, choices=GLASS_TYPE_CHOICES)

    SERVICE_TYPE_CHOICES = [
        ("mobile", "Mobile Service"),
        ("in_store", "In-Store Service"),
    ]
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    service_address = models.JSONField(default=dict, blank=True)
    distance_from_shop_miles = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )

    PAYMENT_TYPE_CHOICES = [
        ("cash", "Cash/Credit"),
        ("insurance", "Insurance"),
    ]
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)

    insurance_provider = models.ForeignKey(
        "pricing.InsuranceProvider", on_delete=models.SET_NULL, null=True, blank=True
    )
    insurance_claim_number = models.CharField(max_length=100, blank=True)
    insurance_deductible = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    pricing_details = models.JSONField(default=dict)

    part_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    fees = models.JSONField(default=dict)
    total_price = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    state = FSMField(default="draft", choices=STATE_CHOICES, protected=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    SOURCE_CHOICES = [
        ("website", "Website"),
        ("vapi", "VAPI Call"),
    ]
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="website")

    task_id = models.CharField(max_length=255, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["state", "created_at"]),
            models.Index(fields=["postal_code", "service_type"]),
        ]

    def __str__(self):
        return f"Quote {self.id} ({self.state})"

    # Transitions
    @transition(field=state, source="draft", target="pending_validation")
    def submit_for_validation(self):
        pass

    @transition(field=state, source=["draft", "pending_validation"], target="sent")
    def send_to_customer(self):
        pass

    @transition(field=state, source="sent", target="customer_approved")
    def approve(self):
        pass


class QuoteLineItem(models.Model):
    TYPE_CHOICES = [
        ("part", "Part"),
        ("labor", "Labor"),
        ("fee", "Fee"),
        ("custom", "Custom"),
    ]

    quote = models.ForeignKey(
        Quote, on_delete=models.CASCADE, related_name="line_items"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    subtotal = models.DecimalField(max_digits=8, decimal_places=2)
    metadata = models.JSONField(default=dict, blank=True)

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class QuoteStateLog(models.Model):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="logs")
    from_state = models.CharField(max_length=50)
    to_state = models.CharField(max_length=50)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-timestamp"]
