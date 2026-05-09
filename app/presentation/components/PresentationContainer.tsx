'use client';

/**
 * Presentation Container - Nordstrom Brand Guidelines
 * 16:9 slide container with warm gray background
 */

import { useState } from 'react';
import Link from 'next/link';
import type { Slide } from '../slides/slideData';

interface PresentationContainerProps {
  slide: Slide;
  slideNumber: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  isFirstSlide: boolean;
  isLastSlide: boolean;
}

export default function PresentationContainer({
  slide,
  slideNumber,
  totalSlides,
  onPrevious,
  onNext,
  isFirstSlide,
  isLastSlide,
}: PresentationContainerProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF9F5' }}>
      {/* Header - Non-sticky */}
      <div className="px-12 py-4 flex justify-between items-center">
        {/* Logo - Left */}
        <img
          src="/logo-nordstrom.svg"
          alt="Nordstrom"
          className="h-6"
          style={{ filter: 'brightness(0)' }}
        />

        {/* Keyboard Hint - Center */}
        <div
          className="text-xs tracking-wider flex items-center gap-4 transition-colors"
          style={{ color: isHovering ? '#0C0C0C' : '#8E8A82' }}
        >
          <span>← →</span>
          <span>ARROW KEYS TO NAVIGATE</span>
        </div>

        {/* Slide Counter & Skip - Right */}
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium" style={{ color: '#8E8A82' }}>
            {slideNumber} / {totalSlides}
          </div>
          {!isLastSlide && (
            <Link
              href="/demo"
              className="text-xs hover:opacity-60 transition-opacity tracking-wider"
              style={{ color: '#8E8A82' }}
            >
              SKIP TO DEMO →
            </Link>
          )}
        </div>
      </div>

      {/* Main Slide Container - 16:9 Aspect Ratio */}
      <main className="flex-1 flex items-center justify-center px-12 py-2 relative">
        {/* Hidden text - visible only when viewport is narrow */}
        <div
          className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <p
            className="text-sm tracking-wide opacity-80 text-center max-w-md"
            style={{ color: '#C85A3B' }}
          >
            Best viewed on a wider screen, but content will scroll if cut off.
          </p>
        </div>

        {/* Previous Button - Left of slide */}
        <button
          onClick={onPrevious}
          disabled={isFirstSlide}
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isFirstSlide
              ? 'opacity-0 pointer-events-none'
              : 'hover:scale-110'
          }`}
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: '#0C0C0C' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Next Button - Right of slide */}
        <button
          onClick={onNext}
          disabled={isLastSlide}
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isLastSlide
              ? 'opacity-0 pointer-events-none'
              : 'hover:scale-110'
          }`}
          style={{
            backgroundColor: '#0C0C0C',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: '#FFFFFF' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div
          className={`w-full max-w-[1400px] rounded-xl overflow-hidden relative ${
            slide.layout === 'title' ? 'aspect-video' : ''
          }`}
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 10,
            ...(slide.layout === 'title' ? {} :
              slide.layout === 'demo' ? { height: '787.5px' } :
              {
                minHeight: 'min(787.5px, calc((100vw - 6rem) * 9 / 16))',
                maxHeight: 'calc(min(787.5px, calc((100vw - 6rem) * 9 / 16)) * 1.1)'
              }
            )
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Slide Content */}
          <div className="h-full flex flex-col">
            {slide.layout === 'title' ? (
              /* Title Slide - Full Screen Layout with Centered Content */
              <div className="relative h-full flex items-center justify-center">
                {/* Content (video background, overlay, bottom text) */}
                {slide.content}

                {/* Main Title - Centered on top of video */}
                <div className="relative text-center space-y-6" style={{ zIndex: 10 }}>
                  <h2
                    className="text-8xl font-light leading-tight tracking-tight"
                    style={{
                      fontFamily: 'ui-serif, Georgia, serif',
                      color: '#FFFFFF',
                      textShadow: '0 4px 24px rgba(0,0,0,0.5)'
                    }}
                  >
                    {slide.title}
                  </h2>
                  {slide.subtitle && (
                    <p
                      className="text-2xl font-light tracking-wide"
                      style={{
                        color: '#FFFFFF',
                        textShadow: '0 2px 12px rgba(0,0,0,0.5)'
                      }}
                    >
                      {slide.subtitle}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Content Slides - Standard Layout */
              <>
                {/* Slide Header */}
                <div className="px-16 pt-16 xl:pt-12 lg:pt-10 md:pt-8 pb-8">
                  <div className="border-l-4 pl-8" style={{ borderColor: '#0C0C0C' }}>
                    <h2
                      className="text-5xl font-light leading-tight"
                      style={{
                        fontFamily: 'ui-serif, Georgia, serif',
                        color: '#0C0C0C'
                      }}
                    >
                      {slide.title}
                    </h2>
                    {slide.subtitle && (
                      <p
                        className="text-xl mt-4 font-light"
                        style={{ color: '#8E8A82' }}
                      >
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Slide Body */}
                <div className={`flex-1 px-16 pb-16 ${slide.layout === 'demo' ? 'overflow-auto' : ''}`}>
                  {slide.layout === 'demo' ? (
                    <div className="pb-5">
                      {slide.content}
                    </div>
                  ) : (
                    <div className="h-full overflow-auto flex flex-col justify-center">
                      <div className="py-8">
                        {slide.content}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: '#EDECEB' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(slideNumber / totalSlides) * 100}%`,
                backgroundColor: '#0C0C0C'
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
