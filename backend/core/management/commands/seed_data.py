from typing import List, Dict, Any
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from pricing.models import PricingConfig, InsuranceProvider, PricingProfile
from shops.models import Shop, ServiceArea


class Command(BaseCommand):
    help = "Seeds initial data for shops, pricing, and service areas"

    def handle(self, *args, **options):
        self.seed_pricing_config()
        self.seed_insurance_providers()
        self.seed_shops()
        self.seed_pricing_profiles()
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
            {
                "name": "Liberty Mutual",
                "code": "libertymutual",
                "uses_custom_pricing": False,
            },
            {"name": "Farmers", "code": "farmers", "uses_custom_pricing": False},
            {"name": "Nationwide", "code": "nationwide", "uses_custom_pricing": False},
        ]
        for p in providers:
            obj, created = InsuranceProvider.objects.get_or_create(
                code=p["code"], defaults=p
            )
            if created:
                self.stdout.write(f"Created InsuranceProvider: {p['name']}")

    def seed_shops(self):
        """Seed real Speedy Glass locations with geocoded coordinates."""
        # All 28 Speedy Glass locations from speedy-locations.md
        # Coordinates are pre-geocoded (longitude, latitude) for PostGIS Point
        shops_data: List[Dict[str, Any]] = [
            # === ALASKA (6 Locations) ===
            {
                "name": "Speedy Glass Anchorage (Brayton Dr)",
                "street_address": "6511 Brayton Dr",
                "city": "Anchorage",
                "state": "AK",
                "postal_code": "99507",
                "phone": "(907) 272-1435",
                "email": "anchorage.brayton@speedyglass.com",
                "location": Point(-149.8631, 61.1508),
            },
            {
                "name": "Speedy Glass Anchorage (East 5th)",
                "street_address": "901 E 5th Ave",
                "city": "Anchorage",
                "state": "AK",
                "postal_code": "99501",
                "phone": "(907) 274-5509",
                "email": "anchorage.5th@speedyglass.com",
                "location": Point(-149.8697, 61.2181),
            },
            {
                "name": "Speedy Glass Anchorage (Huffman)",
                "street_address": "1215 Huffman Rd",
                "city": "Anchorage",
                "state": "AK",
                "postal_code": "99515",
                "phone": "(907) 345-2343",
                "email": "anchorage.huffman@speedyglass.com",
                "location": Point(-149.8583, 61.1083),
            },
            {
                "name": "Speedy Glass Eagle River",
                "street_address": "12108 Business Blvd",
                "city": "Eagle River",
                "state": "AK",
                "postal_code": "99577",
                "phone": "(907) 694-7640",
                "email": "eagleriver@speedyglass.com",
                "location": Point(-149.5683, 61.3214),
            },
            {
                "name": "Speedy Glass Fairbanks",
                "street_address": "2206 Discovery Dr",
                "city": "Fairbanks",
                "state": "AK",
                "postal_code": "99709",
                "phone": "(907) 456-2777",
                "email": "fairbanks@speedyglass.com",
                "location": Point(-147.8761, 64.8401),
            },
            {
                "name": "Speedy Glass Wasilla",
                "street_address": "935 Commercial Dr",
                "city": "Wasilla",
                "state": "AK",
                "postal_code": "99654",
                "phone": "(907) 376-3251",
                "email": "wasilla@speedyglass.com",
                "location": Point(-149.4372, 61.5814),
            },
            # === ARIZONA (1 Location) ===
            {
                "name": "Speedy Glass Tucson",
                "street_address": "120 S Kolb Rd",
                "city": "Tucson",
                "state": "AZ",
                "postal_code": "85710",
                "phone": "(520) 296-7171",
                "email": "tucson@speedyglass.com",
                "location": Point(-110.8128, 32.2217),
            },
            # === COLORADO (1 Location) ===
            {
                "name": "Speedy Glass Denver (Englewood)",
                "street_address": "4700 S Broadway",
                "city": "Englewood",
                "state": "CO",
                "postal_code": "80113",
                "phone": "(303) 635-6863",
                "email": "denver@speedyglass.com",
                "location": Point(-104.9875, 39.6478),
            },
            # === MONTANA (4 Locations) ===
            {
                "name": "Speedy Glass Billings",
                "street_address": "3207 Montana Ave",
                "city": "Billings",
                "state": "MT",
                "postal_code": "59101",
                "phone": "(406) 248-3605",
                "email": "billings@speedyglass.com",
                "location": Point(-108.5007, 45.7833),
            },
            {
                "name": "Speedy Glass Bozeman",
                "street_address": "1022 N 7th Ave",
                "city": "Bozeman",
                "state": "MT",
                "postal_code": "59715",
                "phone": "(406) 587-5575",
                "email": "bozeman@speedyglass.com",
                "location": Point(-111.0429, 45.6878),
            },
            {
                "name": "Speedy Glass Great Falls",
                "street_address": "2125 10th Ave S",
                "city": "Great Falls",
                "state": "MT",
                "postal_code": "59405",
                "phone": "(406) 727-8642",
                "email": "greatfalls@speedyglass.com",
                "location": Point(-111.2833, 47.4942),
            },
            {
                "name": "Speedy Glass Helena",
                "street_address": "1521 N Montana Ave",
                "city": "Helena",
                "state": "MT",
                "postal_code": "59601",
                "phone": "(406) 442-2489",
                "email": "helena@speedyglass.com",
                "location": Point(-112.0391, 46.5958),
            },
            # === NEW MEXICO (3 Locations) ===
            {
                "name": "Speedy Glass Albuquerque",
                "street_address": "9626 Menaul Blvd NE",
                "city": "Albuquerque",
                "state": "NM",
                "postal_code": "87112",
                "phone": "(505) 294-7006",
                "email": "albuquerque@speedyglass.com",
                "location": Point(-106.5642, 35.0972),
            },
            {
                "name": "Speedy Glass Las Cruces",
                "street_address": "455 Foster Rd",
                "city": "Las Cruces",
                "state": "NM",
                "postal_code": "88005",
                "phone": "(575) 526-9571",
                "email": "lascruces@speedyglass.com",
                "location": Point(-106.7893, 32.3199),
            },
            {
                "name": "Speedy Glass Santa Fe",
                "street_address": "3202 Calle Marie",
                "city": "Santa Fe",
                "state": "NM",
                "postal_code": "87507",
                "phone": "(505) 982-4373",
                "email": "santafe@speedyglass.com",
                "location": Point(-105.9378, 35.6619),
            },
            # === OREGON (3 Locations) ===
            {
                "name": "Speedy Glass Milwaukie",
                "street_address": "16669 SE McLoughlin Blvd",
                "city": "Milwaukie",
                "state": "OR",
                "postal_code": "97267",
                "phone": "(503) 252-1439",
                "email": "milwaukie@speedyglass.com",
                "location": Point(-122.6289, 45.4151),
            },
            {
                "name": "Speedy Glass Portland (Broadway)",
                "street_address": "1804 NE Broadway",
                "city": "Portland",
                "state": "OR",
                "postal_code": "97232",
                "phone": "(503) 288-5964",
                "email": "portland@speedyglass.com",
                "location": Point(-122.6425, 45.5347),
            },
            {
                "name": "Speedy Glass Salem",
                "street_address": "1085 13th St SE",
                "city": "Salem",
                "state": "OR",
                "postal_code": "97302",
                "phone": "(503) 371-1777",
                "email": "salem@speedyglass.com",
                "location": Point(-122.9983, 44.9296),
            },
            # === WASHINGTON (9 Locations) ===
            {
                "name": "Speedy Glass Auburn",
                "street_address": "1801 Auburn Way North",
                "city": "Auburn",
                "state": "WA",
                "postal_code": "98002",
                "phone": "(253) 604-2563",
                "email": "auburn@speedyglass.com",
                "location": Point(-122.2165, 47.3245),
            },
            {
                "name": "Speedy Glass Bothell",
                "street_address": "18206 Bothell Way NE",
                "city": "Bothell",
                "state": "WA",
                "postal_code": "98011",
                "phone": "(425) 486-1032",
                "email": "bothell@speedyglass.com",
                "location": Point(-122.2015, 47.7623),
            },
            {
                "name": "Speedy Glass Federal Way",
                "street_address": "32610 Pacific Hwy S",
                "city": "Federal Way",
                "state": "WA",
                "postal_code": "98003",
                "phone": "(253) 838-8838",
                "email": "federalway@speedyglass.com",
                "location": Point(-122.3126, 47.3043),
            },
            {
                "name": "Speedy Glass Gig Harbor",
                "street_address": "3720 Harborview Dr",
                "city": "Gig Harbor",
                "state": "WA",
                "postal_code": "98332",
                "phone": "(253) 851-8496",
                "email": "gigharbor@speedyglass.com",
                "location": Point(-122.5801, 47.3290),
            },
            {
                "name": "Speedy Glass Kennewick",
                "street_address": "5623 West Clearwater Avenue",
                "city": "Kennewick",
                "state": "WA",
                "postal_code": "99336",
                "phone": "(509) 783-3500",
                "email": "kennewick@speedyglass.com",
                "location": Point(-119.2369, 46.2112),
            },
            {
                "name": "Speedy Glass Puyallup",
                "street_address": "12623 Meridian Ave E",
                "city": "Puyallup",
                "state": "WA",
                "postal_code": "98373",
                "phone": "(253) 848-4400",
                "email": "puyallup@speedyglass.com",
                "location": Point(-122.2929, 47.1301),
            },
            {
                "name": "Speedy Glass Seattle",
                "street_address": "12813 Aurora Avenue North",
                "city": "Seattle",
                "state": "WA",
                "postal_code": "98133",
                "phone": "(206) 522-1707",
                "email": "seattle@speedyglass.com",
                "location": Point(-122.3450, 47.7265),
            },
            {
                "name": "Speedy Glass Tacoma",
                "street_address": "4708 S Tacoma Way",
                "city": "Tacoma",
                "state": "WA",
                "postal_code": "98409",
                "phone": "(253) 474-0784",
                "email": "tacoma@speedyglass.com",
                "location": Point(-122.4713, 47.2095),
            },
            {
                "name": "Speedy Glass Vancouver",
                "street_address": "1905 East 5th Suite A,B,C,D",
                "city": "Vancouver",
                "state": "WA",
                "postal_code": "98661",
                "phone": "(971) 416-8977",
                "email": "vancouver@speedyglass.com",
                "location": Point(-122.6265, 45.6387),
            },
        ]

        created_count = 0
        for shop_data in shops_data:
            shop, created = Shop.objects.get_or_create(
                name=shop_data["name"], defaults=shop_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created Shop: {shop_data['name']}")

                # Create service area for the shop's postal code
                ServiceArea.objects.get_or_create(
                    shop=shop, postal_code=shop_data["postal_code"]
                )

        self.stdout.write(f"Created {created_count} new shops (28 total locations)")

    def seed_pricing_profiles(self):
        """Create a default PricingProfile for each shop."""
        shops = Shop.objects.all()
        created_count = 0

        for shop in shops:
            # Check if shop already has a default profile
            if not PricingProfile.objects.filter(shop=shop, is_default=True).exists():
                PricingProfile.objects.create(
                    name="Standard Pricing",
                    shop=shop,
                    is_default=True,
                    is_active=True,
                    # All other fields use model defaults
                )
                created_count += 1
                self.stdout.write(f"Created PricingProfile for: {shop.name}")

        self.stdout.write(f"Created {created_count} pricing profiles")
