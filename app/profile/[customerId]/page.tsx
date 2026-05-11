/**
 * Style Profile Page
 * Shows customer's personalized style intelligence
 */

import { supabase } from '@/lib/supabase-client';
import type { CustomerProfile } from '@/lib/types';
import Link from 'next/link';
import ProfileView from '@/components/profile/ProfileView';
import ProfileStyleLoader from '@/components/profile/ProfileStyleLoader';

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
      <div className="min-h-screen flex items-center justify-center bg-[#0C0C0D]">
        <div className="text-center text-white">
          <h1 className="text-2xl font-semibold mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-6">Could not load profile for customer: {customerId}</p>
          <Link href="/" className="text-blue-400 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProfileStyleLoader>
      <ProfileView profile={profile} />
    </ProfileStyleLoader>
  );
}
