import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuoteStatus } from '@/hooks/useQuotes';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuoteStatusPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data: status, isLoading } = useQuoteStatus(taskId || null, !!taskId);

  useEffect(() => {
    if (status?.status === 'completed' && status.quote_id) {
      // Redirect to quote preview page
      navigate(`/quote/${status.quote_id}`);
    }
  }, [status, navigate]);

  if (!taskId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <p className="text-gray-600">Invalid task ID</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img
              src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
              alt="Speedy Glass Logo"
              className="h-10 md:h-12"
            />
          </Link>
          <a
            href="tel:1-800-87-GLASS"
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            1-800-87-GLASS
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            {isLoading && (
              <div className="text-center">
                <Loader2 className="h-16 w-16 text-[#DC2626] animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Loading...
                </h2>
                <p className="text-gray-600">Please wait while we check your quote status.</p>
              </div>
            )}

            {!isLoading && status?.status === 'pending' && (
              <div className="text-center">
                <Loader2 className="h-16 w-16 text-[#DC2626] animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Preparing Your Quote
                </h2>
                <p className="text-gray-600 mb-4">
                  {status.message || 'Your quote is being prepared...'}
                </p>
                {status.progress !== undefined && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-[#DC2626] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {!isLoading && status?.status === 'processing' && (
              <div className="text-center">
                <Loader2 className="h-16 w-16 text-[#DC2626] animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Generating Your Quote
                </h2>
                <p className="text-gray-600 mb-4">
                  {status.message || 'We\'re calculating the best price for you...'}
                </p>
                {status.progress !== undefined && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-[#DC2626] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {!isLoading && status?.status === 'completed' && (
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Quote Ready!
                </h2>
                <p className="text-gray-600 mb-4">
                  Redirecting you to your quote...
                </p>
              </div>
            )}

            {!isLoading && status?.status === 'failed' && (
              <div className="text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Quote Generation Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  {status.error || 'We encountered an error generating your quote. Please try again.'}
                </p>
                <div className="flex flex-col gap-3">
                  <Link to="/quote/new">
                    <Button className="w-full bg-[#DC2626] hover:bg-[#B91C1C]">
                      Start New Quote
                    </Button>
                  </Link>
                  <a href="tel:1-800-87-GLASS">
                    <Button variant="outline" className="w-full">
                      Call Us for Help
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
