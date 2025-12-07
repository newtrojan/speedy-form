# Phase 2 Implementation Plan: Quote Wizard & API Alignment

**Document:** `phase-2-implementation-plan.md`
**Created:** 2025-12-06
**Status:** 🔄 IN PROGRESS

---

## Executive Summary

Align backend APIs and rebuild frontend to match the 6-step quote wizard UX flow from `detailed-plan.md`. Focus on:

1. Backend API updates for shop selection and chip repair
2. Frontend wizard rebuild with proper step flow
3. 3-tier pricing display (Insurance/Cash/Afterpay)

---

## Current State Analysis

### What's Already Built ✅

**Backend:**
| Component | File | Status |
|-----------|------|--------|
| VIN Decode (AUTOBOLT) | `vehicles/services/autobolt_client.py` | ✅ Complete with caching |
| Plate Decode (AUTOBOLT) | `vehicles/services/autobolt_client.py` | ✅ Complete |
| NHTSA Fallback | `vehicles/services/nhtsa_client.py` | ✅ Complete |
| NAGS Pricing | `vehicles/services/nags_client.py` | ✅ Complete |
| Vehicle Lookup Orchestration | `vehicles/services/vehicle_lookup.py` | ✅ Complete |
| Pricing Service | `pricing/services/pricing_service.py` | ✅ Complete |
| Pricing Profile Model | `pricing/models.py` | ✅ Complete with chip repair fields |
| Quote Generation Task | `quotes/tasks.py` | ✅ Complete |
| Quote APIs | `quotes/api/views.py` | ✅ generate, status, preview, approve |
| Vehicle Identify API | `vehicles/api/views.py` | ✅ VIN + Plate lookup |
| Serviceability APIs | `shops/api/views.py` | ✅ check-mobile, check-in-store |
| Support Dashboard APIs | `support_dashboard/views.py` | ✅ queue, validate, reject |
| Auth APIs | `core/views/auth.py` | ✅ login, logout, refresh, me |

**Frontend:**
| Component | File | Status |
|-----------|------|--------|
| API Client | `src/api/client.ts` | ✅ Complete with auth |
| Quote API Service | `src/api/quotes.ts` | ✅ All endpoints |
| Auth Context | `src/context/AuthContext.tsx` | ✅ Complete |
| Quote Form Context | `src/context/QuoteFormContext.tsx` | ✅ Multi-step state |
| TanStack Query Hooks | `src/hooks/useQuotes.ts` | ✅ All hooks with polling |
| UI Components | `src/components/ui/` | ✅ Full shadcn/ui library |
| HomePage | `src/pages/HomePage.tsx` | ✅ Complete |
| Quote Status Page | `src/pages/QuoteStatusPage.tsx` | ✅ Complete |
| Quote Preview Page | `src/pages/QuotePreviewPage.tsx` | ✅ Complete |

### Code Review Findings (Pre-Implementation) ✅

**Already Exists - No Changes Needed:**

| Component | Location | Notes |
|-----------|----------|-------|
| Shop.offers_mobile_service | `backend/shops/models.py:17` | Boolean, default=True |
| Shop.max_mobile_radius_miles | `backend/shops/models.py:18` | Integer, default=50 |
| PricingProfile.calculate_chip_repair() | `backend/pricing/models.py:522-534` | WR-1/2/3 logic already implemented |
| POST /vehicles/identify/ | `backend/vehicles/api/views.py` | Already accepts VIN OR license_plate+state |
| ServiceabilityService.find_nearby_shops() | `backend/shops/services/serviceability.py` | PostGIS distance queries ready |

**Key Refinements:**

1. **No Shop model migration needed** - mobile fields already exist
2. **No separate plate endpoint needed** - existing identify endpoint accepts both VIN and plate
3. **Mobile shop selection** - Users select shop for BOTH mobile and in-store (filter by `offers_mobile_service`)
4. **Deferred**: Testing, Support Dashboard CSR view, Photo upload, Manual YMM

---

### What's Missing ❌

**Backend Gaps:**

| Gap | Description | Priority |
|-----|-------------|----------|
| **Shop List API** | No endpoint to get shops sorted by distance | 🔴 Critical |
| **Chip Repair in PricingService** | Model has method, but PricingService doesn't expose it | 🔴 Critical |
| **Quote Serializer** | Still expects `manufacturer`, `payment_type` | 🟡 Medium |
| ~~Plate Decode Endpoint~~ | ~~Vehicle identify works, but separate plate endpoint useful~~ | ✅ Not needed - existing endpoint works |

**Frontend Gaps:**

| Gap | Description | Priority |
|-----|-------------|----------|
| **Step 1: Service Intent** | Missing entirely - no windshield/chip/other selection | 🔴 Critical |
| **License Plate Input** | VehicleStep only has VIN, not plate | 🔴 Critical |
| **Shop List Display** | LocationStep doesn't show shop list for in-store | 🔴 Critical |
| **Service API Connection** | LocationStep uses simulated delay, not real APIs | 🔴 Critical |
| **Manual YMM Entry** | Button exists but no handler/modal | 🟡 Medium |
| **3-Tier Pricing** | QuotePreviewPage shows 1 price, need Insurance/Cash/Afterpay | 🟡 Medium |
| **Support Dashboard UI** | No admin/support pages | 🟡 Medium (Phase 3) |

---

## Target UX Flow (from detailed-plan.md)

```
STEP 1: Service Intent
├── Windshield Replacement → Standard flow
├── Chip Repair → Chip count flow (1-3, >3 = replacement)
└── Other Glass → CSR review flow

STEP 2: Location & Service Type
├── Enter postal code
├── System shows serviceability
├── Choose: Mobile or In-Store
└── If In-Store: Show top 5 shops by distance

STEP 3: Vehicle Identification
├── Option 1: License Plate + State → Decode
├── Option 2: VIN (fallback)
└── Option 3: Year/Make/Model (last resort)

STEP 4: Damage Details
├── If Replacement: Which glass? (front/back/side/roof)
├── If Chip Repair: How many chips? (1/2/3)
└── Optional: Photo upload

STEP 5: Contact Info
├── Name, Phone, Email
└── SMS consent

STEP 6: Quote & Booking
├── Show 3 pricing tiers: Insurance ($0) / Cash / Afterpay
├── Show next available appointment
└── Actions: Book Now / Email Quote / Call Me Back
```

---

## Implementation Plan

### Phase 2A: Backend API Updates

#### Task 2A.1: Shops Nearby API

**New Endpoint:** `GET /api/v1/shops/nearby/`

**File:** `backend/shops/api/views.py`

```python
class ShopsNearbyView(APIView):
    """
    Get shops sorted by distance from postal code.
    Returns top 5 shops, plus additional shops within 500 miles.
    """
    permission_classes = []

    @extend_schema(
        parameters=[
            OpenApiParameter("postal_code", str, required=True),
            OpenApiParameter("service_type", str, required=False),  # mobile, in_store
        ],
        responses={200: ShopListSerializer(many=True)},
    )
    def get(self, request):
        postal_code = request.query_params.get("postal_code")
        service_type = request.query_params.get("service_type")

        # Geocode postal code
        # Calculate distance to all active shops
        # Sort by distance
        # Return top 5 + any within 500 miles

        return Response({
            "postal_code": postal_code,
            "shops": [
                {
                    "id": 1,
                    "name": "SpeedyGlass Downtown",
                    "address": "123 Main St, City, ST 12345",
                    "phone": "(555) 123-4567",
                    "distance_miles": 3.2,
                    "mobile_available": True,
                    "mobile_fee": 49.00,  # 0-30 miles
                    "in_store_available": True,
                    "next_available": "2025-12-07T09:00:00Z",
                }
            ],
            "mobile_available": True,
            "closest_shop_distance": 3.2,
        })
```

**New Serializer:** `backend/shops/api/serializers.py`

```python
class ShopNearbySerializer(serializers.ModelSerializer):
    distance_miles = serializers.FloatField()
    mobile_available = serializers.BooleanField()
    mobile_fee = serializers.DecimalField(max_digits=6, decimal_places=2)
    in_store_available = serializers.BooleanField()

    class Meta:
        model = Shop
        fields = [
            "id", "name", "address", "city", "state", "postal_code",
            "phone", "email", "distance_miles", "mobile_available",
            "mobile_fee", "in_store_available",
        ]
```

**URL:** `backend/shops/api/urls.py`

```python
path("nearby/", ShopsNearbyView.as_view(), name="shops-nearby"),
```

---

#### Task 2A.2: Chip Repair Pricing

**File:** `backend/pricing/services/pricing_service.py`

Add new method:

```python
def calculate_chip_repair(
    self,
    chip_count: int,
    shop: Shop,
    service_type: str = "in_store",
    distance_miles: float | None = None,
) -> QuotePricing:
    """
    Calculate chip repair pricing.

    Pricing logic (from PricingProfile):
    - Chip 1 (WR-1): chip_repair_first (default $49)
    - Chip 2 (WR-2): chip_repair_second (default $29)
    - Chip 3 (WR-3): chip_repair_third (default $29)
    - Chip 4+: Recommend replacement instead

    Args:
        chip_count: Number of chips (1-3)
        shop: Shop for pricing profile
        service_type: "mobile" or "in_store"
        distance_miles: Required for mobile service

    Returns:
        QuotePricing with line items and totals
    """
    if chip_count > 3:
        raise ValueError("More than 3 chips requires replacement")

    profile = shop.pricing_profile

    # Build line items
    line_items = []

    if chip_count >= 1:
        line_items.append({
            "type": "chip_repair",
            "description": "Chip Repair #1 (WR-1)",
            "amount": profile.chip_repair_first,
        })

    if chip_count >= 2:
        line_items.append({
            "type": "chip_repair",
            "description": "Chip Repair #2 (WR-2)",
            "amount": profile.chip_repair_second,
        })

    if chip_count >= 3:
        line_items.append({
            "type": "chip_repair",
            "description": "Chip Repair #3 (WR-3)",
            "amount": profile.chip_repair_third,
        })

    # Add mobile fee if applicable
    if service_type == "mobile" and distance_miles is not None:
        mobile_fee = profile.calculate_mobile_fee(distance_miles)
        if mobile_fee > 0:
            line_items.append({
                "type": "mobile_fee",
                "description": f"Mobile Service Fee ({distance_miles:.1f} mi)",
                "amount": mobile_fee,
            })

    # Calculate totals
    subtotal = sum(item["amount"] for item in line_items)
    tax = Decimal("0.00")  # No tax for MVP
    total = subtotal + tax

    return QuotePricing(
        vehicle=None,  # No vehicle needed for chip repair
        part=None,
        shop=shop,
        line_items=line_items,
        glass_cost=Decimal("0.00"),
        labor_cost=Decimal("0.00"),
        kit_fee=Decimal("0.00"),
        calibration_fee=Decimal("0.00"),
        mobile_fee=mobile_fee if service_type == "mobile" else Decimal("0.00"),
        subtotal=subtotal,
        tax=tax,
        total=total,
        needs_part_selection=False,
        needs_calibration_review=False,
        needs_manual_review=False,
        confidence="high",
        review_reason=None,
    )
```

---

#### Task 2A.3: Update Quote Generation Serializer

**File:** `backend/quotes/api/serializers.py`

Update `QuoteGenerationRequestSerializer`:

```python
class QuoteGenerationRequestSerializer(serializers.Serializer):
    # Service type selection (NEW)
    service_intent = serializers.ChoiceField(
        choices=["replacement", "chip_repair", "other"],
        default="replacement",
    )

    # Vehicle identification (one of these required for replacement)
    vin = serializers.CharField(max_length=17, required=False, allow_blank=True)
    license_plate = serializers.CharField(max_length=20, required=False, allow_blank=True)
    plate_state = serializers.CharField(max_length=2, required=False, allow_blank=True)

    # Glass details
    glass_type = serializers.ChoiceField(
        choices=["windshield", "back_glass", "driver_side", "passenger_side",
                 "rear_driver_side", "rear_passenger_side", "sunroof", "other"],
        required=False,  # Not required for chip repair
    )

    # Damage details
    damage_type = serializers.ChoiceField(
        choices=["chip", "crack", "shattered", "unknown"],
        required=False,
    )
    chip_count = serializers.IntegerField(
        min_value=1, max_value=3, required=False,
    )

    # Location & shop
    service_type = serializers.ChoiceField(choices=["mobile", "in_store"])
    shop_id = serializers.IntegerField()  # NEW - user selects shop
    distance_miles = serializers.FloatField(required=False)  # NEW - for mobile fee

    location = QuoteLocationSerializer()
    customer = QuoteCustomerSerializer()

    # REMOVED: manufacturer, payment_type (we show all 3 tiers)

    def validate(self, data):
        service_intent = data.get("service_intent", "replacement")

        if service_intent == "replacement":
            # Must have VIN or (plate + state)
            if not data.get("vin") and not (data.get("license_plate") and data.get("plate_state")):
                raise serializers.ValidationError({
                    "vin": "VIN or license plate required for replacement quotes"
                })

            # Must have glass type
            if not data.get("glass_type"):
                raise serializers.ValidationError({
                    "glass_type": "Glass type required for replacement quotes"
                })

        elif service_intent == "chip_repair":
            # Must have chip count
            if not data.get("chip_count"):
                raise serializers.ValidationError({
                    "chip_count": "Chip count required for chip repair quotes"
                })

        # Mobile service requires distance
        if data.get("service_type") == "mobile":
            if not data.get("distance_miles"):
                raise serializers.ValidationError({
                    "distance_miles": "Distance required for mobile service"
                })

        return data
```

---

#### Task 2A.4: Update Quote Generation Task

**File:** `backend/quotes/tasks.py`

Update `generate_quote_task` to handle chip repairs:

```python
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_quote_task(
    self,
    service_intent: str,  # NEW
    vin: str | None,
    license_plate: str | None,  # NEW
    plate_state: str | None,  # NEW
    glass_type: str | None,
    chip_count: int | None,  # NEW
    postal_code: str,
    service_type: str,
    shop_id: int,  # NEW - explicit shop selection
    distance_miles: float | None,  # NEW
    customer_data: dict,
    damage_type: str = "unknown",
    service_address: dict | None = None,
) -> dict:
    """
    Generate a quote based on service intent.

    Flow:
    1. If chip_repair: Use PricingService.calculate_chip_repair()
    2. If replacement: Use existing flow (vehicle lookup → pricing)
    3. If other: Create manual review quote
    """
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return {"status": "failed", "error": "Shop not found"}

    # CHIP REPAIR FLOW
    if service_intent == "chip_repair":
        pricing_service = PricingService()
        quote_pricing = pricing_service.calculate_chip_repair(
            chip_count=chip_count,
            shop=shop,
            service_type=service_type,
            distance_miles=distance_miles,
        )

        # Create customer
        customer, _ = Customer.objects.get_or_create(
            email=customer_data["email"],
            defaults={...}
        )

        # Create quote
        quote = Quote.objects.create(
            customer=customer,
            shop=shop,
            state="draft",  # Chip repairs auto-approve
            glass_type="windshield",
            service_type=service_type,
            postal_code=postal_code,
            total_price=quote_pricing.total,
            ...
        )

        return {"status": "success", "quote_id": str(quote.id)}

    # OTHER GLASS FLOW (manual review)
    elif service_intent == "other":
        customer, _ = Customer.objects.get_or_create(...)

        quote = Quote.objects.create(
            customer=customer,
            shop=shop,
            state="pending_validation",  # CSR review
            glass_type=glass_type or "other",
            needs_manual_review=True,
            ...
        )

        return {"status": "success", "quote_id": str(quote.id)}

    # REPLACEMENT FLOW (existing logic)
    else:
        # Resolve VIN from plate if needed
        if not vin and license_plate:
            lookup_service = VehicleLookupService()
            result = lookup_service.lookup_by_plate(license_plate, plate_state)
            vin = result.vin

        # Existing replacement flow...
        lookup_service = VehicleLookupService()
        lookup_result = lookup_service.lookup_by_vin(vin, glass_type)

        pricing_service = PricingService()
        quote_pricing = pricing_service.calculate_quote(
            lookup_result=lookup_result,
            shop=shop,
            service_type=service_type,
            distance_miles=distance_miles,
        )

        # Create quote with appropriate state
        initial_state = "pending_validation" if quote_pricing.needs_review else "draft"

        quote = Quote.objects.create(...)

        return {"status": "success", "quote_id": str(quote.id)}
```

---

### Phase 2B: Frontend Wizard Rebuild

#### Task 2B.1: Update Quote Form Context

**File:** `frontend/src/context/QuoteFormContext.tsx`

Add new state for service intent and shop selection:

```typescript
interface QuoteFormState {
  // Step 1: Service Intent (NEW)
  serviceIntent: 'replacement' | 'chip_repair' | 'other' | null;

  // Step 2: Location & Shop
  postalCode: string;
  serviceType: 'mobile' | 'in_store' | null;
  selectedShop: Shop | null;  // NEW
  distanceMiles: number | null;  // NEW

  // Step 3: Vehicle (only for replacement)
  identificationMethod: 'plate' | 'vin' | 'manual' | null;  // NEW
  licensePlate: string;  // NEW
  plateState: string;  // NEW
  vin: string;
  vehicle: VehicleInfo | null;

  // Step 4: Damage Details
  glassType: GlassType | null;
  damageType: 'chip' | 'crack' | 'shattered' | 'unknown' | null;
  chipCount: 1 | 2 | 3 | null;  // NEW for chip repair

  // Step 5: Contact
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsConsent: boolean;

  // Navigation
  currentStep: number;
}
```

---

#### Task 2B.2: New Step 1 - Service Intent

**New File:** `frontend/src/pages/NewQuote/ServiceIntentStep.tsx`

```tsx
export function ServiceIntentStep() {
  const { serviceIntent, setServiceIntent, nextStep } = useQuoteForm();

  const options = [
    {
      value: 'replacement',
      icon: <CarFront className="h-8 w-8" />,
      title: 'Windshield Replacement',
      description: 'Cracked or shattered? We\'ll replace it.',
    },
    {
      value: 'chip_repair',
      icon: <CircleDot className="h-8 w-8" />,
      title: 'Chip Repair',
      description: '3 chips or fewer—we can fix it.',
    },
    {
      value: 'other',
      icon: <HelpCircle className="h-8 w-8" />,
      title: 'Other Glass',
      description: 'Side window, sunroof, back glass—we\'ll help.',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">What do you need help with today?</h2>

      <div className="grid gap-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setServiceIntent(option.value)}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all",
              serviceIntent === option.value
                ? "border-red-600 bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="text-red-600">{option.icon}</div>
            <div>
              <h3 className="font-semibold">{option.title}</h3>
              <p className="text-sm text-gray-600">{option.description}</p>
            </div>
          </button>
        ))}
      </div>

      <Button onClick={nextStep} disabled={!serviceIntent}>
        Continue
      </Button>
    </div>
  );
}
```

---

#### Task 2B.3: Update Step 2 - Location with Shop List

**File:** `frontend/src/pages/NewQuote/LocationStep.tsx`

```tsx
export function LocationStep() {
  const {
    postalCode, setPostalCode,
    serviceType, setServiceType,
    selectedShop, setSelectedShop,
  } = useQuoteForm();

  const { data: nearbyShops, isLoading } = useShopsNearby(postalCode);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Where are you?</h2>

      {/* Postal Code Input */}
      <div>
        <Label>ZIP / Postal Code</Label>
        <Input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Enter your ZIP code"
        />
      </div>

      {/* Service Type Selection */}
      {nearbyShops && (
        <div className="space-y-4">
          <p className="text-green-600 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {nearbyShops.mobile_available
              ? "Mobile service available in your area!"
              : "In-store service available near you."}
          </p>

          <RadioGroup value={serviceType} onValueChange={setServiceType}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile" id="mobile" />
              <Label htmlFor="mobile">
                Mobile Service — We come to you
                <span className="text-sm text-gray-500 ml-2">
                  (from ${nearbyShops.shops[0]?.mobile_fee || 49} travel fee)
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in_store" id="in_store" />
              <Label htmlFor="in_store">
                In-Shop — Visit one of our locations
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Shop List (for in-store) */}
      {serviceType === 'in_store' && nearbyShops?.shops && (
        <div className="space-y-3">
          <h3 className="font-semibold">Select a shop:</h3>
          {nearbyShops.shops.slice(0, 5).map((shop) => (
            <button
              key={shop.id}
              onClick={() => setSelectedShop(shop)}
              className={cn(
                "w-full p-4 rounded-lg border-2 text-left",
                selectedShop?.id === shop.id
                  ? "border-red-600 bg-red-50"
                  : "border-gray-200"
              )}
            >
              <div className="flex justify-between">
                <div>
                  <h4 className="font-medium">{shop.name}</h4>
                  <p className="text-sm text-gray-600">{shop.address}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {shop.distance_miles.toFixed(1)} mi
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={prevStep}>Back</Button>
        <Button onClick={nextStep} disabled={!canProceed}>Continue</Button>
      </div>
    </div>
  );
}
```

---

#### Task 2B.4: Update Step 3 - Vehicle with Plate Decode

**File:** `frontend/src/pages/NewQuote/VehicleStep.tsx`

```tsx
export function VehicleStep() {
  const {
    identificationMethod, setIdentificationMethod,
    licensePlate, setLicensePlate,
    plateState, setPlateState,
    vin, setVin,
    vehicle, setVehicle,
  } = useQuoteForm();

  const identifyByPlate = useIdentifyByPlate();
  const identifyByVin = useIdentifyVehicle();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">What vehicle is this for?</h2>

      {/* Identification Method Tabs */}
      <Tabs value={identificationMethod} onValueChange={setIdentificationMethod}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plate">License Plate</TabsTrigger>
          <TabsTrigger value="vin">VIN</TabsTrigger>
          <TabsTrigger value="manual">Year/Make/Model</TabsTrigger>
        </TabsList>

        <TabsContent value="plate" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>License Plate</Label>
              <Input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="ABC1234"
              />
            </div>
            <div>
              <Label>State</Label>
              <Select value={plateState} onValueChange={setPlateState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={() => identifyByPlate.mutate({ licensePlate, plateState })}
            disabled={!licensePlate || !plateState || identifyByPlate.isPending}
          >
            {identifyByPlate.isPending ? <Spinner /> : "Decode My Vehicle"}
          </Button>
        </TabsContent>

        <TabsContent value="vin" className="space-y-4">
          <div>
            <Label>17-Character VIN</Label>
            <Input
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              maxLength={17}
              placeholder="Enter your VIN"
            />
          </div>
          <Button
            onClick={() => identifyByVin.mutate(vin)}
            disabled={vin.length !== 17 || identifyByVin.isPending}
          >
            {identifyByVin.isPending ? <Spinner /> : "Look Up Vehicle"}
          </Button>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          {/* Year/Make/Model cascading dropdowns */}
          <YearMakeModelSelector onSelect={setVehicle} />
        </TabsContent>
      </Tabs>

      {/* Vehicle Confirmed */}
      {vehicle && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {vehicle.year} {vehicle.make} {vehicle.model} — confirmed
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
```

---

#### Task 2B.5: Update Step 6 - Quote with 3 Tiers

**File:** `frontend/src/pages/QuotePreviewPage.tsx`

```tsx
export function QuotePreviewPage() {
  const { quoteId } = useParams();
  const { data: quote } = useQuotePreview(quoteId);

  const [selectedTier, setSelectedTier] = useState<'insurance' | 'cash' | 'afterpay'>('cash');

  // Calculate Afterpay amount (4 payments)
  const afterpayAmount = quote ? (quote.pricing.total / 4).toFixed(2) : 0;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Vehicle & Service Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Vehicle</dt>
              <dd>{quote.vehicle.year} {quote.vehicle.make} {quote.vehicle.model}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Service</dt>
              <dd>{quote.service.type === 'mobile' ? 'Mobile Service' : 'In-Shop'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Location</dt>
              <dd>{quote.service.location.formatted}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 3-Tier Pricing Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose your payment option</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Insurance Tier */}
          <button
            onClick={() => setSelectedTier('insurance')}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left",
              selectedTier === 'insurance' ? "border-red-600 bg-red-50" : "border-gray-200"
            )}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold">Insurance Claim</h4>
                <p className="text-sm text-gray-600">We bill your insurance directly</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-600">$0</span>
                <p className="text-xs text-gray-500">+ deductible</p>
              </div>
            </div>
          </button>

          {/* Cash Tier */}
          <button
            onClick={() => setSelectedTier('cash')}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left",
              selectedTier === 'cash' ? "border-red-600 bg-red-50" : "border-gray-200"
            )}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold">Pay Today</h4>
                <p className="text-sm text-gray-600">Credit card, debit, or cash</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">${quote.pricing.total}</span>
              </div>
            </div>
          </button>

          {/* Afterpay Tier */}
          <button
            onClick={() => setSelectedTier('afterpay')}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left",
              selectedTier === 'afterpay' ? "border-red-600 bg-red-50" : "border-gray-200"
            )}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold">Easy Payments</h4>
                <p className="text-sm text-gray-600">4 interest-free payments</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">${afterpayAmount}</span>
                <p className="text-xs text-gray-500">× 4 payments</p>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid gap-3">
        <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
          Book Now
        </Button>
        <Button size="lg" variant="outline" className="w-full">
          Email Quote
        </Button>
        <Button size="lg" variant="ghost" className="w-full">
          Call Me Back
        </Button>
      </div>
    </div>
  );
}
```

---

### Phase 2C: API Service Updates

#### Task 2C.1: Add Shops Nearby Hook

**File:** `frontend/src/api/quotes.ts`

```typescript
export async function getShopsNearby(postalCode: string): Promise<ShopsNearbyResponse> {
  const response = await apiClient.get('/api/v1/shops/nearby/', {
    params: { postal_code: postalCode },
  });
  return response.data;
}

export async function identifyByPlate(
  licensePlate: string,
  state: string
): Promise<VehicleIdentifyResponse> {
  const response = await apiClient.post('/api/v1/vehicles/identify/', {
    license_plate: licensePlate,
    state: state,
  });
  return response.data;
}
```

**File:** `frontend/src/hooks/useQuotes.ts`

```typescript
export function useShopsNearby(postalCode: string) {
  return useQuery({
    queryKey: ['shops', 'nearby', postalCode],
    queryFn: () => getShopsNearby(postalCode),
    enabled: postalCode.length >= 5,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useIdentifyByPlate() {
  return useMutation({
    mutationFn: ({ licensePlate, state }: { licensePlate: string; state: string }) =>
      identifyByPlate(licensePlate, state),
  });
}
```

---

#### Task 2C.2: Update Types

**File:** `frontend/src/types/api.ts`

```typescript
// Add new types
export interface Shop {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  email: string;
  distance_miles: number;
  mobile_available: boolean;
  mobile_fee: number;
  in_store_available: boolean;
}

export interface ShopsNearbyResponse {
  postal_code: string;
  shops: Shop[];
  mobile_available: boolean;
  closest_shop_distance: number;
}

export type ServiceIntent = 'replacement' | 'chip_repair' | 'other';

export interface QuoteGenerationRequest {
  service_intent: ServiceIntent;
  vin?: string;
  license_plate?: string;
  plate_state?: string;
  glass_type?: GlassType;
  chip_count?: 1 | 2 | 3;
  service_type: 'mobile' | 'in_store';
  shop_id: number;
  distance_miles?: number;
  location: LocationInput;
  customer: CustomerInput;
}
```

---

## File Changes Summary

### Backend Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `shops/api/views.py` | ADD | `ShopsNearbyView` endpoint |
| `shops/api/serializers.py` | ADD | `ShopNearbySerializer` |
| `shops/api/urls.py` | MODIFY | Add nearby route |
| `pricing/services/pricing_service.py` | MODIFY | Add `calculate_chip_repair()` |
| `quotes/api/serializers.py` | MODIFY | Update request serializer |
| `quotes/tasks.py` | MODIFY | Handle chip repair and other flows |

### Frontend Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/context/QuoteFormContext.tsx` | MODIFY | Add service intent, shop selection state |
| `src/pages/NewQuote/index.tsx` | MODIFY | Add Step 1, reorder steps |
| `src/pages/NewQuote/ServiceIntentStep.tsx` | CREATE | New Step 1 component |
| `src/pages/NewQuote/LocationStep.tsx` | MODIFY | Add shop list, connect to API |
| `src/pages/NewQuote/VehicleStep.tsx` | MODIFY | Add plate decode, YMM fallback |
| `src/pages/NewQuote/GlassTypeStep.tsx` | MODIFY | Add chip count for repairs |
| `src/pages/QuotePreviewPage.tsx` | MODIFY | Add 3-tier pricing display |
| `src/api/quotes.ts` | MODIFY | Add shops nearby, plate decode |
| `src/hooks/useQuotes.ts` | MODIFY | Add new hooks |
| `src/types/api.ts` | MODIFY | Add new types |

---

## Testing Strategy

### Backend Tests

1. **Unit: Shops Nearby API**
   - Test distance calculation
   - Test shop sorting
   - Test mobile fee calculation

2. **Unit: Chip Repair Pricing**
   - Test 1/2/3 chip calculations
   - Test mobile fee addition
   - Test >3 chips rejection

3. **Integration: Quote Generation**
   - Test chip repair flow end-to-end
   - Test replacement flow with plate decode
   - Test "other" glass CSR routing

### Frontend Tests

1. **Component: ServiceIntentStep**
   - Test option selection
   - Test navigation

2. **Component: LocationStep**
   - Test postal code validation
   - Test shop list display
   - Test mobile/in-store toggle

3. **Component: VehicleStep**
   - Test plate decode flow
   - Test VIN fallback
   - Test manual entry

4. **E2E: Full Wizard Flow**
   - Test chip repair path
   - Test replacement path
   - Test other glass path

---

## Implementation Order

### Sprint 1: Backend API Updates ✅ COMPLETE

- [x] Task 2A.1: Shops Nearby API
  - `backend/shops/api/views.py` - ShopsNearbyView
  - `backend/shops/api/serializers.py` - ShopNearbySerializer
  - `backend/shops/api/urls.py` - route registration
- [x] Task 2A.2: Chip Repair Pricing
  - `backend/pricing/services/pricing_service.py` - calculate_chip_repair() + ChipRepairPricing dataclass
  - Wraps existing PricingProfile method + mobile fee
- [x] Task 2A.3: Quote Serializer Update
  - `backend/quotes/api/serializers.py`
  - Added: service_intent, license_plate, plate_state, shop_id, distance_miles, chip_count
  - Removed: manufacturer, payment_type
- [x] Task 2A.4: Quote Task Update
  - `backend/quotes/tasks.py`
  - Added _generate_chip_repair_quote(), _generate_other_glass_quote(), _generate_replacement_quote()
  - `backend/quotes/api/views.py` - Updated GenerateQuoteView to pass new params

### Sprint 2: Frontend API Layer ✅ COMPLETE

- [x] Task 2C.1: Add getShopsNearby() to `src/api/quotes.ts`
- [x] Task 2C.2: Add useShopsNearby() hook to `src/hooks/useQuotes.ts`
- [x] Task 2C.3: Add ShopNearby, ShopsNearbyResponse, ServiceIntent, ChipCount types to `src/types/api.ts`
- [x] Updated QuoteFormContext with Phase 2 fields (serviceIntent, selectedShop, chipCount, etc.)
- [x] Updated identifyVehicle to support license plates via IdentifyVehicleParams
- [x] Updated QuoteGenerationRequest type to match new backend serializer

### Sprint 3: Frontend Wizard Rebuild

- [x] Task 2B.1: Update QuoteFormContext state (done in Sprint 2)
- [ ] Task 2B.2: Create ServiceIntentStep.tsx (new Step 1)
- [ ] Task 2B.3: Update LocationStep with shop list + real API
- [ ] Task 2B.4: Update VehicleStep with plate/VIN tabs
- [ ] Task 2B.5: Update GlassTypeStep for chip count
- [ ] Task 2B.6: Update QuotePreviewPage with 3-tier pricing

### Deferred (Phase 3)

- [ ] Support Dashboard CSR view for "other glass" quotes
- [ ] Unit/Integration tests
- [ ] Photo upload for damage evidence
- [ ] Manual Year/Make/Model entry

---

## Success Criteria

- [ ] User can select service intent (windshield/chip/other)
- [ ] User sees shop list sorted by distance
- [ ] User can decode vehicle by plate OR VIN
- [ ] Chip repair quotes work end-to-end
- [ ] Quote preview shows 3 pricing tiers
- [ ] "Other glass" routes to CSR queue
- [ ] All existing tests still pass

---

## Open Questions (Resolved)

| Question | Answer |
|----------|--------|
| Chip repair pricing same for all vehicles? | ✅ Yes - just WR-1/WR-2/WR-3 flat rates from PricingProfile |
| How many shops to show? | ✅ Top 5, plus any within 500 miles |
| >3 chips handling? | ✅ Recommend replacement, don't allow chip repair |

---

## References

- `detailed-plan.md` - Full UX specification
- `phase-1-implementation-plan.md` - Pricing engine (complete)
- `CLAUDE.md` - Technical context
