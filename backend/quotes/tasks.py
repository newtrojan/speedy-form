import logging
from decimal import Decimal
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from quotes.models import Quote, QuoteLineItem
from customers.models import Customer
from shops.models import Shop
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
    # Service intent determines the flow
    service_intent="replacement",
    # Vehicle identification (required for replacement)
    vin=None,
    license_plate=None,
    plate_state=None,
    # Glass and damage details
    glass_type=None,
    damage_type="unknown",
    chip_count=None,
    # Part selection (from frontend - avoids re-fetching from AUTOBOLT)
    nags_part_number=None,
    # Location and service
    postal_code=None,
    service_type=None,
    shop_id=None,
    distance_miles=None,
    service_address=None,
    # Customer
    customer_data=None,
    insurance_data=None,
):
    """
    Async task to generate a quote.

    Supports 3 service intents:
    1. replacement: Full vehicle lookup → pricing flow
    2. chip_repair: Simple chip count → flat pricing
    3. other: Manual review quote for CSR

    Flow for replacement:
    1. Resolve VIN from plate if needed
    2. Lookup vehicle and parts via VehicleLookupService
    3. Calculate pricing via PricingService
    4. Create customer and quote records
    5. Send confirmation email
    6. Auto-approve if shop allows

    Flow for chip_repair:
    1. Calculate chip repair pricing
    2. Create customer and quote records
    3. Send confirmation email
    4. Auto-approve (chip repairs are simple)

    Flow for other:
    1. Create quote with needs_manual_review=True
    2. Route to CSR queue
    """
    logger.info(
        f"Starting quote generation: intent={service_intent}, "
        f"vin={vin}, plate={license_plate}, shop_id={shop_id}"
    )

    try:
        # Validate shop_id is provided
        if not shop_id:
            return {"status": "failed", "error": "shop_id is required"}

        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            return {"status": "failed", "error": f"Shop {shop_id} not found"}

        # Create/Get Customer
        customer, created = Customer.objects.get_or_create(
            email=customer_data.get("email"),
            defaults={
                "first_name": customer_data.get("first_name"),
                "last_name": customer_data.get("last_name"),
                "phone": customer_data.get("phone"),
            },
        )

        # Route based on service intent
        if service_intent == "chip_repair":
            return _generate_chip_repair_quote(
                shop=shop,
                customer=customer,
                chip_count=chip_count,
                service_type=service_type,
                distance_miles=distance_miles,
                postal_code=postal_code,
                service_address=service_address,
            )

        elif service_intent == "other":
            return _generate_other_glass_quote(
                shop=shop,
                customer=customer,
                glass_type=glass_type,
                damage_type=damage_type,
                service_type=service_type,
                distance_miles=distance_miles,
                postal_code=postal_code,
                service_address=service_address,
            )

        else:  # replacement
            return _generate_replacement_quote(
                shop=shop,
                customer=customer,
                vin=vin,
                license_plate=license_plate,
                plate_state=plate_state,
                glass_type=glass_type,
                damage_type=damage_type,
                service_type=service_type,
                distance_miles=distance_miles,
                postal_code=postal_code,
                service_address=service_address,
                insurance_data=insurance_data,
                nags_part_number=nags_part_number,
            )

    except ServiceException as e:
        logger.error(f"Service error generating quote: {str(e)}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error generating quote: {str(e)}", exc_info=True)
        return {"status": "failed", "error": "An unexpected error occurred."}


