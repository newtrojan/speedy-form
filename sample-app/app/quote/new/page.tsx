"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

type Step = "vehicle" | "location" | "glass-type" | "contact" | "quote"

export default function NewQuotePage() {
  const [currentStep, setCurrentStep] = useState<Step>("vehicle")
  const [vin, setVin] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [vinError, setVinError] = useState("")
  const [loading, setLoading] = useState(false)

  const validateVIN = (value: string) => {
    const cleanVIN = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "")
    if (cleanVIN.length === 17) {
      // Basic VIN validation
      return true
    }
    return false
  }

  const handleVINSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVinError("")

    if (!validateVIN(vin)) {
      setVinError("Please enter a valid 17-character VIN")
      return
    }

    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setCurrentStep("location")
    }, 1000)
  }

  const handlePostalCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate serviceability check
    setTimeout(() => {
      setLoading(false)
      setCurrentStep("glass-type")
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
              alt="Speedy Glass Logo"
              width={200}
              height={48}
              priority
            />
          </Link>
          <a href="tel:1-800-87-GLASS" className="text-gray-700 hover:text-gray-900 font-medium">
            1-800-87-GLASS
          </a>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4">
            <StepIndicator
              number={1}
              label="Vehicle"
              active={currentStep === "vehicle"}
              completed={["location", "glass-type", "contact", "quote"].includes(currentStep)}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              number={2}
              label="Location"
              active={currentStep === "location"}
              completed={["glass-type", "contact", "quote"].includes(currentStep)}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              number={3}
              label="Glass Type"
              active={currentStep === "glass-type"}
              completed={["contact", "quote"].includes(currentStep)}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              number={4}
              label="Contact"
              active={currentStep === "contact"}
              completed={currentStep === "quote"}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {currentStep === "vehicle" && (
            <Card className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Your Vehicle Information</h2>
              <p className="text-gray-600 mb-8">
                Enter your VIN to get started. You can find it on your dashboard or driver's side door.
              </p>

              <form onSubmit={handleVINSubmit}>
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
                        setVin(e.target.value.toUpperCase())
                        setVinError("")
                      }}
                      placeholder="Enter 17-character VIN"
                      maxLength={17}
                      className="mt-2 text-lg h-14"
                    />
                    {vinError && <p className="text-[#DC2626] text-sm mt-2">{vinError}</p>}
                    <p className="text-sm text-gray-500 mt-2">Example: 1HGBH41JXMN109186</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
                    disabled={loading || vin.length !== 17}
                  >
                    {loading ? "Validating..." : "Continue"}
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
                      /* Manual entry logic */
                    }}
                  >
                    Enter Year/Make/Model Manually
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {currentStep === "location" && (
            <Card className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Where do you need service?</h2>
              <p className="text-gray-600 mb-8">Enter your ZIP or postal code to check if we service your area.</p>

              <form onSubmit={handlePostalCodeSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="postalCode" className="text-base font-medium">
                      ZIP / Postal Code
                    </Label>
                    <Input
                      id="postalCode"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Enter ZIP or postal code"
                      maxLength={10}
                      className="mt-2 text-lg h-14"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-14 text-lg bg-transparent"
                      onClick={() => setCurrentStep("vehicle")}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
                      disabled={loading || postalCode.length < 5}
                    >
                      {loading ? "Checking..." : "Continue"}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {currentStep === "glass-type" && (
            <Card className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Glass Type</h2>
              <p className="text-gray-600 mb-8">Which glass needs to be replaced or repaired?</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <GlassTypeCard title="Windshield" price="$299" onClick={() => setCurrentStep("contact")} />
                <GlassTypeCard title="Door Glass" price="$199" onClick={() => setCurrentStep("contact")} />
                <GlassTypeCard title="Back Glass" price="$249" onClick={() => setCurrentStep("contact")} />
                <GlassTypeCard title="Vent Glass" price="$149" onClick={() => setCurrentStep("contact")} />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-14 text-lg bg-transparent"
                onClick={() => setCurrentStep("location")}
              >
                Back
              </Button>
            </Card>
          )}

          {currentStep === "contact" && (
            <ContactForm onBack={() => setCurrentStep("glass-type")} onComplete={() => setCurrentStep("quote")} />
          )}

          {currentStep === "quote" && <QuoteDisplay />}
        </div>
      </main>
    </div>
  )
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
          completed ? "bg-green-500 text-white" : active ? "bg-[#DC2626] text-white" : "bg-gray-200 text-gray-500"
        }`}
      >
        {completed ? "✓" : number}
      </div>
      <span className={`text-sm hidden sm:block ${active ? "text-gray-900 font-medium" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  )
}

