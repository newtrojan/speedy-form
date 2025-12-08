import { useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuoteWizardStore } from '../store/useQuoteWizardStore';
import {
  damageAssessmentSchema,
  type DamageAssessmentData,
  type ChipCount,
  type DamageReason,
  chipCountLabels,
  damageReasonLabels,
} from '../schemas/damageAssessment.schema';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, Check, HelpCircle } from 'lucide-react';

// Helper to get error message from field errors
function getFieldError(errors: FieldErrors<DamageAssessmentData>, field: keyof DamageAssessmentData): string | undefined {
  const error = errors[field];
  if (error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
}

export function DamageAssessmentStep() {
  const { damageAssessment, setDamageAssessment, goToNextStep } = useQuoteWizardStore();

  // Initial question: Is the damage smaller than 6 inches and 3 or fewer chips?
  const [canRepair, setCanRepair] = useState<boolean | null>(() => {
    if (!damageAssessment) return null;
    return damageAssessment.serviceIntent === 'repair';
  });

  const [selectedChipCount, setSelectedChipCount] = useState<ChipCount | null>(() => {
    if (!damageAssessment || damageAssessment.serviceIntent !== 'repair') return null;
    return damageAssessment.chipCount;
  });

  const [selectedReason, setSelectedReason] = useState<DamageReason | null>(() => {
    if (!damageAssessment || damageAssessment.serviceIntent !== 'replacement') return null;
    return damageAssessment.damageReason ?? null;
  });

  const { handleSubmit, setValue, formState: { errors } } = useForm<DamageAssessmentData>({
    resolver: zodResolver(damageAssessmentSchema),
    defaultValues: damageAssessment ?? { serviceIntent: 'replacement' },
  });

  const handleRepairChoice = (canBeRepaired: boolean) => {
    setCanRepair(canBeRepaired);
    if (canBeRepaired) {
      setValue('serviceIntent', 'repair');
      setSelectedReason(null);
    } else {
      setValue('serviceIntent', 'replacement');
      setSelectedChipCount(null);
    }
  };

  const handleChipCountSelect = (count: ChipCount) => {
    setSelectedChipCount(count);
    setValue('chipCount', count);
  };

  const handleReasonSelect = (reason: DamageReason) => {
    setSelectedReason(reason);
    setValue('damageReason', reason);
  };

  const onSubmit = (data: DamageAssessmentData) => {
    setDamageAssessment(data);
    goToNextStep();
  };

  // Check if we can proceed
  const canProceed =
    canRepair !== null &&
    (canRepair ? selectedChipCount !== null : true); // Replacement doesn't require reason

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Initial question */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-primary/10 rounded-lg">
          <HelpCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Can your windshield be repaired?</p>
            <p className="mt-1">
              Chips smaller than 6 inches and not in the driver&apos;s direct line of sight
              can usually be repaired instead of replaced.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Repair option */}
          <button
            type="button"
            onClick={() => handleRepairChoice(true)}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all',
              'hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
              canRepair === true
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:bg-green-50/50'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  canRepair === true ? 'bg-green-500' : 'bg-gray-100'
                )}
              >
                <Check
                  className={cn(
                    'w-5 h-5',
                    canRepair === true ? 'text-white' : 'text-gray-400'
                  )}
                />
              </div>
              {canRepair === true && (
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                  Selected
                </span>
              )}
            </div>
            <h3
              className={cn(
                'text-lg font-semibold mb-1',
                canRepair === true ? 'text-green-700' : 'text-gray-900'
              )}
            >
              Yes, it can be repaired
            </h3>
            <p className="text-sm text-gray-600">
              Small chips (under 6&quot;), 3 or fewer, not blocking my view
            </p>
          </button>

          {/* Replacement option */}
          <button
            type="button"
            onClick={() => handleRepairChoice(false)}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all',
              'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              canRepair === false
                ? 'border-primary bg-primary/10'
                : 'border-gray-200 bg-white hover:bg-primary/5'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  canRepair === false ? 'bg-primary' : 'bg-gray-100'
                )}
              >
                <AlertCircle
                  className={cn(
                    'w-5 h-5',
                    canRepair === false ? 'text-white' : 'text-gray-400'
                  )}
                />
              </div>
              {canRepair === false && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  Selected
                </span>
              )}
            </div>
            <h3
              className={cn(
                'text-lg font-semibold mb-1',
                canRepair === false ? 'text-primary' : 'text-gray-900'
              )}
            >
              No, I need a replacement
            </h3>
            <p className="text-sm text-gray-600">
              Larger damage, cracks, or too many chips
            </p>
          </button>
        </div>
      </div>

      {/* Chip count selection (repair flow) */}
      {canRepair === true && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            How many chips need repair?
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {(['1', '2', '3'] as ChipCount[]).map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => handleChipCountSelect(count)}
                className={cn(
                  'p-4 rounded-lg border-2 text-center transition-all',
                  'hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                  selectedChipCount === count
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:bg-green-50/50'
                )}
              >
                <div
                  className={cn(
                    'text-3xl font-bold mb-1',
                    selectedChipCount === count ? 'text-green-600' : 'text-gray-700'
                  )}
                >
                  {count}
                </div>
                <div className="text-sm text-gray-500">
                  {chipCountLabels[count]}
                </div>
              </button>
            ))}
          </div>

          {/* Info box */}
          <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Good news!</p>
              <p className="mt-1">
                Chip repairs are quick (usually 30 minutes) and much more affordable
                than a full replacement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Replacement reason (optional but helpful) */}
      {canRepair === false && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            What best describes your damage? <span className="text-gray-400 font-normal">(optional)</span>
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {(Object.entries(damageReasonLabels) as [DamageReason, string][]).map(
              ([reason, label]) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleReasonSelect(reason)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    'hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    selectedReason === reason
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        selectedReason === reason
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      )}
                    >
                      {selectedReason === reason && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'font-medium',
                        selectedReason === reason ? 'text-blue-700' : 'text-gray-700'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Error display */}
      {getFieldError(errors, 'serviceIntent') && (
        <p className="text-sm text-red-600">{getFieldError(errors, 'serviceIntent')}</p>
      )}

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={!canProceed}
          className="min-w-[160px]"
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
