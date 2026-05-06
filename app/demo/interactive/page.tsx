'use client';

/**
 * Interactive Demo - Entry Point
 * Multi-step journey: Name → Activities → Profile
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DesktopOnly from '@/components/DesktopOnly';

export default function InteractiveDemoPage() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'womens' | 'mens'>('womens');
  const router = useRouter();

  // Check if user already has a name and load saved gender preference
  useEffect(() => {
    const savedName = localStorage.getItem('demo_user_name');
    const savedGender = localStorage.getItem('demo_user_gender') as 'womens' | 'mens' | null;

    if (savedName) {
      // User already has profile, go to activities
      router.push('/demo/interactive/activities');
    }

    if (savedGender) {
      setGender(savedGender);
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      // Save name, gender, and create demo user
      localStorage.setItem('demo_user_name', name.trim());
      localStorage.setItem('demo_user_gender', gender);
      localStorage.setItem('demo_user_id', `demo_${Date.now()}`);
      router.push('/demo/interactive/activities');
    }
  };

  return (
    <DesktopOnly>
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ backgroundColor: '#FAF9F5' }}
      >
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-16">
            <h1
              className="text-6xl font-light mb-6 leading-tight"
              style={{
                fontFamily: 'ui-serif, Georgia, serif',
                color: '#0C0C0C'
              }}
            >
              Welcome to your<br />style journey
            </h1>
            <p
              className="text-xl font-light"
              style={{ color: '#8E8A82' }}
            >
              Let's build your personalized profile together
            </p>
          </div>

          {/* Name Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-3 tracking-wide"
                style={{ color: '#8E8A82' }}
              >
                What should we call you?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-6 py-4 border-2 rounded text-xl focus:outline-none transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  color: '#0C0C0C'
                }}
                placeholder="Enter your first name"
                autoFocus
                required
              />
            </div>

            {/* Gender Toggle */}
            <div>
              <label
                className="block text-sm font-medium mb-3 tracking-wide"
                style={{ color: '#8E8A82' }}
              >
                Shopping for
              </label>
              <div
                className="inline-flex rounded-lg p-1 w-full"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #E5E7EB'
                }}
              >
                <button
                  type="button"
                  onClick={() => setGender('womens')}
                  className="flex-1 px-6 py-3 rounded-md font-medium text-base transition-all"
                  style={{
                    backgroundColor: gender === 'womens' ? '#0C0C0C' : 'transparent',
                    color: gender === 'womens' ? '#FFFFFF' : '#8E8A82'
                  }}
                >
                  Womenswear
                </button>
                <button
                  type="button"
                  onClick={() => setGender('mens')}
                  className="flex-1 px-6 py-3 rounded-md font-medium text-base transition-all"
                  style={{
                    backgroundColor: gender === 'mens' ? '#0C0C0C' : 'transparent',
                    color: gender === 'mens' ? '#FFFFFF' : '#8E8A82'
                  }}
                >
                  Menswear
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-8 py-5 rounded font-semibold text-lg transition-all hover:scale-105"
              style={{
                backgroundColor: '#0C0C0C',
                color: '#FFFFFF'
              }}
            >
              Start Building My Profile
            </button>
          </form>

          {/* Info */}
          <div
            className="mt-16 p-8 rounded-xl"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB'
            }}
          >
            <p
              className="text-sm leading-relaxed"
              style={{ color: '#8E8A82' }}
            >
              You'll swipe through styled looks, answer a few questions, and watch as your personalized style profile takes shape in real-time. No account required - everything stays in your browser.
            </p>
          </div>

          {/* Back Link */}
          <div className="text-center mt-12">
            <a
              href="/demo"
              className="text-sm hover:opacity-60 transition-opacity tracking-wide"
              style={{ color: '#8E8A82' }}
            >
              ← Back to Demo Options
            </a>
          </div>
        </div>
      </div>
    </DesktopOnly>
  );
}