function GlassTypeCard({ title, price, onClick }: { title: string; price: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#DC2626] hover:bg-red-50 transition-all text-left group"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-[#DC2626]">{price}</p>
      <p className="text-sm text-gray-500 mt-2">Starting at</p>
    </button>
  )
}

function ContactForm({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    smsConsent: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete()
  }

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Contact Information</h2>
      <p className="text-gray-600 mb-8">We'll send your quote to this email address.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-base font-medium">
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-base font-medium">
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="mt-2 h-12"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="smsConsent"
            checked={formData.smsConsent}
            onChange={(e) => setFormData({ ...formData, smsConsent: e.target.checked })}
            className="mt-1 h-4 w-4"
          />
          <Label htmlFor="smsConsent" className="text-sm text-gray-600 font-normal cursor-pointer">
            I agree to receive SMS notifications about my quote and appointment updates
          </Label>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" className="flex-1 h-14 text-lg bg-transparent" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" className="flex-1 h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]">
            Get My Quote
          </Button>
        </div>
      </form>
    </Card>
  )
}

function QuoteDisplay() {
  return (
    <Card className="p-0 overflow-hidden">
      {/* Quote Header */}
      <div className="bg-white border-b border-gray-200 p-6 flex items-start justify-between">
        <div>
          <Image
            src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
            alt="Speedy Glass Logo"
            width={180}
            height={40}
          />
          <p className="text-sm text-gray-600 mt-2">Speedy Glass 5004 - Broadway</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 mb-1">Quote</p>
          <p className="text-2xl font-bold text-gray-900">Q-5004-6212480</p>
          <p className="text-sm text-gray-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Estimation Disclaimer Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-6 mt-6 rounded">
        <p className="text-sm text-blue-900 font-medium">
          📋 This is an estimated quote. Final pricing may vary based on inspection and actual service requirements.
        </p>
      </div>

      {/* Customer & Vehicle Info */}
      <div className="bg-gray-50 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-200">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
          <p className="font-semibold text-gray-900">John Doe</p>
          <p className="text-sm text-gray-600">john.doe@email.com</p>
          <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Vehicle</h3>
          <p className="font-semibold text-gray-900">2012 SUBARU / Outback / 4 Door Station Wagon</p>
          <p className="text-sm text-gray-600">VIN: 4S4BRBCC7C3291000</p>
        </div>
      </div>

      {/* Service Summary */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Service Details</h3>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="font-medium text-gray-900">Windshield Replacement</p>
          <p className="text-sm text-gray-600 mt-1">
            Green Tint/Blue Shade Windshield (3rd Visor Frit, Heated Wiper Park)
          </p>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Materials</span>
            <span className="font-semibold text-gray-900">$261.95</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Labor</span>
            <span className="font-semibold text-gray-900">$100.00</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Surcharge(s)</span>
            <span className="font-semibold text-gray-900">$42.76</span>
          </div>

          <div className="border-t-2 border-gray-300 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Balance</span>
              <span className="text-3xl font-bold text-[#DC2626]">$404.71</span>
            </div>
            {/* Asterisk Note Under Balance */}
            <p className="text-xs text-gray-500 mt-2 text-right">* Estimate subject to change upon inspection</p>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Payment Terms:</strong> A NON-REFUNDABLE 50% deposit will be required for special order parts. Full
            balance is due upon completion of the work.
          </p>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            This quote is valid for 30 days from the date on this document. For warranty details, visit
            speedyglass.com/warranty
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Button className="w-full h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]">
            Schedule Appointment
          </Button>
          <Button variant="outline" className="w-full h-12 text-base bg-transparent">
            Email Quote to Me
          </Button>
          <Link href="/" className="block text-center text-gray-600 hover:text-gray-900 text-sm mt-4">
            Start New Quote
          </Link>
        </div>
      </div>
    </Card>
  )
}

function QuoteLineItem({ label, amount, bold = false }: { label: string; amount: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? "font-semibold text-lg" : "text-gray-700"}>{label}</span>
      <span className={bold ? "font-bold text-xl" : "font-medium"}>{amount}</span>
    </div>
  )
}
