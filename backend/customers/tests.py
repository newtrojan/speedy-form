from django.test import TestCase  # noqa: F401
from .models import Customer
from django.contrib.gis.geos import Point


class CustomerModelTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(
            email="test@example.com",
            phone="+15550000000",
            first_name="John",
            last_name="Doe",
            postal_code="94105",
            location=Point(-122.3965, 37.7910),
        )

    def test_customer_creation(self):
        self.assertEqual(self.customer.email, "test@example.com")
        self.assertEqual(self.customer.get_full_name(), "John Doe")
        self.assertTrue(isinstance(self.customer.location, Point))

    def test_has_complete_address(self):
        self.assertFalse(self.customer.has_complete_address())
        self.customer.street_address = "123 Main St"
        self.customer.city = "SF"
        self.customer.state = "CA"
        self.customer.save()
        self.assertTrue(self.customer.has_complete_address())
