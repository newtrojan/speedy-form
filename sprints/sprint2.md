# Sprint 2: Business Logic & Services

**Duration:** Week 2 (5-7 days)
**Goal:** Build core business logic, services, and Celery async tasks
**Success Criteria:** Quote generation works end-to-end (async), pricing calculated correctly, emails sent to Mailhog
**Dependencies:** Sprint 1 completed

---

## Phase 2.1: Service Layer Architecture

### Create Base Service Classes
- [ ] File: `core/services/base_service.py`
- [ ] Create BaseService class with common methods
- [ ] Create ServiceException custom exception class
- [ ] Add logging utilities for service layer

### Error Handling Framework
- [ ] File: `core/exceptions.py`
- [ ] Create custom exceptions:
  - [ ] `VehicleNotFoundException`
  - [ ] `ServiceAreaNotFoundException`
  - [ ] `PricingCalculationError`
  - [ ] `AutoboltAPIError`
  - [ ] `InvalidVINError`
  - [ ] `InvalidPlateError`
- [ ] Create DRF exception handler to format these consistently

---

## Phase 2.2: Vehicle Identification Service

### Create VIN Validator
- [ ] File: `vehicles/validators.py`
- [ ] Implement VIN checksum validation (NHTSA algorithm)
- [ ] Function: `validate_vin(vin: str) -> bool`
- [ ] Function: `validate_plate_format(plate: str, state: str) -> bool`
- [ ] Unit tests for VIN validation

### Create Vehicle Service
- [ ] File: `vehicles/services/vehicle_service.py`
- [ ] Class: `VehicleService`
- [ ] Method: `identify_by_vin(vin: str, use_mock: bool = True) -> dict`
  - [ ] Query MockVehicleData if use_mock=True
  - [ ] Fall back to AUTOBOLT stub if use_mock=False
  - [ ] Format response to match AUTOBOLT structure
  - [ ] Handle VehicleNotFoundException
- [ ] Method: `identify_by_plate(plate: str, state: str, use_mock: bool = True) -> dict`
  - [ ] Query MockVehicleData by plate + state
  - [ ] Fall back to AUTOBOLT stub
  - [ ] Format response
- [ ] Method: `_format_vehicle_response(vehicle: MockVehicleData) -> dict`
  - [ ] Return consistent structure with vehicle details
  - [ ] Include glass_options array
  - [ ] Include nags_parts full data
- [ ] Unit tests for all methods
- [ ] Integration test: Lookup existing vehicle by VIN
- [ ] Integration test: Lookup existing vehicle by plate

### Create AUTOBOLT Client Stub (Phase 2 - real API later)
- [ ] File: `pricing/services/autobolt_client.py`
- [ ] Class: `AutoboltClient`
- [ ] Method: `decode_vin(vin: str) -> dict`
  - [ ] Return mock response structure for now
  - [ ] Raise AutoboltAPIError on failure
- [ ] Method: `lookup_plate(plate: str, state: str) -> dict`
  - [ ] Return mock response
- [ ] Add configuration flag: `settings.USE_MOCK_VEHICLE_DATA`
- [ ] Unit tests with mocked responses

---

## Phase 2.3: Serviceability Check Service

### Create Geocoding Utility
- [ ] File: `shops/services/geocoding.py`
- [ ] Function: `geocode_postal_code(postal_code: str) -> Point`
  - [ ] For MVP: Return approximate centroid based on ZIP
  - [ ] For Phase 2: Integrate Google Maps Geocoding API
  - [ ] Return PostGIS Point or None
- [ ] Function: `geocode_address(street: str, city: str, state: str, postal_code: str) -> Point`
  - [ ] Stub for now (return postal code centroid)
  - [ ] Phase 2: Real geocoding
- [ ] Unit tests

### Create Serviceability Service
- [ ] File: `shops/services/serviceability.py`
- [ ] Class: `ServiceabilityService`

#### In-Store Service Check
- [ ] Method: `check_in_store(postal_code: str) -> dict`
  - [ ] Query ServiceArea with prefix matching (e.g., 941* matches 94102)
  - [ ] If not found, return `is_serviceable=False` with 3 nearby shops
  - [ ] If found, return `is_serviceable=True` with shop details
  - [ ] Include shop address, phone, directions URL
  - [ ] Response format:
    ```python
    {
      'is_serviceable': True,
      'service_type': 'in_store',
      'shop': {
        'id': 1,
        'name': 'Bay Area Auto Glass',
        'address': '...',
        'phone': '+14155551234',
        'directions_url': 'https://maps.google.com/...'
      }
    }
    ```

