# Sprint 1: Foundation & Core Infrastructure

**Duration:** Week 1 (5-7 days)
**Goal:** Set up Django project, Docker infrastructure, database models, and mock data
**Success Criteria:** Backend server running, database seeded, admin panel accessible

---

## Phase 1.1: Project Initialization

### Django Project Setup
- [ ] Initialize Django project `autoglass_quote_api`
- [ ] Create Django apps:
  - [ ] `core` (settings, celery config, shared utilities)
  - [ ] `customers` (customer data)
  - [ ] `vehicles` (vehicle identification, mock data)
  - [ ] `quotes` (core quote lifecycle)
  - [ ] `pricing` (pricing rules, fee configs, AUTOBOLT client stub)
  - [ ] `shops` (shop network, service areas)
  - [ ] `support_dashboard` (support agent tools)
  - [ ] `webhooks` (VAPI, SendGrid integrations - Phase 2)
- [ ] Configure project structure:
  ```
  autoglass_quote_api/
  ├── core/
  │   ├── settings/
  │   │   ├── base.py
  │   │   ├── dev.py
  │   │   └── prod.py
  │   ├── celery.py
  │   └── urls.py
  ├── customers/
  ├── vehicles/
  ├── quotes/
  ├── pricing/
  ├── shops/
  ├── support_dashboard/
  ├── webhooks/
  ├── manage.py
  └── requirements.txt
  ```
- [ ] Create `.env.example` with all required variables
- [ ] Create `.gitignore` (exclude .env, __pycache__, *.pyc, db.sqlite3, etc.)
- [ ] Initialize git repository
- [ ] Create initial commit

### Dependencies Installation
- [ ] Create `requirements.txt` with:
  ```
  Django==5.1
  djangorestframework==3.15.2
  djangorestframework-simplejwt==5.3.1
  django-environ==0.11.2
  django-cors-headers==4.3.1
  django-fsm==3.0.0
  drf-spectacular==0.27.2
  psycopg2-binary==2.9.9
  redis==5.0.4
  celery==5.4.0
  pillow==10.3.0
  requests==2.32.0
  ```
- [ ] Create `requirements-dev.txt` with additional dev tools:
  ```
  pytest==8.2.0
  pytest-django==4.8.0
  pytest-cov==5.0.0
  black==24.4.2
  flake8==7.0.0
  ipython==8.24.0
  ```

---

## Phase 1.2: Docker Infrastructure

### Docker Configuration
- [ ] Create `Dockerfile` for Django backend
  ```dockerfile
  FROM python:3.11-slim
  ENV PYTHONUNBUFFERED=1
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  EXPOSE 8000
  CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]
  ```
- [ ] Create `docker-compose.yml` with services:
  - [ ] PostgreSQL 16 (port 5432)
  - [ ] Redis 7 (port 6379)
  - [ ] Django backend (port 8000)
  - [ ] Celery worker
  - [ ] Celery beat (cron scheduler)
  - [ ] Mailhog (SMTP: 1025, Web UI: 8025)
- [ ] Create `docker-compose.dev.yml` override for development
- [ ] Add health checks for all services
- [ ] Configure volume mounts for local development
- [ ] Test: `docker-compose up -d` starts all services

### Environment Configuration
- [ ] Create `.env` file (local only, not committed):
  ```
  # Django
  DEBUG=True
  SECRET_KEY=your-secret-key-here
  ALLOWED_HOSTS=localhost,127.0.0.1

  # Database
  DB_NAME=autoglass_db
  DB_USER=postgres
  DB_PASSWORD=postgres
  DB_HOST=db
  DB_PORT=5432

  # Redis
  REDIS_URL=redis://redis:6379/0

  # Email (Mailhog for dev)
  EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
  EMAIL_HOST=mailhog
  EMAIL_PORT=1025

  # AUTOBOLT (mock mode for now)
  USE_MOCK_VEHICLE_DATA=True
  AUTOBOLT_API_KEY=
  AUTOBOLT_API_URL=
  ```
- [ ] Configure Django settings to use environment variables
- [ ] Test: Environment variables loaded correctly

---

## Phase 1.3: Database Models

### Core Models Setup
- [ ] Install PostGIS extension in PostgreSQL container
- [ ] Configure Django to use PostGIS (GDAL, GEOS)

