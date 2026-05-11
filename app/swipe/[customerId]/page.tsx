/**
 * Style Swipes Page
 * Tinder-style card interface for discovering style preferences
 */

import { supabase } from '@/lib/supabase-client';
import type { SwipeStack } from '@/lib/types';
import SwipeUI from './SwipeUI';
import { cookies } from 'next/headers';

async function getSwipeStacks(customerId: string): Promise<SwipeStack[]> {
  // Check if this is a demo user
  const isDemoUser = customerId.startsWith('demo_');
  let targetGender: 'womenswear' | 'menswear' = 'womenswear'; // Default for demo users

  if (isDemoUser) {
    // For demo users, read gender from cookie
    const cookieStore = await cookies();
    const genderCookie = cookieStore.get('demo_gender')?.value as 'womens' | 'mens' | undefined;

    // Convert from localStorage format ('womens'/'mens') to database format ('womenswear'/'menswear')
    if (genderCookie === 'mens') {
      targetGender = 'menswear';
    } else {
      targetGender = 'womenswear'; // Default to womenswear
    }
  } else {
    // Get customer profile to filter by gender
    const { data: profile } = await supabase
      .from('customer_profiles')
      .select('gender')
      .eq('customer_id', customerId)
      .single();

    if (!profile) {
      return [];
    }

    targetGender = profile.gender;
  }

  // Get stacks matching customer gender
  const { data, error } = await supabase
    .from('swipe_stacks')
    .select('*')
    .eq('status', 'active')
    .eq('target_gender', targetGender)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stacks:', error);
    return [];
  }

  return data as SwipeStack[];
}

export default async function SwipePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const stacks = await getSwipeStacks(customerId);

  return <SwipeUI customerId={customerId} stacks={stacks} />;
}