#### Mobile Service Check
- [ ] Method: `check_mobile(postal_code: str, street_address: str = None) -> dict`
  - [ ] Query ServiceArea for shops offering mobile service
  - [ ] If street_address provided:
    - [ ] Geocode customer address
    - [ ] Calculate distance using PostGIS
    - [ ] Check if within shop's max_mobile_radius_miles
    - [ ] Calculate mobile fee using PricingConfig
  - [ ] If no address, use postal code centroid (approximate)
  - [ ] Response format:
    ```python
    {
      'is_serviceable': True,
      'service_type': 'mobile',
      'shop': {...},
      'distance_miles': 12.5,
      'mobile_fee': 25.00,
      'message': 'Mobile service available!'
    }
    ```

#### Nearby Shops (for unserviceable areas)
- [ ] Method: `get_nearby_shops(postal_code: str, limit: int = 3) -> list`
  - [ ] Use PostGIS to find nearest shops
  - [ ] Return list of shops with distance
  - [ ] Phase 2: Calculate actual driving distance (Google Maps Distance Matrix API)

### Unit Tests
- [ ] Test in-store check for serviced ZIP
- [ ] Test in-store check for unserviced ZIP (returns nearby shops)
- [ ] Test mobile check with address (calculate distance)
- [ ] Test mobile check beyond max radius (not serviceable)
- [ ] Test PostGIS distance calculations

---

## Phase 2.4: Pricing Calculator Service

### Create Pricing Service
- [ ] File: `pricing/services/calculator.py`
- [ ] Class: `PricingCalculator`

#### Main Calculation Method
- [ ] Method: `calculate_quote(...) -> dict`
  - [ ] Parameters:
    - [ ] `vehicle_vin: str`
    - [ ] `glass_type: str` (windshield, door_front_left, etc.)
    - [ ] `manufacturer: str` (nags, pgw)
    - [ ] `shop_id: int`
    - [ ] `service_type: str` (mobile, in_store)
    - [ ] `distance_miles: float = None`
    - [ ] `payment_type: str = 'cash'`
    - [ ] `insurance_provider_id: int = None`
    - [ ] `use_mock: bool = True`
  - [ ] Steps:
    1. [ ] Get vehicle data (call VehicleService)
    2. [ ] Extract glass part for specified type + manufacturer
    3. [ ] Get shop and pricing rules
    4. [ ] Apply shop pricing rule to list price
    5. [ ] Calculate labor (standard $150 or complex $200)
    6. [ ] Add fees (environmental, disposal, mobile)
    7. [ ] Build line_items array
    8. [ ] Calculate totals
    9. [ ] Add insurance breakdown if applicable
  - [ ] Return structure:
    ```python
    {
      'vehicle': {...},
      'glass': {...},
      'shop': {...},
      'line_items': [...],
      'subtotal': 800.00,
      'tax': 0.00,
      'total': 800.00,
      'pricing_summary': {
        'manufacturer': 'NAGS',
        'list_price': 450.00,
        'discount_amount': 126.00,
        'discount_percentage': '28.0%',
        'final_part_price': 324.00
      }
    }
    ```

#### Helper Methods
- [ ] Method: `_apply_shop_pricing_rule(shop, manufacturer, glass_type, list_price) -> Decimal`
  - [ ] Query ShopPricingRule with filters:
    - [ ] Shop matches
    - [ ] Manufacturer matches
    - [ ] Glass type matches (or applies to all)
    - [ ] Is active
    - [ ] Valid date range
  - [ ] Order by priority (highest first), then glass_type specificity
  - [ ] Apply first matching rule
  - [ ] Fall back to global markup if no rules match
- [ ] Method: `_calculate_labor_cost(complexity: str) -> Decimal`
  - [ ] Return complex_labor_rate if complexity='complex'
  - [ ] Return standard_labor_rate otherwise
- [ ] Method: `_build_line_items(...) -> list`
  - [ ] Build part line item with discount details
  - [ ] Build labor line item
  - [ ] Build fee line items
  - [ ] Return array

### Unit Tests
- [ ] Test calculation with NAGS parts, shop discount -25%
- [ ] Test calculation with PGW parts, shop discount -30%
- [ ] Test windshield-specific rule (higher priority)
- [ ] Test mobile service fee calculation (various distances)
- [ ] Test complex vs standard labor
- [ ] Test insurance payment type (breakdown)
- [ ] Test with non-existent vehicle (should raise exception)
- [ ] Test with non-existent glass type (should raise exception)

