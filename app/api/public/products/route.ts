/**
 * Public API: Product Details
 *
 * Get product information by ID(s)
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

    // Single product by ID
    if (id) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Product not found', message: error.message },
          { status: 404, headers: getRateLimitHeaders(auth) }
        );
      }

      return NextResponse.json({ product: data }, { headers: getRateLimitHeaders(auth) });
    }

    // Multiple products by IDs (comma-separated)
    if (ids) {
      const idArray = ids.split(',').map((id) => id.trim());

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', idArray);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch products', message: error.message },
          { status: 500, headers: getRateLimitHeaders(auth) }
        );
      }

      return NextResponse.json({
        count: data?.length || 0,
        products: data || [],
      }, { headers: getRateLimitHeaders(auth) });
    }

    // List products (paginated)
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch products', message: error.message },
        { status: 500, headers: getRateLimitHeaders(auth) }
      );
    }

    return NextResponse.json({
      total: count,
      count: data?.length || 0,
      offset,
      limit,
      products: data || [],
    }, { headers: getRateLimitHeaders(auth) });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: getRateLimitHeaders(auth) }
    );
  }
}
