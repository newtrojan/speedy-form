"""
Management command to seed test data for development.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.gis.geos import Point
from decimal import Decimal
import hashlib

from customers.models import Customer
from shops.models import Shop, ServiceArea
from pricing.models import PricingConfig, ShopPricingRule
from quotes.models import Quote, QuoteLineItem
from vehicles.models import MockVehicleData

User = get_user_model()


class Command(BaseCommand):
    help = "Seed database with test data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding test data...")

        # Create users
        self.create_users()

        # Create pricing config
        self.create_pricing_config()

        # Create shops
        self.create_shops()

        # Create mock vehicles
        self.create_vehicles()

        # Create customers and quotes
        self.create_quotes()

        self.stdout.write(self.style.SUCCESS("✅ Test data seeded successfully!"))

    def create_users(self):
        self.stdout.write("Creating users...")

        # Create support agent group
        support_group, _ = Group.objects.get_or_create(name="Support Agent")

        # Admin user
        if not User.objects.filter(username="admin").exists():
            admin = User.objects.create_superuser(
                username="admin",
                email="admin@example.com",
                password="admin123",
                first_name="Admin",
                last_name="User",
            )
            self.stdout.write(f"  ✓ Created admin user: {admin.email}")

        # Support agent
        if not User.objects.filter(username="support").exists():
            support = User.objects.create_user(
                username="support",
                email="support@example.com",
                password="password123",
                first_name="Support",
                last_name="Agent",
            )
            support.groups.add(support_group)
            self.stdout.write(f"  ✓ Created support user: {support.email}")

    def create_pricing_config(self):
        self.stdout.write("Creating pricing config...")

        if not PricingConfig.objects.exists():
            config = PricingConfig.objects.create(
                standard_labor_rate=Decimal("150.00"),
                complex_labor_rate=Decimal("200.00"),
                environmental_fee=Decimal("5.00"),
                disposal_fee=Decimal("10.00"),
                markup_multiplier=Decimal("1.30"),
                mobile_fee_tier_1_distance=15,
                mobile_fee_tier_1_amount=Decimal("25.00"),
                mobile_fee_tier_2_distance=30,
                mobile_fee_tier_2_amount=Decimal("50.00"),
                mobile_fee_tier_3_distance=50,
                mobile_fee_tier_3_amount=Decimal("75.00"),
                max_mobile_service_distance=50,
            )
            self.stdout.write(f"  ✓ Created pricing config: {config.id}")

    def create_shops(self):
        self.stdout.write("Creating shops...")

        # San Francisco shop
        if not Shop.objects.filter(name="SF Auto Glass").exists():
            sf_shop = Shop.objects.create(
                name="SF Auto Glass",
                location=Point(-122.4194, 37.7749, srid=4326),
                offers_mobile_service=True,
                max_mobile_radius_miles=50,
            )

            # Service areas
            for zip_code in ["94102", "94103", "94104", "94105", "94107"]:
                ServiceArea.objects.create(
                    shop=sf_shop, postal_code=zip_code, is_active=True
                )

            # Pricing rules
            ShopPricingRule.objects.create(
                shop=sf_shop,
                manufacturer="nags",
                pricing_strategy="percentage_discount",
                discount_percentage=Decimal("20.00"),
                priority=10,
            )

            self.stdout.write(f"  ✓ Created shop: {sf_shop.name}")

        # Austin shop
        if not Shop.objects.filter(name="Austin Glass Pro").exists():
            austin_shop = Shop.objects.create(
                name="Austin Glass Pro",
                location=Point(-97.7431, 30.2672, srid=4326),
                offers_mobile_service=True,
                max_mobile_radius_miles=40,
            )

            for zip_code in ["78701", "78702", "78703", "78704"]:
                ServiceArea.objects.create(
                    shop=austin_shop, postal_code=zip_code, is_active=True
                )

            self.stdout.write(f"  ✓ Created shop: {austin_shop.name}")

    def create_vehicles(self):
        self.stdout.write("Creating mock vehicles...")

        vehicles = [
            {
                "vin": "1HGCM82633A004352",
                "year": 2020,
                "make": "Honda",
                "model": "Accord",
                "license_plate": "ABC1234",
                "state": "CA",
                "glass_parts": [
                    {
                        "type": "WINDSHIELD",
                        "nags_id": "FW12345",
                        "description": "Windshield",
                        "nags_price": 400.00,
                        "pgw_price": 380.00,
                    }
                ],
            },
            {
                "vin": "5YJSA1E26HF123456",
                "year": 2021,
                "make": "Tesla",
                "model": "Model S",
                "license_plate": "XYZ5678",
                "state": "CA",
                "glass_parts": [
                    {
                        "type": "WINDSHIELD",
                        "nags_id": "FW67890",
                        "description": "Windshield with Rain Sensor",
                        "nags_price": 800.00,
                        "pgw_price": 750.00,
                    }
                ],
            },
        ]

        for vehicle_data in vehicles:
            vehicle, created = MockVehicleData.objects.get_or_create(
                vin=vehicle_data["vin"], defaults=vehicle_data
            )
            if created:
                self.stdout.write(
                    f"  ✓ Created vehicle: {vehicle_data['year']} "
                    f"{vehicle_data['make']} {vehicle_data['model']}"
                )
            else:
                self.stdout.write(
                    f"  ⚠ Vehicle already exists: {vehicle.year} "
                    f"{vehicle.make} {vehicle.model}"
                )

    def create_quotes(self):
        self.stdout.write("Creating test quotes...")

        shop = Shop.objects.first()
        if not shop:
            self.stdout.write(self.style.WARNING("  ⚠ No shops found, skipping quotes"))
            return

        # Create customers
        customers_data = [
            {
                "email": "john.doe@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "phone": "+14155551234",
            },
            {
                "email": "jane.smith@example.com",
                "first_name": "Jane",
                "last_name": "Smith",
                "phone": "+14155555678",
            },
        ]

        for customer_data in customers_data:
            customer, created = Customer.objects.get_or_create(
                email=customer_data["email"], defaults=customer_data
            )

            if created:
                # Create a pending validation quote
                quote = Quote.objects.create(
                    customer=customer,
                    shop=shop,
                    vin="1HGCM82633A004352",
                    vehicle_info={
                        "year": 2020,
                        "make": "Honda",
                        "model": "Accord",
                    },
                    glass_type="WINDSHIELD",
                    service_type="mobile",
                    service_address="123 Main St, San Francisco, CA 94105",
                    payment_type="cash",
                    total_price=Decimal("485.00"),
                    state="pending_validation",
                    pricing_details={
                        "part_price": 320.00,
                        "labor": 150.00,
                        "fees": 15.00,
                    },
                )

                # Add line items
                QuoteLineItem.objects.create(
                    quote=quote,
                    type="part",
                    description="Windshield",
                    unit_price=Decimal("320.00"),
                    quantity=1,
                    subtotal=Decimal("320.00"),
                )
                QuoteLineItem.objects.create(
                    quote=quote,
                    type="labor",
                    description="Installation Labor",
                    unit_price=Decimal("150.00"),
                    quantity=1,
                    subtotal=Decimal("150.00"),
                )
                QuoteLineItem.objects.create(
                    quote=quote,
                    type="fee",
                    description="Environmental Fee",
                    unit_price=Decimal("5.00"),
                    quantity=1,
                    subtotal=Decimal("5.00"),
                )
                QuoteLineItem.objects.create(
                    quote=quote,
                    type="fee",
                    description="Disposal Fee",
                    unit_price=Decimal("10.00"),
                    quantity=1,
                    subtotal=Decimal("10.00"),
                )

                self.stdout.write(
                    f"  ✓ Created quote for {customer.email}: ${quote.total_price}"
                )

                # Create one sent quote with approval token
                if customer.email == "john.doe@example.com":
                    sent_quote = Quote.objects.create(
                        customer=customer,
                        shop=shop,
                        vin="5YJSA1E26HF123456",
                        vehicle_info={
                            "year": 2021,
                            "make": "Tesla",
                            "model": "Model S",
                        },
                        glass_type="WINDSHIELD",
                        service_type="in_store",
                        service_address=shop.name,
                        payment_type="insurance",
                        total_price=Decimal("950.00"),
                        state="sent",
                        pricing_details={
                            "part_price": 750.00,
                            "labor": 200.00,
                        },
                        approval_token_hash=hashlib.sha256(
                            b"test-token-123"
                        ).hexdigest(),
                    )

                    QuoteLineItem.objects.create(
                        quote=sent_quote,
                        type="part",
                        description="Windshield with Rain Sensor",
                        unit_price=Decimal("750.00"),
                        quantity=1,
                        subtotal=Decimal("750.00"),
                    )
                    QuoteLineItem.objects.create(
                        quote=sent_quote,
                        type="labor",
                        description="Complex Installation Labor",
                        unit_price=Decimal("200.00"),
                        quantity=1,
                        subtotal=Decimal("200.00"),
                    )

                    self.stdout.write(
                        f"  ✓ Created sent quote: ${sent_quote.total_price} "
                        f"(token: test-token-123)"
                    )
