# Auto Glass Quote Generation System - Tester Guide

## Overview

This document describes the complete flow for generating an auto glass quote, including all user-facing steps, backend services, internal/external APIs, and expected behaviors.

---

## Quote Generation Flow (5 Steps)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   STEP 1        │    │   STEP 2        │    │   STEP 3        │    │   STEP 4        │    │   STEP 5        │
│ Service Intent  │───▶│ Location/Shop   │───▶│ Vehicle ID      │───▶│ Glass/Damage    │───▶│ Contact Info    │
│                 │    │                 │    │                 │    │                 │    │                 │
│ • Replacement   │    │ • Postal Code   │    │ • VIN or Plate  │    │ • Glass Type    │    │ • Name          │
│ • Chip Repair   │    │ • Mobile/Store  │    │ • Vehicle       │    │ • Damage Type   │    │ • Email         │
│ • Other         │    │ • Shop Select   │    │   Confirmation  │    │ • Chip Count    │    │ • Phone         │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                     │
                                                     ▼
                                            [AUTOBOLT API Call]
                                            Returns: Parts, Calibration
```

---

## Step 1: Service Intent Selection

**Component:** `ServiceIntentStep.tsx`

**User Choices:**
| Intent | Description | Next Steps |
|--------|-------------|------------|
| `replacement` | Full windshield replacement | Steps 2-5 (full flow) |
| `chip_repair` | Repair chips (1-3 chips) | Steps 2, 4, 5 (skip vehicle lookup) |
| `other` | Other glass (side windows, sunroof) | Steps 2-5 with glass selection |

**No API calls in this step.**

---

## Step 2: Location & Shop Selection

**Component:** `LocationStep.tsx`

### User Input
- Postal code (5 digits)
- Service type: Mobile or In-Store
- Street address (if mobile service)
- Shop selection from list

### API Calls

#### Internal: Get Nearby Shops
```
GET /api/v1/shops/nearby/?postal_code={postal_code}
```

**Response:**
```json
{
  "postal_code": "85701",
  "shops": [
    {
      "id": 13,
      "name": "Tucson Auto Glass",
      "address": "123 Main St",
      "city": "Tucson",
      "state": "AZ",
      "postal_code": "85701",
      "phone": "(520) 555-0100",
      "email": "tucson@example.com",
      "distance_miles": 2.5,
      "offers_mobile_service": true,
      "mobile_fee": 25.00,
      "max_mobile_radius_miles": 30
    }
  ],
  "mobile_available": true,
  "closest_shop_distance": 2.5
}
```

**Backend Service:** `ServiceabilityService.find_nearby_shops()`
- Uses PostGIS for distance calculations
- Geocodes postal code to coordinates

#### External: Google Geocoding API
```
GET https://maps.googleapis.com/maps/api/geocode/json?address={postal_code}&key={GOOGLE_GEOCODING_API_KEY}
```
- Converts postal code to lat/lng coordinates
- Required for distance calculations

---

## Step 3: Vehicle Identification

**Component:** `VehicleStep.tsx`

**Skipped for:** `chip_repair` service intent

### User Input Options
1. **VIN** (17 characters) - preferred
2. **License Plate + State** - will resolve to VIN

### API Calls

#### Internal: Identify Vehicle
```
POST /api/v1/vehicles/identify/
```

**Request (VIN):**
```json
{
  "vin": "1C4RJKDT3N8606535"
}
```

**Request (Plate):**
```json
{
  "license_plate": "ABC1234",
  "state": "AZ"
}
```

**Response (VehicleLookupResult):**
```json
{
  "source": "autobolt",
  "vin": "1C4RJKDT3N8606535",
  "year": 2022,
  "make": "Jeep",
  "model": "Grand Cherokee L",
  "body_style": "4 Door Utility",
  "trim": "Overland",
  "parts": [
    {
      "nags_part_number": "DW02749GTYN",
      "full_part_number": "DW02749GTYN",
      "prefix_cd": "DW",
      "nags_list_price": "375.00",
      "calibration_type": "Dynamic",
      "calibration_required": true,
      "features": ["Solar Glass", "Acoustic Glass", "Pre-Collision Warning"],
      "tube_qty": "2.0",
      "source": "autobolt"
    }
  ],
  "needs_part_selection": false,
  "needs_calibration_review": true,
  "needs_manual_review": false,
  "needs_review": true,
  "confidence": "high",
  "review_reason": "calibration_required"
}
```

**Backend Service:** `VehicleLookupService`

### External APIs Called (in order):

#### 1. AUTOBOLT API (Primary - Paid)
```
GET https://autoboltapi.com/v2/vehicle/{vin}?parts=true
Headers: X-API-Key: {AUTOBOLT_API_KEY}
```
- Returns: Vehicle info + glass parts + calibration data
- Cost: ~$0.25 per lookup
- Cached for 24 hours

#### 2. NHTSA vPIC API (Fallback - Free)
```
GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json
```
- Returns: Basic vehicle info only (no parts)
- Used when AUTOBOLT fails or for enrichment

#### 3. NAGS Database (Local - Read-only)
- Queried for parts pricing
- Contains: Part numbers, list prices, features
- Table: `nags_glass_parts`

### Important Fields from Response

| Field | Purpose |
|-------|---------|
| `parts[].nags_part_number` | Used for pricing lookup |
| `parts[].calibration_type` | Static, Dynamic, Dual, or None |
| `parts[].calibration_required` | Affects pricing (add calibration fee) |
| `needs_part_selection` | True if multiple compatible parts |
| `needs_calibration_review` | True if ADAS calibration needed |

---

## Step 4: Glass Type & Damage Assessment

**Component:** `GlassTypeStep.tsx`

### Flow Varies by Service Intent:

#### Replacement Flow
- Glass type auto-set to `windshield`
- User selects: Damage type (chip/crack/both) + quantity

#### Chip Repair Flow
- User selects: Number of chips (1, 2, or 3)
- Maps to pricing tiers: WR-1, WR-2, WR-3

#### Other Flow
- User selects: Glass type (windshield, driver side, passenger side, back glass)
- User selects: Damage type + quantity

**No API calls in this step.**

---

## Step 5: Contact Information & Submit

**Component:** `ContactStep.tsx`

### User Input
- First name, Last name
- Email address
- Phone number
- SMS consent (optional)

### API Call: Generate Quote

```
POST /api/v1/quotes/generate/
```

**Request Payload:**
```json
{
  "service_intent": "replacement",
  "vin": "1C4RJKDT3N8606535",
  "glass_type": "windshield",
  "damage_type": "crack",
  "nags_part_number": "DW02749GTYN",
  "service_type": "mobile",
  "shop_id": 13,
  "distance_miles": 5.2,
  "location": {
    "postal_code": "85701",
    "street_address": "456 Oak Ave",
    "city": "Tucson",
    "state": "AZ"
  },
  "customer": {
    "email": "customer@email.com",
    "phone": "(520) 555-1234",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Response:**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "processing",
  "message": "Quote generation started."
}
```

**Backend:** Creates Celery async task `generate_quote_task`

---

## Async Quote Generation (Backend)

**Task:** `quotes/tasks.py::generate_quote_task`

### Processing Steps:

```
1. Validate inputs
2. Get shop and pricing profile
3. Create/update customer record
4. Route by service_intent:
   ├── chip_repair → _generate_chip_repair_quote()
   ├── other → _generate_other_glass_quote()
   └── replacement → _generate_replacement_quote()
5. Calculate pricing
6. Create Quote record (state: draft or pending_validation)
7. Create QuoteLineItem records
8. Send confirmation email (optional)
9. Return quote_id
```

### Pricing Calculation

**Service:** `PricingService.calculate_quote()`

#### For Replacement:
```
Part Cost = NAGS List Price × Shop Discount (e.g., 0.70 = 30% off)
Labor = Base Labor × Complexity Multiplier
Calibration = Shop Calibration Rate (if required)
Mobile Fee = Tiered by distance (0-10mi: $25, 10-25mi: $50, 25+mi: $75)
---------------------------------------------------------
Subtotal = Part + Labor + Calibration + Mobile Fee
Tax = Subtotal × Tax Rate (typically 0%)
Total = Subtotal + Tax
```

#### For Chip Repair:
```
WR-1 (1 chip): Shop's chip_repair_wr1 rate (e.g., $59)
WR-2 (2 chips): Shop's chip_repair_wr2 rate (e.g., $99)
WR-3 (3 chips): Shop's chip_repair_wr3 rate (e.g., $129)
+ Mobile Fee (if applicable)
```

### Database Records Created

1. **Customer** - `customers_customer`
2. **Quote** - `quotes_quote` (state: `draft` or `pending_validation`)
3. **QuoteLineItems** - `quotes_quotelineitem` (part, labor, fees)
4. **QuoteStateLog** - `quotes_quotestatelog` (audit trail)

---

## Polling for Status

After submission, frontend polls for completion:

```
GET /api/v1/quotes/status/{task_id}/
```

**Response (Processing):**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "processing",
  "progress": 50,
  "message": "Calculating pricing..."
}
```

**Response (Completed):**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "completed",
  "quote_id": "QT-2024-001234",
  "redirect_url": "/quote/preview/QT-2024-001234"
}
```

**Response (Failed):**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "failed",
  "error": "No parts available for pricing"
}
```

