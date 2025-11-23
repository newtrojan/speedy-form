# Sprint 4: Support Dashboard & Production Ready

**Duration:** Week 4 (5-7 days)
**Goal:** Build support agent tools, secure the system, and prepare for production deployment
**Success Criteria:** Support agents can manage quotes, system is production-ready, deployed to VPS
**Dependencies:** Sprint 1, 2 & 3 completed

---

## Phase 4.1: Authentication & Authorization

### JWT Token Authentication
- [ ] File: `core/api/auth_views.py`
- [ ] Already configured in Sprint 1, verify working

### Create Authentication Endpoints
- [ ] URL: `POST /api/v1/auth/login/`
  - [ ] Accept: email/username + password
  - [ ] Return: access_token, refresh_token, user details (role, permissions)
- [ ] URL: `POST /api/v1/auth/refresh/`
  - [ ] Accept: refresh_token
  - [ ] Return: new access_token
- [ ] URL: `POST /api/v1/auth/logout/`
  - [ ] Invalidate token (blacklist)
- [ ] URL: `GET /api/v1/auth/me/`
  - [ ] Return current user details
  - [ ] Permission: IsAuthenticated

### Custom Permission Classes
- [ ] File: `core/api/permissions.py`
- [ ] Create permission classes:
  - [ ] `IsCustomerOwner` - Can only view own quotes
  - [ ] `IsSupportAgent` - Can view/modify all quotes
  - [ ] `IsAdminUser` - Full access
  - [ ] `IsSupportOrAdmin` - Support agent or admin
- [ ] Example:
  ```python
  class IsSupportAgent(BasePermission):
      def has_permission(self, request, view):
          return request.user.groups.filter(name='Support Agent').exists()
  ```

### User Serializers
- [ ] File: `core/api/serializers.py`
- [ ] `UserSerializer`:
  - [ ] Fields: id, username, email, first_name, last_name, role, permissions
  - [ ] role: Computed field (customer, support_agent, admin)
  - [ ] permissions: Array of permission codenames
- [ ] `LoginSerializer`:
  - [ ] Fields: email, password
  - [ ] Validation: Check credentials
- [ ] `TokenResponseSerializer`:
  - [ ] Fields: access_token, refresh_token, user (nested)

### Test Authentication
- [ ] Test: Login with valid credentials → returns tokens
- [ ] Test: Login with invalid credentials → 401
- [ ] Test: Access protected endpoint without token → 401
- [ ] Test: Access protected endpoint with valid token → 200
- [ ] Test: Refresh token → new access token
- [ ] Test: Expired token → 401

---

## Phase 4.2: Support Dashboard APIs

### Quote Queue Endpoint
- [ ] File: `support_dashboard/api/views.py`
- [ ] View: `QuoteQueueView` (ListAPIView)
- [ ] URL: `GET /api/v1/support/quotes/`
- [ ] Permission: IsSupportAgent
- [ ] Serializer: `QuoteListSerializer`
- [ ] Features:
  - [ ] Pagination: 50 quotes per page
  - [ ] Filtering:
    - [ ] `?state=pending_validation` (default)
    - [ ] `?state=sent`
    - [ ] `?payment_type=insurance`
    - [ ] `?service_type=mobile`
    - [ ] `?date_from=2025-11-01`
    - [ ] `?date_to=2025-11-30`
  - [ ] Searching:
    - [ ] `?search=customer@email.com` (search customer email, VIN, quote ID)
  - [ ] Ordering:
    - [ ] `?ordering=-created_at` (newest first, default)
    - [ ] `?ordering=created_at` (oldest first)
    - [ ] `?ordering=-total_price`
- [ ] Response format:
  ```json
  {
    "count": 127,
    "next": "/api/v1/support/quotes/?page=2",
    "previous": null,
    "results": [
      {
        "id": "uuid",
        "vehicle_display": "2021 Honda Accord",
        "customer_email": "john@example.com",
        "customer_phone": "+14155551234",
        "glass_type": "windshield",
        "service_type": "mobile",
        "payment_type": "cash",
        "total": 549.00,
        "state": "pending_validation",
        "state_display": "Pending Validation",
        "created_at": "2025-11-22T10:30:00Z",
        "age_hours": 2,
        "sla_status": "on_time",
        "expires_at": "2025-11-29T00:00:00Z"
      }
    ]
  }
  ```