def _generate_chip_repair_quote(
    shop,
    customer,
    chip_count,
    service_type,
    distance_miles,
    postal_code,
    service_address,
):
    """Generate a chip repair quote."""
    pricing_service = PricingService()

    try:
        chip_pricing = pricing_service.calculate_chip_repair(
            chip_count=chip_count,
            shop=shop,
            service_type=service_type,
            distance_miles=distance_miles,
        )
    except PricingError as e:
        logger.error(f"Chip repair pricing failed: {e}")
        return {"status": "failed", "error": f"Pricing failed: {e}"}

    # Create quote - chip repairs are simple, always auto-send
    # Start at pending_validation, immediately transition to sent
    quote = Quote.objects.create(
        customer=customer,
        shop=shop,
        vin=None,
        vehicle_info=None,
        postal_code=postal_code,
        glass_type="windshield",  # Chip repairs are always windshield
        damage_type="chip",
        service_type=service_type,
        service_address=service_address or {},
        distance_from_shop_miles=distance_miles,
        payment_type="cash",  # Chip repairs default to cash
        pricing_details=chip_pricing.to_dict()["pricing"],
        part_cost=Decimal("0.00"),
        labor_cost=chip_pricing.chip_repair_cost,
        fees=serialize_decimals({"mobile_fee": chip_pricing.mobile_fee}),
        total_price=chip_pricing.total,
        state="pending_validation",  # Start here, then auto-send
        expires_at=timezone.now() + timedelta(days=7),
    )

    # Create Line Items
    for item in chip_pricing.line_items:
        QuoteLineItem.objects.create(
            quote=quote,
            type=item.get("type"),
            description=item.get("description"),
            unit_price=item.get("unit_price"),
            quantity=item.get("quantity"),
            subtotal=item.get("subtotal"),
        )

    logger.info(f"Chip repair quote {quote.id} created successfully.")

    # Chip repairs are simple - always auto-send
    quote.send_to_customer()  # pending_validation → sent
    quote.save()
    send_quote_email.delay(quote.id)  # "Your Quote is Ready"

    return {
        "status": "completed",
        "quote_id": str(quote.id),
        "total_price": str(quote.total_price),
        "needs_review": False,
    }


def _generate_other_glass_quote(
    shop,
    customer,
    glass_type,
    damage_type,
    service_type,
    distance_miles,
    postal_code,
    service_address,
):
    """Generate a quote for 'other' glass that needs CSR review."""
    # Create quote - CSR will price it
    quote = Quote.objects.create(
        customer=customer,
        shop=shop,
        vin=None,
        vehicle_info={"year": None, "make": None, "model": "Other Glass"},
        postal_code=postal_code,
        glass_type=glass_type or "other",
        damage_type=damage_type,
        service_type=service_type,
        service_address=service_address or {},
        distance_from_shop_miles=distance_miles,
        payment_type="cash",
        pricing_details={},
        part_cost=Decimal("0.00"),
        labor_cost=Decimal("0.00"),
        fees={},
        total_price=Decimal("0.00"),  # CSR will set pricing
        state="pending_validation",  # Stays here for CSR
        expires_at=timezone.now() + timedelta(days=7),
    )

    logger.info(f"Other glass quote {quote.id} created - needs CSR review.")

    # Send "We're Reviewing" email since this always needs CSR
    send_quote_pending_review_email.delay(quote.id)

    return {
        "status": "completed",
        "quote_id": str(quote.id),
        "total_price": "0.00",
        "needs_review": True,
        "review_reason": "Other glass type requires manual pricing",
    }


