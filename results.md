# AUTOBOLT & NHTSA API Test Results

**Date:** 2025-12-06
**Purpose:** Test VIN decoding through both APIs to understand response patterns

---

## Test Script

```python
import hashlib
import base64
import time
import string
import random
import requests
import json

# Credentials (from .env)
USER_ID = "20f8d962-64ce-4a8b-fc54-08dd6c6795de"
SHARED_SECRET = "<your-shared-secret>"  # AUTOBOLT_API_KEY from .env

def generate_nonce(length=20):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def generate_digest(nonce: str, timestamp: int, shared_secret: str) -> str:
    unhashed = nonce + str(timestamp) + shared_secret
    hash_bytes = hashlib.sha256(unhashed.encode('utf-8')).digest()
    return base64.b64encode(hash_bytes).decode('utf-8')

def generate_auth_header(user_id: str, shared_secret: str) -> str:
    timestamp = int(time.time())
    nonce = generate_nonce()
    digest = generate_digest(nonce, timestamp, shared_secret)
    return f'AutoBoltAuth version="1", timestamp={timestamp}, digest="{digest}", nonce="{nonce}", userid="{user_id}"'

def call_autobolt(vin, kind="Windshield", country="US"):
    """Call AUTOBOLT VIN decode API"""
    auth_header = generate_auth_header(USER_ID, SHARED_SECRET)
    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {"country": country, "vin": vin, "kind": kind}
    response = requests.post("https://api.myautobolt.com/v2/decode", headers=headers, json=payload, timeout=30)
    return response.status_code, response.json() if response.status_code == 200 else None

def call_autobolt_plate(plate_number, state, kind="Windshield", country="US"):
    """Call AUTOBOLT plate decode API"""
    auth_header = generate_auth_header(USER_ID, SHARED_SECRET)
    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "country": country,
        "plate": {"number": plate_number.replace(" ", "").replace("-", ""), "state": state},
        "kind": kind
    }
    response = requests.post("https://api.myautobolt.com/v2/decode-plate", headers=headers, json=payload, timeout=30)
    return response.status_code, response.json() if response.status_code == 200 else None

def call_nhtsa(vin):
    """Call NHTSA VIN decode API (FREE)"""
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
    response = requests.get(url, timeout=30)
    if response.status_code == 200:
        return response.json().get("Results", [{}])[0]
    return None

# Example usage:
# status, data = call_autobolt("5N1AT2MV8GC756869")
# status, data = call_autobolt_plate("ABC1234", "WA")
# nhtsa_data = call_nhtsa("5N1AT2MV8GC756869")
```

---

## Test Results

================================================================================
VIN: 5N1AT2MV8GC756869
================================================================================
NHTSA: 2016 NISSAN Rogue
Body: Crossover Utility Vehicle (CUV), Trim: , Series:
AUTOBOLT: 2016 Nissan Rogue (4 Door Utility)
Parts: 1 primary, 2 total (including interchangeables)
Part 1: FW03898GTYN | Cal: None
Features: Solar Glass, Acoustic Glass

================================================================================
VIN: 2T2BZMCA2HC110684
================================================================================
NHTSA: 2017 LEXUS RX
Body: Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV), Trim: 350, Series: GYL25L/GGL25L/GGL20L/GYL20L
AUTOBOLT: 2017 Lexus RX 350 (4 Door Utility)
Parts: 1 primary, 2 total (including interchangeables)
Part 1: FW04552GBYN | Cal: Static
Features: Solar Glass, Acoustic Glass, Lane Departure Warning System...

================================================================================
VIN: 5FNRL6H43JB507325
================================================================================
NHTSA: 2018 HONDA Odyssey
Body: Minivan, Trim: EX/EX w/ RES, Series:
AUTOBOLT: 2018 Honda Odyssey (Mini Van)
Parts: 1 primary, 1 total (including interchangeables)
Part 1: FW04664GTYN | Cal: Dual: Static + Dynamic
Features: Solar Glass, Lane Departure Warning System, Pre-Collision Warning...

