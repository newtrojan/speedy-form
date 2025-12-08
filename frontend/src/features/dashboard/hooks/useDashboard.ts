/**
 * TanStack Query hooks for dashboard data fetching
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getDashboardStats,
  getQuotes,
  getQuoteDetail,
  validateQuote,
  rejectQuote,
  modifyQuote,
  addNote,
} from '../api/dashboardApi';
import type { QuoteFilters, QuoteListItem } from '../types';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  quotes: (filters?: QuoteFilters) => [...dashboardKeys.all, 'quotes', filters] as const,
  quoteDetail: (id: string) => [...dashboardKeys.all, 'quote', id] as const,
};

/**
 * Fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Fetch quotes list with infinite scroll pagination
 */
export function useQuotes(filters?: QuoteFilters) {
  return useInfiniteQuery({
    queryKey: dashboardKeys.quotes(filters),
    queryFn: ({ pageParam = 1 }) => getQuotes(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // If there's a next page URL, extract page number
      if (lastPage.next) {
        const url = new URL(lastPage.next);
        const page = url.searchParams.get('page');
        return page ? parseInt(page, 10) : undefined;
      }
      return undefined;
    },
    // Flatten all pages into a single array for easy access
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      quotes: data.pages.flatMap((page) => page.results),
      totalCount: data.pages[0]?.count ?? 0,
    }),
  });
}

/**
 * Helper type for flattened quotes data
 */
export interface FlattenedQuotesData {
  quotes: QuoteListItem[];
  totalCount: number;
}

/**
 * Fetch single quote detail
 */
export function useQuoteDetail(quoteId: string | null) {
  return useQuery({
    queryKey: dashboardKeys.quoteDetail(quoteId ?? ''),
    queryFn: () => getQuoteDetail(quoteId!),
    enabled: !!quoteId,
  });
}

/**
 * Validate and send quote mutation
 */
export function useValidateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, notes }: { quoteId: string; notes?: string }) =>
      validateQuote(quoteId, notes),
    onSuccess: () => {
      // Invalidate quotes list and stats
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

/**
 * Reject quote mutation
 */
export function useRejectQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: string; reason: string }) =>
      rejectQuote(quoteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

/**
 * Modify quote mutation
 */
export function useModifyQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      data,
    }: {
      quoteId: string;
      data: Parameters<typeof modifyQuote>[1];
    }) => modifyQuote(quoteId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.quoteDetail(variables.quoteId),
      });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.quotes() });
    },
  });
}

/**
 * Add note to quote mutation
 */
export function useAddNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, content }: { quoteId: string; content: string }) =>
      addNote(quoteId, content),
    onSuccess: (_, variables) => {
      // Invalidate quote detail to refetch with new note
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.quoteDetail(variables.quoteId),
      });
    },
  });
}