### Quote Detail Endpoint (Support)
- [ ] View: `QuoteDetailView` (RetrieveAPIView)
- [ ] URL: `GET /api/v1/support/quotes/{quote_id}/`
- [ ] Permission: IsSupportAgent
- [ ] Serializer: `QuoteDetailSerializer` (more detail than preview)
- [ ] Response includes:
  - [ ] Full vehicle info (unmasked VIN)
  - [ ] Full customer info (unmasked email, phone, address)
  - [ ] AUTOBOLT raw response (for debugging)
  - [ ] State history (all transitions with timestamps, users)
  - [ ] Internal notes
  - [ ] Editable fields indicator
- [ ] Response format:
  ```json
  {
    "id": "uuid",
    "vehicle": {
      "vin": "1HGBH41JXMN109186",
      "year": 2021,
      "make": "Honda",
      "model": "Accord"
    },
    "customer": {
      "id": 1,
      "email": "john@example.com",
      "phone": "+14155551234",
      "full_name": "John Doe",
      "address": "123 Main St, San Francisco, CA 94102"
    },
    "glass": {...},
    "service": {...},
    "payment": {...},
    "pricing": {
      "line_items": [...],
      "total": 549.00
    },
    "state": "pending_validation",
    "state_history": [
      {
        "from_state": "draft",
        "to_state": "pending_validation",
        "user": "system",
        "timestamp": "2025-11-22T10:30:00Z",
        "notes": ""
      }
    ],
    "internal_notes": "",
    "autobolt_raw_response": {...},
    "created_at": "2025-11-22T10:30:00Z",
    "expires_at": "2025-11-29T00:00:00Z",
    "_permissions": {
      "can_validate": true,
      "can_reject": true,
      "can_modify": true,
      "can_delete": false
    }
  }
  ```

### Quote Modification Endpoint
- [ ] View: `QuoteModifyView` (UpdateAPIView)
- [ ] URL: `PATCH /api/v1/support/quotes/{quote_id}/`
- [ ] Permission: IsSupportAgent
- [ ] Allowed only in state: `pending_validation`
- [ ] Serializer: `QuoteModifySerializer`
- [ ] Editable fields:
  - [ ] `line_items` - Can modify existing or add custom items
  - [ ] `internal_notes` - Support agent notes
- [ ] Logic:
  1. [ ] Validate Quote state (must be pending_validation)
  2. [ ] Update line items
  3. [ ] Recalculate total
  4. [ ] Update pricing_details JSON
  5. [ ] Log modification in QuoteStateLog
  6. [ ] Return updated quote
- [ ] Request example:
  ```json
  {
    "line_items": [
      {
        "id": 1,
        "subtotal": 350.00
      },
      {
        "type": "custom",
        "description": "Rush Service Fee",
        "subtotal": 50.00
      }
    ],
    "internal_notes": "Customer requested expedited service"
  }
  ```
- [ ] Response: Updated QuoteDetailSerializer

### Quote Validation Endpoint
- [ ] View: `ValidateQuoteView` (APIView)
- [ ] URL: `POST /api/v1/support/quotes/{quote_id}/validate/`
- [ ] Permission: IsSupportAgent
- [ ] Request body (optional):
  ```json
  {
    "notes": "Verified pricing, approved for sending"
  }
  ```
- [ ] Logic:
  1. [ ] Get Quote object
  2. [ ] Verify state is `pending_validation`
  3. [ ] Call FSM transition: `send_to_customer(user=request.user)`
  4. [ ] Trigger Celery task: `send_quote_email.delay(quote_id)`
  5. [ ] Log state change with user and notes
  6. [ ] Return success response
- [ ] Response:
  ```json
  {
    "success": true,
    "quote_id": "uuid",
    "new_state": "sent",
    "email_sent": true,
    "message": "Quote sent to john@example.com"
  }
  ```
- [ ] Error handling:
  - [ ] Quote not in pending_validation → 400
  - [ ] Email send failed → 500 (but state already changed)

### Quote Rejection Endpoint
- [ ] View: `RejectQuoteView` (APIView)
- [ ] URL: `POST /api/v1/support/quotes/{quote_id}/reject/`
- [ ] Permission: IsSupportAgent
- [ ] Request body (required):
  ```json
  {
    "reason": "Vehicle not in NAGS database. Need manual pricing."
  }
  ```
