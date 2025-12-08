import { z } from 'zod';

export const serviceIntentEnum = z.enum(['repair', 'replacement']);
export type ServiceIntent = z.infer<typeof serviceIntentEnum>;

export const chipCountEnum = z.enum(['1', '2', '3']);
export type ChipCount = z.infer<typeof chipCountEnum>;

export const damageReasonEnum = z.enum([
  'larger_than_6_inches',
  '4_or_more_chips',
  'edge_damage',
  'obstructs_view',
  'in_driver_line_of_sight',
  'other',
]);
export type DamageReason = z.infer<typeof damageReasonEnum>;

// Repair flow schema - for chip repairs (windshield only, 1-3 chips)
export const repairAssessmentSchema = z.object({
  serviceIntent: z.literal('repair'),
  chipCount: chipCountEnum,
});

// Replacement flow schema - for larger damage or non-windshield glass
export const replacementAssessmentSchema = z.object({
  serviceIntent: z.literal('replacement'),
  damageReason: damageReasonEnum.optional(),
});

// Combined schema using discriminated union
export const damageAssessmentSchema = z.discriminatedUnion('serviceIntent', [
  repairAssessmentSchema,
  replacementAssessmentSchema,
]);

export type DamageAssessmentData = z.infer<typeof damageAssessmentSchema>;
export type RepairAssessmentData = z.infer<typeof repairAssessmentSchema>;
export type ReplacementAssessmentData = z.infer<typeof replacementAssessmentSchema>;

// Helper to determine if this is a repair flow
export const isRepairFlow = (data: DamageAssessmentData): data is RepairAssessmentData => {
  return data.serviceIntent === 'repair';
};

// Damage reason display text
export const damageReasonLabels: Record<DamageReason, string> = {
  larger_than_6_inches: 'Damage is larger than 6 inches',
  '4_or_more_chips': 'I have 4 or more chips',
  edge_damage: 'Damage is at the edge of the glass',
  obstructs_view: 'Damage obstructs my view',
  in_driver_line_of_sight: "Damage is in driver's line of sight",
  other: 'Other reason',
};

// Chip count labels
export const chipCountLabels: Record<ChipCount, string> = {
  '1': '1 chip',
  '2': '2 chips',
  '3': '3 chips',
};