---

## Quote Preview

```
GET /api/v1/quotes/{quote_id}/preview/
```

**Response:**
```json
{
  "id": "QT-2024-001234",
  "service_intent": "replacement",
  "customer": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "customer@email.com",
    "phone": "(520) 555-1234"
  },
  "vehicle": {
    "year": 2022,
    "make": "Jeep",
    "model": "Grand Cherokee L",
    "body_type": "4 Door Utility",
    "trim": "Overland"
  },
  "glass": {
    "type": "windshield",
    "display_name": "Windshield",
    "damage_type": "crack",
    "damage_type_display": "Crack"
  },
  "service": {
    "type": "mobile",
    "location": {
      "postal_code": "85701",
      "street_address": "456 Oak Ave",
      "city": "Tucson",
      "state": "AZ"
    },
    "assigned_shop": {
      "id": 13,
      "name": "Tucson Auto Glass",
      "phone": "(520) 555-0100"
    }
  },
  "pricing": {
    "line_items": [
      { "type": "part", "description": "Windshield - DW02749GTYN", "subtotal": 262.50 },
      { "type": "labor", "description": "Installation Labor", "subtotal": 150.00 },
      { "type": "fee", "description": "ADAS Calibration (Dynamic)", "subtotal": 299.00 },
      { "type": "fee", "description": "Mobile Service Fee", "subtotal": 25.00 }
    ],
    "subtotal": 736.50,
    "tax": 0.00,
    "total": 736.50
  },
  "state": "sent",
  "state_display": "Awaiting Customer Approval",
  "expires_at": "2024-01-15T00:00:00Z",
  "created_at": "2024-01-08T10:30:00Z"
}
```

