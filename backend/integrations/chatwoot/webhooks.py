"""
Chatwoot Webhook Handlers

Handles incoming webhook events from Chatwoot for real-time updates.

Events handled:
- message_created: New message in conversation
- conversation_created: New conversation started
- conversation_status_changed: Conversation opened/resolved/etc
- conversation_updated: Conversation metadata changed
- contact_updated: Contact info changed (for reverse sync)
"""

import hashlib
import hmac
import logging
from typing import Optional

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class WebhookRateThrottle(AnonRateThrottle):
    """Rate limiting for webhook endpoint - 100 requests per minute per IP."""
    rate = '100/min'


class ChatwootWebhookError(Exception):
    """Exception for webhook processing errors."""
    pass


def verify_webhook_token(request: HttpRequest, url_token: Optional[str] = None) -> bool:
    """
    Verify Chatwoot webhook using URL token.

    Since Chatwoot doesn't support HMAC signatures for webhooks,
    we use a secret token in the URL path for verification.

    Args:
        request: Django HTTP request
        url_token: Token from URL path (if using token-based URL)

    Returns:
        True if token is valid or verification is disabled
    """
    # Use CHATWOOT_WEBHOOK_SECRET from settings (already defined in base.py)
    webhook_token = getattr(settings, "CHATWOOT_WEBHOOK_SECRET", "")

    # Skip verification if no token configured (dev mode)
    if not webhook_token:
        logger.warning(
            "CHATWOOT_WEBHOOK_SECRET not configured. "
            "Set this in production for security. "
            "Generate with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )
        return True

    # Verify URL token using constant-time comparison
    if url_token and hmac.compare_digest(url_token, webhook_token):
        return True

    logger.warning("Invalid or missing webhook token")
    return False


@method_decorator(never_cache, name='dispatch')
class ChatwootWebhookView(APIView):
    """
    Webhook endpoint for Chatwoot events.

    POST /api/v1/webhooks/chatwoot/<token>/

    Configure in Chatwoot:
    Settings → Integrations → Webhooks → Add Webhook
    URL: https://your-api.com/api/v1/webhooks/chatwoot/<your-secret-token>/
    Events: message_created, conversation_created, conversation_status_changed, contact_updated

    Security:
    Since Chatwoot doesn't support HMAC signatures, we use a URL-based token.
    Generate token: python -c "import secrets; print(secrets.token_urlsafe(32))"
    Set CHATWOOT_WEBHOOK_SECRET in your .env file.
    """

    permission_classes = [AllowAny]  # Chatwoot doesn't support auth headers
    throttle_classes = [WebhookRateThrottle]  # Rate limit: 100/min per IP

    def post(self, request, token: Optional[str] = None) -> Response:
        """Handle incoming Chatwoot webhook."""

        # Verify token from URL
        if not verify_webhook_token(request, token):
            logger.warning("Invalid Chatwoot webhook token")
            return Response(
                {"error": "Unauthorized"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            payload = request.data
            event_type = payload.get("event")

            logger.info(
                f"Received Chatwoot webhook: {event_type}",
                extra={"event": event_type, "payload_keys": list(payload.keys())},
            )

            # Route to appropriate handler
            handler = self._get_handler(event_type)
            if handler:
                handler(payload)
            else:
                logger.debug(f"No handler for Chatwoot event: {event_type}")

            return Response({"status": "ok"})

        except Exception as e:
            logger.error(f"Error processing Chatwoot webhook: {e}", exc_info=True)
            # Return 200 to prevent Chatwoot from retrying
            return Response({"status": "error", "message": str(e)})

    def _get_handler(self, event_type: str):
        """Get handler function for event type."""
        handlers = {
            "message_created": self._handle_message_created,
            "message_updated": self._handle_message_updated,
            "conversation_created": self._handle_conversation_created,
            "conversation_status_changed": self._handle_conversation_status_changed,
            "conversation_updated": self._handle_conversation_updated,
            "contact_updated": self._handle_contact_updated,
            "webwidget_triggered": self._handle_webwidget_triggered,
        }
        return handlers.get(event_type)

    def _handle_message_created(self, payload: dict):
        """
        Handle new message event.

        Triggers:
        - Update unread count in dashboard
        - Send notification if customer message
        - Log for analytics
        """
        message = payload.get("message", {})
        conversation = payload.get("conversation", {})
        sender = payload.get("sender", {})

        message_type = message.get("message_type")
        conversation_id = conversation.get("id")
        sender_type = sender.get("type")  # 'contact' or 'user'

        logger.info(
            f"New message in conversation {conversation_id}",
            extra={
                "conversation_id": conversation_id,
                "message_type": message_type,
                "sender_type": sender_type,
            },
        )

        # If customer message, could trigger notification to CSR
        if sender_type == "contact":
            self._notify_new_customer_message(conversation, message, sender)

    def _handle_message_updated(self, payload: dict):
        """Handle message update (e.g., delivery status change)."""
        message = payload.get("message", {})
        logger.debug(f"Message updated: {message.get('id')}")

    def _handle_conversation_created(self, payload: dict):
        """
        Handle new conversation event.

        Triggers:
        - Attempt to link to existing customer
        - Create notification for CSR
        """
        conversation = payload.get("conversation", {})
        contact = payload.get("contact", {})

        conversation_id = conversation.get("id")
        contact_email = contact.get("email")
        contact_phone = contact.get("phone_number")

        logger.info(
            f"New conversation {conversation_id}",
            extra={
                "conversation_id": conversation_id,
                "contact_email": contact_email,
                "contact_phone": contact_phone,
            },
        )

        # Try to link to existing customer
        self._link_conversation_to_customer(conversation, contact)

    def _handle_conversation_status_changed(self, payload: dict):
        """
        Handle conversation status change.

        Statuses: open, resolved, pending, snoozed
        """
        conversation = payload.get("conversation", {})
        old_status = payload.get("previous_status")
        new_status = conversation.get("status")

        logger.info(
            f"Conversation {conversation.get('id')} status: {old_status} → {new_status}",
            extra={
                "conversation_id": conversation.get("id"),
                "old_status": old_status,
                "new_status": new_status,
            },
        )

    def _handle_conversation_updated(self, payload: dict):
        """Handle conversation metadata update."""
        conversation = payload.get("conversation", {})
        logger.debug(f"Conversation updated: {conversation.get('id')}")

    def _handle_webwidget_triggered(self, payload: dict):
        """Handle web widget events (customer started chat)."""
        logger.info("Web widget triggered", extra={"payload": payload})

    def _notify_new_customer_message(self, conversation: dict, message: dict, sender: dict):
        """
        Send notification about new customer message.

        Could implement:
        - WebSocket push to dashboard
        - Email notification to assigned agent
        - Update badge count
        """
        # Get contact's custom_attributes to find customer_id
        contact_attrs = sender.get("custom_attributes", {})
        customer_id = contact_attrs.get("customer_id")

        if customer_id:
            logger.info(
                f"Customer {customer_id} sent message in conversation {conversation.get('id')}"
            )
            # TODO: Implement real-time notification via WebSocket or Celery task

    def _link_conversation_to_customer(self, conversation: dict, contact: dict):
        """
        Attempt to link Chatwoot conversation to Django Customer.

        Searches by email first, then by phone (E.164 normalized).
        For SMS-only contacts (no email), updates Chatwoot contact with
        customer's email as identifier for unified contact linking.
        """
        from customers.models import Customer
        from integrations.chatwoot.services import ContactSyncService, format_phone_e164

        contact_id = contact.get("id")
        contact_email = contact.get("email")
        contact_phone = contact.get("phone_number")

        # Normalize phone to E.164 for accurate matching
        normalized_phone = format_phone_e164(contact_phone) if contact_phone else None

        customer = None
        matched_by = None

        # Try to find customer by email first (most reliable)
        if contact_email:
            try:
                customer = Customer.objects.get(email__iexact=contact_email)
                matched_by = "email"
            except Customer.DoesNotExist:
                pass

        # Try phone if email didn't match
        if not customer and normalized_phone:
            try:
                customer = Customer.objects.get(phone=normalized_phone)
                matched_by = "phone"
            except Customer.DoesNotExist:
                # Also try with original phone format in case stored differently
                try:
                    customer = Customer.objects.get(phone=contact_phone)
                    matched_by = "phone"
                except Customer.DoesNotExist:
                    pass

        if customer:
            logger.info(
                f"Linked conversation {conversation.get('id')} to customer {customer.id} (matched by {matched_by})"
            )

            # Sync customer to Chatwoot - this will set identifier = email
            sync_service = ContactSyncService()
            try:
                sync_service.sync_customer_to_chatwoot(customer)

                # If matched by phone but contact had no email, explicitly update
                # the Chatwoot contact to merge it with the customer's email identifier
                if matched_by == "phone" and not contact_email and contact_id:
                    logger.info(
                        f"Merging SMS contact {contact_id} with customer {customer.id} email identifier"
                    )
                    try:
                        sync_service.client.update_contact(
                            contact_id=contact_id,
                            email=customer.email,
                            identifier=customer.email,
                            custom_attributes={"customer_id": customer.id},
                        )
                    except Exception as e:
                        logger.warning(f"Could not update SMS contact identifier: {e}")

            except Exception as e:
                logger.error(f"Failed to sync customer to Chatwoot: {e}")
        else:
            logger.debug(
                f"No matching customer for conversation {conversation.get('id')} "
                f"(email={contact_email}, phone={contact_phone})"
            )

    def _handle_contact_updated(self, payload: dict):
        """
        Handle contact update event for selective reverse sync.

        Syncs agent corrections from Chatwoot back to Django:
        - Phone corrections (agent fixed typo)
        - Name corrections

        Does NOT sync:
        - Email (identifier, should not change)
        - Custom attributes (Django is authoritative)
        """
        from customers.models import Customer
        from integrations.chatwoot.services import format_phone_e164

        contact = payload.get("contact", {})
        custom_attrs = contact.get("custom_attributes", {})
        customer_id = custom_attrs.get("customer_id")

        if not customer_id:
            logger.debug("Contact update without customer_id, skipping reverse sync")
            return

        # Idempotency check - prevent rapid duplicate updates
        cache_key = f"chatwoot_contact_update_{contact.get('id')}"
        if cache.get(cache_key):
            logger.debug(f"Skipping duplicate contact update for contact {contact.get('id')}")
            return
        cache.set(cache_key, True, timeout=10)  # 10s debounce

        try:
            customer = Customer.objects.get(id=customer_id)
            updated_fields = []

            # Sync phone if changed (normalize first)
            new_phone = format_phone_e164(contact.get("phone_number"))
            if new_phone and new_phone != customer.phone:
                logger.info(
                    f"Syncing phone correction from Chatwoot for customer {customer_id}: "
                    f"{customer.phone} → {new_phone}"
                )
                customer.phone = new_phone
                updated_fields.append("phone")

            # Sync name if changed
            new_name = contact.get("name")
            if new_name:
                current_name = customer.get_full_name()
                if new_name != current_name:
                    # Parse name (simple split)
                    parts = new_name.split(" ", 1)
                    new_first = parts[0]
                    new_last = parts[1] if len(parts) > 1 else ""

                    if new_first != customer.first_name or new_last != customer.last_name:
                        logger.info(
                            f"Syncing name correction from Chatwoot for customer {customer_id}: "
                            f"'{current_name}' → '{new_name}'"
                        )
                        customer.first_name = new_first
                        customer.last_name = new_last
                        updated_fields.extend(["first_name", "last_name"])

            if updated_fields:
                customer.save(update_fields=updated_fields)
                logger.info(
                    f"Reverse synced contact updates for customer {customer_id}: {updated_fields}"
                )
            else:
                logger.debug(f"No changes to sync for customer {customer_id}")

        except Customer.DoesNotExist:
            logger.warning(f"Contact update for unknown customer_id: {customer_id}")
