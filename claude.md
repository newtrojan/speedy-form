# Auto Glass Quote Generation System - AI Context Reference

**Last Updated:** 2025-01-22
**Status:** Backend Complete - Frontend Bootstrapped

---

## Project Overview

**Purpose:** Self-service online quote generation system for auto glass replacement. Enables vehicle owners to receive instant quotes through VIN lookup, validates serviceability by location, and manages quote lifecycle through support teams.

**Business Model:** B2C auto glass replacement with multi-shop network support, insurance integration, and both mobile and in-store service options.

**Key Goals:**

- Instant quote generation via VIN identification
- Geographic serviceability validation (mobile and in-store)
- Dynamic pricing with shop-specific rules and insurance support
- State machine-driven quote lifecycle
- Support dashboard for quote validation and customer management
- Async processing for performance
- Secure approval workflow via email tokens

---

## Tech Stack Summary

### Backend (`/backend`)

- **Framework:** Django 5.1 + Django REST Framework 3.15.2
- **Python:** 3.11
- **Database:** PostgreSQL 15 + PostGIS (geographic queries)
- **Cache/Queue:** Redis 7.0 + Celery 5.4.0 (async tasks)
- **State Machine:** django-fsm 3.0.0 (quote lifecycle)
- **Auth:** JWT (djangorestframework-simplejwt 5.3.1)
- **API Docs:** drf-spectacular 0.27.2 (OpenAPI/Swagger)
- **Email:** Nodemailer + Django templates
- **WSGI:** Gunicorn (production)
- **Testing:** pytest 8.2.0 + pytest-django 4.8.0
- **Code Quality:** black, flake8, mypy (type checking)

### Frontend (`/frontend`)

- **Framework:** React 19.2.0 + TypeScript 5.9.3
- **Build Tool:** Vite 7.2.4
- **Routing:** React Router v7.9.6
- **State:** TanStack Query 5.90.10 (server) + Zustand (client, to be added)
- **Forms:** React Hook Form 7.66.1 + Zod 4.1.12
- **UI:** Tailwind CSS 4.1.17
- **HTTP:** Axios 1.13.2
- **Testing:** Vitest + Testing Library (to be added)

### Infrastructure

- **Containerization:** Docker + Docker Compose
- **Services:** PostgreSQL (PostGIS), Redis, Celery workers, Celery beat, MailHog
- **Dev Server:** Vite on port 3333, Django on port 8000
- **Email Testing:** MailHog on port 8025

---

## Modern JavaScript/TypeScript Standards (ESM)

**⚡ IMPORTANT: Frontend uses ONLY modern ES standards - no legacy patterns.**

### ES Modules (ESM) - Required

```json
// package.json
"type": "module"

// tsconfig.json
"module": "ESNext"
"moduleResolution": "bundler"
"target": "ES2020"
```

### Modern Syntax - Required

✅ **Use:**

- `import/export` (ESM)
- `async/await` (promises)
- Arrow functions `() => {}`
- Template literals `` `${var}` ``
- Destructuring `const { foo } = obj`
- Optional chaining `obj?.prop`
- Nullish coalescing `value ?? default`
- Spread operator `...array`

❌ **Never Use:**

- `require()`/`module.exports` (CommonJS)
- `.then()/.catch()` (use async/await)
- `var` keyword
- String concatenation with `+`

### TypeScript Configuration

- **Strict Mode:** Enabled with additional safety checks
- **React 19 JSX:** `"jsx": "react-jsx"` (automatic JSX transform)
- **Bundler Resolution:** `"moduleResolution": "bundler"` (Vite-optimized)
- **Path Aliases:** `@/*` maps to `./src/*`
- **Type Safety:** `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`

---

## Architecture Principles

### Backend - Service Layer + State Machine

- **Service Layer Pattern:** Business logic isolated in service classes (e.g., `PricingCalculator`, `ServiceabilityService`, `VehicleService`)
- **Repository Pattern:** Django ORM as abstraction, no raw queries
- **State Machine:** django-fsm for explicit quote lifecycle transitions with guards
- **Async Processing:** Celery for long-running tasks (quote generation, email sending)
- **Event Sourcing (partial):** QuoteStateLog for immutable audit trail
- **API-First Design:** All functionality exposed via REST API

### Frontend - Feature-Based (Bootstrapped, Not Implemented)

