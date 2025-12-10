/**
 * TanStack Query hooks for dashboard data fetching
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import {
  getDashboardStats,
  getQuotes,
  getQuoteDetail,
  validateQuote,
  rejectQuote,
  modifyQuote,
  addNote,
  getConversationStats,
  getConversations,
  getInbox,
  getConversationMessages,
  sendMessage,
  getQuoteConversations,
  getQuoteMessages,
  sendQuoteMessage,
  getTemplates,
  syncCustomerToChatwoot,
} from '../api/dashboardApi';
import type { QuoteFilters, QuoteListItem, ConversationStatus, Channel } from '../types';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  quotes: (filters?: QuoteFilters) =>
    [...dashboardKeys.all, 'quotes', filters] as const,
  quoteDetail: (id: string) => [...dashboardKeys.all, 'quote', id] as const,
  // Conversation keys
  conversationStats: () => [...dashboardKeys.all, 'conversation-stats'] as const,
  conversations: (status?: ConversationStatus | 'all') =>
    [...dashboardKeys.all, 'conversations', status] as const,
  inbox: (status?: ConversationStatus | 'all') =>
    [...dashboardKeys.all, 'inbox', status] as const,
  conversationMessages: (id: number) =>
    [...dashboardKeys.all, 'conversation', id, 'messages'] as const,
  quoteConversations: (quoteId: string) =>
    [...dashboardKeys.all, 'quote', quoteId, 'conversations'] as const,
  quoteMessages: (quoteId: string) =>
    [...dashboardKeys.all, 'quote', quoteId, 'messages'] as const,
  templates: () => [...dashboardKeys.all, 'templates'] as const,
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

// ============================================
// Conversation / Messaging Hooks
// ============================================

/**
 * Fetch conversation statistics (open/resolved counts)
 */
export function useConversationStats() {
  return useQuery({
    queryKey: dashboardKeys.conversationStats(),
    queryFn: getConversationStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Fetch conversations list with status filter
 */
export function useConversations(status: ConversationStatus | 'all' = 'all') {
  return useQuery({
    queryKey: dashboardKeys.conversations(status),
    queryFn: () => getConversations(status),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time feel
  });
}

/**
 * Fetch unified inbox - all conversations with customer context
 *
 * Returns conversations enriched with Django customer data and active quotes.
 * Use this for the main inbox view where CSRs need to see all conversations
 * regardless of quote status.
 */
export function useInbox(status: ConversationStatus | 'all' = 'open') {
  return useQuery({
    queryKey: dashboardKeys.inbox(status),
    queryFn: () => getInbox(status),
    refetchInterval: 10000, // Refresh every 10 seconds for real-time feel
  });
}

/**
 * Fetch messages for a specific conversation
 */
export function useConversationMessages(conversationId: number | null) {
  return useQuery({
    queryKey: dashboardKeys.conversationMessages(conversationId ?? 0),
    queryFn: () => getConversationMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time messages
  });
}

/**
 * Fetch conversations for a specific quote (with lead score)
 */
export function useQuoteConversations(quoteId: string | null) {
  return useQuery({
    queryKey: dashboardKeys.quoteConversations(quoteId ?? ''),
    queryFn: () => getQuoteConversations(quoteId!),
    enabled: !!quoteId,
    refetchInterval: 15000,
  });
}

/**
 * Fetch all messages for a quote (omnichannel view)
 *
 * Fetches messages from all conversations (SMS, email, webchat)
 * merged into a single chronological timeline.
 */
export function useQuoteMessages(quoteId: string | null) {
  return useQuery({
    queryKey: dashboardKeys.quoteMessages(quoteId ?? ''),
    queryFn: () => getQuoteMessages(quoteId!),
    enabled: !!quoteId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time messages
  });
}

/**
 * Fetch canned responses / templates
 */
export function useTemplates() {
  return useQuery({
    queryKey: dashboardKeys.templates(),
    queryFn: getTemplates,
    staleTime: 5 * 60 * 1000, // Templates rarely change, cache for 5 min
  });
}

/**
 * Send message in a conversation mutation
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      content,
      isPrivate = false,
    }: {
      conversationId: number;
      content: string;
      isPrivate?: boolean;
    }) => sendMessage(conversationId, content, isPrivate),
    onSuccess: (_, variables) => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.conversationMessages(variables.conversationId),
      });
      // Also invalidate conversation list for unread counts
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.conversations(),
      });
    },
  });
}

/**
 * Send message related to a quote mutation
 *
 * Supports optional channel parameter to route to specific inbox:
 * - 'chat' - Web widget inbox
 * - 'email' - Email inbox
 * - 'sms' - SMS inbox
 */
export function useSendQuoteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      content,
      includeQuoteLink = false,
      channel,
    }: {
      quoteId: string;
      content: string;
      includeQuoteLink?: boolean;
      channel?: Channel;
    }) => sendQuoteMessage(quoteId, content, includeQuoteLink, channel),
    onSuccess: (_, variables) => {
      // Invalidate quote conversations
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.quoteConversations(variables.quoteId),
      });
      // Invalidate quote messages (omnichannel view)
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.quoteMessages(variables.quoteId),
      });
      // Also invalidate main conversation list
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.conversations(),
      });
    },
  });
}

/**
 * Sync customer to Chatwoot mutation
 */
export function useSyncCustomer() {
  return useMutation({
    mutationFn: (customerId: number) => syncCustomerToChatwoot(customerId),
  });
}
