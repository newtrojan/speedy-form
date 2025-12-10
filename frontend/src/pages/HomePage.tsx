import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Search, Zap, DollarSign, MapPin } from 'lucide-react';
import { ChatwootWidget } from '@/components/ChatwootWidget';

export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
              alt="Speedy Glass"
              className="h-10 md:h-12"
            />
          </div>
          <div className="text-base md:text-lg font-semibold text-gray-700 hover:text-primary transition-colors">
            <a href="tel:1-800-87-GLASS">1-800-87-GLASS</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24 lg:py-32">
        <div className="container mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Expert Auto Glass Repair & Replacement
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed">
            Get an instant quote for your auto glass replacement. Professional
            service for your car, home, and business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/quote/new" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-speedy-red-dark text-white px-8 py-7 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 min-h-[56px]"
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                Request a Quote
              </Button>
            </Link>
            <Link to="/quote/check" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8 py-7 text-base md:text-lg font-semibold border-2 hover:bg-gray-50 transition-all duration-200 min-h-[56px]"
              >
                <Search className="mr-2 h-5 w-5" />
                Check Existing Quote
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 lg:py-24 bg-white">
        <div className="container mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            <Card className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-speedy-red-light flex items-center justify-center mb-5 ring-4 ring-speedy-red-light/50">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">
                    Fast & Easy
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Get your quote in minutes. Enter your VIN and we'll do the
                    rest.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-speedy-red-light flex items-center justify-center mb-5 ring-4 ring-speedy-red-light/50">
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">
                    Accurate Pricing
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Transparent pricing with detailed breakdowns. No hidden fees.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-speedy-red-light flex items-center justify-center mb-5 ring-4 ring-speedy-red-light/50">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">
                    Local Service
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Mobile or in-store service. We come to you or you come to us.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 md:py-12 mt-auto">
        <div className="container mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-base">
            &copy; {new Date().getFullYear()} Speedy Glass. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-3 max-w-2xl mx-auto">
            Expert glass repair, replacement and installation for your car, home,
            and business.
          </p>
        </div>
      </footer>

      {/* Chatwoot Live Chat Widget */}
      <ChatwootWidget
        settings={{
          position: 'right',
          launcherTitle: 'Chat with us',
        }}
      />
    </div>
  );
}