---

## External API Summary

| API | Purpose | When Called | Cost |
|-----|---------|-------------|------|
| **AUTOBOLT** | Vehicle + parts lookup | Step 3 (VIN/Plate entry) | ~$0.25/lookup |
| **NHTSA vPIC** | Fallback vehicle decode | Step 3 (if AUTOBOLT fails) | Free |
| **Google Geocoding** | Postal code → coordinates | Step 2 (location entry) | ~$0.005/request |

---

## Internal API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/shops/nearby/` | GET | List shops by distance |
| `/api/v1/vehicles/identify/` | POST | Decode VIN/plate, get parts |
| `/api/v1/quotes/generate/` | POST | Start async quote generation |
| `/api/v1/quotes/status/{task_id}/` | GET | Poll task status |
| `/api/v1/quotes/{id}/preview/` | GET | Get quote details |
| `/api/v1/quotes/{id}/approve/` | POST | Customer approves quote |

---

## Key Backend Services

| Service | File | Purpose |
|---------|------|---------|
| `VehicleLookupService` | `vehicles/services/vehicle_lookup.py` | Orchestrates AUTOBOLT/NHTSA/NAGS |
| `ServiceabilityService` | `shops/services/serviceability.py` | Finds shops, calculates distances |
| `PricingService` | `pricing/services/pricing_service.py` | Calculates quote pricing |
| `generate_quote_task` | `quotes/tasks.py` | Celery task for async quote creation |

