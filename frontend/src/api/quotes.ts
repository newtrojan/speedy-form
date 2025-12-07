import { apiClient } from './client';
import type {
  VehicleLookupResult,
  InsuranceProvider,
  QuoteGenerationRequest,
  QuoteGenerationResponse,
  QuoteStatusResponse,
  Quote,
  MobileServiceCheckResponse,
  InStoreServiceCheckResponse,
  QuoteApprovalResponse,
  ShopsNearbyResponse,
} from '@/types/api';

// Vehicle identification - supports VIN or license plate
export interface IdentifyVehicleParams {
  vin?: string;
  license_plate?: string;
  state?: string;
}

export async function identifyVehicle(
  params: IdentifyVehicleParams
): Promise<VehicleLookupResult> {
  const response = await apiClient.post('/api/v1/vehicles/identify/', params);
  return response.data;
}

// Shops nearby - get shops sorted by distance
export async function getShopsNearby(
  postalCode: string
): Promise<ShopsNearbyResponse> {
  const response = await apiClient.get('/api/v1/shops/nearby/', {
    params: { postal_code: postalCode },
  });
  return response.data;
}

// Service availability checks
export async function checkMobileService(
  postalCode: string
): Promise<MobileServiceCheckResponse> {
  const response = await apiClient.post('/api/v1/shops/check-mobile/', {
    postal_code: postalCode,
  });
  return response.data;
}

export async function checkInStoreService(
  postalCode: string
): Promise<InStoreServiceCheckResponse> {
  const response = await apiClient.post('/api/v1/shops/check-in-store/', {
    postal_code: postalCode,
  });
  return response.data;
}

// Insurance providers
export async function getInsuranceProviders(): Promise<InsuranceProvider[]> {
  const response = await apiClient.get('/api/v1/pricing/insurance-providers/');
  return response.data;
}

// Quote generation
export async function generateQuote(
  data: QuoteGenerationRequest
): Promise<QuoteGenerationResponse> {
  const response = await apiClient.post('/api/v1/quotes/generate/', data);
  return response.data;
}

// Quote status polling
export async function getQuoteStatus(
  taskId: string
): Promise<QuoteStatusResponse> {
  const response = await apiClient.get(`/api/v1/quotes/status/${taskId}/`);
  return response.data;
}

// Quote preview
export async function getQuotePreview(quoteId: string): Promise<Quote> {
  const response = await apiClient.get(`/api/v1/quotes/${quoteId}/preview/`);
  return response.data;
}

// Quote approval
export async function approveQuote(
  quoteId: string,
  token: string
): Promise<QuoteApprovalResponse> {
  const response = await apiClient.post(`/api/v1/quotes/${quoteId}/approve/`, {
    token,
  });
  return response.data;
}
