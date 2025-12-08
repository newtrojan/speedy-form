import { z } from 'zod';

// VIN validation regex - 17 characters, excludes I, O, Q
const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;

// License plate regex - alphanumeric, 1-8 characters
const plateRegex = /^[A-Z0-9]{1,8}$/i;

// US State codes
export const stateCodeEnum = z.enum([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

export type StateCode = z.infer<typeof stateCodeEnum>;

// Vehicle identification methods
export const identificationMethodEnum = z.enum(['vin', 'plate', 'manual']);
export type IdentificationMethod = z.infer<typeof identificationMethodEnum>;

// VIN identification schema
export const vinIdentificationSchema = z.object({
  method: z.literal('vin'),
  vin: z
    .string()
    .min(1, 'VIN is required')
    .regex(vinRegex, 'Please enter a valid 17-character VIN'),
});

// License plate identification schema
export const plateIdentificationSchema = z.object({
  method: z.literal('plate'),
  licensePlate: z
    .string()
    .min(1, 'License plate is required')
    .regex(plateRegex, 'Please enter a valid license plate'),
  plateState: stateCodeEnum,
});

// Manual Year/Make/Model schema (for repairs or fallback)
export const manualIdentificationSchema = z.object({
  method: z.literal('manual'),
  year: z
    .number()
    .min(1980, 'Year must be 1980 or later')
    .max(new Date().getFullYear() + 1, 'Invalid year'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
});

// Combined schema using discriminated union
export const vehicleIdentificationSchema = z.discriminatedUnion('method', [
  vinIdentificationSchema,
  plateIdentificationSchema,
  manualIdentificationSchema,
]);

export type VehicleIdentificationData = z.infer<typeof vehicleIdentificationSchema>;
export type VinIdentificationData = z.infer<typeof vinIdentificationSchema>;
export type PlateIdentificationData = z.infer<typeof plateIdentificationSchema>;
export type ManualIdentificationData = z.infer<typeof manualIdentificationSchema>;

// State code labels for dropdown
export const stateLabels: Record<StateCode, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

// Helper to clean VIN (uppercase, remove invalid chars)
export const cleanVin = (vin: string): string => {
  return vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
};

// Helper to validate VIN checksum (basic validation)
export const isValidVinChecksum = (vin: string): boolean => {
  // Basic length check - full checksum validation is complex
  return cleanVin(vin).length === 17;
};

// Generate years for dropdown (current year + 1 down to 1980)
export const getYearOptions = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear + 1; year >= 1980; year--) {
    years.push(year);
  }
  return years;
};
