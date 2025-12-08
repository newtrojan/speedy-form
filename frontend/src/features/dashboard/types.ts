/**
 * Dashboard TypeScript types matching backend API responses
 */

/**
 * Generic paginated response from DRF PageNumberPagination
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DashboardStats {
  needs_review: number;
  hot_leads: number;
  awaiting_response: number;
  follow_up: number;
  scheduled: number;
  today: {
    sent: number;
    viewed: number;
    scheduled: number;
  };
}

export interface QuoteListItem {
  id: string;
  vehicle_display: string;
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  glass_type: string;
  service_type: 'mobile' | 'in_store';
  payment_type: 'cash' | 'insurance';
  total_price: string;
  state: QuoteState;
  state_display: string;
  created_at: string;
  age_hours: number;
  sla_status: 'on_time' | 'at_risk' | 'breached';
  expires_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  is_hot: boolean;
}

export type QuoteState =
  | 'draft'
  | 'pending_validation'
  | 'sent'
  | 'customer_approved'
  | 'scheduled'
  | 'converted'
  | 'expired'
  | 'rejected';

export interface QuoteDetail {
  id: string;
  vehicle: {
    year: number;
    make: string;
    model: string;
    vin?: string;
  };
  customer: {
    id: number;
    email: string;
    phone: string;
    full_name: string;
    address: Record<string, string>;
  };
  glass: {
    type: string;
    display_name: string;
  };
  service: {
    type: 'mobile' | 'in_store';
    location: Record<string, string>;
    assigned_shop: {
      id: number;
      name: string;
    } | null;
  };
  payment: {
    type: 'cash' | 'insurance';
    provider: string | null;
  };
  pricing: {
    line_items: LineItem[];
    total: string;
  };
  state: QuoteState;
  state_history: StateLogEntry[];
  csr_notes: string;
  notes: QuoteNote[];
  part_info: PartInfo;
  engagement: {
    view_count: number;
    last_viewed_at: string | null;
    is_hot: boolean;
    views: QuoteViewEntry[];
  };
  created_at: string;
  expires_at: string | null;
  _permissions: {
    can_validate: boolean;
    can_reject: boolean;
    can_modify: boolean;
    can_delete: boolean;
  };
}

export interface LineItem {
  id: number;
  type: 'part' | 'labor' | 'fee' | 'custom';
  description: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface StateLogEntry {
  from_state: string;
  to_state: string;
  user: string;
  timestamp: string;
  notes: string;
}

export interface QuoteViewEntry {
  viewed_at: string;
  device_type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
}

export interface QuoteNote {
  id: number;
  content: string;
  created_by_name: string;
  created_at: string; // ISO 8601 UTC timestamp
}

export interface PartInfo {
  nags_part_number: string | null;
  calibration_type: 'none' | 'static' | 'dynamic' | 'dual';
  features: string[];
  photo_urls: string[];
  moulding_required: boolean;
  hardware_required: boolean;
  labor_hours: number | null;
}

export type FilterType =
  | 'all'
  | 'needs_review'
  | 'hot_leads'
  | 'awaiting_response'
  | 'follow_up'
  | 'scheduled';

export interface QuoteFilters {
  state?: string;
  has_views?: boolean;
  stale?: boolean;
  search?: string;
}
