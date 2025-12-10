"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"

type Step = "glass-type" | "damage" | "contact" | "location" | "quote"
type GlassType = "windshield" | "side-window" | "rear-window" | "sunroof"
type DamageType = "replace" | "repair"

export default function VisualQuotePage() {
  const [currentStep, setCurrentStep] = useState<Step>("glass-type")
  const [selectedGlass, setSelectedGlass] = useState<GlassType | null>(null)
  const [damageType, setDamageType] = useState<DamageType | null>(null)
  const [chipCount, setChipCount] = useState<number | null>(null)
  const [postalCode, setPostalCode] = useState("")
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    phone: "",
    smsConsent: false,
  })

  const handleGlassSelect = (glass: GlassType) => {
    setSelectedGlass(glass)
    // Auto-advance after selection
    setTimeout(() => {
      if (glass === "windshield") {
        setCurrentStep("damage")
      } else {
        setCurrentStep("contact")
      }
    }, 300)
  }

  const handleDamageSelect = (type: DamageType) => {
    setDamageType(type)
    if (type === "replace") {
      setTimeout(() => setCurrentStep("contact"), 300)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Image
              src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
              alt="Speedy Glass Logo"
              width={200}
              height={48}
              priority
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Glass Type Selection */}
          {currentStep === "glass-type" && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">What do you need fixed?</h1>
                <p className="text-lg text-gray-600">Select the type of glass that needs service</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassTypeVisualCard
                  type="windshield"
                  label="Windshield"
                  selected={selectedGlass === "windshield"}
                  onClick={() => handleGlassSelect("windshield")}
                />
                <GlassTypeVisualCard
                  type="side-window"
                  label="Side Window"
                  selected={selectedGlass === "side-window"}
                  onClick={() => handleGlassSelect("side-window")}
                />
                <GlassTypeVisualCard
                  type="rear-window"
                  label="Rear Window"
                  selected={selectedGlass === "rear-window"}
                  onClick={() => handleGlassSelect("rear-window")}
                />
                <GlassTypeVisualCard
                  type="sunroof"
                  label="Sunroof"
                  selected={selectedGlass === "sunroof"}
                  onClick={() => handleGlassSelect("sunroof")}
                />
              </div>

              <div className="text-center pt-8">
                <Link href="/" className="text-[#DC2626] hover:text-[#B91C1C] font-medium">
                  ← Back to Home
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: Damage Assessment (only for windshield) */}
          {currentStep === "damage" && selectedGlass === "windshield" && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">What's your windshield damage?</h1>
                <p className="text-lg text-gray-600">Help us understand the extent of the damage</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DamageCard
                  type="replace"
                  title="My damage is larger than six inches"
                  subtitle="Replace my windshield"
                  selected={damageType === "replace"}
                  onClick={() => handleDamageSelect("replace")}
                />
                <DamageCard
                  type="repair"
                  title="I have three or fewer chips or cracks smaller than six inches"
                  subtitle="Repair my windshield"
                  selected={damageType === "repair"}
                  onClick={() => handleDamageSelect("repair")}
                />
              </div>

              {damageType === "repair" && (
                <Card className="p-6 border-2 border-[#DC2626]">
                  <h3 className="font-semibold text-gray-900 mb-4">How many chips or cracks?</h3>
                  <div className="flex gap-4 justify-center">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setChipCount(num)
                          setTimeout(() => setCurrentStep("contact"), 300)
                        }}
                        className={`w-20 h-20 rounded-lg border-2 text-2xl font-bold transition-all ${
                          chipCount === num
                            ? "border-[#DC2626] bg-red-50 text-[#DC2626]"
                            : "border-gray-300 hover:border-[#DC2626] text-gray-600"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              <div className="text-center pt-4">
                <button
                  onClick={() => setCurrentStep("glass-type")}
                  className="text-[#DC2626] hover:text-[#B91C1C] font-medium"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {currentStep === "contact" && (
            <Card className="p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Almost there! Where should we send your quote?
                </h2>
                <p className="text-gray-600">We'll send you a detailed estimate via email</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setCurrentStep("location")
                }}
                className="space-y-6"
              >
                <div>
                  <Label htmlFor="name" className="text-base font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={contactData.name}
                    onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                    className="mt-2 h-12"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-base font-medium">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
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
                    value={contactData.phone}
                    onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                    className="mt-2 h-12"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="smsConsent"
                    checked={contactData.smsConsent}
                    onChange={(e) => setContactData({ ...contactData, smsConsent: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-[#DC2626]"
                  />
                  <Label htmlFor="smsConsent" className="text-sm text-gray-700 font-normal cursor-pointer">
                    Yes, send me SMS updates about my quote and appointment (optional)
                  </Label>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-14 text-lg bg-transparent"
                    onClick={() => {
                      if (selectedGlass === "windshield" && damageType) {
                        setCurrentStep("damage")
                      } else {
                        setCurrentStep("glass-type")
                      }
                    }}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]">
                    Continue
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Step 4: Service Location */}
          {currentStep === "location" && (
            <Card className="p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Where do you need service?</h2>
                <p className="text-gray-600">We offer mobile service or in-store appointments</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setCurrentStep("quote")
                }}
                className="space-y-6"
              >
                <div>
                  <Label htmlFor="postalCode" className="text-base font-medium">
                    ZIP / Postal Code *
                  </Label>
                  <Input
                    id="postalCode"
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-2 h-12 text-lg"
                    placeholder="Enter your ZIP or postal code"
                    maxLength={10}
                  />
                  <p className="text-sm text-gray-500 mt-2">We'll check if mobile service is available in your area</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-14 text-lg bg-transparent"
                    onClick={() => setCurrentStep("contact")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
                    disabled={postalCode.length < 5}
                  >
                    Get My Quote
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Step 5: Quote Display */}
          {currentStep === "quote" && (
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
                  <p className="text-sm text-gray-600 mt-2">Speedy Glass - Your Local Branch</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Quote</p>
                  <p className="text-2xl font-bold text-gray-900">Q-{Math.floor(Math.random() * 1000000)}</p>
                  <p className="text-sm text-gray-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Estimation Disclaimer Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-6 mt-6 rounded">
                <p className="text-sm text-blue-900 font-medium">
                  📋 This is an estimated quote. Final pricing may vary based on inspection and actual service
                  requirements.
                </p>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 p-6 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer Information</h3>
                <p className="font-semibold text-gray-900">{contactData.name}</p>
                <p className="text-sm text-gray-600">{contactData.email}</p>
                <p className="text-sm text-gray-600">{contactData.phone}</p>
                <p className="text-sm text-gray-600 mt-1">Service Area: {postalCode}</p>
              </div>

              {/* Service Summary */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Service Details</h3>
                <div className="bg-red-50 border-l-4 border-[#DC2626] p-4 rounded">
                  <p className="font-medium text-gray-900">
                    {selectedGlass === "windshield"
                      ? damageType === "repair"
                        ? `Windshield Repair (${chipCount} ${chipCount === 1 ? "chip" : "chips"})`
                        : "Windshield Replacement"
                      : `${selectedGlass?.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Replacement`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Professional installation with lifetime warranty</p>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Materials</span>
                    <span className="font-semibold text-gray-900">
                      $
                      {damageType === "repair"
                        ? (chipCount || 1) * 50
                        : selectedGlass === "windshield"
                          ? 261.95
                          : selectedGlass === "rear-window"
                            ? 249.0
                            : selectedGlass === "sunroof"
                              ? 350.0
                              : 199.0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Labor</span>
                    <span className="font-semibold text-gray-900">${damageType === "repair" ? 50.0 : 100.0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Surcharge(s)</span>
                    <span className="font-semibold text-gray-900">${damageType === "repair" ? 12.5 : 42.76}</span>
                  </div>

                  <div className="border-t-2 border-gray-300 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">Balance</span>
                      <span className="text-3xl font-bold text-[#DC2626]">
                        $
                        {damageType === "repair"
                          ? ((chipCount || 1) * 50 + 50 + 12.5).toFixed(2)
                          : (
                              Number.parseFloat(
                                selectedGlass === "windshield"
                                  ? "261.95"
                                  : selectedGlass === "rear-window"
                                    ? "249.00"
                                    : selectedGlass === "sunroof"
                                      ? "350.00"
                                      : "199.00",
                              ) +
                              100 +
                              42.76
                            ).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      * Estimate subject to change upon inspection
                    </p>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> This quote is valid for 30 days. A deposit may be required for special order
                    parts.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 space-y-3">
                  <Button className="w-full h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]">
                    📅 Schedule Appointment
                  </Button>
                  <Button variant="outline" className="w-full h-12 text-base bg-transparent">
                    📧 Email Quote to Me
                  </Button>
                  <Button variant="outline" className="w-full h-12 text-base bg-transparent">
                    📞 Call Me Back
                  </Button>
                  <Link href="/v2" className="block text-center text-gray-600 hover:text-gray-900 text-sm mt-4">
                    Start New Quote
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

// Visual Glass Type Selection Card
function GlassTypeVisualCard({
  type,
  label,
  selected,
  onClick,
}: {
  type: GlassType
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-6 border-3 rounded-xl transition-all ${
        selected
          ? "border-[#DC2626] bg-red-50 shadow-lg scale-105"
          : "border-gray-200 hover:border-[#DC2626] hover:shadow-md"
      }`}
    >
      {/* Visual Car Icon */}
      <div className="mb-4 relative h-32 flex items-center justify-center">
        <CarIllustration type={type} highlighted={selected} />
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="font-semibold text-lg text-gray-900">{label}</p>
      </div>

      {/* Check Mark */}
      {selected && (
        <div className="absolute top-4 right-4 w-8 h-8 bg-[#DC2626] rounded-full flex items-center justify-center">
          <Check className="w-5 h-5 text-white" />
        </div>
      )}
    </button>
  )
}

// Simplified Car Illustration Component
function CarIllustration({ type, highlighted }: { type: GlassType; highlighted: boolean }) {
  const fillColor = highlighted ? "#DC2626" : "#E5E7EB"
  const strokeColor = highlighted ? "#B91C1C" : "#9CA3AF"

  if (type === "windshield") {
    return (
      <svg viewBox="0 0 120 80" className="w-full h-full max-w-[120px]">
        {/* Car body */}
        <path d="M10 60 L30 60 L35 50 L85 50 L90 60 L110 60 L105 40 L85 25 L35 25 L15 40 Z" fill="#374151" />
        {/* Windshield - highlighted */}
        <path d="M38 28 L82 28 L88 40 L32 40 Z" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
        {/* Side windows */}
        <rect x="15" y="42" width="18" height="12" fill="#E5E7EB" />
        <rect x="87" y="42" width="18" height="12" fill="#E5E7EB" />
        {/* Wheels */}
        <circle cx="30" cy="65" r="8" fill="#1F2937" />
        <circle cx="90" cy="65" r="8" fill="#1F2937" />
      </svg>
    )
  }

  if (type === "side-window") {
    return (
      <svg viewBox="0 0 120 80" className="w-full h-full max-w-[140px]">
        {/* Van/SUV body */}
        <rect x="20" y="30" width="80" height="35" rx="3" fill="#374151" />
        <path d="M20 65 L100 65 L105 55 L105 35 L100 30 L20 30 L15 35 L15 55 Z" fill="#374151" />
        {/* Side window - highlighted */}
        <rect x="55" y="35" width="25" height="20" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
        {/* Other windows */}
        <rect x="25" y="35" width="25" height="20" fill="#E5E7EB" />
        {/* Windshield */}
        <path d="M18 38 L25 35 L25 55 L18 52 Z" fill="#E5E7EB" />
        {/* Wheels */}
        <circle cx="35" cy="70" r="8" fill="#1F2937" />
        <circle cx="85" cy="70" r="8" fill="#1F2937" />
      </svg>
    )
  }

  if (type === "rear-window") {
    return (
      <svg viewBox="0 0 120 80" className="w-full h-full max-w-[120px]">
        {/* Car body - top view */}
        <ellipse cx="60" cy="45" rx="35" ry="20" fill="#374151" />
        <rect x="25" y="30" width="70" height="30" fill="#374151" />
        {/* Rear window - highlighted */}
        <path d="M40 32 L80 32 L75 40 L45 40 Z" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
        {/* Windshield */}
        <path d="M40 48 L80 48 L75 56 L45 56 Z" fill="#E5E7EB" />
      </svg>
    )
  }

  // Sunroof
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full max-w-[120px]">
      {/* Car body - top view */}
      <rect x="30" y="20" width="60" height="45" rx="8" fill="#374151" />
      {/* Sunroof - highlighted */}
      <rect x="40" y="28" width="40" height="28" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
      {/* Side mirrors */}
      <circle cx="25" cy="40" r="5" fill="#4B5563" />
      <circle cx="95" cy="40" r="5" fill="#4B5563" />
    </svg>
  )
}

