import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuoteWizardStore } from '../store/useQuoteWizardStore';
import {
  partConfirmationSchema,
  type PartConfirmationData,
  featureLabels,
  featureDescriptions,
  mapApiFeatureToEnum,
  type PartFeature,
} from '../schemas/partConfirmation.schema';
import type { GlassPart } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle, Car, Check, HelpCircle, Info } from 'lucide-react';

// Feature checkbox with description
interface FeatureCheckboxProps {
  feature: PartFeature;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function FeatureCheckbox({
  feature,
  checked,
  onCheckedChange,
  disabled,
}: FeatureCheckboxProps) {
  return (
    <div
      className={cn(
        'flex items-start space-x-3 p-4 rounded-lg border-2 transition-all',
        checked ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white',
        disabled && 'opacity-50'
      )}
    >
      <Checkbox
        id={feature}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex-1">
        <Label
          htmlFor={feature}
          className={cn(
            'text-sm font-medium cursor-pointer',
            checked ? 'text-primary' : 'text-gray-700'
          )}
        >
          {featureLabels[feature]}
        </Label>
        <p className="text-xs text-gray-500 mt-1">
          {featureDescriptions[feature]}
        </p>
      </div>
    </div>
  );
}

export function PartConfirmationStep() {
  const {
    vehicleLookupResult,
    selectedPart,
    setSelectedPart,
    setPartConfirmation,
    goToNextStep,
  } = useQuoteWizardStore();

  const parts = useMemo(
    () => vehicleLookupResult?.parts ?? [],
    [vehicleLookupResult?.parts]
  );

  // Feature selection state
  const [selectedFeatures, setSelectedFeatures] = useState<Set<PartFeature>>(
    () => new Set()
  );
  const [notSure, setNotSure] = useState(false);

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(partConfirmationSchema),
    defaultValues: {
      selectedPartNumber: selectedPart?.nags_part_number ?? '',
      notSure: false,
      vehicleConfirmed: true,
    },
  });

  // Extract all unique features from parts
  const availableFeatures = useMemo(() => {
    const features = new Set<PartFeature>();
    for (const part of parts) {
      for (const f of part.features) {
        const mapped = mapApiFeatureToEnum(f);
        if (mapped) features.add(mapped);
      }
    }
    return Array.from(features);
  }, [parts]);

  // Filter parts based on selected features
  const filteredParts = useMemo(() => {
    if (selectedFeatures.size === 0) return parts;

    return parts.filter((part) => {
      const partFeatures = new Set(
        part.features.map((f) => mapApiFeatureToEnum(f)).filter(Boolean)
      );

      // Part must have all selected features
      for (const feature of selectedFeatures) {
        if (!partFeatures.has(feature)) return false;
      }
      return true;
    });
  }, [parts, selectedFeatures]);

  // Auto-select if only one part matches
  useEffect(() => {
    if (filteredParts.length === 1 && !notSure) {
      const part = filteredParts[0];
      if (part) {
        setSelectedPart(part);
        setValue('selectedPartNumber', part.nags_part_number);
      }
    }
  }, [filteredParts, notSure, setSelectedPart, setValue]);

  const handleFeatureToggle = (feature: PartFeature, checked: boolean) => {
    const newFeatures = new Set(selectedFeatures);
    if (checked) {
      newFeatures.add(feature);
    } else {
      newFeatures.delete(feature);
    }
    setSelectedFeatures(newFeatures);
    setNotSure(false);
  };

  const handlePartSelect = (part: GlassPart) => {
    setSelectedPart(part);
    setValue('selectedPartNumber', part.nags_part_number);
    setNotSure(false);
  };

  const handleNotSure = () => {
    setNotSure(true);
    setValue('notSure', true);
    setValue('selectedPartNumber', parts[0]?.nags_part_number ?? 'MANUAL_REVIEW');
  };

  const onSubmit = (data: Record<string, unknown>) => {
    setPartConfirmation(data as PartConfirmationData);
    goToNextStep();
  };

  // If no parts (shouldn't happen), show error
  if (parts.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No parts found
        </h3>
        <p className="text-gray-600 mb-4">
          We couldn&apos;t find glass parts for your vehicle. Our team will contact
          you to help find the right part.
        </p>
        <Button onClick={() => goToNextStep()} variant="outline">
          Continue Anyway
        </Button>
      </div>
    );
  }

  // If only one part, show confirmation
  if (parts.length === 1 && parts[0]) {
    const part = parts[0];
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="text-center mb-6">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            We found your glass!
          </h3>
        </div>

        <PartCard part={part} isSelected onClick={() => handlePartSelect(part)} />

        {vehicleLookupResult && (
          <VehicleConfirmation
            year={vehicleLookupResult.year}
            make={vehicleLookupResult.make}
            model={vehicleLookupResult.model}
            trim={vehicleLookupResult.trim}
          />
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="min-w-[160px]">
            Confirm & Continue
          </Button>
        </div>
      </form>
    );
  }

  // Multiple parts - show feature selection
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-start space-x-3 p-4 bg-primary/10 rounded-lg">
        <HelpCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-700">
          <p className="font-medium">Help us find the right glass</p>
          <p className="mt-1">
            We found {parts.length} possible parts for your vehicle. Select any
            special features your windshield has to narrow down the options.
          </p>
        </div>
      </div>

      {/* Feature checkboxes */}
      {availableFeatures.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Does your windshield have any of these features?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableFeatures.map((feature) => (
              <FeatureCheckbox
                key={feature}
                feature={feature}
                checked={selectedFeatures.has(feature)}
                onCheckedChange={(checked) =>
                  handleFeatureToggle(feature, checked)
                }
                disabled={notSure}
              />
            ))}
          </div>
        </div>
      )}

      {/* Not sure option */}
      <button
        type="button"
        onClick={handleNotSure}
        className={cn(
          'w-full flex items-center justify-center space-x-2 p-4 rounded-lg border-2 transition-all',
          notSure
            ? 'border-amber-500 bg-amber-50'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        )}
      >
        <Info className={cn('w-5 h-5', notSure ? 'text-amber-600' : 'text-gray-400')} />
        <span className={cn('font-medium', notSure ? 'text-amber-700' : 'text-gray-600')}>
          I&apos;m not sure - have a specialist contact me
        </span>
      </button>

      {/* Filtered parts list */}
      {!notSure && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            {filteredParts.length === parts.length
              ? `All ${parts.length} matching parts:`
              : `${filteredParts.length} part${filteredParts.length !== 1 ? 's' : ''} matching your features:`}
          </h4>
          <div className="space-y-2">
            {filteredParts.map((part) => (
              <PartCard
                key={part.nags_part_number}
                part={part}
                isSelected={selectedPart?.nags_part_number === part.nags_part_number}
                onClick={() => handlePartSelect(part)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Not sure message */}
      {notSure && (
        <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">No problem!</p>
            <p className="mt-1">
              One of our specialists will contact you to help identify the correct
              glass for your vehicle.
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {errors.selectedPartNumber && (
        <p className="text-sm text-red-600">{errors.selectedPartNumber.message}</p>
      )}

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={!selectedPart && !notSure}
          className="min-w-[160px]"
        >
          {notSure ? 'Continue' : 'Confirm & Continue'}
        </Button>
      </div>
    </form>
  );
}

// Part card component
function PartCard({
  part,
  isSelected,
  onClick,
}: {
  part: GlassPart;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-medium text-gray-900">
              {part.nags_part_number}
            </span>
            {part.calibration_required && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                Requires Calibration
              </span>
            )}
          </div>
          {part.features.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {part.features.slice(0, 4).map((feature) => (
                <span
                  key={feature}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                >
                  {feature}
                </span>
              ))}
              {part.features.length > 4 && (
                <span className="text-xs text-gray-500">
                  +{part.features.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-4',
            isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
    </button>
  );
}

// Vehicle confirmation component
function VehicleConfirmation({
  year,
  make,
  model,
  trim,
}: {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
}) {
  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
      <Car className="w-8 h-8 text-gray-400 flex-shrink-0" />
      <div>
        <p className="text-sm text-gray-500">Confirmed vehicle:</p>
        <p className="font-medium text-gray-900">
          {year} {make} {model}
          {trim && ` ${trim}`}
        </p>
      </div>
    </div>
  );
}
