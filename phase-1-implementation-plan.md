# Phase 1 Implementation Plan: Pricing Engine

**Document:** `phase-1-implementation-plan.md`
**Created:** 2025-12-06
**Status:** ✅ COMPLETE

---

## Data Flow & Quote States

### Vehicle Lookup Chain

```
Customer enters VIN/Plate
        │
        ▼
┌───────────────────────┐
│   1. AUTOBOLT API     │ ← Primary source (paid, cached 30 days)
│   - VIN → Parts       │   Returns: Year, Make, Model, NAGS Part#, Calibration, Features
│   - Plate → VIN → Parts│
└───────────┬───────────┘
            │
    ┌───────┴───────┐
    │  Success?     │
    └───────┬───────┘
       YES  │  NO (network error, 429, 500)
            │
            ▼
┌───────────────────────┐
│   2. NHTSA API        │ ← Free fallback
│   - VIN → Year/Make/  │   Returns: Year, Make, Model, Body Style
│     Model only        │   NO parts, NO calibration
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   3. NAGS Database    │ ← Backup parts lookup
│   - Year/Make/Model   │   Returns: NAGS Part#, Price, Features
│     → Glass Parts     │   NO calibration (must be assumed/manual)
└───────────────────────┘
```

### What Each Source Provides

| Field | AUTOBOLT | NHTSA | NAGS DB |
|-------|----------|-------|---------|
| Year | ✅ | ✅ | ✅ (input) |
| Make | ✅ | ✅ | ✅ (input) |
| Model | ✅ | ✅ | ✅ (input) |
| Body Style | ✅ | ✅ | ❌ |
| VIN (from plate) | ✅ | ❌ | ❌ |
| NAGS Part Number | ✅ | ❌ | ✅ |
| List Price | ❌ | ❌ | ✅ |
| Calibration Type | ✅ | ❌ | ❌ |
| ADAS Features | ✅ | ❌ | ❌ |
| Glass Features | ✅ | ✅ (partial) | ✅ |

### Quote States & When CSR Review Required

**State Machine:** `quotes/models.py`

```
draft → pending_validation → sent → customer_approved → scheduled → converted
                          ↘ rejected
        (sent) ↘ expired
```

**Scenarios requiring `pending_validation` (CSR review):**

| Scenario | Source | Flag Set | Why Review Needed |
|----------|--------|----------|-------------------|
| Multiple parts returned | AUTOBOLT | `needs_part_selection=True` | CSR must select correct part (e.g., Toyota Tundra has 2 windshield options) |
| Multiple parts found | NAGS | `needs_part_selection=True` | Same - Year/Make/Model returns multiple glass options |
| No calibration data | NHTSA+NAGS path only | `needs_calibration_review=True` | CSR must determine if ADAS calibration needed (see note below) |
| Part not found | Any | `needs_manual_review=True` | CSR must manually look up or contact customer |
| Missing NAGS list price | NAGS | `needs_manual_review=True` | CSR must verify pricing |

> **⚠️ Important: Calibration Review Logic**
>
> - **AUTOBOLT `calibration_type=None`** → Means NO calibration needed (older vehicles without ADAS). This is a **definitive answer** and does NOT trigger review.
> - **NHTSA+NAGS path with no calibration data** → Means calibration status is **UNKNOWN**. This DOES trigger `needs_calibration_review=True`.
>
> The VehicleLookupService correctly handles this by only setting `needs_calibration_review=True` when using the NHTSA+NAGS fallback path, NOT when AUTOBOLT returns `calibration_type=None`.

**Auto-approved scenarios (skip `pending_validation` → `draft` state):**

| Scenario | Source | Why Auto-OK |
|----------|--------|-------------|
| Single part, with calibration | AUTOBOLT | Complete data, no ambiguity |
| Single part, calibration=None | AUTOBOLT | Complete data - vehicle doesn't need ADAS calibration |
| Cached response (repeat customer) | Cache | Already validated previously |

### Data Flow to Pricing Engine

