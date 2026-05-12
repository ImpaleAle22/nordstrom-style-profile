/**
 * Profile Style Loader
 * Injects CSS before component hydration to prevent flash of unstyled content
 */

'use client';

import { useEffect, useState } from 'react';

export default function ProfileStyleLoader({ children }: { children: React.ReactNode }) {
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    // Reset body styles that interfere with profile UI
    const originalBodyStyles = {
      minHeight: document.body.style.minHeight,
      display: document.body.style.display,
      flexDirection: document.body.style.flexDirection,
    };

    document.body.style.minHeight = '';
    document.body.style.display = '';
    document.body.style.flexDirection = '';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    // Don't set overflow: hidden - it blocks page scrolling

    // Check if styles are already loaded
    const existingStyles = document.querySelectorAll('link[href*="profile-ui"]');
    if (existingStyles.length > 0) {
      setStylesLoaded(true);
      return () => {
        // Restore body styles on unmount
        document.body.style.minHeight = originalBodyStyles.minHeight;
        document.body.style.display = originalBodyStyles.display;
        document.body.style.flexDirection = originalBodyStyles.flexDirection;
        document.body.style.overflow = '';
      };
    }

    const cssFiles = [
      '/profile-ui/styles.css',
      '/profile-ui/nordstrom-nav.css'
    ];

    let loadedCount = 0;
    const totalAssets = cssFiles.length + 1; // CSS files + radar chart script

    // Load CSS
    cssFiles.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => {
        loadedCount++;
        if (loadedCount === totalAssets) {
          setTimeout(() => setStylesLoaded(true), 50);
        }
      };
      link.onerror = () => {
        console.error(`Failed to load ${href}`);
        loadedCount++;
        if (loadedCount === totalAssets) {
          setStylesLoaded(true);
        }
      };
      document.head.appendChild(link);
    });

    // Load radar chart script
    const script = document.createElement('script');
    script.src = '/profile-ui/style-radar-chart.js';
    script.async = false;
    script.onload = () => {
      loadedCount++;
      if (loadedCount === totalAssets) {
        setTimeout(() => setStylesLoaded(true), 50);
      }
    };
    script.onerror = () => {
      console.error('Failed to load radar chart script');
      loadedCount++;
      if (loadedCount === totalAssets) {
        setStylesLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      // Restore body styles on unmount
      document.body.style.minHeight = originalBodyStyles.minHeight;
      document.body.style.display = originalBodyStyles.display;
      document.body.style.flexDirection = originalBodyStyles.flexDirection;
      document.body.style.overflow = '';
    };
  }, []);

  if (!stylesLoaded) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0C0C0D',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Loading profile styles...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
