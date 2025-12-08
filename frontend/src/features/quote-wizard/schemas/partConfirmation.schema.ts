import { z } from 'zod';

// Part features that can be selected
export const partFeatureEnum = z.enum([
  'heated',
  'rain_sensor',
  'heads_up_display',
  'antenna',
  'acoustic',
  'solar',
  'encapsulated',
]);

export type PartFeature = z.infer<typeof partFeatureEnum>;

export const partConfirmationSchema = z.object({
  // Selected NAGS part number (required if confirming)
  selectedPartNumber: z.string().min(1, 'Please select a part'),

  // Optional feature selections (for filtering when multiple parts)
  hasHeatedGlass: z.boolean().optional(),
  hasRainSensor: z.boolean().optional(),
  hasHeadsUpDisplay: z.boolean().optional(),
  hasAntenna: z.boolean().optional(),
  hasAcoustic: z.boolean().optional(),
  hasSolar: z.boolean().optional(),

  // User unsure flag - triggers CSR review
  notSure: z.boolean().default(false),

  // Vehicle confirmation
  vehicleConfirmed: z.boolean().default(false),
});

export type PartConfirmationData = z.infer<typeof partConfirmationSchema>;

// Feature labels for display
export const featureLabels: Record<PartFeature, string> = {
  heated: 'Heated Glass',
  rain_sensor: 'Rain Sensor',
  heads_up_display: 'Heads-Up Display (HUD)',
  antenna: 'Antenna',
  acoustic: 'Acoustic (Sound Dampening)',
  solar: 'Solar Tint',
  encapsulated: 'Encapsulated',
};

// Feature descriptions for tooltips
export const featureDescriptions: Record<PartFeature, string> = {
  heated: 'Windshield has heating elements for defrosting',
  rain_sensor: 'Automatic rain-sensing wipers',
  heads_up_display: 'Projects information onto windshield',
  antenna: 'Built-in radio or GPS antenna',
  acoustic: 'Sound-dampening interlayer for quieter cabin',
  solar: 'UV-blocking tint to reduce heat',
  encapsulated: 'Glass with molded rubber gasket',
};

// Helper to map API feature names to our enum
export const mapApiFeatureToEnum = (apiFeature: string): PartFeature | null => {
  const mapping: Record<string, PartFeature> = {
    HEATED: 'heated',
    HEAT: 'heated',
    'RAIN SENSOR': 'rain_sensor',
    RAIN_SENSOR: 'rain_sensor',
    HUD: 'heads_up_display',
    'HEADS UP DISPLAY': 'heads_up_display',
    ANTENNA: 'antenna',
    ANT: 'antenna',
    ACOUSTIC: 'acoustic',
    SOLAR: 'solar',
    ENCAPSULATED: 'encapsulated',
    ENCAP: 'encapsulated',
  };
  return mapping[apiFeature.toUpperCase()] || null;
};
