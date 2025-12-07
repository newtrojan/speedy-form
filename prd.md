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


- Updated section and features.

- form

STEP 1: Intent & Service Type


Headline: What do you need help with today?

Options:
🔘 Windshield Replacement
Cracked or shattered? We’ll replace it.

🔘 Chip Repair
3 chips or fewer—we can fix it.

🔘 Other Glass (Side Window, Sunroof, etc.)
We’ll help you figure it out.



STEP 2: Location


Headline: Where are you?

Field:
📍 Postal Code
We need this to show accurate pricing and availability.

[Continue]

After validation:
✅ Mobile service available in your area.

Choice:
🔘 Mobile Service — We’ll come to you
🔘 In-Shop Appointment — Visit one of our nearby shops

If outside mobile radius:
Mobile service is available with a $45 travel fee, or choose in-shop at no extra charge.



STEP 3: Vehicle Identification


Headline: What vehicle is this for?

Option 1: License Plate
[Input field]
Province/State [Dropdown]
🔍 Decode My Vehicle

If decoding fails:
We couldn’t find that plate. Please enter your VIN for an exact match.

VIN (fallback):
17-character VIN
or
Year → Make → Model (cascading dropdowns)

After success:
✅ 2023 Honda Civic Sedan — confirmed



STEP 4: Damage Details


Headline: Tell us about the damage.

If Replacement:
Which glass?
🔘 Front Windshield
🔘 Rear Windshield
🔘 Side Window
🔘 Roof Glass (Moonroof, Sunroof, Panoramic)

If Chip Repair:
Number of chips:
1 2 3

📸 Upload a photo (optional)
Helps us verify parts and gives you $10 off.



STEP 5: Contact Info


Headline: Quick contact details—we’re almost done.

Full Name
Phone Number
We’ll text your quote and appointment time.

Email
Your detailed quote PDF will be sent here.

[Get My Exact Quote]



STEP 6: Review & Quote


Headline: Here’s your quote.

Vehicle: 2023 Honda Civic Sedan
Service: Mobile Windshield Replacement
Location: Home (M5V 3A8)

Choose your glass:
○ Economy — $245
1-year warranty

● Recommended — $289
3-year warranty + free chip repair

○ OEM Factory — $385
Lifetime warranty

Next available: Tomorrow at 9:00 AM

Buttons:
🟢 Book Now
🔵 Email Quote
⚪ Call Me Back



Post-Submission


✅ Quote received! We’ll confirm your appointment within 5 minutes.

If system is busy:
Your quote is saved. We’ll call you within 15 minutes.


MODULE: Quote Wizard (Public Frontend)

Display service intent cards (Replacement / Chip Repair / Other Glass)
Capture postal/ZIP and calculate distance from nearest shop centroid
Show mobile vs in-shop options based on radius rules
Apply mobile fee or per-km surcharge dynamically
Decode license plate via AutoBolt API
Fallback to VIN entry if plate decode fails
Fallback to Year → Make → Model cascading dropdowns
Extract ADAS features from VIN decode response
Detect RV/Motorhome body class and halt for manual review
Map VIN to NAGS part number
Capture damage type (which glass)
Capture chip count for repair jobs
Photo upload to S3 with $10 discount trigger
Auto-add calibration fee when ADAS detected
Capture contact info (name, phone, email)
Verify phone line type via Twilio Lookup
Create QuoteSession entity on step 1
Update QuoteSession progress on each step
Display 3-tier pricing (Economy / Recommended / OEM)
Show only slots for qualified technicians
Book appointment on slot selection
Trigger SMS drip if user abandons at contact step


MODULE: Pricing Engine

Implement List-Less formula (not cost-plus)
Fetch discount % from PricingProfile
Fetch labor rate from PricingProfile
Fetch kit fee from PricingProfile
Fetch calibration fee from PricingProfile
Calculate mobile fee based on distance
Support per-shop pricing profile overrides
Support date-range promotional pricing
Calculate total dynamically on quote screen
Log price calculation inputs for audit trail


MODULE: Availability & Scheduling

Define technician hard skills (calibrate, tempered, sunroof, heavy-duty)
Define technician certification tiers (Apprentice / Pro / Master)
Store shop operating hours by day of week
Store technician shift overrides
Calculate job duration from labor hours + calibration time + buffer
Filter technicians by required skills for job
Filter technicians by minimum tier for vehicle class
Scan technician calendars for contiguous time gaps
Return only slots where qualified tech is available
Support mobile radius override per technician
Mark technician unavailable (sick day / PTO)
Auto-flag jobs for reschedule when assigned tech goes unavailable
Support 2-tech jobs for heavy-duty (Phase 2 placeholder)


MODULE: CRM / Lead Management

Create Customer record on quote submission
Link QuoteSession to Customer
Track quote status (Draft / Sent / Viewed / Booked / Expired)
Log all customer interactions (calls, SMS, email, chat)
Trigger abandonment SMS drip campaign
Show "Live Visitors" on CSR dashboard
Enable CSR to initiate web chat with live visitor
Store interaction history per customer
Support customer merge for duplicates


MODULE: Omnichannel Inbox

Receive inbound SMS via Twilio webhook
Match inbound SMS to customer by phone number
Receive inbound email via SendGrid webhook
Track email opens and log to interaction history
Unified inbox view for CSR (SMS + Email + Chat)
Send outbound SMS from dashboard
Send outbound email from dashboard
Real-time WebSocket updates for new messages
Canned response templates for common questions


MODULE: Job Management (Technician App)

Display job stream sorted chronologically
Show job cards with icons (calibration required, mobile, etc.)
Tap to view job details (vehicle, customer, address, notes)
Update job status (En Route / Arrived / In Progress / Complete)
Trigger customer SMS on status change
Pre-inspection form with damage notes
Upload before/after photos
Record calibration completion
Capture customer signature on completion
GPS check-in for mobile jobs


MODULE: Approvals & Overrides

Define auto-approve threshold for discounts (e.g., $20)
Lock quote and set PENDING_APPROVAL beyond threshold
Notify manager on pending approval
Manager approve/reject from dashboard
Log approval decision with reason
CSR sees approval status on quote


MODULE: Shop & Territory Management

CRUD for shop locations
Set service radius per shop
Set extended radius and surcharge per shop
Visualize service areas on map
Adjust overlapping territories
Assign technicians to primary shop
Transfer technician between shops


MODULE: Technician Management

CRUD for technician profiles
Toggle skill flags (calibrate, sunroof, etc.)
Set certification tier
Set mobile capable flag
Set individual mobile radius override
View technician utilization metrics
Bulk import technicians from CSV


MODULE: Analytics & Funnel Tracking

Track QuoteSession step progression
Calculate drop-off rate per step
Conversion rate by source/channel
Conversion rate by CSR
Average time from quote to invoice
Revenue by shop / technician / period
Dashboard widgets for key KPIs


MODULE: Admin & Configuration

Manage PricingProfile (labor rate, kit fee, etc.)
Manage NAGS part mappings
Configure Twilio credentials
Configure SendGrid credentials
Configure AutoBolt API credentials
Define vehicle tier rules (which makes = Luxury)
Define job complexity rules
Nightly CDC job for legacy accounting sync
Audit log for config changes


MODULE: RBAC (Roles & Permissions)

Customer role (quote wizard only)
Technician role (job stream, mobile app)
CSR role (CRM, inbox, limited price edit)
Division Manager role (approvals, performance reports)
Network Manager role (shops, territories, technicians)
App Admin role (full config access)
Permission checks on all API endpoints
UI element visibility based on role
