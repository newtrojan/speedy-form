"""
Celery Tasks for Chatwoot Integration

Background tasks for syncing customers and handling follow-ups.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def sync_customer_to_chatwoot_task(self, customer_id: int):
    """
    Background task to sync a customer to Chatwoot.

    Called when a new customer is created or updated.

    Args:
        customer_id: ID of the Customer to sync
    """
    from customers.models import Customer
    from integrations.chatwoot.services import ContactSyncService

    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        logger.warning(f"Customer {customer_id} not found, skipping Chatwoot sync")
        return

    service = ContactSyncService()

    try:
        contact = service.sync_customer_to_chatwoot(customer)
        logger.info(
            f"Synced customer {customer_id} to Chatwoot contact {contact.get('id')}"
        )
        return {"status": "synced", "contact_id": contact.get("id")}
    except Exception as e:
        logger.error(f"Failed to sync customer {customer_id} to Chatwoot: {e}")
        raise


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def update_quote_context_task(self, quote_id: str):
    """
    Update Chatwoot contact with quote context.

    Called when a quote is created or updated.

    Args:
        quote_id: UUID of the Quote
    """
    from quotes.models import Quote
    from integrations.chatwoot.services import ContactSyncService

    try:
        quote = Quote.objects.select_related("customer").get(id=quote_id)
    except Quote.DoesNotExist:
        logger.warning(f"Quote {quote_id} not found, skipping context update")
        return

    if not quote.customer:
        logger.debug(f"Quote {quote_id} has no customer, skipping context update")
        return

    service = ContactSyncService()

    try:
        service.update_contact_quote_context(quote.customer, quote)
        logger.info(f"Updated Chatwoot context for quote {quote_id}")
        return {"status": "updated"}
    except Exception as e:
        logger.error(f"Failed to update quote context for {quote_id}: {e}")
        raise


@shared_task
def check_follow_up_needed():
    """
    Periodic task to check for quotes needing follow-up.

    Identifies quotes that were sent 24+ hours ago with no response.
    Creates follow-up reminders for CSRs.

    Should run hourly via Celery Beat.
    """
    from quotes.models import Quote

    now = timezone.now()
    threshold = now - timedelta(hours=24)

    # Find quotes sent more than 24h ago that haven't been followed up
    quotes_needing_followup = Quote.objects.filter(
        state="sent",
        sent_at__lte=threshold,
        sent_at__gte=threshold - timedelta(days=7),  # Don't go back more than 7 days
    ).exclude(
        # Exclude if already has a recent note about follow-up
        notes__content__icontains="follow-up",
        notes__created_at__gte=threshold,
    ).select_related("customer")

    count = 0
    for quote in quotes_needing_followup:
        # Could create a QuoteNote or notification here
        logger.info(
            f"Quote {quote.quote_number} needs follow-up "
            f"(sent {quote.sent_at}, customer: {quote.customer})"
        )
        count += 1

    logger.info(f"Found {count} quotes needing follow-up")
    return {"quotes_flagged": count}


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_quote_notification_task(self, quote_id: str, message: str, include_link: bool = True):
    """
    Send a notification about a quote via Chatwoot.

    Args:
        quote_id: UUID of the Quote
        message: Message content
        include_link: Whether to append the quote link
    """
    from quotes.models import Quote
    from integrations.chatwoot.services import ConversationService
    from integrations.chatwoot.client import ChatwootError

    try:
        quote = Quote.objects.select_related("customer").get(id=quote_id)
    except Quote.DoesNotExist:
        logger.warning(f"Quote {quote_id} not found, skipping notification")
        return

    if not quote.customer:
        logger.warning(f"Quote {quote_id} has no customer, skipping notification")
        return

    service = ConversationService()

    try:
        result = service.send_quote_message(
            quote=quote,
            content=message,
            include_quote_link=include_link,
        )
        logger.info(f"Sent notification for quote {quote_id}")
        return {"status": "sent", "message_id": result.get("id")}
    except ChatwootError as e:
        logger.error(f"Failed to send notification for quote {quote_id}: {e.message}")
        raise


@shared_task
def sync_all_customers_to_chatwoot():
    """
    Bulk sync all customers to Chatwoot.

    Useful for initial migration or periodic reconciliation.
    Should be run manually, not scheduled.
    """
    from customers.models import Customer
    from integrations.chatwoot.services import ContactSyncService
    from integrations.chatwoot.client import ChatwootClient

    client = ChatwootClient()
    if not client.is_configured:
        logger.warning("Chatwoot not configured, skipping bulk sync")
        return {"status": "skipped", "reason": "not_configured"}

    service = ContactSyncService()
    customers = Customer.objects.all()

    synced = 0
    failed = 0

    for customer in customers:
        try:
            service.sync_customer_to_chatwoot(customer)
            synced += 1
        except Exception as e:
            logger.error(f"Failed to sync customer {customer.id}: {e}")
            failed += 1

    logger.info(f"Bulk sync complete: {synced} synced, {failed} failed")
    return {"synced": synced, "failed": failed}
