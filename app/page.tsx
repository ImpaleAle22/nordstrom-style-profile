'use client';

/**
 * Password Gate - Landing Page
 * Simple shared password for Nordstrom leadership
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function PasswordGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Simple shared password
    if (password === 'nordstrom2026' || password === 'demo') {
      // Set secure cookie that middleware can check
      document.cookie = 'demo_access=granted; path=/; max-age=86400; SameSite=Strict';
      // Also store in sessionStorage for client-side checks
      sessionStorage.setItem('demo_access', 'granted');
      router.push('/presentation/1');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ backgroundColor: '#FAF9F5' }}
    >
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-12">
          <img
            src="https://n.nordstrommedia.com/alias/nordstrom-logo.svg"
            alt="Nordstrom"
            className="h-12 mx-auto mb-8"
            style={{ filter: 'brightness(0)' }}
          />
          <div
            className="h-px mx-auto mb-8"
            style={{
              maxWidth: '200px',
              background: 'linear-gradient(to right, transparent, #DBDBD0, transparent)'
            }}
          />
          <p
            className="text-xl font-light"
            style={{ color: '#8E8A82' }}
          >
            Style Engine Demo
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: '#8E8A82' }}
            >
              Access Code
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 border rounded transition-colors focus:outline-none`}
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: error ? '#EC3B3B' : '#E5E7EB',
                color: '#0C0C0C',
                borderWidth: '2px'
              }}
              placeholder="Enter access code"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm" style={{ color: '#EC3B3B' }}>
                Incorrect access code. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 rounded font-semibold transition-all hover:scale-105"
            style={{
              backgroundColor: '#0C0C0C',
              color: '#FFFFFF'
            }}
          >
            Enter Demo
          </button>
        </form>

        {/* Footer hint */}
        <div className="mt-12 text-center">
          <p className="text-xs" style={{ color: '#B4B1A9' }}>
            This is a private demonstration
          </p>
        </div>
      </div>
    </div>
  );
}
