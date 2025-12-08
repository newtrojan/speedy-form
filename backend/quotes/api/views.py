from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from drf_spectacular.utils import extend_schema
from celery.result import AsyncResult
from django.utils import timezone
from datetime import timedelta

from quotes.models import Quote, QuoteView
from quotes.tasks import generate_quote_task
from quotes.api.serializers import (
    QuoteGenerationRequestSerializer,
    QuoteStatusResponseSerializer,
    QuotePreviewSerializer,
    ApproveQuoteSerializer,
)


class GenerateQuoteView(APIView):
    """
    Start the quote generation process (Async).
    """

    permission_classes = []

    @extend_schema(
        request=QuoteGenerationRequestSerializer,
        responses={202: QuoteStatusResponseSerializer},
        summary="Generate Quote",
        description="Start async quote generation task.",
    )
    def post(self, request):
        serializer = QuoteGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # Build service address for mobile service
        service_address = None
        if data["service_type"] == "mobile":
            service_address = {
                "street": data["location"].get("street_address"),
                "city": data["location"].get("city"),
                "state": data["location"].get("state"),
            }

        # Transform nested serializer structure to match task signature
        task_kwargs = {
            # Service intent
            "service_intent": data.get("service_intent", "replacement"),
            # Vehicle identification
            "vin": data.get("vin"),
            "license_plate": data.get("license_plate"),
            "plate_state": data.get("plate_state"),
            # Glass and damage details
            "glass_type": data.get("glass_type"),
            "damage_type": data.get("damage_type", "unknown"),
            "chip_count": data.get("chip_count"),
            # Part selection (from frontend - avoids re-fetching from AUTOBOLT)
            "nags_part_number": data.get("nags_part_number"),
            # Location and service
            "postal_code": data["location"]["postal_code"],
            "service_type": data["service_type"],
            "shop_id": data["shop_id"],
            "distance_miles": data.get("distance_miles"),
            "service_address": service_address,
            # Customer
            "customer_data": data["customer"],
            "insurance_data": data.get("insurance"),
        }

        # Dispatch task with unpacked kwargs
        task = generate_quote_task.delay(**task_kwargs)

        return Response(
            {
                "task_id": task.id,
                "status": "processing",
                "message": "Quote generation started.",
            },
            status=status.HTTP_202_ACCEPTED,
        )


class QuoteStatusView(APIView):
    """
    Check the status of a quote generation task.
    """

    permission_classes = []

    @extend_schema(
        responses={200: QuoteStatusResponseSerializer},
        summary="Check Quote Status",
    )
    def get(self, request, task_id):
        result = AsyncResult(task_id)

        response_data = {
            "task_id": task_id,
            "status": result.status.lower(),
        }

        if result.state == "PENDING":
            response_data["message"] = "Task is waiting in queue..."
        elif result.state == "STARTED":
            response_data["message"] = "Processing..."
        elif result.state == "SUCCESS":
            # Task result should contain the quote_id or error
            task_result = result.result
            if isinstance(task_result, dict):
                if "quote_id" in task_result:
                    # Successful quote generation
                    response_data["status"] = "completed"
                    response_data["quote_id"] = task_result["quote_id"]
                    response_data["message"] = "Quote generated successfully."
                    # response_data["redirect_url"] = ...
                elif task_result.get("status") == "failed":
                    # Task completed but failed (e.g., unserviceable area)
                    response_data["status"] = "failed"
                    response_data["error"] = task_result.get(
                        "error", "Quote generation failed"
                    )
                    response_data["message"] = task_result.get(
                        "details"
                    ) or task_result.get("error")
                else:
                    # Unexpected format
                    response_data["status"] = "failed"
                    response_data["error"] = "Invalid task result format"
            else:
                # Task returned non-dict result
                response_data["status"] = "failed"
                response_data["error"] = "Invalid task result format"
        elif result.state == "FAILURE":
            response_data["status"] = "failed"
            response_data["error"] = str(result.result)
            response_data["message"] = "Quote generation failed."

        return Response(response_data, status=status.HTTP_200_OK)


