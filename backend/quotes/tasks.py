import logging
from decimal import Decimal
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from quotes.models import Quote, QuoteLineItem
from customers.models import Customer
from shops.models import Shop
from shops.services.serviceability import ServiceabilityService
from pricing.services import PricingService, PricingError
from vehicles.services import VehicleLookupService, VehicleLookupError
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
    damage_type="unknown",
    damage_quantity="unknown",
    shop_id=None,
    service_address=None,
    insurance_data=None,
):
    """
    Async task to generate a quote.

    Flow:
    1. Check serviceability and find shop
    2. Lookup vehicle and parts via VehicleLookupService
    3. Calculate pricing via PricingService
    4. Create customer and quote records
    5. Send confirmation email
    6. Auto-approve if shop allows
    """
    logger.info(f"Starting quote generation for VIN {vin}")

    try:
        # Initialize Services
        serviceability_service = ServiceabilityService()
        vehicle_lookup_service = VehicleLookupService()
        pricing_service = PricingService()

        # 1. Validate Serviceability
        if service_type == "mobile":
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

        shop = Shop.objects.get(id=shop_id)

        # 2. Lookup Vehicle and Parts
        try:
            lookup_result = vehicle_lookup_service.lookup_by_vin(
                vin, glass_type=glass_type
            )
        except VehicleLookupError as e:
            logger.error(f"Vehicle lookup failed for {vin}: {e}")
            return {"status": "failed", "error": f"Vehicle lookup failed: {e}"}

        # 3. Calculate Pricing
        try:
            quote_pricing = pricing_service.calculate_quote(
                lookup_result=lookup_result,
                shop=shop,
                service_type=service_type,
                distance_miles=service_check.get("distance_miles"),
            )
        except PricingError as e:
            logger.error(f"Pricing calculation failed: {e}")
            return {"status": "failed", "error": f"Pricing failed: {e}"}

        # 4. Create/Get Customer
        customer, created = Customer.objects.get_or_create(
            email=customer_data.get("email"),
            defaults={
                "first_name": customer_data.get("first_name"),
                "last_name": customer_data.get("last_name"),
                "phone": customer_data.get("phone"),
            },
        )

        # 5. Create Quote Record
        pricing_data = quote_pricing.to_dict()

        # Determine initial state based on review flags
        initial_state = "pending_validation" if quote_pricing.needs_review else "draft"

        quote = Quote.objects.create(
            customer=customer,
            shop=shop,
            vin=vin,
            vehicle_info=pricing_data["vehicle"],
            postal_code=postal_code,
            glass_type=glass_type,
            damage_type=damage_type,
            damage_quantity=damage_quantity,
            service_type=service_type,
            service_address=service_address or {},
            distance_from_shop_miles=service_check.get("distance_miles"),
            payment_type=payment_type,
            pricing_details=pricing_data["pricing"],
            part_cost=quote_pricing.glass_cost,
            labor_cost=quote_pricing.labor_cost,
            fees=serialize_decimals(
                {
                    "kit_fee": quote_pricing.kit_fee,
                    "calibration_fee": quote_pricing.calibration_fee,
                    "mobile_fee": quote_pricing.mobile_fee,
                }
            ),
            total_price=quote_pricing.total,
            state=initial_state,
            expires_at=timezone.now() + timedelta(days=7),
        )

        # Create Line Items
        for item in quote_pricing.line_items:
            QuoteLineItem.objects.create(
                quote=quote,
                type=item.get("type"),
                description=item.get("description"),
                unit_price=item.get("unit_price"),
                quantity=item.get("quantity"),
                subtotal=item.get("subtotal"),
            )

        logger.info(f"Quote {quote.id} created successfully.")

        # Send engagement email immediately to confirm receipt
        send_quote_received_email.delay(quote.id)

        # Check if shop has auto-approval enabled AND quote doesn't need review
        if shop.auto_approve_quotes and not quote_pricing.needs_review:
            logger.info(
                f"Auto-approval enabled for shop {shop.id}. Sending quote email."
            )
            quote.send_to_customer()
            quote.save()
            send_quote_email.delay(quote.id)

        return {
            "status": "completed",
            "quote_id": str(quote.id),
            "total_price": str(quote.total_price),
            "needs_review": quote_pricing.needs_review,
        }

    except ServiceException as e:
        logger.error(f"Service error generating quote: {str(e)}")
        return {"status": "failed", "error": str(e)}
    except NotImplementedError as e:
        # PricingService not yet implemented
        logger.error(f"Not implemented: {str(e)}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error generating quote: {str(e)}", exc_info=True)
        return {"status": "failed", "error": "An unexpected error occurred."}


@shared_task
def send_quote_received_email(quote_id):
    """
    Sends engagement email confirming quote request was received.
    This is sent immediately after quote generation.
    """
    from core.services.email_service import EmailService

    try:
        quote = Quote.objects.get(id=quote_id)
        email_service = EmailService()
        email_service.send_quote_received(quote)

        logger.info(f"Quote received email queued for quote {quote_id}")

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found for quote received email")
    except Exception as e:
        logger.error(f"Error queueing quote received email for {quote_id}: {str(e)}")


@shared_task
def send_quote_email(quote_id):
    """
    Sends the quote email to the customer using EmailService.
    This includes the approval link and is sent after support validation
    or auto-approval.
    Note: EmailService now uses django-post-office which handles queueing
    and retries automatically. This task just triggers the email creation.
    """
    from core.services.email_service import EmailService

    try:
        quote = Quote.objects.get(id=quote_id)
        email_service = EmailService()
        email_service.send_quote(quote)

        logger.info(f"Email queued for quote {quote_id}")

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found for email sending")
    except Exception as e:
        logger.error(f"Error queueing email for quote {quote_id}: {str(e)}")


@shared_task
def expire_old_quotes():
    """
    Cron task to expire old quotes.
    """
    cutoff = timezone.now()

    # Find quotes that are past expiration and not already in a terminal state
    expired_quotes = Quote.objects.filter(expires_at__lt=cutoff).exclude(
        state__in=["expired", "converted", "rejected", "customer_approved"]
    )

    count = expired_quotes.count()
    if count > 0:
        logger.info(f"Expiring {count} old quotes.")
        for quote in expired_quotes:
            quote.state = "expired"
            quote.save()

    return f"Expired {count} quotes."
