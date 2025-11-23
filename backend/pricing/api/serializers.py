from rest_framework import serializers
from pricing.models import InsuranceProvider


class InsuranceProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceProvider
        fields = [
            "id",
            "name",
            "code",
            "requires_pre_approval",
            "average_approval_time_hours",
        ]
        read_only_fields = fields
