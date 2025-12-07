from rest_framework import serializers


class VehicleIdentificationRequestSerializer(serializers.Serializer):
    """Request serializer for vehicle identification."""

    vin = serializers.CharField(required=False, max_length=17, min_length=17)
    license_plate = serializers.CharField(required=False, max_length=20)
    state = serializers.CharField(required=False, max_length=2)

    def validate(self, data):
        vin = data.get("vin")
        license_plate = data.get("license_plate")
        state = data.get("state")

        if not vin and not (license_plate and state):
            raise serializers.ValidationError(
                "Must provide either VIN or both License Plate and State."
            )

        return data


class GlassPartSerializer(serializers.Serializer):
    """Serializer for glass part data."""

    nags_part_number = serializers.CharField()
    full_part_number = serializers.CharField(allow_null=True)
    prefix_cd = serializers.CharField()
    nags_list_price = serializers.CharField(allow_null=True)  # Decimal as string
    calibration_type = serializers.CharField(allow_null=True)
    calibration_required = serializers.BooleanField()
    features = serializers.ListField(child=serializers.CharField())
    tube_qty = serializers.CharField()  # Decimal as string
    source = serializers.CharField()


class VehicleLookupResponseSerializer(serializers.Serializer):
    """Response serializer for vehicle lookup."""

    # Source tracking
    source = serializers.ChoiceField(
        choices=["autobolt", "nhtsa+nags", "nags", "cache", "manual"]
    )

    # Vehicle info
    vin = serializers.CharField()
    year = serializers.IntegerField()
    make = serializers.CharField()
    model = serializers.CharField()
    body_style = serializers.CharField(allow_null=True)
    trim = serializers.CharField(allow_null=True)

    # Parts
    parts = GlassPartSerializer(many=True)

    # Flags
    needs_part_selection = serializers.BooleanField()
    needs_calibration_review = serializers.BooleanField()
    needs_manual_review = serializers.BooleanField()
    needs_review = serializers.BooleanField()

    # Confidence
    confidence = serializers.ChoiceField(choices=["high", "medium", "low"])
    review_reason = serializers.CharField(allow_null=True)