```python
# What pricing engine NEEDS:
pricing_input = {
    # Vehicle Info (from any source)
    "year": 2016,
    "make": "Nissan",
    "model": "Rogue",

    # Part Info (from AUTOBOLT or NAGS)
    "nags_part_number": "FW03898",      # Required for pricing
    "nags_list_price": Decimal("689.35"), # From NAGS DB
    "prefix_cd": "FW",                   # Foreign Windshield - determines discount tier

    # Calibration (from AUTOBOLT only, or manual)
    "calibration_type": "Static",        # None, Static, Dynamic, Dual
    "calibration_required": True,

    # Features (from AUTOBOLT or NAGS)
    "features": ["Solar Glass", "Acoustic Glass", "Rain Sensor"],
    "tube_qty": 2.0,                     # From NAGS - urethane tubes needed

    # Service Details
    "service_type": "mobile",
    "distance_miles": 12.5,
}
```

### Implementation: VehicleLookupService

```python
class VehicleLookupResult:
    """Result of vehicle/part lookup from any source"""
    source: str  # "autobolt", "nhtsa+nags", "cache"

    # Vehicle
    vin: str
    year: int
    make: str
    model: str
    body_style: str | None

    # Parts (may be multiple!)
    parts: list[GlassPart]

    # Flags for quote state
    needs_part_selection: bool      # len(parts) > 1
    needs_calibration_review: bool  # calibration_type is None from NHTSA path
    confidence: str                 # "high", "medium", "low"

class GlassPart:
    nags_part_number: str           # FW03898
    full_part_number: str | None    # FW03898GTYN (from AUTOBOLT)
    nags_list_price: Decimal | None # From NAGS DB
    prefix_cd: str                  # FW, DW, etc.
    calibration_type: str | None    # None, Static, Dynamic, Dual
    features: list[str]
    tube_qty: Decimal
```

---

## Progress Summary

### Phase 1: Infrastructure ✅ COMPLETE
- [x] AutoboltAPICache model created in `vehicles/models.py`
- [x] Migration created and applied: `vehicles/migrations/0002_autoboltapicache.py`
- [x] NAGS database config added to `core/settings/base.py`
- [x] NAGS router created: `vehicles/routers.py`
- [x] NAGS unmanaged models: `vehicles/nags_models.py`
- [x] Dockerfile updated with MySQL client libs
- [x] `mysqlclient` added to requirements.txt
- [x] AUTOBOLT API tested with 10+ VINs (results in `results.md`)
- [x] NAGS database schema documented in `nags-notes.md`

### Phase 2: Vehicle Lookup Services ✅ COMPLETE
- [x] `vehicles/services/autobolt_client.py` - Real AUTOBOLT client with digest auth
- [x] `vehicles/services/nhtsa_client.py` - NHTSA fallback (free VIN decode)
- [x] `vehicles/services/nags_client.py` - NAGS database queries
- [x] `vehicles/services/vehicle_lookup.py` - Orchestration service
- [x] `vehicles/services/types.py` - `VehicleLookupResult`, `GlassPart` dataclasses
- [x] `vehicles/services/__init__.py` - Clean exports for all services

### Phase 3: Migration from POC ✅ COMPLETE

Old POC code (`vehicle_service.py`) has been replaced with new typed services:

| File | Status | Changes Made |
|------|--------|--------------|
| `vehicles/api/views.py` | ✅ Done | Uses VehicleLookupService |
| `pricing/services/pricing_service.py` | ✅ Done | New PricingService using PricingProfile + GlassPart |
| `quotes/tasks.py` | ✅ Done | Sets quote state based on CSR review flags |
| `vehicles/services/vehicle_service.py` | ✅ Deleted | Removed old POC code |
| `pricing/services/calculator.py` | ✅ Deleted | Replaced by pricing_service.py |

### API Testing Insights (from results.md)
| VIN | Vehicle | Parts | Calibration | Selection? |
|-----|---------|-------|-------------|------------|
| 5N1AT2MV8GC756869 | 2016 Nissan Rogue | 1 | None | No |
| 2T2BZMCA2HC110684 | 2017 Lexus RX 350 | 1 | Static | No |
| 5FNRL6H43JB507325 | 2018 Honda Odyssey | 1 | Dual | No |
| 5UXJU2C50KLN67479 | 2019 BMW X5 | 1 | Dynamic | No |
| 5TFJA5DBXNX001827 | 2022 Toyota Tundra | **2** | Static/Dynamic | **YES** |

