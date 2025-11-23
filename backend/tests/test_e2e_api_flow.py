from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from unittest.mock import patch
from decimal import Decimal
import uuid

from quotes.models import Quote
from shops.models import Shop
from pricing.models import PricingConfig

class EndToEndApiFlowTest(APITestCase):
    # fixtures = ['pricing_config.json', 'shops.json'] # Removed as we create data in setUp

    def setUp(self):
        # Create necessary data if fixtures are not enough
        # Create a Shop
        from django.contrib.gis.geos import Point
        self.shop = Shop.objects.create(
            name="Test Shop",
            location=Point(-97.7431, 30.2672), # Austin, TX
            offers_mobile_service=True,
            max_mobile_radius_miles=50
        )
        
        # Ensure PricingConfig exists
        if not PricingConfig.objects.exists():
            PricingConfig.objects.create(
                standard_labor_rate=Decimal("100.00"),
                markup_multiplier=Decimal("1.50"),
                mobile_fee_tier_1_amount=Decimal("25.00"),
            )

    @patch('vehicles.services.vehicle_service.VehicleService.identify_by_vin')
    @patch('quotes.tasks.generate_quote_task.delay')
    def test_full_quote_flow(self, mock_task_delay, mock_identify_vin):
        # Mock Vehicle Service
        mock_identify_vin.return_value = {
            "vin": "1HGCM82633A004352",
            "year": 2003,
            "make": "Honda",
            "model": "Accord",
            "style": "Sedan 4D",
            "glass_parts": [
                {
                    "type": "WINDSHIELD",
                    "display_name": "Windshield",
                    "manufacturers": [
                        {
                            "code": "FW02345",
                            "name": "Pilkington",
                            "part_number": "FW02345",
                            "list_price": 200.00,
                            "features": ["Rain Sensor"],
                            "complexity": "High"
                        }
                    ]
                }
            ]
        }

        # 1. Identify Vehicle
        identify_url = reverse('identify-vehicle')
        response = self.client.post(identify_url, {"vin": "1HGCM82633A004352"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['vehicle']['make'], 'Honda')

        # 2. Check Serviceability
        check_mobile_url = reverse('check-mobile')
        response = self.client.post(check_mobile_url, {
            "postal_code": "78701",
            "street_address": "123 Main St",
            "city": "Austin",
            "state": "TX"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_serviceable'])

        # 3. Generate Quote
        # Mock the task ID return
        mock_task = patch('quotes.api.views.AsyncResult').start()
        mock_task.return_value.id = 'test-task-id'
        mock_task.return_value.status = 'SUCCESS'
        mock_task.return_value.state = 'SUCCESS'
        # We need to simulate the task actually creating the quote for the status check to work fully
        # But for the generate endpoint, we just check it returns accepted.
        mock_task_delay.return_value.id = 'test-task-id'

        generate_url = reverse('generate-quote')
        quote_data = {
            "vin": "1HGCM82633A004352",
            "glass_type": "WINDSHIELD",
            "manufacturer": "Pilkington",
            "service_type": "mobile",
            "payment_type": "cash",
            "location": {
                "postal_code": "78701",
                "street_address": "123 Main St",
                "city": "Austin",
                "state": "TX"
            },
            "customer": {
                "email": "test@example.com",
                "phone": "555-123-4567",
                "first_name": "John",
                "last_name": "Doe"
            }
        }
        response = self.client.post(generate_url, quote_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        task_id = response.data['task_id']

        # 4. Poll Status (Mocked)
        # We need to manually create the quote that the task WOULD have created
        # so that when we mock the task result, it points to a real quote ID.
        quote = Quote.objects.create(
            customer_id=1, # Mock customer? No, need real one.
            # Let's create customer first
            shop=self.shop,
            vin="1HGCM82633A004352",
            state="pending_validation",
            total_price=Decimal("300.00")
        )
        # Fix customer FK
        from customers.models import Customer
        customer = Customer.objects.create(email="test@example.com", first_name="John", last_name="Doe")
        quote.customer = customer
        quote.save()

        mock_task.return_value.result = {"quote_id": str(quote.id)}
        
        status_url = reverse('quote-status', args=[task_id])
        response = self.client.get(status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')
        quote_id = response.data['quote_id']

        # 5. Preview Quote
        preview_url = reverse('quote-preview', args=[quote_id])
        response = self.client.get(preview_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['id']), quote_id)

        # 6. Approve Quote (Mock Token)
        # Manually set token on quote
        import hashlib
        token = "secure-token-123"
        quote.approval_token_hash = hashlib.sha256(token.encode()).hexdigest()
        quote.send_to_customer() # Transition state
        quote.save()

        approve_url = reverse('quote-approve', args=[quote_id])
        response = self.client.post(approve_url, {"token": token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        quote = Quote.objects.get(id=quote.id)
        self.assertEqual(quote.state, "customer_approved")