- [ ] Logic:
  1. [ ] Get Quote object
  2. [ ] Verify state is `pending_validation`
  3. [ ] Call FSM transition: `reject_quote(user=request.user, reason=reason)`
  4. [ ] Trigger Celery task: `send_rejection_email.delay(quote_id, reason)`
  5. [ ] Log state change
  6. [ ] Return success response
- [ ] Response:
  ```json
  {
    "success": true,
    "quote_id": "uuid",
    "new_state": "rejected",
    "email_sent": true,
    "message": "Quote rejected and customer notified"
  }
  ```

### Bulk Actions Endpoint **[DEFERRED - Post-MVP]**
- [ ] View: `BulkQuoteActionsView` (APIView)
- [ ] URL: `POST /api/v1/support/quotes/bulk/`
- [ ] Permission: IsSupportAgent
- [ ] Actions:
  - [ ] Bulk validate (multiple quote IDs)
  - [ ] Bulk reject
  - [ ] Bulk export to CSV
- [ ] Request:
  ```json
  {
    "action": "validate",
    "quote_ids": ["uuid1", "uuid2", "uuid3"]
  }
  ```
- [ ] Response:
  ```json
  {
    "success": true,
    "processed": 3,
    "failed": 0,
    "results": [
      {"quote_id": "uuid1", "status": "sent"},
      {"quote_id": "uuid2", "status": "sent"},
      {"quote_id": "uuid3", "status": "sent"}
    ]
  }
  ```

### Customer Lookup Endpoint
- [ ] View: `CustomerDetailView` (RetrieveAPIView)
- [ ] URL: `GET /api/v1/support/customers/{customer_id}/`
- [ ] Permission: IsSupportAgent
- [ ] Serializer: `CustomerDetailSerializer`
- [ ] Response includes:
  - [ ] Customer info
  - [ ] Quote history (all quotes for this customer)
  - [ ] Total spent
  - [ ] Total jobs completed
- [ ] Response:
  ```json
  {
    "id": 1,
    "email": "john@example.com",
    "phone": "+14155551234",
    "full_name": "John Doe",
    "total_quotes": 5,
    "total_spent": 2450.00,
    "total_jobs": 2,
    "created_at": "2025-10-01T00:00:00Z",
    "quotes": [
      {
        "id": "uuid",
        "vehicle": "2021 Honda Accord",
        "total": 549.00,
        "state": "customer_approved",
        "created_at": "2025-11-22T10:30:00Z"
      }
    ]
  }
  ```

---

## Phase 4.3: Django Admin Enhancements

### Custom Admin Dashboard
- [ ] File: `core/admin.py`
- [ ] Create custom admin index page with:
  - [ ] Quote statistics (total, pending, sent, approved)
  - [ ] Recent activity (last 10 quotes)
  - [ ] SLA metrics (quotes pending >24 hours)
  - [ ] Revenue metrics (total, this month)

### Quote Admin Enhancements
- [ ] File: `quotes/admin.py`
- [ ] Custom QuoteAdmin:
  - [ ] List display: ID, vehicle, customer, total, state, created_at, age
  - [ ] List filters: state, payment_type, service_type, created_at
  - [ ] Search fields: customer__email, vin, id
  - [ ] Read-only fields: pricing_details, vehicle_info, created_at
  - [ ] Inline: QuoteLineItem, QuoteStateLog (read-only)
  - [ ] Custom actions:
    - [ ] Bulk validate quotes
    - [ ] Bulk reject quotes
    - [ ] Export selected to CSV
    - [ ] Mark as expired
  - [ ] Fieldsets: Group related fields
  - [ ] Change form: Show state transitions as timeline
- [ ] Custom admin URLs:
  - [ ] Quick validate button (inline action)
  - [ ] Quick reject button with reason modal

### Shop Admin Enhancements
- [ ] File: `shops/admin.py`
- [ ] ShopAdmin with inline ServiceArea management
- [ ] ServiceAreaAdmin with bulk import from CSV
- [ ] Custom action: "Test serviceability" (enter ZIP, check result)

