'use client';

/**
 * Presentation Root - Redirects to slide 1
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PresentationPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/presentation/1');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-black rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Loading presentation...</p>
      </div>
    </div>
  );
}
