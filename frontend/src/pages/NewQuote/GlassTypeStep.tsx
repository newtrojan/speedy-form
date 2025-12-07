import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import { Circle, Droplet } from 'lucide-react';
import type { GlassType, DamageType, DamageQuantity, ChipCount } from '@/types/api';

// Glass type options for "other" flow (side windows, etc.)
const glassTypes: { value: GlassType; label: string; icon: string }[] = [
  {
    value: 'windshield',
    label: 'Windshield',
    icon: '/images/windshield-icon-img-blk-r0q05n6tpyeyjciu1435mhydt736iuyu0b13vjyrr4.webp',
  },
  {
    value: 'driver_side',
    label: 'Driver Side',
    icon: '/images/driver-side-icon-img-blk-r0q0d5wce8pjf1lm4d3pkln4w60w3otj1iwy38tdz4.webp',
  },
  {
    value: 'passenger_side',
    label: 'Passenger Side',
    icon: '/images/passenger-side-icon-img-blk-r0q0d6u6l2qtqnk8yvic53elhjw9bdx9dnkfkirzsw.webp',
  },
  {
    value: 'back_glass',
    label: 'Back Glass',
    icon: '/images/back-glass-icon-img-blk-r0q0fa19rtlrjgj0rs0hokfh0dlmf67sbzr9ynohz4.webp',
  },
];

// Damage type options (for "other" flow)
const damageTypes: { value: DamageType; label: string; icon: any }[] = [
  {
    value: 'chip',
    label: 'Chip(s)',
    icon: Circle,
  },
  {
    value: 'crack',
    label: 'Crack(s)',
    icon: Droplet,
  },
  {
    value: 'both',
    label: 'Both Chips & Cracks',
    icon: null,
  },
];

// Damage quantity options (for "other" flow)
const damageQuantities: { value: DamageQuantity; label: string }[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3+', label: '3 or more' },
];

// Chip count options (for chip repair flow) - 1 to 3
const chipCounts: { value: ChipCount; description: string }[] = [
  { value: 1, description: 'Single chip' },
  { value: 2, description: 'Two chips' },
  { value: 3, description: 'Three chips' },
];

