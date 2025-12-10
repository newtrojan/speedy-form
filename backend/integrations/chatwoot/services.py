"""
Chatwoot Integration Services

High-level services for syncing customers and managing conversations.
"""

import logging
import re
from datetime import timedelta
from typing import Optional

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from core.services.base_service import BaseService
from integrations.chatwoot.client import ChatwootClient, ChatwootError

logger = logging.getLogger(__name__)

# Lock timeout for sync operations (seconds)
SYNC_LOCK_TIMEOUT = 30


def format_phone_e164(phone: Optional[str], default_country_code: str = "+1") -> Optional[str]:
    """
    Format a phone number to E.164 format.

    E.164 format: +[country code][number] (e.g., +12025551234)

    Args:
        phone: Phone number in any format
        default_country_code: Country code to use if not present (default: +1 for US)

    Returns:
        Phone number in E.164 format, or None if invalid
    """
    if not phone:
        return None

    # Remove all non-digit characters except leading +
    cleaned = re.sub(r"[^\d+]", "", phone)

    # If it already starts with +, assume it's already in E.164
    if cleaned.startswith("+"):
        return cleaned

    # Remove leading zeros
    cleaned = cleaned.lstrip("0")

    # If it's a 10-digit US number, add +1
    if len(cleaned) == 10:
        return f"{default_country_code}{cleaned}"

    # If it's 11 digits starting with 1 (US with country code), add +
    if len(cleaned) == 11 and cleaned.startswith("1"):
        return f"+{cleaned}"

    # For other formats, try adding default country code
    if len(cleaned) >= 7:
        return f"{default_country_code}{cleaned}"

    # Invalid phone number
    return None


class ContactSyncService(BaseService):
    """
    Service for syncing Django Customers to Chatwoot Contacts.

    Maintains a mapping between your Customer model and Chatwoot's Contact model.
    Uses customer email as the external identifier for unified contact linking
    across quote form, web chat, and SMS channels.
    """

    def __init__(self, client: Optional[ChatwootClient] = None):
        super().__init__()
        self.client = client or ChatwootClient()

    def sync_customer_to_chatwoot(self, customer) -> dict:
        """
        Sync a Customer to Chatwoot as a Contact.

        Creates a new contact if one doesn't exist, or updates existing.
        Uses cache-based locking to prevent race conditions during concurrent syncs.

        Args:
            customer: Customer model instance

        Returns:
            Chatwoot contact data dict

        Raises:
            ChatwootError: If sync fails
        """
        if not self.client.is_configured:
            self.log_warning("Chatwoot not configured, skipping customer sync")
            return {}

        # Idempotency lock to prevent race conditions during concurrent syncs
        # (e.g., multiple Celery tasks for the same customer)
        lock_key = f"chatwoot_sync_customer_{customer.id}"
        if cache.get(lock_key):
            self.log_debug(f"Sync already in progress for customer {customer.id}, returning cached contact")
            # Try to return existing contact instead of waiting
            existing_contact_id = self.get_chatwoot_contact_id(customer)
            if existing_contact_id:
                try:
                    return self.client.get_contact(existing_contact_id)
                except ChatwootError:
                    pass
            return {}

        # Acquire lock
        cache.set(lock_key, True, timeout=SYNC_LOCK_TIMEOUT)

        try:
            # Use email as identifier for unified contact linking across channels
            identifier = customer.email
            custom_attributes = {
                "customer_id": customer.id,
                "postal_code": customer.postal_code or "",
                "sms_opt_in": customer.sms_opt_in,
                "email_opt_in": customer.email_opt_in,
                "total_jobs": customer.total_jobs,
            }

            # Format phone to E.164 (Chatwoot requires this format)
            formatted_phone = format_phone_e164(customer.phone)

            contact, created = self.client.get_or_create_contact(
                email=customer.email,
                phone=formatted_phone,
                name=customer.get_full_name() or customer.email,
                identifier=identifier,
                custom_attributes=custom_attributes,
            )

            action = "created" if created else "found existing"
            self.log_info(
                f"Chatwoot contact {action} for customer {customer.id}",
                extra={"customer_id": customer.id, "chatwoot_contact_id": contact.get("id")},
            )

            # Update existing contact with latest data
            if not created and contact.get("id"):
                contact = self.client.update_contact(
                    contact_id=contact["id"],
                    email=customer.email,
                    phone=formatted_phone,
                    name=customer.get_full_name() or customer.email,
                    custom_attributes=custom_attributes,
                )

            return contact

        except ChatwootError as e:
            self.log_error(
                f"Failed to sync customer {customer.id} to Chatwoot: {e.message}",
                extra={"customer_id": customer.id, "error": str(e)},
            )
            raise
        finally:
            # Release lock
            cache.delete(lock_key)

    def update_contact_quote_context(self, customer, quote) -> dict:
        """
        Update Chatwoot contact with active quote context.

        Adds quote information to custom_attributes so agents see context.

        Args:
            customer: Customer model instance
            quote: Quote model instance

        Returns:
            Updated contact data
        """
        if not self.client.is_configured:
            return {}

        # Use email as identifier for unified contact linking
        identifier = customer.email

        try:
            # Find contact
            contacts = self.client.search_contacts(identifier)
            if not contacts:
                # Create contact if not found
                contact = self.sync_customer_to_chatwoot(customer)
                contact_id = contact.get("id")
            else:
                contact_id = contacts[0].get("id")

            if not contact_id:
                return {}

            # Build quote context
            vehicle_info = quote.vehicle_info or {}
            vehicle_str = f"{vehicle_info.get('year', '')} {vehicle_info.get('make', '')} {vehicle_info.get('model', '')}".strip()

            custom_attributes = {
                "customer_id": customer.id,
                "active_quote_id": str(quote.id),
                "active_quote_number": str(quote.id)[:8],  # Use first 8 chars of UUID as quote number
                "quote_status": quote.state,
                "quote_total": str(quote.total_price) if quote.total_price else "",
                "quote_vehicle": vehicle_str,
                "quote_service_type": quote.service_type or "",
            }

            return self.client.update_contact(
                contact_id=contact_id,
                custom_attributes=custom_attributes,
            )

        except ChatwootError as e:
            self.log_error(
                f"Failed to update quote context for customer {customer.id}: {e.message}",
                extra={"customer_id": customer.id, "quote_id": str(quote.id)},
            )
            return {}

    def get_chatwoot_contact_id(self, customer) -> Optional[int]:
        """
        Get Chatwoot contact ID for a customer.

        Args:
            customer: Customer model instance

        Returns:
            Chatwoot contact ID or None if not found
        """
        if not self.client.is_configured:
            return None

        # Use email as identifier for unified contact linking
        identifier = customer.email

        try:
            contacts = self.client.search_contacts(identifier)
            if contacts:
                return contacts[0].get("id")
            return None
        except ChatwootError:
            return None


