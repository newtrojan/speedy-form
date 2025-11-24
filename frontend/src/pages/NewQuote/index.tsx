import { QuoteFormProvider, useQuoteForm } from '@/context/QuoteFormContext';
import { VehicleStep } from './VehicleStep';
import { LocationStep } from './LocationStep';
import { GlassTypeStep } from './GlassTypeStep';
import { ContactStep } from './ContactStep';
import { Link } from 'react-router-dom';

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
          completed
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-[#DC2626] text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <span
        className={`text-sm hidden sm:block ${
          active ? 'text-gray-900 font-medium' : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function NewQuoteContent() {
  const { currentStep } = useQuoteForm();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img
              src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
              alt="Speedy Glass Logo"
              className="h-10 md:h-12"
            />
          </Link>
          <a
            href="tel:1-800-87-GLASS"
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            1-800-87-GLASS
          </a>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4">
            <StepIndicator
              number={1}
              label="Vehicle"
              active={currentStep === 1}
              completed={currentStep > 1}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              number={2}
              label="Location"
              active={currentStep === 2}
              completed={currentStep > 2}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              number={3}
              label="Glass Type"
              active={currentStep === 3}
              completed={currentStep > 3}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              number={4}
              label="Contact"
              active={currentStep === 4}
              completed={currentStep > 4}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Step Content */}
          {currentStep === 1 && <VehicleStep />}
          {currentStep === 2 && <LocationStep />}
          {currentStep === 3 && <GlassTypeStep />}
          {currentStep === 4 && <ContactStep />}
        </div>
      </main>
    </div>
  );
}

export function NewQuotePage() {
  return (
    <QuoteFormProvider>
      <NewQuoteContent />
    </QuoteFormProvider>
  );
}
