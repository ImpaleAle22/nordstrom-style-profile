/**
 * POST /api/profile/process
 *
 * Process interactions through the Profile Brain and update customer profile.
 *
 * Request body:
 * {
 *   customerId: string;
 *   customerName: string;
 *   interactions: Interaction[];
 *   mode?: 'incremental' | 'batch';
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   profile: CustomerProfile;
 *   metadata: ProcessingMetadata;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { processInteractions } from '@/lib/profile-brain';
import type { Interaction } from '@/lib/interaction-types';
import type { CustomerProfile } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, customerName, interactions, mode = 'incremental' } = body;

    // Validate input
    if (!customerId || !customerName) {
      return NextResponse.json(
        { error: 'customerId and customerName are required' },
        { status: 400 }
      );
    }

    if (!interactions || !Array.isArray(interactions)) {
      return NextResponse.json(
        { error: 'interactions array is required' },
        { status: 400 }
      );
    }

    // Fetch existing profile if in incremental mode
    let currentProfile: Partial<CustomerProfile> | undefined;

    if (mode === 'incremental') {
      const { data: existingProfile } = await supabaseServer
        .from('customer_profiles')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      currentProfile = existingProfile || undefined;
    }

    // Process through Profile Brain
    const result = processInteractions({
      customerId,
      customerName,
      interactions,
      currentProfile,
      options: {
        mode,
        preserveExisting: mode === 'incremental',
      },
    });

    // Save updated profile to database
    const { error: upsertError } = await supabaseServer
      .from('customer_profiles')
      .upsert({
        ...result.profile,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Error saving profile:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save profile', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: result.profile,
      metadata: result.metadata,
    });
  } catch (error: any) {
    console.error('Error processing profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
