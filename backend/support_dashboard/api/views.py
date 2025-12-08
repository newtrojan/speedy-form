"""
Support dashboard API views for quote management.
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from django.db.models import Exists, OuterRef
from django.utils import timezone
from datetime import timedelta

from quotes.models import Quote, QuoteLineItem, QuoteStateLog, QuoteView, QuoteNote
from customers.models import Customer
from core.permissions import IsSupportAgent
from support_dashboard.api.serializers import (
    QuoteListSerializer,
    QuoteDetailSerializer,
    QuoteModifySerializer,
    CustomerDetailSerializer,
    QuoteNoteSerializer,
    QuoteNoteCreateSerializer,
)
from decimal import Decimal


class QuoteQueueView(generics.ListAPIView):
    """
    List quotes for support agents with filtering, searching, and ordering.
    """

    permission_classes = [IsSupportAgent]
    serializer_class = QuoteListSerializer
    queryset = Quote.objects.select_related("customer", "shop").all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["state", "payment_type", "service_type"]
    search_fields = ["customer__email", "vin", "id"]
    ordering_fields = ["created_at", "total_price"]
    ordering = ["-created_at"]
    # Uses DRF default pagination (PageNumberPagination, 50 per page)

    def get_queryset(self):
        queryset = super().get_queryset()

        # Date range filtering
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        # Default to pending_validation if no state filter
        if not self.request.query_params.get("state"):
            queryset = queryset.filter(state="pending_validation")

        return queryset

    @extend_schema(
        summary="List Quotes",
        description="Get paginated list of quotes with filtering and search",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class QuoteDetailView(generics.RetrieveAPIView):
    """
    Retrieve full quote details for support agents.
    """

    permission_classes = [IsSupportAgent]
    serializer_class = QuoteDetailSerializer
    queryset = Quote.objects.select_related("customer", "shop").prefetch_related(
        "line_items", "logs"
    )
    lookup_field = "id"
    lookup_url_kwarg = "quote_id"

    @extend_schema(
        summary="Get Quote Details",
        description="Retrieve full quote information for support review",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class QuoteModifyView(generics.UpdateAPIView):
    """
    Modify quote line items and internal notes.
    """

    permission_classes = [IsSupportAgent]
    serializer_class = QuoteModifySerializer
    queryset = Quote.objects.all()
    lookup_field = "id"
    lookup_url_kwarg = "quote_id"
    http_method_names = ["patch"]

    def update(self, request, *args, **kwargs):
        quote = self.get_object()

        # Verify quote is in pending_validation state
        if quote.state != "pending_validation":
            return Response(
                {"error": "Quote can only be modified in pending_validation state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Update CSR notes
        if "csr_notes" in serializer.validated_data:
            quote.csr_notes = serializer.validated_data["csr_notes"]

        # Update line items
        if "line_items" in serializer.validated_data:
            line_items_data = serializer.validated_data["line_items"]

            for item_data in line_items_data:
                if "id" in item_data:
                    # Update existing item
                    try:
                        item = QuoteLineItem.objects.get(
                            id=item_data["id"], quote=quote
                        )
                        item.subtotal = Decimal(str(item_data["subtotal"]))
                        item.save()
                    except QuoteLineItem.DoesNotExist:
                        return Response(
                            {"error": f"Line item {item_data['id']} not found"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    # Add new custom item
                    QuoteLineItem.objects.create(
                        quote=quote,
                        type=item_data["type"],
                        description=item_data["description"],
                        unit_price=Decimal(str(item_data["subtotal"])),
                        quantity=1,
                        subtotal=Decimal(str(item_data["subtotal"])),
                    )

            # Recalculate total
            total = sum(item.subtotal for item in quote.line_items.all())
            quote.total_price = total

        quote.save()

        # Log modification
        QuoteStateLog.objects.create(
            quote=quote,
            from_state=quote.state,
            to_state=quote.state,
            user=request.user,
            notes="Quote modified by support agent",
        )

        # Return updated quote
        return Response(QuoteDetailSerializer(quote).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Modify Quote",
        description="Update quote line items and internal notes",
    )
    def patch(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)


class ValidateQuoteView(APIView):
    """
    Validate and send quote to customer.
    """

    permission_classes = [IsSupportAgent]

    @extend_schema(
        summary="Validate Quote",
        description="Approve quote and send to customer via email",
    )
    def post(self, request, quote_id):
        try:
            quote = Quote.objects.get(id=quote_id)
        except Quote.DoesNotExist:
            return Response(
                {"error": "Quote not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Verify state
        if quote.state != "pending_validation":
            return Response(
                {"error": "Quote must be in pending_validation state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get optional notes
        notes = request.data.get("notes", "")

        # Transition state using FSM
        try:
            quote.send_to_customer()
            quote.save()
        except Exception as e:
            return Response(
                {"error": f"Failed to validate quote: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Log state change
        QuoteStateLog.objects.create(
            quote=quote,
            from_state="pending_validation",
            to_state="sent",
            user=request.user,
            notes=notes or "Validated by support agent",
        )

        # Trigger email
        from quotes.tasks import send_quote_email

        send_quote_email.delay(quote.id)

        return Response(
            {
                "success": True,
                "quote_id": str(quote.id),
                "new_state": quote.state,
                "email_sent": True,
                "message": f"Quote sent to {quote.customer.email}",
            },
            status=status.HTTP_200_OK,
        )


class RejectQuoteView(APIView):
    """
    Reject a quote with reason.
    """

    permission_classes = [IsSupportAgent]

    @extend_schema(
        summary="Reject Quote",
        description="Reject quote and notify customer",
    )
    def post(self, request, quote_id):
        try:
            quote = Quote.objects.get(id=quote_id)
        except Quote.DoesNotExist:
            return Response(
                {"error": "Quote not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Verify state
        if quote.state != "pending_validation":
            return Response(
                {"error": "Quote must be in pending_validation state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get required reason
        reason = request.data.get("reason")
        if not reason:
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Transition state using FSM
        try:
            quote.reject_quote(user=request.user, notes=f"Rejected: {reason}")
            quote.save()
        except Exception as e:
            return Response(
                {"error": f"Failed to reject quote: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Trigger rejection email
        from core.services.email_service import EmailService

        email_service = EmailService()
        email_service.send_rejection(quote, reason)

        return Response(
            {
                "success": True,
                "quote_id": str(quote.id),
                "new_state": quote.state,
                "email_sent": True,
                "message": "Quote rejected and customer notified",
            },
            status=status.HTTP_200_OK,
        )


class CustomerDetailView(generics.RetrieveAPIView):
    """
    Retrieve customer details with quote history.
    """

    permission_classes = [IsSupportAgent]
    serializer_class = CustomerDetailSerializer
    queryset = Customer.objects.prefetch_related("quotes")
    lookup_field = "id"
    lookup_url_kwarg = "customer_id"

    @extend_schema(
        summary="Get Customer Details",
        description="Retrieve customer information and quote history",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class CreateNoteView(APIView):
    """
    Add a new CSR note to a quote.
    """

    permission_classes = [IsSupportAgent]

    @extend_schema(
        summary="Add Note to Quote",
        description="Create a new internal CSR note on a quote",
        request=QuoteNoteCreateSerializer,
        responses={201: QuoteNoteSerializer},
    )
    def post(self, request, quote_id):
        try:
            quote = Quote.objects.get(id=quote_id)
        except Quote.DoesNotExist:
            return Response(
                {"error": "Quote not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = QuoteNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create the note with current user
        note = QuoteNote.objects.create(
            quote=quote,
            created_by=request.user,
            content=serializer.validated_data["content"],
        )

        return Response(
            QuoteNoteSerializer(note).data,
            status=status.HTTP_201_CREATED,
        )


class DashboardStatsView(APIView):
    """
    Get dashboard statistics for support agents.
    Returns actionable counts for the sidebar filters.
    """

    permission_classes = [IsSupportAgent]

    @extend_schema(
        summary="Get Dashboard Stats",
        description="Get counts for dashboard sidebar filters",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "needs_review": {"type": "integer"},
                    "hot_leads": {"type": "integer"},
                    "awaiting_response": {"type": "integer"},
                    "follow_up": {"type": "integer"},
                    "scheduled": {"type": "integer"},
                    "today": {
                        "type": "object",
                        "properties": {
                            "sent": {"type": "integer"},
                            "viewed": {"type": "integer"},
                            "scheduled": {"type": "integer"},
                        },
                    },
                },
            }
        },
    )
    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        forty_eight_hours_ago = now - timedelta(hours=48)
        twenty_four_hours_ago = now - timedelta(hours=24)

        # Subquery to check if quote has any views
        has_views = Exists(QuoteView.objects.filter(quote=OuterRef("pk")))

        # Subquery to get last view timestamp
        # For follow_up: sent > 48hrs OR last_view > 24hrs ago with no action

        # needs_review: state=pending_validation
        needs_review = Quote.objects.filter(state="pending_validation").count()

        # Get all sent quotes with view annotations
        sent_quotes = Quote.objects.filter(state="sent").annotate(has_views=has_views)

        # hot_leads: sent + has views (customer engaged but hasn't scheduled)
        hot_leads = sent_quotes.filter(has_views=True).count()

        # awaiting_response: sent + no views yet
        awaiting_response = sent_quotes.filter(has_views=False).count()

        # follow_up: sent and either:
        # - sent > 48 hours ago, OR
        # - has views but last view was > 24 hours ago
        # This indicates quotes that need attention
        stale_no_views = Quote.objects.filter(
            state="sent", created_at__lt=forty_eight_hours_ago
        ).annotate(has_views=has_views).filter(has_views=False)

        # Quotes that were viewed but last view was > 24 hours ago
        viewed_quotes = Quote.objects.filter(state="sent").annotate(
            has_views=has_views
        ).filter(has_views=True)

        stale_with_views_count = 0
        for quote in viewed_quotes:
            last_view = quote.views.order_by("-viewed_at").first()
            if last_view and last_view.viewed_at < twenty_four_hours_ago:
                stale_with_views_count += 1

        follow_up = stale_no_views.count() + stale_with_views_count

        # scheduled: state=scheduled
        scheduled = Quote.objects.filter(state="scheduled").count()

        # Today's stats
        sent_today = Quote.objects.filter(
            state__in=["sent", "customer_approved", "scheduled", "converted"],
            logs__to_state="sent",
            logs__timestamp__gte=today_start,
        ).distinct().count()

        views_today = QuoteView.objects.filter(viewed_at__gte=today_start).count()

        scheduled_today = Quote.objects.filter(
            state__in=["scheduled", "converted"],
            logs__to_state="scheduled",
            logs__timestamp__gte=today_start,
        ).distinct().count()

        return Response(
            {
                "needs_review": needs_review,
                "hot_leads": hot_leads,
                "awaiting_response": awaiting_response,
                "follow_up": follow_up,
                "scheduled": scheduled,
                "today": {
                    "sent": sent_today,
                    "viewed": views_today,
                    "scheduled": scheduled_today,
                },
            },
            status=status.HTTP_200_OK,
        )
