"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data - will be replaced with real API calls
const mockQuotes = [
  {
    id: "Q-2024-001",
    customer: {
      name: "John Smith",
      phone: "(555) 123-4567",
      email: "john.smith@email.com",
    },
    vehicle: {
      year: 2022,
      make: "Toyota",
      model: "Camry",
    },
    status: "viewed",
    totalPrice: 425.0,
    serviceType: "Windshield Replacement",
    damageCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    sentAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    engagement: {
      viewCount: 3,
      lastViewedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
      isHot: true,
    },
    parts: [
      {
        id: 1,
        description: "Windshield - Front",
        partNumber: "FW12345-XYZ",
        calibrationType: "Dynamic",
        price: 285.0,
        notes: "OEM equivalent quality, includes acoustic interlayer for noise reduction",
        imageUrl: "/automotive-windshield-glass-part.jpg",
        nagsInfo: {
          moulding: true,
          hardware: false,
        },
      },
    ],
  },
  {
    id: "Q-2024-002",
    customer: {
      name: "Sarah Johnson",
      phone: "(555) 234-5678",
      email: "sarah.j@email.com",
    },
    vehicle: {
      year: 2021,
      make: "Honda",
      model: "Accord",
    },
    status: "sent",
    totalPrice: 185.0,
    serviceType: "Side Window Replacement",
    damageCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    engagement: {
      viewCount: 0,
      lastViewedAt: null,
      isHot: false,
    },
    parts: [
      {
        id: 2,
        description: "Door Glass - Driver Front",
        partNumber: "DG67890-ABC",
        calibrationType: "None",
        price: 145.0,
        notes: "Tempered safety glass, tinted to match factory specifications",
        imageUrl: "/car-side-window-door-glass.jpg",
        nagsInfo: {
          moulding: false,
          hardware: true,
        },
      },
    ],
  },
  {
    id: "Q-2024-003",
    customer: {
      name: "Michael Chen",
      phone: "(555) 345-6789",
      email: "m.chen@email.com",
    },
    vehicle: {
      year: 2023,
      make: "Ford",
      model: "F-150",
    },
    status: "draft",
    totalPrice: 650.0,
    serviceType: "Windshield Replacement",
    damageCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
    sentAt: null,
    engagement: {
      viewCount: 0,
      lastViewedAt: null,
      isHot: false,
    },
    parts: [
      {
        id: 3,
        description: "Windshield - Front with HUD",
        partNumber: "FW-HUD-456",
        calibrationType: "Static + Dynamic",
        price: 485.0,
        notes: "Heads-Up Display compatible, requires specialized installation and calibration",
        imageUrl: "/hud-windshield-with-heads-up-display.jpg",
        nagsInfo: {
          moulding: true,
          hardware: true,
        },
      },
    ],
  },
  {
    id: "Q-2024-004",
    customer: {
      name: "Emily Davis",
      phone: "(555) 456-7890",
      email: "emily.davis@email.com",
    },
    vehicle: {
      year: 2020,
      make: "Tesla",
      model: "Model 3",
    },
    status: "viewed",
    totalPrice: 890.0,
    serviceType: "Windshield Replacement",
    damageCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    engagement: {
      viewCount: 2,
      lastViewedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      isHot: false,
    },
    parts: [
      {
        id: 4,
        description: "Windshield - Front with Rain Sensor",
        partNumber: "TS-WS-2020",
        calibrationType: "Dynamic + Camera",
        price: 725.0,
        notes: "Tesla OEM specification, includes rain sensor and camera mount for Autopilot",
        imageUrl: "/tesla-windshield-with-camera-mount.jpg",
        nagsInfo: {
          moulding: true,
          hardware: true,
        },
      },
    ],
  },
  {
    id: "Q-2024-005",
    customer: {
      name: "Robert Wilson",
      phone: "(555) 567-8901",
      email: "r.wilson@email.com",
    },
    vehicle: {
      year: 2019,
      make: "Chevrolet",
      model: "Silverado",
    },
    status: "sent",
    totalPrice: 320.0,
    serviceType: "Back Window Replacement",
    damageCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    engagement: {
      viewCount: 0,
      lastViewedAt: null,
      isHot: false,
    },
    parts: [
      {
        id: 5,
        description: "Back Glass - Heated",
        partNumber: "BG-HEAT-789",
        calibrationType: "None",
        price: 275.0,
        notes: "Includes defrost heating elements, privacy tinted",
        imageUrl: "/truck-rear-window-heated-glass.jpg",
        nagsInfo: {
          moulding: false,
          hardware: false,
        },
      },
    ],
  },
]

