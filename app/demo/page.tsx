'use client';

/**
 * Demo Landing Page - Two Path Choice
 * Editorial luxury design with two compelling options
 */

import Link from 'next/link';
import DesktopOnly from '@/components/DesktopOnly';

export default function DemoPage() {
  return (
    <DesktopOnly>
      <div className="min-h-screen" style={{ backgroundColor: '#FAF9F5' }}>
        {/* Logo - Standalone top left */}
        <div className="fixed top-8 left-12 z-50">
          <img
            src="https://n.nordstrommedia.com/alias/nordstrom-logo.svg"
            alt="Nordstrom"
            className="h-6"
            style={{ filter: 'brightness(0)' }}
          />
        </div>

        {/* Admin Link - Top right */}
        <div className="fixed top-8 right-12 z-50">
          <Link
            href="/admin"
            className="text-xs hover:opacity-60 transition-opacity tracking-wider"
            style={{ color: '#8E8A82' }}
          >
            ADMIN
          </Link>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-12 py-32">
          {/* Title */}
          <div className="text-center mb-24">
            <h2
              className="text-6xl font-light mb-8 leading-tight"
              style={{
                fontFamily: 'ui-serif, Georgia, serif',
                color: '#0C0C0C'
              }}
            >
              Personalized fashion discovery<br />powered by AI
            </h2>
            <p
              className="text-2xl font-light tracking-wide"
              style={{ color: '#8E8A82' }}
            >
              Building rich customer profiles through interactive style signals
            </p>
          </div>

          {/* Two Paths */}
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Path 1: Explore Demo Personas */}
            <Link
              href="/personas"
              className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="relative p-12">
                {/* Icon */}
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundColor: '#EDECEB'
                  }}
                >
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: '#0C0C0C' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>

                {/* Title */}
                <h3
                  className="text-4xl font-light mb-6 leading-tight"
                  style={{
                    fontFamily: 'ui-serif, Georgia, serif',
                    color: '#0C0C0C'
                  }}
                >
                  Explore Demo<br />Personas
                </h3>

                {/* Description */}
                <p
                  className="text-lg leading-relaxed mb-8"
                  style={{ color: '#8E8A82' }}
                >
                  See how our system builds personalized style intelligence with 9 pre-built customer journeys
                </p>

                {/* Features */}
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3" style={{ color: '#0C0C0C' }}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#38B8B1' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>View complete style profiles</span>
                  </div>
                  <div className="flex items-center gap-3" style={{ color: '#0C0C0C' }}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#38B8B1' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Explore swipe sessions</span>
                  </div>
                  <div className="flex items-center gap-3" style={{ color: '#0C0C0C' }}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#38B8B1' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>See confidence scores</span>
                  </div>
                </div>

                {/* CTA */}
                <div
                  className="flex items-center gap-3 font-semibold group-hover:gap-5 transition-all"
                  style={{ color: '#0C0C0C' }}
                >
                  <span className="tracking-wider text-sm">VIEW PERSONAS</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Path 2: Try Interactive Demo */}
            <Link
              href="/demo/interactive"
              className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: '#0C0C0C',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="relative p-12">
                {/* Icon */}
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 transition-all duration-300"
                  style={{
                    backgroundColor: '#FCD923'
                  }}
                >
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: '#0C0C0C' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>

                {/* Title */}
                <h3
                  className="text-4xl font-light mb-6 leading-tight"
                  style={{
                    fontFamily: 'ui-serif, Georgia, serif',
                    color: '#FFFFFF'
                  }}
                >
                  Try Interactive<br />Demo
                </h3>

                {/* Description */}
                <p
                  className="text-lg leading-relaxed mb-8"
                  style={{ color: '#B4B1A9' }}
                >
                  Experience personalized style intelligence for yourself through our interactive swipe sessions
                </p>

                {/* Features */}
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#38B8B1' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Build your style profile</span>
                  </div>
                  <div className="flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#38B8B1' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Swipe through curated looks</span>
                  </div>
                  <div className="flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#38B8B1' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>See real-time intelligence</span>
                  </div>
                </div>

                {/* CTA */}
                <div
                  className="flex items-center gap-3 font-semibold group-hover:gap-5 transition-all"
                  style={{ color: '#FFFFFF' }}
                >
                  <span className="tracking-wider text-sm">START DEMO</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Back Link */}
          <div className="text-center mt-20">
            <Link
              href="/presentation"
              className="text-sm hover:opacity-60 transition-opacity tracking-wider inline-flex items-center gap-2"
              style={{ color: '#8E8A82' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              BACK TO PRESENTATION
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8" style={{ borderTop: '1px solid #E5E7EB' }}>
          <div className="max-w-7xl mx-auto px-12 text-center">
            <p className="text-sm tracking-wider" style={{ color: '#B4B1A9' }}>
              Built with Next.js 16 · Supabase · Claude AI · Gemini AI
            </p>
          </div>
        </footer>
      </div>
    </DesktopOnly>
  );
}