### customers/models.py
- [ ] Create `Customer` model:
  - [ ] email (unique, indexed)
  - [ ] phone (E.164 format)
  - [ ] first_name, last_name
  - [ ] street_address, street_address_2, city, state, postal_code
  - [ ] location (PointField for geolocation)
  - [ ] sms_opt_in, email_opt_in
  - [ ] total_jobs, total_spent (analytics)
  - [ ] created_at, updated_at
  - [ ] Method: `has_complete_address()`
  - [ ] Method: `get_full_name()`
- [ ] Add indexes: email, postal_code

### shops/models.py
- [ ] Create `Shop` model:
  - [ ] name, street_address, city, state, postal_code
  - [ ] phone, email
  - [ ] location (PointField, required)
  - [ ] offers_mobile_service, max_mobile_radius_miles
  - [ ] business_hours (JSONField)
  - [ ] is_accepting_jobs, is_active
  - [ ] created_at
  - [ ] Method: `get_full_address()`
- [ ] Create `ServiceArea` model:
  - [ ] ForeignKey to Shop
  - [ ] postal_code (indexed)
  - [ ] is_active
- [ ] Add indexes: postal_code, shop + postal_code

### vehicles/models.py
- [ ] Create `MockVehicleData` model:
  - [ ] license_plate (unique, indexed)
  - [ ] state (2-char state code)
  - [ ] vin (unique, indexed)
  - [ ] year, make, model, trim, body_style
  - [ ] glass_parts (JSONField - NAGS + PGW data)
  - [ ] is_active, created_at, notes
  - [ ] Method: `get_glass_options()`
- [ ] Add indexes: license_plate + state, vin
- [ ] Add validation: VIN checksum validation

### pricing/models.py
- [ ] Create `PricingConfig` model (singleton):
  - [ ] standard_labor_rate, complex_labor_rate
  - [ ] environmental_fee, disposal_fee
  - [ ] markup_multiplier
  - [ ] mobile_fee_tier_1_distance, mobile_fee_tier_1_amount
  - [ ] mobile_fee_tier_2_distance, mobile_fee_tier_2_amount
  - [ ] mobile_fee_tier_3_amount
  - [ ] max_mobile_service_distance
  - [ ] quote_expiration_days
  - [ ] Class method: `get_instance()`
  - [ ] Method: `calculate_mobile_fee(distance_miles)`
- [ ] Create `InsuranceProvider` model:
  - [ ] name, code (unique)
  - [ ] uses_custom_pricing, markup_multiplier
  - [ ] requires_pre_approval, average_approval_time_hours
  - [ ] claims_phone, claims_email
  - [ ] is_active
- [ ] Create `ShopPricingRule` model:
  - [ ] ForeignKey to Shop
  - [ ] manufacturer (nags, pgw, etc.)
  - [ ] pricing_strategy (percentage_discount, fixed_discount, etc.)
  - [ ] discount_percentage, discount_amount, fixed_price
  - [ ] glass_type (optional filter)
  - [ ] priority, is_active
  - [ ] valid_from, valid_until
  - [ ] name, description
  - [ ] Method: `calculate_price(list_price)`
  - [ ] Method: `is_valid_now()`
- [ ] Add unique constraint: shop + manufacturer + glass_type + strategy

### quotes/models.py
- [ ] Create `Quote` model:
  - [ ] id (UUIDField, primary key)
  - [ ] vin, vehicle_info (JSONField)
  - [ ] ForeignKey to Customer (PROTECT)
  - [ ] ForeignKey to Shop (PROTECT)
  - [ ] postal_code (indexed)
  - [ ] glass_type (choices: windshield, door_*, back_glass, vent_*)
  - [ ] service_type (choices: mobile, in_store)
  - [ ] service_address (JSONField)
  - [ ] distance_from_shop_miles
  - [ ] payment_type (choices: cash, insurance)
  - [ ] ForeignKey to InsuranceProvider (nullable)
  - [ ] insurance_claim_number, insurance_deductible
  - [ ] pricing_details (JSONField - extensible)
  - [ ] part_cost, labor_cost, fees (JSONField), total_price
  - [ ] state (FSMField with choices)
  - [ ] created_at, expires_at, updated_at
  - [ ] source (website, vapi)
  - [ ] task_id (Celery task tracking)
  - [ ] Method: `clean()` - validate insurance, mobile service requirements
