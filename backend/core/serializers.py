from rest_framework import serializers


class BaseSerializer(serializers.ModelSerializer):
    """
    Base serializer with common logic if needed.
    """

    pass


class ErrorResponseSerializer(serializers.Serializer):
    """
    Standard error response format.
    """

    status = serializers.CharField()
    message = serializers.CharField()
    details = serializers.JSONField(required=False)
