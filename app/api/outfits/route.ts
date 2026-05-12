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
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.7');
    const pillars = searchParams.get('pillars')?.split(',').filter(Boolean); // e.g., 'minimal,classic,modern'

    console.log('[Outfits API] Query params:', { limit, department, minConfidence, pillars });

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

    let filteredOutfits = outfits || [];

    // Filter by pillars if provided (case-insensitive)
    if (pillars && pillars.length > 0) {
      const pillarsLower = pillars.map(p => p.toLowerCase());
      console.log('[Outfits API] Filtering by pillars:', pillarsLower);

      filteredOutfits = filteredOutfits.filter(outfit => {
        // Check if outfit has attributes field with pillars
        const outfitPillars = outfit.attributes?.pillars || outfit.pillars || [];
        const outfitPillarsLower = outfitPillars.map((p: string) => p.toLowerCase());

        // Match if ANY of the customer's pillars are in the outfit's pillars
        const hasMatch = pillarsLower.some(pillar =>
          outfitPillarsLower.includes(pillar)
        );

        if (hasMatch) {
          console.log('[Outfits API] Match found:', outfit.outfit_id, 'pillars:', outfitPillarsLower);
        }

        return hasMatch;
      });

      console.log('[Outfits API] Filtered results:', filteredOutfits.length, 'of', outfits?.length || 0);
    }

    return NextResponse.json({
      outfits: filteredOutfits,
      count: filteredOutfits.length,
      total: outfits?.length || 0
    });
  } catch (error: any) {
    console.error('[Outfits API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch outfits' },
      { status: 500 }
    );
  }
}