---

## Phase 2.5: Celery Configuration & Tasks

### Configure Celery
- [ ] File: `core/celery.py`
- [ ] Initialize Celery app with Redis broker
- [ ] Configure task settings:
  - [ ] Task serializer: json
  - [ ] Result backend: Redis
  - [ ] Task track started: True
  - [ ] Task time limit: 300s (5 minutes)
- [ ] Configure beat schedule for cron jobs:
  ```python
  CELERY_BEAT_SCHEDULE = {
      'expire-old-quotes': {
          'task': 'quotes.tasks.expire_old_quotes',
          'schedule': crontab(hour=0, minute=0),  # Daily at midnight
      },
  }
  ```
- [ ] Test: Start Celery worker `celery -A core worker -l info`
- [ ] Test: Start Celery beat `celery -A core beat -l info`

### Create Quote Generation Task
- [ ] File: `quotes/tasks.py`
- [ ] Task: `generate_quote_task`
  - [ ] Decorator: `@shared_task(bind=True, max_retries=3, default_retry_delay=60)`
  - [ ] Parameters:
    - [ ] `task_id: str` (for tracking)
    - [ ] `vin: str`
    - [ ] `glass_type: str`
    - [ ] `manufacturer: str`
    - [ ] `postal_code: str`
    - [ ] `service_type: str`
    - [ ] `service_location: dict` (address for mobile, just ZIP for in-store)
    - [ ] `payment_type: str`
    - [ ] `insurance_data: dict` (if insurance)
    - [ ] `customer_data: dict`
  - [ ] Steps:
    1. [ ] Validate serviceability (call ServiceabilityService)
    2. [ ] If not serviceable, return error status
    3. [ ] Calculate distance for mobile service
    4. [ ] Fetch vehicle data (may take 3-5s with real API)
    5. [ ] Calculate pricing (call PricingCalculator)
    6. [ ] Create or get Customer record (idempotent)
    7. [ ] Get Shop record
    8. [ ] Create Quote record (state='pending_validation')
    9. [ ] Store pricing_details in JSON field
    10. [ ] Set expires_at (now + 7 days)
    11. [ ] Log state transition (draft → pending_validation)
    12. [ ] Return success status with quote_id
  - [ ] Error handling:
    - [ ] Retry on AutoboltAPIError (network issues)
    - [ ] Don't retry on VehicleNotFoundException
    - [ ] Log all errors to Sentry
  - [ ] Return format:
    ```python
    {
      'status': 'completed',  # or 'failed', 'not_serviceable'
      'quote_id': 'uuid',
      'error': None  # or error details
    }
    ```

### Create Email Tasks
- [ ] File: `quotes/tasks.py`
- [ ] Task: `send_quote_email(quote_id: UUID)`
  - [ ] Get Quote object
  - [ ] Render HTML email template with quote details
  - [ ] Generate secure approval token (32-byte random, store hashed)
  - [ ] Build approval URL: `{FRONTEND_URL}/quotes/approve/{token}`
  - [ ] Send email via Django mail backend (Mailhog in dev)
  - [ ] Handle SendGrid errors gracefully
- [ ] Task: `send_rejection_email(quote_id: UUID, reason: str)`
  - [ ] Get Quote object
  - [ ] Render rejection email template
  - [ ] Include reason and contact info
  - [ ] Send email
- [ ] Task: `send_approval_confirmation(quote_id: UUID)`
  - [ ] Get Quote object
  - [ ] Render confirmation email
  - [ ] Include next steps (scheduling appointment)
  - [ ] Send email

### Create Cron Tasks
- [ ] Task: `expire_old_quotes()`
  - [ ] Query quotes in 'sent' state older than 7 days
  - [ ] Transition to 'expired' state (use FSM)
  - [ ] Log state transitions
  - [ ] Optionally send expiration notification email
  - [ ] Return count of expired quotes

### Email Templates
- [ ] Create email templates in `templates/emails/`:
  - [ ] `quote_email.html` - Main quote email
  - [ ] `rejection_email.html` - Quote rejection
  - [ ] `approval_confirmation.html` - Customer approved quote
  - [ ] `expiration_notice.html` - Quote expired
- [ ] Use inline Tailwind CSS for email styling
- [ ] Test rendering with sample data

### Unit Tests
- [ ] Test generate_quote_task with valid data
- [ ] Test generate_quote_task with unserviceable ZIP
- [ ] Test generate_quote_task retry on API error
- [ ] Test send_quote_email (check email sent to Mailhog)
- [ ] Test expire_old_quotes cron job
- [ ] Integration test: Full quote generation flow