- **Feature Modules:** Co-located components, hooks, services (auth, quotes, support)
- **TanStack Query:** Server state with caching and sync
- **React Hook Form + Zod:** Type-safe form validation matching backend
- **Atomic Design:** Reusable UI components with Tailwind
- **ESM-First:** Modern ES modules, bundler resolution, React 19 JSX transform

### Django App Structure (Modular)

- **8 Apps:** core, customers, vehicles, shops, pricing, quotes, support_dashboard, webhooks
- **Clear Boundaries:** Each app owns its domain logic
- **Shared Services:** Cross-app logic in service classes

---

## Directory Structure

```
/
├── claude.md                      # This file (AI context)
├── README.md                      # Main documentation
├── docker-compose.yml             # Development environment
│
├── backend/                       # Django backend
│   ├── src/
│   │   ├── core/                 # Project config & shared utilities
│   │   │   ├── settings/         # Settings split (base, dev, prod)
│   │   │   ├── celery.py        # Celery configuration
│   │   │   ├── services/        # EmailService, base service class
│   │   │   ├── permissions.py   # IsSupportAgent, IsCustomerOwner
│   │   │   └── views/           # Auth views (Login, Refresh, Logout)
│   │   ├── customers/            # Customer management
│   │   │   ├── models.py        # Customer with geolocation
│   │   │   └── admin.py
│   │   ├── vehicles/             # VIN identification
│   │   │   ├── models.py        # MockVehicleData
│   │   │   ├── services.py      # VehicleService (VIN lookup)
│   │   │   └── validators.py   # VIN/license plate validation
│   │   ├── shops/                # Shop network & serviceability
│   │   │   ├── models.py        # Shop, ServiceArea
│   │   │   └── services.py      # ServiceabilityService
│   │   ├── pricing/              # Pricing engine
│   │   │   ├── models.py        # PricingConfig, InsuranceProvider, ShopPricingRule
│   │   │   └── services.py      # PricingCalculator
│   │   ├── quotes/               # Core quote lifecycle
│   │   │   ├── models.py        # Quote (FSM), QuoteLineItem, QuoteStateLog
│   │   │   ├── views.py         # Public API (generate, approve, preview)
│   │   │   ├── tasks.py         # Celery tasks (generate_quote_task)
│   │   │   └── admin.py         # Rich admin interface
│   │   ├── support_dashboard/    # Support agent tools
│   │   │   └── views.py         # Queue, validate, reject, modify
│   │   ├── webhooks/             # External integrations (VAPI placeholder)
│   │   ├── manage.py
│   │   └── requirements.txt
│   ├── prisma/                   # (Not applicable - Django uses migrations)
│   ├── templates/                # Email templates
│   │   └── emails/
│   └── tests/                    # Integration & unit tests
│
├── frontend/                      # React frontend (BOOTSTRAPPED)
│   ├── src/
│   │   ├── api/                  # Axios client + API services (client.ts configured)
│   │   ├── components/           # Shared components
│   │   │   ├── ui/              # Reusable UI (empty, to be built)
│   │   │   └── layout/          # Header, Sidebar (empty)
│   │   ├── features/             # Feature modules (empty scaffolds)
│   │   │   ├── auth/            # Login, auth context
│   │   │   ├── quotes/          # Quote generation flow
│   │   │   └── support/         # Support dashboard
│   │   ├── lib/                  # Utilities (env validation with Zod)
│   │   ├── pages/                # Page components (empty)
│   │   ├── schemas/              # Zod validation schemas (empty)
│   │   ├── types/                # TypeScript types (empty)
│   │   ├── App.tsx              # Root component (placeholder route)
│   │   ├── main.tsx             # Entry point (TanStack Query configured)
│   │   └── index.css            # Global styles with Tailwind
│   ├── Dockerfile               # Development Dockerfile
│   ├── vite.config.ts           # Vite configuration (port 3333)
│   ├── tsconfig.json            # TypeScript strict mode
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── package.json
│   └── .env.example
│
└── .github/
    └── workflows/                # CI/CD (to be added)
```

---

## Key Architecture Decisions

### 1. Quote Lifecycle (State Machine)

- **Pattern:** django-fsm for explicit state transitions with guards
- **States:** draft → pending_validation → sent → customer_approved → scheduled → converted (also: expired, rejected)
- **Audit:** QuoteStateLog tracks all transitions with user and timestamp
- **Guards:** State transitions validate preconditions before executing

