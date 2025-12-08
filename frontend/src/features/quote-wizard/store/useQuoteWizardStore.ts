import { create } from 'zustand';
// TODO: Re-enable when backend session is implemented
// import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  GlassSelectionData,
  DamageAssessmentData,
  ContactInfoData,
  VehicleIdentificationData,
  PartConfirmationData,
  ServiceLocationData,
  FlowType,
} from '../schemas';
import { determineFlowType } from '../schemas';
import type { VehicleLookupResult, GlassPart, ShopNearby } from '@/types/api';

// Wizard step numbers
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Step names for display
export const STEP_NAMES: Record<WizardStep, string> = {
  1: 'Select Glass',
  2: 'Damage Assessment',
  3: 'Contact Info',
  4: 'Vehicle Info',
  5: 'Confirm Part',
  6: 'Service Location',
  7: 'Your Quote',
};

interface QuoteWizardState {
  // Current step (1-7)
  currentStep: WizardStep;

  // Flow type (derived from glass selection + damage assessment)
  flowType: FlowType;

  // Form data for each step
  glassSelection: GlassSelectionData | null;
  damageAssessment: DamageAssessmentData | null;
  contactInfo: ContactInfoData | null;
  vehicleIdentification: VehicleIdentificationData | null;
  partConfirmation: PartConfirmationData | null;
  serviceLocation: ServiceLocationData | null;

  // API response caches
  vehicleLookupResult: VehicleLookupResult | null;
  selectedPart: GlassPart | null;
  nearbyShops: ShopNearby[] | null;

  // Flags
  needsPartSelection: boolean;
  needsManualReview: boolean;

  // Quote generation state
  taskId: string | null;
  quoteId: string | null;
  isGenerating: boolean;
  generationError: string | null;

  // Timestamp for expiration
  createdAt: number;
}

interface QuoteWizardActions {
  // Step navigation
  setCurrentStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;

  // Form data setters
  setGlassSelection: (data: GlassSelectionData) => void;
  setDamageAssessment: (data: DamageAssessmentData) => void;
  setContactInfo: (data: ContactInfoData) => void;
  setVehicleIdentification: (data: VehicleIdentificationData) => void;
  setPartConfirmation: (data: PartConfirmationData) => void;
  setServiceLocation: (data: ServiceLocationData) => void;

  // API data setters
  setVehicleLookupResult: (result: VehicleLookupResult | null) => void;
  setSelectedPart: (part: GlassPart | null) => void;
  setNearbyShops: (shops: ShopNearby[] | null) => void;