---

## Phase 2.6: Quote State Machine (FSM)

### Configure Django-FSM
- [ ] Install: `django-fsm==3.0.0`
- [ ] Add FSMField to Quote model (already done in Sprint 1)

### Define State Transitions
- [ ] File: `quotes/models.py` (update Quote model)
- [ ] Add transition methods with `@transition` decorator:
  - [ ] `submit_for_validation()` - draft → pending_validation
  - [ ] `send_to_customer(user)` - pending_validation → sent
  - [ ] `customer_approve()` - sent → customer_approved
  - [ ] `schedule_appointment()` - customer_approved → scheduled
  - [ ] `convert_to_job()` - scheduled → converted
  - [ ] `expire_quote()` - sent → expired
  - [ ] `reject_quote(user, reason)` - pending_validation → rejected
  - [ ] `insurance_deny()` - pending_insurance_approval → insurance_denied

### State Logging
- [ ] Update each transition to create QuoteStateLog entry
- [ ] Include user (if applicable), timestamp, notes
- [ ] Method: `log_state_change(from_state, to_state, user=None, notes='')`

### FSM Permissions
- [ ] Only support agents can: send_to_customer, reject_quote
- [ ] Only customers can: customer_approve
- [ ] System can: expire_quote, submit_for_validation

### Unit Tests
- [ ] Test valid transitions
- [ ] Test invalid transitions (should raise TransitionNotAllowed)
- [ ] Test state logging
- [ ] Test permissions on transitions

---

## Phase 2.7: Email Service Layer

### Create Email Service
- [ ] File: `core/services/email_service.py`
- [ ] Class: `EmailService`
- [ ] Method: `send_quote(quote: Quote) -> bool`
  - [ ] Generate secure token for quote approval
  - [ ] Store token hash in Quote model (add field: approval_token_hash)
  - [ ] Render HTML email from template
  - [ ] Build context with quote details, line items, approval link
  - [ ] Send via Django send_mail()
  - [ ] Return True on success, False on failure
- [ ] Method: `send_rejection(quote: Quote, reason: str) -> bool`
- [ ] Method: `send_approval_confirmation(quote: Quote) -> bool`
- [ ] Method: `generate_secure_token() -> str`
  - [ ] Use `secrets.token_urlsafe(32)`
- [ ] Method: `hash_token(token: str) -> str`
  - [ ] Use SHA256 hash for storage

### Configure Email Settings
- [ ] Update `settings/dev.py`:
  ```python
  EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
  EMAIL_HOST = 'mailhog'
  EMAIL_PORT = 1025
  DEFAULT_FROM_EMAIL = 'noreply@autoglassquote.com'
  ```
- [ ] Update `settings/prod.py`:
  ```python
  EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
  EMAIL_HOST = 'smtp.sendgrid.net'
  EMAIL_PORT = 587
  EMAIL_USE_TLS = True
  EMAIL_HOST_USER = 'apikey'
  EMAIL_HOST_PASSWORD = env('SENDGRID_API_KEY')
  ```

### Update Quote Model
- [ ] Add field: `approval_token_hash` (CharField, nullable)
- [ ] Add field: `approval_token_created_at` (DateTimeField, nullable)
- [ ] Method: `verify_approval_token(token: str) -> bool`
- [ ] Method: `is_approval_token_expired() -> bool` (24 hour expiry)

### Unit Tests
- [ ] Test email rendering with quote data
- [ ] Test token generation and hashing
- [ ] Test token verification
- [ ] Test sending email to Mailhog (check inbox via API)

---

## Phase 2.8: Integration Testing

### End-to-End Quote Generation Test
- [ ] Test: Create quote request → trigger Celery task → quote created
  - [ ] Set up test data (vehicle, shop, pricing rules)
  - [ ] Call generate_quote_task synchronously (no async in tests)
  - [ ] Verify Quote object created with correct pricing
  - [ ] Verify state = 'pending_validation'
  - [ ] Verify pricing_details JSON populated correctly

