from decimal import Decimal
from django.test import TestCase
from django.core import mail
from quotes.tasks import generate_quote_task, send_quote_email
from quotes.models import Quote
from shops.models import Shop, ServiceArea
from pricing.models import PricingConfig, ShopPricingRule
from vehicles.models import MockVehicleData
from django.contrib.gis.geos import Point


class EndToEndQuoteTest(TestCase):
    def setUp(self):
        # Setup all necessary data
        self.config = PricingConfig.objects.create(
            standard_labor_rate=Decimal("150.00"),
            complex_labor_rate=Decimal("200.00"),
            environmental_fee=Decimal("5.00"),
            disposal_fee=Decimal("10.00"),
            markup_multiplier=Decimal("1.30"),
            mobile_fee_tier_1_distance=15,
            mobile_fee_tier_1_amount=Decimal("25.00"),
            max_mobile_service_distance=50,
        )

        self.shop = Shop.objects.create(
            name="SF Shop",
            location=Point(-122.4194, 37.7749),
            offers_mobile_service=True,
            max_mobile_radius_miles=50,
        )

        ServiceArea.objects.create(shop=self.shop, postal_code="94105", is_active=True)

        ShopPricingRule.objects.create(
            shop=self.shop,
            manufacturer="nags",
            pricing_strategy="percentage_discount",
            discount_percentage=Decimal("20.00"),
            priority=10,
        )

        self.vehicle = MockVehicleData.objects.create(
            vin="1HGCM82633A004352",
            license_plate="TEST1",
            state="CA",
            year=2020,
            make="Toyota",
            model="Camry",
            glass_parts=[
                {
                    "type": "windshield",
                    "nags_id": "FW12345",
                    "description": "Windshield",
                    "nags_price": 400.00,
                }
            ],
        )

    def test_generate_quote_flow(self):
        # 1. Call Task
        result = generate_quote_task(
            vin=self.vehicle.vin,
            glass_type="windshield",
            manufacturer="nags",
            postal_code="94105",
            service_type="in_store",
            payment_type="cash",
            customer_data={
                "email": "test@example.com",
                "first_name": "Test",
                "last_name": "User",
                "phone": "555-0123",
            },
            use_mock=True,
        )

        if result["status"] != "completed":
            print(
                f"\nQuote Generation Failed: {result.get('error')} - {result.get('details')}"
            )

        self.assertEqual(result["status"], "completed")
        quote_id = result["quote_id"]

        # 2. Verify Quote
        quote = Quote.objects.get(id=quote_id)
        self.assertEqual(quote.state, "pending_validation")
        self.assertEqual(quote.customer.email, "test@example.com")
        self.assertEqual(quote.shop, self.shop)

        # Verify Pricing
        # 400 - 20% = 320. + 150 labor + 15 fees = 485.
        self.assertEqual(quote.total_price, Decimal("485.00"))

        # 3. Verify Line Items
        self.assertEqual(quote.line_items.count(), 4)  # Part, Labor, Env Fee, Disp Fee

    def test_email_flow(self):
        # Create a quote first
        result = generate_quote_task(
            vin=self.vehicle.vin,
            glass_type="windshield",
            manufacturer="nags",
            postal_code="94105",
            service_type="in_store",
            payment_type="cash",
            customer_data={
                "email": "test@example.com",
                "first_name": "Test",
                "last_name": "User",
                "phone": "555-0123",
            },
            use_mock=True,
        )
        quote_id = result["quote_id"]

        # Send Email
        send_quote_email(quote_id)

        # Verify Email Sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Your Auto Glass Quote", mail.outbox[0].subject)
        self.assertIn("test@example.com", mail.outbox[0].to)

        # Verify Token Generated
        quote = Quote.objects.get(id=quote_id)
        self.assertIsNotNone(quote.approval_token_hash)