export function GlassTypeStep() {
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();

  // Determine flow based on service intent
  const isChipRepair = formData.serviceIntent === 'chip_repair';
  const isReplacement = formData.serviceIntent === 'replacement';
  const isOther = formData.serviceIntent === 'other';

  // CHIP REPAIR FLOW: Number of chips to repair
  const [selectedChipCount, setSelectedChipCount] = useState<ChipCount | undefined>(
    formData.chipCount
  );

  // OTHER FLOW: Glass selection + damage info
  const [selectedGlass, setSelectedGlass] = useState<GlassType | undefined>(
    formData.glassType
  );
  const [selectedDamageType, setSelectedDamageType] = useState<DamageType | undefined>(
    formData.damageType
  );
  const [selectedDamageQuantity, setSelectedDamageQuantity] = useState<DamageQuantity | undefined>(
    formData.damageQuantity
  );

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isChipRepair) {
      // Chip repair flow - only need chip count
      if (!selectedChipCount) {
        setError('Please select the number of chips to repair');
        return;
      }

      updateFormData({
        glassType: 'windshield', // Chip repair is always windshield
        chipCount: selectedChipCount,
      });
    } else if (isReplacement) {
      // Replacement flow - glass is always windshield, just need damage info
      if (!selectedDamageType) {
        setError('Please select the type of damage');
        return;
      }
      if (!selectedDamageQuantity) {
        setError('Please select the quantity of damage');
        return;
      }

      updateFormData({
        glassType: 'windshield', // Auto-set for replacement
        damageType: selectedDamageType,
        damageQuantity: selectedDamageQuantity,
      });
    } else if (isOther) {
      // Other flow - need glass type selection and damage info
      if (!selectedGlass) {
        setError('Please select a glass type');
        return;
      }
      if (!selectedDamageType) {
        setError('Please select the type of damage');
        return;
      }
      if (!selectedDamageQuantity) {
        setError('Please select the quantity of damage');
        return;
      }

      updateFormData({
        glassType: selectedGlass,
        damageType: selectedDamageType,
        damageQuantity: selectedDamageQuantity,
      });
    }

    // Move to next step (Contact)
    setCurrentStep(5);
  };

  const handleBack = () => {
    setCurrentStep(3);
  };

  // Determine if continue should be enabled based on flow
  const canContinue = isChipRepair
    ? !!selectedChipCount
    : isReplacement
    ? !!selectedDamageType && !!selectedDamageQuantity
    : isOther
    ? !!selectedGlass && !!selectedDamageType && !!selectedDamageQuantity
    : false;

  // Render header based on flow
  const renderHeader = () => {
    if (isChipRepair) {
      return (
        <>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            How many chips need repair?
          </h2>
          <p className="text-gray-600 mb-8">
            We can repair up to 3 chips in your windshield. Select the number below.
          </p>
        </>
      );
    }
    if (isReplacement) {
      return (
        <>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Tell us about the damage
          </h2>
          <p className="text-gray-600 mb-8">
            Help us understand the damage to your windshield so we can prepare for your service.
          </p>
        </>
      );
    }
    // isOther
    return (
      <>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          What glass needs service?
        </h2>
        <p className="text-gray-600 mb-8">
          Select the glass type and tell us about the damage
        </p>
      </>
    );
  };

  // Damage assessment component (shared between replacement and other flows)
  const renderDamageAssessment = () => (
    <div className="space-y-6">
      {/* Damage Type */}
      <div>
        <Label className="text-base font-medium mb-3 block">
          Type of Damage *
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {damageTypes.map((damageType) => {
            const IconComponent = damageType.icon;
            return (
              <button
                key={damageType.value}
                type="button"
                onClick={() => {
                  setSelectedDamageType(damageType.value);
                  setError('');
                }}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  selectedDamageType === damageType.value
                    ? 'border-[#DC2626] bg-red-50'
                    : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {IconComponent && (
                    <IconComponent className="h-5 w-5 text-[#DC2626]" />
                  )}
                  <span className="font-medium text-gray-900">
                    {damageType.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Damage Quantity */}
      <div>
        <Label className="text-base font-medium mb-3 block">
          How many? *
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {damageQuantities.map((quantity) => (
            <button
              key={quantity.value}
              type="button"
              onClick={() => {
                setSelectedDamageQuantity(quantity.value);
                setError('');
              }}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedDamageQuantity === quantity.value
                  ? 'border-[#DC2626] bg-red-50'
                  : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
              }`}
            >
              <span className="text-2xl font-bold text-gray-900 block text-center">
                {quantity.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="p-8">
      {renderHeader()}

      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {/* CHIP REPAIR FLOW - Just chip count selection */}
          {isChipRepair && (
            <div>
              <Label className="text-base font-medium mb-4 block">
                Number of Chips *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {chipCounts.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => {
                      setSelectedChipCount(chip.value);
                      setError('');
                    }}
                    className={`p-6 border-2 rounded-lg text-center transition-all ${
                      selectedChipCount === chip.value
                        ? 'border-[#DC2626] bg-red-50'
                        : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
                    }`}
                  >
                    <span className="text-3xl font-bold text-gray-900 block mb-2">
                      {chip.value}
                    </span>
                    <span className="text-sm text-gray-600">{chip.description}</span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Chip repairs are performed on windshields only. Each chip is individually assessed and repaired.
              </p>
            </div>
          )}

          {/* REPLACEMENT FLOW - Just damage assessment (glass is auto-set to windshield) */}
          {isReplacement && renderDamageAssessment()}

          {/* OTHER FLOW - Glass type picker + damage assessment */}
          {isOther && (
            <>
              {/* Glass Type Selection */}
              <div>
                <Label className="text-base font-medium mb-4 block">
                  Glass Type *
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {glassTypes.map((glass) => (
                    <button
                      key={glass.value}
                      type="button"
                      onClick={() => {
                        setSelectedGlass(glass.value);
                        setError('');
                      }}
                      className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg transition-all ${
                        selectedGlass === glass.value
                          ? 'border-[#DC2626] bg-red-50'
                          : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
                      }`}
                    >
                      <img
                        src={glass.icon}
                        alt={glass.label}
                        className="w-16 h-16 mb-3 object-contain"
                      />
                      <span className="text-center font-semibold text-gray-900">
                        {glass.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Damage Assessment - Shows when glass type is selected */}
              {selectedGlass && (
                <div className="p-6 bg-gray-50 border-l-4 border-[#DC2626] rounded">
                  <p className="text-sm font-medium text-gray-900 mb-4">
                    Tell us about the damage to help us prepare
                  </p>
                  {renderDamageAssessment()}
                </div>
              )}
            </>
          )}

          {error && <p className="text-[#DC2626] text-sm">{error}</p>}

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14 text-lg bg-transparent"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
              disabled={!canContinue}
            >
              Continue
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
