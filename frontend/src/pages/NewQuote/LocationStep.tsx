import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import { useShopsNearby } from '@/hooks/useQuotes';
import { Loader2, MapPin, Store, Check, Truck } from 'lucide-react';
import type { ServiceType, ShopNearby } from '@/types/api';

export function LocationStep() {
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();
  const [postalCode, setPostalCode] = useState(formData.postalCode || '');
  const [streetAddress, setStreetAddress] = useState(formData.streetAddress || '');
  const [city, setCity] = useState(formData.city || '');
  const [state, setState] = useState(formData.state || '');
  const [serviceType, setServiceType] = useState<ServiceType | null>(
    formData.serviceType || null
  );
  const [selectedShop, setSelectedShop] = useState<ShopNearby | null>(
    formData.selectedShop || null
  );
  const [error, setError] = useState('');

  // Fetch shops when postal code is valid (5+ chars)
  const { data: shopsData, isLoading: shopsLoading, error: shopsError } = useShopsNearby(postalCode);

  // Filter shops based on service type
  const availableShops = shopsData?.shops?.filter((shop) => {
    if (serviceType === 'mobile') {
      return shop.offers_mobile_service;
    }
    return true; // All shops available for in-store
  }) || [];

  // Reset shop selection when service type changes
  useEffect(() => {
    setSelectedShop(null);
  }, [serviceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (postalCode.length < 5) {
      setError('Please enter a valid postal code');
      return;
    }

    if (!serviceType) {
      setError('Please select a service type');
      return;
    }

    if (!selectedShop) {
      setError('Please select a shop');
      return;
    }

    // Validate address fields for mobile service
    if (serviceType === 'mobile') {
      if (!streetAddress || !city || !state) {
        setError('Please enter your complete address for mobile service');
        return;
      }
    }

    updateFormData({
      postalCode,
      ...(serviceType === 'mobile' && streetAddress && { streetAddress }),
      ...(serviceType === 'mobile' && city && { city }),
      ...(serviceType === 'mobile' && state && { state }),
      serviceType,
      selectedShop,
      selectedShopId: selectedShop.id,
      distanceMiles: selectedShop.distance_miles,
    });
    setCurrentStep(3);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const formatDistance = (miles: number) => {
    if (miles < 1) {
      return `${Math.round(miles * 10) / 10} mi`;
    }
    return `${Math.round(miles)} mi`;
  };

  const formatMobileFee = (fee: number | null) => {
    if (fee === null || fee === 0) return 'Free';
    return `+$${fee.toFixed(0)}`;
  };

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Where do you need service?</h2>
      <p className="text-gray-600 mb-8">
        Enter your ZIP code and select how you'd like to receive service.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <Label htmlFor="postalCode" className="text-base font-medium">
              ZIP / Postal Code
            </Label>
            <Input
              id="postalCode"
              type="text"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value);
                setSelectedShop(null);
                setError('');
              }}
              placeholder="Enter ZIP or postal code"
              maxLength={10}
              className="mt-2 text-lg h-14"
            />
          </div>

          <div>
            <Label className="text-base font-medium mb-4 block">Service Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setServiceType('mobile');
                  setError('');
                }}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  serviceType === 'mobile'
                    ? 'border-[#DC2626] bg-red-50'
                    : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <MapPin className="h-8 w-8 text-[#DC2626]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Mobile Service
                    </h3>
                    <p className="text-sm text-gray-600">
                      We come to you at your home, work, or preferred location.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setServiceType('in_store');
                  setError('');
                }}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  serviceType === 'in_store'
                    ? 'border-[#DC2626] bg-red-50'
                    : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Store className="h-8 w-8 text-[#DC2626]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      In-Store Service
                    </h3>
                    <p className="text-sm text-gray-600">
                      Visit one of our convenient shop locations near you.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Address fields for mobile service */}
          {serviceType === 'mobile' && (
            <div className="space-y-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm font-medium text-blue-900 mb-4">
                Please provide your service address for mobile service
              </p>

              <div>
                <Label htmlFor="streetAddress" className="text-base font-medium">
                  Street Address *
                </Label>
                <Input
                  id="streetAddress"
                  type="text"
                  value={streetAddress}
                  onChange={(e) => {
                    setStreetAddress(e.target.value);
                    setError('');
                  }}
                  placeholder="123 Main Street"
                  className="mt-2 h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-base font-medium">
                    City *
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setError('');
                    }}
                    placeholder="San Francisco"
                    className="mt-2 h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="state" className="text-base font-medium">
                    State *
                  </Label>
                  <Input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder="CA"
                    maxLength={2}
                    className="mt-2 h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shop Selection */}
          {postalCode.length >= 5 && serviceType && (
            <div className="space-y-4">
              <Label className="text-base font-medium block">
                Select a Shop {serviceType === 'mobile' ? '(Mobile Service Provider)' : ''}
              </Label>

              {shopsLoading && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
                  <span className="ml-2 text-gray-600">Finding nearby shops...</span>
                </div>
              )}

              {shopsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">Failed to load nearby shops. Please try again.</p>
                </div>
              )}

              {!shopsLoading && !shopsError && availableShops.length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    {serviceType === 'mobile'
                      ? 'No mobile service available in your area. Please try in-store service.'
                      : 'No shops found in your area. Please check your postal code.'}
                  </p>
                </div>
              )}

              {!shopsLoading && availableShops.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {availableShops.map((shop) => (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => {
                        setSelectedShop(shop);
                        setError('');
                      }}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        selectedShop?.id === shop.id
                          ? 'border-[#DC2626] bg-red-50'
                          : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{shop.name}</h4>
                            {selectedShop?.id === shop.id && (
                              <Check className="h-5 w-5 text-[#DC2626]" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {shop.address}, {shop.city}, {shop.state} {shop.postal_code}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-gray-500">
                              {formatDistance(shop.distance_miles)} away
                            </span>
                            {serviceType === 'mobile' && shop.offers_mobile_service && (
                              <span className="flex items-center gap-1 text-sm text-green-700">
                                <Truck className="h-4 w-4" />
                                Mobile {formatMobileFee(shop.mobile_fee)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              disabled={shopsLoading || postalCode.length < 5 || !serviceType || !selectedShop}
            >
              Continue
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