### 2. Pricing Engine

- **Multi-Manufacturer:** NAGS/PGW price lookup
- **Shop Rules:** Percentage discount, fixed discount, fixed price, manufacturer-specific
- **Insurance:** Provider-specific multipliers and pre-approval tracking
- **Calculation:** Part cost + labor (complexity-based) + fees + markup
- **Fees:** Environmental ($5), disposal ($10), mobile (tiered: $25/$50/$75 based on distance)

### 3. Geographic Serviceability

- **PostGIS:** PointField for shop and customer locations
- **Mobile Service:** Distance-based shop selection within radius (≤50 miles)
- **In-Store:** Postal code coverage via ServiceArea model
- **Geocoding:** Postal code → coordinates for distance calculations

### 4. Async Processing (Celery)

- **Broker:** Redis
- **Tasks:** Quote generation, email sending
- **Scheduled:** `expire_old_quotes` runs daily at midnight
- **Retry Logic:** Max 3 retries, 60s delay

### 5. Authentication & Authorization

- **JWT:** Access token (1hr), refresh token (7 days) with rotation
- **Token Blacklisting:** Logout invalidates refresh token
- **Approval Tokens:** SHA256 hashed, 24hr expiration for email approvals
- **Permissions:** Role-based (IsSupportAgent, IsSupportOrAdmin, IsCustomerOwner)
- **Rate Limiting:** 100/day anon, 1000/day authenticated

### 6. API Versioning

- **Pattern:** URI versioning (`/api/v1/`)
- **Implementation:** Django REST Framework global versioning
- **Docs:** OpenAPI/Swagger at `/api/docs/`

---

## Backend Guide

### Django Apps & Responsibilities

