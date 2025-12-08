// Re-export all schemas and types

export * from './glassSelection.schema';
export * from './damageAssessment.schema';
export * from './contactInfo.schema';
export * from './vehicleIdentification.schema';
export * from './partConfirmation.schema';
export * from './serviceLocation.schema';

// Combined wizard data type (for final submission)
import type { GlassSelectionData } from './glassSelection.schema';
import type { DamageAssessmentData } from './damageAssessment.schema';
import type { ContactInfoData } from './contactInfo.schema';
import type { VehicleIdentificationData } from './vehicleIdentification.schema';
import type { PartConfirmationData } from './partConfirmation.schema';
import type { ServiceLocationData } from './serviceLocation.schema';

export interface QuoteWizardFormData {
  glassSelection: GlassSelectionData;
  damageAssessment: DamageAssessmentData;
  contactInfo: ContactInfoData;
  vehicleIdentification?: VehicleIdentificationData;
  partConfirmation?: PartConfirmationData;
  serviceLocation: ServiceLocationData;
}

// Flow type derived from form data
export type FlowType = 'repair' | 'replacement';

export const determineFlowType = (
  glassType: string,
  damageAssessment?: DamageAssessmentData
): FlowType => {
  // Only windshield can be repaired
  if (glassType !== 'windshield') {
    return 'replacement';
  }

  // If damage assessment indicates repair
  if (damageAssessment?.serviceIntent === 'repair') {
    return 'repair';
  }

  return 'replacement';
};