- [ ] Add indexes: state + created_at, payment_type + state, insurance_provider + state, postal_code + service_type
- [ ] Create `QuoteLineItem` model (for custom charges):
  - [ ] ForeignKey to Quote (CASCADE)
  - [ ] type (part, labor, fee, custom)
  - [ ] description
  - [ ] unit_price, quantity, subtotal
  - [ ] metadata (JSONField)
- [ ] Create `QuoteStateLog` model (audit trail):
  - [ ] ForeignKey to Quote (CASCADE)
  - [ ] from_state, to_state
  - [ ] ForeignKey to User (nullable, SET_NULL)
  - [ ] timestamp, notes

### Run Migrations
- [ ] Create initial migrations: `python manage.py makemigrations`
- [ ] Apply migrations: `python manage.py migrate`
- [ ] Verify: All tables created in PostgreSQL
- [ ] Verify: PostGIS extension enabled

---

## Phase 1.4: Authentication & User Management

### Django User Setup
- [ ] Configure Django auth settings
- [ ] Create custom user manager (if extending User model)
- [ ] Create user groups:
  - [ ] Customer (view own quotes)
  - [ ] Support Agent (view/modify all quotes)
  - [ ] Admin (full access)

### Create Management Command: create_user_groups
- [ ] File: `core/management/commands/create_user_groups.py`
- [ ] Create groups with appropriate permissions
- [ ] Assign permissions to Quote, Customer, Shop models
- [ ] Test: `python manage.py create_user_groups`

### DRF Authentication Configuration
- [ ] Install `djangorestframework-simplejwt`
- [ ] Configure REST_FRAMEWORK settings:
  - [ ] SessionAuthentication (for browsable API)
  - [ ] JWTAuthentication (for React)
- [ ] Add JWT settings (token lifetime, refresh)
- [ ] Create authentication URLs:
  - [ ] /api/auth/login/ (obtain token)
  - [ ] /api/auth/refresh/ (refresh token)
  - [ ] /api/auth/logout/

### Create Initial Users (via management command)
- [ ] File: `core/management/commands/create_test_users.py`
- [ ] Create admin user (username: admin, password: admin123)
- [ ] Create support user (username: support1, password: support123)
- [ ] Create customer user (username: customer1, password: customer123)
- [ ] Test: Login to Django admin at /admin/

---

## Phase 1.5: Mock Data Seeding

### Create Management Command: seed_data
- [ ] File: `core/management/commands/seed_data.py`
- [ ] Make command idempotent (can run multiple times)
- [ ] Seed in order (due to dependencies):

#### 1. Seed PricingConfig
- [ ] Create singleton PricingConfig:
  - [ ] standard_labor_rate: $150
  - [ ] complex_labor_rate: $200
  - [ ] environmental_fee: $5
  - [ ] disposal_fee: $10
  - [ ] markup_multiplier: 1.3 (30% markup)
  - [ ] Mobile fees: Tier 1 (0-15mi: $25), Tier 2 (15-30mi: $50), Tier 3 (30+mi: $75)
  - [ ] max_mobile_service_distance: 50 miles
  - [ ] quote_expiration_days: 7

#### 2. Seed Insurance Providers
- [ ] Create 5 providers:
  - [ ] State Farm (code: statefarm, no custom pricing)
  - [ ] Geico (code: geico, custom pricing: 1.25x)
  - [ ] Progressive (code: progressive)
  - [ ] Allstate (code: allstate)
  - [ ] USAA (code: usaa, best rate: 1.20x)

#### 3. Seed Shops
- [ ] Create 5 shops with PostGIS coordinates:
  - [ ] Bay Area Auto Glass (San Francisco, CA) - Point(-122.3965, 37.7910)
  - [ ] NYC Glass Repair (New York, NY) - Point(-73.9857, 40.7484)
  - [ ] Austin Glass Pro (Austin, TX) - Point(-97.7431, 30.2672)
  - [ ] Denver Auto Glass (Denver, CO) - Point(-104.9903, 39.7392)
  - [ ] Miami Glass Services (Miami, FL) - Point(-80.1918, 25.7617)
- [ ] Set business hours for each shop
- [ ] Set offers_mobile_service=True, max_mobile_radius_miles=50

#### 4. Seed Service Areas
- [ ] Bay Area: 94102, 94103, 94104, 94105, 941*, 940*
- [ ] NYC: 10001-10100 (use prefix matching)
- [ ] Austin: 78701, 78702, 787*
- [ ] Denver: 80202, 80203, 802*
- [ ] Miami: 33101, 33102, 331*

