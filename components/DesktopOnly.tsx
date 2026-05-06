'use client';

/**
 * Desktop Only Warning
 * Shows message on small screens/mobile devices
 */

import { useEffect, useState } from 'react';

export default function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkViewport = () => {
      // Minimum 1024px width for comfortable viewing
      setIsDesktop(window.innerWidth >= 1024);
    };

    // Check on mount
    checkViewport();

    // Check on resize
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-8">🖥️</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Desktop Experience Required
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            This demo is designed for desktop browsers with a minimum width of 1024px.
          </p>
          <div className="bg-white/10 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-400 mb-2">To view this demo:</p>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Open on a desktop or laptop computer</li>
              <li>• Maximize your browser window</li>
              <li>• Ensure viewport is at least 1024px wide</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
