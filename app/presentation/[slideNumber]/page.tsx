'use client';

/**
 * Presentation Slide Page - URL-based navigation
 * Each slide has its own route for deep linking and back button support
 */

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DesktopOnly from '@/components/DesktopOnly';
import PresentationContainer from '../components/PresentationContainer';
import { slides } from '../slides/slideData';

export default function PresentationSlidePage() {
  const params = useParams();
  const router = useRouter();
  const slideNumber = parseInt(params.slideNumber as string, 10);

  // Redirect if invalid slide number
  useEffect(() => {
    if (isNaN(slideNumber) || slideNumber < 1 || slideNumber > slides.length) {
      router.push('/presentation/1');
    }
  }, [slideNumber, router]);

  if (isNaN(slideNumber) || slideNumber < 1 || slideNumber > slides.length) {
    return null;
  }

  const currentSlide = slides[slideNumber - 1];
  const isFirstSlide = slideNumber === 1;
  const isLastSlide = slideNumber === slides.length;

  const handlePrevious = () => {
    if (!isFirstSlide) {
      router.push(`/presentation/${slideNumber - 1}`);
    }
  };

  const handleNext = () => {
    if (!isLastSlide) {
      router.push(`/presentation/${slideNumber + 1}`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        router.push(`/presentation/${Math.max(1, slideNumber - 1)}`);
      } else if (e.key === 'ArrowRight') {
        router.push(`/presentation/${Math.min(slides.length, slideNumber + 1)}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideNumber, router]);

  return (
    <DesktopOnly>
      <PresentationContainer
        slide={currentSlide}
        slideNumber={slideNumber}
        totalSlides={slides.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isFirstSlide={isFirstSlide}
        isLastSlide={isLastSlide}
      />
    </DesktopOnly>
  );
}
