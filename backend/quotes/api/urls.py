from django.urls import path
from quotes.api.views import (
    GenerateQuoteView,
    QuoteStatusView,
    QuotePreviewView,
    ApproveQuoteView,
)

urlpatterns = [
    path("generate/", GenerateQuoteView.as_view(), name="generate-quote"),
    path("status/<str:task_id>/", QuoteStatusView.as_view(), name="quote-status"),
    path("<uuid:quote_id>/preview/", QuotePreviewView.as_view(), name="quote-preview"),
    path("<uuid:quote_id>/approve/", ApproveQuoteView.as_view(), name="quote-approve"),
]
