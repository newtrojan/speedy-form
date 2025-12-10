import Link from "next/link"
import Image from "next/image"

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Image
            src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
            alt="Speedy Glass Logo"
            width={250}
            height={60}
            priority
          />
          <div className="flex items-center gap-4">
            <a href="tel:1-800-87-GLASS" className="text-gray-700 hover:text-gray-900 font-medium">
              1-800-87-GLASS
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-balance">Quick Quote System</h1>
          <p className="text-xl text-gray-600 mb-12 text-pretty">
            Get an instant quote for your auto glass repair or check the status of your existing quote
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href="/quote/new"
              className="w-full sm:w-auto px-12 py-6 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xl font-semibold rounded-lg shadow-lg transition-colors"
            >
              Request a Quote
            </Link>
            <Link
              href="/quote/check"
              className="w-full sm:w-auto px-12 py-6 bg-white hover:bg-gray-50 text-gray-900 text-xl font-semibold rounded-lg border-2 border-gray-300 transition-colors"
            >
              Check a Quote
            </Link>
          </div>

          <div className="mt-8">
            <Link
              href="/v2"
              className="inline-flex items-center gap-2 px-6 py-3 text-[#DC2626] hover:text-[#B91C1C] font-medium border-2 border-[#DC2626] hover:border-[#B91C1C] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              Try Visual Quote Experience (v2)
            </Link>
          </div>
          {/* </CHANGE> */}

          {/* Info Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#DC2626] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast & Easy</h3>
              <p className="text-gray-600 text-sm">Get your quote in less than 2 minutes</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#DC2626] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Accurate Pricing</h3>
              <p className="text-gray-600 text-sm">Real-time pricing from NAGS database</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#DC2626] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Local Service</h3>
              <p className="text-gray-600 text-sm">Over 27 locations across 7 states</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>Expert glass repair, replacement and installation for your car, home, and business.</p>
          <p className="mt-2">© {new Date().getFullYear()} Speedy Glass. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
