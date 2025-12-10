"""
Webhook URL routes for Chatwoot.

Public endpoint that receives webhook events from Chatwoot.

Security:
Since Chatwoot doesn't support HMAC signatures for webhooks,
we use a secret token in the URL path for verification.

Production URL (with token):
    POST /api/v1/webhooks/chatwoot/<your-secret-token>/

Development URL (no token, for testing):
    POST /api/v1/webhooks/chatwoot/

Generate token:
    python -c "import secrets; print(secrets.token_urlsafe(32))"

Set in .env:
    CHATWOOT_WEBHOOK_SECRET=<your-generated-token>
"""

from django.urls import path

from integrations.chatwoot.webhooks import ChatwootWebhookView

app_name = "chatwoot_webhooks"

urlpatterns = [
    # Production: with secret token in URL
    path("chatwoot/<str:token>/", ChatwootWebhookView.as_view(), name="chatwoot-webhook-secure"),
    # Development: without token (will warn in logs if CHATWOOT_WEBHOOK_TOKEN is not set)
    path("chatwoot/", ChatwootWebhookView.as_view(), name="chatwoot-webhook"),
]
