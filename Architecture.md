## **File 2: architecture.md**

```markdown
# System Architecture: Auto Glass Quote Generation MVP

## 1. System Overview

### Architecture Pattern
**Microservices-lite**: Modular Django apps with clear bounded contexts, deployed as single container but logically separated for maintainability.

### Core Tenets
- **API-first**: All functionality exposed via RESTful JSON APIs
- **Event-driven**: Async processing for external API calls (NAGS, Email)
- **State machine**: Explicit quote lifecycle with django-fsm
- **Idempotency**: webhook endpoints are safe to retry

---

## 2. Technology Stack

### Backend
| Component | Technology | Justification |
|-----------|------------|---------------|
| **Web Framework** | Django 5.0 + DRF | Batteries-included auth, ORM, admin; DRF for rapid API dev |
| **Async Workers** | Celery 5.3 + Redis | Mature task queue, simple integration, reliable retry logic |
| **Database** | PostgreSQL 15 | ACID compliance, GIS extensions for future radius search |
| **Cache** | Redis 7 | Session store, NAGS cache, Celery broker |
| **Authentication** | Django Allauth + DRF SessionAuth | Secure session cookies, no JWT complexity for MVP |
| **Validation** | Django Forms + DRF Serializers | Server-side validation prevents malformed data |
| **API Docs** | DRF Browsable API + drf-spectacular | Auto-generated OpenAPI specs for frontend dev |

### Frontend
| Component | Technology | Justification |
|-----------|------------|---------------|
| **Framework** | React 18 + Vite | Fast dev server, component-based, easy to hire for |
| **HTTP Client** | TanStack Query + Axios | Robust data fetching, caching, background refetch |
| **Styling** | Tailwind CSS | Rapid UI development, no CSS boilerplate |
| **State Mgmt** | Zustand | Lightweight, no Redux boilerplate |
| **Forms** | React Hook Form + Zod | Type-safe validation, easy to validate against DRF serializers |

### Infrastructure
| Component | Technology | Justification |
|-----------|------------|---------------|
| **Containerization** | Docker Compose | Local dev parity, easy deployment to PaaS |
| **CI/CD** | GitHub Actions | Free for public repos, integrates with Render/Railway |
| **Hosting** | Render/Railway | Docker-native, managed PostgreSQL/Redis, $0-20/month for MVP |
| **Monitoring** | Sentry | Free tier for error tracking |
| **Email** | SendGrid (100 emails/day free) | Reliable delivery, SMTP interface |
| **SMS** | Twilio (Phase 2) | Pay-as-you-go, reliable delivery |

---

## 3. Service Architecture

### Component Diagram
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Browser)                       │
│  [React App] ←→ [VAPI Phone AI] ←→ [Quote Email Link]               │
└─────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway Layer                           │
│  Django/DRF Endpoints                                               │
│  - /api/quotes/* (Public)                                           │
│  - /api/support/* (Authenticated)                                   │
│  - /webhooks/vapi/ (Signed)                                         │
└─────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Application Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Quote       │  │  Vehicle     │  │  Pricing     │            │
│  │  Service     │  │  Service     │  │  Service     │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                  │                    │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐               │
│  │ Quote Model │  │ VIN Valid.  │  │ NAGS Client │               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │
└─────────┼─────────────────┼─────────────────┼──────────────────────┘
│                 │                 │
▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Infrastructure Layer                        │
│  PostgreSQL (Primary)  Redis (Cache/Queue)  SendGrid/SMTP          │
└─────────────────────────────────────────────────────────────────────┘
Copy

---

## 4. Django App Structure
core/                           # Project settings
├── settings.py
├── celery.py
└── urls.py
customers/                      # Customer data
├── models.py (Customer)
├── api/
│   ├── serializers.py
│   └── views.py
vehicles/                       # Vehicle identification
├── models.py (Vehicle)
├── services.py (VIN validation)
└── api/
quotes/                         # Core quote lifecycle
├── models.py (Quote, QuoteStateLog)
├── services.py (QuoteGenerator)
├── tasks.py (Celery tasks)
├── api/
│   ├── serializers.py
│   └── views.py (GenerateQuoteView, QuoteStatusView)
└── admin.py (QuoteAdmin)
pricing/                        # Pricing rules
├── models.py (PricingConfig, FeeRule)
└── services.py (NAGSClient, PriceCalculator)
shops/                          # Shop network & service areas
├── models.py (Shop, ServiceArea)
└── admin.py
support_dashboard/              # Support tools
├── api/
│   └── views.py (ValidateQuoteView, BulkActionsView)
└── admin.py (custom actions)
webhooks/                       # External integrations
├── views.py (VapiWebhookView)
└── tasks.py (ProcessVapiCall)
Copy

---

## 5. API Endpoints

### Public Endpoints (No Auth)
```http
POST   /api/quotes/generate/          # Trigger quote generation
GET    /api/quotes/status/{task_id}/  # Poll async status
POST   /api/quotes/approve/{token}/   # Customer approves (email link)
GET    /api/shops/nearby/?zip={zip}   # Get shops for ZIP
Authenticated Endpoints (Support)
http
Copy
GET    /api/support/quotes/?state=pending_validation  # Quote queue
PATCH  /api/support/quotes/{id}/validate/              # Validate & send
PATCH  /api/support/quotes/{id}/reject/                # Reject with reason
POST   /api/support/quotes/{id}/custom-item/           # Add manual line item
GET    /api/support/customers/{id}/                    # View customer
Webhook Endpoints (Signed)
http
Copy
POST   /webhooks/vapi/            # VAPI call transcript
POST   /webhooks/sendgrid/        # Email delivery status
6. Data Models
Core Models
Python
Copy
# quotes/models.py
class Quote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    vin = models.CharField(max_length=17, validators=[validate_vin])
    vehicle_info = models.JSONField()  # Store NAGS response
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT)
    postal_code = models.CharField(max_length=7)
    
    # Pricing
    part_cost = models.DecimalField(max_digits=8, decimal_places=2)
    labor_cost = models.DecimalField(max_digits=8, decimal_places=2)
    fees = models.JSONField()  # {'env': 5.00, 'disposal': 10.00}
    total_price = models.DecimalField(max_digits=8, decimal_places=2)
    
    # State machine
    STATE_CHOICES = [
        ('draft', 'Draft'),
        ('pending_validation', 'Pending Validation'),
        ('sent', 'Sent to Customer'),
        ('customer_approved', 'Customer Approved'),
        ('scheduled', 'Appointment Scheduled'),
        ('converted', 'Converted to Job'),
        ('expired', 'Expired'),
        ('rejected', 'Rejected'),
    ]
    state = FSMField(default='draft')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    source = models.CharField(choices=[('website', 'Website'), ('vapi', 'VAPI Call')])
    task_id = models.CharField(max_length=255, blank=True)  # Celery tracking
    
    class Meta:
        indexes = [
            models.Index(fields=['state', 'created_at']),
            models.Index(fields=['postal_code']),
        ]