**Key Findings:**
- 9/10 VINs return exactly 1 part (direct match)
- Only Toyota Tundra needed selection (2 parts)
- Calibration types vary: None, Static, Dynamic, Dual
- NHTSA → NAGS fallback is VIABLE (tested with 2016 Nissan Rogue)

### Next Steps (Priority Order)

1. ~~Implement real AUTOBOLT client with digest auth~~ ✅
2. ~~Implement NHTSA fallback client~~ ✅
3. ~~Implement NAGS client for Year/Make/Model → Parts lookup~~ ✅
4. ~~Create VehicleLookupService orchestrator~~ ✅
5. ~~Migrate consumers from old VehicleService to new VehicleLookupService~~ ✅
6. ~~Update quote generation to set state based on lookup flags~~ ✅
7. ~~Delete old POC code (`vehicle_service.py`)~~ ✅

**Phase 1 is complete!** Next phases:

- Phase 4: Enhanced Pricing (3-tier display, insurance tier)
- Frontend: Quote wizard implementation

---

## Executive Summary

Build the core quoting/pricing engine with real integrations:

- **AUTOBOLT API** - Plate-to-VIN and VIN-to-Parts lookups (paid, must cache)
- **NAGS MySQL Database** - Part pricing and labor hours (existing, read-only)
- **NHTSA API** - Free VIN decoding fallback
- **3-Tier Pricing** - Insurance ($0), Cash, Installments (Klarna/Afterpay demo)

---

## Database Schema (All Tables)

### New Tables

#### 1. `vehicles_autoboltapicache` (PostgreSQL - App DB)

Caches AUTOBOLT API responses to avoid repeat paid calls.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| request_type | VARCHAR(20) | NOT NULL | 'vin_decode', 'plate_decode', 'part_lookup' |
| request_key | VARCHAR(100) | NOT NULL, INDEX | VIN, plate+state combo, or part number |
| country | VARCHAR(10) | NOT NULL, DEFAULT 'US' | 'US' or 'CA' |
| kind | VARCHAR(20) | NOT NULL, DEFAULT 'Windshield' | 'Windshield' or 'Back' |
| response_data | JSONB | NOT NULL | Full API response |
| http_status | INTEGER | NOT NULL | HTTP status code (200, 204, 422, etc.) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | When cached |
| expires_at | TIMESTAMP | NOT NULL | Cache expiration (created_at + 30 days) |

**Indexes:**
- UNIQUE(request_type, request_key, country, kind)
- INDEX(request_key, request_type)
- INDEX(expires_at)

---

#### 2. NAGS Tables (MySQL - External Read-Only)

These are **unmanaged** Django models mapping to existing NAGS database tables.

##### `nags_parts` (or actual NAGS table name)

| Column | Type | Description |
|--------|------|-------------|
| part_number | VARCHAR(20) | PRIMARY KEY - NAGS part number (e.g., "FW04567") |
| description | TEXT | Part description |
| list_price | DECIMAL(10,2) | NAGS list price |
| labor_hours | DECIMAL(5,2) | Installation labor hours |
| glass_category | VARCHAR(10) | DW, DT, FW, FT, OEM |
| make | VARCHAR(100) | Vehicle make |
| model | VARCHAR(100) | Vehicle model |
| year_from | INTEGER | First year applicable |
| year_to | INTEGER | Last year applicable |

*Note: Actual schema TBD based on NAGS database inspection via `python manage.py inspectdb --database=nags`.*

---

#### 3. AUTOBOLT API Response Schema (Stored in `response_data` JSONB)

**VIN Decode Response (`/v2/decode`):**

```json
{
  "year": 2020,
  "make": "Toyota",
  "model": "Camry",
  "bodyStyle": "Sedan",
  "parts": ["part-uuid-1", "part-uuid-2"],
  "partsById": {
    "part-uuid-1": {
      "kind": "Single",
      "oemPartNumbers": ["FW04567"],
      "amNumber": "FW04567GTY",
      "interchangeables": [],
      "calibrations": [
        {
          "calibrationType": {
            "calibrationTypeId": "uuid",
            "name": "Static"
          },
          "sensor": {
            "sensorId": "uuid",
            "name": "Forward Camera"
          }
        }
      ],
      "features": [
        {
          "featureId": "uuid",
          "name": "Rain Sensor"
        }
      ],
      "photoUrls": ["https://..."]
    }
  }
}
```

