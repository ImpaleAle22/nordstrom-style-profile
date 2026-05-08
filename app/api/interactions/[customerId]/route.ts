/**
 * GET /api/interactions/[customerId]
 *
 * Fetch interactions for a customer.
 *
 * Query params:
 * - since: ISO timestamp - only get interactions after this time
 * - type: Filter by interaction type
 * - limit: Max results (default 100)
 *
 * Response:
 * {
 *   success: boolean;
 *   interactions: Interaction[];
 *   count: number;
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
    const { searchParams } = new URL(request.url);

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Parse query params
    const since = searchParams.get('since');
    const interactionType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build query
    let query = supabaseServer
      .from('customer_interactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    // Apply filters
    if (since) {
      query = query.gt('timestamp', since);
    }
    if (interactionType) {
      query = query.eq('interaction_type', interactionType);
    }

    const { data: interactions, error, count } = await query;

    if (error) {
      console.error('Error fetching interactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interactions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      interactions: interactions || [],
      count: interactions?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
