import logging
from decimal import Decimal
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from quotes.models import Quote, QuoteLineItem
from customers.models import Customer
from shops.models import Shop
from shops.services.serviceability import ServiceabilityService
from pricing.services.calculator import PricingCalculator
from core.exceptions import ServiceException

logger = logging.getLogger(__name__)


def serialize_decimals(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, dict):
        return {k: serialize_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_decimals(v) for v in obj]
    return obj


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_quote_task(
    self,
    vin,
    glass_type,
    manufacturer,
    postal_code,
    service_type,
    payment_type,
    customer_data,
    shop_id=None,  # Optional, logic might pick best shop
    service_address=None,
    insurance_data=None,
    use_mock=True,
):
    """
    Async task to generate a quote.
    """
    logger.info(f"Starting quote generation for VIN {vin}")

    try:
        # Initialize Services
        # VehicleService is used internally by PricingCalculator if needed,
        # or we could use it here if we wanted to validate VIN explicitly first.
        serviceability_service = ServiceabilityService()
        pricing_calculator = PricingCalculator()

        # 1. Validate Serviceability
        # If shop_id is provided, check that specific shop.
        # If not, check general serviceability and pick a shop.

        if service_type == "mobile":
            # Extract address parts from service_address dict
            street = service_address.get("street") if service_address else None
            city = service_address.get("city") if service_address else None
            state = service_address.get("state") if service_address else None

            service_check = serviceability_service.check_mobile(
                postal_code, street, city, state
            )
        else:
            service_check = serviceability_service.check_in_store(postal_code)

        if not service_check.get("is_serviceable"):
            logger.warning(f"Quote request unserviceable: {postal_code}")
            return {
                "status": "failed",
                "error": "Service not available in this area.",
                "details": service_check.get("message"),
            }

        # Use the shop found by serviceability check if not provided
        if not shop_id:
            shop_data = service_check.get("shop")
            if shop_data:
                shop_id = shop_data.get("id")
            else:
                return {"status": "failed", "error": "No shop found."}

        # 2. Calculate Pricing
        # This also fetches vehicle data internally
        quote_data = pricing_calculator.calculate_quote(
            vin=vin,
            glass_type=glass_type,
            shop_id=shop_id,
            service_type=service_type,
            distance_miles=service_check.get("distance_miles"),
            payment_type=payment_type,
            manufacturer=manufacturer,
            use_mock=use_mock,
        )

        if not quote_data:
            return {"status": "failed", "error": "Failed to calculate quote."}

        # 3. Create/Get Customer
        customer, created = Customer.objects.get_or_create(
            email=customer_data.get("email"),
            defaults={
                "first_name": customer_data.get("first_name"),
                "last_name": customer_data.get("last_name"),
                "phone": customer_data.get("phone"),
            },
        )

        # 4. Create Quote Record
        shop = Shop.objects.get(id=shop_id)
        vehicle_info = quote_data.get("vehicle")
        pricing_breakdown = quote_data.get("pricing_breakdown")

        if not pricing_breakdown:
            return {"status": "failed", "error": "Pricing breakdown missing."}

        # Serialize for JSON fields
        serialized_pricing = serialize_decimals(pricing_breakdown)
        serialized_fees = serialize_decimals(pricing_breakdown.get("fees"))
        serialized_vehicle = serialize_decimals(vehicle_info)

        quote = Quote.objects.create(
            customer=customer,
            shop=shop,
            vin=vin,
            vehicle_info=serialized_vehicle,
            postal_code=postal_code,
            glass_type=glass_type,
            service_type=service_type,
            service_address=service_address or {},
            distance_from_shop_miles=service_check.get("distance_miles"),
            payment_type=payment_type,
            pricing_details=serialized_pricing,
            part_cost=pricing_breakdown.get("part_cost"),
            labor_cost=pricing_breakdown.get("labor_cost"),
            fees=serialized_fees,
            total_price=pricing_breakdown.get("total"),
            state="pending_validation",  # Initial state
            expires_at=timezone.now() + timedelta(days=7),
        )

        # Create Line Items
        line_items = quote_data.get("line_items", [])
        for item in line_items:
            QuoteLineItem.objects.create(
                quote=quote,
                type=item.get("type"),
                description=item.get("description"),
                unit_price=item.get("unit_price"),
                quantity=item.get("quantity"),
                subtotal=item.get("subtotal"),
            )

        logger.info(f"Quote {quote.id} created successfully.")

        # Trigger email (optional, usually happens after validation or immediate if auto-approved)
        # For now, let's just return the ID

        return {
            "status": "completed",
            "quote_id": str(quote.id),
            "total_price": str(quote.total_price),
        }

    except ServiceException as e:
        logger.error(f"Service error generating quote: {str(e)}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error generating quote: {str(e)}", exc_info=True)
        # Retry on transient errors if needed
        # self.retry(exc=e)
        return {"status": "failed", "error": "An unexpected error occurred."}


@shared_task
def send_quote_email(quote_id):
    """
    Sends the quote email to the customer using EmailService.
    """
    from core.services.email_service import EmailService

    try:
        quote = Quote.objects.get(id=quote_id)
        email_service = EmailService()
        email_service.send_quote(quote)

        logger.info(f"Email sent for quote {quote_id}")

    except Exception as e:
        logger.error(f"Error sending email for quote {quote_id}: {str(e)}")


@shared_task
def expire_old_quotes():
    """
    Cron task to expire old quotes.
    """
    cutoff = timezone.now()

    # Find quotes that are past expiration and not already in a terminal state
    # Assuming 'expired', 'converted', 'rejected' are terminal
    expired_quotes = Quote.objects.filter(expires_at__lt=cutoff).exclude(
        state__in=["expired", "converted", "rejected", "customer_approved"]
    )

    count = expired_quotes.count()
    if count > 0:
        logger.info(f"Expiring {count} old quotes.")
        # Bulk update doesn't trigger signals/FSM transitions usually,
        # so iterating might be safer for FSM consistency, or use bulk update if just state field.
        # For FSM, we should ideally call the transition method.
        for quote in expired_quotes:
            quote.state = "expired"  # Or call transition method
            quote.save()

    return f"Expired {count} quotes."
