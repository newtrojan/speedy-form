"""
Support Dashboard Models

Contains models for agent profiles and Chatwoot integration.
"""

from django.conf import settings
from django.db import models


class AgentProfile(models.Model):
    """
    Extends User with Chatwoot agent information.

    Links Django support agents to their Chatwoot agent accounts
    for proper message attribution.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="agent_profile",
    )
    chatwoot_agent_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Chatwoot agent ID for message attribution",
    )
    chatwoot_email = models.EmailField(
        null=True,
        blank=True,
        help_text="Email used in Chatwoot (may differ from Django email)",
    )
    is_chatwoot_synced = models.BooleanField(
        default=False,
        help_text="Whether this agent has been synced with Chatwoot",
    )
    synced_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this agent was synced with Chatwoot",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Agent Profile"
        verbose_name_plural = "Agent Profiles"

    def __str__(self):
        if self.chatwoot_agent_id:
            return f"{self.user.email} → Chatwoot Agent {self.chatwoot_agent_id}"
        return f"{self.user.email} (not synced)"

    @property
    def is_linked(self) -> bool:
        """Check if this profile is linked to a Chatwoot agent."""
        return self.chatwoot_agent_id is not None and self.is_chatwoot_synced
