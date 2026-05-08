'use client';

/**
 * Interactive Demo - User Profile
 * Shows beautiful profile with radar chart
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProfileView from '@/app/personas/ProfileView';
import ProfileStyleLoader from '@/app/personas/components/ProfileStyleLoader';
import type { CustomerProfile } from '@/lib/types';

interface DemoUser {
  userId: string;
  name: string;
  createdAt: string;
}

interface ProfileData {
  totalSwipes: number;
  completedStacks: number;
  quizCompleted: boolean;
  topPillars: Array<{ name: string; weight: number }>;
  confidence: number;
}

export default function InteractiveDemoProfile() {
  const params = useParams();
  const userId = params?.userId as string;

  const [user, setUser] = useState<DemoUser | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    totalSwipes: 0,
    completedStacks: 0,
    quizCompleted: false,
    topPillars: [],
    confidence: 0,
  });

  useEffect(() => {
    // Load user from sessionStorage
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }

    // Load profile data from localStorage
    const loadProfile = () => {
      const profileKey = `demo_profile_${userId}`;
      const storedProfile = localStorage.getItem(profileKey);
      if (storedProfile) {
        setProfileData(JSON.parse(storedProfile));
      }
    };

    loadProfile();

    // Poll for updates every 2 seconds (in case user returns from swipes)
    const interval = setInterval(loadProfile, 2000);
    return () => clearInterval(interval);
  }, [userId]);

  const isColdStart = profileData.totalSwipes === 0 && !profileData.quizCompleted;

  // Convert profileData to CustomerProfile format for ProfileView
  const customerProfile: CustomerProfile | null = user ? {
    customer_id: userId,
    customer_name: user.name,
    pillars: profileData.topPillars.length > 0
      ? profileData.topPillars.reduce((acc, p) => {
          acc[p.name] = p.weight;
          return acc;
        }, {} as Record<string, number>)
      : {
          // Default balanced profile
          romantic: 11,
          bohemian: 11,
          casual: 11,
          classic: 11,
          minimal: 12,
          maximal: 11,
          fashionForward: 11,
          athletic: 11,
          utility: 11
        },
    confidence_score: profileData.confidence,
    style_personality: `${user.name} is just beginning their style journey. As you interact and swipe on looks you love, your unique style profile will emerge.`,
    memory: null,
    created_at: user.createdAt,
    updated_at: new Date().toISOString(),
  } : null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading your profile...</p>
          <Link href="/interactive/name" className="text-blue-600 hover:underline">
            Start over
          </Link>
        </div>
      </div>
    );
  }

  // Show cold start if no swipes yet
  if (isColdStart) {
    return (
      <div className="min-h-screen bg-[#FAF9F5]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/choose-path" className="text-2xl font-bold tracking-[3px]">
              NORDSTROM
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600">Welcome, {user.name}</span>
              <button
                onClick={() => {
                  if (confirm('Reset your demo and start over?')) {
                    sessionStorage.clear();
                    localStorage.clear();
                    window.location.href = '/interactive/name';
                  }
                }}
                className="text-red-500 hover:text-red-700"
              >
                Reset Demo
              </button>
              <Link href="/choose-path" className="text-gray-500 hover:text-gray-900">
                Exit Demo
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif font-light mb-4">
              Hello, {user.name}!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Let's discover your unique style
            </p>

            {/* Getting Started Options */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
              <div className="bg-white rounded-xl border-2 border-gray-200 p-8 hover:border-black hover:shadow-lg transition-all">
                <div className="text-4xl mb-4">📋</div>
                <h2 className="text-xl font-semibold mb-3">Take Style Quiz</h2>
                <p className="text-gray-600 mb-6">
                  Answer a few questions to help us understand your preferences
                </p>
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-600 px-6 py-3 rounded-lg font-medium cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>

              <Link
                href={`/swipe/${userId}`}
                className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-8 hover:border-purple-400 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">👗</div>
                <h2 className="text-xl font-semibold mb-3">Start Style Swipes</h2>
                <p className="text-gray-600 mb-6">
                  Swipe on looks you love to build your style profile
                </p>
                <div className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium text-center">
                  Start Swiping →
                </div>
              </Link>
            </div>

            {/* Why This Matters */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold mb-3">How Your Profile Builds</h3>
              <p className="text-sm text-gray-700">
                As you swipe and interact, we'll learn your preferences for colors, styles, occasions, and brands.
                Your profile updates in real-time, becoming more accurate with each interaction.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show beautiful ProfileView with radar chart after swipes
  return customerProfile ? (
    <ProfileStyleLoader>
      <ProfileView profile={customerProfile} />
    </ProfileStyleLoader>
  ) : null;
}
