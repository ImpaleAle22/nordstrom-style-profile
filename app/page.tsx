/**
 * Home Page - Customer Selection
 * Demo page showing available customer profiles
 */

import { supabase } from '@/lib/supabase-client';
import type { CustomerProfile } from '@/lib/types';
import Link from 'next/link';

async function getCustomerProfiles(): Promise<CustomerProfile[]> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .order('customer_name');

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data as CustomerProfile[];
}

export default async function Home() {
  const profiles = await getCustomerProfiles();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold tracking-[3px]">NORDSTROM</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-light mb-4">
            Style Profile Demo
          </h1>
          <p className="text-xl text-gray-600">
            Personalized style intelligence powered by AI
          </p>
        </div>

        {/* Customer List */}
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => {
            // Get top 2 pillars
            const pillarEntries = Object.entries(profile.pillars);
            const topPillars = pillarEntries
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 2);

            return (
              <Link
                key={profile.customer_id}
                href={`/profile/${profile.customer_id}`}
                className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-2">
                  {profile.customer_name}
                </h3>
                <p className="text-gray-600 mb-3">
                  {topPillars[0] && topPillars[1]
                    ? `${topPillars[0][0]} / ${topPillars[1][0]}`
                    : 'Building profile...'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {profile.gender}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {profile.sessions_processed} sessions
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {(profile.confidence_score * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No customer profiles found.</p>
            <p className="text-sm text-gray-500">
              Run the import-customer-profiles.py script to load demo data.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
