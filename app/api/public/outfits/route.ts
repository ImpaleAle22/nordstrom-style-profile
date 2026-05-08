/**
 * Public API: Outfit Details
 *
 * Get styled outfit information
 *
 * Authentication: Optional (higher rate limits with API key)
 * Rate Limits: 100/day without key, 10,000/day with key
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { validateApiKey, getRateLimitHeaders } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  // Validate API key and check rate limits
  const auth = validateApiKey(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error },
      {
        status: auth.error?.includes('rate limit') ? 429 : 401,
        headers: getRateLimitHeaders(auth)
      }
    );
  }

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
          { status: 404, headers: getRateLimitHeaders(auth) }
        );
      }

      return NextResponse.json({ outfit: data }, { headers: getRateLimitHeaders(auth) });
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
          { status: 500, headers: getRateLimitHeaders(auth) }
        );
      }

      return NextResponse.json({
        count: data?.length || 0,
        outfits: data || [],
      }, { headers: getRateLimitHeaders(auth) });
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
        { status: 500, headers: getRateLimitHeaders(auth) }
      );
    }

    return NextResponse.json({
      total: count,
      count: data?.length || 0,
      offset,
      limit,
      pool: pool || 'all',
      outfits: data || [],
    }, { headers: getRateLimitHeaders(auth) });
  } catch (error) {
    console.error('Outfits API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch outfits',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: getRateLimitHeaders(auth) }
    );
  }
}
