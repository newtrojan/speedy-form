"""
URL configuration for support dashboard API.
"""
from django.urls import path
from support_dashboard.api.views import (
    QuoteQueueView,
    QuoteDetailView,
    QuoteModifyView,
    ValidateQuoteView,
    RejectQuoteView,
    CustomerDetailView,
)

urlpatterns = [
    # Quote management
    path("quotes/", QuoteQueueView.as_view(), name="support-quote-queue"),
    path(
        "quotes/<uuid:quote_id>/",
        QuoteDetailView.as_view(),
        name="support-quote-detail",
    ),
    path(
        "quotes/<uuid:quote_id>/modify/",
        QuoteModifyView.as_view(),
        name="support-quote-modify",
    ),
    path(
        "quotes/<uuid:quote_id>/validate/",
        ValidateQuoteView.as_view(),
        name="support-quote-validate",
    ),
    path(
        "quotes/<uuid:quote_id>/reject/",
        RejectQuoteView.as_view(),
        name="support-quote-reject",
    ),
    # Customer lookup
    path(
        "customers/<int:customer_id>/",
        CustomerDetailView.as_view(),
        name="support-customer-detail",
    ),
]
