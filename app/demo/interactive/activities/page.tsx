'use client';

/**
 * Interactive Demo - Activities Hub
 * User can perform multiple activities and watch their profile evolve in real-time
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DesktopOnly from '@/components/DesktopOnly';

interface DemoProfile {
  name: string;
  userId: string;
  pillars: Record<string, number>;
  confidenceScore: number;
  sessionsCompleted: number;
  totalSwipes: number;
  lastActivity?: string;
}

export default function ActivitiesHubPage() {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load demo profile from localStorage
  useEffect(() => {
    const name = localStorage.getItem('demo_user_name');
    const userId = localStorage.getItem('demo_user_id');

    if (!name || !userId) {
      // No profile yet, redirect to name entry
      router.push('/demo/interactive');
      return;
    }

    // Load or initialize profile
    const savedProfile = localStorage.getItem(`demo_profile_${userId}`);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      // Initialize new profile
      const newProfile: DemoProfile = {
        name,
        userId,
        pillars: {},
        confidenceScore: 0,
        sessionsCompleted: 0,
        totalSwipes: 0,
      };
      localStorage.setItem(`demo_profile_${userId}`, JSON.stringify(newProfile));
      setProfile(newProfile);
    }

    setIsLoading(false);
  }, [router]);

  // Refresh profile when window gains focus (after returning from activity)
  useEffect(() => {
    const handleFocus = () => {
      const userId = localStorage.getItem('demo_user_id');
      if (userId) {
        const savedProfile = localStorage.getItem(`demo_profile_${userId}`);
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (isLoading || !profile) {
    return (
      <DesktopOnly>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4" />
            <p>Loading your profile...</p>
          </div>
        </div>
      </DesktopOnly>
    );
  }

  const hasActivity = profile.sessionsCompleted > 0;
  const topPillars = Object.entries(profile.pillars)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <DesktopOnly>
      <div className="min-h-screen" style={{ backgroundColor: '#FAF9F5' }}>
        {/* Logo - Standalone top left */}
        <div className="fixed top-8 left-12 z-50">
          <img
            src="https://n.nordstrommedia.com/alias/nordstrom-logo.svg"
            alt="Nordstrom"
            className="h-6"
            style={{ filter: 'brightness(0)' }}
          />
        </div>

        {/* Back Link - Top right */}
        <div className="fixed top-8 right-12 z-50">
          <Link
            href="/demo"
            className="text-xs hover:opacity-60 transition-opacity tracking-wider"
            style={{ color: '#8E8A82' }}
          >
            ← BACK TO DEMO
          </Link>
        </div>

        <main className="max-w-7xl mx-auto px-12 py-32">
          {/* Welcome Section */}
          <div className="mb-16">
            <h2
              className="text-5xl font-light mb-4"
              style={{
                fontFamily: 'ui-serif, Georgia, serif',
                color: '#0C0C0C'
              }}
            >
              Welcome back, {profile.name}
            </h2>
            <p
              className="text-xl font-light"
              style={{ color: '#8E8A82' }}
            >
              {hasActivity
                ? 'Your style profile is evolving. Continue exploring to refine your recommendations.'
                : 'Start building your personalized style profile by completing activities below.'}
            </p>
          </div>

          {/* Profile Overview */}
          {hasActivity ? (
            <div
              className="rounded-xl p-10 mb-16"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <h3
                className="text-2xl font-light mb-8"
                style={{
                  fontFamily: 'ui-serif, Georgia, serif',
                  color: '#0C0C0C'
                }}
              >
                Your Style Profile
              </h3>

              <div className="grid md:grid-cols-3 gap-8 mb-8">
                {/* Confidence Score */}
                <div>
                  <p
                    className="text-sm font-medium mb-2 tracking-wide"
                    style={{ color: '#8E8A82' }}
                  >
                    CONFIDENCE
                  </p>
                  <div className="flex items-end gap-2 mb-3">
                    <p
                      className="text-4xl font-light"
                      style={{ color: '#0C0C0C' }}
                    >
                      {Math.round(profile.confidenceScore * 100)}
                    </p>
                    <p
                      className="text-xl mb-1"
                      style={{ color: '#B4B1A9' }}
                    >
                      %
                    </p>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#EDECEB' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${profile.confidenceScore * 100}%`,
                        backgroundColor: '#0C0C0C'
                      }}
                    />
                  </div>
                </div>

                {/* Sessions Completed */}
                <div>
                  <p
                    className="text-sm font-medium mb-2 tracking-wide"
                    style={{ color: '#8E8A82' }}
                  >
                    SESSIONS
                  </p>
                  <p
                    className="text-4xl font-light"
                    style={{ color: '#0C0C0C' }}
                  >
                    {profile.sessionsCompleted}
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: '#8E8A82' }}
                  >
                    {profile.sessionsCompleted === 1 ? 'activity completed' : 'activities completed'}
                  </p>
                </div>

                {/* Total Swipes */}
                <div>
                  <p
                    className="text-sm font-medium mb-2 tracking-wide"
                    style={{ color: '#8E8A82' }}
                  >
                    STYLE SIGNALS
                  </p>
                  <p
                    className="text-4xl font-light"
                    style={{ color: '#0C0C0C' }}
                  >
                    {profile.totalSwipes}
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: '#8E8A82' }}
                  >
                    {profile.totalSwipes === 1 ? 'signal recorded' : 'signals recorded'}
                  </p>
                </div>
              </div>

              {/* Style Pillars */}
              {topPillars.length > 0 && (
                <div>
                  <p
                    className="text-sm font-medium mb-4 tracking-wide"
                    style={{ color: '#8E8A82' }}
                  >
                    TOP STYLE PILLARS
                  </p>
                  <div className="space-y-4">
                    {topPillars.map(([pillar, weight]) => (
                      <div key={pillar}>
                        <div className="flex justify-between mb-2">
                          <span
                            className="font-medium capitalize"
                            style={{ color: '#0C0C0C' }}
                          >
                            {pillar}
                          </span>
                          <span style={{ color: '#8E8A82' }}>{weight}%</span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: '#EDECEB' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${weight}%`,
                              backgroundColor: '#0C0C0C'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="rounded-xl p-10 mb-16"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB'
              }}
            >
              <div className="text-center max-w-2xl mx-auto">
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: '#EDECEB' }}
                >
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: '#0C0C0C' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3
                  className="text-2xl font-light mb-4"
                  style={{
                    fontFamily: 'ui-serif, Georgia, serif',
                    color: '#0C0C0C'
                  }}
                >
                  Your profile is ready
                </h3>
                <p
                  className="text-lg"
                  style={{ color: '#8E8A82' }}
                >
                  Complete your first activity below to start building your personalized style intelligence.
                </p>
              </div>
            </div>
          )}

          {/* Activities Grid */}
          <div>
            <h3 className="text-3xl font-serif font-light text-gray-900 mb-8">
              Build Your Profile
            </h3>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Activity 1: Style Swipes */}
              <Link
                href={`/swipe/${profile.userId}`}
                className="group bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105"
              >
                <div className="p-10">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>

                  {/* Title */}
                  <h4 className="text-3xl font-serif font-light text-gray-900 mb-4">
                    Style Swipes
                  </h4>

                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Swipe through curated outfit looks. Like what resonates, skip what doesn't. Each swipe teaches the system more about your style preferences.
                  </p>

                  {/* Stats */}
                  {profile.totalSwipes > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">{profile.totalSwipes}</span> swipes completed
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center gap-3 text-gray-900 font-medium group-hover:gap-5 transition-all">
                    <span className="tracking-wide">{profile.totalSwipes > 0 ? 'Continue Swiping' : 'Start Swiping'}</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Activity 2: Style Quiz (Coming Soon) */}
              <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl shadow-lg overflow-hidden opacity-60">
                <div className="absolute top-6 right-6 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full">
                  <p className="text-xs font-medium text-gray-600 tracking-wider">COMING SOON</p>
                </div>

                <div className="p-10">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  {/* Title */}
                  <h4 className="text-3xl font-serif font-light text-gray-700 mb-4">
                    Style Quiz
                  </h4>

                  {/* Description */}
                  <p className="text-gray-500 leading-relaxed">
                    Answer questions about your lifestyle, preferences, and fashion goals to accelerate your profile building.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* View Full Profile CTA */}
          {hasActivity && (
            <div className="mt-16 text-center">
              <button
                onClick={() => {
                  // For now, just show an alert. In production, would navigate to a full profile view
                  alert('Full profile view coming soon! For now, you can see your evolving stats above.');
                }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-900 transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>View Full Profile</span>
              </button>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-12 text-center">
            <p className="text-sm text-gray-500 tracking-wider">
              All data stored locally in your browser
            </p>
          </div>
        </footer>
      </div>
    </DesktopOnly>
  );
}