def _generate_replacement_quote(
    shop,
    customer,
    vin,
    license_plate,
    plate_state,
    glass_type,
    damage_type,
    service_type,
    distance_miles,
    postal_code,
    service_address,
    insurance_data,
    nags_part_number=None,
):
    """Generate a replacement quote with full vehicle lookup and pricing."""
    vehicle_lookup_service = VehicleLookupService()
    pricing_service = PricingService()

    # Resolve VIN from license plate if needed
    if not vin and license_plate and plate_state:
        try:
            plate_result = vehicle_lookup_service.lookup_by_plate(
                license_plate, plate_state
            )
            vin = plate_result.vin
            logger.info(f"Resolved VIN {vin} from plate {license_plate}")
        except VehicleLookupError as e:
            logger.error(f"Plate lookup failed for {license_plate}: {e}")
            return {"status": "failed", "error": f"Vehicle lookup failed: {e}"}

    # Lookup vehicle and parts
    try:
        lookup_result = vehicle_lookup_service.lookup_by_vin(vin, glass_type=glass_type)
    except VehicleLookupError as e:
        logger.error(f"Vehicle lookup failed for {vin}: {e}")
        return {"status": "failed", "error": f"Vehicle lookup failed: {e}"}

    # If frontend provided a specific part number, filter to that part
    if nags_part_number and lookup_result.parts:
        selected_part = next(
            (p for p in lookup_result.parts if p.nags_part_number == nags_part_number),
            None,
        )
        if selected_part:
            logger.info(f"Using pre-selected part: {nags_part_number}")
            lookup_result.parts = [selected_part]
        else:
            logger.warning(
                f"Pre-selected part {nags_part_number} not found in lookup results, "
                f"using all {len(lookup_result.parts)} parts"
            )

    # Calculate pricing
    try:
        quote_pricing = pricing_service.calculate_quote(
            lookup_result=lookup_result,
            shop=shop,
            service_type=service_type,
            distance_miles=distance_miles,
        )
    except PricingError as e:
        logger.error(f"Pricing calculation failed: {e}")
        return {"status": "failed", "error": f"Pricing failed: {e}"}

    # Always start at pending_validation state
    pricing_data = quote_pricing.to_dict()

    quote = Quote.objects.create(
        customer=customer,
        shop=shop,
        vin=vin,
        vehicle_info=pricing_data["vehicle"],
        postal_code=postal_code,
        glass_type=glass_type,
        damage_type=damage_type,
        service_type=service_type,
        service_address=service_address or {},
        distance_from_shop_miles=distance_miles,
        payment_type="cash",  # Show all 3 tiers on frontend
        pricing_details=pricing_data["pricing"],
        part_cost=quote_pricing.glass_cost,
        labor_cost=quote_pricing.labor_cost,
        fees=serialize_decimals(
            {
                "kit_fee": quote_pricing.kit_fee,
                "moulding_fee": quote_pricing.moulding_fee,
                "hardware_fee": quote_pricing.hardware_fee,
                "calibration_fee": quote_pricing.calibration_fee,
                "mobile_fee": quote_pricing.mobile_fee,
            }
        ),
        total_price=quote_pricing.total,
        state="pending_validation",  # Always start here
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

    logger.info(f"Replacement quote {quote.id} created successfully.")

    # Decide email flow based on failsafe checks
    if not quote_pricing.needs_review:
        # All failsafes passed - auto-send quote to customer
        logger.info(
            f"Quote {quote.id} passed all failsafes. Auto-sending to customer."
        )
        quote.send_to_customer()  # pending_validation → sent
        quote.save()
        send_quote_email.delay(quote.id)  # "Your Quote is Ready"

        return {
            "status": "completed",
            "quote_id": str(quote.id),
            "total_price": str(quote.total_price),
            "needs_review": False,
        }

    else:
        # Failsafe triggered - stays in pending_validation for CSR review
        logger.info(
            f"Quote {quote.id} needs CSR review. Reason: {quote_pricing.review_reason}"
        )
        send_quote_pending_review_email.delay(quote.id)  # "We're Reviewing..."

        return {
            "status": "completed",
            "quote_id": str(quote.id),
            "total_price": str(quote.total_price),
            "needs_review": True,
            "review_reason": quote_pricing.review_reason,
        }


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
def send_quote_pending_review_email(quote_id):
    """
    Sends email when quote needs CSR review.

    This is sent when a failsafe is triggered (price out of bounds,
    multiple parts, missing calibration data, etc.).

    The email informs the customer that their request is being reviewed
    and a specialist will contact them shortly.
    """
    from core.services.email_service import EmailService

    try:
        quote = Quote.objects.get(id=quote_id)
        email_service = EmailService()
        email_service.send_quote_pending_review(quote)

        logger.info(f"Pending review email sent for quote {quote_id}")

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found for pending review email")
    except Exception as e:
        logger.error(f"Error sending pending review email for {quote_id}: {str(e)}")


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