**Plate Decode Response (`/v2/decode-plate`):**

Same as VIN decode, plus:

```json
{
  "vin": "1HGBH41JXMN109186",
  // ... rest same as VIN decode
}
```

**Part Lookup Response (`/v2/part/{oemPartNumber}`):**

```json
{
  "parts": ["part-uuid-1"],
  "partsById": {
    // Same structure as above
  }
}
```

---

### Modified Tables

#### 3. `pricing_shoppricingrule` (Add 2 columns)

| New Column | Type | Constraints | Description |
|------------|------|-------------|-------------|
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | Fallback rule when no specific match |
| insurance_provider_id | INTEGER | NULL, FK → pricing_insuranceprovider | If set, rule only applies for this insurer |

**Updated unique_together:** Remove old constraint, add new one that accounts for insurance_provider.

---

### Existing Tables (Reference)

#### `pricing_insuranceprovider`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | Provider name (e.g., "State Farm") |
| code | VARCHAR(50) | UNIQUE code (e.g., "statefarm") |
| uses_custom_pricing | BOOLEAN | Whether provider has custom pricing |
| markup_multiplier | DECIMAL(4,2) | Markup for this provider |
| requires_pre_approval | BOOLEAN | Needs pre-approval |
| average_approval_time_hours | INTEGER | Avg approval time |
| claims_phone | VARCHAR(20) | Claims phone |
| claims_email | VARCHAR(254) | Claims email |
| is_active | BOOLEAN | Active flag |

#### `pricing_shoppricingrule` (Current)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| shop_id | INTEGER | FK → shops_shop |
| manufacturer | VARCHAR(100) | 'nags' or 'pgw' |
| pricing_strategy | VARCHAR(50) | 'percentage_discount', 'fixed_discount', 'fixed_price' |
| discount_percentage | DECIMAL(5,2) | % discount (e.g., 65.00 = 65% off) |
| discount_amount | DECIMAL(8,2) | Fixed $ discount |
| fixed_price | DECIMAL(8,2) | Fixed price override |
| glass_type | VARCHAR(100) | NULL or specific glass type |
| priority | INTEGER | Higher = more priority |
| is_active | BOOLEAN | Active flag |
| valid_from | TIMESTAMP | Start date (NULL = always) |
| valid_until | TIMESTAMP | End date (NULL = never) |
| name | VARCHAR(255) | Rule name |
| description | TEXT | Rule description |

---

## Deployment Context

| Environment | Platform | URL |
|-------------|----------|-----|
| Local | Docker Compose | localhost:8000 / localhost:3333 |
| Test | Dokploy | test-speedy-api.dokr.fyi |
| Production | Dokploy | TBD |

**Secrets Management:**

- **Doppler** - API keys, DB passwords, sensitive values
- **GitLab CI/CD** - Non-sensitive config, feature flags

**Databases:**

- App DB: PostgreSQL (on Dokploy)
- NAGS DB: MySQL (existing, read-only access)

---

## Phase 0: Enhanced Seed Data (Shops & Pricing Rules)

### 0.1 Model Enhancement: ShopPricingRule Changes

Add two new fields to `ShopPricingRule` in `pricing/models.py`:

```python
# Default flag - one rule per shop/manufacturer combo can be default
is_default = models.BooleanField(
    default=False,
    help_text="Default rule used when no specific rule matches"
)

# Link to insurer (overrides default when customer selects this insurer)
insurance_provider = models.ForeignKey(
    'InsuranceProvider',
    on_delete=models.CASCADE,
    null=True,
    blank=True,
    related_name='pricing_rules',
    help_text="If set, rule only applies for this insurer"
)
```

### 0.2 Pricing Rules Per Shop (4-5 per shop)

Each shop gets these rule types:

| Rule Type | is_default | insurance_provider | glass_type | Example Discount |
|-----------|------------|-------------------|------------|------------------|
| Base NAGS | Yes | null | null | 65% off list |
| Base PGW | Yes | null | null | 55% off list |
| Windshield | No | null | windshield | 70% off list |
| State Farm | No | State Farm | null | 60% off list |
| Winter Promo | No | null | null | 72% off list (Dec-Feb) |

