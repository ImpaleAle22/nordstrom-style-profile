/**
 * GET /api/profile/[customerId]
 *
 * Fetch customer profile by ID.
 *
 * Response:
 * {
 *   success: boolean;
 *   profile: CustomerProfile;
 *   interactionCount?: number;
 *   memoryCount?: number;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseServer
      .from('customer_profiles')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', customerId },
        { status: 404 }
      );
    }

    // Optionally fetch interaction count
    const { count: interactionCount } = await supabaseServer
      .from('customer_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    // Optionally fetch memory count
    const { count: memoryCount } = await supabaseServer
      .from('semantic_memories')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      profile,
      interactionCount: interactionCount || 0,
      memoryCount: memoryCount || 0,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
