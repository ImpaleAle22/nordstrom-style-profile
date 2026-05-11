'use client';

/**
 * Playground - Activities Hub
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

export default function PlaygroundActivitiesPage() {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load demo profile from localStorage
  useEffect(() => {
    const name = localStorage.getItem('demo_user_name');
    const userId = localStorage.getItem('demo_user_id');

    if (!name || !userId) {
      // No profile yet, redirect to name entry
      router.push('/playground');
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
            src="/logo-nordstrom.svg"
            alt="Nordstrom"
            className="h-6"
            style={{ filter: 'brightness(0)' }}
          />
        </div>

        <main className="max-w-7xl mx-auto px-12 py-32">
          {/* Welcome Section */}
          <div className="mb-16 text-center">
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

          {/* View Profile Button - Show after user has swipes */}
          {hasActivity && (
            <div className="mt-12 text-center">
              <Link
                href="/playground/profile"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: '#0C0C0C',
                  color: '#FFFFFF'
                }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                View My Style Profile
              </Link>
            </div>
          )}

        </main>
      </div>
    </DesktopOnly>
  );
}
