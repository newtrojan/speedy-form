from rest_framework import serializers


class VehicleIdentificationRequestSerializer(serializers.Serializer):
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

        if vin:
            # Basic VIN validation (length is handled by field, but could add regex)
            pass

        return data


class ManufacturerOptionSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    part_number = serializers.CharField()
    list_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    features = serializers.ListField(child=serializers.CharField())
    complexity = serializers.CharField(required=False)


class GlassOptionSerializer(serializers.Serializer):
    type = serializers.CharField()
    display_name = serializers.CharField()
    manufacturers = ManufacturerOptionSerializer(many=True)


class VehicleDetailsSerializer(serializers.Serializer):
    vin = serializers.CharField()
    year = serializers.IntegerField()
    make = serializers.CharField()
    model = serializers.CharField()
    style = serializers.CharField(required=False)


class VehicleResponseSerializer(serializers.Serializer):
    vehicle = VehicleDetailsSerializer()
    glass_options = GlassOptionSerializer(many=True)
