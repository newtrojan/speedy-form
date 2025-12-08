import type { ReactNode } from 'react';
import { useQuoteWizardStore } from '../store/useQuoteWizardStore';
import { StepIndicator } from './StepIndicator';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RotateCcw } from 'lucide-react';

interface WizardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showProgress?: boolean;
  onBack?: () => void;
}

export function WizardLayout({
  children,
  title,
  subtitle,
  showBackButton = true,
  showProgress = true,
  onBack,
}: WizardLayoutProps) {
  const { currentStep, goToPrevStep, getActiveSteps, resetWizard } = useQuoteWizardStore();
  const activeSteps = getActiveSteps();
  const currentIndex = activeSteps.indexOf(currentStep);
  const isFirstStep = currentIndex === 0;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goToPrevStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Back button */}
            {showBackButton && !isFirstStep ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <div className="w-20" /> // Spacer
            )}

            {/* Logo / Brand */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-primary">SpeedyGlass</h1>
            </div>

            {/* Step indicator + Start Over */}
            <div className="flex items-center gap-3">
              {showProgress && (
                <div className="text-sm text-gray-500">
                  Step {currentIndex + 1} of {activeSteps.length}
                </div>
              )}
              {!isFirstStep && (
                <button
                  onClick={resetWizard}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
                  title="Start a new quote"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Start Over</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {showProgress && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <StepIndicator
              activeSteps={activeSteps}
              currentStep={currentStep}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Title and subtitle */}
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && (
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500">
        <p>Questions? Call us at <a href="tel:1-800-555-1234" className="text-primary hover:underline">1-800-555-1234</a></p>
      </footer>
    </div>
  );
}
