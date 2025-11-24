import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useQuoteForm } from '@/context/QuoteFormContext';
import { useGenerateQuote } from '@/hooks/useQuotes';
import { Loader2, CreditCard, Building2 } from 'lucide-react';
import type { PaymentType } from '@/types/api';
import { useNavigate } from 'react-router-dom';

export function ContactStep() {
  const navigate = useNavigate();
  const { formData, updateFormData, setCurrentStep } = useQuoteForm();
  const [firstName, setFirstName] = useState(formData.firstName || '');
  const [lastName, setLastName] = useState(formData.lastName || '');
  const [email, setEmail] = useState(formData.email || '');
  const [phone, setPhone] = useState(formData.phone || '');
  const [paymentType, setPaymentType] = useState<PaymentType | null>(
    formData.paymentType || null
  );
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

    if (!paymentType) {
      setError('Please select a payment type');
      return;
    }

    // Ensure we have all required data
    if (!formData.vin || !formData.glassType || !formData.serviceType || !formData.postalCode || !formData.damageType || !formData.damageQuantity) {
      setError('Missing required information. Please start over.');
      return;
    }

    try {
      const result = await generateQuote.mutateAsync({
        vin: formData.vin,
        glass_type: formData.glassType,
        service_type: formData.serviceType,
        payment_type: paymentType,
        ...(formData.damageType && { damage_type: formData.damageType }),
        ...(formData.damageQuantity && { damage_quantity: formData.damageQuantity }),
        location: {
          postal_code: formData.postalCode,
          ...(formData.streetAddress && { street_address: formData.streetAddress }),
          ...(formData.city && { city: formData.city }),
          ...(formData.state && { state: formData.state }),
        },
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
        paymentType,
        taskId: result.task_id,
      });

      // Navigate to quote status page
      navigate(`/quote/status/${result.task_id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to generate quote. Please try again.'
      );
    }
  };

  const handleBack = () => {
    setCurrentStep(3);
  };

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Contact Information</h2>
      <p className="text-gray-600 mb-8">
        We'll send your quote to this email address.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Type Selection */}
        <div>
          <Label className="text-base font-medium mb-4 block">Payment Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setPaymentType('cash');
                setError('');
              }}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                paymentType === 'cash'
                  ? 'border-[#DC2626] bg-red-50'
                  : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <CreditCard className="h-8 w-8 text-[#DC2626]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Cash Payment</h3>
                  <p className="text-sm text-gray-600">
                    Pay directly with cash, credit, or debit card.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentType('insurance');
                setError('');
              }}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                paymentType === 'insurance'
                  ? 'border-[#DC2626] bg-red-50'
                  : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Building2 className="h-8 w-8 text-[#DC2626]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Insurance Claim
                  </h3>
                  <p className="text-sm text-gray-600">
                    We'll work directly with your insurance provider.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-base font-medium">
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
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-base font-medium">
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
              className="mt-2 h-12"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-base font-medium">
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
            className="mt-2 h-12"
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-base font-medium">
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
            className="mt-2 h-12"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="smsConsent"
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <Label
            htmlFor="smsConsent"
            className="text-sm text-gray-600 font-normal cursor-pointer"
          >
            I agree to receive SMS notifications about my quote and appointment updates
          </Label>
        </div>

        {error && <p className="text-[#DC2626] text-sm">{error}</p>}

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
            disabled={generateQuote.isPending}
          >
            {generateQuote.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quote...
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