#### 5. Seed Shop Pricing Rules
- [ ] Bay Area: NAGS -25%, PGW -30%, Windshield NAGS -28% (higher priority)
- [ ] NYC: NAGS -20%, PGW -25%
- [ ] Austin: NAGS -30%, PGW -35% (most competitive)
- [ ] Denver: NAGS -22%, PGW -28%
- [ ] Miami: NAGS -18%, PGW -22% (premium market)

### Create Management Command: seed_mock_vehicles
- [ ] File: `vehicles/management/commands/seed_mock_vehicles.py`
- [ ] Create 30-40 mock vehicles with realistic data:

#### California Vehicles (10 vehicles)
- [ ] 2021 Honda Accord (7ABC123-CA) - Windshield NAGS $450, PGW $380
- [ ] 2014 Ford F-150 (8XYZ789-CA) - Windshield NAGS $520, PGW $425
- [ ] 2017 Tesla Model S (5MNO456-CA) - Windshield NAGS $850, PGW $720
- [ ] 2012 VW Passat (3GHI789-CA)
- [ ] 2018 Toyota Camry
- [ ] 2020 Nissan Rogue
- [ ] 2016 Chevrolet Silverado
- [ ] 2019 Subaru Outback
- [ ] 2015 Mercedes-Benz C-Class
- [ ] 2021 Hyundai Sonata

#### New York Vehicles (8 vehicles)
- [ ] 2011 BMW 328i (ABC1234-NY) - Windshield NAGS $650, PGW $550
- [ ] 2010 Mazda3 (XYZ9876-NY) - Windshield NAGS $280, PGW $240
- [ ] 2018 Audi A4
- [ ] 2017 Lexus RX350
- [ ] 2014 Jeep Cherokee
- [ ] 2019 Ford Escape
- [ ] 2016 Honda CR-V
- [ ] 2020 Kia Sportage

#### Texas Vehicles (6 vehicles)
- [ ] 2015 Jeep Grand Cherokee (LMN5678-TX) - Windshield NAGS $490, PGW $410
- [ ] 2010 Chevy Suburban (PQR2345-TX) - Windshield NAGS $550, PGW $475
- [ ] 2019 RAM 1500
- [ ] 2017 GMC Sierra
- [ ] 2020 Toyota Tacoma
- [ ] 2018 Ford Mustang

#### Colorado Vehicles (4 vehicles)
- [ ] 2015 Nissan Altima (ABC123-CO) - Windshield NAGS $380, PGW $320
- [ ] 2019 Subaru Forester
- [ ] 2016 Chevrolet Malibu
- [ ] 2020 Mazda CX-5

#### Florida Vehicles (4 vehicles)
- [ ] 2015 Honda Civic (DEF456-FL) - Windshield NAGS $420, PGW $350
- [ ] 2018 Hyundai Elantra
- [ ] 2017 Kia Optima
- [ ] 2019 Toyota Corolla

- [ ] Each vehicle should have:
  - [ ] NAGS and PGW data for: windshield, door_front_left, door_front_right, back_glass
  - [ ] Realistic features (heated, rain_sensor, camera_mount, acoustic, etc.)
  - [ ] Complexity (standard or complex)
  - [ ] List prices varying from $200-$850

### Test Seed Data
- [ ] Run: `python manage.py seed_data`
- [ ] Run: `python manage.py seed_mock_vehicles`
- [ ] Verify in Django admin:
  - [ ] 1 PricingConfig
  - [ ] 5 Insurance Providers
  - [ ] 5 Shops
  - [ ] ~30 Service Areas
  - [ ] 10 Shop Pricing Rules
  - [ ] 30-40 Mock Vehicles
- [ ] Test vehicle lookup: Query `MockVehicleData.objects.get(license_plate='7ABC123', state='CA')`

---

## Phase 1.6: Django Admin Configuration

### Register Models in Admin
- [ ] customers/admin.py - Register Customer with search/filters
- [ ] shops/admin.py - Register Shop, ServiceArea with inline editing
- [ ] vehicles/admin.py - Register MockVehicleData with JSON viewer
- [ ] pricing/admin.py:
  - [ ] Register PricingConfig (singleton editor)
  - [ ] Register InsuranceProvider
  - [ ] Register ShopPricingRule with filters
