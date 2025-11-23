import random
from typing import Dict, Any
from core.exceptions import AutoboltAPIError


class AutoboltClient:
    """
    Stub client for the AUTOBOLT vehicle data API.
    """

    def decode_vin(self, vin: str) -> Dict[str, Any]:
        """
        Simulates decoding a VIN.
        """
        # Simulate API failure randomly (1 in 20 chance)
        if random.random() < 0.05:
            raise AutoboltAPIError("Failed to connect to AUTOBOLT API")

        # Return mock data
        return {
            "vin": vin,
            "year": 2020,
            "make": "Toyota",
            "model": "Camry",
            "trim": "SE",
            "body_style": "Sedan",
            "glass_options": [
                {
                    "type": "windshield",
                    "nags_id": "FW04567",
                    "description": "Green Tint, Rain Sensor",
                }
            ],
        }

    def lookup_plate(self, plate: str, state: str) -> Dict[str, Any]:
        """
        Simulates looking up a vehicle by plate.
        """
        # Simulate API failure
        if random.random() < 0.05:
            raise AutoboltAPIError("Failed to connect to AUTOBOLT API")

        return {
            "license_plate": plate,
            "state": state,
            "vin": "1G1TESTVIN1234567",
            "year": 2018,
            "make": "Honda",
            "model": "Civic",
            "trim": "EX",
            "body_style": "Sedan",
            "glass_options": [
                {
                    "type": "windshield",
                    "nags_id": "FW03890",
                    "description": "Green Tint, Lane Departure",
                }
            ],
        }