class QuotePreviewView(RetrieveAPIView):
    """
    Preview a generated quote.
    Automatically tracks customer views with deduplication.
    """

    permission_classes = []
    serializer_class = QuotePreviewSerializer
    queryset = Quote.objects.all()
    lookup_field = "id"
    lookup_url_kwarg = "quote_id"

    def _get_client_ip(self, request):
        """Extract client IP from request, handling proxies."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def _parse_device_type(self, user_agent: str) -> str:
        """Simple device type detection from User-Agent."""
        ua_lower = user_agent.lower()
        if any(x in ua_lower for x in ["mobile", "android", "iphone", "ipod"]):
            return "mobile"
        if any(x in ua_lower for x in ["ipad", "tablet"]):
            return "tablet"
        return "desktop"

    def _track_view(self, quote, request):
        """Record quote view with deduplication (5-min window per IP)."""
        # Only track for quotes that have been sent to customer
        if quote.state not in ["sent", "customer_approved", "scheduled"]:
            return

        ip_address = self._get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        device_type = self._parse_device_type(user_agent)

        # Dedupe: skip if same IP viewed within 5 minutes
        five_minutes_ago = timezone.now() - timedelta(minutes=5)
        recent_view = QuoteView.objects.filter(
            quote=quote,
            ip_address=ip_address,
            viewed_at__gte=five_minutes_ago
        ).exists()

        if not recent_view:
            QuoteView.objects.create(
                quote=quote,
                ip_address=ip_address,
                user_agent=user_agent[:1000],
                device_type=device_type,
            )

    @extend_schema(
        summary="Preview Quote",
        description="Get details of a generated quote. Automatically tracks customer views.",
    )
    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)

        # Track the view (fire-and-forget, don't affect response)
        try:
            quote = self.get_object()
            self._track_view(quote, request)
        except Exception:
            pass  # Don't break preview if tracking fails

        return response


class ApproveQuoteView(APIView):
    """
    Approve a quote using a secure token.
    """

    permission_classes = []

    @extend_schema(
        request=ApproveQuoteSerializer,
        responses={200: QuoteStatusResponseSerializer},
        summary="Approve Quote",
        description="Approve a quote using the token sent via email.",
    )
    def post(self, request, quote_id):
        serializer = ApproveQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]

        try:
            quote = Quote.objects.get(id=quote_id)
        except Quote.DoesNotExist:
            return Response(
                {"error": "Quote not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Validate token
        # We need to hash the incoming token and compare with stored hash
        # We can use EmailService helper or just do it here.
        # Since EmailService has the logic, let's use it or replicate it.
        # Replicating is safer to avoid instantiating a service just
        # for a static method.
        import hashlib
        from django.utils.crypto import constant_time_compare

        token_hash = hashlib.sha256(token.encode()).hexdigest()

        if not quote.approval_token_hash or not constant_time_compare(
            quote.approval_token_hash, token_hash
        ):
            return Response(
                {"error": "Invalid approval token."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check expiration (optional, but good practice)
        # if quote.approval_token_created_at ...

        # Transition state
        # Using FSM transition method
        if quote.state not in [
            "sent",
            "pending_validation",
        ]:  # Allow pending for now if email sent early
            return Response(
                {"error": "Quote cannot be approved in its current state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quote.customer_approve()
            quote.save()
        except Exception as e:
            return Response(
                {"error": f"Failed to approve quote: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Trigger confirmation email
        from core.services.email_service import EmailService

        email_service = EmailService()
        email_service.send_approval_confirmation(quote)

        return Response(
            {"status": "approved", "message": "Quote approved successfully."},
            status=status.HTTP_200_OK,
        )


class QuoteViewThrottle(AnonRateThrottle):
    """Rate limit quote view tracking to 1 per 5 minutes per IP/quote combo."""

    rate = "12/hour"  # Max 12 views per hour per IP

    def get_cache_key(self, request, view):
        # Include quote_id in the cache key for per-quote rate limiting
        quote_id = view.kwargs.get("quote_id", "")
        ident = self.get_ident(request)
        return f"quote_view_{quote_id}_{ident}"


class TrackQuoteViewView(APIView):
    """
    Track when a customer views their quote page.
    Public endpoint (no auth required) - called by the quote preview page.
    """

    permission_classes = []
    throttle_classes = [QuoteViewThrottle]

    def _get_client_ip(self, request):
        """Extract client IP from request, handling proxies."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def _parse_device_type(self, user_agent: str) -> str:
        """Simple device type detection from User-Agent."""
        ua_lower = user_agent.lower()
        if any(x in ua_lower for x in ["mobile", "android", "iphone", "ipod"]):
            return "mobile"
        if any(x in ua_lower for x in ["ipad", "tablet"]):
            return "tablet"
        return "desktop"

    @extend_schema(
        responses={200: {"type": "object", "properties": {"tracked": {"type": "boolean"}}}},
        summary="Track Quote View",
        description="Record that a customer viewed their quote page. Rate limited.",
    )
    def post(self, request, quote_id):
        try:
            quote = Quote.objects.get(id=quote_id)
        except Quote.DoesNotExist:
            return Response(
                {"error": "Quote not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Only track views for quotes that have been sent to the customer
        if quote.state not in ["sent", "customer_approved", "scheduled"]:
            return Response(
                {"tracked": False, "reason": "Quote not in viewable state."},
                status=status.HTTP_200_OK,
            )

        ip_address = self._get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        device_type = self._parse_device_type(user_agent)

        # Check for duplicate view within 5 minutes from same IP
        five_minutes_ago = timezone.now() - timedelta(minutes=5)
        recent_view = QuoteView.objects.filter(
            quote=quote, ip_address=ip_address, viewed_at__gte=five_minutes_ago
        ).exists()

        if recent_view:
            return Response(
                {"tracked": False, "reason": "View already recorded recently."},
                status=status.HTTP_200_OK,
            )

        # Create the view record
        QuoteView.objects.create(
            quote=quote,
            ip_address=ip_address,
            user_agent=user_agent[:1000],  # Limit user agent length
            device_type=device_type,
        )

        return Response({"tracked": True}, status=status.HTTP_200_OK)
