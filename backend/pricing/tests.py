from decimal import Decimal
from django.test import TestCase
from pricing.services.calculator import PricingCalculator
from pricing.models import PricingConfig, ShopPricingRule
from shops.models import Shop
from vehicles.models import MockVehicleData
from django.contrib.gis.geos import Point


class PricingCalculatorTest(TestCase):
    def setUp(self):
        # Setup basic data
        self.calculator = PricingCalculator()

        # Config
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

        # Shop
        self.shop = Shop.objects.create(
            name="Test Shop",
            location=Point(0, 0),
            offers_mobile_service=True,
            max_mobile_radius_miles=50,
        )

        # Vehicle
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
                    "pgw_price": 350.00,
                }
            ],
        )

    def test_calculate_quote_standard(self):
        # Create a pricing rule
        ShopPricingRule.objects.create(
            shop=self.shop,
            manufacturer="nags",
            pricing_strategy="percentage_discount",
            discount_percentage=Decimal("20.00"),
            priority=10,
        )

        quote = self.calculator.calculate_quote(
            vin=self.vehicle.vin,
            glass_type="windshield",
            shop_id=self.shop.id,
            service_type="in_store",
            manufacturer="nags",
            use_mock=True,
        )

        # List price 400. Discount 20% = 80. Part price = 320.
        # Labor 150. Fees 5 + 10 = 15.
        # Total = 320 + 150 + 15 = 485.

        breakdown = quote["pricing_breakdown"]
        self.assertEqual(breakdown["part_cost"], Decimal("320.00"))
        self.assertEqual(breakdown["labor_cost"], Decimal("150.00"))
        self.assertEqual(breakdown["total"], Decimal("485.00"))

    def test_calculate_quote_mobile(self):
        ShopPricingRule.objects.create(
            shop=self.shop,
            manufacturer="nags",
            pricing_strategy="percentage_discount",
            discount_percentage=Decimal("20.00"),
            priority=10,
        )

        quote = self.calculator.calculate_quote(
            vin=self.vehicle.vin,
            glass_type="windshield",
            shop_id=self.shop.id,
            service_type="mobile",
            distance_miles=10.0,  # Tier 1
            manufacturer="nags",
            use_mock=True,
        )

        # Base 485 + Mobile Fee 25 = 510
        breakdown = quote["pricing_breakdown"]
        self.assertEqual(breakdown["total"], Decimal("510.00"))

        # Verify mobile fee is in fees list
        fees = breakdown["fees"]
        mobile_fee = next(f for f in fees if "Mobile" in f["name"])
        self.assertEqual(mobile_fee["amount"], Decimal("25.00"))

    def test_calculate_quote_complex_labor(self):
        # Update vehicle to luxury make
        self.vehicle.make = "BMW"
        self.vehicle.save()

        quote = self.calculator.calculate_quote(
            vin=self.vehicle.vin,
            glass_type="windshield",
            shop_id=self.shop.id,
            service_type="in_store",
            use_mock=True,
        )

        # Labor should be 200
        breakdown = quote["pricing_breakdown"]
        self.assertEqual(breakdown["labor_cost"], Decimal("200.00"))

    def test_calculate_quote_fallback_markup(self):
        # No pricing rules

        quote = self.calculator.calculate_quote(
            vin=self.vehicle.vin,
            glass_type="windshield",
            shop_id=self.shop.id,
            service_type="in_store",
            manufacturer="nags",
            use_mock=True,
        )

        # List 400. Markup 1.3 = 520.
        # Labor 150. Fees 15.
        # Total = 520 + 150 + 15 = 685.

        breakdown = quote["pricing_breakdown"]
        self.assertEqual(breakdown["part_cost"], Decimal("520.00"))
        self.assertEqual(breakdown["total"], Decimal("685.00"))