**core/** - Configuration & shared utilities

- Settings split (base, dev, prod)
- Celery configuration with beat scheduler
- Base service class for business logic
- Global permissions (IsSupportAgent, IsSupportOrAdmin, IsCustomerOwner)
- Auth views (Login, Refresh, Logout, CurrentUser)
- EmailService for notifications
- Health check endpoint

**customers/** - Customer management

- Model: Customer with geolocation (PointField)
- Analytics: total_jobs, total_spent
- Indexes: email, postal_code

**vehicles/** - Vehicle identification

- Model: MockVehicleData (for development/testing)
- Service: VehicleService (VIN lookup with AUTOBOLT API integration)
- Validators: VIN checksum, license plate format

**shops/** - Shop network & serviceability

- Models: Shop (with GIS coordinates), ServiceArea (postal code coverage)
- Service: ServiceabilityService (geocoding, radius checks, shop selection)

**pricing/** - Pricing engine

- Models: PricingConfig (global rules), InsuranceProvider, ShopPricingRule
- Service: PricingCalculator (NAGS/PGW lookup, markup, labor, fees)

**quotes/** - Core quote lifecycle

- Models: Quote (FSM state machine), QuoteLineItem, QuoteStateLog
- Views: GenerateQuoteView, QuoteStatusView, QuotePreviewView, ApproveQuoteView
- Tasks: generate_quote_task, send_quote_email, expire_old_quotes
- Admin: Rich interface with state badges, bulk actions, CSV export

**support_dashboard/** - Support agent tools

- Views: QuoteQueueView, QuoteDetailView, QuoteModifyView, ValidateQuoteView, RejectQuoteView, CustomerDetailView
- All views require IsSupportAgent permission

**webhooks/** - External integrations

- Placeholder for VAPI (voice AI) integration

### Quote State Machine (FSM)

**States:**

```
draft → pending_validation → sent → customer_approved → scheduled → converted
                           ↘ expired
                           ↘ rejected
```

**Transitions (django-fsm):**

- `submit_for_validation()` - draft → pending_validation
- `send_to_customer()` - pending_validation → sent
- `customer_approve()` - sent → customer_approved
- `schedule_appointment()` - customer_approved → scheduled
- `convert_to_job()` - scheduled → converted
- `expire_quote()` - sent/pending_validation → expired
- `reject_quote()` - pending_validation → rejected

**Pattern:** All transitions are methods on Quote model, decorated with `@fsm.transition()`

### API Endpoints

**Public (No Auth):**

```
POST   /api/v1/quotes/generate/              # Start async quote generation
GET    /api/v1/quotes/status/{task_id}/      # Poll task status
GET    /api/v1/quotes/{quote_id}/preview/    # View quote details
POST   /api/v1/quotes/{quote_id}/approve/    # Approve with token
POST   /api/v1/vehicles/identify/            # VIN lookup
POST   /api/v1/shops/check-in-store/         # In-store serviceability
POST   /api/v1/shops/check-mobile/           # Mobile serviceability
```

**Authentication:**

```
POST   /api/v1/auth/login/                   # JWT login
POST   /api/v1/auth/refresh/                 # Refresh token
POST   /api/v1/auth/logout/                  # Blacklist token
GET    /api/v1/auth/me/                      # Current user info
```

**Support (IsSupportAgent):**

```
GET    /api/v1/support/quotes/               # Quote queue (filterable)
GET    /api/v1/support/quotes/{id}/          # Quote details
PATCH  /api/v1/support/quotes/{id}/          # Modify quote
POST   /api/v1/support/quotes/{id}/validate/ # Validate & send
POST   /api/v1/support/quotes/{id}/reject/   # Reject with reason
GET    /api/v1/support/customers/{id}/       # Customer details
```

**API Docs:**

```
GET    /api/schema/                          # OpenAPI schema
GET    /api/docs/                            # Swagger UI
GET    /api/redoc/                           # ReDoc UI
```

### Service Layer Pattern

**Service Classes:** Business logic lives in services, not models or views

```python
# vehicles/services.py
class VehicleService:
    def identify_by_vin(vin: str) -> dict

# shops/services.py
class ServiceabilityService:
    def check_mobile_serviceability(postal_code: str) -> dict

# pricing/services.py
class PricingCalculator:
    def calculate_quote(vehicle_data: dict, shop: Shop) -> dict

# core/services/email_service.py
class EmailService:
    def send_quote_email(quote: Quote) -> None
```

**Pattern:** Controllers (views) → Services → Repositories (ORM)

### Celery Tasks

**Tasks:**

```python
# quotes/tasks.py
@shared_task
def generate_quote_task(quote_data: dict) -> str:
    # 1. Validate VIN
    # 2. Check serviceability
    # 3. Calculate pricing
    # 4. Create quote
    # 5. Send email
    return quote_id

@shared_task
def send_quote_email(quote_id: str) -> None:
    # Send email with approval link

@periodic_task(crontab(hour=0, minute=0))
def expire_old_quotes() -> None:
    # Daily expiration check
```

**Usage:**

```python
task = generate_quote_task.delay(data)
task_id = task.id  # Return to frontend for polling
```

### Database Schema

**Key Models & Relationships:**

```
Customer (1) → (M) Quote (M) → (1) Shop
Quote (1) → (M) QuoteLineItem
Quote (1) → (M) QuoteStateLog (audit trail)
Quote (M) → (1) InsuranceProvider [optional]
Shop (1) → (M) ServiceArea
Shop (1) → (M) ShopPricingRule
```

**Indexes for Performance:**

- `customers.Customer`: email, postal_code
- `quotes.Quote`: (state, created_at), (postal_code, service_type)
- `shops.ServiceArea`: postal_code, (shop, postal_code)

**PostGIS Fields:**

- `customers.Customer.location`: PointField (SRID 4326)
- `shops.Shop.location`: PointField (SRID 4326)

---

## Frontend Guide

### Tech Stack

- **Framework:** React 19.2 + TypeScript 5.9 (strict mode)
- **Build:** Vite 7.2 (dev server on port 3333)
- **Routing:** React Router v7
- **Data Fetching:** TanStack Query (staleTime: 5min, refetchOnWindowFocus: false)
- **Forms:** React Hook Form + Zod
- **Styling:** Tailwind CSS 4.1
- **HTTP:** Axios (baseURL from env, JWT auto-injected)

### Project Structure

```
src/
├── api/           # Axios client + API services
│   └── client.ts  # Configured with JWT interceptor
├── components/    # Reusable UI (empty, to be built)
│   ├── ui/        # Button, Input, Card, etc.
│   └── layout/    # Header, Sidebar
├── features/      # Feature modules (empty scaffolds)
│   ├── auth/      # Login, auth context
│   ├── quotes/    # Quote generation flow
│   └── support/   # Support dashboard
├── lib/           # Utilities
│   └── env.ts     # Zod-validated environment variables
├── pages/         # Page components (empty)
├── schemas/       # Zod validation schemas (empty)
├── types/         # TypeScript types (empty)
├── App.tsx        # Root component (placeholder route)
├── main.tsx       # Entry (TanStack Query configured)
└── index.css      # Global styles with Tailwind
```

### API Integration Pattern

**Axios Client:** `/src/api/client.ts`

```typescript
// Request Interceptor: Adds Bearer token from localStorage
// Response Interceptor: 401 → clear tokens, redirect to /login
```

**TanStack Query Usage:**

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["quotes", id],
  queryFn: () => quotesApi.getQuote(id),
});
```

### Form Handling

**React Hook Form + Zod:**

```typescript
const schema = z.object({
  vin: z.string().length(17, "VIN must be 17 characters"),
  postalCode: z.string().regex(/^\d{5}$/, "Invalid ZIP code"),
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

### Authentication Flow

- **Token Storage:** localStorage (access_token, refresh_token)
- **Auto-Injection:** Axios interceptor adds Bearer token to all requests
- **401 Handling:** Clear tokens, redirect to /login
- **Token Refresh:** Not implemented yet (manual refresh endpoint available)

### Routes (To Implement)

- `/` - Public quote generation
- `/quotes/approve/:token` - Email approval link
- `/support/*` - Protected support dashboard (requires auth)
- `/login` - Authentication page

### Current Status

**Bootstrapped, Not Implemented:**

- All tooling and configuration is set up correctly
- Directory structure follows best practices
- No business logic implemented yet
- Only a placeholder homepage exists
- Feature directories are empty scaffolds

**Next Steps:**

1. Type definitions based on backend models
2. API service layer
3. Quote generation flow
4. Authentication
5. Support dashboard

---

## Development Workflow

### Local Setup

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configure .env with PostgreSQL and Redis
python manage.py migrate
python manage.py seed_data           # Seed shops, pricing, service areas
python manage.py create_test_users   # admin/admin123, support1/support1123
python manage.py runserver
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev  # http://localhost:3333
```

**Docker (Recommended):**

```bash
docker-compose up  # Starts all services
```

### Test Users

```
admin      / admin123       # Admin user
support1   / support1123    # Support agent
customer1  / customer1123   # Customer
```

### Database Seeding

```bash
python manage.py seed_data            # Shops, pricing, service areas
python manage.py seed_mock_vehicles   # Sample vehicles
python manage.py create_test_users    # Test users
```

### Email Testing

- **MailHog:** http://localhost:8025 (captures all emails in dev)

---

## Security Features

- **Input Validation:** DRF serializers (backend), Zod (frontend)
- **SQL Injection Prevention:** Django ORM parameterized queries
- **XSS Prevention:** Django template escaping, React escaping
- **Rate Limiting:** Redis-backed, distributed (100/day anon, 1000/day auth)
- **JWT Security:** 1hr access tokens, 7-day refresh tokens, blacklisting
- **Approval Tokens:** SHA256 hashed, 24hr expiration, constant-time comparison
- **CORS:** Configured for localhost (dev), restrictive (prod)
- **Permissions:** Role-based (IsSupportAgent, IsSupportOrAdmin, IsCustomerOwner)

---

## Quick Commands

### Backend

```bash
python manage.py runserver              # Dev server
python manage.py migrate                # Run migrations
python manage.py makemigrations         # Create migrations
python manage.py shell                  # Django shell
python manage.py test                   # Run tests
python manage.py seed_data              # Seed database
python manage.py create_test_users      # Create test users
celery -A core worker -l info           # Start Celery worker
celery -A core beat -l info             # Start Celery beat
```

### Frontend

```bash
npm run dev            # Dev server (port 3333)
npm run build          # Production build (includes type-check)
npm run preview        # Preview production build
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format with Prettier
npm run format:check   # Check formatting without changes
npm run type-check     # TypeScript type checking
npm run validate       # Run all checks (type-check + lint + format:check)
```

### Docker

```bash
docker-compose up                       # Start all services
docker-compose up -d                    # Start in background
docker-compose down                     # Stop all services
docker-compose logs -f backend          # Follow backend logs
docker-compose exec backend python manage.py shell  # Django shell
```

### Git Workflow

```bash
# Commit format (conventional commits)
feat: add quote approval flow
fix: resolve VIN validation issue
docs: update API documentation
refactor: extract pricing logic to service
test: add unit tests for PricingCalculator
chore: update dependencies
```

---

## Important Notes for AI

1. **ESM Modules** - Frontend uses ONLY modern ES modules (`import/export`), never CommonJS (`require`). Use `async/await`, not `.then()/.catch()`
2. **Type Safety** - Backend: Type hints everywhere, mypy validation. Frontend: Strict TypeScript, no `any`, run `npm run validate` before commits
3. **Service Layer Pattern** - Business logic in services (VehicleService, PricingCalculator, etc.), not models or views
4. **FSM Transitions** - Always use state machine methods (`quote.send_to_customer()`), never set state directly
5. **PostGIS Queries** - Use `Distance` function for geographic queries, always check SRID 4326
6. **Celery Tasks** - Long-running operations (quote generation, emails) must use Celery
7. **Token Security** - Approval tokens are SHA256 hashed, use constant-time comparison
8. **API Polling** - Frontend polls `/api/quotes/status/{task_id}` for async quote generation results
9. **TanStack Query** - Use for ALL API calls on frontend, leverages caching and sync
10. **React Hook Form + Zod** - Use for ALL forms, matches backend DRF validation patterns
11. **Frontend Quality Checks** - Run `npm run validate` (type-check + lint + format:check) before commits
12. **Path Aliases** - Use `@/` for imports (e.g., `import { env } from '@/lib/env'`)
13. **React 19 JSX** - No need to import React in components, uses automatic JSX transform
14. **State Machine Guards** - FSM transitions validate preconditions, don't bypass them
15. **Environment Variables** - Never commit `.env`, always use `.env.example` template

---

## Current Phase

**Phase:** Backend Complete → Frontend Implementation

**Backend Accomplishments:**

1. ✅ 8 Django apps with clear domain boundaries
2. ✅ Quote state machine with FSM
3. ✅ Async quote generation with Celery
4. ✅ Dynamic pricing engine with shop rules
5. ✅ PostGIS-based serviceability checking
6. ✅ JWT authentication with token rotation
7. ✅ Support dashboard API
8. ✅ Email approval workflow
9. ✅ Rich admin interface
10. ✅ Integration tests for full quote flow

**Frontend Status:**

- ✅ Vite + React 19 + TypeScript configured
- ✅ TanStack Query + Axios configured
- ✅ Tailwind CSS configured
- ✅ React Hook Form + Zod installed
- ✅ ESLint + Prettier configured
- ❌ Business logic not implemented (empty scaffolds)

**Next Steps:**

1. Create TypeScript types based on backend models
2. Implement API service layer (quotes, shops, vehicles, support)
3. Build quote generation flow (VIN input, quote display)
4. Build quote approval page (email link landing)
5. Build authentication (login, protected routes)
6. Build support dashboard (queue, validation, customer view)
7. Add UI component library (custom or shadcn/ui)
8. Add error handling and toast notifications
9. Add E2E tests with Playwright

---

## References

### Backend

- **Django Apps:** `/backend/src/<app>/` (8 apps: core, customers, vehicles, shops, pricing, quotes, support_dashboard, webhooks)
- **Settings:** `/backend/src/core/settings/` (base.py, dev.py, prod.py)
- **Services:** `/backend/src/<app>/services.py` (business logic)
- **State Machine:** `/backend/src/quotes/models.py` (Quote model with FSM)
- **Celery:** `/backend/src/core/celery.py`, `/backend/src/quotes/tasks.py`
- **Tests:** `/backend/tests/` (integration tests)

### Frontend

- **API Client:** `/frontend/src/api/client.ts` (Axios with JWT interceptor)
- **Features:** `/frontend/src/features/` (auth, quotes, support - empty scaffolds)
- **Environment:** `/frontend/src/lib/env.ts` (Zod-validated env vars)
- **Tailwind:** `/frontend/tailwind.config.js`
- **Security:** `/frontend/SECURITY.md` (Security best practices & checklist)

### Docker

- **Compose:** `/docker-compose.yml`
- **Backend Dockerfile:** `/backend/Dockerfile`
- **Frontend Dockerfile:** `/frontend/Dockerfile`

---

**Note:** This file is the primary context reference for AI assistants. Update as architecture evolves.
