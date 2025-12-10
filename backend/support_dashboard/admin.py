"""
Support Dashboard Admin Configuration
"""

from django.contrib import admin
from django.contrib.auth import get_user_model

from .models import AgentProfile


User = get_user_model()


@admin.register(AgentProfile)
class AgentProfileAdmin(admin.ModelAdmin):
    """Admin interface for AgentProfile model."""

    list_display = [
        "user",
        "chatwoot_email",
        "chatwoot_agent_id",
        "is_chatwoot_synced",
        "synced_at",
    ]
    list_filter = ["is_chatwoot_synced"]
    search_fields = ["user__email", "user__username", "chatwoot_email"]
    readonly_fields = ["synced_at", "created_at", "updated_at"]
    raw_id_fields = ["user"]

    fieldsets = (
        (None, {"fields": ("user",)}),
        (
            "Chatwoot Integration",
            {
                "fields": (
                    "chatwoot_email",
                    "chatwoot_agent_id",
                    "is_chatwoot_synced",
                    "synced_at",
                )
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
