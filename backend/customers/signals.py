"""
Customer signals for Chatwoot sync.

Automatically syncs customers to Chatwoot when created or updated.
"""

import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from customers.models import Customer

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Customer)
def sync_customer_to_chatwoot(sender, instance, created, **kwargs):
    """
    Sync customer to Chatwoot after save.

    Runs async via Celery to avoid blocking the request.
    Only syncs if Chatwoot is configured.
    """
    # Check if Chatwoot is configured
    chatwoot_url = getattr(settings, "CHATWOOT_BASE_URL", "")
    if not chatwoot_url:
        return

    # Import here to avoid circular imports
    from integrations.chatwoot.tasks import sync_customer_to_chatwoot_task

    # Queue sync task
    try:
        sync_customer_to_chatwoot_task.delay(instance.id)
        action = "created" if created else "updated"
        logger.debug(f"Queued Chatwoot sync for {action} customer {instance.id}")
    except Exception as e:
        # Don't fail the save if task queueing fails
        logger.error(f"Failed to queue Chatwoot sync for customer {instance.id}: {e}")