### Pricing Admin Enhancements
- [ ] File: `pricing/admin.py`
- [ ] PricingConfigAdmin:
  - [ ] Singleton pattern (only 1 record editable)
  - [ ] Group fees by category
  - [ ] Show preview of mobile fee tiers
- [ ] ShopPricingRuleAdmin:
  - [ ] List filters: shop, manufacturer, is_active
  - [ ] Inline editing for shop
  - [ ] Validation: Check for conflicting rules

### Vehicle Admin
- [ ] File: `vehicles/admin.py`
- [ ] MockVehicleDataAdmin:
  - [ ] JSON viewer for glass_parts (formatted, syntax-highlighted)
  - [ ] Import from CSV action
  - [ ] Test lookup action (enter VIN/plate, see result)

---

## Phase 4.4: Security Hardening

### Input Validation & Sanitization
- [ ] Review all serializers for validation
- [ ] Add field-level validators:
  - [ ] VIN checksum validation
  - [ ] Email validation
  - [ ] Phone validation (E.164)
  - [ ] Postal code validation
  - [ ] SQL injection prevention (use ORM only, no raw queries)
- [ ] Add max length limits on all text fields
- [ ] Sanitize HTML input (strip tags)

### SQL Injection Prevention
- [ ] Audit: No raw SQL queries
- [ ] Use parameterized queries if raw SQL needed
- [ ] Test: Attempt SQL injection in all inputs

### XSS Prevention
- [ ] DRF auto-escapes JSON (verify)
- [ ] Django templates auto-escape (verify)
- [ ] Add Content-Security-Policy header

### CSRF Protection
- [ ] Enable CSRF middleware (default in Django)
- [ ] Configure CSRF_TRUSTED_ORIGINS for production
- [ ] Exempt API endpoints (use JWT instead)

### Rate Limiting (Already Done)
- [ ] Verify throttling configured
- [ ] Test rate limits with automated requests

### Secrets Management
- [ ] Review .env file (ensure not committed)
- [ ] Use environment variables for all secrets:
  - [ ] SECRET_KEY
  - [ ] DB_PASSWORD
  - [ ] AUTOBOLT_API_KEY
  - [ ] SENDGRID_API_KEY
  - [ ] JWT_SECRET_KEY
- [ ] Add to .env.example with placeholder values

### HTTPS Enforcement (Production)
- [ ] Configure SECURE_SSL_REDIRECT in prod settings
- [ ] Configure SECURE_HSTS_SECONDS
- [ ] Configure SESSION_COOKIE_SECURE
- [ ] Configure CSRF_COOKIE_SECURE

### Sensitive Data Protection
- [ ] Mask VINs in logs
- [ ] Don't log email addresses
- [ ] Don't log phone numbers
- [ ] Hash approval tokens (already done)
- [ ] Consider encrypting VINs at rest (pgcrypto)

### Security Headers
- [ ] Add security middleware:
  ```python
  MIDDLEWARE = [
      'django.middleware.security.SecurityMiddleware',
      ...
  ]
  ```
- [ ] Configure security headers:
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] Content-Security-Policy

### Dependency Security Audit
- [ ] Run: `pip install safety`
- [ ] Run: `safety check`
- [ ] Update vulnerable packages
- [ ] Document security decisions

---

## Phase 4.5: Error Handling & Logging

### Sentry Integration **[DEFERRED - Post-MVP]**
- [ ] Install: `pip install sentry-sdk`
- [ ] Configure Sentry in settings:
  ```python
  import sentry_sdk
  sentry_sdk.init(
      dsn=env('SENTRY_DSN'),
      environment=env('ENVIRONMENT'),
  )
  ```
- [ ] Test: Trigger error, verify in Sentry dashboard

### Structured Logging
- [ ] Configure JSON logging for production
- [ ] Log important events:
  - [ ] Quote created (with quote_id, customer, total)
  - [ ] Quote validated (with user, quote_id)
  - [ ] Quote rejected (with user, quote_id, reason)
  - [ ] Email sent (with quote_id, recipient)
  - [ ] API errors (with endpoint, error, user)

### Error Tracking
- [ ] Log all exceptions to Sentry
- [ ] Create custom error codes for common errors
- [ ] Document error codes in API docs

---

## Phase 4.6: Testing & Quality Assurance

