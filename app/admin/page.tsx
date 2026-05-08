'use client';

/**
 * Admin Landing Page
 * Main hub for all admin management tools
 */

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F5' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1
                className="text-3xl font-light mb-1"
                style={{
                  fontFamily: 'ui-serif, Georgia, serif',
                  color: '#0C0C0C'
                }}
              >
                Admin Dashboard
              </h1>
              <p className="text-sm" style={{ color: '#8E8A82' }}>
                Manage recipes, content, and experiences
              </p>
            </div>
            <Link
              href="/"
              className="text-sm hover:opacity-60 transition-opacity"
              style={{ color: '#8E8A82' }}
            >
              ← Back to Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Tile 1: Recipe Manager */}
          <Link
            href="/admin/recipes"
            className="group block bg-white rounded-2xl border-2 transition-all hover:shadow-xl hover:scale-105"
            style={{ borderColor: '#E5E7EB' }}
          >
            <div className="p-8">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: '#EEF2FF' }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: '#4F46E5' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h3
                className="text-2xl font-light mb-3"
                style={{
                  fontFamily: 'ui-serif, Georgia, serif',
                  color: '#0C0C0C'
                }}
              >
                Recipe Manager
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#8E8A82' }}>
                Create and manage outfit recipes, campaign content, and personalized shopping edits
              </p>

              {/* Arrow */}
              <div className="flex items-center text-sm font-medium group-hover:gap-3 transition-all" style={{ color: '#0C0C0C' }}>
                <span>Manage Recipes</span>
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Tile 2: Lifestyle Images */}
          <Link
            href="/admin/lifestyle-images"
            className="group block bg-white rounded-2xl border-2 transition-all hover:shadow-xl hover:scale-105"
            style={{ borderColor: '#E5E7EB' }}
          >
            <div className="p-8">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: '#D97706' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h3
                className="text-2xl font-light mb-3"
                style={{
                  fontFamily: 'ui-serif, Georgia, serif',
                  color: '#0C0C0C'
                }}
              >
                Lifestyle Images
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#8E8A82' }}>
                Import, tag, and manage lifestyle imagery for swipe cards and style inspiration
              </p>

              {/* Arrow */}
              <div className="flex items-center text-sm font-medium group-hover:gap-3 transition-all" style={{ color: '#0C0C0C' }}>
                <span>Manage Images</span>
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Tile 3: Swipe Stacks */}
          <Link
            href="/admin/swipe-stacks"
            className="group block bg-white rounded-2xl border-2 transition-all hover:shadow-xl hover:scale-105"
            style={{ borderColor: '#E5E7EB' }}
          >
            <div className="p-8">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: '#FCE7F3' }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: '#BE185D' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>

              {/* Title */}
              <h3
                className="text-2xl font-light mb-3"
                style={{
                  fontFamily: 'ui-serif, Georgia, serif',
                  color: '#0C0C0C'
                }}
              >
                Swipe Stacks
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#8E8A82' }}>
                Create and manage card stacks for the swipe experience and style discovery
              </p>

              {/* Arrow */}
              <div className="flex items-center text-sm font-medium group-hover:gap-3 transition-all" style={{ color: '#0C0C0C' }}>
                <span>Manage Stacks</span>
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Additional Tools */}
        <div className="mt-12">
          <h2
            className="text-xl font-light mb-6"
            style={{
              fontFamily: 'ui-serif, Georgia, serif',
              color: '#0C0C0C'
            }}
          >
            Additional Tools
          </h2>

          <div className="grid md:grid-cols-5 gap-4">
            <Link
              href="/admin/products"
              className="p-4 bg-white rounded-lg border hover:border-gray-400 transition-all"
              style={{ borderColor: '#E5E7EB' }}
            >
              <p className="font-medium text-sm" style={{ color: '#0C0C0C' }}>
                Products
              </p>
              <p className="text-xs mt-1" style={{ color: '#8E8A82' }}>
                Product catalog
              </p>
            </Link>

            <Link
              href="/admin/vision-import"
              className="p-4 bg-white rounded-lg border hover:border-gray-400 transition-all"
              style={{ borderColor: '#E5E7EB' }}
            >
              <p className="font-medium text-sm" style={{ color: '#0C0C0C' }}>
                Vision Import
              </p>
              <p className="text-xs mt-1" style={{ color: '#8E8A82' }}>
                AI photo analysis
              </p>
            </Link>

            <Link
              href="/admin/analytics"
              className="p-4 bg-white rounded-lg border hover:border-gray-400 transition-all"
              style={{ borderColor: '#E5E7EB' }}
            >
              <p className="font-medium text-sm" style={{ color: '#0C0C0C' }}>
                Analytics
              </p>
              <p className="text-xs mt-1" style={{ color: '#8E8A82' }}>
                Usage insights
              </p>
            </Link>

            <Link
              href="/admin/clip-search"
              className="p-4 bg-white rounded-lg border hover:border-gray-400 transition-all"
              style={{ borderColor: '#E5E7EB' }}
            >
              <p className="font-medium text-sm" style={{ color: '#0C0C0C' }}>
                CLIP Search
              </p>
              <p className="text-xs mt-1" style={{ color: '#8E8A82' }}>
                Visual search
              </p>
            </Link>

            <Link
              href="/admin/test-tagging"
              className="p-4 bg-white rounded-lg border hover:border-gray-400 transition-all"
              style={{ borderColor: '#E5E7EB' }}
            >
              <p className="font-medium text-sm" style={{ color: '#0C0C0C' }}>
                Test Tagging
              </p>
              <p className="text-xs mt-1" style={{ color: '#8E8A82' }}>
                AI tagging test
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
