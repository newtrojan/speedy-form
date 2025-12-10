"""
URL routes for Chatwoot integration.

Dashboard API endpoints (authenticated, for CSR dashboard).
Webhook URLs are separate in webhooks_urls.py
"""

from django.urls import path

from integrations.chatwoot.views import (
    ConversationListView,
    ConversationDetailView,
    ConversationMessagesView,
    SendMessageView,
    QuoteConversationsView,
    QuoteMessagesView,
    CannedResponsesView,
    CustomerSyncView,
    ConversationStatsView,
)

app_name = "chatwoot"

# Dashboard API URLs (authenticated)
urlpatterns = [
    # Conversations
    path(
        "conversations/",
        ConversationListView.as_view(),
        name="conversation-list",
    ),
    path(
        "conversations/stats/",
        ConversationStatsView.as_view(),
        name="conversation-stats",
    ),
    path(
        "conversations/<int:conversation_id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    path(
        "conversations/<int:conversation_id>/messages/",
        ConversationMessagesView.as_view(),
        name="conversation-messages",
    ),
    path(
        "conversations/<int:conversation_id>/send/",
        SendMessageView.as_view(),
        name="send-message",
    ),
    # Quote-specific conversations
    path(
        "quotes/<uuid:quote_id>/conversations/",
        QuoteConversationsView.as_view(),
        name="quote-conversations",
    ),
    # Quote messages (omnichannel - merged from all conversations)
    path(
        "quotes/<uuid:quote_id>/messages/",
        QuoteMessagesView.as_view(),
        name="quote-messages",
    ),
    # Templates
    path(
        "templates/",
        CannedResponsesView.as_view(),
        name="canned-responses",
    ),
    # Customer sync
    path(
        "customers/<int:customer_id>/sync-chatwoot/",
        CustomerSyncView.as_view(),
        name="customer-sync",
    ),
]