### Unit Tests Coverage
- [ ] Aim for >80% coverage
- [ ] Run: `coverage run --source='.' manage.py test`
- [ ] Run: `coverage report`
- [ ] Run: `coverage html` (view detailed report)
- [ ] Fix any gaps in coverage

### Integration Tests
- [ ] Test: Full quote flow (customer → support → email → approval)
- [ ] Test: Quote rejection flow
- [ ] Test: Quote expiration cron job
- [ ] Test: Bulk actions
- [ ] Test: Authentication & permissions

### API Tests
- [ ] Test all endpoints with valid data
- [ ] Test all endpoints with invalid data
- [ ] Test authentication (no token, invalid token, expired token)
- [ ] Test permissions (customer accessing support endpoints)
- [ ] Test rate limiting
- [ ] Test pagination, filtering, searching, ordering

### Security Tests
- [ ] Test: SQL injection attempts
- [ ] Test: XSS attempts
- [ ] Test: CSRF protection
- [ ] Test: Rate limit bypass attempts
- [ ] Test: Unauthorized access attempts

### Performance Tests
- [ ] Load test with Locust (100 concurrent users)
- [ ] Monitor response times
- [ ] Monitor database queries (use django-debug-toolbar)
- [ ] Optimize slow queries

---

## Phase 4.7: Production Deployment Configuration **[DEFERRED - Will do after frontend]**

### Docker Production Setup
- [ ] Create `Dockerfile.prod`:
  ```dockerfile
  FROM python:3.11-slim
  ENV PYTHONUNBUFFERED=1
  WORKDIR /app

  # Install system dependencies
  RUN apt-get update && apt-get install -y \
      postgresql-client \
      gdal-bin \
      libgdal-dev \
      && rm -rf /var/lib/apt/lists/*

  # Install Python dependencies
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt

  # Copy application
  COPY . .

  # Collect static files
  RUN python manage.py collectstatic --noinput

  # Run gunicorn
  CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
  ```

- [ ] Create `docker-compose.prod.yml`:
  ```yaml
  version: '3.8'

  services:
    db:
      image: postgis/postgis:16-3.4
      environment:
        POSTGRES_DB: ${DB_NAME}
        POSTGRES_USER: ${DB_USER}
        POSTGRES_PASSWORD: ${DB_PASSWORD}
      volumes:
        - postgres_data:/var/lib/postgresql/data
      restart: always

    redis:
      image: redis:7-alpine
      volumes:
        - redis_data:/data
      restart: always

    backend:
      build:
        context: .
        dockerfile: Dockerfile.prod
      env_file: .env.prod
      depends_on:
        - db
        - redis
      ports:
        - "8000:8000"
      restart: always

    celery_worker:
      build:
        context: .
        dockerfile: Dockerfile.prod
      command: celery -A core worker -l info
      env_file: .env.prod
      depends_on:
        - db
        - redis
      restart: always

    celery_beat:
      build:
        context: .
        dockerfile: Dockerfile.prod
      command: celery -A core beat -l info
      env_file: .env.prod
      depends_on:
        - db
        - redis
      restart: always

    nginx:
      image: nginx:alpine
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./nginx.conf:/etc/nginx/nginx.conf
        - ./staticfiles:/app/staticfiles
        - ./mediafiles:/app/mediafiles
      depends_on:
        - backend
      restart: always

  volumes:
    postgres_data:
    redis_data:
  ```

