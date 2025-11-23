from django.test import TestCase
from django.contrib.gis.geos import Point
from shops.models import Shop, ServiceArea
from shops.services.serviceability import ServiceabilityService
from pricing.models import PricingConfig
from decimal import Decimal


class ServiceabilityServiceTest(TestCase):
    def setUp(self):
        self.service = ServiceabilityService()

        # Create Shop
        self.shop = Shop.objects.create(
            name="Test Shop",
            location=Point(-122.4194, 37.7749),  # SF
            offers_mobile_service=True,
            max_mobile_radius_miles=50,
        )

        # Create Service Area
        ServiceArea.objects.create(shop=self.shop, postal_code="94105", is_active=True)

        # Pricing Config (needed for mobile fee calc)
        PricingConfig.objects.create(
            mobile_fee_tier_1_distance=15,
            mobile_fee_tier_1_amount=Decimal("25.00"),
            max_mobile_service_distance=50,
        )

    def test_check_in_store_serviceable(self):
        result = self.service.check_in_store("94105")
        self.assertTrue(result["is_serviceable"])
        self.assertEqual(result["shop"]["id"], self.shop.id)

    def test_check_in_store_unserviceable(self):
        result = self.service.check_in_store("10001")  # NYC
        self.assertFalse(result["is_serviceable"])
        # Should find nearby shop (our SF shop is the only one,
        # so it might be returned as nearby)
        # But since we enforce 50 miles radius, it should be empty for NYC
        self.assertEqual(len(result["nearby_shops"]), 0)

    def test_check_mobile_serviceable(self):
        # Mock geocoding by patching or using known stub values
        # Our stub has 94105 -> SF.
        # Let's use a zip that is close to the shop.
        # Shop is at -122.4194, 37.7749.
        # Stub 94105 is -122.3965, 37.7910. Distance is small.

        result = self.service.check_mobile("94105")
        self.assertTrue(result["is_serviceable"])
        self.assertIsNotNone(result["mobile_fee"])

    def test_check_mobile_too_far(self):
        # Create a shop far away (100 miles)
        Shop.objects.create(
            name="Far Shop",
            location=Point(-75.0000, 40.0000),  # Roughly Philadelphia area
            offers_mobile_service=True,
            max_mobile_radius_miles=20,
        )

        # Check against 94105 (SF)
        # Should fail for far_shop, and fail for self.shop if we set radius small
        self.shop.max_mobile_radius_miles = 1
        self.shop.save()

        # 94105 centroid is > 1 mile from shop location
        result = self.service.check_mobile("94105")
        self.assertFalse(result["is_serviceable"])
