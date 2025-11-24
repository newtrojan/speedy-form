"""
Serializers for support dashboard APIs.
"""

from rest_framework import serializers
from quotes.models import Quote
from customers.models import Customer
from django.utils import timezone


class QuoteListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for quote queue display.
    """

    vehicle_display = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source="customer.email")
    customer_phone = serializers.CharField(source="customer.phone")
    state_display = serializers.CharField(source="get_state_display")
    age_hours = serializers.SerializerMethodField()
    sla_status = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            "id",
            "vehicle_display",
            "customer_email",
            "customer_phone",
            "glass_type",
            "service_type",
            "payment_type",
            "total_price",
            "state",
            "state_display",
            "created_at",
            "age_hours",
            "sla_status",
            "expires_at",
        ]

    def get_vehicle_display(self, obj):
        """Format as '2021 Honda Accord'"""
        vehicle = obj.vehicle_info
        return f"{vehicle.get('year')} {vehicle.get('make')} {vehicle.get('model')}"

    def get_age_hours(self, obj):
        """Calculate hours since creation"""
        delta = timezone.now() - obj.created_at
        return int(delta.total_seconds() / 3600)

    def get_sla_status(self, obj):
        """Determine SLA status (on_time, at_risk, breached)"""
        age_hours = self.get_age_hours(obj)
        if age_hours < 12:
            return "on_time"
        elif age_hours < 24:
            return "at_risk"
        else:
            return "breached"


class QuoteDetailSerializer(serializers.ModelSerializer):
    """
    Full quote details for support agents.
    """

    vehicle = serializers.DictField(source="vehicle_info")
    customer = serializers.SerializerMethodField()
    glass = serializers.SerializerMethodField()
    service = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    pricing = serializers.SerializerMethodField()
    state_history = serializers.SerializerMethodField()
    _permissions = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            "id",
            "vehicle",
            "customer",
            "glass",
            "service",
            "payment",
            "pricing",
            "state",
            "state_history",
            "internal_notes",
            "created_at",
            "expires_at",
            "_permissions",
        ]

    def get_customer(self, obj):
        return {
            "id": obj.customer.id,
            "email": obj.customer.email,
            "phone": obj.customer.phone,
            "full_name": f"{obj.customer.first_name} {obj.customer.last_name}",
            "address": obj.service_address,
        }

    def get_glass(self, obj):
        return {
            "type": obj.glass_type,
            "display_name": obj.get_glass_type_display(),
        }

    def get_service(self, obj):
        return {
            "type": obj.service_type,
            "location": obj.service_address,
            "assigned_shop": (
                {
                    "id": obj.shop.id,
                    "name": obj.shop.name,
                }
                if obj.shop
                else None
            ),
        }

    def get_payment(self, obj):
        return {
            "type": obj.payment_type,
            "provider": obj.insurance_provider.name if obj.insurance_provider else None,
        }

    def get_pricing(self, obj):
        line_items = obj.line_items.all()
        return {
            "line_items": [
                {
                    "id": item.id,
                    "type": item.type,
                    "description": item.description,
                    "unit_price": item.unit_price,
                    "quantity": item.quantity,
                    "subtotal": item.subtotal,
                }
                for item in line_items
            ],
            "total": obj.total_price,
        }

    def get_state_history(self, obj):
        logs = obj.logs.all()
        return [
            {
                "from_state": log.from_state,
                "to_state": log.to_state,
                "user": log.user.email if log.user else "system",
                "timestamp": log.timestamp,
                "notes": log.notes,
            }
            for log in logs
        ]

    def get__permissions(self, obj):
        return {
            "can_validate": obj.state == "pending_validation",
            "can_reject": obj.state == "pending_validation",
            "can_modify": obj.state == "pending_validation",
            "can_delete": False,
        }


class QuoteModifySerializer(serializers.Serializer):
    """
    Serializer for modifying quotes.
    """

    line_items = serializers.ListField(child=serializers.DictField(), required=False)
    internal_notes = serializers.CharField(required=False, allow_blank=True)

    def validate_line_items(self, value):
        """Validate line items structure"""
        for item in value:
            if "id" in item:
                # Modifying existing item
                if "subtotal" not in item:
                    raise serializers.ValidationError(
                        "Subtotal is required for existing items"
                    )
            else:
                # Adding new item
                required_fields = ["type", "description", "subtotal"]
                for field in required_fields:
                    if field not in item:
                        raise serializers.ValidationError(
                            f"{field} is required for new items"
                        )
        return value


class CustomerDetailSerializer(serializers.ModelSerializer):
    """
    Customer details with quote history.
    """

    total_quotes = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    total_jobs = serializers.SerializerMethodField()
    quotes = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "email",
            "phone",
            "first_name",
            "last_name",
            "total_quotes",
            "total_spent",
            "total_jobs",
            "created_at",
            "quotes",
        ]

    def get_total_quotes(self, obj):
        return obj.quotes.count()

    def get_total_spent(self, obj):
        return sum(
            q.total_price
            for q in obj.quotes.filter(state__in=["customer_approved", "converted"])
        )

    def get_total_jobs(self, obj):
        return obj.quotes.filter(state="converted").count()

    def get_quotes(self, obj):
        quotes = obj.quotes.all().order_by("-created_at")[:10]
        return [
            {
                "id": str(q.id),
                "vehicle": (
                    f"{q.vehicle_info.get('year')} "
                    f"{q.vehicle_info.get('make')} "
                    f"{q.vehicle_info.get('model')}"
                ),
                "total": q.total_price,
                "state": q.state,
                "created_at": q.created_at,
            }
            for q in quotes
        ]