type FilterType = "all" | "draft" | "sent" | "viewed" | "followup"

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [selectedQuote, setSelectedQuote] = useState<(typeof mockQuotes)[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const getFilteredQuotes = () => {
    let filtered = mockQuotes

    if (activeFilter === "draft") {
      filtered = filtered.filter((q) => q.status === "draft")
    } else if (activeFilter === "sent") {
      filtered = filtered.filter((q) => q.status === "sent" && q.engagement.viewCount === 0)
    } else if (activeFilter === "viewed") {
      filtered = filtered.filter((q) => q.engagement.viewCount > 0)
    } else if (activeFilter === "followup") {
      const twoDaysAgo = Date.now() - 1000 * 60 * 60 * 48
      filtered = filtered.filter(
        (q) =>
          (q.sentAt && q.sentAt.getTime() < twoDaysAgo && q.engagement.viewCount === 0) ||
          (q.engagement.lastViewedAt && q.engagement.lastViewedAt.getTime() < twoDaysAgo),
      )
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (q) =>
          q.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.customer.phone.includes(searchQuery) ||
          q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${q.vehicle.year} ${q.vehicle.make} ${q.vehicle.model}`.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return filtered
  }

  const getStatusBadge = (quote: (typeof mockQuotes)[0]) => {
    if (quote.status === "draft") {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          Draft
        </Badge>
      )
    }
    if (quote.engagement.viewCount === 0) {
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          Sent
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-green-50 text-green-700">
        Viewed
      </Badge>
    )
  }

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const filteredQuotes = getFilteredQuotes()
  const needsAttention = mockQuotes.filter(
    (q) =>
      (q.sentAt && q.sentAt.getTime() < Date.now() - 1000 * 60 * 60 * 48 && q.engagement.viewCount === 0) ||
      (q.engagement.lastViewedAt && q.engagement.lastViewedAt.getTime() < Date.now() - 1000 * 60 * 60 * 48) ||
      q.status === "draft",
  ).length

  const handleStatusChange = (newStatus: string) => {
    console.log("[v0] Status changed to:", newStatus)
    // In real implementation, this would call an API to update the quote status
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Image
                src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
                alt="Speedy Glass Logo"
                width={200}
                height={48}
                priority
              />
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">CSR Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Input
                placeholder="Search quotes, customers, vehicles..."
                className="pl-10 w-96 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">CSR Name</span>
              <div className="w-8 h-8 bg-[#DC2626] rounded-full flex items-center justify-center text-white font-medium text-sm">
                CS
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Quote Queue</h2>

            {/* Quick Stats */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active Quotes</span>
                <span className="font-semibold text-gray-900">{mockQuotes.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Needs Attention</span>
                <span className="font-semibold text-[#DC2626]">{needsAttention}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Avg Response</span>
                <span className="font-semibold text-gray-900">2.3h</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <button
                onClick={() => setActiveFilter("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === "all"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>All Quotes</span>
                <span className="text-xs text-gray-500">{mockQuotes.length}</span>
              </button>
              <button
                onClick={() => setActiveFilter("draft")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === "draft"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>Needs Review</span>
                <span className="text-xs text-gray-500">{mockQuotes.filter((q) => q.status === "draft").length}</span>
              </button>
              <button
                onClick={() => setActiveFilter("sent")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === "sent"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>Sent</span>
                <span className="text-xs text-gray-500">
                  {mockQuotes.filter((q) => q.status === "sent" && q.engagement.viewCount === 0).length}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter("viewed")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === "viewed"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>Viewed</span>
                <span className="text-xs text-gray-500">
                  {mockQuotes.filter((q) => q.engagement.viewCount > 0).length}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter("followup")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === "followup"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>Follow-up Needed</span>
                <span className="text-xs text-[#DC2626]">
                  {
                    mockQuotes.filter(
                      (q) =>
                        (q.sentAt &&
                          q.sentAt.getTime() < Date.now() - 1000 * 60 * 60 * 48 &&
                          q.engagement.viewCount === 0) ||
                        (q.engagement.lastViewedAt &&
                          q.engagement.lastViewedAt.getTime() < Date.now() - 1000 * 60 * 60 * 48),
                    ).length
                  }
                </span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Quote List */}
          <div className="w-[480px] border-r border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  {activeFilter === "all" && "All Quotes"}
                  {activeFilter === "draft" && "Needs Review"}
                  {activeFilter === "sent" && "Sent Quotes"}
                  {activeFilter === "viewed" && "Viewed Quotes"}
                  {activeFilter === "followup" && "Follow-up Needed"}
                </h2>
                <span className="text-sm text-gray-500">{filteredQuotes.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredQuotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm">No quotes found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredQuotes.map((quote) => (
                    <button
                      key={quote.id}
                      onClick={() => setSelectedQuote(quote)}
                      className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedQuote?.id === quote.id ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 truncate">{quote.customer.name}</p>
                            {quote.engagement.isHot && (
                              <Badge variant="secondary" className="bg-[#DC2626] text-white text-xs">
                                Hot
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {quote.vehicle.year} {quote.vehicle.make} {quote.vehicle.model}
                          </p>
                        </div>
                        <div className="ml-3">{getStatusBadge(quote)}</div>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">{quote.serviceType}</p>
                        <p className="text-sm font-semibold text-gray-900">${quote.totalPrice.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {getTimeAgo(quote.createdAt)}</span>
                        {quote.engagement.viewCount > 0 && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            <span>{quote.engagement.viewCount}x viewed</span>
                          </div>
                        )}
                        {quote.status === "sent" && quote.engagement.viewCount === 0 && (
                          <span className="text-gray-400">Not opened</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quote Detail Panel */}
          <div className="flex-1 bg-gray-50 overflow-y-auto">
            {selectedQuote ? (
              <div className="max-w-4xl mx-auto p-8">
                {/* Customer & Vehicle Info */}
                <Card className="p-6 mb-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedQuote.customer.name}</h2>
                      <p className="text-sm text-gray-500">Quote #{selectedQuote.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(selectedQuote)}
                      <Select onValueChange={handleStatusChange} defaultValue={selectedQuote.status}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Change status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="viewed">Viewed</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Contact Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          <a href={`tel:${selectedQuote.customer.phone}`} className="text-[#DC2626] hover:underline">
                            {selectedQuote.customer.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <a href={`mailto:${selectedQuote.customer.email}`} className="text-[#DC2626] hover:underline">
                            {selectedQuote.customer.email}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Vehicle Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                            />
                          </svg>
                          <span className="text-gray-900">
                            {selectedQuote.vehicle.year} {selectedQuote.vehicle.make} {selectedQuote.vehicle.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          <span className="text-gray-600">{selectedQuote.serviceType}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Engagement Section */}
                {selectedQuote.sentAt && (
                  <Card className="p-6 mb-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Customer Engagement
                    </h3>

                    {selectedQuote.engagement.viewCount > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Customer is engaged</p>
                              <p className="text-xs text-gray-600">
                                Viewed {selectedQuote.engagement.viewCount}x, last viewed{" "}
                                {selectedQuote.engagement.lastViewedAt &&
                                  getTimeAgo(selectedQuote.engagement.lastViewedAt)}
                              </p>
                            </div>
                          </div>
                          {selectedQuote.engagement.isHot && (
                            <Badge className="bg-[#DC2626] text-white">Hot Lead</Badge>
                          )}
                        </div>

                        <div className="space-y-2 pt-2">
                          <div className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                            <div className="flex-1">
                              <p className="text-gray-900 font-medium">Quote created</p>
                              <p className="text-gray-500 text-xs">{selectedQuote.createdAt.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                            <div className="flex-1">
                              <p className="text-gray-900 font-medium">Email sent to customer</p>
                              <p className="text-gray-500 text-xs">{selectedQuote.sentAt.toLocaleString()}</p>
                            </div>
                          </div>
                          {selectedQuote.engagement.lastViewedAt && (
                            <div className="flex items-start gap-3 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                              <div className="flex-1">
                                <p className="text-gray-900 font-medium">Customer viewed quote</p>
                                <p className="text-gray-500 text-xs">
                                  {selectedQuote.engagement.lastViewedAt.toLocaleString()} (
                                  {selectedQuote.engagement.viewCount}x total)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Quote sent but not opened</p>
                          <p className="text-xs text-gray-600">Sent {getTimeAgo(selectedQuote.sentAt)}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Quote Details */}
                <Card className="p-6 mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Quote Details</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedQuote.serviceType}</p>
                        <p className="text-xs text-gray-500">{selectedQuote.damageCount} damage(s)</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">${selectedQuote.totalPrice.toFixed(2)}</p>
                    </div>

                    <div className="pt-2 text-xs text-gray-500">
                      <p>Parts & Labor included in quote</p>
                      <p>NAGS pricing database</p>
                    </div>
                  </div>
                </Card>

                {/* Part Details section with AUTOBOLT and NAGS info */}
                {selectedQuote.parts && selectedQuote.parts.length > 0 && (
                  <Card className="p-6 mb-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Part Information
                    </h3>

                    <div className="space-y-6">
                      {selectedQuote.parts.map((part) => (
                        <div key={part.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Part Header with Image */}
                          <div className="flex gap-4 p-4 bg-gray-50">
                            <div className="flex-shrink-0">
                              <Image
                                src={part.imageUrl || "/placeholder.svg"}
                                alt={part.description}
                                width={120}
                                height={120}
                                className="rounded-md border border-gray-200"
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-2">{part.description}</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Part #:</span>
                                  <span className="font-mono text-gray-900">{part.partNumber}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Price:</span>
                                  <span className="font-semibold text-gray-900">${part.price.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* AUTOBOLT Information */}
                          <div className="p-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 bg-[#DC2626] rounded flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                              </div>
                              <h5 className="font-semibold text-sm text-gray-900">AUTOBOLT Data</h5>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Calibration Type</p>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-mono text-xs">
                                  {part.calibrationType}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">NAGS Information</p>
                                <div className="flex gap-2">
                                  <Badge
                                    variant="secondary"
                                    className={
                                      part.nagsInfo.moulding
                                        ? "bg-green-50 text-green-700 text-xs"
                                        : "bg-gray-100 text-gray-500 text-xs"
                                    }
                                  >
                                    Moulding: {part.nagsInfo.moulding ? "Yes" : "No"}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={
                                      part.nagsInfo.hardware
                                        ? "bg-green-50 text-green-700 text-xs"
                                        : "bg-gray-100 text-gray-500 text-xs"
                                    }
                                  >
                                    Hardware: {part.nagsInfo.hardware ? "Yes" : "No"}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {part.notes && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Notes</p>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                                  {part.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-8 mt-8">
                  <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex gap-3">
                      <Button variant="outline" className="border-gray-300 bg-transparent">
                        Edit Quote
                      </Button>
                      <Button variant="outline" className="border-gray-300 bg-transparent">
                        Add Note
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      {selectedQuote.status === "draft" ? (
                        <Button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">Send Quote</Button>
                      ) : (
                        <Button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">Resend Quote</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">Select a quote to view details</p>
                  <p className="text-gray-400 text-sm">
                    Choose a quote from the list to see customer and engagement information
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
