# Sprint Planning - Auto Glass Quote API

**Project:** Auto Glass Quote Generation MVP
**Timeline:** 4 Sprints (4 weeks)
**Stack:** Django 5.1 + DRF + PostgreSQL 16 + Redis + Celery + React 19

---

## Overview

This project is organized into 4 sequential sprints, each building upon the previous one. Each sprint has a detailed task list in markdown format with checkboxes for tracking progress.

---

## Sprint Breakdown

### 📦 [Sprint 1: Foundation & Core Infrastructure](./sprint1.md)
**Week 1 (5-7 days)**

**Goal:** Set up Django project, Docker infrastructure, database models, and mock data

**Key Deliverables:**
- Django project with 8 apps configured
- Docker Compose (PostgreSQL 16 + PostGIS, Redis, Celery, Mailhog)
- All database models created (Customer, Shop, Vehicle, Quote, Pricing)
- Mock vehicle data (30-40 vehicles with NAGS + PGW pricing)
- Shop pricing rules (NAGS -25%, PGW -30%, etc.)
- Django admin panel functional
- User authentication & groups
- Seed data management commands

**Success Criteria:**
- ✅ Backend server running at http://localhost:8000
- ✅ Admin panel accessible at http://localhost:8000/admin/
- ✅ Database seeded with shops, vehicles, pricing rules
- ✅ All migrations applied successfully

**Estimated Effort:** 35-40 hours

---

### ⚙️ [Sprint 2: Business Logic & Services](./sprint2.md)
**Week 2 (5-7 days)**

**Goal:** Build core business logic, services, and Celery async tasks

**Key Deliverables:**
- Vehicle identification service (VIN/plate lookup with mock data)
- Serviceability check service (in-store + mobile)
- Pricing calculator with shop-specific rules
- Celery configuration and async tasks
- Quote generation task (async, 3-5 seconds)
- Email service (send to Mailhog)
- Quote state machine (django-fsm)
- Email templates (quote, rejection, approval, expiration)

**Success Criteria:**
- ✅ Can lookup vehicle by VIN or plate (returns glass options)
- ✅ Can check serviceability (in-store and mobile)
- ✅ Can calculate pricing with shop discounts
- ✅ Celery task creates quote successfully
- ✅ Email sent to Mailhog inbox
- ✅ State transitions work correctly

**Estimated Effort:** 40-45 hours

---

### 🌐 [Sprint 3: Public APIs & Customer Flow](./sprint3.md)
**Week 3 (5-7 days)**

**Goal:** Build all customer-facing API endpoints and complete the quote request flow

**Key Deliverables:**
- Vehicle identification endpoint (POST /api/v1/vehicles/identify/)
- Serviceability check endpoints (in-store + mobile)
- Insurance provider list endpoint
- Quote generation endpoint (async)
- Quote status polling endpoint
- Quote preview endpoint
- Quote approval endpoint (token-based)
- API serializers for all endpoints
- Error handling framework
- Rate limiting & throttling
- CORS configuration
- API documentation (Swagger UI)

**Success Criteria:**
- ✅ Customer can request quote via API
- ✅ Quote generation is async (returns task_id)
- ✅ Can poll status until completed
- ✅ Can preview quote details
- ✅ Can approve quote via email link (token)
- ✅ API docs complete at http://localhost:8000/api/docs/

**Estimated Effort:** 35-40 hours

---

### 🛠️ [Sprint 4: Support Dashboard & Production Ready](./sprint4.md)
**Week 4 (5-7 days)**

**Goal:** Build support agent tools, secure the system, and prepare for production deployment

**Key Deliverables:**
- JWT authentication endpoints
- Support dashboard APIs (quote queue, detail, modify)
- Quote validation/rejection endpoints
- Bulk actions endpoint
- Customer lookup endpoint
- Django admin enhancements (custom actions, filters)
- Security hardening (HTTPS, CSRF, XSS, SQL injection prevention)
- Production Docker configuration
- Nginx reverse proxy
- SSL certificate setup
- VPS deployment
- Monitoring & logging (Sentry)
- Backup strategy
- Complete documentation

