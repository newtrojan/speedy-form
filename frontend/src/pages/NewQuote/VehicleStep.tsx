import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import { useIdentifyVehicle } from '@/hooks/useQuotes';
import { Loader2 } from 'lucide-react';

export function VehicleStep() {
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();
  const [vin, setVin] = useState(formData.vin || '');
  const [error, setError] = useState('');
  const identifyVehicle = useIdentifyVehicle();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate VIN format (17 characters)
    const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (cleanVin.length !== 17) {
      setError('Please enter a valid 17-character VIN');
      return;
    }

    try {
      const vehicle = await identifyVehicle.mutateAsync(cleanVin);
      updateFormData({ vin: cleanVin, vehicle });
      setCurrentStep(2);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to identify vehicle. Please check your VIN and try again.'
      );
    }
  };

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Your Vehicle Information</h2>
      <p className="text-gray-600 mb-8">
        Enter your VIN to get started. You can find it on your dashboard or driver's side door.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="vin" className="text-base font-medium">
              Vehicle Identification Number (VIN)
            </Label>
            <Input
              id="vin"
              type="text"
              value={vin}
              onChange={(e) => {
                setVin(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Enter 17-character VIN"
              maxLength={17}
              className="mt-2 text-lg h-14"
              disabled={identifyVehicle.isPending}
            />
            {error && <p className="text-[#DC2626] text-sm mt-2">{error}</p>}
            <p className="text-sm text-gray-500 mt-2">Example: 1HGBH41JXMN109186</p>
          </div>

          {formData.vehicle && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Vehicle Identified:</h4>
              <p className="text-green-800">
                {formData.vehicle.year} {formData.vehicle.make} {formData.vehicle.model}
              </p>
              <p className="text-sm text-green-700">{formData.vehicle.body_type}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
            disabled={identifyVehicle.isPending || vin.length !== 17}
          >
            {identifyVehicle.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Continue'
            )}
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">OR</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-14 text-lg bg-transparent"
            onClick={() => {
              /* Manual entry logic - to be implemented */
            }}
          >
            Enter Year/Make/Model Manually
          </Button>
        </div>
      </form>
    </Card>
  );
}
