from rest_framework import serializers
from quotes.models import Quote


class QuoteLocationSerializer(serializers.Serializer):
    postal_code = serializers.CharField()
    street_address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)


class QuoteInsuranceSerializer(serializers.Serializer):
    provider_id = serializers.IntegerField()
    claim_number = serializers.CharField(required=False, allow_blank=True)
    deductible = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, allow_null=True
    )


class QuoteCustomerSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class QuoteGenerationRequestSerializer(serializers.Serializer):
    vin = serializers.CharField(max_length=17)
    glass_type = serializers.CharField()
    manufacturer = serializers.CharField(default="nags")
    service_type = serializers.ChoiceField(choices=["mobile", "in_store"])
    payment_type = serializers.ChoiceField(choices=["cash", "insurance"])

    location = QuoteLocationSerializer()
    insurance = QuoteInsuranceSerializer(required=False, allow_null=True)
    customer = QuoteCustomerSerializer()

    def validate(self, data):
        service_type = data.get("service_type")
        location = data.get("location", {})
        payment_type = data.get("payment_type")
        insurance = data.get("insurance")

        if service_type == "mobile":
            if (
                not location.get("street_address")
                or not location.get("city")
                or not location.get("state")
            ):
                raise serializers.ValidationError(
                    {"location": "Full address is required for mobile service."}
                )

        if payment_type == "insurance" and not insurance:
            raise serializers.ValidationError(
                {
                    "insurance": (
                        "Insurance details are required for " "insurance payment type."
                    )
                }
            )

        return data


class QuoteStatusResponseSerializer(serializers.Serializer):
    task_id = serializers.CharField(required=False)
    status = serializers.CharField()
    progress = serializers.IntegerField(required=False)
    message = serializers.CharField(required=False)
    quote_id = serializers.UUIDField(required=False)
    error = serializers.CharField(required=False)
    redirect_url = serializers.CharField(required=False)


class LineItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    description = serializers.CharField()
    unit_price = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False
    )
    quantity = serializers.IntegerField(required=False)
    subtotal = serializers.DecimalField(max_digits=8, decimal_places=2)


class PricingSummarySerializer(serializers.Serializer):
    you_save = serializers.CharField(required=False)


class QuotePricingSerializer(serializers.Serializer):
    line_items = LineItemSerializer(many=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    pricing_summary = PricingSummarySerializer(required=False)


class QuotePreviewSerializer(serializers.ModelSerializer):
    vehicle = serializers.DictField(source="vehicle_info")
    glass = serializers.SerializerMethodField()
    service = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    pricing = serializers.SerializerMethodField()
    state_display = serializers.CharField(source="get_state_display")
    _actions = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            "id",
            "vehicle",
            "glass",
            "service",
            "payment",
            "pricing",
            "state",
            "state_display",
            "expires_at",
            "created_at",
            "_actions",
        ]

    def get_glass(self, obj):
        # Reconstruct glass info. For now, just return the type.
        # Ideally, we would store the selected glass details in the quote.
        return {"type": obj.glass_type, "display_name": obj.get_glass_type_display()}

    def get_service(self, obj):
        # Reconstruct service info from model fields
        addr = obj.service_address or {}
        street = addr.get("street") or addr.get("street_address")
        city = addr.get("city")
        state = addr.get("state")
        zip_code = obj.postal_code

        loc_str = f"{street}, {city}, {state} {zip_code}" if street else zip_code

        return {
            "type": obj.service_type,
            "location": {"formatted": loc_str},
            "assigned_shop": {"name": obj.shop.name if obj.shop else "Unknown"},
        }

    def get_payment(self, obj):
        return {
            "type": obj.payment_type,
            "provider": (
                obj.insurance_provider.name if obj.insurance_provider else None
            ),
        }

    def get_pricing(self, obj):
        # Reconstruct pricing from JSON fields or model fields
        pricing_details = obj.pricing_details or {}

        # Use stored values if available, otherwise calculate
        subtotal = pricing_details.get("subtotal")
        if subtotal is None:
            # Calculate subtotal from costs
            fees_total = (
                sum(f.get("amount", 0) for f in obj.fees)
                if isinstance(obj.fees, list)
                else 0
            )
            subtotal = obj.part_cost + obj.labor_cost + fees_total

        tax = pricing_details.get("tax", 0)

        # Serialize line items
        from quotes.api.serializers import LineItemSerializer

        line_items_data = LineItemSerializer(obj.line_items.all(), many=True).data

        return {
            "line_items": line_items_data,
            "subtotal": subtotal,
            "tax": tax,
            "total": obj.total_price,
        }

    def get__actions(self, obj):
        return {
            "can_approve": obj.state == "sent",
            "can_modify": False,  # MVP
            "can_cancel": obj.state in ["draft", "pending_validation", "sent"],
        }


class ApproveQuoteSerializer(serializers.Serializer):
    token = serializers.CharField()