class QuoteStateLog(models.Model):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='logs')
    from_state = models.CharField(max_length=20)
    to_state = models.CharField(max_length=20)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

# shops/models.py
class Shop(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    location = models.PointField(srid=4326)  # PostGIS for radius search
    
class ServiceArea(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE)
    postal_code = models.CharField(max_length=7, db_index=True)
    is_active = models.BooleanField(default=True)
7. Async Task Flow
Quote Generation Task
Python
Copy
# quotes/tasks.py
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_quote_task(self, vin, postal_code, customer_email):
    """Async quote generation to avoid blocking HTTP request"""
    try:
        # 1. Validate serviceability
        if not ShopService.is_serviceable(postal_code):
            send_unserviceable_notification.delay(customer_email)
            return None
        
        # 2. Fetch from NAGS (slow, ~3s)
        vehicle_data = NAGSClient().lookup_vin(vin)
        
        # 3. Calculate pricing
        pricing = PricingService.calculate(vin, postal_code, vehicle_data)
        
        # 4. Create quote
        quote = Quote.objects.create(
            vin=vin,
            vehicle_info=vehicle_data,
            customer=Customer.objects.get(email=customer_email),
            postal_code=postal_code,
            **pricing,
            source='website'
        )
        
        # 5. Notify support
        notify_support_queue.delay(quote.id)
        
        # 6. Send quote email
        send_quote_email.delay(quote.id)
        
        return quote.id
        
    except NAGSError as e:
        # Retry on NAGS timeout
        raise self.retry(exc=e)
VAPI Webhook Processing
Python
Copy
# webhooks/tasks.py
@shared_task
def process_vapi_transcript(call_id, transcript, customer_phone):
    """Process AI call transcript"""
    vin = extract_vin(transcript)
    
    if vin:
        quote_task = generate_quote_task.delay(
            vin=vin,
            postal_code='AUTO',  # Derive from caller area code
            customer_email=f'unknown_{call_id}@placeholder.com'
        )
        
        # Update quote with VAPI source later
        Quote.objects.filter(task_id=quote_task.id).update(source='vapi')
        
        # Send SMS with quote link
        send_sms.delay(
            phone=customer_phone,
            message=f"Quote: {settings.FRONTEND_URL}/quote/{quote_task.id}"
        )
8. Deployment Architecture
Docker Compose Services
yaml
Copy
services:
  db:         # PostgreSQL 15
  redis:      # Redis 7 (broker + cache)
  backend:    # Django + Gunicorn
  celery:     # Celery workers (scale: 2-3 for MVP)
  frontend:   # React + Vite (optional, can deploy separately)
Production Setup
bash
Copy
# Build for production
docker-compose -f docker-compose.prod.yml up -d

# Backup database nightly
docker-compose exec db pg_dump autoglass_db > backup.sql

# Monitor Celery queue length
docker-compose exec redis redis-cli LLEN celery
Scaling Strategy
Horizontal: Increase celery replicas for quote processing
Vertical: Gunicorn workers = 2-4 × CPU cores
Cache: Redis LRU eviction for NAGS responses (max 10k keys)
9. Security Considerations
Authentication
Customers: Session-based (no JWT needed for MVP)
Support: Django admin + API, IP whitelist recommended
VAPI Webhooks: HMAC-SHA256 verification
Rate Limiting (DRF Throttling)
Python
Copy
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
    'rest_framework.throttling.AnonRateThrottle',
]
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '10/min',  # Quote generation
}
Data Protection
VINs considered PII → encrypt at rest (pgcrypto extension)
Customer emails hashed for analytics
NAGS API keys in .env, never committed
Admin access behind VPN (Render/Railway private networking)
10. Monitoring & Observability
Logging
Python
Copy
# core/settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'quotes.tasks': {'level': 'INFO', 'handlers': ['console']},
        'pricing.nags': {'level': 'DEBUG'},  # Log all NAGS calls
    },
}
Key Metrics
Quote Generation Latency: p95 < 3s
NAGS API Error Rate: < 1%
Support Validation Time: Median < 2 hours
Expired Quote Rate: < 20%
Error Tracking
Sentry: Capture exceptions in Celery tasks, API endpoints
SendGrid: Monitor email bounce rates
11. Development Workflow
Local Setup (5 minutes)
bash
Copy
git clone <repo>
cd autoglass-quote-api
cp .env.example .env
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
Git Branching
main: Production-ready, protected branch
develop: Integration branch for testing
feature/{module}: Individual app development
Testing
bash
Copy
# Run tests
docker-compose exec backend python manage.py test

# Test coverage
docker-compose exec backend coverage run --source='.' manage.py test
12. Known Technical Debt (Post-MVP)
NAGS Caching: Implement Redis TTL with cache-aside pattern
Pagination: Add cursor-based pagination for large quote queues
API Versioning: Prefix with /api/v1/ for future breaking changes
Database Migrations: Zero-downtime migrations (use django-migration-linter)
Observability: Replace logging with OpenTelemetry
Worker Scaling: Move from Celery to Temporal.io for complex workflows