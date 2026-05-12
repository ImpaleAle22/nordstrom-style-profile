/**
 * GET /api/outfits
 * Fetch outfits from Supabase with filtering options
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const department = searchParams.get('department'); // 'womenswear' | 'menswear'
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');

    let query = supabase
      .from('outfits')
      .select('*')
      .gte('confidence_score', minConfidence)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (department) {
      query = query.eq('department', department);
    }

    const { data: outfits, error } = await query;

    if (error) {
      console.error('[Outfits API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      outfits: outfits || [],
      count: outfits?.length || 0
    });
  } catch (error: any) {
    console.error('[Outfits API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch outfits' },
      { status: 500 }
    );
  }
}