**Success Criteria:**
- ✅ Support agents can login and manage quotes
- ✅ Can validate/reject quotes via API
- ✅ Security audit passed (no critical vulnerabilities)
- ✅ Deployed to production VPS with SSL
- ✅ Monitoring configured (uptime, errors)
- ✅ All documentation complete

**Estimated Effort:** 40-45 hours

---

## Technology Stack

### Backend
- **Framework:** Django 5.1
- **API:** Django REST Framework 3.15
- **Database:** PostgreSQL 16 (with PostGIS for geospatial queries)
- **Cache:** Redis 7
- **Task Queue:** Celery 5.4 + Redis broker
- **Authentication:** JWT (djangorestframework-simplejwt)
- **State Machine:** django-fsm
- **API Docs:** drf-spectacular (OpenAPI/Swagger)

### Frontend (Phase 2 - After Sprint 4)
- **Framework:** React 19
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS 4 + shadCN UI
- **Data Fetching:** TanStack Query v5
- **State:** Zustand

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx (reverse proxy)
- **Email (Dev):** Mailhog
- **Email (Prod):** SendGrid or Amazon SES
- **Monitoring:** Sentry (error tracking), UptimeRobot (uptime)
- **Deployment:** VPS (DigitalOcean/Linode/Hetzner)

### External Integrations
- **AUTOBOLT API:** Vehicle identification (VIN/plate → NAGS data)
- **Mock Mode:** 30-40 vehicles with realistic data for testing

---

## Key Features

### Customer Flow
1. Enter VIN or license plate + state
2. Select glass type (windshield, side glass, back glass)
3. Choose service type (mobile or in-store)
4. Enter location (full address for mobile, ZIP for in-store)
5. Select payment type (cash or insurance)
6. Provide contact info
7. Quote generated asynchronously (30 seconds)
8. Receive quote via email
9. Approve quote via email link

### Support Agent Flow
1. Login to support dashboard
2. View pending quotes (queue with filters)
3. Review quote details
4. Modify pricing if needed (add custom line items)
5. Validate and send to customer (triggers email)
6. OR reject with reason (triggers rejection email)

### Admin Flow
1. Configure shops and service areas
2. Manage pricing rules (per shop, per manufacturer)
3. Manage insurance providers
4. View quote statistics and analytics

---

## Data Model Highlights

### Core Models
- **Customer:** Contact info, address (for mobile service)
- **Shop:** Location (PostGIS), service radius, business hours
- **ServiceArea:** Postal code ranges per shop
- **MockVehicleData:** 30-40 vehicles with NAGS + PGW pricing
- **Quote:** Vehicle, customer, pricing, service type, payment type, state (FSM)
- **PricingConfig:** Labor rates, fees, mobile service tiers
- **InsuranceProvider:** Name, negotiated rates, pre-approval requirements
- **ShopPricingRule:** Per-shop discounts (NAGS -25%, PGW -30%)

### Quote States (FSM)
```
draft → pending_validation → sent → customer_approved → scheduled → converted
                           ↓
                        expired / rejected
```

---

## API Endpoints Summary

### Public (No Auth)
```
POST   /api/v1/vehicles/identify/              # VIN/plate lookup
POST   /api/v1/shops/check-in-store/           # In-store serviceability
POST   /api/v1/shops/check-mobile/             # Mobile serviceability
GET    /api/v1/pricing/insurance-providers/    # List insurers
POST   /api/v1/quotes/generate/                # Start quote (async)
GET    /api/v1/quotes/status/{task_id}/        # Poll status
GET    /api/v1/quotes/{id}/preview/            # View quote
POST   /api/v1/quotes/approve/{token}/         # Approve quote
```