================================================================================
VIN: 5UXJU2C50KLN67479
================================================================================
NHTSA: 2019 BMW X5
Body: Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV), Trim: xDrive50i, Series:
AUTOBOLT: 2019 BMW X5 (4 Door Utility)
Parts: 1 primary, 2 total (including interchangeables)
Part 1: FW05121GTYN | Cal: Dynamic
Features: Solar Glass, Acoustic Glass, Head-up Display...

================================================================================
VIN: 1FMCU9GD8HUB92492
================================================================================
NHTSA: 2017 FORD Escape
Body: Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV), Trim: SE, Series:
AUTOBOLT: 2017 Ford Escape (4 Door Utility)
Parts: 1 primary, 1 total (including interchangeables)
Part 1: DW02216GTNN | Cal: None
Features: Solar Glass, Acoustic Glass, Heated Windshield Wiper Park

================================================================================
VIN: JN1BJ1BWXNW485476
================================================================================
NHTSA: 2022 NISSAN Rogue Sport
Body: Hatchback/Liftback/Notchback, Trim: SV, Series:
AUTOBOLT: 2022 Nissan Rogue Sport (4 Door Utility)
Parts: 1 primary, 1 total (including interchangeables)
Part 1: FW04722GTYN | Cal: Static
Features: Solar Glass, Lane Departure Warning System, Lane Keeping Assist System

================================================================================
VIN: WA1C4AFYXR2134868
================================================================================
NHTSA: 2024 AUDI SQ5
Body: Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV), Trim: quattro Prestige, Series: SUV
AUTOBOLT: 2024 Audi SQ5 (4 Door Utility)
Parts: 1 primary, 1 total (including interchangeables)
Part 1: FW04689GTYN | Cal: Static
Features: Solar Glass, Acoustic Glass, Lane Departure Warning System...

================================================================================
VIN: 5TFJA5DBXNX001827
================================================================================
NHTSA: 2022 TOYOTA Tundra
Body: Pickup, Trim: Limited, Series: 75 Series
AUTOBOLT: 2022 Toyota Tundra (4 Door Crew Cab)
Parts: 2 primary, 5 total (including interchangeables)
Part 1: FW05815GTYN | Cal: Static or Dynamic
Features: Solar Glass, Acoustic Glass, Lane Departure Warning System...
Part 2: FW05809GTYN | Cal: Static or Dynamic
Features: Solar Glass, Acoustic Glass, Lane Departure Warning System...

================================================================================
VIN: 3GCUKSEC2HG373591
================================================================================
NHTSA: 2017 CHEVROLET Silverado
Body: Pickup, Trim: LTZ, Series: 1500
AUTOBOLT: 2017 Chevrolet Silverado 1500 (4 Door Crew Cab)
Parts: 1 primary, 1 total (including interchangeables)
Part 1: DW02041GTYN | Cal: Dynamic
Features: Solar Glass, Lane Departure Warning System, Auto-Dimming Rearview Mirror

================================================================================
VIN: 1C4RJKDT3N8606535
================================================================================
NHTSA: 2022 JEEP Grand Cherokee L
Body: Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV), Trim: Overland, Series:
AUTOBOLT: 2022 Jeep Grand Cherokee L (4 Door Utility)
Parts: 1 primary, 2 total (including interchangeables)
Part 1: DW02749GTYN | Cal: Dynamic
Features: Solar Glass, Acoustic Glass, Pre-Collision Warning...

================================================================================
SUMMARY
================================================================================
VIN Vehicle Parts Needs Selection?

---

5N1AT2MV8GC756869 2016 Nissan Rogue 1 No
2T2BZMCA2HC110684 2017 Lexus RX 350 1 No
5FNRL6H43JB507325 2018 Honda Odyssey 1 No
5UXJU2C50KLN67479 2019 BMW X5 1 No
1FMCU9GD8HUB92492 2017 Ford Escape 1 No
JN1BJ1BWXNW485476 2022 Nissan Rogue Sport 1 No
WA1C4AFYXR2134868 2024 Audi SQ5 1 No
5TFJA5DBXNX001827 2022 Toyota Tundra 2 YES
3GCUKSEC2HG373591 2017 Chevrolet Silverado 1500 1 No
1C4RJKDT3N8606535 2022 Jeep Grand Cherokee L 1 No