class ConversationService(BaseService):
    """
    Service for managing conversations via Chatwoot.

    Provides high-level methods for fetching and sending messages,
    with integration to your Quote model for context.
    """

    def __init__(self, client: Optional[ChatwootClient] = None):
        super().__init__()
        self.client = client or ChatwootClient()
        self.contact_sync = ContactSyncService(client=self.client)

    def get_inbox_channel(self, inbox_id: int) -> str:
        """
        Map inbox ID to channel type using settings configuration.

        Args:
            inbox_id: Chatwoot inbox ID

        Returns:
            Channel type ('chat', 'email', 'sms')
        """
        inbox_channels = getattr(settings, "CHATWOOT_INBOX_CHANNELS", {})
        return inbox_channels.get(inbox_id, "chat")

    def get_inbox_for_channel(self, channel: str) -> int:
        """
        Get inbox ID for a channel type.

        Args:
            channel: Channel type ('chat', 'email', 'sms')

        Returns:
            Chatwoot inbox ID
        """
        inboxes = getattr(settings, "CHATWOOT_INBOXES", {})
        inbox_id = inboxes.get(channel)
        if inbox_id:
            return inbox_id
        # Fallback to default inbox
        return getattr(settings, "CHATWOOT_INBOX_ID", 1)

    def get_customer_conversations(self, customer) -> list[dict]:
        """
        Get all conversations for a customer.

        Args:
            customer: Customer model instance

        Returns:
            List of conversation dicts with messages
        """
        if not self.client.is_configured:
            return []

        contact_id = self.contact_sync.get_chatwoot_contact_id(customer)
        if not contact_id:
            return []

        try:
            conversations = self.client.get_contact_conversations(contact_id)
            return self._enrich_conversations(conversations)
        except ChatwootError as e:
            self.log_error(
                f"Failed to get conversations for customer {customer.id}: {e.message}",
                extra={"customer_id": customer.id},
            )
            return []

    def get_quote_conversations(self, quote) -> list[dict]:
        """
        Get conversations related to a quote.

        Args:
            quote: Quote model instance

        Returns:
            List of conversation dicts
        """
        if not quote.customer:
            return []
        return self.get_customer_conversations(quote.customer)

    def get_conversation_messages(self, conversation_id: int) -> list[dict]:
        """
        Get messages for a specific conversation.

        Args:
            conversation_id: Chatwoot conversation ID

        Returns:
            List of message dicts
        """
        if not self.client.is_configured:
            return []

        try:
            # First get conversation to retrieve its inbox_id
            # (Chatwoot messages don't include inbox_id, but we need it for channel detection)
            conversation = self.client.get_conversation(conversation_id)
            inbox_id = conversation.get("inbox_id")

            messages = self.client.get_messages(conversation_id)
            return self._format_messages(messages, inbox_id=inbox_id)
        except ChatwootError as e:
            self.log_error(
                f"Failed to get messages for conversation {conversation_id}: {e.message}",
                extra={"conversation_id": conversation_id},
            )
            return []

    def get_all_quote_messages(self, quote) -> list[dict]:
        """
        Get all messages from all conversations for a quote's customer.

        Provides an omnichannel view by merging messages from SMS, email,
        and webchat conversations into a single chronological timeline.

        Args:
            quote: Quote model instance

        Returns:
            List of message dicts, sorted by timestamp (oldest first)
        """
        conversations = self.get_quote_conversations(quote)
        all_messages = []

        for conv in conversations:
            conv_id = conv.get("id")
            if conv_id:
                messages = self.get_conversation_messages(conv_id)
                all_messages.extend(messages)

        # Sort by timestamp (oldest first for chat display)
        all_messages.sort(key=lambda m: m.get("created_at", ""))
        return all_messages

    def send_message(
        self,
        conversation_id: int,
        content: str,
        private: bool = False,
    ) -> dict:
        """
        Send a message in a conversation.

        Args:
            conversation_id: Chatwoot conversation ID
            content: Message text
            private: True for internal notes (not visible to customer)

        Returns:
            Created message data
        """
        if not self.client.is_configured:
            raise ChatwootError("Chatwoot not configured")

        return self.client.send_message(
            conversation_id=conversation_id,
            content=content,
            message_type="outgoing",
            private=private,
        )

    def send_quote_message(
        self,
        quote,
        content: str,
        include_quote_link: bool = False,
        channel: Optional[str] = None,
    ) -> dict:
        """
        Send a message related to a quote.

        Creates a new conversation if needed. If a channel is specified,
        will create/use a conversation on that channel's inbox.

        Args:
            quote: Quote model instance
            content: Message text
            include_quote_link: Append quote link to message
            channel: Optional channel type ('chat', 'email', 'sms').
                     If specified, routes message to that channel's inbox.
                     If None, replies to most recent open conversation.

        Returns:
            Created message data
        """
        if not self.client.is_configured:
            raise ChatwootError("Chatwoot not configured")

        if not quote.customer:
            raise ChatwootError("Quote has no associated customer")

        # Ensure contact exists
        contact = self.contact_sync.sync_customer_to_chatwoot(quote.customer)
        contact_id = contact.get("id")

        if not contact_id:
            raise ChatwootError("Failed to get/create Chatwoot contact")

        # Update contact with quote context
        self.contact_sync.update_contact_quote_context(quote.customer, quote)

        # Append quote link if requested
        if include_quote_link:
            frontend_url = getattr(settings, "FRONTEND_URL", "")
            quote_url = f"{frontend_url}/quotes/{quote.id}/preview"
            content = f"{content}\n\nView your quote: {quote_url}"

        # Find existing conversations
        conversations = self.client.get_contact_conversations(contact_id)
        open_convos = [c for c in conversations if c.get("status") == "open"]

        # If channel is specified, route to that channel's inbox
        if channel:
            target_inbox_id = self.get_inbox_for_channel(channel)

            # Look for existing open conversation on this channel
            matching_convos = [
                c for c in open_convos
                if c.get("inbox_id") == target_inbox_id
            ]

            if matching_convos:
                # Reply to existing conversation on this channel
                return self.client.send_message(
                    conversation_id=matching_convos[0]["id"],
                    content=content,
                    message_type="outgoing",
                )
            else:
                # Create new conversation on specified channel
                # source_id requirements vary by channel type:
                # - SMS (Twilio): phone number in E.164 format
                # - Email (SMTP): customer email address
                # - Webchat/API: any unique identifier
                source_id = self._get_source_id_for_channel(channel, quote)

                return self.client.create_outgoing_message(
                    contact_id=contact_id,
                    inbox_id=target_inbox_id,
                    content=content,
                    source_id=source_id,
                )

        # No channel specified - reply to most recent open conversation
        if open_convos:
            conversation_id = open_convos[0]["id"]
            return self.client.send_message(
                conversation_id=conversation_id,
                content=content,
                message_type="outgoing",
            )

        # No open conversation - create new on default inbox
        inbox_id = getattr(settings, "CHATWOOT_INBOX_ID", 1)
        default_channel = self.get_inbox_channel(inbox_id)
        source_id = self._get_source_id_for_channel(default_channel, quote)

        return self.client.create_outgoing_message(
            contact_id=contact_id,
            inbox_id=inbox_id,
            content=content,
            source_id=source_id,
        )

    def _get_source_id_for_channel(self, channel: str, quote) -> str:
        """
        Get the appropriate source_id for a channel type.

        Different Chatwoot inbox types require different source_id formats:
        - SMS (Twilio): Customer phone in E.164 format (+12025551234)
        - Email (SMTP): Customer email address
        - Webchat/API: Any unique identifier (we use quote ID)

        Args:
            channel: Channel type ('sms', 'email', 'chat')
            quote: Quote model instance

        Returns:
            Appropriate source_id string

        Raises:
            ChatwootError: If required customer info is missing
        """
        if channel == "sms":
            source_id = format_phone_e164(quote.customer.phone)
            if not source_id:
                raise ChatwootError("Customer phone number required for SMS")
            return source_id

        elif channel == "email":
            if not quote.customer.email:
                raise ChatwootError("Customer email required for email channel")
            return quote.customer.email

        else:
            # Webchat/API inbox - use quote ID as identifier
            return f"quote_{quote.id}"

    def get_unread_count(self) -> int:
        """
        Get count of unread/open conversations.

        Returns:
            Number of open conversations
        """
        if not self.client.is_configured:
            return 0

        try:
            counts = self.client.get_conversation_counts()
            return counts.get("open", 0)
        except ChatwootError:
            return 0

    def get_all_conversations(
        self,
        status: str = "all",
        page: int = 1,
    ) -> dict:
        """
        Get all conversations with pagination.

        Args:
            status: Filter by status (open, resolved, pending, all)
            page: Page number

        Returns:
            Dict with conversations and pagination info
        """
        if not self.client.is_configured:
            return {"conversations": [], "meta": {}}

        try:
            response = self.client.get_conversations(status=status, page=page)
            conversations = self._enrich_conversations(response.get("data", {}).get("payload", []))
            return {
                "conversations": conversations,
                "meta": response.get("data", {}).get("meta", {}),
            }
        except ChatwootError as e:
            self.log_error(f"Failed to get conversations: {e.message}")
            return {"conversations": [], "meta": {}}

    def get_canned_responses(self) -> list[dict]:
        """
        Get all canned responses/templates.

        Returns:
            List of template dicts
        """
        if not self.client.is_configured:
            return []

        try:
            return self.client.get_canned_responses()
        except ChatwootError:
            return []

    def _enrich_conversations(self, conversations: list[dict]) -> list[dict]:
        """Add extra metadata to conversations including channel info."""
        enriched = []
        for conv in conversations:
            inbox_id = conv.get("inbox_id")
            enriched.append({
                "id": conv.get("id"),
                "status": conv.get("status"),
                "inbox_id": inbox_id,
                "channel": self.get_inbox_channel(inbox_id) if inbox_id else "chat",
                "contact": conv.get("meta", {}).get("sender", {}),
                "last_message": self._get_last_message(conv),
                "unread_count": conv.get("unread_count", 0),
                "created_at": conv.get("created_at"),
                "updated_at": conv.get("last_activity_at"),
                "labels": conv.get("labels", []),
                "assignee": conv.get("meta", {}).get("assignee", {}),
            })
        return enriched

    def _get_last_message(self, conversation: dict) -> dict:
        """Extract last message preview from conversation."""
        last_msg = conversation.get("last_non_activity_message") or {}
        return {
            "content": last_msg.get("content", "")[:100],  # Truncate preview
            "created_at": last_msg.get("created_at"),
            "message_type": last_msg.get("message_type"),
            "sender_type": last_msg.get("sender", {}).get("type"),
        }

    def _normalize_message_type(self, msg_type) -> str:
        """
        Convert Chatwoot message_type to string format.

        Chatwoot API returns message_type as integers:
        - 0 = incoming (from customer)
        - 1 = outgoing (from agent)
        - 2 = activity (system messages like "assigned to...")
        """
        if msg_type == 0 or msg_type == "incoming":
            return "incoming"
        elif msg_type == 1 or msg_type == "outgoing":
            return "outgoing"
        elif msg_type == 2 or msg_type == "activity":
            return "activity"
        return str(msg_type) if msg_type is not None else "incoming"

    def _format_messages(self, messages: list[dict], inbox_id: int = None) -> list[dict]:
        """
        Format messages for frontend consumption.

        Args:
            messages: List of message dicts from Chatwoot API
            inbox_id: Conversation's inbox ID to use as fallback for channel detection
                      (Chatwoot messages often don't include inbox_id)
        """
        formatted = []
        for msg in messages:
            sender = msg.get("sender") or {}
            formatted.append({
                "id": msg.get("id"),
                "content": msg.get("content"),
                "message_type": self._normalize_message_type(msg.get("message_type")),
                "private": msg.get("private", False),
                "created_at": msg.get("created_at"),
                "sender": {
                    "id": sender.get("id"),
                    "name": sender.get("name"),
                    "type": sender.get("type"),  # contact/user
                    "avatar_url": sender.get("avatar_url"),
                },
                "attachments": msg.get("attachments", []),
                "content_attributes": msg.get("content_attributes", {}),
                "channel": self._get_message_channel(msg, inbox_id),
            })
        return formatted

    def _get_message_channel(self, message: dict, conversation_inbox_id: int = None) -> str:
        """
        Determine channel type for a message based on inbox ID.

        Args:
            message: Message dict from Chatwoot API
            conversation_inbox_id: Fallback inbox ID from the conversation
                                   (messages often don't include inbox_id)
        """
        # Use message's inbox_id if available, fallback to conversation's inbox_id
        inbox_id = message.get("inbox_id") or conversation_inbox_id
        if inbox_id:
            return self.get_inbox_channel(inbox_id)
        # Last resort: content_attributes or default to chat
        return message.get("content_attributes", {}).get("channel", "chat")


