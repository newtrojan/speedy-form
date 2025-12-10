"""
Chatwoot API Views

Dashboard endpoints for managing conversations via Chatwoot.
All views require authentication (IsSupportAgent or above).
"""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsSupportAgent
from customers.models import Customer
from quotes.models import Quote
from integrations.chatwoot.client import ChatwootClient, ChatwootError
from integrations.chatwoot.services import (
    ContactSyncService,
    ConversationService,
    HotLeadService,
)

logger = logging.getLogger(__name__)


class ConversationListView(APIView):
    """
    List all conversations.

    GET /api/v1/dashboard/conversations/?status=open&page=1
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def get(self, request):
        conversation_status = request.query_params.get("status", "all")
        page = int(request.query_params.get("page", 1))

        service = ConversationService()
        result = service.get_all_conversations(status=conversation_status, page=page)

        return Response(result)


class ConversationStatsView(APIView):
    """
    Get conversation statistics.

    GET /api/v1/dashboard/conversations/stats/
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def get(self, request):
        client = ChatwootClient()

        if not client.is_configured:
            return Response({
                "configured": False,
                "counts": {},
            })

        try:
            counts = client.get_conversation_counts()
            return Response({
                "configured": True,
                "counts": counts,
            })
        except ChatwootError as e:
            return Response({
                "configured": True,
                "error": str(e.message),
                "counts": {},
            })


class ConversationDetailView(APIView):
    """
    Get conversation details.

    GET /api/v1/dashboard/conversations/{conversation_id}/
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def get(self, request, conversation_id: int):
        client = ChatwootClient()

        if not client.is_configured:
            return Response(
                {"error": "Chatwoot not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            conversation = client.get_conversation(conversation_id)
            return Response(conversation)
        except ChatwootError as e:
            return Response(
                {"error": e.message},
                status=status.HTTP_404_NOT_FOUND if e.status_code == 404 else status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConversationMessagesView(APIView):
    """
    Get messages in a conversation.

    GET /api/v1/dashboard/conversations/{conversation_id}/messages/?before=123
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def get(self, request, conversation_id: int):
        before = request.query_params.get("before")
        before = int(before) if before else None

        service = ConversationService()
        messages = service.get_conversation_messages(conversation_id)

        return Response({"messages": messages})


class SendMessageView(APIView):
    """
    Send a message in a conversation.

    POST /api/v1/dashboard/conversations/{conversation_id}/send/
    Body: { "content": "Hello!", "private": false }
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def post(self, request, conversation_id: int):
        content = request.data.get("content", "").strip()
        private = request.data.get("private", False)

        if not content:
            return Response(
                {"error": "Message content is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = ConversationService()

        try:
            message = service.send_message(
                conversation_id=conversation_id,
                content=content,
                private=private,
            )
            return Response(message, status=status.HTTP_201_CREATED)
        except ChatwootError as e:
            return Response(
                {"error": e.message},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuoteConversationsView(APIView):
    """
    Get conversations for a quote.

    GET /api/v1/dashboard/quotes/{quote_id}/conversations/
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def get(self, request, quote_id):
        quote = get_object_or_404(Quote, id=quote_id)

        service = ConversationService()
        conversations = service.get_quote_conversations(quote)

        # Add hot lead scoring
        hot_lead_service = HotLeadService()
        lead_score = hot_lead_service.calculate_lead_score(quote)

        return Response({
            "conversations": conversations,
            "lead_score": lead_score,
        })

    def post(self, request, quote_id):
        """
        Send a message related to this quote.

        POST /api/v1/dashboard/quotes/{quote_id}/conversations/
        Body: {
            "content": "Hello!",
            "include_quote_link": true,
            "channel": "sms"  // optional: 'chat', 'email', 'sms'
        }
        """
        quote = get_object_or_404(Quote, id=quote_id)

        content = request.data.get("content", "").strip()
        include_quote_link = request.data.get("include_quote_link", False)
        channel = request.data.get("channel")  # Optional: 'chat', 'email', 'sms'

        if not content:
            return Response(
                {"error": "Message content is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate channel if provided
        if channel and channel not in ("chat", "email", "sms"):
            return Response(
                {"error": "Invalid channel. Must be 'chat', 'email', or 'sms'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = ConversationService()

        try:
            message = service.send_quote_message(
                quote=quote,
                content=content,
                include_quote_link=include_quote_link,
                channel=channel,
            )
            return Response(message, status=status.HTTP_201_CREATED)
        except ChatwootError as e:
            logger.error(f"Chatwoot error sending message: {e.message}")
            return Response(
                {"error": e.message},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.exception(f"Unexpected error sending message for quote {quote_id}: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuoteMessagesView(APIView):
    """
    Get all messages for a quote (omnichannel view).

    Merges messages from all conversations (SMS, email, webchat)
    into a single chronological timeline.

    GET /api/v1/dashboard/quotes/{quote_id}/messages/
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def get(self, request, quote_id):
        quote = get_object_or_404(Quote, id=quote_id)

        service = ConversationService()
        messages = service.get_all_quote_messages(quote)

        return Response({"messages": messages})


class CannedResponsesView(APIView):
    """
    Get canned responses / templates.

    GET /api/v1/dashboard/templates/
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def get(self, request):
        service = ConversationService()
        responses = service.get_canned_responses()

        return Response({"templates": responses})


class CustomerSyncView(APIView):
    """
    Force sync a customer to Chatwoot.

    POST /api/v1/dashboard/customers/{customer_id}/sync-chatwoot/
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]

    def post(self, request, customer_id: int):
        customer = get_object_or_404(Customer, id=customer_id)

        service = ContactSyncService()

        try:
            contact = service.sync_customer_to_chatwoot(customer)
            return Response({
                "status": "synced",
                "chatwoot_contact": contact,
            })
        except ChatwootError as e:
            return Response(
                {"error": e.message},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
