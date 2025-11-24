import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import { Loader2, MapPin, Store } from 'lucide-react';
import type { ServiceType } from '@/types/api';

export function LocationStep() {
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();
  const [postalCode, setPostalCode] = useState(formData.postalCode || '');
  const [streetAddress, setStreetAddress] = useState(formData.streetAddress || '');
  const [city, setCity] = useState(formData.city || '');
  const [state, setState] = useState(formData.state || '');
  const [serviceType, setServiceType] = useState<ServiceType | null>(
    formData.serviceType || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    // Validate address fields for mobile service
    if (serviceType === 'mobile') {
      if (!streetAddress || !city || !state) {
        setError('Please enter your complete address for mobile service');
        return;
      }
    }

    setLoading(true);
    // Simulate API call to check service availability
    setTimeout(() => {
      setLoading(false);
      updateFormData({
        postalCode,
        ...(serviceType === 'mobile' && streetAddress && { streetAddress }),
        ...(serviceType === 'mobile' && city && { city }),
        ...(serviceType === 'mobile' && state && { state }),
        serviceType
      });
      setCurrentStep(3);
    }, 1000);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Where do you need service?</h2>
      <p className="text-gray-600 mb-8">
        Enter your ZIP or postal code and select how you'd like to receive service.
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
              disabled={loading || postalCode.length < 5 || !serviceType}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
