import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuoteWizardStore } from '../store/useQuoteWizardStore';
import {
  contactInfoSchema,
  type ContactInfoData,
} from '../schemas/contactInfo.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Lock, Mail, Phone, User } from 'lucide-react';

export function ContactInfoStep() {
  const { contactInfo, setContactInfo, goToNextStep } = useQuoteWizardStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      firstName: contactInfo?.firstName ?? '',
      lastName: contactInfo?.lastName ?? '',
      email: contactInfo?.email ?? '',
      phone: contactInfo?.phone ?? '',
      smsConsent: contactInfo?.smsConsent ?? false,
    },
    mode: 'onChange',
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() is intentionally used despite compiler warning
  const smsConsent = watch('smsConsent');

  const onSubmit = (data: Record<string, unknown>) => {
    setContactInfo(data as ContactInfoData);
    goToNextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Trust message */}
      <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span>Your information is secure and will never be shared.</span>
      </div>

      {/* Name fields - side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-gray-700">
            <User className="w-4 h-4 text-gray-400" />
            First Name
          </Label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="John"
            aria-invalid={!!errors.firstName}
            className={cn(
              errors.firstName && 'border-red-500 focus-visible:ring-red-500/50'
            )}
          />
          {errors.firstName && (
            <p className="text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-gray-700">
            <User className="w-4 h-4 text-gray-400" />
            Last Name
          </Label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder="Smith"
            aria-invalid={!!errors.lastName}
            className={cn(
              errors.lastName && 'border-red-500 focus-visible:ring-red-500/50'
            )}
          />
          {errors.lastName && (
            <p className="text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-700">
          <Mail className="w-4 h-4 text-gray-400" />
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="john@example.com"
          aria-invalid={!!errors.email}
          className={cn(
            errors.email && 'border-red-500 focus-visible:ring-red-500/50'
          )}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
        <p className="text-xs text-gray-500">
          We&apos;ll send your quote details to this email
        </p>
      </div>

      {/* Phone field */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-gray-700">
          <Phone className="w-4 h-4 text-gray-400" />
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          placeholder="(555) 123-4567"
          aria-invalid={!!errors.phone}
          className={cn(
            errors.phone && 'border-red-500 focus-visible:ring-red-500/50'
          )}
        />
        {errors.phone && (
          <p className="text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* SMS consent checkbox */}
      <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          id="smsConsent"
          checked={smsConsent === true}
          onCheckedChange={(checked) => setValue('smsConsent', checked === true)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label
            htmlFor="smsConsent"
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Send me text updates about my quote
          </Label>
          <p className="text-xs text-gray-500">
            Get appointment reminders and status updates via SMS. Message and data
            rates may apply. Reply STOP to unsubscribe.
          </p>
        </div>
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          className="min-w-[160px]"
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