- [ ] quotes/admin.py:
  - [ ] Register Quote with read-only fields, state filters
  - [ ] Register QuoteStateLog (read-only)
  - [ ] Inline QuoteLineItem editor

### Customize Admin Interface
- [ ] Set admin site header: "Auto Glass Quote Admin"
- [ ] Create custom admin actions:
  - [ ] Bulk expire quotes
  - [ ] Export quotes to CSV
- [ ] Add search fields for Customer (email, phone)
- [ ] Add filters for Quote (state, payment_type, service_type, created_at)

### Test Admin Panel
- [ ] Login: http://localhost:8000/admin/
- [ ] Verify all models visible
- [ ] Test CRUD operations
- [ ] Test search and filters

---

## Phase 1.7: Basic API Setup

### Install & Configure DRF
- [ ] Add `rest_framework` to INSTALLED_APPS
- [ ] Configure REST_FRAMEWORK settings:
  - [ ] Default renderer classes
  - [ ] Default parser classes
  - [ ] Default authentication classes
  - [ ] Default permission classes
  - [ ] Pagination (PageNumberPagination, page_size=50)
  - [ ] Exception handler
  - [ ] Throttling (AnonRateThrottle: 100/hour)

### Install & Configure drf-spectacular (API Docs)
- [ ] Add `drf_spectacular` to INSTALLED_APPS
- [ ] Configure SPECTACULAR_SETTINGS:
  - [ ] Title: "Auto Glass Quote API"
  - [ ] Version: "1.0.0"
  - [ ] Description
- [ ] Add schema URLs:
  - [ ] /api/schema/ (OpenAPI JSON)
  - [ ] /api/docs/ (Swagger UI)
  - [ ] /api/redoc/ (ReDoc UI)
- [ ] Test: Visit http://localhost:8000/api/docs/

### Create Base Serializers
- [ ] core/serializers.py - Create base serializers with common fields
- [ ] Create error response serializer (consistent error format)

### Create Health Check Endpoint
- [ ] URL: GET /api/health/
- [ ] Response: `{"status": "ok", "version": "1.0.0", "timestamp": "..."}`
- [ ] Test: `curl http://localhost:8000/api/health/`

---

## Phase 1.8: Testing & Validation

### Write Unit Tests
- [ ] Test Customer model methods
- [ ] Test Shop model methods and PostGIS queries
- [ ] Test MockVehicleData.get_glass_options()
- [ ] Test PricingConfig.calculate_mobile_fee()
- [ ] Test ShopPricingRule.calculate_price()
- [ ] Test Quote model validation (clean method)

### Integration Tests
- [ ] Test database migrations (up and down)
- [ ] Test seed data commands (idempotency)
- [ ] Test admin panel CRUD operations
- [ ] Test health check endpoint

### Documentation
- [ ] Create README.md with:
  - [ ] Project overview
  - [ ] Prerequisites
  - [ ] Installation steps
  - [ ] Docker commands
  - [ ] Seed data commands
  - [ ] API documentation URL
- [ ] Create DEVELOPMENT.md with:
  - [ ] Local development setup
  - [ ] Running tests
  - [ ] Database migrations
  - [ ] Debugging tips

---

## Sprint 1 Deliverables Checklist

- [ ] Django project running in Docker
- [ ] PostgreSQL 16 with PostGIS extension
- [ ] Redis running
- [ ] Mailhog running (email testing)
- [ ] All database models created and migrated
- [ ] Seed data populated (shops, vehicles, pricing rules)
- [ ] Django admin panel accessible and functional
- [ ] API documentation available at /api/docs/
- [ ] Health check endpoint working
- [ ] Git repository initialized with proper .gitignore
- [ ] README.md and DEVELOPMENT.md created
- [ ] All unit tests passing
- [ ] Code committed and pushed to repository

---

## Definition of Done

- [ ] All tasks above completed
- [ ] Code reviewed (self-review or peer review)
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Docker containers running stable
- [ ] Can run `docker-compose up -d` and access admin panel
- [ ] Seed data can be loaded successfully

---

## Notes & Risks

**Risks:**
- PostGIS setup complexity (mitigate: use official postgis Docker image)
- Django-fsm state machine integration (mitigate: thorough testing)
- Mock data realism (mitigate: use actual NAGS pricing examples)

**Dependencies:**
- None (this is the foundation sprint)

**Estimated Effort:**
- 35-40 hours for one developer
- 5-7 days with focused work
