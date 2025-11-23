from rest_framework import serializers
from shops.models import Shop


class ShopSerializer(serializers.ModelSerializer):
    address = serializers.SerializerMethodField()
    directions_url = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = ["id", "name", "address", "phone", "email", "directions_url"]
        read_only_fields = fields

    def get_address(self, obj):
        return obj.get_full_address()

    def get_directions_url(self, obj):
        if obj.location:
            return f"https://maps.google.com/?q={obj.location.y},{obj.location.x}"
        return None


class ServiceabilityRequestSerializer(serializers.Serializer):
    postal_code = serializers.CharField(max_length=10)
    street_address = serializers.CharField(required=False)
    city = serializers.CharField(required=False)
    state = serializers.CharField(required=False)


class ServiceabilityResponseSerializer(serializers.Serializer):
    is_serviceable = serializers.BooleanField()
    service_type = serializers.ChoiceField(choices=["in_store", "mobile"])
    shop = ShopSerializer(required=False, allow_null=True)
    nearby_shops = ShopSerializer(many=True, required=False)
    distance_miles = serializers.FloatField(required=False)
    mobile_fee = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False
    )
    message = serializers.CharField()
    suggestion = serializers.DictField(required=False)