### Nginx Configuration
- [ ] Create `nginx.conf`:
  ```nginx
  upstream backend {
      server backend:8000;
  }

  server {
      listen 80;
      server_name yourdomain.com;

      client_max_body_size 10M;

      location /static/ {
          alias /app/staticfiles/;
      }

      location /media/ {
          alias /app/mediafiles/;
      }

      location / {
          proxy_pass http://backend;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

### Production Environment Variables
- [ ] Create `.env.prod`:
  ```
  DEBUG=False
  SECRET_KEY=<generate-secure-key>
  ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

  DB_NAME=autoglass_prod
  DB_USER=postgres
  DB_PASSWORD=<secure-password>
  DB_HOST=db
  DB_PORT=5432

  REDIS_URL=redis://redis:6379/0

  EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
  EMAIL_HOST=smtp.sendgrid.net
  EMAIL_PORT=587
  EMAIL_USE_TLS=True
  EMAIL_HOST_USER=apikey
  EMAIL_HOST_PASSWORD=<sendgrid-api-key>

  AUTOBOLT_API_KEY=<api-key>
  USE_MOCK_VEHICLE_DATA=False

  SENTRY_DSN=<sentry-dsn>
  ENVIRONMENT=production

  CORS_ALLOWED_ORIGINS=https://yourdomain.com
  ```

### Static Files Configuration
- [ ] Install whitenoise: `pip install whitenoise`
- [ ] Add to MIDDLEWARE (after SecurityMiddleware)
- [ ] Configure STATIC_ROOT, MEDIA_ROOT
- [ ] Run: `python manage.py collectstatic`

### Database Migrations Strategy
- [ ] Create migration deployment script:
  ```bash
  #!/bin/bash
  # deploy.sh

  echo "Running database migrations..."
  docker-compose exec backend python manage.py migrate --noinput

  echo "Collecting static files..."
  docker-compose exec backend python manage.py collectstatic --noinput

  echo "Restarting services..."
  docker-compose restart backend celery_worker celery_beat

  echo "Deployment complete!"
  ```
- [ ] Test on staging environment first

### Backup Strategy
- [ ] Create database backup script:
  ```bash
  #!/bin/bash
  # backup_db.sh

  DATE=$(date +%Y%m%d_%H%M%S)
  docker-compose exec -T db pg_dump -U postgres autoglass_prod > backup_$DATE.sql
  ```
- [ ] Schedule daily backups (cron job)
- [ ] Test restore process

---

## Phase 4.8: Documentation

### API Documentation
- [ ] Complete API docs in Swagger UI
- [ ] Add request/response examples for all endpoints
- [ ] Document authentication flow
- [ ] Document error codes
- [ ] Create Postman collection

### Deployment Documentation
- [ ] Create `DEPLOYMENT.md`:
  - [ ] Prerequisites (Docker, VPS requirements)
  - [ ] Initial setup steps
  - [ ] Environment configuration
  - [ ] Database setup
  - [ ] SSL certificate setup (Let's Encrypt)
  - [ ] Deployment process
  - [ ] Rollback process
  - [ ] Backup/restore process
  - [ ] Monitoring setup

### Developer Documentation
- [ ] Update `DEVELOPMENT.md`:
  - [ ] Local setup
  - [ ] Running tests
  - [ ] Code style guide
  - [ ] Git workflow
  - [ ] Adding new endpoints
  - [ ] Debugging tips

### User Guide (Support Agents)
- [ ] Create `SUPPORT_GUIDE.md`:
  - [ ] How to validate quotes
  - [ ] How to reject quotes
  - [ ] How to modify pricing
  - [ ] How to look up customers
  - [ ] Common issues & solutions

### Architecture Documentation
- [ ] Update `Architecture.md` with:
  - [ ] Actual implementation details
  - [ ] API endpoint reference
  - [ ] Database schema diagram
  - [ ] Deployment architecture diagram

---

## Phase 4.9: VPS Deployment **[DEFERRED - Will do after frontend]**

### VPS Setup
- [ ] Provision VPS (DigitalOcean/Linode/Hetzner):
  - [ ] 2 CPU cores, 4GB RAM minimum
  - [ ] Ubuntu 24.04 LTS
  - [ ] 50GB SSD storage
- [ ] SSH access configured
- [ ] Firewall configured (ports 80, 443, 22 only)

### Install Dependencies
- [ ] Install Docker:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```
- [ ] Install Docker Compose:
  ```bash
  sudo apt install docker-compose-plugin
  ```
- [ ] Install Git:
  ```bash
  sudo apt install git
  ```

### Deploy Application
- [ ] Clone repository to VPS
- [ ] Create `.env.prod` with production values
- [ ] Build and start containers:
  ```bash
  docker-compose -f docker-compose.prod.yml up -d --build
  ```
- [ ] Run migrations:
  ```bash
  docker-compose exec backend python manage.py migrate
  ```
- [ ] Create superuser:
  ```bash
  docker-compose exec backend python manage.py createsuperuser
  ```
- [ ] Load seed data:
  ```bash
  docker-compose exec backend python manage.py seed_data
  docker-compose exec backend python manage.py seed_mock_vehicles
  ```
