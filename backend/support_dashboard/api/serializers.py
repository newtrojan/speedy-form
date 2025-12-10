"""
Serializers for support dashboard APIs.
"""

from rest_framework import serializers
from quotes.models import Quote, QuoteNote
from customers.models import Customer
from django.utils import timezone


class QuoteNoteSerializer(serializers.ModelSerializer):
    """
    Serializer for CSR notes on quotes.
    """

    created_by_name = serializers.CharField(read_only=True)

    class Meta:
        model = QuoteNote
        fields = ["id", "content", "created_by_name", "created_at"]
        read_only_fields = ["id", "created_by_name", "created_at"]


class QuoteNoteCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new note.
    """

    content = serializers.CharField(min_length=1, max_length=5000)


class QuoteListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for quote queue display.
    """

    vehicle_display = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source="customer.email")
    customer_phone = serializers.CharField(source="customer.phone")
    customer_name = serializers.SerializerMethodField()
    state_display = serializers.CharField(source="get_state_display")
    age_hours = serializers.SerializerMethodField()
    sla_status = serializers.SerializerMethodField()
    view_count = serializers.SerializerMethodField()
    last_viewed_at = serializers.SerializerMethodField()
    is_hot = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            "id",
            "vehicle_display",
            "customer_email",
            "customer_phone",
            "customer_name",
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
            "view_count",
            "last_viewed_at",
            "is_hot",
        ]

    def get_vehicle_display(self, obj):
        """Format as '2021 Honda Accord'"""
        vehicle = obj.vehicle_info
        return f"{vehicle.get('year')} {vehicle.get('make')} {vehicle.get('model')}"

    def get_customer_name(self, obj):
        """Get customer full name"""
        return f"{obj.customer.first_name} {obj.customer.last_name}".strip()

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

    def get_view_count(self, obj):
        """Count of quote views"""
        return obj.views.count()

    def get_last_viewed_at(self, obj):
        """Timestamp of last view"""
        last_view = obj.views.order_by("-viewed_at").first()
        return last_view.viewed_at if last_view else None

    def get_is_hot(self, obj):
        """Quote is 'hot' if viewed 2+ times"""
        return obj.views.count() >= 2


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
    engagement = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    part_info = serializers.SerializerMethodField()
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
            "csr_notes",
            "notes",
            "part_info",
            "engagement",
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

    def get_engagement(self, obj):
        """Get quote engagement/view tracking data"""
        views = obj.views.all()
        view_count = views.count()
        last_view = views.order_by("-viewed_at").first()

        return {
            "view_count": view_count,
            "last_viewed_at": last_view.viewed_at if last_view else None,
            "is_hot": view_count >= 2,
            "views": [
                {
                    "viewed_at": view.viewed_at,
                    "device_type": view.device_type,
                }
                for view in views[:10]  # Last 10 views
            ],
        }

    def get_notes(self, obj):
        """Get all CSR notes for the quote."""
        notes = obj.csr_notes_list.all()
        return QuoteNoteSerializer(notes, many=True).data

    def get_part_info(self, obj):
        """Extract part info from pricing_details JSON.

        Handles two data formats:
        - New format (V1.2+): Full pricing_data dict with "part", "pricing", "flags" keys
        - Old format (V1.1): Only the "pricing" dict was stored directly
        """
        data = obj.pricing_details or {}

        # Helper to safely convert to float
        def to_float(val, default=0):
            if val is None:
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default

        # Check if new format (has "part" key) or old format
        if "part" in data:
            # New format: full pricing_data dict
            part = data.get("part", {})
            pricing = data.get("pricing", {})

            # Determine calibration type from description or fee
            calibration_fee = to_float(pricing.get("calibration_fee", 0))
            calibration_type = "none"
            if calibration_fee > 0:
                # Extract from part description if available
                description = part.get("description", "").lower()
                if "dual" in description:
                    calibration_type = "dual"
                elif "dynamic" in description:
                    calibration_type = "dynamic"
                elif "static" in description:
                    calibration_type = "static"
                else:
                    calibration_type = "required"  # Generic calibration needed

            # Get photo_urls - fall back to cache if missing
            photo_urls = part.get("photo_urls", [])
            if not photo_urls and obj.vin:
                # Photos missing - try to fetch from cache
                from vehicles.models import AutoboltAPICache
                cache = AutoboltAPICache.objects.filter(
                    request_key=obj.vin,
                    request_type="vin_decode"
                ).first()
                if cache:
                    part_data = cache.get_primary_part()
                    if part_data:
                        photo_urls = part_data.get("photoUrls", [])

            return {
                "nags_part_number": part.get("nags_part_number"),
                "calibration_type": calibration_type,
                "features": part.get("features", []),
                "photo_urls": photo_urls,
                "moulding_required": to_float(pricing.get("moulding_fee", 0)) > 0,
                "hardware_required": to_float(pricing.get("hardware_fee", 0)) > 0,
                "labor_hours": None,  # Not stored in current structure
            }
        # OLD FORMAT FALLBACK: Fetch from AutoboltAPICache
        if obj.vin:
            from vehicles.models import AutoboltAPICache

            cache = AutoboltAPICache.objects.filter(
                request_key=obj.vin,
                request_type="vin_decode"
            ).first()

            if cache:
                part_data = cache.get_primary_part()
                if part_data:
                    # Extract features (list of dicts with 'name' key)
                    features_raw = part_data.get("features", [])
                    features = [f["name"] for f in features_raw if isinstance(f, dict)]

                    # Get calibration type
                    calibrations = part_data.get("calibrations", [])
                    calibration_type = "none"
                    if calibrations:
                        cal_name = calibrations[0].get("calibrationType", {}).get("name", "").lower()
                        if "dual" in cal_name:
                            calibration_type = "dual"
                        elif "dynamic" in cal_name:
                            calibration_type = "dynamic"
                        elif "static" in cal_name:
                            calibration_type = "static"
                        else:
                            calibration_type = "required"

                    return {
                        "nags_part_number": part_data.get("amNumber", "")[:7] if part_data.get("amNumber") else None,
                        "calibration_type": calibration_type,
                        "features": features,
                        "photo_urls": part_data.get("photoUrls", []),
                        "moulding_required": to_float(data.get("moulding_fee", 0)) > 0,
                        "hardware_required": to_float(data.get("hardware_fee", 0)) > 0,
                        "labor_hours": None,
                    }

        # Ultimate fallback: empty data (no cache available)
        return {
            "nags_part_number": None,
            "calibration_type": "none",
            "features": [],
            "photo_urls": [],
            "moulding_required": to_float(data.get("moulding_fee", 0)) > 0,
            "hardware_required": to_float(data.get("hardware_fee", 0)) > 0,
            "labor_hours": None,
        }

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
    csr_notes = serializers.CharField(required=False, allow_blank=True)

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