class HotLeadService(BaseService):
    """
    Service for identifying high-intent customers.

    Combines QuoteView data with conversation activity to score leads.
    """

    def __init__(self, client: Optional[ChatwootClient] = None):
        super().__init__()
        self.client = client or ChatwootClient()
        self.conversation_service = ConversationService(client=self.client)

    def calculate_lead_score(self, quote) -> dict:
        """
        Calculate lead score for a quote.

        Args:
            quote: Quote model instance

        Returns:
            Dict with is_hot flag and scoring signals
        """
        from quotes.models import QuoteView  # Import here to avoid circular

        now = timezone.now()

        # Get quote view signals
        recent_views = QuoteView.objects.filter(
            quote=quote,
            viewed_at__gte=now - timedelta(hours=24),
        )
        view_count_24h = recent_views.count()
        view_count_4h = recent_views.filter(viewed_at__gte=now - timedelta(hours=4)).count()

        # Get conversation signals
        conversations = []
        last_message_age = None

        if self.client.is_configured and quote.customer:
            conversations = self.conversation_service.get_customer_conversations(quote.customer)
            if conversations:
                last_msg = conversations[0].get("last_message", {})
                last_msg_time = last_msg.get("created_at")
                if last_msg_time:
                    # Parse timestamp and calculate age
                    # Chatwoot returns either ISO string or Unix timestamp
                    try:
                        from datetime import datetime, timezone as dt_timezone
                        if isinstance(last_msg_time, int):
                            # Unix timestamp
                            msg_time = datetime.fromtimestamp(last_msg_time, tz=dt_timezone.utc)
                        else:
                            # ISO string
                            msg_time = datetime.fromisoformat(last_msg_time.replace("Z", "+00:00"))
                        last_message_age = (now - msg_time).total_seconds() / 3600  # hours
                    except (ValueError, TypeError, OSError):
                        pass

        # Scoring logic
        signals = {
            "view_count_24h": view_count_24h,
            "view_count_4h": view_count_4h,
            "conversation_count": len(conversations),
            "has_open_conversation": any(c.get("status") == "open" for c in conversations),
            "last_message_hours_ago": last_message_age,
            "quote_status": quote.state,
        }

        # Hot if:
        # - 3+ views in 4 hours
        # - OR active conversation in last hour
        # - OR multiple conversations
        is_hot = (
            view_count_4h >= 3
            or (last_message_age is not None and last_message_age < 1)
            or len(conversations) >= 2
        )

        # New messages indicator
        has_new_messages = any(
            c.get("unread_count", 0) > 0
            for c in conversations
        )

        return {
            "is_hot": is_hot,
            "has_new_messages": has_new_messages,
            "new_message_count": sum(c.get("unread_count", 0) for c in conversations),
            "signals": signals,
        }