### Authenticated (Support Agents)
```
POST   /api/v1/auth/login/                     # Login (get JWT)
GET    /api/v1/auth/me/                        # Current user
GET    /api/v1/support/quotes/                 # Queue (filters/search)
GET    /api/v1/support/quotes/{id}/            # Quote detail
PATCH  /api/v1/support/quotes/{id}/            # Modify quote
POST   /api/v1/support/quotes/{id}/validate/   # Send to customer
POST   /api/v1/support/quotes/{id}/reject/     # Reject quote
GET    /api/v1/support/customers/{id}/         # Customer history
```

---

## Mock Data

### Shops (5 locations)
- Bay Area Auto Glass (San Francisco, CA)
- NYC Glass Repair (New York, NY)
- Austin Glass Pro (Austin, TX)
- Denver Auto Glass (Denver, CO)
- Miami Glass Services (Miami, FL)

### Mock Vehicles (30-40)
- License plates from CA, NY, TX, CO, FL
- Year range: 2010-2021
- Makes: Honda, Ford, Tesla, BMW, Mazda, Jeep, Chevy, Nissan, VW, etc.
- Each vehicle has NAGS + PGW pricing for: windshield, doors, back glass

### Shop Pricing Rules
- **Bay Area:** NAGS -25%, PGW -30%, Windshield NAGS -28% (higher priority)
- **NYC:** NAGS -20%, PGW -25%
- **Austin:** NAGS -30%, PGW -35% (most competitive)
- **Denver:** NAGS -22%, PGW -28%
- **Miami:** NAGS -18%, PGW -22% (premium market)

---

## Testing Strategy

### Unit Tests
- All service methods (VehicleService, PricingCalculator, etc.)
- Model methods (Quote.clean(), PricingConfig.calculate_mobile_fee())
- Serializer validation
- FSM state transitions

### Integration Tests
- Full quote generation flow
- Email delivery flow
- Support validation flow
- API endpoint flows

### Load Tests
- 100 concurrent users
- Target: p95 < 500ms (except async quote generation)
- Monitor database, Redis, Celery queue

### Security Tests
- SQL injection attempts
- XSS attempts
- CSRF protection
- Rate limit bypass
- Unauthorized access

---

## Progress Tracking

Use the checkboxes in each sprint file to track progress:

```markdown
- [x] Completed task
- [ ] Pending task
```

### Sprint Status
- [ ] Sprint 1: Foundation (0% complete)
- [ ] Sprint 2: Business Logic (0% complete)
- [ ] Sprint 3: Public APIs (0% complete)
- [ ] Sprint 4: Production Ready (0% complete)

---

## Getting Started

1. Start with [Sprint 1](./sprint1.md)
2. Complete all tasks in order
3. Mark tasks as done with `[x]`
4. Move to next sprint only when current sprint is 100% complete
5. Each sprint builds on the previous one

---

## Success Metrics (After Sprint 4)

- ✅ 100+ quotes/day capacity
- ✅ <5% error rate
- ✅ <24hr validation SLA
- ✅ p95 response time <500ms
- ✅ 99.9% uptime
- ✅ Zero critical security vulnerabilities
- ✅ >80% test coverage

---

## Post-Sprint 4: Next Steps

### Phase 2 (Optional - Sprint 5-6)
- React 19 frontend with Tailwind + shadCN
- Appointment scheduling module
- Payment processing integration
- SMS notifications (Twilio)
- Tax calculation (Avalara API)
- Real AUTOBOLT API integration
- Real-time updates (WebSockets)
- Mobile app (React Native)

### Enhancements
- Analytics dashboard
- Customer portal (view quote history)
- Technician assignment system
- Inventory management
- Invoice generation
- CRM integration

---

## Documentation Links

- [Sprint 1: Foundation](./sprint1.md)
- [Sprint 2: Business Logic](./sprint2.md)
- [Sprint 3: Public APIs](./sprint3.md)
- [Sprint 4: Production Ready](./sprint4.md)

---

## Questions or Issues?

- Review the sprint files for detailed task breakdowns
- Check the PRD and Architecture.md for requirements
- All tasks are designed to be sequential and buildable

**Let's build! 🚀**