- [ ] Verify services running:
  ```bash
  docker-compose ps
  ```

### SSL Certificate Setup
- [ ] Install Certbot:
  ```bash
  sudo apt install certbot python3-certbot-nginx
  ```
- [ ] Obtain SSL certificate:
  ```bash
  sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
  ```
- [ ] Configure auto-renewal (cron job)
- [ ] Update nginx config for HTTPS

### Monitoring Setup
- [ ] Install monitoring tools:
  - [ ] Uptime monitoring (UptimeRobot)
  - [ ] Error tracking (Sentry)
  - [ ] Log aggregation (Logstash or Papertrail)
- [ ] Set up alerts:
  - [ ] Server down
  - [ ] High error rate
  - [ ] Database connection issues

### Health Check Endpoint
- [ ] Create endpoint: `GET /api/health/`
- [ ] Response:
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "database": "connected",
    "redis": "connected",
    "celery": "running",
    "timestamp": "2025-11-22T10:30:00Z"
  }
  ```
- [ ] Configure UptimeRobot to monitor this endpoint

---

## Phase 4.10: Final Testing & Launch

### Pre-Launch Checklist
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Load tests passing (acceptable performance)
- [ ] Security audit completed
- [ ] API documentation complete
- [ ] Deployment documentation complete
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Backups configured
- [ ] Error tracking configured (Sentry)

### Smoke Tests on Production
- [ ] Test: Login to admin panel
- [ ] Test: Generate quote via API
- [ ] Test: Poll quote status
- [ ] Test: View quote preview
- [ ] Test: Support agent login
- [ ] Test: Validate quote (check email in SendGrid)
- [ ] Test: Approve quote
- [ ] Test: Health check endpoint

### Performance Validation
- [ ] Load test production environment
- [ ] Verify response times acceptable
- [ ] Verify database performance
- [ ] Verify Celery processing quotes

### Launch
- [ ] Final code review
- [ ] Merge to main branch
- [ ] Tag release: `v1.0.0`
- [ ] Deploy to production
- [ ] Monitor for first 24 hours
- [ ] Fix any critical issues immediately

---

## Sprint 4 Deliverables Checklist

- [ ] Support dashboard APIs complete
- [ ] Authentication & authorization working
- [ ] Quote queue endpoint with filtering/searching
- [ ] Quote validation/rejection endpoints
- [ ] Django admin customized
- [ ] Security hardening complete
- [ ] All tests passing
- [ ] Production Docker configuration
- [ ] Nginx reverse proxy configured
- [ ] Deployed to VPS
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] Backup strategy implemented
- [ ] System running stable in production

---

## Definition of Done

- [ ] All tasks above completed
- [ ] Code reviewed
- [ ] Tests passing (>80% coverage)
- [ ] Security audit passed
- [ ] Performance tests passed
- [ ] Deployed to production VPS
- [ ] SSL certificate valid
- [ ] Monitoring alerts configured
- [ ] Documentation complete and accurate
- [ ] Support agents trained (if applicable)
- [ ] Post-launch monitoring for 24 hours
- [ ] No critical issues

---

## Notes & Risks

**Risks:**
- Production deployment issues (mitigate: test on staging first)
- Database migration failures (mitigate: backup before deploy, test rollback)
- SSL certificate issues (mitigate: test certbot renewal)
- Performance issues under load (mitigate: load testing, monitoring)
- Security vulnerabilities (mitigate: security audit, penetration testing)

**Dependencies:**
- Sprint 1, 2 & 3 must be completed
- VPS access required
- Domain name configured (DNS)
- SendGrid account (production email)
- AUTOBOLT API credentials (if using real API)

**Estimated Effort:**
- 40-45 hours for one developer
- 5-7 days with focused work

**Post-Launch:**
- Monitor error rates
- Monitor performance metrics
- Gather user feedback
- Plan Sprint 5 (React frontend) or enhancements

---

## Success Metrics

After Sprint 4, the system should achieve:
- ✅ 100+ quotes generated per day (load test capacity)
- ✅ <5% error rate
- ✅ p95 response time <500ms (except async quote generation)
- ✅ Support agents can validate quotes in <2 minutes
- ✅ <24hr quote validation SLA met
- ✅ 99.9% uptime
- ✅ Zero critical security vulnerabilities
