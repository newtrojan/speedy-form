import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useQuoteWizardStore } from './store/useQuoteWizardStore';
import { WizardLayout } from './components/WizardLayout';
import { getStepTitle, getStepSubtitle } from './constants/stepContent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, RotateCcw } from 'lucide-react';

// Step components
import { GlassSelectionStep } from './steps/GlassSelectionStep';
import { DamageAssessmentStep } from './steps/DamageAssessmentStep';
import { ContactInfoStep } from './steps/ContactInfoStep';
import { VehicleIdentificationStep } from './steps/VehicleIdentificationStep';
import { PartConfirmationStep } from './steps/PartConfirmationStep';
import { ServiceLocationStep } from './steps/ServiceLocationStep';

// API
import { generateQuote } from '@/api/quotes';
import type { QuoteGenerationRequest, GlassType as ApiGlassType } from '@/types/api';
import type { GlassType } from './schemas/glassSelection.schema';

// Map frontend glass types to API glass types
const mapGlassTypeToApi = (glassType: GlassType): ApiGlassType => {
  const mapping: Record<GlassType, ApiGlassType> = {
    windshield: 'windshield',
    back_glass: 'back_glass',
    driver_front: 'driver_side',
    driver_rear: 'rear_driver_side',
    passenger_front: 'passenger_side',
    passenger_rear: 'rear_passenger_side',
    sunroof: 'sunroof',
  };
  return mapping[glassType];
};

export function QuoteWizard() {
  const navigate = useNavigate();
  const {
    currentStep,
    getActiveSteps,
    glassSelection,
    damageAssessment,
    contactInfo,
    vehicleIdentification,
    selectedPart,
    serviceLocation,
    flowType,
    setTaskId,
    setIsGenerating,
    setGenerationError,
    resetWizard,
  } = useQuoteWizardStore();

  // Resume modal state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);

  // Check for existing wizard state on mount
  useEffect(() => {
    if (hasCheckedResume) return;

    // Check if there's meaningful saved state
    // Show modal if user has completed at least step 1 (glassSelection exists)
    // OR if they're on a step beyond 1 (meaning they had progress)
    const hasExistingProgress = Boolean(glassSelection) || currentStep > 1;

    if (hasExistingProgress) {
      setShowResumeModal(true);
    }

    setHasCheckedResume(true);
  }, [hasCheckedResume, glassSelection, currentStep]);

  // Handle continuing with existing quote
  const handleContinueQuote = () => {
    setShowResumeModal(false);
  };

  // Handle starting fresh
  const handleStartFresh = () => {
    resetWizard();
    setShowResumeModal(false);
  };

  // Quote generation mutation
  const generateMutation = useMutation({
    mutationFn: generateQuote,
    onSuccess: (data) => {
      setTaskId(data.task_id);
      setIsGenerating(false);
      // Navigate to status polling page
      navigate(`/quote/status/${data.task_id}`);
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setGenerationError(error.message || 'Failed to generate quote');
    },
  });

  // Get active steps based on current flow
  const activeSteps = getActiveSteps();

  // Build and submit quote generation request
  const handleGenerateQuote = async () => {
    if (!glassSelection || !contactInfo || !serviceLocation) {
      setGenerationError('Missing required information');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    // Build the quote generation request
    const request: QuoteGenerationRequest = {
      service_intent:
        flowType === 'repair'
          ? 'chip_repair'
          : 'replacement',
      glass_type: mapGlassTypeToApi(glassSelection.glassType),
      service_type: serviceLocation.serviceType,
      shop_id: serviceLocation.selectedShopId,
      location: {
        postal_code: serviceLocation.postalCode,
      },
      customer: {
        email: contactInfo.email,
        phone: contactInfo.phone,
        first_name: contactInfo.firstName,
        last_name: contactInfo.lastName,
      },
    };

    // Add mobile-specific fields
    if (serviceLocation.serviceType === 'mobile') {
      const mobileLocation = serviceLocation as {
        streetAddress: string;
        city: string;
        state: string;
        distanceMiles?: number;
      };
      request.location.street_address = mobileLocation.streetAddress;
      request.location.city = mobileLocation.city;
      request.location.state = mobileLocation.state;
      if (mobileLocation.distanceMiles !== undefined) {
        request.distance_miles = mobileLocation.distanceMiles;
      }
    }

    // Add chip count for repairs
    if (flowType === 'repair' && damageAssessment?.serviceIntent === 'repair') {
      request.chip_count = parseInt(damageAssessment.chipCount, 10) as 1 | 2 | 3;
    }

    // Add vehicle identification
    if (vehicleIdentification) {
      if (vehicleIdentification.method === 'vin') {
        request.vin = vehicleIdentification.vin;
      } else if (vehicleIdentification.method === 'plate') {
        request.license_plate = vehicleIdentification.licensePlate;
        request.plate_state = vehicleIdentification.plateState;
      }
      // For manual, we don't send VIN/plate - backend will handle it
    }

    // Add selected part number
    if (selectedPart) {
      request.nags_part_number = selectedPart.nags_part_number;
    }

    try {
      await generateMutation.mutateAsync(request);
    } catch {
      // Error handled in mutation onError
    }
  };

  // Handle step completion and quote generation
  useEffect(() => {
    // If we're on the last step (Service Location) and it's complete, generate the quote
    const lastStep = activeSteps[activeSteps.length - 1];
    if (currentStep === lastStep && serviceLocation && !generateMutation.isPending) {
      handleGenerateQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceLocation]); // Only trigger when serviceLocation changes

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <GlassSelectionStep />;
      case 2:
        return <DamageAssessmentStep />;
      case 3:
        return <ContactInfoStep />;
      case 4:
        return <VehicleIdentificationStep />;
      case 5:
        return <PartConfirmationStep />;
      case 6:
        return <ServiceLocationStep />;
      default:
        return <GlassSelectionStep />;
    }
  };

  return (
    <>
      <WizardLayout
        title={getStepTitle(currentStep)}
        subtitle={getStepSubtitle(currentStep)}
      >
        {renderStep()}
      </WizardLayout>

      {/* Resume Quote Modal */}
      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome Back!</DialogTitle>
            <DialogDescription className="text-base pt-2">
              It looks like you have an unfinished quote. Would you like to continue where you left off?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">Your progress:</p>
              <ul className="space-y-1">
                {glassSelection && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    Glass type selected
                  </li>
                )}
                {damageAssessment && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    Damage assessed
                  </li>
                )}
                {contactInfo && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    Contact info provided
                  </li>
                )}
                {vehicleIdentification && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    Vehicle identified
                  </li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleStartFresh}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Start Fresh
            </Button>
            <Button
              onClick={handleContinueQuote}
              className="flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export components and types for external use
// Exporting store hook and types alongside main component is intentional for external access
export { useQuoteWizardStore } from './store/useQuoteWizardStore'; // eslint-disable-line react-refresh/only-export-components
export type { WizardStep } from './store/useQuoteWizardStore';
