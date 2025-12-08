What we'll build first:

1. Add csr_notes field to Quote model (tiny migration)
2. Dashboard stats endpoint
3. Quotes list endpoint with filters
4. Quote detail endpoint
5. Send/resend quote endpoints

⏺ User approved Claude's plan
⎿  Plan saved to: ~/.claude/plans/serene-dazzling-jellyfish.md · /plan to edit
Staff Dashboard & RBAC System - Phase 4

     Context

     Phase 3 (Quote Failsafes & Auto-Send) is complete. Now building the internal staff
     dashboard.

     Current State

     - Backend: Django REST API with JWT auth, basic IsSupportAgent permission
     - Frontend: Quote wizard exists, no dashboard yet
     - Auth: Django User model + Groups (only "Support Agent" group exists)
     - Models: Quote, Shop, Customer exist - no Technician, StaffProfile, or Region models
      yet

     ---
     Role Hierarchy (5 Roles)

     | Role             | Scope              | Key Capabilities
       |
     |------------------|--------------------|--------------------------------------------
     --|
     | CSR              | All shops          | View/manage quotes, customers, inbox, jobs
       |
     | Technician       | 1-3 assigned shops | View own jobs, update status, complete work
       |
     | Division Manager | Regional shops     | CSR + approvals + team metrics + shop
     config |
     | Network Manager  | All shops          | Division Mgr + all shops + technician mgmt
       |
     | App Admin        | System-wide        | Network Mgr + Django Admin access
       |

     Permission Inheritance

     App Admin
         ↓ includes
     Network Manager
         ↓ includes
     Division Manager
         ↓ includes
     CSR
     Technician is separate (field-focused, not office-focused).

     ---
     New Models Needed

     1. Region (for Division Managers)

     class Region(models.Model):
         name = models.CharField(max_length=100)  # "Southwest", "Northeast"
         shops = models.ManyToManyField(Shop, related_name="regions")
         is_active = models.BooleanField(default=True)

     2. StaffProfile (extends User)

     class StaffProfile(models.Model):
         ROLE_CHOICES = [
             ("csr", "Customer Service Rep"),
             ("technician", "Technician"),
             ("division_manager", "Division Manager"),
             ("network_manager", "Network Manager"),
             ("app_admin", "App Admin"),
         ]

         user = models.OneToOneField(User, on_delete=models.CASCADE)
         role = models.CharField(max_length=20, choices=ROLE_CHOICES)

         # For Division Managers - which regions they manage
         managed_regions = models.ManyToManyField(Region, blank=True)

         # For Technicians - which shops they work at (1-3)
         assigned_shops = models.ManyToManyField(Shop, blank=True)

         phone = models.CharField(max_length=20, blank=True)
         is_active = models.BooleanField(default=True)

     3. Technician (extends StaffProfile for tech-specific data)

     class Technician(models.Model):
         TIER_CHOICES = [(1, "Apprentice"), (2, "Pro"), (3, "Master")]

         staff_profile = models.OneToOneField(StaffProfile, on_delete=models.CASCADE)
         employee_id = models.CharField(max_length=50, unique=True)
         tier = models.IntegerField(choices=TIER_CHOICES, default=1)

         # Skills
         can_calibrate = models.BooleanField(default=False)
         can_do_tempered = models.BooleanField(default=False)
         can_do_sunroof = models.BooleanField(default=False)
         can_do_heavy_duty = models.BooleanField(default=False)

         # Mobile capability
         is_mobile_capable = models.BooleanField(default=True)
         mobile_radius_override = models.IntegerField(null=True, blank=True)

         hire_date = models.DateField(null=True, blank=True)

     ---
     Dashboard Features by Role

     CSR Dashboard (Primary Focus for V1)

     | Feature         | Description                                | Priority |
     |-----------------|--------------------------------------------|----------|
     | Quote Queue     | List of quotes in pending_validation state | P0       |
     | Quote Detail    | View/edit quote, send to customer, reject  | P0       |
     | Customer List   | Search customers by name/phone/email       | P1       |
     | Customer Detail | View quotes, jobs, contact info            | P1       |
     | Quick Actions   | Resend quote, call customer, add note      | P1       |

     CSR Quote Queue Screen

     ┌─────────────────────────────────────────────────────────────┐
     │  Quote Queue                              [Filter ▾] [Search]│
     ├─────────────────────────────────────────────────────────────┤
     │  ⚠️ 3 quotes need review                                    │
     ├─────────────────────────────────────────────────────────────┤
     │  #Q-2024-001 │ John Smith │ 2023 Honda Civic │ $587 │ 2m ago│
     │  Reason: Multiple parts available                           │
     │  [View] [Send Quote] [Reject]                               │
     ├─────────────────────────────────────────────────────────────┤
     │  #Q-2024-002 │ Jane Doe │ 2022 Toyota Tundra │ $892 │ 15m   │
     │  Reason: 2 parts - needs selection                          │
     │  [View] [Send Quote] [Reject]                               │
     └─────────────────────────────────────────────────────────────┘

     Division Manager Dashboard (V1.1)

     - Everything CSR sees
       - Approval queue for price overrides
       - Team performance metrics
       - Revenue by shop/region

     Network Manager Dashboard (V1.2)

     - Everything Division Manager sees
       - All shops overview
       - Technician management
       - Capacity heatmap

     ---
     API Endpoints (New)

     Auth & Profile

     GET    /api/v1/auth/me/          → user + role + permissions

     Staff Dashboard

     GET    /api/v1/dashboard/stats/              → role-specific stats
     GET    /api/v1/dashboard/quotes/queue/       → pending_validation quotes
     GET    /api/v1/dashboard/quotes/{id}/        → quote detail for CSR
     POST   /api/v1/dashboard/quotes/{id}/send/   → send quote to customer
     POST   /api/v1/dashboard/quotes/{id}/reject/ → reject with reason
     PATCH  /api/v1/dashboard/quotes/{id}/        → edit quote (pricing, etc.)

     Customers

     GET    /api/v1/dashboard/customers/          → list (paginated, searchable)
     GET    /api/v1/dashboard/customers/{id}/     → detail with quotes/jobs

     ---
     Frontend Routes (Dashboard)

     /dashboard                     → Redirect based on role
     /dashboard/login               → Staff login page
     /dashboard/quotes              → Quote queue (CSR default)
     /dashboard/quotes/:id          → Quote detail
     /dashboard/customers           → Customer list
     /dashboard/customers/:id       → Customer detail
     /dashboard/team                → Team view (Division Mgr+)
     /dashboard/shops               → Shops (Network Mgr+)
     /dashboard/technicians         → Technicians (Network Mgr+)

     ---
     Implementation Phases

     Phase 4A: Backend Foundation (Current)

     1. Create StaffProfile, Region, Technician models
     2. Add migrations
     3. Update permissions system (role-based)
     4. Create dashboard API endpoints
     5. Update /api/v1/auth/me/ to return role info

     Phase 4B: Frontend Dashboard Shell

     1. Create /dashboard route structure
     2. Simple login page (JWT)
     3. Dashboard layout (sidebar, header)
     4. Role-based route guards

     Phase 4C: CSR Quote Management

     1. Quote queue page
     2. Quote detail page (view/edit)
     3. Send quote / Reject quote actions
     4. Customer search & detail

     Phase 4D: Division Manager Features

     1. Approval workflow
     2. Team performance stats
     3. Revenue dashboard

     Phase 4E: Network Manager & Admin

     1. Shop management
     2. Technician management
     3. Capacity planning

     ---
     Decisions Made

     | Question          | Decision
             |
     |-------------------|----------------------------------------------------------------
     --------|
     | CSR scope         | Default: ALL shops, but Network Manager can restrict to
     specific shops |
     | Region assignment | Manual - assign shops to regions via admin/dashboard
             |
     | V1 Priority       | CSR + Login - Focus on quote management + authentication
             |

     ---
     Phase 4 Implementation Plan (V1)

     Step 1: Backend - Staff Models & Auth

     Files to create/modify:

     backend/staff/                          # NEW Django app
     ├── __init__.py
     ├── models.py                           # StaffProfile, Region, Technician
     ├── admin.py                            # Django admin for staff mgmt
     ├── serializers.py                      # DRF serializers
     ├── permissions.py                      # Role-based permission classes
     └── migrations/

     Models:
     # staff/models.py
     class Region(models.Model):
         name = models.CharField(max_length=100)
         is_active = models.BooleanField(default=True)

     class StaffProfile(models.Model):
         ROLE_CHOICES = [
             ("csr", "CSR"),
             ("technician", "Technician"),
             ("division_manager", "Division Manager"),
             ("network_manager", "Network Manager"),
             ("app_admin", "App Admin"),
         ]
         user = models.OneToOneField(User, on_delete=models.CASCADE,
     related_name="staff_profile")
         role = models.CharField(max_length=20, choices=ROLE_CHOICES)
         managed_regions = models.ManyToManyField(Region, blank=True)  # For Div Mgrs
         assigned_shops = models.ManyToManyField(Shop, blank=True)     # Shop restrictions
      (empty = all)
         phone = models.CharField(max_length=20, blank=True)
         is_active = models.BooleanField(default=True)

     class Technician(models.Model):
         staff_profile = models.OneToOneField(StaffProfile, on_delete=models.CASCADE)
         employee_id = models.CharField(max_length=50, unique=True)
         tier = models.IntegerField(choices=[(1,"Apprentice"),(2,"Pro"),(3,"Master")],
     default=1)
         can_calibrate = models.BooleanField(default=False)
         can_do_tempered = models.BooleanField(default=False)
         can_do_sunroof = models.BooleanField(default=False)
         can_do_heavy_duty = models.BooleanField(default=False)
         is_mobile_capable = models.BooleanField(default=True)
         mobile_radius_override = models.IntegerField(null=True, blank=True)
         primary_shop = models.ForeignKey(Shop, on_delete=models.SET_NULL, null=True)

     Permissions:
     # staff/permissions.py
     class HasStaffRole(BasePermission):
         """Base class for role checks"""
         def get_user_role(self, user):
             if hasattr(user, 'staff_profile'):
                 return user.staff_profile.role
             return None

     class IsCSROrAbove(HasStaffRole):
         """CSR, Division Manager, Network Manager, or App Admin"""
         allowed_roles = ['csr', 'division_manager', 'network_manager', 'app_admin']

     class IsDivisionManagerOrAbove(HasStaffRole):
         """Division Manager, Network Manager, or App Admin"""
         allowed_roles = ['division_manager', 'network_manager', 'app_admin']

     class IsNetworkManagerOrAbove(HasStaffRole):
         """Network Manager or App Admin"""
         allowed_roles = ['network_manager', 'app_admin']

     Step 2: Backend - Dashboard API

     Files:
     backend/support_dashboard/
     ├── views.py                            # Dashboard views
     ├── serializers.py                      # Quote, Customer serializers
     └── urls.py                             # API routes

     Key Endpoints:
     # GET /api/v1/dashboard/stats/
     # Returns role-specific dashboard stats

     # GET /api/v1/dashboard/quotes/
     # List quotes (filterable by state, shop, date)
     # Respects shop restrictions from StaffProfile

     # GET /api/v1/dashboard/quotes/{id}/
     # Quote detail with full pricing breakdown

     # POST /api/v1/dashboard/quotes/{id}/send/
     # Transition quote pending_validation → sent, trigger email

     # POST /api/v1/dashboard/quotes/{id}/reject/
     # Reject quote with reason

     Step 3: Frontend - Dashboard Shell

     Files:
     frontend/src/features/dashboard/
     ├── components/
     │   ├── DashboardLayout.tsx             # Sidebar + header
     │   ├── Sidebar.tsx                     # Navigation
     │   └── StatsCards.tsx                  # Dashboard widgets
     ├── pages/
     │   ├── DashboardHome.tsx               # Landing page
     │   ├── QuoteQueue.tsx                  # Quote list
     │   └── QuoteDetail.tsx                 # Single quote view
     ├── hooks/
     │   └── useDashboardStats.ts            # TanStack Query hooks
     └── api/
         └── dashboardApi.ts                 # API client

     Step 4: Frontend - Login Page

     Files:
     frontend/src/features/auth/
     ├── pages/
     │   └── LoginPage.tsx                   # Staff login form
     ├── hooks/
     │   └── useAuth.ts                      # Auth state management
     └── api/
         └── authApi.ts                      # Login/logout/refresh

     ---
     File Changes Summary

     Backend (New/Modified)

     | File                                     | Action | Description
       |
     |------------------------------------------|--------|--------------------------------
     --|
     | backend/staff/__init__.py                | CREATE | New app
       |
     | backend/staff/models.py                  | CREATE | StaffProfile, Region,
     Technician |
     | backend/staff/admin.py                   | CREATE | Django admin config
       |
     | backend/staff/serializers.py             | CREATE | DRF serializers
       |
     | backend/staff/permissions.py             | CREATE | Role-based permissions
       |
     | backend/core/settings/base.py            | MODIFY | Add 'staff' to INSTALLED_APPS
       |
     | backend/support_dashboard/views.py       | MODIFY | Add dashboard views
       |
     | backend/support_dashboard/serializers.py | CREATE | Quote/Customer serializers
       |
     | backend/support_dashboard/urls.py        | MODIFY | Add new routes
       |
     | backend/core/urls.py                     | MODIFY | Include dashboard URLs
       |

     Frontend (New)

     | File                                           | Action | Description
     |
     |------------------------------------------------|--------|--------------------------
     |
     | frontend/src/features/dashboard/               | CREATE | Dashboard feature module
     |
     | frontend/src/features/auth/pages/LoginPage.tsx | CREATE | Staff login
     |
     | frontend/src/App.tsx                           | MODIFY | Add dashboard routes
     |

     ---
     Quote Modification Workflow

     Scenario: CSR needs to change pricing and resend

     Option A: Edit in Place (Recommended for V1)
     Quote #Q-001 (pending_validation)
         ↓ CSR edits pricing
     Quote #Q-001 (pending_validation) - updated pricing
         ↓ CSR sends
     Quote #Q-001 (sent) - customer gets new email
     - Simple, no versioning complexity
     - Store edit history in QuoteStateLog with JSON diff
     - pricing_modified_at, pricing_modified_by fields

     Option B: Create Revision (V2)
     Quote #Q-001-v1 (expired/superseded)
         ↓ CSR creates revision
     Quote #Q-001-v2 (pending_validation) - linked via parent_quote_id
         ↓ CSR sends
     Quote #Q-001-v2 (sent)
     - Full audit trail, can compare versions
     - More complex, defer to V2

     Quote Edit Rules

     | Current State      | Can Edit?               | Can Resend?            |
     |--------------------|-------------------------|------------------------|
     | pending_validation | Yes                     | Yes (sends first time) |
     | sent               | Yes (limited)           | Yes (resend email)     |
     | customer_approved  | No                      | No                     |
     | expired            | Yes → creates new quote | N/A                    |

     New Quote Fields Needed

     # quotes/models.py additions
     pricing_modified_at = models.DateTimeField(null=True, blank=True)
     pricing_modified_by = models.ForeignKey(User, null=True, blank=True)
     review_reason = models.TextField(blank=True)  # Why it needs review
     csr_notes = models.TextField(blank=True)  # Internal notes
     resend_count = models.IntegerField(default=0)
     last_sent_at = models.DateTimeField(null=True, blank=True)

     ---
     Quote View Tracking (Live Analytics)

     What to Track

     | Event                   | Data Captured                                           |
     |-------------------------|---------------------------------------------------------|
     | Email sent              | timestamp, email_id                                     |
     | Email opened            | timestamp, device, location (via SendGrid webhook)      |
     | Quote link clicked      | timestamp, referrer (email/sms)                         |
     | Quote page viewed       | timestamp, duration, device, IP, city                   |
     | Quote page interactions | scroll depth, clicked pricing tier, hovered book button |

     New Model: QuoteView

     class QuoteView(models.Model):
         quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="views")
         viewed_at = models.DateTimeField(auto_now_add=True)
         ip_address = models.GenericIPAddressField(null=True)
         user_agent = models.TextField(blank=True)
         device_type = models.CharField(max_length=20)  # mobile/tablet/desktop
         referrer = models.CharField(max_length=50)  # email/sms/direct
         city = models.CharField(max_length=100, blank=True)
         region = models.CharField(max_length=100, blank=True)
         duration_seconds = models.IntegerField(null=True)  # Time on page

     CSR Dashboard View

     Quote #Q-001 - 2023 Honda Civic
     Status: SENT (2 hours ago)
     ───────────────────────────────────
     📊 Engagement:
        📧 Email sent: Dec 7, 2:30 PM
        👁️ Email opened: Dec 7, 2:45 PM (Mobile, Phoenix AZ)
        🔗 Quote viewed: 3 times
           - Dec 7, 2:46 PM (Mobile, 45 sec)
           - Dec 7, 3:15 PM (Desktop, 2 min 30 sec)
           - Dec 7, 4:02 PM (Desktop, 1 min 15 sec) ← Latest

     💡 Insight: Customer viewed 3 times in 2 hours - HIGH INTEREST
        Recommended action: Call now!

     ---
     Technician PWA (V1 Core Features)

     Why PWA is Critical

     - Techs need job details in the field
     - Part numbers, vehicle info, customer address
     - Status updates trigger customer SMS
     - Photo capture for before/after
     - No app store deployment needed

     Tech PWA Screens

     1. Today's Jobs (/tech)
     ┌─────────────────────────────────────┐
     │  Today's Jobs (3)          Dec 7    │
     ├─────────────────────────────────────┤
     │ 9:00 AM                             │
     │ John Smith - 2023 Honda Civic       │
     │ 📍 123 Main St, Phoenix             │
     │ 🔧 Windshield + Calibration         │
     │ [Start Route]                       │
     ├─────────────────────────────────────┤
     │ 11:30 AM                            │
     │ Jane Doe - 2022 Toyota Camry        │
     │ 📍 456 Oak Ave, Tempe               │
     │ 🔧 Windshield (no calibration)      │
     ├─────────────────────────────────────┤
     │ 2:00 PM                             │
     │ Bob Wilson - 2021 Ford F-150        │
     │ 🏪 In-Shop                          │
     │ 🔧 Door Glass                       │
     └─────────────────────────────────────┘

     2. Job Detail (/tech/jobs/:id)
     ┌─────────────────────────────────────┐
     │ ← Back                    Job #J-001│
     ├─────────────────────────────────────┤
     │ CUSTOMER                            │
     │ John Smith                          │
     │ 📞 (602) 555-1234  [Call]          │
     │ 📍 123 Main St, Phoenix AZ 85001   │
     │    [Navigate]                       │
     ├─────────────────────────────────────┤
     │ VEHICLE                             │
     │ 2023 Honda Civic Sedan              │
     │ VIN: 2HGFC2F59PH...                │
     ├─────────────────────────────────────┤
     │ SERVICE                             │
     │ Windshield Replacement              │
     │ + ADAS Calibration (Dynamic)        │
     ├─────────────────────────────────────┤
     │ PARTS                               │
     │ FW04567 - Honda Civic Windshield    │
     │ Kit: 1.5 tube                       │
     │ Moulding: Yes                       │
     ├─────────────────────────────────────┤
     │ NOTES                               │
     │ Customer prefers backyard install   │
     ├─────────────────────────────────────┤
     │ STATUS: ASSIGNED                    │
     │                                     │
     │ [🚗 En Route] [📍 Arrived]          │
     │ [🔧 Start Job] [✅ Complete]        │
     └─────────────────────────────────────┘

     3. Job Completion Flow
     En Route → SMS: "Tech is on the way, arriving in ~20 min"
         ↓
     Arrived → SMS: "Tech has arrived" + GPS check-in
         ↓
     Start Job → (internal tracking)
         ↓
     Complete → Photo upload required
              → Signature capture
              → SMS: "Job complete! Here's your warranty info"

     Tech Data Needs

     | Data            | Source                              |
     |-----------------|-------------------------------------|
     | Job schedule    | Job model (linked to Quote)         |
     | Customer info   | Customer model                      |
     | Vehicle details | Quote.vehicle_info                  |
     | Part numbers    | Quote.pricing_details or line_items |
     | Service address | Quote.service_address               |
     | Special notes   | Quote.csr_notes or Job.notes        |

     ---
     V1 Complete Scope

     Dashboard (CSR + All Staff)

     P0 - Must Have
     | Feature         | Description                        |
     |-----------------|------------------------------------|
     | Login           | Email/password → JWT               |
     | Dashboard Home  | Stats cards, quick actions         |
     | Quote Queue     | Pending validation quotes          |
     | All Quotes List | Filterable by status, shop, date   |
     | Quote Detail    | Full info + engagement tracking    |
     | Quote Actions   | Send, Resend, Reject, Edit pricing |
     | View Tracking   | Show when customer opened quote    |

     P1 - Important
     | Feature          | Description                 |
     |------------------|-----------------------------|
     | Customer List    | Search by name/phone/email  |
     | Customer Detail  | Quote history, contact info |
     | Quote Edit       | Modify pricing, add notes   |
     | Sent Quotes View | Filter for sent status      |

     Technician PWA

     P0 - Must Have
     | Feature        | Description                       |
     |----------------|-----------------------------------|
     | Login          | Same JWT auth                     |
     | Today's Jobs   | List of assigned jobs             |
     | Job Detail     | Customer, vehicle, parts, address |
     | Status Updates | En Route / Arrived / Complete     |
     | Customer SMS   | Auto-trigger on status change     |
     | Navigate       | Link to maps for address          |
     | Call Customer  | Tap to call                       |

     P1 - Important
     | Feature       | Description           |
     |---------------|-----------------------|
     | Photo Capture | Before/after photos   |
     | Signature     | Customer sign-off     |
     | Week Schedule | View upcoming jobs    |
     | Profile       | View own skills, tier |

     Backend Infrastructure

     P0 - Must Have
     | Feature             | Description                  |
     |---------------------|------------------------------|
     | Staff models        | StaffProfile, Technician     |
     | Role permissions    | CSR, Tech, Manager hierarchy |
     | Quote view tracking | QuoteView model + API        |
     | Job model           | Link Quote → Job for techs   |
     | Dashboard API       | Stats, quotes, customers     |
     | Tech API            | Jobs, status updates         |

     P1 - Important
     | Feature            | Description              |
     |--------------------|--------------------------|
     | SendGrid webhooks  | Email open tracking      |
     | Twilio integration | SMS on status change     |
     | GPS check-in       | Tech location on arrival |

     ---
     New Models Summary

     1. staff/models.py

     class Region(models.Model):
         name = models.CharField(max_length=100)
         is_active = models.BooleanField(default=True)

     class StaffProfile(models.Model):
         user = models.OneToOneField(User, on_delete=models.CASCADE)
         role = models.CharField(max_length=20, choices=ROLE_CHOICES)
         managed_regions = models.ManyToManyField(Region, blank=True)
         assigned_shops = models.ManyToManyField(Shop, blank=True)
         phone = models.CharField(max_length=20, blank=True)
         is_active = models.BooleanField(default=True)

     class Technician(models.Model):
         staff_profile = models.OneToOneField(StaffProfile, on_delete=models.CASCADE)
         employee_id = models.CharField(max_length=50, unique=True)
         tier = models.IntegerField(default=1)  # 1=Apprentice, 2=Pro, 3=Master
         can_calibrate = models.BooleanField(default=False)
         can_do_tempered = models.BooleanField(default=False)
         can_do_sunroof = models.BooleanField(default=False)
         can_do_heavy_duty = models.BooleanField(default=False)
         is_mobile_capable = models.BooleanField(default=True)
         primary_shop = models.ForeignKey(Shop, on_delete=models.SET_NULL, null=True)

     2. quotes/models.py (additions)

     # Add to Quote model
     pricing_modified_at = models.DateTimeField(null=True, blank=True)
     pricing_modified_by = models.ForeignKey(User, null=True, blank=True,
     on_delete=models.SET_NULL)
     review_reason = models.TextField(blank=True)
     csr_notes = models.TextField(blank=True)
     resend_count = models.IntegerField(default=0)
     last_sent_at = models.DateTimeField(null=True, blank=True)

     # New model
     class QuoteView(models.Model):
         quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="views")
         viewed_at = models.DateTimeField(auto_now_add=True)
         ip_address = models.GenericIPAddressField(null=True)
         user_agent = models.TextField(blank=True)
         device_type = models.CharField(max_length=20)
         referrer = models.CharField(max_length=50)
         city = models.CharField(max_length=100, blank=True)
         region = models.CharField(max_length=100, blank=True)
         duration_seconds = models.IntegerField(null=True)

     3. jobs/models.py (NEW app)

     class Job(models.Model):
         STATUS_CHOICES = [
             ("assigned", "Assigned"),
             ("en_route", "En Route"),
             ("arrived", "Arrived"),
             ("in_progress", "In Progress"),
             ("completed", "Completed"),
             ("cancelled", "Cancelled"),
         ]

         quote = models.OneToOneField(Quote, on_delete=models.PROTECT)
         technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True)
         status = models.CharField(max_length=20, choices=STATUS_CHOICES,
     default="assigned")

         scheduled_date = models.DateField()
         scheduled_time = models.TimeField()
         estimated_duration = models.DurationField()

         service_address = models.JSONField(default=dict)
         service_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)
         service_longitude = models.DecimalField(max_digits=9, decimal_places=6,
     null=True)

         tech_notes = models.TextField(blank=True)
         arrival_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)
         arrival_longitude = models.DecimalField(max_digits=9, decimal_places=6,
     null=True)
         arrival_time = models.DateTimeField(null=True)

         started_at = models.DateTimeField(null=True)
         completed_at = models.DateTimeField(null=True)

         created_at = models.DateTimeField(auto_now_add=True)
         updated_at = models.DateTimeField(auto_now=True)

     class JobPhoto(models.Model):
         job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="photos")
         photo_type = models.CharField(max_length=20)  # before/after/damage
         image_url = models.URLField()
         uploaded_at = models.DateTimeField(auto_now_add=True)

     class JobSignature(models.Model):
         job = models.OneToOneField(Job, on_delete=models.CASCADE)
         signature_data = models.TextField()  # Base64 or S3 URL
         signer_name = models.CharField(max_length=100)
         signed_at = models.DateTimeField(auto_now_add=True)

     ---
     Implementation Order

     Sprint 1: Backend Foundation

     1. Create staff app with models
     2. Create jobs app with models
     3. Add QuoteView model to quotes
     4. Add new fields to Quote model
     5. Run migrations
     6. Update permissions system
     7. Create Django admin for new models

     Sprint 2: Dashboard API

     1. Dashboard stats endpoint
     2. Quote list/detail endpoints
     3. Quote actions (send, reject, edit)
     4. Customer list/detail endpoints
     5. QuoteView tracking endpoint

     Sprint 3: Dashboard Frontend

     1. Login page
     2. Dashboard layout + sidebar
     3. Quote queue page
     4. Quote detail page with engagement stats
     5. Customer pages

     Sprint 4: Technician PWA

     1. Tech login + auth
     2. Today's jobs list
     3. Job detail page
     4. Status update flow
     5. SMS triggers on status change

     Sprint 5: Polish & Integrations

     1. SendGrid webhook for email opens
     2. Quote view tracking on frontend
     3. Photo upload for techs
     4. Signature capture
     5. Testing & bug fixes

     ---
     Reference Design Analysis

     Source: sample-app-reference design/

     UX designer provided Figma export with working React components (Next.js).

     Screenshots Reviewed

     1. Main Dashboard - Three-column layout with quote queue
     2. Quote Detail - Sent (not opened) - Yellow warning state, part info with AUTOBOLT
     data
     3. Quote Detail - Viewed (engaged) - Green engagement timeline, "Hot Lead" badge
     4. Quote Detail - Tesla with calibration - Dynamic + Camera calibration badges

     Design Highlights

     - Three-column Gmail-style layout: Sidebar (240px) | Quote List (480px) | Detail
     Panel (flex)
     - "Hot" badge for high-intent customers (viewed 2+ times in 4 hours)
     - Engagement timeline with visual dots (blue = sent, green = viewed)
     - Part Information card with image, AUTOBOLT data, calibration type, NAGS badges
     - Status dropdown for inline status changes
     - Sticky action bar at bottom

     Component Inventory (from Figma export)

     Layout Components
     | Component        | Location | Notes                       |
     |------------------|----------|-----------------------------|
     | DashboardLayout  | page.tsx | Three-column flex layout    |
     | Header           | page.tsx | Logo + search + user avatar |
     | Sidebar          | page.tsx | Filter nav + stats          |
     | QuoteList        | page.tsx | Scrollable inbox            |
     | QuoteDetailPanel | page.tsx | Right panel with cards      |

     UI Components (from components/ui/)
     | Component | File       | Usage                                |
     |-----------|------------|--------------------------------------|
     | Badge     | badge.tsx  | Status pills (Draft/Sent/Viewed/Hot) |
     | Button    | button.tsx | Actions (Send Quote, Edit, Add Note) |
     | Card      | card.tsx   | Content sections                     |
     | Input     | input.tsx  | Search bar                           |
     | Select    | select.tsx | Status dropdown                      |

     Custom Components to Build
     | Component          | Description                                         |
     |--------------------|-----------------------------------------------------|
     | QuoteCard          | List item with customer, vehicle, price, engagement |
     | EngagementTimeline | Visual timeline with dots                           |
     | PartInfoCard       | Image + part details + AUTOBOLT + NAGS              |
     | StatusBadge        | Draft/Sent/Viewed with colors                       |
     | HotBadge           | Red "Hot" indicator                                 |
     | StatCard           | Sidebar stat item                                   |
     | FilterButton       | Sidebar filter option                               |

     Data Structure (from mock data)

     interface Quote {
       id: string;
       customer: {
         name: string;
         phone: string;
         email: string;
       };
       vehicle: {
         year: number;
         make: string;
         model: string;
       };
       status: "draft" | "sent" | "viewed" | "approved" | "completed" | "cancelled";
       totalPrice: number;
       serviceType: string;
       damageCount: number;
       createdAt: Date;
       sentAt: Date | null;
       engagement: {
         viewCount: number;
         lastViewedAt: Date | null;
         isHot: boolean;
       };
       parts: Part[];
     }

     interface Part {
       id: number;
       description: string;
       partNumber: string;
       calibrationType: string;  // "None" | "Static" | "Dynamic" | "Dynamic + Camera"
       price: number;
       notes: string;
       imageUrl: string;
       nagsInfo: {
         moulding: boolean;
         hardware: boolean;
       };
     }

     Adaptation Plan

     Keep from Figma export:
     - Overall layout structure
     - Color scheme (red #DC2626 accent)
     - Card styling
     - Badge variants
     - Engagement timeline design
     - Part information card design

     Adapt for our stack:
     - Convert Next.js → React Router
     - Replace next/image → standard <img> or custom Image component
     - Use our existing Tailwind config
     - Connect to real API instead of mock data
     - Add TanStack Query for data fetching

     Add missing pieces:
     - Login page
     - Real-time quote view tracking
     - Edit quote modal/page
     - Customer detail page
     - Role-based navigation

     ---
     Final Implementation Plan (Lean/Fast Path)

     Philosophy: Deliver Value ASAP

     - Use existing models where possible
     - Skip new Django apps initially
     - Build API first, frontend second
     - Add complexity only when needed

     ---
     Sprint 1: Dashboard API (PRIORITY - 1-2 days)

     What we have:
     - Quote model with states (pending_validation, sent, etc.)
     - Customer model
     - Shop model
     - Django User + Groups ("Support Agent" group exists)
     - JWT auth working

     Minimal additions to Quote model:
     # quotes/models.py - just add these fields
     csr_notes = models.TextField(blank=True)
     last_sent_at = models.DateTimeField(null=True, blank=True)

     API Endpoints (in support_dashboard/views.py):

     | Endpoint                              | Method | Description            | Priority
     |
     |---------------------------------------|--------|------------------------|----------
     |
     | /api/v1/dashboard/stats/              | GET    | Queue counts           | P0
     |
     | /api/v1/dashboard/quotes/             | GET    | List + filter + search | P0
     |
     | /api/v1/dashboard/quotes/{id}/        | GET    | Full detail            | P0
     |
     | /api/v1/dashboard/quotes/{id}/send/   | POST   | Send to customer       | P0
     |
     | /api/v1/dashboard/quotes/{id}/resend/ | POST   | Resend email           | P0
     |
     | /api/v1/dashboard/quotes/{id}/reject/ | POST   | Reject with reason     | P1
     |
     | /api/v1/dashboard/quotes/{id}/        | PATCH  | Edit pricing/notes     | P1
     |

     Stats endpoint returns:
     {
       "total_quotes": 15,
       "pending_review": 3,
       "sent": 5,
       "viewed": 4,
       "follow_up_needed": 2,
       "avg_response_minutes": 45
     }

     Quotes list supports:
     - ?status=pending_validation,sent,viewed
     - ?search=john (customer name, phone, vehicle)
     - ?shop_id=13
     - ?date_from=2024-12-01&date_to=2024-12-07

     Sprint 1.5: QuoteView Tracking (add after API works)

     Add to quotes/models.py:
     class QuoteView(models.Model):
         quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="views")
         viewed_at = models.DateTimeField(auto_now_add=True)
         ip_address = models.GenericIPAddressField(null=True)
         user_agent = models.TextField(blank=True)
         device_type = models.CharField(max_length=20, blank=True)  # mobile/desktop

     Public endpoint:
     - POST /api/v1/quotes/{id}/track-view/ - Called when customer opens quote page

     ---
     Sprint 2: Dashboard Frontend (2-3 days)

     Approach: Adapt Figma export components

     Files to create:
     frontend/src/features/dashboard/
     ├── api/
     │   └── dashboardApi.ts        # API client
     ├── hooks/
     │   ├── useQuotes.ts           # TanStack Query hooks
     │   └── useDashboardStats.ts
     ├── components/
     │   ├── DashboardLayout.tsx    # Three-column layout
     │   ├── QuoteList.tsx          # Middle column
     │   ├── QuoteCard.tsx          # List item
     │   ├── QuoteDetail.tsx        # Right panel
     │   ├── EngagementTimeline.tsx
     │   ├── PartInfoCard.tsx
     │   └── Sidebar.tsx            # Left sidebar + filters
     ├── pages/
     │   └── DashboardPage.tsx      # Main page
     └── types.ts                   # TypeScript interfaces

     Routes:
     /dashboard              → DashboardPage (quote queue)
     /dashboard/login        → LoginPage (simple form)

     Auth: Already implemented securely!
     - Access token: Memory only (React state) - NOT localStorage
     - Refresh token: httpOnly cookie (XSS-safe)
     - Auto-refresh every 45 min
     - AuthContext + useAuth() hook ready
     - Just need login UI page

     ---
     Sprint 3: Enhancements (1-2 days)

     1. Edit quote modal (change pricing, add notes)
     2. Customer detail view (optional - can link to Django admin for now)
     3. Quote filtering refinements
     4. Loading/error states
     5. Responsive tweaks

     ---
     Sprint 4: Technician PWA (3-4 days) - LATER

     Prerequisite: Need Job model to assign techs to quotes

     Defer until:
     - Basic dashboard working
     - Need to convert quotes → scheduled jobs
     - SMS integration ready

     ---
     Sprint 5: Full RBAC + Staff Models (LATER)

     Only build when needed:
     - StaffProfile model (when we need roles beyond "Support Agent")
     - Region model (when we have multiple divisions)
     - Technician model (when building tech PWA)

     ---
     Immediate Next Steps (Today)

     1. Add csr_notes field to Quote (1 migration)
     2. Build dashboard stats endpoint
     3. Build quotes list endpoint with filters
     4. Build quote detail endpoint
     5. Build send/resend endpoints
     6. Test with curl/httpie

     Then frontend Sprint 2 can start with working API.

     ---
     Future Considerations (V2+)

     - Quote versioning: Full revision history with diffs
     - GPS tracking: Real-time tech location
     - Twilio inbox: Two-way SMS conversations
     - Push notifications: Tech app alerts
     - Offline mode: Tech PWA works without connection
     - Approval workflow: Price override approvals
     - Scheduling UI: Drag-drop job assignment
     - Analytics dashboard: Conversion funnels, revenue reports