### 0.3 Pricing Rule Selection Logic

```
Priority Order:
1. Insurance provider rule (OVERRIDES everything when insurer selected)
2. Glass-type specific rule
3. Seasonal rule (date-bounded, currently active)
4. Default rule (is_default=True fallback)
```

**Selection Examples:**

- Cash + Windshield → Windshield Special (70%)
- Insurance: State Farm + Windshield → **State Farm rule overrides** (60%)
- Cash + Back Glass in January → Winter Promo (72%)
- Cash + Back Glass in March → Base NAGS default (65%)

---

## Phase 1: AUTOBOLT API Cache Model

### 1.1 Create `vehicles/models.py` - AutoboltAPICache

```python
class AutoboltAPICache(models.Model):
    """Cache for AUTOBOLT API responses to avoid repeat paid calls."""

    request_type = models.CharField(max_length=20)  # 'vin_decode', 'plate_decode', 'part_lookup'
    request_key = models.CharField(max_length=100, db_index=True)  # VIN, plate+state, or part number
    country = models.CharField(max_length=10, default='US')
    kind = models.CharField(max_length=20, default='Windshield')  # Windshield, Back

    response_data = models.JSONField()
    http_status = models.IntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Cache TTL (30 days)

    class Meta:
        unique_together = ['request_type', 'request_key', 'country', 'kind']
```

---

## Phase 2: AUTOBOLT API Client

### 2.1 Authentication (from autobolt.md)

```
Header: AutoBoltAuth version="1", timestamp=..., digest=..., nonce=..., userid=...
Digest: base64(sha256(nonce + timestamp + sharedSecret))
Nonce: Random 10-30 alphanumeric chars (unique per request)
```

### 2.2 Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/decode` | POST | VIN → Parts |
| `/v2/decode-plate` | POST | Plate → VIN + Parts |
| `/v2/part/{oemPartNumber}` | GET | Part lookup |

### 2.3 Cache Strategy

1. Check cache before API call
2. On cache hit + not expired → return cached data
3. On cache miss → call API → store in cache with 30-day TTL
4. Handle: 204 (no result), 422 (bad VIN), 429 (rate limit), 401 (auth error)

---

## Phase 3: NAGS MySQL Database Connection

### 3.1 Django Multi-Database Config

```python
# settings/base.py
DATABASES = {
    'default': { ... },  # PostgreSQL for app data
    'nags': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('NAGS_DB_NAME'),
        'USER': os.environ.get('NAGS_DB_USER'),
        'PASSWORD': os.environ.get('NAGS_DB_PASSWORD'),
        'HOST': os.environ.get('NAGS_DB_HOST'),
        'PORT': os.environ.get('NAGS_DB_PORT', '3306'),
    }
}

DATABASE_ROUTERS = ['vehicles.routers.NAGSRouter']
```

### 3.2 Database Router (Read-Only)

```python
# vehicles/routers.py
class NAGSRouter:
    """Route NAGS model queries to nags database (read-only)."""

    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'vehicles' and hasattr(model, '_nags_model'):
            return 'nags'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'vehicles' and hasattr(model, '_nags_model'):
            return None  # Disallow writes
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db == 'nags':
            return False  # Never migrate NAGS
        return None
```

### 3.3 Unmanaged NAGS Models

```python
# vehicles/nags_models.py
class NAGSPart(models.Model):
    """Read-only NAGS part data."""
    _nags_model = True  # Flag for router

    part_number = models.CharField(primary_key=True)
    description = models.TextField()
    list_price = models.DecimalField(max_digits=10, decimal_places=2)
    labor_hours = models.DecimalField(max_digits=5, decimal_places=2)
    glass_category = models.CharField(max_length=10)  # DW, DT, FW, FT

    class Meta:
        managed = False
        db_table = 'nags_parts'  # Actual table name from NAGS schema
```

---

## Phase 4: NHTSA Fallback Client

### 4.1 Free VIN Decoding API

```
Endpoint: https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json
Returns: Year, Make, Model, Body Style (no parts data)
Use Case: Fallback when AUTOBOLT fails or for basic vehicle info
```

---

## Phase 5: Enhanced Pricing Calculator