// Damage Assessment Card
function DamageCard({
  type,
  title,
  subtitle,
  selected,
  onClick,
}: {
  type: DamageType
  title: string
  subtitle: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`p-6 border-3 rounded-xl text-left transition-all ${
        selected ? "border-[#DC2626] bg-red-50 shadow-lg" : "border-gray-200 hover:border-[#DC2626] hover:shadow-md"
      }`}
    >
      {/* Damage Illustration */}
      <div className="mb-4 flex justify-center">
        <DamageIllustration type={type} highlighted={selected} />
      </div>

      <p className="text-gray-700 mb-2">{title}</p>
      <p className="text-sm font-semibold text-[#DC2626]">{subtitle}</p>

      {selected && (
        <div className="absolute top-4 right-4 w-8 h-8 bg-[#DC2626] rounded-full flex items-center justify-center">
          <Check className="w-5 h-5 text-white" />
        </div>
      )}
    </button>
  )
}

function DamageIllustration({ type, highlighted }: { type: DamageType; highlighted: boolean }) {
  const damageColor = highlighted ? "#DC2626" : "#9CA3AF"

  if (type === "replace") {
    return (
      <svg viewBox="0 0 120 60" className="w-32 h-16">
        {/* Windshield outline */}
        <path d="M10 50 L30 10 L90 10 L110 50 Z" fill="none" stroke="#374151" strokeWidth="2" />
        {/* Large crack */}
        <path
          d="M35 15 L45 30 L55 25 L65 40 L75 35 L85 50"
          stroke={damageColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* Impact point */}
        <circle cx="55" cy="25" r="6" fill={damageColor} opacity="0.3" />
      </svg>
    )
  }

  // Repair - small chips
  return (
    <svg viewBox="0 0 120 60" className="w-32 h-16">
      {/* Windshield outline */}
      <path d="M10 50 L30 10 L90 10 L110 50 Z" fill="none" stroke="#374151" strokeWidth="2" />
      {/* Small chips */}
      <circle cx="45" cy="25" r="4" fill={damageColor} />
      <path d="M43 23 L47 27 M47 23 L43 27" stroke="white" strokeWidth="1.5" />
      <circle cx="70" cy="30" r="3" fill={damageColor} />
      <path d="M68.5 29 L71.5 31 M71.5 29 L68.5 31" stroke="white" strokeWidth="1" />
    </svg>
  )
}
