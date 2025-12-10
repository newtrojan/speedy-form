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

// ============================================
// Conversation & Messaging Types (Chatwoot)
// ============================================

/**
 * Communication channel type
 */
export type Channel = 'sms' | 'email' | 'chat';

/**
 * Conversation status
 */
export type ConversationStatus = 'open' | 'resolved' | 'pending';

/**
 * Message sender info from Chatwoot
 */
export interface MessageSender {
  id: number | null;
  name: string | null;
  type: 'contact' | 'user'; // contact = customer, user = agent
  avatar_url: string | null;
}

/**
 * Single message in a conversation
 */
export interface Message {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  private: boolean; // Internal note (not visible to customer)
  created_at: string; // ISO timestamp
  sender: MessageSender;
  attachments: Array<{
    file_type: string;
    data_url: string;
    file_name?: string;
  }>;
  content_attributes: Record<string, unknown>;
  channel: Channel;
}

/**
 * Last message preview for conversation list
 */
export interface LastMessage {
  content: string;
  created_at: string | null;
  message_type: 'incoming' | 'outgoing' | null;
  sender_type: 'contact' | 'user' | null;
}

/**
 * Contact (customer) in a conversation
 */
export interface ConversationContact {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
}

/**
 * Agent assigned to conversation
 */
export interface ConversationAssignee {
  id?: number;
  name?: string;
  email?: string;
  avatar_url?: string;
}

/**
 * Conversation with a customer
 */
export interface Conversation {
  id: number;
  status: ConversationStatus;
  inbox_id: number;
  channel: Channel; // Derived from inbox_id by backend
  contact: ConversationContact;
  last_message: LastMessage;
  unread_count: number;
  created_at: string;
  updated_at: string;
  labels: string[];
  assignee: ConversationAssignee;
}

/**
 * Hot lead scoring signals
 */
export interface LeadScoreSignals {
  view_count_24h: number;
  view_count_4h: number;
  conversation_count: number;
  has_open_conversation: boolean;
  last_message_hours_ago: number | null;
  quote_status: QuoteState;
}

/**
 * Lead score for a quote
 */
export interface LeadScore {
  is_hot: boolean;
  has_new_messages: boolean;
  new_message_count: number;
  signals: LeadScoreSignals;
}

/**
 * Canned response / message template
 */
export interface Template {
  id: number;
  short_code: string;
  content: string;
}

/**
 * Response from GET /quotes/{id}/conversations/
 */
export interface QuoteConversationsResponse {
  conversations: Conversation[];
  lead_score: LeadScore;
}

/**
 * Response from GET /conversations/
 */
export interface ConversationsListResponse {
  conversations: Conversation[];
  meta: {
    mine_count?: number;
    unassigned_count?: number;
    all_count?: number;
  };
}

/**
 * Response from GET /conversations/{id}/messages/
 */
export interface MessagesResponse {
  messages: Message[];
}

/**
 * Response from GET /templates/
 */
export interface TemplatesResponse {
  templates: Template[];
}

/**
 * Response from GET /conversations/stats/
 */
export interface ConversationStats {
  configured: boolean;
  error?: string;
  counts: {
    open?: number;
    resolved?: number;
    pending?: number;
    all?: number;
  };
}

/**
 * Filter for conversation list
 */
export type ConversationFilter = 'all' | 'unread';

// ============================================
// Unified Inbox Types
// ============================================

/**
 * Django customer data enriched onto conversations
 */
export interface DjangoCustomer {
  id: number;
  full_name: string;
  phone: string;
  email: string;
}

/**
 * Active quote summary for inbox
 */
export interface ActiveQuoteSummary {
  id: string;
  state: QuoteState;
  created_at: string;
}

/**
 * Conversation with enriched customer data for unified inbox
 */
export interface InboxConversation extends Conversation {
  /** Django customer data (if customer exists in system) */
  django_customer: DjangoCustomer | null;
  /** Active quotes for this customer (up to 3) */
  active_quotes: ActiveQuoteSummary[];
}

/**
 * Response from GET /dashboard/inbox/
 */
export interface InboxResponse {
  conversations: InboxConversation[];
  meta: {
    mine_count?: number;
    unassigned_count?: number;
    all_count?: number;
  };
}
