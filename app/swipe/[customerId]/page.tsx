/**
 * Style Swipes Page
 * Tinder-style card interface for discovering style preferences
 */

import { supabase } from '@/lib/supabase-client';
import type { SwipeStack } from '@/lib/types';
import SwipeUI from './SwipeUI';

async function getSwipeStacks(customerId: string): Promise<SwipeStack[]> {
  // Get customer profile to filter by gender
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('gender')
    .eq('customer_id', customerId)
    .single();

  if (!profile) {
    return [];
  }

  // Get stacks matching customer gender
  const { data, error } = await supabase
    .from('swipe_stacks')
    .select('*')
    .eq('status', 'active')
    .eq('target_gender', profile.gender)
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
