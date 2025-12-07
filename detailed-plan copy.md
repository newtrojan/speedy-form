# SpeedyGlass USA — Auto Glass Operations Platform

## Complete Technical & Functional Specification (V1)

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Customer Journey — Quote Wizard](#2-customer-journey--quote-wizard)
3. [Pricing Engine](#3-pricing-engine)
4. [Quote Lifecycle & States](#4-quote-lifecycle--states)
5. [Magic Links & Tracking](#5-magic-links--tracking)
6. [Communication System](#6-communication-system)
7. [Staff Dashboard](#7-staff-dashboard)
8. [Technician App (PWA)](#8-technician-app-pwa)
9. [Scheduling & Availability](#9-scheduling--availability)
10. [API Endpoints](#10-api-endpoints)
11. [RBAC — Roles & Permissions](#11-rbac--roles--permissions)
12. [Integrations](#12-integrations)
13. [Data Models](#13-data-models)
14. [Error Handling & Fallbacks](#14-error-handling--fallbacks)
15. [V1 Scope — In vs Deferred](#15-v1-scope--in-vs-deferred)
16. [Tech Stack](#16-tech-stack)
17. [Open Decisions](#17-open-decisions)
18. [Glossary](#18-glossary)

---

# 1. EXECUTIVE SUMMARY

## What We're Building

A unified Auto Glass Operations Platform (ERP-Lite) that connects a high-conversion public quote wizard with a robust internal command center.

**For Customers:** Instant, scientifically accurate quotes using AutoBolt (VIN) and NAGS (Parts) data. Quote-to-book in under 2 minutes.

**For Staff:** A "Single Pane of Glass" to manage leads, communicate via SMS/Email (Omnichannel), and dispatch technicians based on skill and availability.

## The Core Loop

```
Customer gets quote → We track engagement → Staff follow up → Customer books → Technician completes job
```

## Success Metrics (V1)

| Metric                 | Target                     |
| ---------------------- | -------------------------- |
| Wizard completion rate | >60% of visitors who start |
| Quote-to-view rate     | >80% open the magic link   |
| View-to-book rate      | >30% of viewed quotes      |
| Time to quote          | <2 minutes average         |
| Customer satisfaction  | >4.5 stars                 |
| System uptime          | >99.5%                     |

---

# 2. CUSTOMER JOURNEY — QUOTE WIZARD

## Overview

A 6-step public wizard that captures vehicle info, calculates pricing, and lets customers book instantly. No login required.

## Why It Matters

Speed kills competitors. Most auto glass sites require a phone call. We give instant pricing and online booking.

---

## STEP 1: Service Intent

**Headline:** "What do you need help with today?"

**UI:** Large clickable cards

**Options:**

- 🔘 **Windshield Replacement** — "Cracked or shattered? We'll replace it." → Triggers standard replacement flow
- 🔘 **Chip Repair** — "3 chips or fewer—we can fix it." → if more than 4 we need to replace it
- 🔘 **Other Glass (Side/Rear/Sunroof)** — "We'll help you figure it out." → Flags as Complexity: Medium

**Backend Logic:**

- Create `QuoteSession` entity immediately
- Track funnel from this point
- Store `service_type` selection

---

## STEP 2: Location & Serviceability

**Headline:** "Where are you?"

**Input:** Postal Code / ZIP

**After validation, show:**

- ✅ "Mobile service available in your area."

**Choice:**

- 🔘 Mobile Service — "We'll come to you"
- 🔘 In-Shop Appointment — "Visit one of our nearby shops" - Shows shops in distance order.

**Backend Logic:**

1. Receive postal code
2. Geocode to lat/long (Google Maps API)
3. Find nearest Shop by distance from shop centroid
4. Calculate exact distance in miles

**Distance Rules:**

| Distance      | Action                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| 0 - 30 miles  | Enable "Mobile Service" option, add $49.00 Mobile Fee                               |
| 31 - 60 miles | Show: "Mobile service available with extended travel fee" — triggers PENDING_REVIEW |
| 60+ miles     | Show: "Outside mobile service area" — force In-Shop OR flag for manual quote        |

**Messages:**

Within 30 miles:

```
✅ Mobile service available in your area!
○ Mobile Service — We come to you ($49 travel fee)
○ In-Shop — Visit one of our location (no travel fee)
```

31-60 miles:

```
📍 Mobile service available with extended travel fee
○ Mobile Service — We come to you (additional fees apply based on distance)
○ In-Shop — Visit our location (no travel fee)
We'll confirm your exact travel fee before you book.
```

60+ miles:

```
📍 You're outside our standard mobile service area
○ In-Shop — Visit our Downtown location
○ Call Us — 1-800-555-1234 for custom mobile quote
```

---

## STEP 3: Vehicle Identification

**Headline:** "What vehicle is this for?"

**Option 1 — License Plate (Primary):**

- Input: License Plate Number
- Dropdown: State/Province
- Button: [🔍 Decode My Vehicle]
- this will be done by AUTOBOLT API. We should also cache this maybe in a databse table as it includes images and part details etc.
  **If decode succeeds:**

```
✅ 2023 Honda Civic Sedan — confirmed
```

**If decode fails:**

```
We couldn't find that plate. Please enter your VIN for an exact match.
```

**Option 2 — VIN (Fallback):**

- Input: 17-character VIN

**Option 3 — Manual (Last Resort):**

- Year dropdown (cascading)
- Make dropdown (cascading)
- Model dropdown (cascading)

**Backend Logic (AutoBolt Integration):**

1. Send Plate + State to AutoBolt API
2. On success, receive:
   - VIN
   - Year, Make, Model, Trim
   - Body Class
   - ADAS Features (Lane Keep Assist, Forward Collision, etc.)
3. Store in `Vehicle` entity linked to `QuoteSession`

**NAGS Lookup:**

- Map VIN to NAGS Part Number (e.g., DW01234)
- Retrieve: List Price, Labor Hours, Kit Requirement

**Exception Handling:**

- If `Body Class = Motorhome/RV/Bus` → Halt pricing, redirect to "Manual Review" flow and any other type of vehicle outside regular vehicles.
- If ADAS features detected → Flag for calibration (handled in Step 4)

---

## STEP 4: Damage Details

**Headline:** "Tell us about the damage."

**If Replacement selected:**

```
Which glass?
🔘 Front Windshield
🔘 Rear Windshield
🔘 Side Window (specify which)
🔘 Roof Glass (Moonroof, Sunroof, Panoramic)
```

**If Chip Repair selected:**

```
Number of chips:
[ 1 ] [ 2 ] [ 3 ]
```

**Photo Upload:**

```
📸 Upload a photo (optional)
Helps us verify parts and gives you $10 off.
```

**Backend Logic:**

1. Store glass type / chip count in session
2. If photo uploaded:
   - Upload to S3 - lets use cloudflare R2 for this
   - Store URL in session
   - no discusount we will say help us analyze the quote faster
3. If ADAS features were found in Step 3:
   - Auto-add Calibration Fee to quote (hidden from customer at this point, shown in final quote)
   - Determine calibration type: Static / Dynamic / Double

---

## STEP 5: Contact Info

**Headline:** "Quick contact details—we're almost done." maybe we should capture it at step 2 or step 1 but should be easily changeable later

**Inputs:**

- Full Name (required)
- Phone Number (required) — "We'll text your quote and appointment time."
- Email (required) — "Your detailed quote PDF will be sent here."

**Button:** [Get My Exact Quote]

**Backend Logic:**

1. Create `Customer` record (or match existing by phone/email)
2. Link `Customer` to `QuoteSession`
3. Verify phone via Twilio Lookup API:
   - If Mobile → Enable SMS
   - If Landline → Email only, flag for potential callback
4. Update `QuoteSession` status

**Abandonment Logic:**

- If user enters contact info but doesn't complete Step 6
- Wait 15 minutes
- Trigger SMS drip: "Still need that windshield fixed? Complete your quote: [link]"

---

## STEP 6: Quote & Booking

**Headline:** "Here's your quote."

**Display:**

```
Vehicle: 2023 Honda Civic Sedan
Service: Mobile Windshield Replacement
Location: Home (M5V 3A8)
```

**Three-Tier Glass Options:** These 3 options will be Insurance we say the price as $0 second option will be cash - this is the quote and 3rd option will be after pay which break it in installments.

```
○ Insurance — $245
  need to show something like $0 as if insurance claim

● Cash — $289
 this is the quote we shot

○ Easy Payments — $XX
  divided by the number of installments by Easy Pay
```

**Availability:**

```
Next available: Tomorrow at 9:00 AM brings in availability for the shop and selected tech
[See more times]
```

**Time Slot Display Logic:**

- Query scheduling engine
- Filter for technicians with required skills
- Only show slots where qualified tech is available
- If ADAS calibration needed → Only show techs with `can_calibrate = True`

**Action Buttons:**

- 🟢 **[Book Now]** → Confirm booking, create Job
- 🔵 **[Email Quote]** → Send magic link to entered email . Should always email the quote anyways but good to have the button
- ⚪ **[Call Me Back]** → Queue callback request

---

## Post-Submission

**If booking confirmed:**

```
✅ You're booked!

Your appointment:
📅 Tuesday, Dec 10 at 9:00 AM
📍 123 Main St, Toronto (Mobile Service)
👤 Your technician: Mike S.

We'll send you a reminder the day before.
Questions? Call 1-800-555-1234
```

**If system is busy / review needed:**

```
✅ Quote received! We'll confirm your appointment within 15 minutes.
```

**If requires manual review:**

```
Your quote is saved. We'll call you within 15 minutes.
```

---

## Funnel Tracking

Entity: `QuoteSession`

Created on Step 1, updated on every step.

**Tracked Data:**

- `step_reached` (1-6)
- `step_1_completed_at`, `step_2_completed_at`, etc.
- `abandoned_at_step`
- `time_spent_per_step`
- `source` (direct, google, referral)
- `device` (mobile, desktop, tablet)

**Goal:** Identify where users drop off.

Example insight: "If 50% drop at Step 3, our Plate Decoder might be failing."

---

# 3. PRICING ENGINE

## Overview

A rule-based calculation engine that generates accurate quotes using industry-standard List-Less pricing methodology.

## Why List-Less (Not Cost-Plus)

Auto glass industry standard. Price is calculated as a discount from the NAGS list price, not markup from cost.

---

## The Master Formula

### REPLACEMENT JOB:

```
Glass Price       = NAGS_List_Price × (1 - Category_Discount%)
Labor             = NAGS_Labor_Hours × Labor_Rate  [if Multiplier mode]
                  = Flat_Labor_Amount              [if Flat mode]
Kit Fee           = Lookup by labor hours (tiered)
Moulding          = If required, add moulding price
Hardware          = If required, add hardware price
Calibration       = If ADAS: Static | Dynamic | Double fee
Mobile Fee        = If mobile service selected + distance logic
Admin Fee         = If insurance claim

TOTAL = Glass + Labor + Kit + Moulding + Hardware + Calibration + Mobile + Admin + Tax
```

### CHIP REPAIR JOB:

```
Chip 1            = WR-1 price
Chip 2            = WR-2 price (if applicable)
Chip 3+           = WR-3 price × quantity (if applicable)
Mobile Fee        = If mobile service selected
Admin Fee         = If insurance claim

TOTAL = Sum of chip repairs + Mobile + Admin + Tax
```

### CRACK REPAIR JOB:

```
Crack Fee         = CR-1 | CR-2 | CR-3 based on size
Mobile Fee        = If mobile service selected
Admin Fee         = If insurance claim

TOTAL = Crack Fee + Mobile + Admin + Tax
```

---

## Input Sources

| Source              | Data Retrieved                                                |
| ------------------- | ------------------------------------------------------------- |
| **NAGS**            | Part Number, List Price, Labor Hours, Kit Quantity, ADAS Flag |
| **AutoBolt**        | VIN, Year/Make/Model, ADAS Features                           |
| **Google Maps**     | Distance from Shop to Customer (miles)                        |
| **Pricing Profile** | All discount rates, labor rates, fees                         |

---

## Price Rule Types

| Type                           | How It Works                            |
| ------------------------------ | --------------------------------------- |
| **% Off Application Provider** | Discount percentage off NAGS list price |
| **Flat Amount**                | Fixed dollar amount for the service     |
| **Cost Plus**                  | Base cost + markup percentage           |

---

## Glass Categories & Discounts

Pricing varies by glass origin and type:

| Category            | Code | Example                    | Typical Discount |
| ------------------- | ---- | -------------------------- | ---------------- |
| Domestic Windshield | DW   | Ford F-150 windshield      | 48%              |
| Domestic Tempered   | DT   | Chevy Silverado rear glass | 48%              |
| Foreign Windshield  | FW   | Honda Civic windshield     | 48%              |
| Foreign Tempered    | FT   | Toyota Camry door glass    | 48%              |
| OEM                 | OEM  | Factory original (any)     | 0%               |

**Glass Price Calculation:**

```
Input:    NAGS List Price ($400)
Rule:     Apply category discount (48%)
Formula:  $400.00 × (1 - 0.48) = $208.00 (Selling Price)
```

---

## Labor Calculation

Two modes configured in Pricing Profile:

**Mode 1 — Multiplier:**

```
Labor_Cost = Labor_Hours × Hourly_Rate
Example:    1.8 hrs × $44.80 = $80.64
```

**Mode 2 — Flat:**

```
Labor_Cost = Fixed amount (e.g., $44.80 regardless of hours)
```

**Labor Rates by Category:**

- Labor: Domestic Windshield — $44.80
- Labor: Domestic Tempered — $44.80
- Labor: Foreign Windshield — $44.80
- Labor: Foreign Tempered — $44.80
- Default Hourly Rate — $44.80 (fallback)

---

## Kit / Urethane Fee

Tiered by NAGS labor hours:

| Labor Hours | Kit Fee |
| ----------- | ------- |
| 1 hour      | $23.00  |
| 1.5 hours   | $46.00  |
| 2 hours     | $46.00  |
| 2.5 hours   | $46.00  |
| 3+ hours    | $46.00  |

**Other Kit:** Optional flat fee for non-standard kits.

---

## Moulding & Hardware

- **Moulding:** Some glass requires new trim — priced as $ or %
- **Hardware:** Clips, fasteners — priced as $ or %

Both configured in Pricing Profile, added when NAGS indicates required.

---

## Chip & Crack Repair Pricing

### Chip Repairs:

| Item     | Code | Description          | Typical Price |
| -------- | ---- | -------------------- | ------------- |
| Chip #1  | WR-1 | First chip           | $49.00        |
| Chip #2  | WR-2 | Second chip          | $29.00        |
| Chip #3+ | WR-3 | Third and subsequent | $29.00 each   |

### Crack Repairs:

| Item     | Code | Size        | Typical Price     |
| -------- | ---- | ----------- | ----------------- |
| Crack #1 | CR-1 | 0-6 inches  | $59.00            |
| Crack #2 | CR-2 | 6-12 inches | $79.00            |
| Crack #3 | CR-3 | 12+ inches  | Recommend replace |

---

## Calibration Fees

Three types based on vehicle requirements:

| Type        | When Used                                      | Typical Price |
| ----------- | ---------------------------------------------- | ------------- |
| **Static**  | Camera behind windshield, target board in shop | $195.00       |
| **Dynamic** | Requires road test to recalibrate              | $295.00       |
| **Double**  | Both static AND dynamic required               | $395.00       |

**Trigger Conditions:**

- NAGS ADAS Flag = True
- OR AutoBolt features include:
  - Lane Departure Warning
  - Lane Keep Assist
  - Forward Collision Warning
  - Adaptive Cruise Control
  - Auto Emergency Braking
  - Rain Sensor
  - Heads Up Display

**Default:** If ADAS detected but calibration type unknown → Use Dynamic ($295)

---

## Mobile Service Fee

**Trigger:** Customer selects "Mobile Service"

**Distance Rules:**

| Distance      | Fee                            | Status         |
| ------------- | ------------------------------ | -------------- |
| 0 - 30 miles  | $49.00 (flat)                  | AUTO_PRICED    |
| 31 - 60 miles | $49.00 + ($1.50 × extra miles) | PENDING_REVIEW |
| 60+ miles     | Cannot price online            | REQUIRES_CALL  |

**Extended Fee Calculation:**

```
Extended_Fee = $49.00 + ((Distance - 30) × $1.50)
Example: 45 miles = $49 + (15 × $1.50) = $71.50
```

---

## Admin Fees (Insurance)

| Fee                  | When Applied                           |
| -------------------- | -------------------------------------- |
| Admin Fee to Replace | Added to claims with glass replacement |
| Admin Fee to Repair  | Added to claims with chip/crack repair |

Note: If repair converts to replacement, swap the fee.

---

## Special Flags

**Labor & Urethane Included in Catalogue Price:**

- When checked: NAGS list price already includes labor and adhesive
- System should NOT add separate labor and kit fees
- Only applies when "% Off Application Provider" rule is selected

---

## Three-Tier Pricing Display

Every replacement quote shows three options:

| Tier        | Glass Type       | Discount | Warranty                   | Target               |
| ----------- | ---------------- | -------- | -------------------------- | -------------------- |
| Economy     | Aftermarket      | 48%      | 1 year                     | Price-sensitive      |
| Recommended | OEE              | 25%      | 3 years + free chip repair | Best value (default) |
| OEM         | Factory original | 0%       | Lifetime                   | Premium/lease        |

**Note:** Labor, kit, calibration, and mobile fees are SAME across all tiers. Only glass price differs.

---

## Pricing Profile Hierarchy

Profiles can be stacked/overridden:

```
Global Default Profile
    ↓ overrides
Shop-Specific Profile
    ↓ overrides
Promotional Profile (date-range)
    ↓ overrides
Manual CSR Override (with approval if needed)
```

---

## Price Override Rules

| Discount Amount | What Happens                            |
| --------------- | --------------------------------------- |
| Up to $20       | Auto-approved, logged                   |
| $21 - $50       | Auto-approved with reason required      |
| Over $50        | Quote locked, requires manager approval |

---

## Complete Calculation Example

**Job:** 2023 Honda Civic, Mobile Service, 25 miles, ADAS (Dynamic)

```
VEHICLE DATA:
- Make: Honda (Foreign)
- ADAS: Lane Departure Warning detected
- Distance: 25 miles (within standard range)

NAGS DATA:
- Part: FW02456
- List Price: $500.00
- Labor Hours: 2.0
- Kit: 1

PRICING PROFILE:
- Foreign Windshield Discount: 48%
- Labor Rate: $44.80/hr (Multiplier mode)
- Kit (1): $23.00
- Calibration Dynamic: $295.00
- Mobile Fee (0-30mi): $49.00
- Tax Rate: 8%

ECONOMY TIER CALCULATION:
┌────────────────────┬─────────────┐
│ Glass              │             │
│ $500 × (1 - 0.48)  │    $260.00  │
├────────────────────┼─────────────┤
│ Labor              │             │
│ 2.0 hrs × $44.80   │     $89.60  │
├────────────────────┼─────────────┤
│ Kit                │     $23.00  │
├────────────────────┼─────────────┤
│ Calibration        │    $295.00  │
├────────────────────┼─────────────┤
│ Mobile Fee         │     $49.00  │
├────────────────────┼─────────────┤
│ SUBTOTAL           │    $716.60  │
├────────────────────┼─────────────┤
│ Tax (8%)           │     $57.33  │
├────────────────────┼─────────────┤
│ TOTAL              │    $773.93  │
└────────────────────┴─────────────┘

STATUS: AUTO_PRICED ✓
```

---

## Quote Status Based on Pricing

| Status           | When                                        | Customer Sees                              | Staff Action                   |
| ---------------- | ------------------------------------------- | ------------------------------------------ | ------------------------------ |
| `AUTO_PRICED`    | All values calculated, within normal ranges | Full price, can book immediately           | None required                  |
| `PENDING_REVIEW` | Distance 31-60 miles, or variable pricing   | "We'll confirm final price within 15 mins" | CSR reviews, adjusts, releases |
| `REQUIRES_CALL`  | Distance 60+ miles, RV/Motorhome            | "Please call us for custom quote"          | Outbound call required         |
| `MANUAL_PRICE`   | No NAGS match, custom glass                 | "We're preparing your quote"               | Full manual pricing            |

---

## Review Triggers Summary

| Condition                     | Review Type       | SLA           |
| ----------------------------- | ----------------- | ------------- |
| Distance 31-60 miles          | Distance Review   | 15 min        |
| Distance 60+ miles            | Manual Quote      | Call required |
| Vehicle: RV / Motorhome / Bus | Complexity Review | 1 hour        |
| No NAGS part match            | Part Lookup       | 1 hour        |
| Calibration type uncertain    | Tech Review       | 30 min        |
| Customer requests callback    | Callback Queue    | 15 min        |

---

# 4. QUOTE LIFECYCLE & STATES

## Overview

Every quote moves through defined states. The system tracks where each quote is and triggers actions automatically.

## State Machine

```
                    ┌─────────────┐
                    │   DRAFT     │
                    └──────┬──────┘
                           │ send()
                           ▼
                    ┌─────────────┐
         ┌─────────│    SENT     │─────────┐
         │         └──────┬──────┘         │
         │                │ view()         │ expire()
         │                ▼                ▼
         │         ┌─────────────┐  ┌─────────────┐
         │         │   VIEWED    │  │   EXPIRED   │
         │         └──────┬──────┘  └─────────────┘
         │                │ book()         ▲
         │                ▼                │
         │         ┌─────────────┐         │
         │         │  CONVERTED  │         │
         │         └─────────────┘         │
         │                                 │
         └───────────── expire() ──────────┘
```

## State Definitions

| State         | Meaning                            | How It Gets Here                            |
| ------------- | ---------------------------------- | ------------------------------------------- |
| **DRAFT**     | Quote created but not sent         | Customer completes wizard, pending send     |
| **SENT**      | Quote emailed/SMS'd to customer    | Auto-send after wizard OR CSR manual resend |
| **VIEWED**    | Customer has opened the quote link | Magic link accessed                         |
| **EXPIRED**   | Quote validity period passed       | Automatic after X days (default 14)         |
| **CONVERTED** | Customer booked, job created       | Customer clicks Book Now or CSR converts    |
| **CANCELLED** | Quote cancelled                    | CSR manually cancels                        |

## State Transitions

- `send()` → Triggers email/SMS, sets `sent_at`
- `view()` → First view sets `first_viewed_at`, creates QuoteView record
- `book()` → Creates Job, sets `converted_at`
- `expire()` → Celery job checks `valid_until`
- `cancel()` → Manual action, sets `cancelled_at`

## Automatic Triggers

| Event                                    | System Action                                         |
| ---------------------------------------- | ----------------------------------------------------- |
| Quote created                            | Send email + SMS with magic link                      |
| 15 min after contact entered, no booking | Send abandonment SMS                                  |
| 24 hours after sent, not viewed          | Send reminder SMS                                     |
| 3 days after viewed, not booked          | Send follow-up email with urgency                     |
| 14 days after sent                       | Mark as EXPIRED                                       |
| Quote booked                             | Create Job, send confirmation, stop all drip messages |

---

# 5. MAGIC LINKS & TRACKING

## Overview

Every quote gets a unique, secure link that customers can access without logging in. We track every interaction.

## How It Works

**The Link:**

```
https://quote.speedyglass.com/q/a8f3b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c
```

**Characteristics:**

- Unique UUID token per quote
- No login required
- Can optionally expire (when quote expires)
- Shareable (customer can forward to spouse, fleet manager)

## What Customers See

- Full quote details (vehicle, service, location)
- Three pricing tier options
- Available booking slots
- Action buttons: Book Now / Call Me Back / Email Quote

## What We Track

Every time someone opens a quote link:

| Data Point   | Why We Track It                   |
| ------------ | --------------------------------- |
| Timestamp    | Know when customers engage        |
| IP Address   | Detect if multiple people viewing |
| Device Type  | Mobile vs desktop                 |
| User Agent   | Browser/OS info                   |
| Referrer     | From email, SMS, or direct?       |
| View Count   | Hot leads view multiple times     |
| Time on Page | Engagement level                  |
| City/Region  | GeoIP lookup (optional)           |

## Staff View

CSR sees on quote detail:

```
Quote #SG-2024-00123
Status: VIEWED (3 times)

View History:
- Dec 5, 2:30 PM — Mobile (from SMS link)
- Dec 5, 4:15 PM — Desktop (from email link)
- Dec 6, 9:02 AM — Desktop (direct)

→ This customer is engaged! Good time to call.
```

## Magic Link Endpoints

| Method | Endpoint                               | Auth   | Description                      |
| ------ | -------------------------------------- | ------ | -------------------------------- |
| GET    | `/q/{token}`                           | Public | Redirects to React quote view    |
| GET    | `/api/quotes/public/{token}/`          | Public | Returns quote data               |
| POST   | `/api/quotes/public/{token}/book/`     | Public | Book from magic link             |
| POST   | `/api/quotes/public/{token}/callback/` | Public | Request callback                 |
| POST   | `/api/quotes/public/{token}/email/`    | Public | Email quote to different address |

---

# 6. COMMUNICATION SYSTEM

## Overview

Automated and manual messaging via SMS and email, all tracked in one place.

## Automated Messages

| Trigger                        | Channel     | Message Example                                                 |
| ------------------------------ | ----------- | --------------------------------------------------------------- |
| Quote created                  | Email + SMS | "Here's your quote for your 2023 Honda Civic: [link]"           |
| Abandonment (15 min)           | SMS         | "Still need that windshield fixed? Complete your quote: [link]" |
| Not viewed (24 hr)             | SMS         | "Your auto glass quote is waiting: [link]"                      |
| Viewed but not booked (3 days) | Email       | "Your quote expires soon—book now to lock in pricing"           |
| Booking confirmed              | Email + SMS | "You're booked! [date/time]. Your tech is [name]"               |
| Day before appointment         | SMS         | "Reminder: Your appointment is tomorrow at [time]"              |
| Tech en route                  | SMS         | "Your technician is on the way! Arriving in ~20 min"            |
| Tech arrived                   | SMS         | "Your technician has arrived."                                  |
| Job complete                   | Email       | "Thanks! Here's your invoice and warranty info"                 |

## Manual Messaging

CSR can send ad-hoc messages from dashboard:

- Select customer or quote
- Choose SMS or Email
- Type message or select canned response
- Send

All messages logged to interaction timeline.

## Canned Responses

Pre-written templates for common questions:

- "Yes, the price includes everything—no hidden fees"
- "We can do mobile service at your home or office"
- "ADAS calibration is required for your vehicle's safety features"
- "We accept all major insurance providers"
- "Your warranty covers defects in materials and workmanship"

## Omnichannel Architecture

- **Twilio:** SMS send/receive, phone verification
- **SendGrid:** Email send, open/click tracking
- **WebSocket:** Real-time updates for inbox

**Webhook Handling:**

- Twilio inbound SMS → Match to customer by phone → Create Interaction
- SendGrid email open → Fire event → Update Interaction log
- SendGrid link click → Track engagement

## Unified Inbox

CSR sees all conversations in one view:

- SMS threads
- Email threads
- (Future: Web chat)

Reply from dashboard → Routes to same channel customer used.

---

# 7. STAFF DASHBOARD

## Overview

Internal web app where staff manage quotes, customers, jobs, and communications. Dashboard adapts based on user role.

## Role-Based Views

### CSR (Customer Service Rep) Dashboard

**Sees:**

- Quote list and detail
- Customer list and detail
- Job board (today's schedule)
- Unified inbox (SMS + Email)
- My performance stats

**Key Widgets:**

- Quotes pending action (count)
- Inbox unread (count)
- Today's bookings (count)
- My conversion rate (%)

---

### Division Manager Dashboard

**Sees:**

- Everything CSR sees
- Approval queue
- Team performance metrics
- Revenue reports

**Key Widgets:**

- Pending approvals (count + list)
- Team conversion rate
- Revenue today/week/month
- Jobs needing reschedule

---

### Network Manager Dashboard

**Sees:**

- Everything Manager sees
- Shop management
- Technician management
- Territory configuration
- Capacity planning

**Key Widgets:**

- All shops capacity heatmap
- Network-wide revenue
- Technician utilization
- Service area coverage

---

## Key Screens

### Quote List (`/dashboard/quotes`)

- Table: Quote #, Customer, Vehicle, Status, Amount, Created, Actions
- Quick filters: Status, Date range, Shop
- Search: By quote #, name, phone, plate
- Color coding: Red = expiring soon, Green = viewed today
- Click row → Quote detail

### Quote Detail (`/dashboard/quotes/:id`)

- All quote info (vehicle, service, pricing breakdown)
- View tracking history ("Opened 3 times, last: 2 hours ago")
- Price breakdown with line items
- Action buttons: Resend Email / Resend SMS / Edit / Convert / Cancel
- Interaction timeline (all comms)
- Notes section

### Customer List (`/dashboard/customers`)

- Table: Name, Phone, Email, Quotes, Jobs, Last Contact
- Search by name, phone, email
- Click row → Customer detail

### Customer Detail (`/dashboard/customers/:id`)

- Contact info
- Quote history
- Job history
- Interaction timeline
- Notes
- Actions: Edit, Merge duplicate

### Inbox (`/dashboard/inbox`)

- Conversation list (left panel)
- Conversation thread (right panel)
- Unread badge
- Filter: All, Unread, SMS, Email
- Reply box with canned response picker
- Assign conversation to CSR

### Job Board (`/dashboard/jobs`)

- Today's jobs by time
- Each job: Time, Customer, Tech, Status, Address
- Click for detail
- Filter by shop, tech, status

### Approvals (`/dashboard/approvals`)

- Pending approvals list
- Each shows: Quote #, CSR name, Original price, Requested price, Margin impact
- Approve / Reject buttons
- Reason field for rejection
- History tab

### Team View (`/dashboard/team`)

- CSR performance table
- Conversion rate by CSR
- Average response time
- Quotes handled today/week

### Technicians (`/dashboard/technicians`)

- Technician list with skills badges
- Click to view/edit profile
- Skill toggles
- Tier assignment
- Shop assignment

### Shops (`/dashboard/shops`)

- Shop list with address, radius
- Click to view/edit
- Operating hours config
- Service radius adjustment

---

# 8. TECHNICIAN APP (PWA)

## Overview

Mobile-first Progressive Web App for technicians to manage their daily jobs. Accessed at `/tech/*` routes.

## Why PWA (Not Native)

- Single codebase with main app
- No app store approval needed
- Instant updates
- Works offline (cached data)
- Add to Home Screen capability
- Camera, GPS, push notifications

---

## PWA Configuration

**Manifest:**

```json
{
  "name": "SpeedyGlass Tech",
  "short_name": "SG Tech",
  "description": "Technician job management",
  "start_url": "/tech",
  "scope": "/tech",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1e40af"
}
```

**Note:** `scope: "/tech"` means PWA only "owns" tech routes. Dashboard opens in browser.

---

## V1 Features

**Must Have:**

- View today's assigned jobs
- View job details (customer, address, vehicle, notes)
- Update job status (En Route → Arrived → In Progress → Complete)
- Auto-trigger SMS to customer on status change
- Submit pre-inspection notes
- Upload before/after photos (camera access)
- Capture customer signature (canvas)
- GPS check-in on arrival
- Pull-to-refresh job list
- Add to Home Screen prompt

**Deferred to V2:**

- True offline mode with background sync
- Push notifications
- Route navigation integration
- Parts inventory check

---

## Screen Breakdown

### Home / Job List (`/tech`)

**Header:** "Today's Jobs" + date

**Job Cards:** Sorted by scheduled time

- Time
- Customer name
- Address
- Vehicle (Year Make Model)
- Service type
- Icons: 🔧 Calibration required, 📍 Mobile, ⚠️ Special notes

**Navigation:** Bottom tab bar

```
[ Jobs ]  [ Schedule ]  [ Profile ]
```

**Interactions:**

- Pull down → Refresh
- Tap card → Job detail

---

### Job Detail (`/tech/jobs/:id`)

**Customer Section:**

- Name
- Phone (tap to call)
- Address (tap for maps navigation)

**Vehicle Section:**

- Year Make Model
- Service type
- Glass type

**Job Info:**

- Scheduled time
- Job notes from CSR
- Flags: Calibration Required, Mobile Job

**Status Buttons:**

```
[ En Route ] → [ Arrived ] → [ Start Job ] → [ Complete ]
```

**Action Buttons:**

```
[ Pre-Inspect ] [ Photos ] [ Complete ]
```

---

### Pre-Inspection (`/tech/jobs/:id/inspect`)

- Vehicle diagram (tap to mark existing damage)
- Checkbox: "Customer present"
- Checkbox: "Work area clear"
- Notes field (free text)
- Button: [ Save & Continue ]

**Purpose:** Protect tech from blame for pre-existing damage.

---

### Photos (`/tech/jobs/:id/photos`)

- Before photos section (camera capture)
- After photos section (camera capture)
- Thumbnail grid with delete option
- Required: At least 1 before, 1 after
- Button: [ Save ]

**Storage:** Upload to S3, link to job.

---

### Complete (`/tech/jobs/:id/complete`)

- Summary of work done
- Calibration completed? (toggle if applicable)
- Signature canvas (customer signs on screen)
- Button: [ Complete Job ]

**On Complete:**

- Job status → COMPLETED
- Customer SMS: "Your job is complete. Thanks!"
- Return to home screen

---

### Schedule (`/tech/schedule`)

- Week view (Mon-Sun columns)
- Each day shows job count
- Tap day → Shows jobs for that day
- Today highlighted
- Swipe to navigate weeks

---

### Profile (`/tech/profile`)

- Name, photo
- Employee ID
- Primary shop
- Skills badges (read-only): Calibration ✓, Sunroof ✓
- Tier display: "Tier 2 - Pro"
- Button: [ Logout ]

---

## Tech App API Touchpoints

| Screen        | Endpoints Used                        |
| ------------- | ------------------------------------- |
| Home          | `GET /api/tech/jobs/?date=today`      |
| Job Detail    | `GET /api/tech/jobs/:id/`             |
| Status Update | `POST /api/tech/jobs/:id/status/`     |
| GPS Check-in  | `POST /api/tech/jobs/:id/checkin/`    |
| Pre-Inspect   | `POST /api/tech/jobs/:id/inspection/` |
| Photos        | `POST /api/tech/jobs/:id/photos/`     |
| Complete      | `POST /api/tech/jobs/:id/signature/`  |
| Schedule      | `GET /api/tech/jobs/?week=current`    |
| Profile       | `GET /api/auth/me/`                   |

---

## Tech Status Flow

```
ASSIGNED
    │
    ▼ tap "En Route"
EN_ROUTE ──────→ SMS: "Tech is on the way"
    │
    ▼ tap "Arrived" + GPS check
ARRIVED ───────→ SMS: "Tech has arrived"
    │
    ▼ tap "Start Job"
IN_PROGRESS
    │
    ▼ tap "Complete" + signature
COMPLETED ─────→ SMS: "Job complete!"
```

---

# 9. SCHEDULING & AVAILABILITY

## Overview

Intelligent matching of jobs to qualified, available technicians. Not just "is the shop open?" but "who is available that can do this specific job?"

## The Problem

Not every tech can do every job. A rookie shouldn't calibrate a Tesla. The system must only show slots where a qualified tech is free.

---

## Technician Skills Matrix

### Certification Tiers

| Tier   | Level      | Can Do                                       |
| ------ | ---------- | -------------------------------------------- |
| Tier 1 | Apprentice | Simple domestic windshields, chip repairs    |
| Tier 2 | Pro        | Foreign vehicles, tempered glass, basic ADAS |
| Tier 3 | Master     | Luxury vehicles, complex ADAS, custom glass  |

### Hard Skills (Boolean Flags)

| Skill               | Description                                |
| ------------------- | ------------------------------------------ |
| `can_calibrate`     | ADAS dynamic/static calibrations           |
| `can_do_tempered`   | Door glass, back glass (debris/panel work) |
| `can_do_sunroof`    | Roof glass specialist (high leak risk)     |
| `can_do_heavy_duty` | RVs, Semis, Buses                          |

### Skill Requirements by Job

| Job Type                                       | Required Skills     | Min Tier |
| ---------------------------------------------- | ------------------- | -------- |
| Basic windshield (domestic)                    | None                | Tier 1   |
| Basic windshield (foreign)                     | None                | Tier 2   |
| Windshield + ADAS                              | `can_calibrate`     | Tier 2   |
| Luxury vehicle (BMW, Mercedes, Tesla, Porsche) | `can_calibrate`     | Tier 3   |
| Door/rear glass                                | `can_do_tempered`   | Tier 2   |
| Sunroof/moonroof                               | `can_do_sunroof`    | Tier 2   |
| RV/Motorhome                                   | `can_do_heavy_duty` | Tier 3   |

---

## Availability Management

### Shop Hours

Global operating hours per day of week:

- Example: Mon-Fri 8:00 AM - 5:00 PM, Sat 9:00 AM - 2:00 PM, Sun Closed

### Tech Shifts

Individual overrides per technician:

- Example: "Tech John" works 7:00 AM - 3:00 PM
- Example: "Tech Sarah" works 10:00 AM - 6:00 PM

System respects both: Won't book John at 4 PM even if shop is open.

### Time Blocks

Managers can block time for:

- PTO / Vacation
- Sick days
- Training
- Meetings

---

## Capacity & Duration Logic

System calculates job duration dynamically:

```
Total_Job_Time = Glass_Labor_Hrs + Calibration_Time + Buffer

Example:
- Honda Civic Windshield: 1.5 hrs (from NAGS)
- Calibration: 1.0 hr
- Buffer: 0.5 hr
- Total: 3.0 hours
```

System scans for a contiguous 3-hour gap in qualified tech's schedule.

---

## The Matching Algorithm

When user reaches "Select Time" screen:

### Step 1: Analyze Quote

```
Part: DW1234 (Windshield)
Feature: ADAS Camera (Requires Calibration)
Vehicle: BMW X5 (Luxury Tier)
```

### Step 2: Determine Requirements

```
needs_calibration: True
glass_type: windshield
min_tier: 3 (Luxury)
is_heavy_duty: False
```

### Step 3: Filter Technicians

```
Start: All techs at selected Shop
Filter: Remove techs with can_calibrate = False
Filter: Remove techs with tier < 3
Result: Only "Tech Mike" and "Tech Sarah" qualify
```

### Step 4: Check Calendars

```
Mike's Schedule:
- 9:00 AM - 12:00 PM: Booked
- 12:00 PM - 5:00 PM: Free

Sarah's Schedule:
- 9:00 AM - 2:00 PM: Free
- 2:00 PM - 5:00 PM: Booked
```

### Step 5: Find Slots

```
Need: 3-hour contiguous block
Mike: 12:00 PM - 3:00 PM ✓, 1:00 PM - 4:00 PM ✓, 2:00 PM - 5:00 PM ✓
Sarah: 9:00 AM - 12:00 PM ✓, 10:00 AM - 1:00 PM ✓, 11:00 AM - 2:00 PM ✓
```

### Step 6: Display Slots

User sees:

- Tuesday 9:00 AM (Sarah)
- Tuesday 10:00 AM (Sarah)
- Tuesday 12:00 PM (Mike)
- Tuesday 1:00 PM (Mike)

User does NOT see Tuesday 9:00 AM with the rookie tech (Tier 1).

---

## Mobile Capability

Each tech has:

- `is_mobile_capable`: Boolean
- `mobile_radius_override_km`: Optional personal limit

If tech is not mobile capable, only show their slots for in-shop jobs.

If tech has personal radius limit, respect it over shop default.

---

## Edge Cases

### Sick Day (Unplanned Absence)

1. Manager marks Tech Mike as "Unavailable" for today
2. System scans Mike's booked jobs
3. For each job:
   - Check if another qualified tech is free at same time
   - If yes: Auto-reassign, notify customer
   - If no: Flag job as "RESCHEDULE NEEDED" (Red alert in CSR dashboard)

### Two-Tech Jobs (Future Phase 2)

Some jobs (large RV windshields) require 2 technicians.

Logic: Find time slot where TWO qualified resources are free simultaneously.

Marked for Phase 2.

---

## Manager UI for Skills

**Technician Card View:**

```
┌─────────────────────────────────────┐
│ Mike Stevens                        │
│ Tier 3 - Master                     │
│ Primary Shop: Downtown              │
├─────────────────────────────────────┤
│ Skills:                             │
│ [✓] ADAS Calibrations               │
│ [✓] Tempered Glass                  │
│ [ ] Sunroofs                        │
│ [✓] Heavy Duty                      │
├─────────────────────────────────────┤
│ Mobile:                             │
│ [✓] Mobile Capable                  │
│ Radius: 25km (override)             │
└─────────────────────────────────────┘
```

Toggle switches for instant skill updates.

---

# 10. API ENDPOINTS

## Authentication & Session

| Method | Endpoint                            | Roles  | Description                       |
| ------ | ----------------------------------- | ------ | --------------------------------- |
| POST   | `/api/auth/login/`                  | Public | Email/password login, returns JWT |
| POST   | `/api/auth/logout/`                 | Auth   | Invalidate token                  |
| POST   | `/api/auth/refresh/`                | Auth   | Refresh JWT token                 |
| GET    | `/api/auth/me/`                     | Auth   | Get current user profile + role   |
| PUT    | `/api/auth/me/`                     | Auth   | Update own profile                |
| POST   | `/api/auth/password/change/`        | Auth   | Change own password               |
| POST   | `/api/auth/password/reset/`         | Public | Request reset email               |
| POST   | `/api/auth/password/reset/confirm/` | Public | Confirm with token                |

---

## Quote Wizard (Public)

| Method | Endpoint                            | Roles  | Description                  |
| ------ | ----------------------------------- | ------ | ---------------------------- |
| POST   | `/api/quotes/session/`              | Public | Create QuoteSession (Step 1) |
| PATCH  | `/api/quotes/session/{id}/`         | Public | Update session (each step)   |
| GET    | `/api/quotes/session/{id}/`         | Public | Retrieve session state       |
| POST   | `/api/quotes/decode/plate/`         | Public | Decode plate → VIN + YMM     |
| POST   | `/api/quotes/decode/vin/`           | Public | Decode VIN → YMM + ADAS      |
| GET    | `/api/quotes/vehicles/years/`       | Public | Get available years          |
| GET    | `/api/quotes/vehicles/makes/`       | Public | Get makes for year           |
| GET    | `/api/quotes/vehicles/models/`      | Public | Get models for year + make   |
| POST   | `/api/quotes/serviceability/`       | Public | Check postal → shop + mobile |
| GET    | `/api/quotes/session/{id}/pricing/` | Public | Calculate 3-tier pricing     |
| GET    | `/api/quotes/session/{id}/slots/`   | Public | Available time slots         |
| POST   | `/api/quotes/session/{id}/book/`    | Public | Confirm booking              |
| POST   | `/api/quotes/session/{id}/photo/`   | Public | Upload damage photo          |

---

## Magic Link (Public)

| Method | Endpoint                               | Roles  | Description                 |
| ------ | -------------------------------------- | ------ | --------------------------- |
| GET    | `/q/{token}`                           | Public | Redirect to quote view page |
| GET    | `/api/quotes/public/{token}/`          | Public | Get quote data for display  |
| POST   | `/api/quotes/public/{token}/book/`     | Public | Book from magic link        |
| POST   | `/api/quotes/public/{token}/callback/` | Public | Request callback            |
| POST   | `/api/quotes/public/{token}/email/`    | Public | Email quote to self         |

---

## Quotes (Internal)

| Method | Endpoint                     | Roles               | Description              |
| ------ | ---------------------------- | ------------------- | ------------------------ |
| GET    | `/api/quotes/`               | CSR, DivMgr, NetMgr | List quotes (filterable) |
| GET    | `/api/quotes/{id}/`          | CSR, DivMgr, NetMgr | Get quote detail         |
| PUT    | `/api/quotes/{id}/`          | CSR, DivMgr         | Update quote             |
| POST   | `/api/quotes/{id}/override/` | CSR                 | Apply price override     |
| POST   | `/api/quotes/{id}/send/`     | CSR, DivMgr         | Send via email/SMS       |
| POST   | `/api/quotes/{id}/convert/`  | CSR, DivMgr         | Convert to job           |
| GET    | `/api/quotes/{id}/history/`  | CSR, DivMgr, NetMgr | Audit log                |

---

## Customers

| Method | Endpoint                            | Roles               | Description         |
| ------ | ----------------------------------- | ------------------- | ------------------- |
| GET    | `/api/customers/`                   | CSR, DivMgr, NetMgr | List customers      |
| POST   | `/api/customers/`                   | CSR                 | Create customer     |
| GET    | `/api/customers/{id}/`              | CSR, DivMgr, NetMgr | Get customer detail |
| PUT    | `/api/customers/{id}/`              | CSR                 | Update customer     |
| GET    | `/api/customers/{id}/quotes/`       | CSR, DivMgr         | Quote history       |
| GET    | `/api/customers/{id}/jobs/`         | CSR, DivMgr         | Job history         |
| GET    | `/api/customers/{id}/interactions/` | CSR, DivMgr         | Timeline            |
| POST   | `/api/customers/{id}/merge/`        | DivMgr, NetMgr      | Merge duplicates    |

---

## Jobs

| Method | Endpoint                       | Roles                     | Description    |
| ------ | ------------------------------ | ------------------------- | -------------- |
| GET    | `/api/jobs/`                   | CSR, DivMgr, NetMgr       | List all jobs  |
| GET    | `/api/jobs/{id}/`              | CSR, Tech, DivMgr, NetMgr | Get job detail |
| PUT    | `/api/jobs/{id}/`              | CSR, DivMgr               | Update job     |
| POST   | `/api/jobs/{id}/cancel/`       | CSR, DivMgr               | Cancel job     |
| GET    | `/api/jobs/board/`             | CSR, DivMgr               | Live job board |
| GET    | `/api/jobs/reschedule-needed/` | CSR, DivMgr               | Flagged jobs   |

---

## Technician App

| Method | Endpoint                           | Roles | Description         |
| ------ | ---------------------------------- | ----- | ------------------- |
| GET    | `/api/tech/jobs/`                  | Tech  | My assigned jobs    |
| GET    | `/api/tech/jobs/{id}/`             | Tech  | Job detail          |
| POST   | `/api/tech/jobs/{id}/status/`      | Tech  | Update status       |
| POST   | `/api/tech/jobs/{id}/checkin/`     | Tech  | GPS check-in        |
| POST   | `/api/tech/jobs/{id}/inspection/`  | Tech  | Pre-inspection form |
| POST   | `/api/tech/jobs/{id}/photos/`      | Tech  | Upload photos       |
| POST   | `/api/tech/jobs/{id}/calibration/` | Tech  | Log calibration     |
| POST   | `/api/tech/jobs/{id}/signature/`   | Tech  | Customer signature  |
| GET    | `/api/tech/schedule/`              | Tech  | My weekly schedule  |
| PUT    | `/api/tech/availability/`          | Tech  | Update availability |

---

## Inbox / Omnichannel

| Method | Endpoint                                | Roles       | Description        |
| ------ | --------------------------------------- | ----------- | ------------------ |
| GET    | `/api/inbox/conversations/`             | CSR, DivMgr | List conversations |
| GET    | `/api/inbox/conversations/{id}/`        | CSR, DivMgr | Get thread         |
| POST   | `/api/inbox/conversations/{id}/reply/`  | CSR         | Send reply         |
| POST   | `/api/inbox/conversations/{id}/assign/` | CSR, DivMgr | Assign to CSR      |
| GET    | `/api/inbox/templates/`                 | CSR, DivMgr | Canned responses   |
| POST   | `/api/inbox/sms/send/`                  | CSR         | Ad-hoc SMS         |
| POST   | `/api/inbox/email/send/`                | CSR         | Ad-hoc email       |

---

## Webhooks (System)

| Method | Endpoint                          | Auth       | Description       |
| ------ | --------------------------------- | ---------- | ----------------- |
| POST   | `/api/webhooks/twilio/inbound/`   | Twilio Sig | Inbound SMS       |
| POST   | `/api/webhooks/sendgrid/inbound/` | SendGrid   | Inbound email     |
| POST   | `/api/webhooks/sendgrid/events/`  | SendGrid   | Open/click events |

---

## Live Board (Real-time)

| Method | Endpoint                   | Roles       | Description               |
| ------ | -------------------------- | ----------- | ------------------------- |
| GET    | `/api/live/visitors/`      | CSR, DivMgr | Active visitors (Phase 2) |
| POST   | `/api/live/chat/initiate/` | CSR         | Start chat (Phase 2)      |
| WS     | `/ws/live/board/`          | CSR, DivMgr | Real-time updates         |
| WS     | `/ws/inbox/`               | CSR         | New messages              |
| WS     | `/ws/jobs/`                | CSR, DivMgr | Job status changes        |

---

## Approvals

| Method | Endpoint                       | Roles          | Description        |
| ------ | ------------------------------ | -------------- | ------------------ |
| GET    | `/api/approvals/`              | DivMgr         | List pending       |
| GET    | `/api/approvals/{id}/`         | DivMgr         | Get detail         |
| POST   | `/api/approvals/{id}/approve/` | DivMgr         | Approve            |
| POST   | `/api/approvals/{id}/reject/`  | DivMgr         | Reject with reason |
| GET    | `/api/approvals/history/`      | DivMgr, NetMgr | Audit log          |

---

## Scheduling

| Method | Endpoint                                             | Roles               | Description           |
| ------ | ---------------------------------------------------- | ------------------- | --------------------- |
| GET    | `/api/scheduling/slots/`                             | CSR, DivMgr, NetMgr | Query available slots |
| GET    | `/api/scheduling/technicians/{id}/calendar/`         | DivMgr, NetMgr      | Tech calendar         |
| POST   | `/api/scheduling/technicians/{id}/block/`            | DivMgr, NetMgr      | Block time            |
| DELETE | `/api/scheduling/technicians/{id}/block/{block_id}/` | DivMgr, NetMgr      | Remove block          |
| GET    | `/api/scheduling/capacity/`                          | DivMgr, NetMgr      | Shop capacity         |

---

## Technicians (Management)

| Method | Endpoint                             | Roles          | Description       |
| ------ | ------------------------------------ | -------------- | ----------------- |
| GET    | `/api/technicians/`                  | DivMgr, NetMgr | List technicians  |
| POST   | `/api/technicians/`                  | NetMgr         | Create technician |
| GET    | `/api/technicians/{id}/`             | DivMgr, NetMgr | Get detail        |
| PUT    | `/api/technicians/{id}/`             | NetMgr         | Update technician |
| PATCH  | `/api/technicians/{id}/skills/`      | NetMgr         | Update skills     |
| PATCH  | `/api/technicians/{id}/tier/`        | NetMgr         | Update tier       |
| POST   | `/api/technicians/{id}/transfer/`    | NetMgr         | Transfer shop     |
| GET    | `/api/technicians/{id}/performance/` | DivMgr, NetMgr | Metrics           |
| POST   | `/api/technicians/import/`           | NetMgr         | Bulk CSV import   |

---

## Shops

| Method | Endpoint                       | Roles               | Description       |
| ------ | ------------------------------ | ------------------- | ----------------- |
| GET    | `/api/shops/`                  | CSR, DivMgr, NetMgr | List shops        |
| POST   | `/api/shops/`                  | NetMgr              | Create shop       |
| GET    | `/api/shops/{id}/`             | CSR, DivMgr, NetMgr | Get detail        |
| PUT    | `/api/shops/{id}/`             | NetMgr              | Update shop       |
| GET    | `/api/shops/{id}/hours/`       | CSR, DivMgr, NetMgr | Operating hours   |
| PUT    | `/api/shops/{id}/hours/`       | NetMgr              | Update hours      |
| GET    | `/api/shops/{id}/technicians/` | DivMgr, NetMgr      | Techs at shop     |
| GET    | `/api/shops/{id}/jobs/`        | DivMgr, NetMgr      | Jobs at shop      |
| PATCH  | `/api/shops/{id}/radius/`      | NetMgr              | Update radius     |
| GET    | `/api/shops/map/`              | NetMgr              | All shops for map |

---

## Dashboard & Analytics

| Method | Endpoint                                 | Roles          | Description         |
| ------ | ---------------------------------------- | -------------- | ------------------- |
| GET    | `/api/dashboard/`                        | All (filtered) | Main dashboard data |
| GET    | `/api/dashboard/csr/`                    | CSR            | CSR widgets         |
| GET    | `/api/dashboard/tech/`                   | Tech           | Tech widgets        |
| GET    | `/api/dashboard/manager/`                | DivMgr         | Manager widgets     |
| GET    | `/api/dashboard/network/`                | NetMgr         | Network overview    |
| GET    | `/api/analytics/funnel/`                 | DivMgr, NetMgr | Drop-off analysis   |
| GET    | `/api/analytics/conversion/`             | DivMgr, NetMgr | Conversion rates    |
| GET    | `/api/analytics/revenue/`                | DivMgr, NetMgr | Revenue breakdown   |
| GET    | `/api/analytics/technician-utilization/` | DivMgr, NetMgr | Utilization         |

---

# 11. RBAC — ROLES & PERMISSIONS

## Role Definitions

| Role                 | Description                         | Access Level                          |
| -------------------- | ----------------------------------- | ------------------------------------- |
| **Customer**         | Public user completing quote wizard | Public endpoints only                 |
| **Technician**       | Field tech with mobile app          | Own jobs, limited profile             |
| **CSR**              | Customer Service Rep                | Quotes, customers, inbox, jobs        |
| **Division Manager** | Team lead                           | CSR access + approvals + team metrics |
| **Network Manager**  | Operations lead                     | Full access except system config      |
| **App Admin**        | System administrator                | Django Admin for config               |

---

## Permission Matrix

| Module            | Customer  | Tech    | CSR        | Div Mgr    | Net Mgr    |
| ----------------- | --------- | ------- | ---------- | ---------- | ---------- |
| Quote Wizard      | ✅ Create | —       | ✅ Full    | ✅ Full    | ✅ Read    |
| Quotes (Internal) | —         | —       | ✅ Edit    | ✅ Edit    | ✅ Read    |
| Customers         | —         | —       | ✅ Full    | ✅ Read    | ✅ Read    |
| Jobs              | —         | ✅ Own  | ✅ Full    | ✅ Full    | ✅ Read    |
| Tech App          | —         | ✅ Full | —          | —          | —          |
| Inbox             | —         | —       | ✅ Full    | ✅ Read    | —          |
| Approvals         | —         | —       | ✅ Request | ✅ Approve | ✅ Read    |
| Scheduling        | —         | ✅ Own  | ✅ Read    | ✅ Edit    | ✅ Full    |
| Technicians       | —         | —       | —          | ✅ Read    | ✅ Full    |
| Shops             | —         | —       | ✅ Read    | ✅ Read    | ✅ Full    |
| Dashboard         | —         | ✅ Own  | ✅ Own     | ✅ Team    | ✅ Network |
| Analytics         | —         | —       | —          | ✅ Full    | ✅ Full    |

---

## Dashboard Data by Role

**Tech sees:**

- My jobs today
- My jobs this week
- My completion rate
- My average rating

**CSR sees:**

- Quotes pending action
- Inbox unread count
- My conversion rate
- Today's booked jobs

**Division Manager sees:**

- Pending approvals count
- Team conversion rate
- Revenue today/week/month
- Technician utilization (division)
- Jobs needing reschedule

**Network Manager sees:**

- All shops capacity heatmap
- Network-wide revenue
- Technician utilization (all)
- Service area coverage
- Funnel drop-off alerts

---

# 12. INTEGRATIONS

## AutoBolt (Vehicle Decode)

**Purpose:** Convert license plate or VIN to full vehicle details

**Input:**

- License Plate + State/Province
- OR VIN (17 characters)

**Output:**

- VIN
- Year, Make, Model, Trim
- Body Class (Sedan, SUV, Motorhome, etc.)
- ADAS Features list

**Usage:**

- Step 3 of Quote Wizard
- Fallback chain: Plate → VIN → Manual YMM

---

## NAGS (Parts & Pricing)

**Purpose:** Industry-standard parts database and pricing

**Input:**

- VIN or Year/Make/Model

**Output:**

- Part Number (e.g., DW01234)
- List Price
- Labor Hours
- Kit Requirement
- ADAS Flag

**Usage:**

- Pricing engine calculations
- Part verification

---

## Twilio (SMS)

**Purpose:** SMS communication

**Features Used:**

- SMS Send (quotes, reminders, status updates)
- SMS Receive (customer replies via webhook)
- Lookup API (verify mobile vs landline)

**Webhook:** `/api/webhooks/twilio/inbound/`

---

## SendGrid (Email)

**Purpose:** Email communication

**Features Used:**

- Transactional email (quotes, confirmations)
- Email templates (branded HTML)
- Open/click tracking (webhooks)

**Webhooks:**

- `/api/webhooks/sendgrid/inbound/` (replies)
- `/api/webhooks/sendgrid/events/` (opens, clicks)

---

## Amazon S3 (Storage)

**Purpose:** File storage

**Stored Files:**

- Customer damage photos
- Technician job photos (before/after)
- Customer signatures
- Generated quote PDFs

**Access:** Presigned URLs for secure upload/download

---

## Google Maps (Geo)

**Purpose:** Location services

**Features Used:**

- Geocoding (postal code → lat/long)
- Distance calculation (shop to customer)
- Address autocomplete (optional)
- Navigation links (tech app)

---

# 13. DATA MODELS

## Entity Relationship Overview

```
Customer
    │
    ├── has many → QuoteSessions (funnel tracking)
    │
    ├── has many → Quotes
    │                 │
    │                 ├── has many → QuoteLineItems
    │                 ├── has many → QuoteViews (tracking)
    │                 └── converts to → Job
    │
    ├── has many → Jobs
    │                 │
    │                 ├── assigned to → Technician
    │                 ├── at → Shop
    │                 ├── has many → JobPhotos
    │                 └── has one → JobSignature
    │
    └── has many → Interactions (SMS, Email, Chat)

Shop
    │
    ├── has many → Technicians
    ├── has many → ShopHours
    └── has one → PricingProfile (optional override)

Technician
    │
    ├── has many → TechnicianShifts
    ├── has many → Jobs (assigned)
    └── has skills → (flags + tier)

PricingProfile
    │
    └── contains all pricing rules
```

---

## Key Entities

### Customer

```
id
first_name
last_name
email
phone
phone_type (mobile | landline)
address_line1
address_line2
city
state
postal_code
latitude
longitude
source (direct | google | referral | ...)
created_at
updated_at
```

### Vehicle

```
id
vin
year
make
model
trim
body_class
has_adas
adas_features (JSON)
nags_part_number
decoded_via (plate | vin | manual)
created_at
```

### QuoteSession (Funnel Tracking)

```
id
session_token (UUID)
customer_id (FK, nullable until Step 5)
vehicle_id (FK, nullable until Step 3)
service_type (replacement | repair | other)
step_reached (1-6)
step_1_completed_at
step_2_completed_at
...
step_6_completed_at
abandoned_at_step
source
device
ip_address
created_at
updated_at
```

### Quote

```
id
quote_number (human readable: SG-2024-00123)
customer_id (FK)
vehicle_id (FK)
session_id (FK)
shop_id (FK)
status (draft | sent | viewed | expired | converted | cancelled)
magic_token (UUID)
token_expires_at
service_type
glass_type
needs_calibration
calibration_type (static | dynamic | double)
is_mobile
distance_miles
pricing_tier_selected (economy | recommended | oem)
subtotal
discount_amount
tax_amount
total
valid_until
created_at
updated_at
sent_at
first_viewed_at
converted_at
cancelled_at
```

### QuoteLineItem

```
id
quote_id (FK)
line_type (glass | labor | kit | calibration | mobile | discount | ...)
description
nags_part_number
quantity
unit_price
discount_percent
discount_amount
line_total
is_variable (for TBD items)
is_taxable
sort_order
```

### QuoteView (Tracking)

```
id
quote_id (FK)
viewed_at
ip_address
user_agent
device_type (mobile | tablet | desktop)
referrer (email | sms | direct)
city
region
```

### Job

```
id
job_number
quote_id (FK)
customer_id (FK)
vehicle_id (FK)
shop_id (FK)
technician_id (FK)
status (scheduled | en_route | arrived | in_progress | completed | cancelled)
scheduled_date
scheduled_time_start
scheduled_time_end
is_mobile
service_address
service_latitude
service_longitude
job_notes
pre_inspection_notes
calibration_completed
completed_at
created_at
updated_at
```

### JobPhoto

```
id
job_id (FK)
photo_type (before | after | damage)
s3_url
uploaded_by (tech user FK)
uploaded_at
```

### JobSignature

```
id
job_id (FK)
signature_data (base64 or S3 URL)
signer_name
signed_at
```

### Shop

```
id
name
code (e.g., DT-001)
address_line1
address_line2
city
state
postal_code
latitude
longitude
mobile_service_radius_miles
extended_radius_miles
surcharge_per_mile
mobile_base_fee
default_open_time
default_close_time
is_active
accepts_mobile_jobs
pricing_profile_id (FK, optional override)
created_at
updated_at
```

### ShopHours

```
id
shop_id (FK)
day_of_week (0-6)
open_time
close_time
is_closed
```

### Technician

```
id
user_id (FK to Django User)
employee_id
primary_shop_id (FK)
tier (1 | 2 | 3)
can_calibrate
can_do_tempered
can_do_sunroof
can_do_heavy_duty
is_mobile_capable
mobile_radius_override
is_active
hire_date
avg_job_rating
created_at
updated_at
```

### TechnicianShift

```
id
technician_id (FK)
day_of_week (0-6)
start_time
end_time
is_off
```

### TechnicianBlock (PTO, Sick, etc.)

```
id
technician_id (FK)
block_type (pto | sick | training | meeting)
start_datetime
end_datetime
notes
created_by (FK)
created_at
```

### Interaction

```
id
customer_id (FK)
quote_id (FK, optional)
job_id (FK, optional)
interaction_type (sms_sent | sms_received | email_sent | email_opened | call | chat)
channel (sms | email | phone | web)
direction (inbound | outbound)
content (message text)
metadata (JSON: message ID, etc.)
created_by (FK, nullable for automated)
created_at
```

### PricingProfile

```
id
name
type (percent_off | flat | cost_plus)
is_default
shop_id (FK, nullable for global)
valid_from
valid_until

# Glass Discounts
domestic_windshield_discount
domestic_tempered_discount
foreign_windshield_discount
foreign_tempered_discount
oem_discount

# Labor
labor_type (flat | multiplier)
glass_labor_rate
default_hourly_rate
labor_domestic_windshield
labor_domestic_tempered
labor_foreign_windshield
labor_foreign_tempered

# Kits
kit_1hr
kit_1_5hr
kit_2hr
kit_2_5hr
kit_3hr
other_kit_flat

# Moulding & Hardware
moulding_pricing
hardware_pricing

# Chip & Crack
chip_repair_1
chip_repair_2
chip_repair_3plus
crack_repair_0_6in
crack_repair_6_12in
crack_repair_12plus_in

# Calibration
calibration_static
calibration_dynamic
calibration_double

# Admin Fees
admin_fee_replace
admin_fee_repair

# Flags
labor_urethane_included

created_at
updated_at
```

### Approval

```
id
quote_id (FK)
requested_by (FK)
request_type (discount | override)
original_value
requested_value
reason
status (pending | approved | rejected)
decided_by (FK)
decided_at
decision_reason
created_at
```

---

# 14. ERROR HANDLING & FALLBACKS

## AutoBolt Down

```
Scenario: Plate decode API unavailable

Action:
1. Show "Enter VIN manually" immediately
2. If VIN also fails → Show Year/Make/Model dropdowns
3. Log incident for monitoring

Customer sees: Seamless fallback, no error message
```

## NAGS Lookup Fails

```
Scenario: No part found for VIN/YMM

Action:
1. Flag quote as MANUAL_PRICE
2. Notify CSR queue
3. Customer sees: "We're preparing your custom quote"
4. CSR manually looks up part and prices
```

## Twilio SMS Fails

```
Scenario: SMS send fails

Action:
1. Retry 3x with exponential backoff
2. If still fails → Send email instead
3. Log for retry queue
4. Alert ops if pattern detected
```

## SendGrid Email Fails

```
Scenario: Email send fails

Action:
1. Retry 3x
2. If still fails → Queue for later retry
3. Log incident
```

## Distance Calculation Fails

```
Scenario: Google Maps API unavailable

Action:
1. Default to "In-Shop Only" selection
2. Or show: "Enter full address for mobile quote"
3. CSR can manually calculate if needed
```

## Payment Fails (Future)

```
Scenario: Payment processor down

Action:
1. Allow booking without payment
2. Flag as "Payment Pending"
3. Collect payment on-site or via follow-up link
```

## Scheduling No Slots

```
Scenario: No qualified tech available for requested timeframe

Action:
1. Expand date range shown
2. Show message: "Earliest available: [date]"
3. Offer callback: "Want us to call when earlier opens?"
```

---

# 15. V1 SCOPE — IN VS DEFERRED

## In V1 ✅

| Area                  | Features                                   |
| --------------------- | ------------------------------------------ |
| Quote Wizard          | Full 6-step flow, all logic                |
| Pricing Engine        | Complete List-Less calculation             |
| Magic Links           | Generation, tracking, booking              |
| Customer Management   | CRUD, history, interactions                |
| Quote Management      | List, detail, resend, convert              |
| Job Management        | Basic CRUD, status tracking                |
| Tech App (PWA)        | Full flow: jobs, status, photos, signature |
| Scheduling            | Skill-based matching, slot display         |
| Inbox                 | SMS + Email unified view                   |
| Communication         | Automated + manual messaging               |
| Approvals             | Discount approval workflow                 |
| Technician Management | Skills, tiers, assignments                 |
| Shop Management       | CRUD, hours, radius                        |
| RBAC                  | All roles implemented                      |
| Integrations          | AutoBolt, NAGS, Twilio, SendGrid, S3, Maps |

## Deferred to V2+ 🔵

| Feature                     | Reason                            |
| --------------------------- | --------------------------------- |
| Payment Processing          | Start with "pay on site"          |
| Insurance Claims Flow       | Complex, varies by provider       |
| Inventory Management        | Use spreadsheet initially         |
| Fleet Accounts              | Handle as regular quotes          |
| Live Visitor Tracking       | Nice to have, not essential       |
| Territory Map Visualization | Manual assignment works           |
| Native Mobile Apps          | PWA is sufficient                 |
| Multi-Language              | English only for USA launch       |
| Push Notifications          | Email/SMS sufficient for V1       |
| Offline Sync (Tech)         | Network-first with cache fallback |
| Two-Tech Jobs               | Rare edge case                    |
| Customer Portal             | Magic links sufficient            |
| Advanced Analytics          | Basic dashboards first            |
| A/B Testing                 | Later optimization                |
| Chat Widget                 | Phone/SMS sufficient              |

---

# 16. TECH STACK

## Backend

| Component  | Technology                        |
| ---------- | --------------------------------- |
| Framework  | Django 5 + Django REST Framework  |
| Database   | PostgreSQL                        |
| Cache      | Redis                             |
| Task Queue | Celery + Redis                    |
| Auth       | JWT (SimpleJWT)                   |
| Admin      | Django Admin (for App Admin role) |

## Frontend

| Component | Technology                                      |
| --------- | ----------------------------------------------- |
| Framework | React 18 + TypeScript                           |
| Routing   | React Router v6                                 |
| State     | React Query (server state) + Zustand (UI state) |
| Styling   | Tailwind CSS                                    |
| Forms     | React Hook Form + Zod                           |
| PWA       | Vite PWA Plugin                                 |

## Infrastructure

| Component    | Technology                      |
| ------------ | ------------------------------- |
| Hosting      | TBD (AWS / Railway / Render)    |
| File Storage | Amazon S3                       |
| CDN          | CloudFront (optional)           |
| SSL          | Let's Encrypt / AWS ACM         |
| CI/CD        | GitHub Actions                  |
| Monitoring   | Sentry (errors) + basic logging |

## Integrations

| Service     | Purpose             |
| ----------- | ------------------- |
| AutoBolt    | Vehicle decode      |
| NAGS        | Parts & pricing     |
| Twilio      | SMS                 |
| SendGrid    | Email               |
| Google Maps | Geocoding, distance |

---

# 17. OPEN DECISIONS

Decisions needing sign-off before development:

| Decision         | Options                         | Recommendation                        | Status  |
| ---------------- | ------------------------------- | ------------------------------------- | ------- |
| Auth Method      | Session vs JWT                  | JWT (PWA needs it)                    | Pending |
| State Management | Redux vs Zustand vs React Query | React Query + Zustand                 | Pending |
| File Upload      | S3 direct vs presigned URLs     | Presigned (secure)                    | Pending |
| Real-time        | Polling vs WebSocket            | WebSocket for inbox, polling for tech | Pending |
| SMS Fallback     | Twilio only vs backup provider  | Twilio + queue retry                  | Pending |
| Offline Mode     | Cache-first vs network-first    | Network-first + cache fallback        | Pending |
| Tax Calculation  | By state? Integration?          | TBD - need requirements               | Pending |
| Hosting          | AWS vs Railway vs Render        | TBD - cost/complexity                 | Pending |
| Domain Structure | Single vs subdomains            | Single domain, route-based            | Pending |

---

# 18. GLOSSARY

| Term             | Definition                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| **ADAS**         | Advanced Driver Assistance Systems — cameras and sensors requiring calibration after windshield replacement |
| **AutoBolt**     | Third-party API for decoding license plates and VINs to vehicle details                                     |
| **Calibration**  | Post-installation procedure to realign ADAS sensors (static, dynamic, or both)                              |
| **CSR**          | Customer Service Representative — staff handling quotes and customer communication                          |
| **List-Less**    | Industry pricing method: start from NAGS list price, apply discount percentage                              |
| **Magic Link**   | Unique URL allowing customer to view/book their quote without login                                         |
| **NAGS**         | National Auto Glass Specifications — industry standard parts database and pricing                           |
| **OEE**          | Original Equipment Equivalent — aftermarket glass meeting OEM specifications                                |
| **OEM**          | Original Equipment Manufacturer — factory original glass                                                    |
| **PWA**          | Progressive Web App — web app with native-like capabilities (offline, install, camera)                      |
| **QuoteSession** | Entity tracking customer's journey through the quote wizard (funnel analytics)                              |
| **Tier**         | Technician certification level (1=Apprentice, 2=Pro, 3=Master)                                              |

---

# DOCUMENT HISTORY

| Version | Date     | Author | Changes                    |
| ------- | -------- | ------ | -------------------------- |
| 1.0     | Dec 2024 | [Team] | Initial comprehensive spec |

---

# NEXT STEPS

1. Review and sign off on Open Decisions
2. Set up project repositories (backend + frontend)
3. Begin with Django models and Pricing Engine
4. Parallel: React project scaffold and Quote Wizard UI
5. Integration setup (Twilio, SendGrid, S3)
6. Sprint planning for Week 1-4

---

_End of Document_
