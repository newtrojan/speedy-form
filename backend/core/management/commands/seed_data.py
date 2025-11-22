from typing import cast, List, Dict, Any
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from pricing.models import PricingConfig, InsuranceProvider, ShopPricingRule
from shops.models import Shop, ServiceArea


class Command(BaseCommand):
    help = "Seeds initial data for shops, pricing, and service areas"

    def handle(self, *args, **options):
        self.seed_pricing_config()
        self.seed_insurance_providers()
        self.seed_shops()
        self.seed_shop_pricing_rules()
        self.stdout.write(self.style.SUCCESS("Successfully seeded core data"))

    def seed_pricing_config(self):
        config, created = PricingConfig.objects.get_or_create(
            pk=1,
            defaults={
                "standard_labor_rate": 150.00,
                "complex_labor_rate": 200.00,
                "environmental_fee": 5.00,
                "disposal_fee": 10.00,
                "markup_multiplier": 1.30,
                "mobile_fee_tier_1_amount": 25.00,
                "mobile_fee_tier_2_amount": 50.00,
                "mobile_fee_tier_3_amount": 75.00,
                "max_mobile_service_distance": 50,
                "quote_expiration_days": 7,
            },
        )
        if created:
            self.stdout.write("Created PricingConfig")
        else:
            self.stdout.write("PricingConfig already exists")

    def seed_insurance_providers(self):
        providers = [
            {"name": "State Farm", "code": "statefarm", "uses_custom_pricing": False},
            {
                "name": "Geico",
                "code": "geico",
                "uses_custom_pricing": True,
                "markup_multiplier": 1.25,
            },
            {
                "name": "Progressive",
                "code": "progressive",
                "uses_custom_pricing": False,
            },
            {"name": "Allstate", "code": "allstate", "uses_custom_pricing": False},
            {
                "name": "USAA",
                "code": "usaa",
                "uses_custom_pricing": True,
                "markup_multiplier": 1.20,
            },
        ]
        for p in providers:
            obj, created = InsuranceProvider.objects.get_or_create(
                code=p["code"], defaults=p
            )
            if created:
                self.stdout.write(f"Created InsuranceProvider: {p['name']}")

    def seed_shops(self):
        # Type hint for shops_data to avoid mypy errors
        shops_data: List[Dict[str, Any]] = [
            {
                "name": "Bay Area Auto Glass",
                "street_address": "123 Market St",
                "city": "San Francisco",
                "state": "CA",
                "postal_code": "94105",
                "phone": "415-555-0101",
                "email": "sf@autoglass.com",
                "location": Point(-122.3965, 37.7910),
                "service_zips": ["94102", "94103", "94104", "94105", "94107", "94108"],
            },
            {
                "name": "NYC Glass Repair",
                "street_address": "350 5th Ave",
                "city": "New York",
                "state": "NY",
                "postal_code": "10118",
                "phone": "212-555-0102",
                "email": "nyc@autoglass.com",
                "location": Point(-73.9857, 40.7484),
                "service_zips": ["10001", "10002", "10003", "10118"],
            },
            {
                "name": "Austin Glass Pro",
                "street_address": "1100 Congress Ave",
                "city": "Austin",
                "state": "TX",
                "postal_code": "78701",
                "phone": "512-555-0103",
                "email": "austin@autoglass.com",
                "location": Point(-97.7431, 30.2672),
                "service_zips": ["78701", "78702", "78703", "78704"],
            },
            {
                "name": "Denver Auto Glass",
                "street_address": "1701 Wynkoop St",
                "city": "Denver",
                "state": "CO",
                "postal_code": "80202",
                "phone": "303-555-0104",
                "email": "denver@autoglass.com",
                "location": Point(-104.9903, 39.7392),
                "service_zips": ["80202", "80203", "80204", "80205"],
            },
            {
                "name": "Miami Glass Services",
                "street_address": "1111 Lincoln Rd",
                "city": "Miami",
                "state": "FL",
                "postal_code": "33139",
                "phone": "305-555-0105",
                "email": "miami@autoglass.com",
                "location": Point(-80.1918, 25.7617),
                "service_zips": ["33139", "33140", "33141"],
            },
        ]

        for s in shops_data:
            service_zips = cast(List[str], s.pop("service_zips"))
            shop, created = Shop.objects.get_or_create(name=s["name"], defaults=s)
            if created:
                self.stdout.write(f"Created Shop: {s['name']}")
                # Create service areas
                for zip_code in service_zips:
                    ServiceArea.objects.create(shop=shop, postal_code=zip_code)
                self.stdout.write(f"  Added {len(service_zips)} service areas")

    def seed_shop_pricing_rules(self):
        # Example rules
        try:
            sf_shop = Shop.objects.get(name="Bay Area Auto Glass")
            ShopPricingRule.objects.get_or_create(
                shop=sf_shop,
                manufacturer="nags",
                pricing_strategy="percentage_discount",
                defaults={
                    "discount_percentage": 25.00,
                    "name": "SF NAGS Discount",
                    "priority": 10,
                },
            )
        except Shop.DoesNotExist:
            pass
