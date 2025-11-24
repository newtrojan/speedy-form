import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as quotesApi from '@/api/quotes';
import type { QuoteGenerationRequest } from '@/types/api';

// Vehicle identification
export function useIdentifyVehicle() {
  return useMutation({
    mutationFn: (vin: string) => quotesApi.identifyVehicle(vin),
  });
}

// Service availability
export function useCheckMobileService() {
  return useMutation({
    mutationFn: (postalCode: string) => quotesApi.checkMobileService(postalCode),
  });
}

export function useCheckInStoreService() {
  return useMutation({
    mutationFn: (postalCode: string) => quotesApi.checkInStoreService(postalCode),
  });
}

// Insurance providers (with caching)
export function useInsuranceProviders() {
  return useQuery({
    queryKey: ['insuranceProviders'],
    queryFn: quotesApi.getInsuranceProviders,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

// Quote generation
export function useGenerateQuote() {
  return useMutation({
    mutationFn: (data: QuoteGenerationRequest) => quotesApi.generateQuote(data),
  });
}

// Quote status (polling)
export function useQuoteStatus(taskId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['quoteStatus', taskId],
    queryFn: () => quotesApi.getQuoteStatus(taskId!),
    enabled: enabled && !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
}

// Quote preview
export function useQuotePreview(quoteId: string | null) {
  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => quotesApi.getQuotePreview(quoteId!),
    enabled: !!quoteId,
  });
}

// Quote approval
export function useApproveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, token }: { quoteId: string; token: string }) =>
      quotesApi.approveQuote(quoteId, token),
    onSuccess: (_, variables) => {
      // Invalidate quote cache to refetch updated state
      queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] });
    },
  });
}
