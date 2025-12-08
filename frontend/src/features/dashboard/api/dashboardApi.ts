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
  const response = await apiClient.post(
    `${SUPPORT_BASE}/quotes/${quoteId}/validate/`,
    { notes }
  );
  return response.data;
}

/**
 * Reject a quote with reason
 */
export async function rejectQuote(
  quoteId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(
    `${SUPPORT_BASE}/quotes/${quoteId}/reject/`,
    { reason }
  );
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
export async function addNote(
  quoteId: string,
  content: string
): Promise<QuoteNote> {
  const response = await apiClient.post<QuoteNote>(
    `${SUPPORT_BASE}/quotes/${quoteId}/notes/`,
    { content }
  );
  return response.data;
}
