"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

export default function CheckQuotePage() {
  const [quoteId, setQuoteId] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      // Handle quote lookup
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto">
          <Card className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Check Your Quote</h2>
            <p className="text-gray-600 mb-8">Enter your quote ID and email to view your quote details.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="quoteId" className="text-base font-medium">
                  Quote ID
                </Label>
                <Input
                  id="quoteId"
                  type="text"
                  value={quoteId}
                  onChange={(e) => {
                    setQuoteId(e.target.value.toUpperCase())
                    setError("")
                  }}
                  placeholder="QT-2025-001234"
                  className="mt-2 text-lg h-14"
                />
                <p className="text-sm text-gray-500 mt-2">Found in your quote email</p>
              </div>

              <div>
                <Label htmlFor="email" className="text-base font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  placeholder="your.email@example.com"
                  className="mt-2 text-lg h-14"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-[#DC2626] text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold bg-[#DC2626] hover:bg-[#B91C1C]"
                disabled={loading || !quoteId || !email}
              >
                {loading ? "Searching..." : "Find My Quote"}
              </Button>

              <div className="text-center pt-4">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  ← Back to Home
                </Link>
              </div>
            </form>
          </Card>

          {/* Help Section */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-2">Need help finding your quote?</p>
            <a href="tel:1-800-87-GLASS" className="text-[#DC2626] hover:text-[#B91C1C] font-medium">
              Call us at 1-800-87-GLASS
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
