import re
from rest_framework import serializers
from customers.models import Customer


def normalize_phone_e164(phone: str) -> str:
    """
    Normalize phone number to E.164 format (+1XXXXXXXXXX).

    This is the international standard required by SMS providers and Chatwoot.
    """
    if not phone:
        return phone

    # Remove all non-digit characters except leading +
    cleaned = re.sub(r"[^\d+]", "", phone)

    # If already starts with +, assume it's in E.164
    if cleaned.startswith("+"):
        return cleaned

    # Remove leading zeros
    cleaned = cleaned.lstrip("0")

    # 10-digit US number -> add +1
    if len(cleaned) == 10:
        return f"+1{cleaned}"

    # 11-digit starting with 1 (US with country code) -> add +
    if len(cleaned) == 11 and cleaned.startswith("1"):
        return f"+{cleaned}"

    # For other formats, assume US and add +1
    if len(cleaned) >= 7:
        return f"+1{cleaned}"

    # Return as-is if we can't normalize
    return phone


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

    def validate_phone(self, value):
        """Normalize phone number to E.164 format."""
        return normalize_phone_e164(value)

    def validate(self, data):
        # Address validation logic can be added here if needed,
        # but typically it's context-dependent (e.g. only if mobile service)
        return data
