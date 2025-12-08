import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuoteWizardStore } from '../store/useQuoteWizardStore';
import {
  glassSelectionSchema,
  type GlassSelectionData,
  type GlassType,
} from '../schemas/glassSelection.schema';
import { GlassSelectionCard } from '../components/GlassSelectionCard';
import { WindshieldIcon, BackGlassIcon, SideWindowIcon, SunroofIcon } from '../assets';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Main glass categories (simplified view like Safelite)
type GlassCategory = 'windshield' | 'back_glass' | 'side_window' | 'sunroof';

// Side window options
const sideWindowOptions: { value: GlassType; label: string }[] = [
  { value: 'driver_front', label: 'Driver Side - Front' },
  { value: 'driver_rear', label: 'Driver Side - Rear' },
  { value: 'passenger_front', label: 'Passenger Side - Front' },
  { value: 'passenger_rear', label: 'Passenger Side - Rear' },
];

export function GlassSelectionStep() {
  const { glassSelection, setGlassSelection, goToNextStep } = useQuoteWizardStore();

  // Track selected category and specific glass type
  const [selectedCategory, setSelectedCategory] = useState<GlassCategory | null>(() => {
    if (!glassSelection) return null;
    if (glassSelection.glassType === 'windshield') return 'windshield';
    if (glassSelection.glassType === 'back_glass') return 'back_glass';
    if (glassSelection.glassType === 'sunroof') return 'sunroof';
    return 'side_window';
  });

  const [selectedSideWindow, setSelectedSideWindow] = useState<GlassType | null>(() => {
    if (!glassSelection) return null;
    const sideTypes: GlassType[] = ['driver_front', 'driver_rear', 'passenger_front', 'passenger_rear'];
    return sideTypes.includes(glassSelection.glassType) ? glassSelection.glassType : null;
  });

  const { handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(glassSelectionSchema),
    defaultValues: glassSelection ?? {},
  });

  const handleCategorySelect = (category: GlassCategory) => {
    setSelectedCategory(category);

    // For non-side-window categories, set the glass type directly
    if (category === 'windshield') {
      setValue('glassType', 'windshield');
      setSelectedSideWindow(null);
    } else if (category === 'back_glass') {
      setValue('glassType', 'back_glass');
      setSelectedSideWindow(null);
    } else if (category === 'sunroof') {
      setValue('glassType', 'sunroof');
      setSelectedSideWindow(null);
    } else {
      // Side window - need to select specific type
      setSelectedSideWindow(null);
    }
  };

  const handleSideWindowSelect = (glassType: GlassType) => {
    setSelectedSideWindow(glassType);
    setValue('glassType', glassType);
  };

  const onSubmit = (data: Record<string, unknown>) => {
    setGlassSelection(data as GlassSelectionData);
    goToNextStep();
  };

  // Check if we can proceed
  const canProceed =
    selectedCategory &&
    (selectedCategory !== 'side_window' || selectedSideWindow);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Main glass selection grid */}
      <div className="grid grid-cols-2 gap-4">
        <GlassSelectionCard
          title="Windshield"
          description="Front glass repair or replacement"
          icon={<WindshieldIcon highlighted={selectedCategory === 'windshield'} className="w-full h-full" />}
          isSelected={selectedCategory === 'windshield'}
          onClick={() => handleCategorySelect('windshield')}
        />
        <GlassSelectionCard
          title="Back Glass"
          description="Rear window replacement"
          icon={<BackGlassIcon highlighted={selectedCategory === 'back_glass'} className="w-full h-full" />}
          isSelected={selectedCategory === 'back_glass'}
          onClick={() => handleCategorySelect('back_glass')}
        />
        <GlassSelectionCard
          title="Side Window"
          description="Door window replacement"
          icon={<SideWindowIcon highlighted={selectedCategory === 'side_window'} className="w-full h-full" />}
          isSelected={selectedCategory === 'side_window'}
          onClick={() => handleCategorySelect('side_window')}
        />
        <GlassSelectionCard
          title="Sunroof"
          description="Roof glass replacement"
          icon={<SunroofIcon highlighted={selectedCategory === 'sunroof'} className="w-full h-full" />}
          isSelected={selectedCategory === 'sunroof'}
          onClick={() => handleCategorySelect('sunroof')}
        />
      </div>

      {/* Side window sub-selection */}
      {selectedCategory === 'side_window' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Which side window needs replacement?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {sideWindowOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSideWindowSelect(option.value)}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  selectedSideWindow === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      selectedSideWindow === option.value
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'
                    )}
                  >
                    {selectedSideWindow === option.value && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      selectedSideWindow === option.value
                        ? 'text-primary'
                        : 'text-gray-700'
                    )}
                  >
                    {option.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {errors.glassType && (
        <p className="text-sm text-red-600">{errors.glassType.message}</p>
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
