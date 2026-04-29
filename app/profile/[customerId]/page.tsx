/**
 * Style Profile Page
 * Shows customer's personalized style intelligence
 */

import { supabase } from '@/lib/supabase-client';
import type { CustomerProfile } from '@/lib/types';
import Link from 'next/link';

async function getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('customer_id', customerId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as CustomerProfile;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const profile = await getCustomerProfile(customerId);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-6">Could not load profile for customer: {customerId}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Get top pillars
  const pillarEntries = Object.entries(profile.pillars);
  const topPillars = pillarEntries
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  // Confidence level
  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return 'Strong';
    if (score >= 0.6) return 'Moderate';
    if (score >= 0.3) return 'Building';
    return 'Emerging';
  };

  const confidenceLevel = getConfidenceLevel(profile.confidence_score);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-[3px]">
            NORDSTROM
          </Link>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="hover:opacity-60">Home</Link>
            <Link href={`/profile/${customerId}`} className="font-semibold">Your Style</Link>
            <Link href={`/swipe/${customerId}`} className="hover:opacity-60">Style Swipes</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 py-12">
        {/* Profile Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-light mb-2">
            {profile.customer_name}
          </h1>
          <p className="text-xl text-gray-600">
            {topPillars[0] && topPillars[1]
              ? `${topPillars[0][0]} / ${topPillars[1][0]}`
              : 'Your Style Profile'}
          </p>
        </div>

        {/* Style Personality */}
        {profile.style_personality && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <h2 className="text-lg font-semibold mb-4">Your Style</h2>
            <p className="text-gray-700 leading-relaxed">
              {profile.style_personality}
            </p>
          </div>
        )}

        {/* Style Pillars */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-lg font-semibold mb-6">Style Breakdown</h2>
          <div className="space-y-4">
            {topPillars.map(([pillar, weight]) => (
              <div key={pillar}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium capitalize">{pillar}</span>
                  <span className="text-gray-600">{weight}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all"
                    style={{ width: `${weight}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Confidence */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-lg font-semibold mb-4">Profile Confidence</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{confidenceLevel}</span>
                <span className="text-gray-600">
                  {(profile.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full"
                  style={{ width: `${profile.confidence_score * 100}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Based on {profile.sessions_processed} session
            {profile.sessions_processed !== 1 ? 's' : ''} and {profile.total_signals} signal
            {profile.total_signals !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Semantic Memory */}
        {profile.semantic_memory && profile.semantic_memory.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <h2 className="text-lg font-semibold mb-4">What We Know About You</h2>
            <div className="space-y-4">
              {profile.semantic_memory.slice(0, 3).map((memory) => (
                <div key={memory.id} className="border-l-4 border-gray-200 pl-4">
                  <p className="text-gray-700">{memory.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {memory.type === 'stated' ? 'You said' : memory.type === 'inferred' ? 'We noticed' : 'Life context'} •
                    Confidence: {(memory.weight * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href={`/swipe/${customerId}`}
            className="flex-1 bg-black text-white px-6 py-3 rounded-lg text-center font-medium hover:bg-gray-900 transition-colors"
          >
            Continue Style Swipes
          </Link>
          <button className="flex-1 bg-white border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Update Preferences
          </button>
        </div>
      </main>
    </div>
  );
}
