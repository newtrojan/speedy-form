import { useState } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useQuoteWizardStore } from '../store/useQuoteWizardStore';
import {
  vinIdentificationSchema,
  plateIdentificationSchema,
  manualIdentificationSchema,
  type VehicleIdentificationData,
  type VinIdentificationData,
  type PlateIdentificationData,
  type ManualIdentificationData,
  type IdentificationMethod,
  type StateCode,
  stateLabels,
  getYearOptions,
  cleanVin,
} from '../schemas/vehicleIdentification.schema';
import { identifyVehicle } from '@/api/quotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AlertCircle, Car, CreditCard, FileText, Loader2 } from 'lucide-react';

// Form field union type - all possible fields across all identification methods
interface VehicleFormFields {
  method: IdentificationMethod;
  vin?: string;
  licensePlate?: string;
  plateState?: StateCode;
  year?: number;
  make?: string;
  model?: string;
}

// Helper to safely get error message
function getFieldError(
  errors: FieldErrors<VehicleFormFields>,
  field: keyof VehicleFormFields
): string | undefined {
  const error = errors[field];
  if (error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
}

// Helper to check if field has error
function hasFieldError(
  errors: FieldErrors<VehicleFormFields>,
  field: keyof VehicleFormFields
): boolean {
  return !!errors[field];
}

// Vehicle makes for manual selection
const POPULAR_MAKES = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge',
  'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia', 'Lexus',
  'Lincoln', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Ram', 'Subaru', 'Tesla',
  'Toyota', 'Volkswagen', 'Volvo',
];

