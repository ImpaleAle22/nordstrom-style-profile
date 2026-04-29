/**
 * Landing Page - Choose Your Path
 * Two demo options: Pre-built personas or interactive demo
 */

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-[3px]">NORDSTROM</h1>
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">
            Admin
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-serif font-light mb-6">
            Style Intelligence
          </h1>
          <p className="text-2xl text-gray-600 mb-3">
            Personalized fashion discovery powered by AI
          </p>
          <p className="text-lg text-gray-500">
            Building rich customer profiles through interactive style signals
          </p>
        </div>

        {/* Two Paths */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Path 1: Demo Personas */}
          <Link
            href="/personas"
            className="group bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-black hover:shadow-2xl transition-all"
          >
            <div className="mb-6">
              <div className="text-4xl mb-4">👥</div>
              <h2 className="text-2xl font-semibold mb-3">Explore Demo Personas</h2>
              <p className="text-gray-600 leading-relaxed">
                See how our system builds personalized style intelligence with 9 pre-built customer journeys
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>View complete style profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Explore swipe sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>See confidence scores</span>
              </div>
            </div>

            <div className="text-black font-medium group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
              View Personas
              <span>→</span>
            </div>
          </Link>

          {/* Path 2: Interactive Demo */}
          <Link
            href="/interactive"
            className="group bg-black text-white rounded-2xl border-2 border-black p-8 hover:shadow-2xl hover:scale-105 transition-all"
          >
            <div className="mb-6">
              <div className="text-4xl mb-4">✨</div>
              <h2 className="text-2xl font-semibold mb-3">Try Interactive Demo</h2>
              <p className="text-gray-300 leading-relaxed">
                Experience personalized style intelligence for yourself through our interactive swipe sessions
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-300 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Build your style profile</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Swipe through curated looks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>See real-time intelligence</span>
              </div>
            </div>

            <div className="text-white font-medium group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
              Start Demo
              <span>→</span>
            </div>
          </Link>
        </div>

        {/* Technology Stack */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500 mb-4">Built with</p>
          <div className="flex justify-center gap-6 text-sm text-gray-600">
            <span>Next.js 16</span>
            <span>•</span>
            <span>Supabase</span>
            <span>•</span>
            <span>Claude AI</span>
            <span>•</span>
            <span>Gemini AI</span>
          </div>
        </div>
      </main>
    </div>
  );
}
