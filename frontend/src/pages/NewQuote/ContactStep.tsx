import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import { useGenerateQuote } from '@/hooks/useQuotes';
import { Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ContactStep() {
  const navigate = useNavigate();
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();
  const [firstName, setFirstName] = useState(formData.firstName || '');
  const [lastName, setLastName] = useState(formData.lastName || '');
  const [email, setEmail] = useState(formData.email || '');
  const [phone, setPhone] = useState(formData.phone || '');
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState('');

  const generateQuote = useGenerateQuote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      setError('Please fill in all required fields');
      return;
    }

    // Ensure we have all required data based on service intent
    const serviceIntent = formData.serviceIntent || 'replacement';
    const isChipRepair = serviceIntent === 'chip_repair';

    if (!formData.serviceType || !formData.postalCode || !formData.selectedShopId) {
      setError('Missing required location/shop information. Please go back and complete all steps.');
      return;
    }

    if (isChipRepair) {
      if (!formData.chipCount) {
        setError('Missing chip count. Please go back and select the number of chips.');
        return;
      }
    } else {
      if (!formData.glassType || !formData.damageType || !formData.damageQuantity) {
        setError('Missing glass/damage information. Please go back and complete all steps.');
        return;
      }
      // For replacement/other, we need vehicle info
      if (!formData.vin && !formData.licensePlate) {
        setError('Missing vehicle information. Please go back and enter your VIN or license plate.');
        return;
      }
    }

    try {
      const result = await generateQuote.mutateAsync({
        service_intent: serviceIntent,
        // Vehicle identification (one of these should be present for non-chip-repair)
        ...(formData.vin && { vin: formData.vin }),
        ...(formData.licensePlate && { license_plate: formData.licensePlate }),
        ...(formData.plateState && { plate_state: formData.plateState }),
        // Glass info
        ...(formData.glassType && { glass_type: formData.glassType }),
        // Part selection (from vehicle lookup - avoids re-fetching from AUTOBOLT)
        ...(formData.selectedPart && { nags_part_number: formData.selectedPart.nags_part_number }),
        // Service info
        service_type: formData.serviceType,
        shop_id: formData.selectedShopId,
        ...(formData.distanceMiles && { distance_miles: formData.distanceMiles }),
        // Chip repair specific
        ...(formData.chipCount && { chip_count: formData.chipCount }),
        // Damage info (for replacement)
        ...(formData.damageType && { damage_type: formData.damageType }),
        // Location
        location: {
          postal_code: formData.postalCode,
          ...(formData.streetAddress && { street_address: formData.streetAddress }),
          ...(formData.city && { city: formData.city }),
          ...(formData.state && { state: formData.state }),
        },
        // Customer info
        customer: {
          email,
          phone,
          first_name: firstName,
          last_name: lastName,
        },
      });

      // Update form data with task ID
      updateFormData({
        firstName,
        lastName,
        email,
        phone,
        taskId: result.task_id,
      });

      // Navigate to quote status page
      navigate(`/quote/status/${result.task_id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(
        axiosError.response?.data?.message ||
        axiosError.response?.data?.detail ||
        'Failed to generate quote. Please try again.'
      );
    }
  };

  const handleBack = () => {
    setCurrentStep(4);
  };

  return (
    <Card className="p-8">
      {/* Encouraging Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Sparkles className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Almost there!</h2>
        <p className="text-gray-600">
          Tell us where to send your quote. Your personalized quote is just one click away.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contact Information - Compact Layout */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name *
            </Label>
            <Input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setError('');
              }}
              className="mt-1.5 h-11"
              placeholder="John"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm font-medium">
              Last Name *
            </Label>
            <Input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setError('');
              }}
              className="mt-1.5 h-11"
              placeholder="Smith"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className="mt-1.5 h-11"
            placeholder="john.smith@email.com"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            Mobile Phone *
          </Label>
          <Input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError('');
            }}
            className="mt-1.5 h-11"
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            id="smsConsent"
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
          />
          <Label
            htmlFor="smsConsent"
            className="text-sm text-gray-600 font-normal cursor-pointer leading-tight"
          >
            Send me text updates about my quote and appointment
          </Label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-[#DC2626] text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-14 text-lg bg-transparent"
            onClick={handleBack}
            disabled={generateQuote.isPending}
          >
            Back
          </Button>
          <Button
            type="submit"
            className="flex-1 h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
            disabled={generateQuote.isPending || !firstName || !lastName || !email || !phone}
          >
            {generateQuote.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Quote...
              </>
            ) : (
              'Get My Quote'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