---

## Quote State Machine

```
draft → pending_validation → sent → customer_approved → scheduled → converted
                           ↘ expired
                           ↘ rejected
```

| State | Description |
|-------|-------------|
| `draft` | Initial state, auto-transitions if no review needed |
| `pending_validation` | Needs CSR review (calibration, multiple parts, low confidence) |
| `sent` | Email sent to customer with approval link |
| `customer_approved` | Customer clicked "Approve" |
| `scheduled` | Appointment scheduled |
| `converted` | Job completed |
| `expired` | Quote expired (default: 7 days) |
| `rejected` | CSR rejected the quote |

---

## Test Scenarios

### Happy Path - Replacement
1. Select "Windshield Replacement"
2. Enter postal code "85701", select mobile, pick a shop
3. Enter VIN "1C4RJKDT3N8606535", confirm vehicle (2022 Jeep Grand Cherokee L)
4. Select damage type "Crack", quantity "1"
5. Enter contact info, submit
6. Verify quote created with correct pricing

### Happy Path - Chip Repair
1. Select "Chip Repair"
2. Enter postal code, select shop
3. (VIN step skipped)
4. Select "2 chips"
5. Enter contact, submit
6. Verify WR-2 pricing applied

### Edge Cases
- VIN with multiple parts (e.g., `5TFJA5DBXNX001827` - 2022 Toyota Tundra has 2 parts)
- VIN not found in AUTOBOLT (falls back to NHTSA)
- Invalid postal code (geocoding fails)
- No shops within service radius

### Test VINs (from AUTOBOLT)

| VIN | Vehicle | Parts | Calibration | Notes |
|-----|---------|-------|-------------|-------|
| `5N1AT2MV8GC756869` | 2016 Nissan Rogue | 1 | None | Simple case |
| `2T2BZMCA2HC110684` | 2017 Lexus RX 350 | 1 | Static | Calibration required |
| `5FNRL6H43JB507325` | 2018 Honda Odyssey | 1 | Dual (Static + Dynamic) | Dual calibration |
| `5UXJU2C50KLN67479` | 2019 BMW X5 | 1 | Dynamic | Head-up display |
| `5TFJA5DBXNX001827` | 2022 Toyota Tundra | 2 | Static/Dynamic | **Multiple parts - needs selection** |
| `1C4RJKDT3N8606535` | 2022 Jeep Grand Cherokee L | 1 | Dynamic | ADAS calibration |

---

## Debugging Tips

### Check Celery Worker Logs
```bash
docker-compose logs -f celery_worker
```

### Check Quote Generation Task
```bash
# In Django shell
from celery.result import AsyncResult
result = AsyncResult('task-id-here')
print(result.status, result.result)
```

### Test Vehicle Lookup Directly
```bash
curl -X POST http://localhost:8000/api/v1/vehicles/identify/ \
  -H "Content-Type: application/json" \
  -d '{"vin": "1C4RJKDT3N8606535"}'
```

### Check Database
```bash
docker-compose exec db psql -U postgres -d autoglass_db

# Recent quotes
SELECT id, state, service_intent, created_at FROM quotes_quote ORDER BY created_at DESC LIMIT 10;

# Quote line items
SELECT * FROM quotes_quotelineitem WHERE quote_id = 'QT-xxx';
```