export function VehicleIdentificationStep() {
  const {
    flowType,
    vehicleIdentification,
    vehicleLookupResult,
    setVehicleIdentification,
    setVehicleLookupResult,
    goToNextStep,
  } = useQuoteWizardStore();

  const isRepairFlow = flowType === 'repair';

  // Current tab
  const [activeTab, setActiveTab] = useState<IdentificationMethod>(() => {
    if (vehicleIdentification?.method) return vehicleIdentification.method;
    return isRepairFlow ? 'manual' : 'plate';
  });

  // Error state
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Vehicle confirmation state - shows confirmation UI after successful lookup
  const [isConfirmingVehicle, setIsConfirmingVehicle] = useState(false);

  // Vehicle lookup mutation
  const lookupMutation = useMutation({
    mutationFn: identifyVehicle,
    onSuccess: (result) => {
      setVehicleLookupResult(result);
      setSubmitError(null);
    },
    onError: (error: Error) => {
      setSubmitError(error.message || 'Failed to lookup vehicle. Please try again.');
    },
  });

  // Get the appropriate schema based on active tab
  const getSchema = () => {
    switch (activeTab) {
      case 'vin':
        return vinIdentificationSchema;
      case 'plate':
        return plateIdentificationSchema;
      case 'manual':
        return manualIdentificationSchema;
      default:
        return manualIdentificationSchema;
    }
  };

  // Build default values conditionally to avoid undefined assignments
  const buildDefaultValues = (): Partial<VehicleFormFields> => {
    const defaults: Partial<VehicleFormFields> = {
      method: vehicleIdentification?.method ?? activeTab,
    };
    if (vehicleIdentification?.method === 'vin') {
      defaults.vin = vehicleIdentification.vin;
    } else if (vehicleIdentification?.method === 'plate') {
      defaults.licensePlate = vehicleIdentification.licensePlate;
      defaults.plateState = vehicleIdentification.plateState;
    } else if (vehicleIdentification?.method === 'manual') {
      defaults.year = vehicleIdentification.year;
      defaults.make = vehicleIdentification.make;
      defaults.model = vehicleIdentification.model;
    }
    return defaults;
  };

  // Note: We use type assertion for resolver because schema changes dynamically
  // based on active tab. Runtime validation is still enforced by Zod.
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VehicleFormFields>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(getSchema()) as any,
    defaultValues: buildDefaultValues(),
  });

  const handleTabChange = (value: string) => {
    const method = value as IdentificationMethod;
    setActiveTab(method);
    setValue('method', method);
    setSubmitError(null);
    // Reset form when switching tabs
    reset({ method });
  };

  const onSubmit = async (formData: VehicleFormFields) => {
    setSubmitError(null);

    // Convert form fields to discriminated union based on method
    let data: VehicleIdentificationData;

    if (formData.method === 'manual') {
      // For repair flow (manual only) or manual method, skip API lookup
      data = {
        method: 'manual',
        year: formData.year ?? 0,
        make: formData.make ?? '',
        model: formData.model ?? '',
      } satisfies ManualIdentificationData;
      setVehicleIdentification(data);
      goToNextStep();
      return;
    }

    // For VIN or plate, do API lookup
    try {
      let lookupParams: { vin?: string; license_plate?: string; state?: string } = {};

      if (formData.method === 'vin') {
        const vinData: VinIdentificationData = {
          method: 'vin',
          vin: cleanVin(formData.vin ?? ''),
        };
        data = vinData;
        lookupParams = { vin: vinData.vin };
      } else {
        const plateData: PlateIdentificationData = {
          method: 'plate',
          licensePlate: (formData.licensePlate ?? '').toUpperCase(),
          plateState: formData.plateState ?? 'CA',
        };
        data = plateData;
        lookupParams = {
          license_plate: plateData.licensePlate,
          state: plateData.plateState,
        };
      }

      await lookupMutation.mutateAsync(lookupParams);
      setVehicleIdentification(data);
      // Show confirmation UI instead of immediately proceeding
      setIsConfirmingVehicle(true);
    } catch {
      // Error handled in mutation onError
    }
  };

  // Handle vehicle confirmation - user clicks "Yes, that's my vehicle"
  const handleConfirmVehicle = () => {
    goToNextStep();
  };

  // Handle vehicle rejection - user clicks "No, try again"
  const handleRejectVehicle = () => {
    setIsConfirmingVehicle(false);
    setVehicleLookupResult(null);
    reset({ method: activeTab });
  };

  const yearOptions = getYearOptions();

  // For repair flow, only show manual Year/Make/Model
  if (isRepairFlow) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-start space-x-3 p-4 bg-primary/10 rounded-lg">
          <Car className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Chip repair pricing is the same for all vehicles!</p>
            <p className="mt-1">
              We just need your vehicle info to ensure we have the right materials for your windshield.
            </p>
          </div>
        </div>

        <ManualVehicleFields
          control={control}
          register={register}
          errors={errors}
          yearOptions={yearOptions}
        />

        {submitError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="min-w-[160px]">
            Continue
          </Button>
        </div>
      </form>
    );
  }

  // Vehicle confirmation UI - shown after successful lookup
  if (isConfirmingVehicle && vehicleLookupResult) {
    return (
      <div className="space-y-6">
        {/* Success header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Vehicle Found!
          </h3>
          <p className="text-gray-600">
            Is this your vehicle?
          </p>
        </div>

        {/* Vehicle details card */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {vehicleLookupResult.year} {vehicleLookupResult.make} {vehicleLookupResult.model}
            </p>
            {vehicleLookupResult.trim && (
              <p className="text-lg text-gray-600 mb-3">
                {vehicleLookupResult.trim}
              </p>
            )}
            {vehicleLookupResult.vin && (
              <p className="text-sm text-gray-500 font-mono">
                VIN: {vehicleLookupResult.vin}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={handleConfirmVehicle}
          >
            Yes, that&apos;s my vehicle
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleRejectVehicle}
          >
            No, let me try again
          </Button>
        </div>
      </div>
    );
  }

  // Replacement flow with tabs
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="plate" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">License Plate</span>
            <span className="sm:hidden">Plate</span>
          </TabsTrigger>
          <TabsTrigger value="vin" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>VIN</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Year/Make/Model</span>
            <span className="sm:hidden">Manual</span>
          </TabsTrigger>
        </TabsList>

        {/* License Plate Tab */}
        <TabsContent value="plate" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                {...register('licensePlate')}
                placeholder="ABC1234"
                className={cn(
                  'uppercase',
                  hasFieldError(errors, 'licensePlate') && 'border-red-500'
                )}
              />
              {getFieldError(errors, 'licensePlate') && (
                <p className="text-sm text-red-600">
                  {getFieldError(errors, 'licensePlate')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plateState">State</Label>
              <Controller
                name="plateState"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className={cn(hasFieldError(errors, 'plateState') && 'border-red-500')}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(stateLabels) as [StateCode, string][]).map(
                        ([code, name]) => (
                          <SelectItem key={code} value={code}>
                            {code} - {name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {getFieldError(errors, 'plateState') && (
                <p className="text-sm text-red-600">
                  {getFieldError(errors, 'plateState')}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Enter your license plate to automatically find your vehicle details.
          </p>
        </TabsContent>

        {/* VIN Tab */}
        <TabsContent value="vin" className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="vin">Vehicle Identification Number (VIN)</Label>
            <Input
              id="vin"
              {...register('vin')}
              placeholder="1HGCM82633A123456"
              maxLength={17}
              className={cn(
                'uppercase font-mono tracking-wider',
                hasFieldError(errors, 'vin') && 'border-red-500'
              )}
            />
            {getFieldError(errors, 'vin') && (
              <p className="text-sm text-red-600">
                {getFieldError(errors, 'vin')}
              </p>
            )}
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Your VIN is a 17-character code found:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>On the dashboard (visible through windshield)</li>
              <li>Inside the driver&apos;s door frame</li>
              <li>On your vehicle registration or insurance card</li>
            </ul>
          </div>
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual" className="space-y-4 mt-6">
          <ManualVehicleFields
            control={control}
            register={register}
            errors={errors}
            yearOptions={yearOptions}
          />

          <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Manual entry requires review</p>
              <p className="mt-1">
                Our team will verify your vehicle details and contact you to confirm
                the correct glass part.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error display */}
      {submitError && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={lookupMutation.isPending}
          className="min-w-[160px]"
        >
          {lookupMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Looking up...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </form>
  );
}

// Props type for ManualVehicleFields
interface ManualVehicleFieldsProps {
  control: ReturnType<typeof useForm<VehicleFormFields>>['control'];
  register: ReturnType<typeof useForm<VehicleFormFields>>['register'];
  errors: FieldErrors<VehicleFormFields>;
  yearOptions: number[];
}

// Manual vehicle entry fields (reused in repair flow and manual tab)
function ManualVehicleFields({
  control,
  register,
  errors,
  yearOptions,
}: ManualVehicleFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Year */}
      <div className="space-y-2">
        <Label htmlFor="year">Year</Label>
        <Controller
          name="year"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value?.toString() ?? ''}
              onValueChange={(v) => field.onChange(parseInt(v, 10))}
            >
              <SelectTrigger className={cn(hasFieldError(errors, 'year') && 'border-red-500')}>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {getFieldError(errors, 'year') && (
          <p className="text-sm text-red-600">
            {getFieldError(errors, 'year')}
          </p>
        )}
      </div>

      {/* Make */}
      <div className="space-y-2">
        <Label htmlFor="make">Make</Label>
        <Controller
          name="make"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className={cn(hasFieldError(errors, 'make') && 'border-red-500')}>
                <SelectValue placeholder="Select make" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_MAKES.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {getFieldError(errors, 'make') && (
          <p className="text-sm text-red-600">
            {getFieldError(errors, 'make')}
          </p>
        )}
      </div>

      {/* Model */}
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          {...register('model')}
          placeholder="e.g., Camry, Civic, F-150"
          className={cn(hasFieldError(errors, 'model') && 'border-red-500')}
        />
        {getFieldError(errors, 'model') && (
          <p className="text-sm text-red-600">
            {getFieldError(errors, 'model')}
          </p>
        )}
      </div>
    </div>
  );
}
