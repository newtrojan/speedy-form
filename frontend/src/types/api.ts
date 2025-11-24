// Vehicle types
export interface VehicleInfo {
  vin?: string;
  year: number;
  make: string;
  model: string;
  body_type: string;
  trim?: string;
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
export type GlassType =
  | 'windshield'
  | 'door_front_left'
  | 'door_front_right'
  | 'door_rear_left'
  | 'door_rear_right'
  | 'back_glass'
  | 'vent_front_left'
  | 'vent_front_right'
  | 'vent_rear_left'
  | 'vent_rear_right';
export type PaymentType = 'cash' | 'insurance';

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
}

export interface Quote {
  id: string;
  customer: Customer;
  vehicle: VehicleInfo;
  glass: {
    type: GlassType;
    display_name: string;
    damage_type: DamageType;
    damage_type_display: string;
    damage_quantity: DamageQuantity;
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
  vin: string;
  glass_type: GlassType;
  manufacturer?: string;
  service_type: ServiceType;
  payment_type: PaymentType;
  damage_type?: DamageType;
  damage_quantity?: DamageQuantity;
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
