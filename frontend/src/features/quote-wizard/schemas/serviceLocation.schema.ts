import { z } from 'zod';
import { stateCodeEnum } from './vehicleIdentification.schema';

// US postal code regex (5 digits or 5+4 format)
const postalCodeRegex = /^\d{5}(-\d{4})?$/;

// Service type enum
export const serviceTypeEnum = z.enum(['mobile', 'in_store']);
export type ServiceType = z.infer<typeof serviceTypeEnum>;

// In-store service schema (just needs ZIP and shop selection)
export const inStoreServiceSchema = z.object({
  serviceType: z.literal('in_store'),
  postalCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(postalCodeRegex, 'Please enter a valid ZIP code'),
  selectedShopId: z.number().min(1, 'Please select a shop'),
});

// Mobile service schema (needs full address)
export const mobileServiceSchema = z.object({
  serviceType: z.literal('mobile'),
  postalCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(postalCodeRegex, 'Please enter a valid ZIP code'),
  streetAddress: z
    .string()
    .min(1, 'Street address is required')
    .max(200, 'Street address must be 200 characters or less'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be 100 characters or less'),
  state: stateCodeEnum,
  selectedShopId: z.number().min(1, 'Please select a shop'),
  distanceMiles: z.number().optional(),
});

// Combined schema using discriminated union
export const serviceLocationSchema = z.discriminatedUnion('serviceType', [
  inStoreServiceSchema,
  mobileServiceSchema,
]);

export type ServiceLocationData = z.infer<typeof serviceLocationSchema>;
export type InStoreServiceData = z.infer<typeof inStoreServiceSchema>;
export type MobileServiceData = z.infer<typeof mobileServiceSchema>;

// Helper to check if mobile service
export const isMobileService = (data: ServiceLocationData): data is MobileServiceData => {
  return data.serviceType === 'mobile';
};

// Service type labels
export const serviceTypeLabels: Record<ServiceType, string> = {
  mobile: 'Mobile Service',
  in_store: 'In-Store Service',
};

// Service type descriptions
export const serviceTypeDescriptions: Record<ServiceType, string> = {
  mobile: 'We come to you at home or work',
  in_store: 'Visit one of our service centers',
};

// Helper to format full address
export const formatFullAddress = (data: MobileServiceData): string => {
  return `${data.streetAddress}, ${data.city}, ${data.state} ${data.postalCode}`;
};
