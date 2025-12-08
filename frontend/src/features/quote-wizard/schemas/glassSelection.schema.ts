import { z } from 'zod';

export const glassTypeEnum = z.enum([
  'windshield',
  'back_glass',
  'driver_front',
  'driver_rear',
  'passenger_front',
  'passenger_rear',
  'sunroof',
]);

export type GlassType = z.infer<typeof glassTypeEnum>;

export const glassSelectionSchema = z.object({
  glassType: glassTypeEnum,
});

export type GlassSelectionData = z.infer<typeof glassSelectionSchema>;

// Helper to determine if glass type requires full vehicle lookup
export const requiresVehicleLookup = (glassType: GlassType): boolean => {
  // All replacement types need vehicle lookup to identify correct part
  // This could be expanded in the future to have different logic per glass type
  return glassType !== undefined;
};

// Glass type display names
export const glassTypeLabels: Record<GlassType, string> = {
  windshield: 'Windshield',
  back_glass: 'Back Glass',
  driver_front: 'Driver Side Front',
  driver_rear: 'Driver Side Rear',
  passenger_front: 'Passenger Side Front',
  passenger_rear: 'Passenger Side Rear',
  sunroof: 'Sunroof / Moonroof',
};

// Glass type descriptions
export const glassTypeDescriptions: Record<GlassType, string> = {
  windshield: 'Front windshield replacement or repair',
  back_glass: 'Rear window replacement',
  driver_front: 'Driver side front door window',
  driver_rear: 'Driver side rear door window',
  passenger_front: 'Passenger side front door window',
  passenger_rear: 'Passenger side rear door window',
  sunroof: 'Roof glass replacement',
};
