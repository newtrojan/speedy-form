import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import type { ServiceIntent } from '@/types/api';

interface ServiceOption {
  value: ServiceIntent;
  title: string;
  description: string;
  icon: string;
}

const serviceOptions: ServiceOption[] = [
  {
    value: 'replacement',
    title: 'Windshield Replacement',
    description: 'Full windshield replacement for cracks, major damage, or failed inspections',
    icon: '/images/windshield-icon-img-blk-r0q05n6tpyeyjciu1435mhydt736iuyu0b13vjyrr4.webp',
  },
  {
    value: 'chip_repair',
    title: 'Chip Repair',
    description: 'Fix small chips before they spread - up to 3 chips can be repaired',
    icon: '/images/chip-repair-icon.webp',
  },
  {
    value: 'other',
    title: 'Other Glass',
    description: 'Side windows, back glass, sunroof, or other glass types',
    icon: '/images/back-glass-icon-img-blk-r0q0fa19rtlrjgj0rs0hokfh0dlmf67sbzr9ynohz4.webp',
  },
];

export function ServiceIntentStep() {
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();
  const [selectedIntent, setSelectedIntent] = useState<ServiceIntent | undefined>(
    formData.serviceIntent
  );

  const handleSelect = (intent: ServiceIntent) => {
    setSelectedIntent(intent);
  };

  const handleContinue = () => {
    if (!selectedIntent) return;

    updateFormData({ serviceIntent: selectedIntent });
    // Next step is Location (step 2)
    setCurrentStep(2);
  };

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">
        What service do you need?
      </h2>
      <p className="text-gray-600 mb-8">
        Select the type of auto glass service you're looking for
      </p>

      <div className="space-y-4">
        {serviceOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`w-full p-6 border-2 rounded-lg text-left transition-all flex items-start gap-4 ${
              selectedIntent === option.value
                ? 'border-[#DC2626] bg-red-50'
                : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
            }`}
          >
            <div className="flex-shrink-0">
              <img
                src={option.icon}
                alt={option.title}
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {option.title}
              </h3>
              <p className="text-gray-600">{option.description}</p>
              {option.value === 'chip_repair' && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  Often covered 100% by insurance with no deductible!
                </p>
              )}
              {option.value === 'other' && (
                <p className="text-sm text-amber-600 mt-2 font-medium">
                  A specialist will contact you with a custom quote
                </p>
              )}
            </div>
            <div className="flex-shrink-0 self-center">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedIntent === option.value
                    ? 'border-[#DC2626] bg-[#DC2626]'
                    : 'border-gray-300'
                }`}
              >
                {selectedIntent === option.value && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
          </button>
        ))}

        <Button
          onClick={handleContinue}
          disabled={!selectedIntent}
          className="w-full h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C] mt-6"
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}
