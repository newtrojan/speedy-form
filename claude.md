# Speedy Glass - AI Context

Auto glass quote generation system with omnichannel CSR dashboard.
- **Backend:** Django REST API + Celery async processing
- **Frontend:** React SPA with real-time messaging
- **Integration:** Chatwoot for SMS/Email/Webchat

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Django 5 + DRF + Celery + PostGIS |
| Frontend | React 19 + TypeScript + TanStack Query + Tailwind |
| Messaging | Chatwoot (omnichannel) |
| Database | PostgreSQL + PostGIS |
| Cache/Queue | Redis |
| Infra | Docker Compose |

---

## Architecture Patterns

### Backend
- **Service Layer:** Business logic in `services.py`, not views or models
- **State Machine:** django-fsm for Quote lifecycle (`draft` → `pending_validation` → `sent` → `approved`)
- **Async Tasks:** Celery for emails, quote generation, long-running ops

### Frontend
- **Feature-based:** `/features/{name}/` with co-located components, hooks, api, types
- **Server State:** TanStack Query for ALL API calls (caching, sync, refetch)
- **Forms:** React Hook Form + Zod validation

### Messaging
- **Customer-Centric:** Conversations belong to CUSTOMERS, not quotes
- **Unified Inbox:** All channels merged, enriched with Django customer data
- **Omnichannel:** Single API for SMS, Email, Webchat via Chatwoot

---

## Code Standards

### TypeScript/JavaScript
```typescript
// ALWAYS use:
import { foo } from './bar';     // ESM imports
async function getData() {}      // async/await
const x = obj?.prop ?? default;  // Optional chaining, nullish coalescing
import { api } from '@/api';     // Path aliases (@/ → ./src/)

// NEVER use:
require('module');               // CommonJS
promise.then().catch();          // Promise chains
var x = 1;                       // var keyword
```

### Python
- Type hints on all functions
- Service classes for business logic
- Django ORM only, no raw SQL
- snake_case for functions/variables, PascalCase for classes

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| React component | PascalCase | `InboxTab.tsx` |
| Hook | camelCase + use | `useInbox` |
| API function | camelCase | `getQuoteMessages` |
| Python function | snake_case | `get_inbox_conversations` |
| Python class | PascalCase | `ConversationService` |

---

## Security Rules

**Non-negotiable:**
- Never commit `.env` files or secrets
- Always validate: Zod (frontend), DRF serializers (backend)
- Parameterized queries only (Django ORM enforces this)
- JWT in localStorage, auto-clear on 401
- Approval tokens: SHA256 hashed, 24hr expiry
- CORS: Explicit whitelist only

---

## Key Abstractions

### Backend Services
| Service | Purpose |
|---------|---------|
| `ConversationService` | Chatwoot messaging, inbox operations |
| `PricingCalculator` | Quote pricing with shop rules |
| `ServiceabilityService` | Geographic coverage checks |
| `Quote` (model) | FSM state machine with transitions |

### Frontend Hooks
| Hook | Purpose |
|------|---------|
| `useInbox()` | Unified inbox with customer enrichment |
| `useQuotes()` | Quote queue with filters |
| `useQuoteDetail()` | Single quote + engagement data |
| `useQuoteMessages()` | Omnichannel message timeline |
| `useSendMessage()` | Send via any channel |

### API Layer
- `dashboardApi.ts` - All CSR dashboard endpoints
- `getInbox()`, `getQuoteMessages()`, `sendQuoteMessage()`
- Base URL: `/api/v1/dashboard/`

---

## Quick Commands

```bash
# Start everything
docker compose up

# Before commits (required)
npm run validate    # type-check + lint + format

# Django shell
docker compose exec backend python manage.py shell

# Create migrations
docker compose exec backend python manage.py makemigrations
```

### URLs
- Frontend: http://localhost:3333
- API Docs: http://localhost:8000/api/docs
- MailHog: http://localhost:8025

---

## Project Structure

```
backend/
├── integrations/chatwoot/    # Chatwoot service + views
├── customers/                # Customer model + signals
├── quotes/                   # Quote FSM + lifecycle
├── pricing/                  # Pricing engine
└── support_dashboard/        # CSR API endpoints

frontend/src/
├── features/dashboard/       # CSR dashboard (quotes + inbox)
│   ├── components/          # InboxTab, MessagesTab, etc.
│   ├── hooks/               # useInbox, useQuotes, etc.
│   ├── api/                 # dashboardApi.ts
│   └── types.ts             # TypeScript interfaces
├── features/quote-wizard/    # Customer quote flow
└── components/ui/            # Shared UI components
```

---

## Django Apps

| App | Responsibility |
|-----|----------------|
| `core` | Settings, auth, permissions, base classes |
| `customers` | Customer model with E.164 phone normalization |
| `quotes` | Quote FSM, line items, state history |
| `pricing` | PricingCalculator, shop rules, insurance |
| `shops` | Shop locations, service areas (PostGIS) |
| `vehicles` | VIN lookup, Autobolt integration |
| `integrations.chatwoot` | Omnichannel messaging service |
| `support_dashboard` | CSR queue, validation, notes |
