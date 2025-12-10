import { z } from 'zod';

// US phone number regex - accepts various formats
const phoneRegex = /^(\+1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

/**
 * Convert phone number to E.164 format (+1XXXXXXXXXX)
 * This is the international standard format required by Chatwoot and SMS providers
 */
export const toE164 = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle 10-digit US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Handle 11-digit numbers starting with 1 (US with country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Already has country code or other format
  if (phone.startsWith('+')) {
    return phone.replace(/[^\d+]/g, '');
  }

  // Default: assume US number
  return `+1${digits}`;
};

// Phone schema with E.164 transformation
const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(phoneRegex, 'Please enter a valid US phone number')
  .transform(toE164);

export const contactInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(100, 'Email must be 100 characters or less'),

  phone: phoneSchema,

  smsConsent: z.boolean().default(false),
});

export type ContactInfoData = z.infer<typeof contactInfoSchema>;

// Helper to format phone number for display (user-friendly format)
export const formatPhoneNumber = (phone: string): string => {
  // Handle E.164 format
  const cleaned = phone.replace(/\D/g, '');
  // Remove leading 1 for display
  const digits = cleaned.startsWith('1') && cleaned.length === 11
    ? cleaned.slice(1)
    : cleaned;

  const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

// Helper to clean phone number for API (E.164 format)
export const cleanPhoneNumber = (phone: string): string => {
  return toE164(phone);
};
