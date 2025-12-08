import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useQuoteWizardStore, STEP_NAMES, type WizardStep } from '../store/useQuoteWizardStore';

interface StepIndicatorProps {
  activeSteps: WizardStep[];
  currentStep: WizardStep;
  variant?: 'default' | 'compact';
}

export function StepIndicator({
  activeSteps,
  currentStep,
  variant = 'default',
}: StepIndicatorProps) {
  const { isStepComplete } = useQuoteWizardStore();
  const currentIndex = activeSteps.indexOf(currentStep);

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        {activeSteps.map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = isStepComplete(step) && !isActive;
          const isPast = index < currentIndex;

          return (
            <div
              key={step}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                isActive && 'w-6 bg-primary',
                isCompleted && 'bg-green-500',
                !isActive && !isCompleted && isPast && 'bg-primary/40',
                !isActive && !isCompleted && !isPast && 'bg-gray-300'
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2" />

        {/* Progress line */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-300"
          style={{
            width: `${(currentIndex / (activeSteps.length - 1)) * 100}%`,
          }}
        />

        {/* Step circles */}
        <div className="relative flex justify-between">
          {activeSteps.map((step, index) => {
            const isActive = step === currentStep;
            const isCompleted = isStepComplete(step) && !isActive;
            const isPast = index < currentIndex;

            return (
              <div key={step} className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 border-2',
                    isActive && 'bg-primary border-primary text-white',
                    isCompleted && 'bg-green-500 border-green-500 text-white',
                    !isActive && !isCompleted && isPast && 'bg-primary/10 border-primary/40 text-primary',
                    !isActive && !isCompleted && !isPast && 'bg-white border-gray-300 text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label (hidden on mobile) */}
                <span
                  className={cn(
                    'hidden md:block mt-2 text-xs font-medium text-center max-w-[80px]',
                    isActive && 'text-primary',
                    isCompleted && 'text-green-600',
                    !isActive && !isCompleted && 'text-gray-400'
                  )}
                >
                  {STEP_NAMES[step]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Simple dot-style indicator for mobile
export function StepDots({
  activeSteps,
  currentStep,
}: {
  activeSteps: WizardStep[];
  currentStep: WizardStep;
}) {
  const currentIndex = activeSteps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center space-x-2">
      {activeSteps.map((step, index) => {
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <div
            key={step}
            className={cn(
              'rounded-full transition-all duration-200',
              isActive ? 'w-8 h-2 bg-primary' : 'w-2 h-2',
              !isActive && isPast && 'bg-primary/60',
              !isActive && !isPast && 'bg-gray-300'
            )}
          />
        );
      })}
    </div>
  );
}
