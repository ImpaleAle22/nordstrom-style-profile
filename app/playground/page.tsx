'use client';

/**
 * Playground - Entry Point
 * Multi-step journey: Name → Activities → Profile
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DesktopOnly from '@/components/DesktopOnly';

export default function PlaygroundPage() {
  const [name, setName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [showInitialField, setShowInitialField] = useState(false);
  const [gender, setGender] = useState<'womens' | 'mens'>('womens');
  const [existingUser, setExistingUser] = useState<{ name: string; gender: 'womens' | 'mens'; id: string } | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const router = useRouter();

  // Check if user already has a name and load saved gender preference
  useEffect(() => {
    const savedName = localStorage.getItem('demo_user_name');
    const savedGender = localStorage.getItem('demo_user_gender') as 'womens' | 'mens' | null;
    const savedId = localStorage.getItem('demo_user_id');

    if (savedName) {
      // Show existing user instead of auto-redirecting
      setExistingUser({
        name: savedName,
        gender: savedGender || 'womens',
        id: savedId || 'unknown'
      });
    }

    if (savedGender) {
      setGender(savedGender);
    }
  }, []);

  // Check if name exists in database
  const checkNameExists = async (checkName: string) => {
    setIsCheckingName(true);
    try {
      const response = await fetch(`/api/profile/check-name?name=${encodeURIComponent(checkName)}`);
      const { exists } = await response.json();
      setShowInitialField(exists);
      setIsCheckingName(false);
      return exists;
    } catch (error) {
      console.error('Error checking name:', error);
      setIsCheckingName(false);
      return false;
    }
  };

  // Debounced name check
  useEffect(() => {
    if (name.trim().length >= 2) {
      const timer = setTimeout(() => {
        checkNameExists(name.trim());
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowInitialField(false);
    }
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Check if we need initial
    const nameExists = await checkNameExists(name.trim());
    if (nameExists && !lastInitial.trim()) {
      // Name exists but no initial provided - stay on form
      return;
    }

    // Format display name
    const displayName = lastInitial.trim()
      ? `${name.trim()} ${lastInitial.trim().toUpperCase()}.`
      : name.trim();

    // Save name, gender, and create demo user
    localStorage.setItem('demo_user_name', displayName);
    localStorage.setItem('demo_user_gender', gender);
    localStorage.setItem('demo_user_id', `demo_${Date.now()}`);

    // Also save gender to cookie so server-side swipe page can read it
    document.cookie = `demo_gender=${gender}; path=/; max-age=86400; SameSite=Strict`;

    router.push('/playground/activities');
  };

  const handleContinue = () => {
    router.push('/playground/activities');
  };

  const handleStartFresh = () => {
    localStorage.clear();
    sessionStorage.clear();
    setExistingUser(null);
  };

  // If existing user, show locked view
  if (existingUser) {
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
                Welcome back!
              </h1>
              <p
                className="text-xl font-light"
                style={{ color: '#8E8A82' }}
              >
                Your demo session is active
              </p>
            </div>

            {/* Locked Profile Display */}
            <div
              className="p-8 rounded-xl mb-8"
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #E5E7EB'
              }}
            >
              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-3 tracking-wide"
                  style={{ color: '#8E8A82' }}
                >
                  Your Name
                </label>
                <div
                  className="w-full px-6 py-4 rounded text-xl flex items-center justify-between"
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '2px solid #E5E7EB',
                    color: '#0C0C0C'
                  }}
                >
                  <span>{existingUser.name}</span>
                  <span style={{ color: '#8E8A82' }}>🔒</span>
                </div>
              </div>

              <div className="mb-8">
                <label
                  className="block text-sm font-medium mb-3 tracking-wide"
                  style={{ color: '#8E8A82' }}
                >
                  Shopping for
                </label>
                <div
                  className="w-full px-6 py-4 rounded text-xl flex items-center justify-between"
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '2px solid #E5E7EB',
                    color: '#0C0C0C'
                  }}
                >
                  <span>{existingUser.gender === 'womens' ? 'Womenswear' : 'Menswear'}</span>
                  <span style={{ color: '#8E8A82' }}>🔒</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleContinue}
                  className="w-full px-8 py-5 rounded font-semibold text-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#0C0C0C',
                    color: '#FFFFFF'
                  }}
                >
                  Continue to Activities →
                </button>

                <button
                  onClick={handleStartFresh}
                  className="w-full px-8 py-5 rounded font-semibold text-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    border: '2px solid #E5E7EB'
                  }}
                >
                  Clear Data & Start Over
                </button>
              </div>
            </div>

            {/* Session Info */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB'
              }}
            >
              <p
                className="text-xs font-medium mb-2"
                style={{ color: '#8E8A82' }}
              >
                SESSION INFO
              </p>
              <p
                className="text-xs"
                style={{ color: '#8E8A82' }}
              >
                User ID: <code
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: '#F9FAFB',
                    color: '#0C0C0C'
                  }}
                >{existingUser.id}</code>
              </p>
            </div>

            {/* Back Link */}
            <div className="text-center mt-12">
              <a
                href="/choose-path"
                className="text-sm hover:opacity-60 transition-opacity tracking-wide"
                style={{ color: '#8E8A82' }}
              >
                ← Back to Choose Path
              </a>
            </div>
          </div>
        </div>
      </DesktopOnly>
    );
  }

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
              {isCheckingName && (
                <p className="text-xs mt-2" style={{ color: '#8E8A82' }}>
                  Checking availability...
                </p>
              )}
            </div>

            {/* Last Initial Field (appears if name exists) */}
            {showInitialField && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label
                  htmlFor="initial"
                  className="block text-sm font-medium mb-3 tracking-wide"
                  style={{ color: '#8E8A82' }}
                >
                  Popular name! Can you add a last name initial?
                </label>
                <input
                  id="initial"
                  type="text"
                  value={lastInitial}
                  onChange={(e) => setLastInitial(e.target.value.slice(0, 1))}
                  className="w-full px-6 py-4 border-2 rounded text-xl focus:outline-none transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: showInitialField && !lastInitial.trim() ? '#FCA5A5' : '#E5E7EB',
                    color: '#0C0C0C'
                  }}
                  placeholder="e.g., C"
                  maxLength={1}
                  required={showInitialField}
                />
                {lastInitial && (
                  <p className="text-sm mt-2" style={{ color: '#0C0C0C' }}>
                    You'll appear as: <strong>{name} {lastInitial.toUpperCase()}.</strong>
                  </p>
                )}
              </div>
            )}

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
              disabled={showInitialField && !lastInitial.trim()}
              className="w-full px-8 py-5 rounded font-semibold text-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
              href="/choose-path"
              className="text-sm hover:opacity-60 transition-opacity tracking-wide"
              style={{ color: '#8E8A82' }}
            >
              ← Back to Choose Path
            </a>
          </div>
        </div>
      </div>
    </DesktopOnly>
  );
}
