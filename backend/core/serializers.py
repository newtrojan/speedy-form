from rest_framework import serializers


class TimestampedSerializer(serializers.Serializer):
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class ErrorSerializer(serializers.Serializer):
    error = serializers.CharField()
    message = serializers.CharField()
    field = serializers.CharField(required=False, allow_null=True)
    details = serializers.DictField(required=False, allow_null=True)
