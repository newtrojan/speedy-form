from django.test import TestCase  # noqa: F401
from .models import Shop, ServiceArea
from django.contrib.gis.geos import Point


class ShopModelTest(TestCase):
    def setUp(self):
        self.shop = Shop.objects.create(
            name="Test Shop",
            street_address="123 Market St",
            city="San Francisco",
            state="CA",
            postal_code="94105",
            phone="415-555-0101",
            email="shop@test.com",
            location=Point(-122.3965, 37.7910),
        )

    def test_shop_creation(self):
        self.assertEqual(self.shop.name, "Test Shop")
        self.assertEqual(
            self.shop.get_full_address(), "123 Market St, San Francisco, CA 94105"
        )

    def test_service_area(self):
        area = ServiceArea.objects.create(shop=self.shop, postal_code="94105")
        self.assertEqual(area.shop, self.shop)
        self.assertEqual(area.postal_code, "94105")