### 5.1 List-Less Pricing Formula

```
Part Cost = NAGS List Price × (1 - Category Discount) × Shop Markup
Labor = NAGS Labor Hours × Shop Labor Rate
Total = Part Cost + Labor + Fees
```

### 5.2 Glass Categories & Discounts

| Category | Description | Typical Discount |
|----------|-------------|------------------|
| DW | Domestic Windshield | 70% off list |
| DT | Domestic Tempered | 65% off list |
| FW | Foreign Windshield | 60% off list |
| FT | Foreign Tempered | 55% off list |
| OEM | Original Equipment | 0-20% off list |

### 5.3 3-Tier Pricing Output

```python
def calculate_quote(...) -> dict:
    return {
        'vehicle': {...},
        'glass': {...},
        'pricing_tiers': {
            'insurance': {
                'customer_pays': Decimal('0.00'),
                'deductible': Decimal('0.00'),
                'insurance_pays': total,
                'label': 'Insurance Claim',
                'description': '$0 out of pocket'
            },
            'cash': {
                'customer_pays': total,
                'discount_percent': 5,
                'label': 'Pay in Full',
                'description': 'Save 5%'
            },
            'installments': {
                'provider': 'klarna',
                'customer_pays': total,
                'installment_count': 4,
                'installment_amount': total / 4,
                'label': 'Pay in 4',
                'description': '4 interest-free payments'
            }
        },
        'line_items': [...],
        'calibration_required': True/False,
        'adas_info': {...}
    }
```

---

## Phase 6: Vehicle Service Enhancement

### 6.1 Lookup Chain

```
1. Check AUTOBOLT cache → return if found and not expired
2. Call AUTOBOLT API → cache response, return
3. On AUTOBOLT failure → fall back to NHTSA (basic info only)
```

### 6.2 Plate Lookup Flow

```
1. AUTOBOLT /decode-plate → returns VIN + parts
2. Cache both plate→VIN mapping and VIN→parts data
```

---

## Phase 7: Frontend Updates

### 7.1 3-Tier Pricing Display

Show 3 pricing tiers as cards:

- **Insurance**: Green checkmark, "$0 out of pocket"
- **Cash**: Blue, show total with "Save 5%" badge
- **Klarna/Afterpay**: Purple, show "4 payments of $X"

### 7.2 Provider Logos

```
/frontend/public/images/
  klarna-logo.svg
  afterpay-logo.svg
```

---

## Environment Variables

### Doppler (Secrets)

```env
# API Keys
AUTOBOLT_USER_ID=<uuid>
AUTOBOLT_SHARED_SECRET=<secret>

# Database Passwords
SECRET_KEY=<django-secret>
DB_PASSWORD=<postgres-password>
NAGS_DB_PASSWORD=<mysql-password>
```

### GitLab CI/CD (Config)

```env
# URLs
TEST_API_URL=https://test-speedy-api.dokr.fyi
TEST_FRONTEND_URL=https://test-speedy.dokr.fyi

# Database Hosts
DB_HOST=postgres.dokr.fyi
NAGS_DB_HOST=mysql.dokr.fyi

# Feature Flags
AUTOBOLT_CACHE_TTL_DAYS=30
```

---

## Docker Setup (Dokploy)

### Services

| Service | Image | Command |
|---------|-------|---------|
| speedy-api | backend:latest | gunicorn core.wsgi:application --bind 0.0.0.0:8000 |
| speedy-worker | backend:latest | celery -A core worker -l info |
| speedy-beat | backend:latest | celery -A core beat -l info |
| speedy-frontend | frontend:latest | nginx (static) |

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# MySQL client for NAGS + PostgreSQL client
RUN apt-get update && apt-get install -y \
    libpq-dev gcc libmariadb-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## Implementation Order (Updated)

### ✅ Phase 1: Infrastructure - COMPLETE

- [x] **AutoboltAPICache model** - Created with helper methods
- [x] **NAGS database** - Config, router, unmanaged models
- [x] **Dockerfile** - MySQL client libs added
- [x] **Migration applied** - AutoboltAPICache table created
- [x] **NAGS schema documented** - `nags-notes.md` with key findings

### ✅ Phase 2: Vehicle Lookup Services - COMPLETE

