from django.core.management.base import BaseCommand
from vehicles.models import MockVehicleData


class Command(BaseCommand):
    help = "Seeds mock vehicle data"

    def handle(self, *args, **options):
        vehicles = [
            # California
            {
                "license_plate": "7ABC123",
                "state": "CA",
                "vin": "1HGCM82633A000001",
                "year": 2021,
                "make": "Honda",
                "model": "Accord",
                "trim": "EX",
                "glass_parts": {
                    "windshield": {"nags": 450, "pgw": 380},
                    "door_front_left": {"nags": 200},
                },
            },
            {
                "license_plate": "8XYZ789",
                "state": "CA",
                "vin": "1FTEW1CP5EF000002",
                "year": 2014,
                "make": "Ford",
                "model": "F-150",
                "trim": "XLT",
                "glass_parts": {"windshield": {"nags": 520, "pgw": 425}},
            },
            # New York
            {
                "license_plate": "ABC1234",
                "state": "NY",
                "vin": "WBA3A5C54EF000003",
                "year": 2011,
                "make": "BMW",
                "model": "328i",
                "trim": "Base",
                "glass_parts": {"windshield": {"nags": 650, "pgw": 550}},
            },
            # Texas
            {
                "license_plate": "LMN5678",
                "state": "TX",
                "vin": "1C4RJFCG5FC000004",
                "year": 2015,
                "make": "Jeep",
                "model": "Grand Cherokee",
                "trim": "Laredo",
                "glass_parts": {"windshield": {"nags": 490, "pgw": 410}},
            },
            # Colorado
            {
                "license_plate": "ABC123CO",
                "state": "CO",
                "vin": "1N4AL3AP5FC000005",
                "year": 2015,
                "make": "Nissan",
                "model": "Altima",
                "trim": "S",
                "glass_parts": {"windshield": {"nags": 380, "pgw": 320}},
            },
            # Florida
            {
                "license_plate": "DEF456FL",
                "state": "FL",
                "vin": "19XFB2F58EE000006",
                "year": 2015,
                "make": "Honda",
                "model": "Civic",
                "trim": "LX",
                "glass_parts": {"windshield": {"nags": 420, "pgw": 350}},
            },
        ]

        for v in vehicles:
            obj, created = MockVehicleData.objects.get_or_create(
                vin=v["vin"], defaults=v
            )
            if created:
                self.stdout.write(
                    f"Created Vehicle: {v['year']} {v['make']} {v['model']}"
                )
            else:
                self.stdout.write(f"Vehicle exists: {v['vin']}")

        self.stdout.write(self.style.SUCCESS("Successfully seeded mock vehicles"))
