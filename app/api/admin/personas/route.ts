/**
 * Admin API: Get all persona data with interaction breakdown
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET() {
  try {
    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('customer_profiles')
      .select('*')
      .order('confidence_score', { ascending: false });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // For each profile, get interaction breakdown
    const profilesWithInteractions = await Promise.all(
      profiles.map(async (profile) => {
        const { data: interactions } = await supabase
          .from('customer_interactions')
          .select('interaction_type, timestamp')
          .eq('customer_id', profile.customer_id);

        // Group by type
        const typeCounts: Record<string, number> = {};
        (interactions || []).forEach((int: any) => {
          typeCounts[int.interaction_type] = (typeCounts[int.interaction_type] || 0) + 1;
        });

        return {
          customer_id: profile.customer_id,
          customer_name: profile.customer_name,
          gender: profile.gender,
          pillars: profile.pillars,
          confidence_score: profile.confidence_score,
          sessions_processed: profile.sessions_processed,
          total_signals: profile.total_signals,
          last_interaction_at: profile.last_interaction_at,
          created_at: profile.created_at,
          interaction_breakdown: typeCounts,
          total_interactions: interactions?.length || 0,
        };
      })
    );

    return NextResponse.json({
      personas: profilesWithInteractions,
      count: profilesWithInteractions.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
