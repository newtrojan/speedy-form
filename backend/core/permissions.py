"""
Custom permission classes for role-based access control.
"""

from rest_framework.permissions import BasePermission


class IsSupportAgent(BasePermission):
    """
    Permission class that allows access only to users in the 'Support Agent' group.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.groups.filter(name="Support Agent").exists()


class IsSupportOrAdmin(BasePermission):
    """
    Permission class that allows access to support agents or admin users.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_staff
            or request.user.groups.filter(name="Support Agent").exists()
        )


class IsCustomerOwner(BasePermission):
    """
    Permission class that allows customers to access only their own resources.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin and support agents can access all
        if (
            request.user.is_staff
            or request.user.groups.filter(name="Support Agent").exists()
        ):
            return True

        # Check if object has a customer attribute and matches the user
        if hasattr(obj, "customer"):
            return obj.customer.user == request.user

        return False
