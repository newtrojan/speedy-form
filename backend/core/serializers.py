from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class TimestampedSerializer(serializers.Serializer):
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class ErrorSerializer(serializers.Serializer):
    error = serializers.CharField()
    message = serializers.CharField()
    field = serializers.CharField(required=False, allow_null=True)
    details = serializers.DictField(required=False, allow_null=True)


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with computed role and permissions.
    """

    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "permissions",
        ]

    def get_role(self, obj):
        """
        Determine user role based on groups and staff status.
        """
        if obj.is_superuser:
            return "admin"
        elif obj.groups.filter(name="Support Agent").exists():
            return "support_agent"
        else:
            return "customer"

    def get_permissions(self, obj):
        """
        Return list of permission codenames for the user.
        """
        return list(obj.user_permissions.values_list("codename", flat=True))


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login request validation.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class TokenResponseSerializer(serializers.Serializer):
    """
    Serializer for token response format (httpOnly cookie security).

    Note: refresh_token is NOT included - it's set as httpOnly cookie.
    Only access_token is returned in JSON response for memory storage.
    """

    access_token = serializers.CharField()
    user = UserSerializer()