- [x] **AUTOBOLT Client** (`vehicles/services/autobolt_client.py`)
  - Real digest auth implementation
  - Uses AutoboltAPICache for 30-day caching
  - Returns `VehicleLookupResult` with parts list

- [x] **NHTSA Client** (`vehicles/services/nhtsa_client.py`)
  - Free VIN decode (Year/Make/Model only)
  - Simple GET request, no auth needed
  - Fallback when AUTOBOLT fails

- [x] **NAGS Client** (`vehicles/services/nags_client.py`)
  - Query MySQL for parts by Year/Make/Model
  - Get pricing by NAGS part number
  - Enrich AUTOBOLT parts with NAGS pricing

- [x] **VehicleLookupService** (`vehicles/services/vehicle_lookup.py`)
  - Orchestrates all three sources
  - Sets `needs_part_selection` and `needs_calibration_review` flags
  - Returns unified `VehicleLookupResult`

- [x] **Type Definitions** (`vehicles/services/types.py`)
  - `GlassPart` dataclass with pricing and calibration info
  - `VehicleLookupResult` dataclass with CSR review flags

### ✅ Phase 3: Migration from POC - COMPLETE

All old POC code has been replaced with new typed services:

- ✅ `vehicles/api/views.py` - Uses `VehicleLookupService`
- ✅ `pricing/services/pricing_service.py` - New `PricingService` using `PricingProfile` + `GlassPart`
- ✅ `quotes/tasks.py` - Sets quote state based on CSR review flags (`needs_review` → `pending_validation`)
- ✅ Deleted `vehicles/services/vehicle_service.py`
- ✅ Deleted `pricing/services/calculator.py`

### ⏳ Phase 4: Enhanced Pricing - PENDING

- **3-tier pricing display** - Insurance ($0), Cash (quote), Installments (Klarna/Afterpay)
- **Frontend** - Quote wizard implementation

---

## Files Summary

### ✅ Created - Infrastructure

| File | Purpose |
|------|---------|
| `vehicles/models.py` | AutoboltAPICache model with helper methods |
| `vehicles/routers.py` | NAGS database router (read-only routing) |
| `vehicles/nags_models.py` | Unmanaged NAGS models |
| `core/settings/base.py` | NAGS database config + DATABASE_ROUTERS |
| `backend/Dockerfile` | MySQL client libs added |
| `backend/requirements.txt` | `mysqlclient` added |
| `results.md` | API test script and results |
| `nags-notes.md` | NAGS database schema + key findings |

### ✅ Created - Vehicle Lookup Services

| File | Purpose |
|------|---------|
| `vehicles/services/autobolt_client.py` | Real AUTOBOLT client with digest auth |
| `vehicles/services/nhtsa_client.py` | NHTSA fallback (free VIN decode) |
| `vehicles/services/nags_client.py` | NAGS database queries |
| `vehicles/services/vehicle_lookup.py` | Orchestration service |
| `vehicles/services/types.py` | `VehicleLookupResult`, `GlassPart` dataclasses |
| `vehicles/services/__init__.py` | Clean exports for all services |

### ✅ Modified - Migration COMPLETE

| File | Changes Made |
|------|--------------|
| `vehicles/api/views.py` | Uses `VehicleLookupService` |
| `pricing/services/pricing_service.py` | New file - uses `PricingProfile` + `GlassPart` |
| `quotes/tasks.py` | Sets quote state based on CSR review flags |

### ✅ Deleted

| File | Reason |
|------|--------|
| `vehicles/services/vehicle_service.py` | Old POC code - replaced by VehicleLookupService |
| `pricing/services/calculator.py` | Old POC code - replaced by pricing_service.py |

### ⏳ To Modify (Phase 4 - Later)

| File | Changes |
|------|---------|
| `pricing/services/pricing_service.py` | 3-tier pricing output (Insurance/Cash/Installments) |
| `frontend/src/pages/NewQuote/QuoteSummary.tsx` | 3-tier display |

---

## Testing Strategy

1. **Unit tests** - AUTOBOLT auth header generation
2. **Integration tests** - Cache hit/miss scenarios
3. **Mock NAGS data** - For development (can populate a test MySQL)
4. **E2E test** - Full quote flow with real APIs
