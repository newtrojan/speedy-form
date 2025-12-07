import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import { useIdentifyVehicle } from '@/hooks/useQuotes';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { VehicleLookupResult } from '@/types/api';

type IdentificationMethod = 'vin' | 'plate';

// US State codes for license plate lookup
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington DC' },
];

export function VehicleStep() {
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();
  const [method, setMethod] = useState<IdentificationMethod>(
    formData.identificationMethod === 'plate' ? 'plate' : 'vin'
  );
  const [vin, setVin] = useState(formData.vin || '');
  const [licensePlate, setLicensePlate] = useState(formData.licensePlate || '');
  const [plateState, setPlateState] = useState(formData.plateState || '');
  const [error, setError] = useState('');

  // Local state for lookup result (before confirmation)
  // Use VehicleLookupResult to preserve parts data for quote generation
  const [lookupResult, setLookupResult] = useState<VehicleLookupResult | null>(
    formData.vehicleLookupResult || null
  );
  const [isConfirmed, setIsConfirmed] = useState(!!formData.vehicle);

  const identifyVehicle = useIdentifyVehicle();

  // Handler to clear vehicle state when input changes
  const clearVehicleState = () => {
    setLookupResult(null);
    setIsConfirmed(false);
    identifyVehicle.reset();
  };

  // Handler for switching methods (tabs)
  const handleMethodChange = (newMethod: IdentificationMethod) => {
    setMethod(newMethod);
    clearVehicleState();
    setError('');
  };

  // Handle looking up the vehicle (not confirming yet)
  const handleLookup = async () => {
    setError('');

    if (method === 'vin') {
      const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
      if (cleanVin.length !== 17) {
        setError('Please enter a valid 17-character VIN');
        return;
      }

      try {
        // API returns full VehicleLookupResult with parts
        const result = await identifyVehicle.mutateAsync({ vin: cleanVin });
        setLookupResult(result);
        setIsConfirmed(false);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string; detail?: string } } };
        setError(
          axiosError.response?.data?.message ||
          axiosError.response?.data?.detail ||
          'Failed to identify vehicle. Please check your VIN and try again.'
        );
      }
    } else {
      if (!licensePlate.trim()) {
        setError('Please enter your license plate number');
        return;
      }
      if (!plateState) {
        setError('Please select your state');
        return;
      }

      try {
        // API returns full VehicleLookupResult with parts
        const result = await identifyVehicle.mutateAsync({
          license_plate: licensePlate.toUpperCase().trim(),
          state: plateState,
        });
        setLookupResult(result);
        setIsConfirmed(false);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string; detail?: string } } };
        setError(
          axiosError.response?.data?.message ||
          axiosError.response?.data?.detail ||
          'Failed to identify vehicle. Please check your license plate and try again.'
        );
      }
    }
  };

  // Handle confirming the vehicle and moving to next step
  const handleConfirm = () => {
    if (!lookupResult) return;

    // Auto-select part if only one is available
    const selectedPart = lookupResult.parts.length === 1
      ? lookupResult.parts[0]
      : undefined;

    // Build vehicle info from lookup result
    const vehicleInfo = {
      vin: lookupResult.vin,
      year: lookupResult.year,
      make: lookupResult.make,
      model: lookupResult.model,
      body_type: lookupResult.body_style || '',
      ...(lookupResult.trim && { trim: lookupResult.trim }),
    };

    if (method === 'vin') {
      const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
      updateFormData({
        vin: cleanVin,
        vehicle: vehicleInfo,
        vehicleLookupResult: lookupResult,
        ...(selectedPart && { selectedPart }),
        identificationMethod: 'vin',
      });
    } else {
      updateFormData({
        vin: lookupResult.vin, // Store VIN from lookup
        licensePlate: licensePlate.toUpperCase().trim(),
        plateState,
        vehicle: vehicleInfo,
        vehicleLookupResult: lookupResult,
        ...(selectedPart && { selectedPart }),
        identificationMethod: 'plate',
      });
    }
    setIsConfirmed(true);
    setCurrentStep(4);
  };

  // Handle "Not my vehicle" - clear and let them try again
  const handleNotMyVehicle = () => {
    setLookupResult(null);
    setIsConfirmed(false);
    identifyVehicle.reset();
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If vehicle is already identified, confirm and proceed
    if (lookupResult) {
      handleConfirm();
    } else {
      await handleLookup();
    }
  };

  const handleBack = () => {
    setCurrentStep(2);
  };

  const isVinValid = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').length === 17;
  const isPlateValid = licensePlate.trim().length > 0 && plateState.length > 0;

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Your Vehicle Information</h2>
      <p className="text-gray-600 mb-8">
        Enter your VIN or license plate to identify your vehicle.
      </p>

      {/* Tab Selection */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => handleMethodChange('vin')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            method === 'vin'
              ? 'text-[#DC2626] border-b-2 border-[#DC2626]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          VIN Number
        </button>
        <button
          type="button"
          onClick={() => handleMethodChange('plate')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            method === 'plate'
              ? 'text-[#DC2626] border-b-2 border-[#DC2626]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          License Plate
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {method === 'vin' ? (
            <div>
              <Label htmlFor="vin" className="text-base font-medium">
                Vehicle Identification Number (VIN)
              </Label>
              <Input
                id="vin"
                type="text"
                value={vin}
                onChange={(e) => {
                  const newVin = e.target.value.toUpperCase();
                  setVin(newVin);
                  setError('');
                  // Clear vehicle if input changed after identification
                  if (lookupResult && newVin !== vin) {
                    clearVehicleState();
                  }
                }}
                placeholder="Enter 17-character VIN"
                maxLength={17}
                className="mt-2 text-lg h-14"
                disabled={identifyVehicle.isPending}
              />
              <p className="text-sm text-gray-500 mt-2">
                Find your VIN on the dashboard or driver's side door jamb. Example: 1HGBH41JXMN109186
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="licensePlate" className="text-base font-medium">
                  License Plate Number
                </Label>
                <Input
                  id="licensePlate"
                  type="text"
                  value={licensePlate}
                  onChange={(e) => {
                    const newPlate = e.target.value.toUpperCase();
                    setLicensePlate(newPlate);
                    setError('');
                    // Clear vehicle if input changed after identification
                    if (lookupResult && newPlate !== licensePlate) {
                      clearVehicleState();
                    }
                  }}
                  placeholder="Enter license plate"
                  maxLength={10}
                  className="mt-2 text-lg h-14"
                  disabled={identifyVehicle.isPending}
                />
              </div>

              <div>
                <Label htmlFor="plateState" className="text-base font-medium">
                  State
                </Label>
                <select
                  id="plateState"
                  value={plateState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setPlateState(newState);
                    setError('');
                    // Clear vehicle if state changed after identification
                    if (lookupResult && newState !== plateState) {
                      clearVehicleState();
                    }
                  }}
                  className="mt-2 w-full h-14 px-4 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  disabled={identifyVehicle.isPending}
                >
                  <option value="">Select state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-[#DC2626] text-sm mt-2">{error}</p>}

          {/* Vehicle Identified - Ask for confirmation */}
          {lookupResult && !isConfirmed && (
            <div className="p-6 bg-red-50 border-2 border-[#DC2626] rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#DC2626]" />
                Is this your vehicle?
              </h4>
              <div className="bg-white rounded-lg p-4 mb-4 border border-red-200">
                <p className="text-xl font-bold text-gray-900">
                  {lookupResult.year} {lookupResult.make} {lookupResult.model}
                </p>
                {lookupResult.trim && (
                  <p className="text-base text-gray-700 mt-1">
                    <span className="font-medium">Trim:</span> {lookupResult.trim}
                  </p>
                )}
                {lookupResult.body_style &&
                 lookupResult.body_style.length > 2 &&
                 !['ok', 'n/a', 'unknown', 'null', 'undefined'].includes(lookupResult.body_style.toLowerCase()) && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Body:</span> {lookupResult.body_style}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Yes, this is correct
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNotMyVehicle}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  No, try again
                </Button>
              </div>
            </div>
          )}

          {/* Only show Back/Lookup buttons when no vehicle is identified yet */}
          {!lookupResult && (
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 text-lg bg-transparent"
                onClick={handleBack}
                disabled={identifyVehicle.isPending}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
                disabled={
                  identifyVehicle.isPending ||
                  (method === 'vin' ? !isVinValid : !isPlateValid)
                }
              >
                {identifyVehicle.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Looking up vehicle...
                  </>
                ) : (
                  'Look Up Vehicle'
                )}
              </Button>
            </div>
          )}

          {/* Show Back button only when vehicle is identified (Continue handled by confirmation) */}
          {lookupResult && (
            <div className="pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base bg-transparent"
                onClick={handleBack}
              >
                Back to Location
              </Button>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}
