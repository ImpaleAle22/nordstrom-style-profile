/**
 * POST /api/interactions/save
 *
 * Save customer interaction(s) to database.
 *
 * Request body:
 * {
 *   interaction: Interaction;  // Single interaction
 *   OR
 *   interactions: Interaction[];  // Multiple interactions
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   saved: number;
 *   interactionIds: string[];
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { Interaction } from '@/lib/interaction-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interaction, interactions } = body;

    // Support both single and batch inserts
    const interactionsToSave: Interaction[] = interaction
      ? [interaction]
      : interactions;

    if (!interactionsToSave || !Array.isArray(interactionsToSave) || interactionsToSave.length === 0) {
      return NextResponse.json(
        { error: 'interaction or interactions array is required' },
        { status: 400 }
      );
    }

    // Validate each interaction has required fields
    for (const inter of interactionsToSave) {
      if (!inter.interaction_id || !inter.customer_id || !inter.interaction_type || !inter.timestamp || !inter.source || !inter.data) {
        return NextResponse.json(
          { error: 'Each interaction must have: interaction_id, customer_id, interaction_type, timestamp, source, data' },
          { status: 400 }
        );
      }
    }

    // Insert into database
    const { data, error } = await supabaseServer
      .from('customer_interactions')
      .insert(interactionsToSave)
      .select('interaction_id');

    if (error) {
      console.error('Error saving interactions:', error);
      return NextResponse.json(
        { error: 'Failed to save interactions', details: error.message },
        { status: 500 }
      );
    }

    const interactionIds = data?.map(d => d.interaction_id) || [];

    return NextResponse.json({
      success: true,
      saved: interactionsToSave.length,
      interactionIds,
    });
  } catch (error: any) {
    console.error('Error saving interactions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
