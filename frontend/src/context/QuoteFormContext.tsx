import { createContext, useContext, useState, type ReactNode } from 'react';
import type {
  VehicleInfo,
  VehicleLookupResult,
  GlassPart,
  GlassType,
  ServiceType,
  PaymentType,
  DamageType,
  DamageQuantity,
  ServiceIntent,
  ChipCount,
  ShopNearby,
} from '@/types/api';

export interface QuoteFormData {
  // Phase 2: Service Intent (Step 1)
  serviceIntent?: ServiceIntent;

  // Step 2: Location & Service + Shop Selection
  serviceType?: ServiceType;
  postalCode?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  selectedShop?: ShopNearby;
  selectedShopId?: number;
  distanceMiles?: number;

  // Step 3: Vehicle (for replacement only)
  identificationMethod?: 'plate' | 'vin' | 'manual';
  vin?: string;
  licensePlate?: string;
  plateState?: string;
  vehicle?: VehicleInfo;
  // Full lookup result with parts (for passing to quote generation)
  vehicleLookupResult?: VehicleLookupResult;
  // Selected part (auto-selected if only one, or user-selected if multiple)
  selectedPart?: GlassPart;

  // Step 4: Glass Type & Damage (or chip count for chip_repair)
  glassType?: GlassType;
  damageType?: DamageType;
  damageQuantity?: DamageQuantity;
  chipCount?: ChipCount;

  // Step 5: Payment
  paymentType?: PaymentType;
  insuranceProviderId?: number;
  claimNumber?: string;
  deductible?: number;

  // Step 6: Contact
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;

  // Generation
  taskId?: string;
  quoteId?: string;
}

interface QuoteFormContextType {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  resetForm: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  canProceed: (step: number) => boolean;
}

const QuoteFormContext = createContext<QuoteFormContextType | undefined>(
  undefined
);

export function QuoteFormProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<QuoteFormData>({});
  const [currentStep, setCurrentStep] = useState(1);

  const updateFormData = (data: Partial<QuoteFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const resetForm = () => {
    setFormData({});
    setCurrentStep(1);
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1: // Vehicle step
        return !!(formData.vin && formData.vehicle);
      case 2: // Location step
        if (formData.serviceType === 'mobile') {
          return !!(
            formData.postalCode &&
            formData.streetAddress &&
            formData.city &&
            formData.state
          );
        }
        return !!formData.postalCode;
      case 3: // Glass type step
        return !!(formData.glassType && formData.damageType && formData.damageQuantity);
      case 4: // Payment step
        if (formData.paymentType === 'insurance') {
          return !!formData.insuranceProviderId;
        }
        return !!formData.paymentType;
      case 5: // Contact step
        return !!(
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.phone
        );
      default:
        return false;
    }
  };

  return (
    <QuoteFormContext.Provider
      value={{
        formData,
        updateFormData,
        resetForm,
        currentStep,
        setCurrentStep,
        canProceed,
      }}
    >
      {children}
    </QuoteFormContext.Provider>
  );
}

export function useQuoteForm() {
  const context = useContext(QuoteFormContext);
  if (!context) {
    throw new Error('useQuoteForm must be used within QuoteFormProvider');
  }
  return context;
}
