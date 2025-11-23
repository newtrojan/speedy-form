from rest_framework import serializers
from customers.models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "email", "phone", "first_name", "last_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class CustomerCreateSerializer(serializers.ModelSerializer):
    street_address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Customer
        fields = [
            "email",
            "phone",
            "first_name",
            "last_name",
            "street_address",
            "city",
            "state",
            "postal_code",
        ]

    def validate(self, data):
        # Address validation logic can be added here if needed,
        # but typically it's context-dependent (e.g. only if mobile service)
        return data