  // Quote generation
  setTaskId: (taskId: string) => void;
  setQuoteId: (quoteId: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;

  // Utility actions
  resetWizard: () => void;
  getActiveSteps: () => WizardStep[];
  canProceedToStep: (step: WizardStep) => boolean;
  isStepComplete: (step: WizardStep) => boolean;
}

type QuoteWizardStore = QuoteWizardState & QuoteWizardActions;

// Initial state
const initialState: QuoteWizardState = {
  currentStep: 1,
  flowType: 'replacement',
  glassSelection: null,
  damageAssessment: null,
  contactInfo: null,
  vehicleIdentification: null,
  partConfirmation: null,
  serviceLocation: null,
  vehicleLookupResult: null,
  selectedPart: null,
  nearbyShops: null,
  needsPartSelection: false,
  needsManualReview: false,
  taskId: null,
  quoteId: null,
  isGenerating: false,
  generationError: null,
  createdAt: Date.now(),
};

// TODO: Re-enable when backend session is implemented
// 7 days in milliseconds
// const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// TODO: Re-enable persist middleware once backend session is implemented
// For now, disable localStorage persistence to avoid stale quote issues
export const useQuoteWizardStore = create<QuoteWizardStore>()(
  // persist(
    (set, get) => ({
      ...initialState,

      // Step navigation
      setCurrentStep: (step) => set({ currentStep: step }),

      goToNextStep: () => {
        const { currentStep, getActiveSteps } = get();
        const activeSteps = getActiveSteps();
        const currentIndex = activeSteps.indexOf(currentStep);
        const nextStep = activeSteps[currentIndex + 1];
        if (currentIndex < activeSteps.length - 1 && nextStep !== undefined) {
          set({ currentStep: nextStep });
        }
      },

      goToPrevStep: () => {
        const { currentStep, getActiveSteps } = get();
        const activeSteps = getActiveSteps();
        const currentIndex = activeSteps.indexOf(currentStep);
        const prevStep = activeSteps[currentIndex - 1];
        if (currentIndex > 0 && prevStep !== undefined) {
          set({ currentStep: prevStep });
        }
      },

      // Form data setters
      setGlassSelection: (data) => {
        const flowType = determineFlowType(data.glassType, get().damageAssessment ?? undefined);
        set({ glassSelection: data, flowType });
      },

      setDamageAssessment: (data) => {
        const glassType = get().glassSelection?.glassType ?? 'windshield';
        const flowType = determineFlowType(glassType, data);
        set({ damageAssessment: data, flowType });
      },

      setContactInfo: (data) => set({ contactInfo: data }),

      setVehicleIdentification: (data) => set({ vehicleIdentification: data }),

      setPartConfirmation: (data) => set({ partConfirmation: data }),

      setServiceLocation: (data) => set({ serviceLocation: data }),

      // API data setters
      setVehicleLookupResult: (result) => {
        if (result === null) {
          // Clear vehicle lookup state
          set({
            vehicleLookupResult: null,
            needsPartSelection: false,
            needsManualReview: false,
            selectedPart: null,
          });
          return;
        }
        // Auto-select part if only one
        const firstPart = result.parts[0];
        const autoSelectedPart = result.parts.length === 1 && firstPart !== undefined ? firstPart : null;
        set({
          vehicleLookupResult: result,
          needsPartSelection: result.needs_part_selection,
          needsManualReview: result.needs_manual_review,
          selectedPart: autoSelectedPart,
        });
      },

      setSelectedPart: (part) => set({ selectedPart: part }),

      setNearbyShops: (shops) => set({ nearbyShops: shops }),

      // Quote generation
      setTaskId: (taskId) => set({ taskId }),
      setQuoteId: (quoteId) => set({ quoteId }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationError: (error) => set({ generationError: error }),

      // Utility actions
      resetWizard: () => set({ ...initialState, createdAt: Date.now() }),

      getActiveSteps: (): WizardStep[] => {
        const { flowType, needsPartSelection, glassSelection } = get();

        // Always have these steps
        const steps: WizardStep[] = [1]; // Glass Selection

        // Step 2: Damage Assessment (only for windshield)
        if (glassSelection?.glassType === 'windshield') {
          steps.push(2);
        }

        // Step 3: Contact Info (always)
        steps.push(3);

        // Step 4: Vehicle Identification
        // For repairs, we still need Year/Make/Model
        // For replacement, we need VIN/Plate lookup
        steps.push(4);

        // Step 5: Part Confirmation (only if replacement + multiple parts)
        if (flowType === 'replacement' && needsPartSelection) {
          steps.push(5);
        }

        // Step 6: Service Location (always)
        steps.push(6);

        // Step 7: Quote Display is handled by a separate page
        // Not included in wizard steps

        return steps;
      },

      canProceedToStep: (targetStep): boolean => {
        const state = get();
        const activeSteps = state.getActiveSteps();

        // Can't go to a step that's not in the active flow
        if (!activeSteps.includes(targetStep)) {
          return false;
        }

        // Check all previous steps are complete
        for (const step of activeSteps) {
          if (step >= targetStep) break;
          if (!state.isStepComplete(step)) {
            return false;
          }
        }

        return true;
      },

      isStepComplete: (step): boolean => {
        const state = get();

        switch (step) {
          case 1:
            return state.glassSelection !== null;
          case 2:
            return state.damageAssessment !== null;
          case 3:
            return state.contactInfo !== null;
          case 4:
            return state.vehicleIdentification !== null;
          case 5:
            return state.partConfirmation !== null || state.selectedPart !== null;
          case 6:
            return state.serviceLocation !== null;
          case 7:
            return state.quoteId !== null;
          default:
            return false;
        }
      },
    })
    // TODO: Re-enable persist config once backend session is implemented
    // {
    //   name: 'speedy-quote-wizard',
    //   storage: createJSONStorage(() => localStorage),
    //   partialize: (state) => ({
    //     // Only persist form data and important flags
    //     currentStep: state.currentStep,
    //     flowType: state.flowType,
    //     glassSelection: state.glassSelection,
    //     damageAssessment: state.damageAssessment,
    //     contactInfo: state.contactInfo,
    //     vehicleIdentification: state.vehicleIdentification,
    //     partConfirmation: state.partConfirmation,
    //     serviceLocation: state.serviceLocation,
    //     vehicleLookupResult: state.vehicleLookupResult,
    //     selectedPart: state.selectedPart,
    //     nearbyShops: state.nearbyShops,
    //     needsPartSelection: state.needsPartSelection,
    //     needsManualReview: state.needsManualReview,
    //     taskId: state.taskId,
    //     quoteId: state.quoteId,
    //     createdAt: state.createdAt,
    //   }),
    //   onRehydrateStorage: () => (state) => {
    //     // Check if session has expired (7 days)
    //     if (state && Date.now() - state.createdAt > SESSION_EXPIRY_MS) {
    //       // Reset to initial state if expired
    //       useQuoteWizardStore.setState({ ...initialState, createdAt: Date.now() });
    //     }
    //   },
    // }
);

// Selector hooks for common access patterns
export const useCurrentStep = () => useQuoteWizardStore((state) => state.currentStep);
export const useFlowType = () => useQuoteWizardStore((state) => state.flowType);
export const useGlassSelection = () => useQuoteWizardStore((state) => state.glassSelection);
export const useDamageAssessment = () => useQuoteWizardStore((state) => state.damageAssessment);
export const useContactInfo = () => useQuoteWizardStore((state) => state.contactInfo);
export const useVehicleIdentification = () => useQuoteWizardStore((state) => state.vehicleIdentification);
export const usePartConfirmation = () => useQuoteWizardStore((state) => state.partConfirmation);
export const useServiceLocation = () => useQuoteWizardStore((state) => state.serviceLocation);
export const useVehicleLookupResult = () => useQuoteWizardStore((state) => state.vehicleLookupResult);
export const useSelectedPart = () => useQuoteWizardStore((state) => state.selectedPart);
export const useNearbyShops = () => useQuoteWizardStore((state) => state.nearbyShops);
