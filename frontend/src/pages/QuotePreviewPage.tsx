import { useParams, Link } from 'react-router-dom';
import { useQuotePreview } from '@/hooks/useQuotes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

// Helper function to safely format currency values
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(2);
}

export function QuotePreviewPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { data: quote, isLoading, error } = useQuotePreview(quoteId || null);

  if (!quoteId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <p className="text-gray-600">Invalid quote ID</p>
          <Link to="/">
            <Button className="mt-4 w-full bg-[#DC2626] hover:bg-[#B91C1C]">
              Return Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {isLoading && (
            <Card className="p-8 text-center">
              <Loader2 className="h-16 w-16 text-[#DC2626] animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading your quote...</p>
            </Card>
          )}

          {error && (
            <Card className="p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Quote Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                We couldn't find the quote you're looking for.
              </p>
              <Link to="/quote/new">
                <Button className="bg-[#DC2626] hover:bg-[#B91C1C]">
                  Start New Quote
                </Button>
              </Link>
            </Card>
          )}

          {quote && (
            <Card className="p-0 overflow-hidden bg-white">
              {/* Quote Header */}
              <div className="bg-white p-8 flex items-start justify-between border-b border-gray-200">
                <div>
                  <img
                    src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
                    alt="Speedy Glass Logo"
                    className="h-12 mb-2"
                  />
                  <p className="text-base font-medium text-gray-700">
                    {quote.service.assigned_shop?.name || 'Speedy Glass'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Quote</p>
                  <p className="text-2xl font-bold text-gray-900">{quote.id}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Estimation Disclaimer Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-8 my-6">
                <p className="text-sm text-blue-900 font-medium">
                  This is an estimated quote. Final pricing may vary based on inspection and
                  actual service requirements.
                </p>
              </div>

              {/* Customer & Vehicle Info */}
              <div className="bg-gray-50 px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase mb-3">
                    Bill To
                  </h3>
                  <p className="font-semibold text-gray-900 mb-1">
                    {quote.customer.first_name} {quote.customer.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{quote.customer.email}</p>
                  <p className="text-sm text-gray-600">{quote.customer.phone}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase mb-3">
                    Vehicle
                  </h3>
                  <p className="font-semibold text-gray-900 mb-1">
                    {quote.vehicle.year} {quote.vehicle.make} {quote.vehicle.model}
                    {quote.vehicle.body_type && ` / ${quote.vehicle.body_type}`}
                  </p>
                  <p className="text-sm text-gray-600">VIN: {quote.vehicle.vin}</p>
                </div>
              </div>

              {/* Service Details */}
              <div className="px-8 py-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">Service Details</h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <p className="font-medium text-gray-900">{quote.glass.display_name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {quote.service.type === 'mobile' ? 'Mobile Service' : 'In-Store Service'}
                  </p>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="px-8 py-6">
                {quote.pricing.line_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3">
                    <span className="text-gray-900">{item.description}</span>
                    <span className="font-semibold text-gray-900">
                      ${formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}

                <div className="border-t border-gray-300 my-4"></div>

                <div className="flex justify-between items-center py-3">
                  <span className="text-xl text-gray-900">Balance</span>
                  <span className="text-4xl font-bold text-[#DC2626]">
                    ${formatCurrency(quote.pricing.total)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">
                  * Estimate subject to change upon inspection
                </p>

                {/* Payment Terms */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-sm text-gray-900">
                    <strong>Payment Terms:</strong> A NON-REFUNDABLE 50% deposit will be required
                    for special order parts. Full balance is due upon completion of the work.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
