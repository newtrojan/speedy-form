"""
Chatwoot API Client

Handles all communication with the Chatwoot API for omnichannel messaging.
"""

import logging
from typing import Any, Optional
from urllib.parse import urljoin

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class ChatwootError(Exception):
    """Base exception for Chatwoot API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class ChatwootClient:
    """
    Client for interacting with Chatwoot API.

    API Reference: https://www.chatwoot.com/developers/api/

    Usage:
        client = ChatwootClient()
        contact = client.create_contact(email="john@example.com", phone="+1234567890")
        conversations = client.get_contact_conversations(contact_id=123)
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_token: Optional[str] = None,
        account_id: Optional[int] = None,
    ):
        self.base_url = base_url or getattr(settings, "CHATWOOT_BASE_URL", "")
        self.api_token = api_token or getattr(settings, "CHATWOOT_API_TOKEN", "")
        self.account_id = account_id or getattr(settings, "CHATWOOT_ACCOUNT_ID", 1)

        if not self.base_url:
            logger.warning("CHATWOOT_BASE_URL not configured")
        if not self.api_token:
            logger.warning("CHATWOOT_API_TOKEN not configured")

    @property
    def is_configured(self) -> bool:
        """Check if Chatwoot is properly configured."""
        return bool(self.base_url and self.api_token)

    def _get_headers(self) -> dict:
        """Get headers for API requests."""
        return {
            "api_access_token": self.api_token,
            "Content-Type": "application/json",
        }

    def _build_url(self, endpoint: str) -> str:
        """Build full URL for API endpoint."""
        base = self.base_url.rstrip("/")
        return f"{base}/api/v1/accounts/{self.account_id}/{endpoint.lstrip('/')}"

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[dict] = None,
        params: Optional[dict] = None,
    ) -> dict:
        """
        Make HTTP request to Chatwoot API.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., 'contacts')
            data: Request body for POST/PUT
            params: Query parameters

        Returns:
            Response JSON as dict

        Raises:
            ChatwootError: If request fails
        """
        if not self.is_configured:
            raise ChatwootError("Chatwoot is not configured. Set CHATWOOT_BASE_URL and CHATWOOT_API_TOKEN.")

        url = self._build_url(endpoint)

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self._get_headers(),
                json=data,
                params=params,
                timeout=30,
            )

            # Log request details
            logger.debug(
                f"Chatwoot API {method} {endpoint}: {response.status_code}",
                extra={"url": url, "status_code": response.status_code},
            )

            # Handle errors
            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                error_message = error_data.get("error", error_data.get("message", f"HTTP {response.status_code}"))
                raise ChatwootError(
                    message=error_message,
                    status_code=response.status_code,
                    response=error_data,
                )

            return response.json() if response.content else {}

        except requests.exceptions.RequestException as e:
            logger.error(f"Chatwoot API request failed: {e}", extra={"url": url})
            raise ChatwootError(f"Request failed: {str(e)}")

    # ==================== CONTACTS API ====================

    def search_contacts(self, query: str) -> list[dict]:
        """
        Search contacts by email or phone.

        Args:
            query: Search term (email or phone)

        Returns:
            List of matching contacts
        """
        response = self._request("GET", "contacts/search", params={"q": query})
        return response.get("payload", [])

    def get_contact(self, contact_id: int) -> dict:
        """
        Get contact by ID.

        Args:
            contact_id: Chatwoot contact ID

        Returns:
            Contact data
        """
        return self._request("GET", f"contacts/{contact_id}")

    def create_contact(
        self,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        name: Optional[str] = None,
        identifier: Optional[str] = None,
        custom_attributes: Optional[dict] = None,
    ) -> dict:
        """
        Create a new contact.

        Args:
            email: Contact email
            phone: Contact phone (E.164 format)
            name: Contact display name
            identifier: External identifier (e.g., customer_123)
            custom_attributes: Custom attributes dict

        Returns:
            Created contact data
        """
        data = {
            "inbox_id": getattr(settings, "CHATWOOT_INBOX_ID", 1),
        }

        if email:
            data["email"] = email
        if phone:
            data["phone_number"] = phone
        if name:
            data["name"] = name
        if identifier:
            data["identifier"] = identifier
        if custom_attributes:
            data["custom_attributes"] = custom_attributes

        response = self._request("POST", "contacts", data=data)
        return response.get("payload", {}).get("contact", response)

    def update_contact(
        self,
        contact_id: int,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        name: Optional[str] = None,
        identifier: Optional[str] = None,
        custom_attributes: Optional[dict] = None,
    ) -> dict:
        """
        Update an existing contact.

        Args:
            contact_id: Chatwoot contact ID
            email: New email (optional)
            phone: New phone (optional)
            name: New name (optional)
            identifier: External identifier (optional)
            custom_attributes: Custom attributes to merge

        Returns:
            Updated contact data (unwrapped from payload)
        """
        data = {}

        if email:
            data["email"] = email
        if phone:
            data["phone_number"] = phone
        if name:
            data["name"] = name
        if identifier:
            data["identifier"] = identifier
        if custom_attributes:
            data["custom_attributes"] = custom_attributes

        response = self._request("PUT", f"contacts/{contact_id}", data=data)
        return response.get("payload", response)

    def get_or_create_contact(
        self,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        name: Optional[str] = None,
        identifier: Optional[str] = None,
        custom_attributes: Optional[dict] = None,
    ) -> tuple[dict, bool]:
        """
        Get existing contact or create new one.

        Searches by identifier first, then email, then phone.

        Args:
            email: Contact email
            phone: Contact phone
            name: Contact name
            identifier: External identifier
            custom_attributes: Custom attributes

        Returns:
            Tuple of (contact_data, created_flag)
        """
        # Try to find existing contact
        if identifier:
            contacts = self.search_contacts(identifier)
            if contacts:
                return contacts[0], False

        if email:
            contacts = self.search_contacts(email)
            if contacts:
                return contacts[0], False

        if phone:
            contacts = self.search_contacts(phone)
            if contacts:
                return contacts[0], False

        # Create new contact
        contact = self.create_contact(
            email=email,
            phone=phone,
            name=name,
            identifier=identifier,
            custom_attributes=custom_attributes,
        )
        return contact, True

    def merge_contacts(self, base_contact_id: int, mergee_contact_id: int) -> dict:
        """
        Merge two contacts.

        Args:
            base_contact_id: Contact to keep
            mergee_contact_id: Contact to merge into base

        Returns:
            Merged contact data
        """
        return self._request(
            "POST",
            "actions/contact_merge",
            data={
                "base_contact_id": base_contact_id,
                "mergee_contact_id": mergee_contact_id,
            },
        )

    # ==================== CONVERSATIONS API ====================

    def get_conversations(
        self,
        status: str = "open",
        inbox_id: Optional[int] = None,
        page: int = 1,
    ) -> dict:
        """
        List conversations.

        Args:
            status: Filter by status (open, resolved, pending, snoozed, all)
            inbox_id: Filter by inbox
            page: Page number

        Returns:
            Paginated conversations data
        """
        params = {"status": status, "page": page}
        if inbox_id:
            params["inbox_id"] = inbox_id

        return self._request("GET", "conversations", params=params)

    def get_conversation(self, conversation_id: int) -> dict:
        """
        Get conversation by ID.

        Args:
            conversation_id: Chatwoot conversation ID

        Returns:
            Conversation data with messages
        """
        return self._request("GET", f"conversations/{conversation_id}")

    def get_contact_conversations(self, contact_id: int) -> list[dict]:
        """
        Get all conversations for a contact.

        Args:
            contact_id: Chatwoot contact ID

        Returns:
            List of conversations
        """
        response = self._request("GET", f"contacts/{contact_id}/conversations")
        return response.get("payload", [])

    def update_conversation_status(
        self,
        conversation_id: int,
        status: str,
    ) -> dict:
        """
        Update conversation status.

        Args:
            conversation_id: Chatwoot conversation ID
            status: New status (open, resolved, pending, snoozed)

        Returns:
            Updated conversation data
        """
        return self._request(
            "POST",
            f"conversations/{conversation_id}/toggle_status",
            data={"status": status},
        )

    def assign_conversation(
        self,
        conversation_id: int,
        assignee_id: int,
    ) -> dict:
        """
        Assign conversation to an agent.

        Args:
            conversation_id: Chatwoot conversation ID
            assignee_id: Agent user ID

        Returns:
            Updated conversation data
        """
        return self._request(
            "POST",
            f"conversations/{conversation_id}/assignments",
            data={"assignee_id": assignee_id},
        )

    def add_labels(self, conversation_id: int, labels: list[str]) -> dict:
        """
        Add labels to a conversation.

        Args:
            conversation_id: Chatwoot conversation ID
            labels: List of label names

        Returns:
            Updated conversation data
        """
        return self._request(
            "POST",
            f"conversations/{conversation_id}/labels",
            data={"labels": labels},
        )

    # ==================== MESSAGES API ====================

    def get_messages(
        self,
        conversation_id: int,
        before: Optional[int] = None,
    ) -> list[dict]:
        """
        Get messages in a conversation.

        Args:
            conversation_id: Chatwoot conversation ID
            before: Get messages before this message ID (for pagination)

        Returns:
            List of messages
        """
        params = {}
        if before:
            params["before"] = before

        response = self._request(
            "GET",
            f"conversations/{conversation_id}/messages",
            params=params,
        )
        return response.get("payload", [])

    def send_message(
        self,
        conversation_id: int,
        content: str,
        message_type: str = "outgoing",
        private: bool = False,
        content_attributes: Optional[dict] = None,
    ) -> dict:
        """
        Send a message in a conversation.

        Args:
            conversation_id: Chatwoot conversation ID
            content: Message text
            message_type: 'outgoing' for agent messages, 'incoming' for customer
            private: True for internal notes
            content_attributes: Additional attributes (e.g., buttons)

        Returns:
            Created message data
        """
        data = {
            "content": content,
            "message_type": message_type,
            "private": private,
        }

        if content_attributes:
            data["content_attributes"] = content_attributes

        return self._request(
            "POST",
            f"conversations/{conversation_id}/messages",
            data=data,
        )

    def create_outgoing_message(
        self,
        contact_id: int,
        inbox_id: int,
        content: str,
        source_id: Optional[str] = None,
    ) -> dict:
        """
        Create a new outgoing message (starts a conversation if needed).

        Args:
            contact_id: Chatwoot contact ID
            inbox_id: Inbox to send from
            content: Message text
            source_id: External reference ID (for SMS, this must be phone in E.164)

        Returns:
            Created conversation/message data
        """
        data = {
            "inbox_id": inbox_id,
            "contact_id": contact_id,
            # Chatwoot API expects message content wrapped in a 'message' object
            "message": {
                "content": content,
            },
        }

        if source_id:
            data["source_id"] = source_id

        return self._request("POST", "conversations", data=data)

    # ==================== CANNED RESPONSES API ====================

    def get_canned_responses(self) -> list[dict]:
        """
        Get all canned responses (templates).

        Returns:
            List of canned response templates
        """
        response = self._request("GET", "canned_responses")
        return response if isinstance(response, list) else response.get("payload", [])

    # ==================== INBOXES API ====================

    def get_inboxes(self) -> list[dict]:
        """
        Get all inboxes.

        Returns:
            List of inbox configurations
        """
        response = self._request("GET", "inboxes")
        return response.get("payload", [])

    def get_inbox(self, inbox_id: int) -> dict:
        """
        Get inbox by ID.

        Args:
            inbox_id: Chatwoot inbox ID

        Returns:
            Inbox data
        """
        return self._request("GET", f"inboxes/{inbox_id}")

    # ==================== AGENTS API ====================

    def get_agents(self) -> list[dict]:
        """
        Get all agents in the account.

        Returns:
            List of agent users
        """
        response = self._request("GET", "agents")
        return response if isinstance(response, list) else response.get("payload", [])

    # ==================== REPORTS API ====================

    def get_conversation_counts(self) -> dict:
        """
        Get conversation count summary.

        Returns:
            Counts by status (open, resolved, etc.)
        """
        return self._request("GET", "reports/summary")
