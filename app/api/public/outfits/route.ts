/**
 * Public API: Outfit Details
 *
 * Get styled outfit information
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const pool = searchParams.get('pool'); // 'primary', 'secondary', 'suppressed'

    // Single outfit by ID
    if (id) {
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('outfit_id', id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Outfit not found', message: error.message },
          { status: 404 }
        );
      }

      return NextResponse.json({ outfit: data });
    }

    // Multiple outfits by IDs (comma-separated)
    if (ids) {
      const idArray = ids.split(',').map((id) => id.trim());

      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .in('outfit_id', idArray);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch outfits', message: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        count: data?.length || 0,
        outfits: data || [],
      });
    }

    // Build query
    let query = supabase
      .from('outfits')
      .select('*', { count: 'exact' });

    // Filter by pool tier if specified
    if (pool) {
      query = query.eq('pool_tier', pool);
    }

    // Apply pagination
    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch outfits', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total: count,
      count: data?.length || 0,
      offset,
      limit,
      pool: pool || 'all',
      outfits: data || [],
    });
  } catch (error) {
    console.error('Outfits API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch outfits',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
