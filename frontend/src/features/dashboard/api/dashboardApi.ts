/**
 * Dashboard API client for support dashboard endpoints
 */

import { apiClient } from '@/api/client';
import type {
  DashboardStats,
  QuoteListItem,
  QuoteDetail,
  QuoteFilters,
  QuoteNote,
  PaginatedResponse,
  ConversationStats,
  ConversationsListResponse,
  MessagesResponse,
  Message,
  QuoteConversationsResponse,
  TemplatesResponse,
  ConversationStatus,
  Channel,
  InboxResponse,
} from '../types';

const SUPPORT_BASE = '/api/v1/support';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>(`${SUPPORT_BASE}/stats/`);
  return response.data;
}

/**
 * Get quotes list with optional filters and pagination
 */
export async function getQuotes(
  filters?: QuoteFilters,
  page: number = 1
): Promise<PaginatedResponse<QuoteListItem>> {
  const params = new URLSearchParams();

  if (filters?.state) {
    params.append('state', filters.state);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  params.append('page', String(page));

  const response = await apiClient.get<PaginatedResponse<QuoteListItem>>(
    `${SUPPORT_BASE}/quotes/`,
    { params }
  );
  return response.data;
}

/**
 * Get single quote detail
 */
export async function getQuoteDetail(quoteId: string): Promise<QuoteDetail> {
  const response = await apiClient.get<QuoteDetail>(
    `${SUPPORT_BASE}/quotes/${quoteId}/`
  );
  return response.data;
}

/**
 * Validate and send quote to customer
 */
export async function validateQuote(
  quoteId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`${SUPPORT_BASE}/quotes/${quoteId}/validate/`, {
    notes,
  });
  return response.data;
}

/**
 * Reject a quote with reason
 */
export async function rejectQuote(
  quoteId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`${SUPPORT_BASE}/quotes/${quoteId}/reject/`, {
    reason,
  });
  return response.data;
}

/**
 * Modify quote (CSR notes, line items)
 */
export async function modifyQuote(
  quoteId: string,
  data: {
    csr_notes?: string;
    line_items?: Array<{
      id?: number;
      type?: string;
      description?: string;
      subtotal: number;
    }>;
  }
): Promise<QuoteDetail> {
  const response = await apiClient.patch<QuoteDetail>(
    `${SUPPORT_BASE}/quotes/${quoteId}/modify/`,
    data
  );
  return response.data;
}

/**
 * Add a note to a quote
 */
export async function addNote(quoteId: string, content: string): Promise<QuoteNote> {
  const response = await apiClient.post<QuoteNote>(
    `${SUPPORT_BASE}/quotes/${quoteId}/notes/`,
    { content }
  );
  return response.data;
}

// ============================================
// Conversation / Messaging API (Chatwoot)
// ============================================

const DASHBOARD_BASE = '/api/v1/dashboard';

/**
 * Get conversation statistics
 */
export async function getConversationStats(): Promise<ConversationStats> {
  const response = await apiClient.get<ConversationStats>(
    `${DASHBOARD_BASE}/conversations/stats/`
  );
  return response.data;
}

/**
 * Get all conversations with optional status filter
 */
export async function getConversations(
  status: ConversationStatus | 'all' = 'all',
  page: number = 1
): Promise<ConversationsListResponse> {
  const params = new URLSearchParams();
  params.append('status', status);
  params.append('page', String(page));

  const response = await apiClient.get<ConversationsListResponse>(
    `${DASHBOARD_BASE}/conversations/`,
    { params }
  );
  return response.data;
}

/**
 * Get unified inbox - all conversations with enriched customer data
 *
 * Returns conversations across all customers with Django customer info
 * and active quotes attached. Useful for CSRs to see full context
 * without needing a quote first.
 */
export async function getInbox(
  status: ConversationStatus | 'all' = 'open',
  page: number = 1
): Promise<InboxResponse> {
  const params = new URLSearchParams();
  params.append('status', status);
  params.append('page', String(page));

  const response = await apiClient.get<InboxResponse>(
    `${DASHBOARD_BASE}/inbox/`,
    { params }
  );
  return response.data;
}

/**
 * Get messages for a specific conversation
 */
export async function getConversationMessages(
  conversationId: number,
  before?: number
): Promise<MessagesResponse> {
  const params = before ? { before: String(before) } : undefined;

  const response = await apiClient.get<MessagesResponse>(
    `${DASHBOARD_BASE}/conversations/${conversationId}/messages/`,
    { params }
  );
  return response.data;
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: number,
  content: string,
  isPrivate: boolean = false
): Promise<Message> {
  const response = await apiClient.post<Message>(
    `${DASHBOARD_BASE}/conversations/${conversationId}/send/`,
    { content, private: isPrivate }
  );
  return response.data;
}

/**
 * Get conversations for a specific quote
 */
export async function getQuoteConversations(
  quoteId: string
): Promise<QuoteConversationsResponse> {
  const response = await apiClient.get<QuoteConversationsResponse>(
    `${DASHBOARD_BASE}/quotes/${quoteId}/conversations/`
  );
  return response.data;
}

/**
 * Get all messages for a quote (omnichannel view)
 *
 * Fetches messages from all conversations (SMS, email, webchat)
 * merged into a single chronological timeline.
 */
export async function getQuoteMessages(quoteId: string): Promise<MessagesResponse> {
  const response = await apiClient.get<MessagesResponse>(
    `${DASHBOARD_BASE}/quotes/${quoteId}/messages/`
  );
  return response.data;
}

/**
 * Send a message related to a quote
 *
 * @param quoteId - The quote ID
 * @param content - Message text
 * @param includeQuoteLink - Whether to append quote link
 * @param channel - Optional channel to send via ('chat', 'email', 'sms').
 *                  If not specified, replies to most recent open conversation.
 *                  If specified, routes to that channel's inbox.
 */
export async function sendQuoteMessage(
  quoteId: string,
  content: string,
  includeQuoteLink: boolean = false,
  channel?: Channel
): Promise<Message> {
  const response = await apiClient.post<Message>(
    `${DASHBOARD_BASE}/quotes/${quoteId}/conversations/`,
    {
      content,
      include_quote_link: includeQuoteLink,
      ...(channel && { channel }),
    }
  );
  return response.data;
}

/**
 * Get canned responses / message templates
 */
export async function getTemplates(): Promise<TemplatesResponse> {
  const response = await apiClient.get<TemplatesResponse>(
    `${DASHBOARD_BASE}/templates/`
  );
  return response.data;
}

/**
 * Force sync a customer to Chatwoot
 */
export async function syncCustomerToChatwoot(
  customerId: number
): Promise<{ status: string; chatwoot_contact: Record<string, unknown> }> {
  const response = await apiClient.post(
    `${DASHBOARD_BASE}/customers/${customerId}/sync-chatwoot/`
  );
  return response.data;
}
