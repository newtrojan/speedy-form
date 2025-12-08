import { useState, useEffect } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useQuoteWizardStore } from '../store/useQuoteWizardStore';
import {
  serviceLocationSchema,
  type ServiceLocationData,
  type ServiceType,
  type MobileServiceData,
  type InStoreServiceData,
  serviceTypeLabels,
  serviceTypeDescriptions,
} from '../schemas/serviceLocation.schema';
import { stateLabels, type StateCode } from '../schemas/vehicleIdentification.schema';
import { getShopsNearby } from '@/api/quotes';
import type { ShopNearby } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Building2,
  Check,
  Loader2,
  MapPin,
  Phone,
  Truck,
} from 'lucide-react';

// Form field union type - all possible fields across both service types
interface ServiceFormFields {
  serviceType: ServiceType;
  postalCode: string;
  selectedShopId: number;
  streetAddress?: string;
  city?: string;
  state?: StateCode;
  distanceMiles?: number;
}

// Helper to safely get error message
function getFieldError(
  errors: FieldErrors<ServiceFormFields>,
  field: keyof ServiceFormFields
): string | undefined {
  const error = errors[field];
  if (error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
}

// Helper to check if field has error
function hasFieldError(
  errors: FieldErrors<ServiceFormFields>,
  field: keyof ServiceFormFields
): boolean {
  return !!errors[field];
}

export function ServiceLocationStep() {
  const {
    serviceLocation,
    nearbyShops,
    setServiceLocation,
    setNearbyShops,
    goToNextStep,
  } = useQuoteWizardStore();

  // Service type selection
  const [serviceType, setServiceType] = useState<ServiceType | null>(
    serviceLocation?.serviceType ?? null
  );

  // ZIP code state (used for shop lookup)
  const [zipCode, setZipCode] = useState(serviceLocation?.postalCode ?? '');
  const [zipError, setZipError] = useState<string | null>(null);

  // Selected shop
  const [selectedShop, setSelectedShop] = useState<ShopNearby | null>(() => {
    if (!serviceLocation?.selectedShopId || !nearbyShops) return null;
    const found = nearbyShops.find((s) => s.id === serviceLocation.selectedShopId);
    return found ?? null;
  });

  // Shop lookup mutation
  const shopsMutation = useMutation({
    mutationFn: getShopsNearby,
    onSuccess: (data) => {
      setNearbyShops(data.shops);
      setZipError(null);
      // Auto-select first shop if mobile
      if (serviceType === 'mobile' && data.shops.length > 0) {
        const mobileShops = data.shops.filter((s) => s.offers_mobile_service);
        const firstMobileShop = mobileShops[0];
        if (firstMobileShop !== undefined) {
          setSelectedShop(firstMobileShop);
        }
      }
    },
    onError: () => {
      setZipError('Could not find shops near this ZIP code. Please try again.');
    },
  });

  // Get schema based on service type
  const getSchema = () => {
    if (serviceType === 'mobile') {
      return serviceLocationSchema.options[1]; // mobileServiceSchema
    }
    return serviceLocationSchema.options[0]; // inStoreServiceSchema
  };

  // Build default values conditionally to avoid undefined assignments
  const buildDefaultValues = (): Partial<ServiceFormFields> => {
    const defaults: Partial<ServiceFormFields> = {
      serviceType: serviceLocation?.serviceType ?? serviceType ?? 'in_store',
      postalCode: serviceLocation?.postalCode ?? zipCode,
    };
    if (serviceLocation?.selectedShopId) {
      defaults.selectedShopId = serviceLocation.selectedShopId;
    }
    if (serviceLocation?.serviceType === 'mobile') {
      defaults.streetAddress = serviceLocation.streetAddress;
      defaults.city = serviceLocation.city;
      defaults.state = serviceLocation.state;
      if (serviceLocation.distanceMiles !== undefined) {
        defaults.distanceMiles = serviceLocation.distanceMiles;
      }
    }
    return defaults;
  };

  // Note: We use type assertion for resolver because schema changes dynamically
  // based on service type. Runtime validation is still enforced by Zod.
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ServiceFormFields>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(getSchema()) as any,
    defaultValues: buildDefaultValues(),
  });

  // Watch for form changes
  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() is intentionally used despite compiler warning
  const watchedPostalCode = watch('postalCode');

  // Update ZIP code when form changes
  useEffect(() => {
    if (watchedPostalCode && watchedPostalCode !== zipCode) {
      setZipCode(watchedPostalCode);
    }
  }, [watchedPostalCode, zipCode]);

  // Update service type in form when state changes
  useEffect(() => {
    if (serviceType) {
      setValue('serviceType', serviceType);
    }
  }, [serviceType, setValue]);

  const handleServiceTypeSelect = (type: ServiceType) => {
    setServiceType(type);
    setSelectedShop(null);
  };

  const handleZipLookup = () => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipCode)) {
      setZipError('Please enter a valid ZIP code');
      return;
    }
    setZipError(null);
    shopsMutation.mutate(zipCode);
  };

  const handleShopSelect = (shop: ShopNearby) => {
    setSelectedShop(shop);
    setValue('selectedShopId', shop.id);
    if (serviceType === 'mobile') {
      setValue('distanceMiles', shop.distance_miles);
    }
  };

  const onSubmit = (formData: ServiceFormFields) => {
    // Convert form fields to proper discriminated union type
    let data: ServiceLocationData;

    if (formData.serviceType === 'mobile') {
      data = {
        serviceType: 'mobile',
        postalCode: formData.postalCode,
        selectedShopId: formData.selectedShopId,
        streetAddress: formData.streetAddress ?? '',
        city: formData.city ?? '',
        state: formData.state ?? 'CA',
        distanceMiles: formData.distanceMiles,
      } satisfies MobileServiceData;
    } else {
      data = {
        serviceType: 'in_store',
        postalCode: formData.postalCode,
        selectedShopId: formData.selectedShopId,
      } satisfies InStoreServiceData;
    }

    setServiceLocation(data);
    goToNextStep();
  };

  // Filter shops based on service type
  const availableShops = nearbyShops?.filter((shop) => {
    if (serviceType === 'mobile') {
      return shop.offers_mobile_service;
    }
    return true; // In-store - all shops available
  }) ?? [];

  const mobileAvailable = nearbyShops?.some((s) => s.offers_mobile_service) ?? false;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Step 1: Service Type Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          How would you like to receive service?
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Mobile Service */}
          <button
            type="button"
            onClick={() => handleServiceTypeSelect('mobile')}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all',
              'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              serviceType === 'mobile'
                ? 'border-primary bg-primary/10'
                : 'border-gray-200 bg-white hover:bg-primary/5'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  serviceType === 'mobile' ? 'bg-primary' : 'bg-gray-100'
                )}
              >
                <Truck
                  className={cn(
                    'w-5 h-5',
                    serviceType === 'mobile' ? 'text-white' : 'text-gray-400'
                  )}
                />
              </div>
              {serviceType === 'mobile' && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  Selected
                </span>
              )}
            </div>
            <h4
              className={cn(
                'text-lg font-semibold mb-1',
                serviceType === 'mobile' ? 'text-primary' : 'text-gray-900'
              )}
            >
              {serviceTypeLabels.mobile}
            </h4>
            <p className="text-sm text-gray-600">{serviceTypeDescriptions.mobile}</p>
          </button>

          {/* In-Store Service */}
          <button
            type="button"
            onClick={() => handleServiceTypeSelect('in_store')}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all',
              'hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
              serviceType === 'in_store'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:bg-green-50/50'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  serviceType === 'in_store' ? 'bg-green-500' : 'bg-gray-100'
                )}
              >
                <Building2
                  className={cn(
                    'w-5 h-5',
                    serviceType === 'in_store' ? 'text-white' : 'text-gray-400'
                  )}
                />
              </div>
              {serviceType === 'in_store' && (
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                  Selected
                </span>
              )}
            </div>
            <h4
              className={cn(
                'text-lg font-semibold mb-1',
                serviceType === 'in_store' ? 'text-green-700' : 'text-gray-900'
              )}
            >
              {serviceTypeLabels.in_store}
            </h4>
            <p className="text-sm text-gray-600">{serviceTypeDescriptions.in_store}</p>
          </button>
        </div>
      </div>

      {/* Step 2: ZIP Code Entry */}
      {serviceType && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {serviceType === 'mobile' ? 'Where should we come?' : 'Find a shop near you'}
          </h3>

          <div className="flex space-x-3">
            <div className="flex-1">
              <Label htmlFor="postalCode" className="sr-only">ZIP Code</Label>
              <Input
                id="postalCode"
                placeholder="Enter ZIP code"
                value={zipCode}
                onChange={(e) => {
                  setZipCode(e.target.value);
                  setValue('postalCode', e.target.value);
                }}
                className={cn(zipError && 'border-red-500')}
              />
            </div>
            <Button
              type="button"
              onClick={handleZipLookup}
              disabled={!zipCode || shopsMutation.isPending}
              variant="outline"
            >
              {shopsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Find Shops'
              )}
            </Button>
          </div>

          {zipError && (
            <p className="text-sm text-red-600">{zipError}</p>
          )}
          {getFieldError(errors, 'postalCode') && (
            <p className="text-sm text-red-600">{getFieldError(errors, 'postalCode')}</p>
          )}
        </div>
      )}

      {/* Step 3: Mobile Service - Full Address */}
      {serviceType === 'mobile' && nearbyShops && mobileAvailable && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Service address
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input
                id="streetAddress"
                {...register('streetAddress')}
                placeholder="123 Main St"
                className={cn(hasFieldError(errors, 'streetAddress') && 'border-red-500')}
              />
              {getFieldError(errors, 'streetAddress') && (
                <p className="text-sm text-red-600">
                  {getFieldError(errors, 'streetAddress')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="City"
                  className={cn(hasFieldError(errors, 'city') && 'border-red-500')}
                />
                {getFieldError(errors, 'city') && (
                  <p className="text-sm text-red-600">
                    {getFieldError(errors, 'city')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className={cn(hasFieldError(errors, 'state') && 'border-red-500')}>
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
                {getFieldError(errors, 'state') && (
                  <p className="text-sm text-red-600">
                    {getFieldError(errors, 'state')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile not available warning */}
      {serviceType === 'mobile' && nearbyShops && !mobileAvailable && (
        <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Mobile service not available in this area</p>
            <p className="mt-1">
              Please select in-store service or try a different ZIP code.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Shop Selection */}
      {nearbyShops && availableShops.length > 0 && (serviceType === 'in_store' || mobileAvailable) && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {serviceType === 'mobile' ? 'Nearest service provider' : 'Select a shop'}
          </h3>

          <div className="space-y-3">
            {availableShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                serviceType={serviceType!}
                isSelected={selectedShop?.id === shop.id}
                onClick={() => handleShopSelect(shop)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No shops found */}
      {nearbyShops && availableShops.length === 0 && serviceType === 'in_store' && (
        <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">No shops found nearby</p>
            <p className="mt-1">
              Please try a different ZIP code or select mobile service.
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {getFieldError(errors, 'selectedShopId') && (
        <p className="text-sm text-red-600">{getFieldError(errors, 'selectedShopId')}</p>
      )}

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={!selectedShop}
          className="min-w-[160px]"
        >
          Get My Quote
        </Button>
      </div>
    </form>
  );
}

// Shop card component
function ShopCard({
  shop,
  serviceType,
  isSelected,
  onClick,
}: {
  shop: ShopNearby;
  serviceType: ServiceType;
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
          ? serviceType === 'mobile'
            ? 'border-primary bg-primary/10'
            : 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900">{shop.name}</h4>
            <span className="text-sm text-gray-500">
              {shop.distance_miles.toFixed(1)} mi
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-sm text-gray-600">
            <MapPin className="w-3 h-3" />
            <span>
              {shop.address}, {shop.city}, {shop.state} {shop.postal_code}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-sm text-gray-600">
            <Phone className="w-3 h-3" />
            <span>{shop.phone}</span>
          </div>
          {serviceType === 'mobile' && shop.mobile_fee && shop.mobile_fee > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Mobile service fee: ${shop.mobile_fee.toFixed(2)}
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-4',
            isSelected
              ? serviceType === 'mobile'
                ? 'border-primary bg-primary'
                : 'border-green-500 bg-green-500'
              : 'border-gray-300'
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
    </button>
  );
}
