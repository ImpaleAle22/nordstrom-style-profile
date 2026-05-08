'use client';

/**
 * Interactive Demo - Name Entry
 * Collects user's name before creating their profile
 */

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NameEntryPage() {
  const [name, setName] = useState('');
  const [existingUser, setExistingUser] = useState<any>(null);
  const router = useRouter();

  // Check for existing demo user on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      setExistingUser(JSON.parse(stored));
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Create a simple user ID from the name
    const userId = `demo_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    // Store the demo user info in sessionStorage
    sessionStorage.setItem('demo_user', JSON.stringify({
      userId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    }));

    // Navigate to their cold start profile
    router.push(`/interactive/${userId}`);
  };

  // Handler to continue with existing user
  const handleContinue = () => {
    if (existingUser) {
      router.push(`/interactive/${existingUser.userId}`);
    }
  };

  // Handler to start fresh
  const handleStartFresh = () => {
    sessionStorage.clear();
    localStorage.clear();
    setExistingUser(null);
  };

  // If existing user, show locked view
  if (existingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif font-light mb-4">
              Welcome Back!
            </h1>
            <p className="text-lg text-gray-600">
              Your demo session is active
            </p>
          </div>

          {/* Locked Profile Display */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-8 shadow-lg mb-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Your Name
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-lg text-gray-700 flex items-center gap-2">
                <span>{existingUser.name}</span>
                <span className="ml-auto text-gray-400">🔒</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Gender Preference
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-lg text-gray-700 flex items-center gap-2">
                <span>Womenswear</span>
                <span className="ml-auto text-gray-400">🔒</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Demo defaults to womenswear</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleContinue}
                className="w-full bg-black text-white px-6 py-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors text-lg"
              >
                Continue to Activities →
              </button>

              <button
                onClick={handleStartFresh}
                className="w-full bg-white text-gray-700 px-6 py-4 rounded-lg font-semibold border-2 border-gray-300 hover:border-red-400 hover:text-red-600 transition-colors text-lg"
              >
                Clear Data & Start Over
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <h3 className="font-semibold mb-2 text-sm">Session Info</h3>
            <p className="text-xs text-gray-600">
              Created: {new Date(existingUser.createdAt).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              User ID: <code className="bg-white px-1 py-0.5 rounded text-xs">{existingUser.userId}</code>
            </p>
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <a href="/choose-path" className="text-sm text-gray-500 hover:text-gray-900">
              ← Back to demo selection
            </a>
          </div>
        </div>
      </div>
    );
  }

  // New user flow
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-light mb-4">
            Welcome to Your Style Journey
          </h1>
          <p className="text-lg text-gray-600">
            Let's start by getting to know you
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              What's your name?
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your first name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-lg"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-black text-white px-6 py-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
          >
            Continue →
          </button>
        </form>

        {/* What to Expect */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">What happens next:</p>
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
            <div>
              <div className="text-2xl mb-2">🎯</div>
              <p>Build your profile</p>
            </div>
            <div>
              <div className="text-2xl mb-2">👗</div>
              <p>Swipe on looks</p>
            </div>
            <div>
              <div className="text-2xl mb-2">✨</div>
              <p>See the magic</p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a href="/choose-path" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to demo selection
          </a>
        </div>
      </div>
    </div>
  );
}
