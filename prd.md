# Product Requirements Document: Auto Glass Quote Generation MVP

## 1. Executive Summary

**Product Vision**: Build a self-service online quote generation system that enables vehicle owners to receive instant auto glass replacement quotes through VIN lookup, validates serviceability by location, and converts approved quotes into appointment scheduling while empowering internal support teams to validate and modify pricing.

**MVP Timeline**: 6 weeks
**Target Users**: Vehicle owners, Support Agents, Admin
**Success Metrics**: 100 quotes/day, &lt;5% pricing errors, &lt;24hr validation SLA

---

## 2. User Personas

### 2.1 Customer (Vehicle Owner)
- **Goal**: Get accurate quote in &lt;2 minutes with minimal data entry
- **Tech Level**: Mobile-first, non-technical
- **Critical Path**: Enter VIN → See Quote → Provide Contact Info → Approve

### 2.2 Support Agent
- **Goal**: Review and validate quotes before customer delivery
- **Actions**: Override pricing, edit fees, communicate with customer
- **Volume**: 50-100 quotes/day per agent

### 2.3 Admin
- **Goal**: Configure pricing rules, manage shop network, oversee operations
- **Access**: Full CRUD on all system data

---

## 3. Core Features & Business Rules

### 3.1 Vehicle Identification Module

**Feature**: VIN-based vehicle lookup
- **Input**: 17-character VIN (manual entry)
- **Validation**:
  - Checksum validation using NHTSA algorithm
  - Must support letters A-Z (except I,O,Q) and digits 0-9
  - Minimum length: 17 characters
- **Error Handling**:
  - Invalid VIN → "Please check your VIN and try again"
  - Unsupported vehicle → "We currently don't service this vehicle"
- **Future Enhancement**: Plate-to-VIN API integration (deprioritized for MVP)

**Feature**: Manual Year/Make/Model fallback
- **Trigger**: If VIN lookup fails
- **Business Rule**: Required fields only if VIN is invalid/missing
- **Data Source**: Static JSON mapping (NAGS compatibility list)

---

### 3.2 Serviceability Check Module

**Feature**: Postal code validation
- **Input**: 5-digit ZIP (US) or 6-character Postal Code (Canada)
- **Business Rules**:
  - Must validate against `shops_servicearea` database table
  - Match types: Exact ZIP, ZIP prefix (e.g., 94*), radius-based (future)
  - **Service Available** → Proceed to pricing
  - **Service Unavailable** → Display nearest 3 shops with contact info
- **Performance**: &lt;100ms lookup time
- **Admin Configuration**: Support team can add/remove ZIP codes via admin panel

**Feature**: Shop Network Display
- **Logic**: Show nearest shop based on postal code centroid distance
- **Data**: Shop name, address, phone, distance (miles)

---

### 3.3 Pricing Engine Module

**Feature**: NAGS Database Integration
- **Source**: NAGS API (SOAP or REST)
- **Rate Limit**: 10 requests/second (implement circuit breaker)
- **Caching**: Redis cache for 24 hours on VIN lookups
- **Business Rules**:
  - Part types: Windshield, Door Glass, Back Glass, Vent Glass
  - Price components: Part cost (NAGS list), Labor (lookup table), Fees
  - Labor rates: $150 (standard), $200 (complex, e.g., HUD calibration)
  - **Markup**: Admin can set global multiplier (e.g., 1.3x) via config

**Feature**: Fee Calculation
- **Environmental Fee**: $5.00 (hardcoded per state for MVP)
- **Disposal Fee**: $10.00 (all vehicles)
- **Mobile Service Fee**: $25.00 (if customer &gt;15 miles from shop)
- **Tax**: Calculate based on postal code (Avalara API integration - Deprioritized to Phase 2)

**Feature**: Quote Expiration
- **Rule**: Quotes expire after 7 days
- **Cron Job**: Daily task to mark expired quotes, notify customers

---

### 3.4 Customer Capture Module

**Feature**: Contact Information Collection
- **Required Fields**:
  - Email (format validation, unique per quote)
  - Mobile Phone (E.164 format: +1XXXXXXXXXX)
- **Optional Fields**:
  - First Name, Last Name
- **Consent**: SMS opt-in checkbox (GDPR/CCPA compliance)
- **Validation**:
  - Email verification link sent before quote delivery (Phase 2)
  - Phone SMS verification (Phase 2)

**Feature**: Quote Delivery
- **Channel**: Email only for MVP
- **Content**: HTML email with itemized breakdown
- **Branding**: Include company logo, shop contact info
- **Tracking**: Open rate tracking via pixel (optional)

---

### 3.5 Quote Lifecycle & States

**State Machine**:
