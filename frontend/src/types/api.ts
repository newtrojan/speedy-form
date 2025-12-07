// Vehicle types
export interface VehicleInfo {
  vin?: string;
  year: number;
  make: string;
  model: string;
  body_type: string;
  trim?: string;
}

// Glass Part from vehicle lookup
export interface GlassPart {
  nags_part_number: string;
  full_part_number: string | null;
  prefix_cd: string;
  nags_list_price: string | null;
  calibration_type: string | null;
  calibration_required: boolean;
  features: string[];
  tube_qty: string;
  source: string;
}

// Full vehicle lookup result (includes parts)
export interface VehicleLookupResult {
  source: 'autobolt' | 'nhtsa+nags' | 'nags' | 'cache' | 'manual';
  vin: string;
  year: number;
  make: string;
  model: string;
  body_style: string | null;
  trim: string | null;
  parts: GlassPart[];
  needs_part_selection: boolean;
  needs_calibration_review: boolean;
  needs_manual_review: boolean;
  needs_review: boolean;
  confidence: 'high' | 'medium' | 'low';
  review_reason: string | null;
}

// Location types
export interface Location {
  postal_code: string;
  street_address?: string;
  city?: string;
  state?: string;
  formatted?: string;
}

// Service types
export type ServiceType = 'mobile' | 'in_store';
export type ServiceIntent = 'replacement' | 'chip_repair' | 'other';
export type GlassType =
  | 'windshield'
  | 'back_glass'
  | 'driver_side'
  | 'passenger_side'
  | 'rear_driver_side'
  | 'rear_passenger_side'
  | 'sunroof'
  | 'other';
export type PaymentType = 'cash' | 'insurance';
export type ChipCount = 1 | 2 | 3;

// Damage assessment types
export type DamageType = 'chip' | 'crack' | 'both' | 'unknown';
export type DamageQuantity = '1' | '2' | '3+' | 'unknown';

// Shop types
export interface Shop {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  distance_miles?: number;
}

// Shop nearby response (from /shops/nearby/ endpoint)
export interface ShopNearby {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  email: string;
  distance_miles: number;
  offers_mobile_service: boolean;
  mobile_fee: number | null;
  max_mobile_radius_miles: number;
}

export interface ShopsNearbyResponse {
  postal_code: string;
  shops: ShopNearby[];
  mobile_available: boolean;
  closest_shop_distance: number | null;
}

// Insurance types
export interface InsuranceProvider {
  id: number;
  name: string;
  supports_direct_billing: boolean;
}

// Customer types
export interface Customer {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
}

// Quote types
export interface QuoteLineItem {
  type: 'part' | 'labor' | 'fee' | 'custom';
  description: string;
  unit_price?: number;
  quantity?: number;
  subtotal: number;
}

export interface QuotePricing {
  line_items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  pricing_summary?: {
    you_save?: string;
  };
  // Chip repair 3-tier pricing (WR-1/2/3)
  chip_repair_pricing?: {
    chip_count: ChipCount;
    price_per_chip: number;
    chip_repair_cost: number;
    mobile_fee: number;
    total: number;
    tier: 'WR-1' | 'WR-2' | 'WR-3';
  };
}

export interface Quote {
  id: string;
  service_intent: ServiceIntent;
  customer: Customer;
  vehicle: VehicleInfo;
  glass: {
    type: GlassType;
    display_name: string;
    damage_type: DamageType;
    damage_type_display: string;
    damage_quantity: DamageQuantity;
    chip_count?: ChipCount;
  };
  service: {
    type: ServiceType;
    location: Location;
    assigned_shop: Shop;
  };
  payment: {
    type: PaymentType;
    provider?: string;
  };
  pricing: QuotePricing;
  state:
    | 'draft'
    | 'pending_validation'
    | 'sent'
    | 'customer_approved'
    | 'scheduled'
    | 'converted'
    | 'expired'
    | 'rejected';
  state_display: string;
  expires_at: string;
  created_at: string;
  _actions: {
    can_approve: boolean;
    can_modify: boolean;
    can_cancel: boolean;
  };
}

// Request types
export interface QuoteGenerationRequest {
  // Service intent - determines which flow to use
  service_intent: ServiceIntent;

  // Vehicle identification (required for replacement)
  vin?: string;
  license_plate?: string;
  plate_state?: string;

  // Glass and damage details
  glass_type?: GlassType;
  damage_type?: DamageType;
  chip_count?: ChipCount;

  // Part selection (from vehicle lookup - avoids re-fetching from AUTOBOLT)
  nags_part_number?: string;

  // Service type and shop selection
  service_type: ServiceType;
  shop_id: number;
  distance_miles?: number;

  location: {
    postal_code: string;
    street_address?: string;
    city?: string;
    state?: string;
  };
  insurance?: {
    provider_id: number;
    claim_number?: string;
    deductible?: number;
  };
  customer: {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
  };
}

// Response types
export interface QuoteGenerationResponse {
  task_id: string;
  message: string;
}

export interface QuoteStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  quote_id?: string;
  error?: string;
  redirect_url?: string;
}

// Vehicle identification
export interface VehicleIdentificationRequest {
  vin: string;
}

export interface VehicleIdentificationResponse {
  year: number;
  make: string;
  model: string;
  body_type: string;
  trim?: string;
}

// Service availability
export interface MobileServiceCheckRequest {
  postal_code: string;
}

export interface MobileServiceCheckResponse {
  available: boolean;
  message?: string;
  nearest_shop?: Shop;
}

export interface InStoreServiceCheckRequest {
  postal_code: string;
}

export interface InStoreServiceCheckResponse {
  available: boolean;
  shops: Shop[];
}

// Quote approval
export interface QuoteApprovalRequest {
  token: string;
}

export interface QuoteApprovalResponse {
  message: string;
}