### Email Flow Test
- [ ] Test: Support validates quote → email sent → customer approves
  - [ ] Create Quote in 'pending_validation' state
  - [ ] Call send_to_customer transition (should trigger email task)
  - [ ] Verify email sent to Mailhog (check via HTTP API: http://mailhog:8025/api/v2/messages)
  - [ ] Extract approval token from email
  - [ ] Call customer_approve() with token
  - [ ] Verify state = 'customer_approved'

### Serviceability Test
- [ ] Test: Check in-store for serviced ZIP
- [ ] Test: Check in-store for unserviced ZIP (returns nearby shops)
- [ ] Test: Check mobile with address within radius
- [ ] Test: Check mobile with address outside radius

### Pricing Calculation Test
- [ ] Test: Calculate quote for Honda Accord with NAGS windshield
  - [ ] Verify list price $450
  - [ ] Verify discount 28% = $126
  - [ ] Verify final part price $324
  - [ ] Verify complex labor $200
  - [ ] Verify fees (env $5, disposal $10)
  - [ ] Verify total matches expected

---

## Phase 2.9: Logging & Monitoring

### Configure Logging
- [ ] File: `core/settings/base.py`
- [ ] Configure Django logging:
  ```python
  LOGGING = {
      'version': 1,
      'disable_existing_loggers': False,
      'formatters': {
          'verbose': {
              'format': '{levelname} {asctime} {module} {message}',
              'style': '{',
          },
      },
      'handlers': {
          'console': {
              'class': 'logging.StreamHandler',
              'formatter': 'verbose',
          },
      },
      'loggers': {
          'quotes.tasks': {'level': 'INFO', 'handlers': ['console']},
          'pricing.services': {'level': 'DEBUG', 'handlers': ['console']},
          'vehicles.services': {'level': 'INFO', 'handlers': ['console']},
          'shops.services': {'level': 'INFO', 'handlers': ['console']},
      },
  }
  ```

### Add Logging to Services
- [ ] Add logger to VehicleService (log VIN lookups)
- [ ] Add logger to PricingCalculator (log calculations)
- [ ] Add logger to ServiceabilityService (log checks)
- [ ] Add logger to Celery tasks (log task start/complete/failure)

### Celery Task Monitoring
- [ ] Configure Celery events
- [ ] Test monitoring with: `celery -A core events`
- [ ] Check task status in Redis: `redis-cli LLEN celery`

---

## Phase 2.10: Performance Optimization

### Redis Caching for Vehicle Lookups
- [ ] File: `vehicles/services/vehicle_service.py`
- [ ] Add caching decorator to `identify_by_vin()`:
  ```python
  from django.core.cache import cache

  def identify_by_vin(vin, use_mock=True):
      cache_key = f'vehicle_vin_{vin}'
      cached = cache.get(cache_key)
      if cached:
          return cached

      result = # ... lookup logic
      cache.set(cache_key, result, timeout=86400)  # 24 hours
      return result
  ```
- [ ] Add caching to `identify_by_plate()`
- [ ] Test: First lookup hits DB, second lookup hits cache

### Database Query Optimization
- [ ] Review all queries with `select_related()` and `prefetch_related()`:
  - [ ] Quote queries should prefetch customer, shop, insurance_provider
  - [ ] ServiceArea queries should select_related shop
- [ ] Add database indexes (already done in Sprint 1, verify)

### Celery Task Optimization
- [ ] Configure Celery task routing (separate queues for high/low priority)
- [ ] Set task time limits
- [ ] Configure task result expiration (1 hour)

---

## Sprint 2 Deliverables Checklist

- [ ] VehicleService working (lookup by VIN and plate)
- [ ] ServiceabilityService working (in-store and mobile checks)
- [ ] PricingCalculator working (with shop pricing rules)
- [ ] Celery configured and tasks running
- [ ] generate_quote_task creates quotes successfully
- [ ] Email tasks send to Mailhog
- [ ] FSM state transitions working
- [ ] Quote state logging working
- [ ] Cron job for expiring quotes configured
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Logging configured for all services
- [ ] Redis caching implemented
- [ ] Email templates created and tested
- [ ] Code committed and pushed

---

## Definition of Done

- [ ] All tasks above completed
- [ ] Code reviewed (self-review or peer review)
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Can generate a quote end-to-end via Celery task
- [ ] Email appears in Mailhog inbox
- [ ] State transitions work correctly
- [ ] No console errors or warnings
- [ ] Services properly logged
- [ ] Documentation updated (add API endpoint docs)

---

## Notes & Risks

**Risks:**
- Celery task failures (mitigate: proper error handling, retries, monitoring)
- Email delivery issues (mitigate: test with Mailhog, add logging)
- PostGIS distance calculations accuracy (mitigate: use tested formulas, add unit tests)
- Pricing calculation edge cases (mitigate: comprehensive test cases)

**Dependencies:**
- Sprint 1 must be completed
- Docker containers must be running
- Seed data must be loaded

**Estimated Effort:**
- 40-45 hours for one developer
- 5-7 days with focused work
