import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface TaggedImage {
  id: string;
  url: string;
  source: 'pexels' | 'unsplash';
  photographer?: string;
  photographerUrl?: string;
  lifestyleData: {
    outfitAnalysis: {
      stylePillar: string;
      subTerm: string;
      spectrumCoordinate: number;
      pillarConfidence: number;
      vibes: string[];
      occasions: string[];
      formalityLevel: number;
      season: string;
      gender: 'womenswear' | 'menswear';
      isCompleteOutfit: boolean;
      visibleItemCount: number;
    };
    brandAdherence: {
      score: number;
      reasoning?: string;
    };
  };
}

/**
 * POST /api/lifestyle-images/bulk-import
 *
 * Bulk import tagged lifestyle images to Supabase
 *
 * Body:
 * {
 *   images: TaggedImage[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images array is required and must not be empty' },
        { status: 400 }
      );
    }

    console.log(`[Bulk Import] Starting import of ${images.length} images`);

    // Transform tagged images to database format
    const records = images.map((img: TaggedImage) => {
      const { outfitAnalysis, brandAdherence } = img.lifestyleData;

      return {
        id: img.id,
        image_url: img.url,
        source: img.source,
        style_pillar: outfitAnalysis.stylePillar.toLowerCase(),
        sub_term: outfitAnalysis.subTerm,
        spectrum_coordinate: outfitAnalysis.spectrumCoordinate,
        pillar_confidence: outfitAnalysis.pillarConfidence,
        vibes: outfitAnalysis.vibes,
        occasions: outfitAnalysis.occasions,
        formality_level: outfitAnalysis.formalityLevel,
        season: outfitAnalysis.season,
        gender: outfitAnalysis.gender,
        is_complete_outfit: outfitAnalysis.isCompleteOutfit,
        visible_item_count: outfitAnalysis.visibleItemCount,
        brand_adherence_score: brandAdherence.score,
        brand_adherence_reasoning: brandAdherence.reasoning || null,
        photographer: img.photographer || null,
        photographer_url: img.photographerUrl || null,
        status: 'active',
        created_at: new Date().toISOString()
      };
    });

    // Validate records before insertion
    const invalidRecords = records.filter(record => {
      return !record.id ||
             !record.image_url ||
             !record.style_pillar ||
             !record.gender ||
             record.pillar_confidence === undefined ||
             record.brand_adherence_score === undefined;
    });

    if (invalidRecords.length > 0) {
      console.error('[Bulk Import] Invalid records found:', invalidRecords.length);
      return NextResponse.json(
        {
          error: 'Some records are missing required fields',
          invalidCount: invalidRecords.length,
          sample: invalidRecords[0]
        },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('lifestyle_images')
      .upsert(records, {
        onConflict: 'image_url',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('[Bulk Import] Supabase error:', error);
      throw error;
    }

    console.log(`[Bulk Import] Successfully imported ${data?.length || records.length} images`);

    return NextResponse.json({
      success: true,
      imported: data?.length || records.length,
      records: data
    });
  } catch (error) {
    console.error('[Bulk Import] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lifestyle-images/bulk-import
 *
 * Get import statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { data: images, error } = await supabase
      .from('lifestyle_images')
      .select('id, source, style_pillar, gender, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      total: images?.length || 0,
      bySource: {
        pexels: images?.filter(img => img.source === 'pexels').length || 0,
        unsplash: images?.filter(img => img.source === 'unsplash').length || 0,
        other: images?.filter(img => !['pexels', 'unsplash'].includes(img.source)).length || 0
      },
      byGender: {
        womenswear: images?.filter(img => img.gender === 'womenswear').length || 0,
        menswear: images?.filter(img => img.gender === 'menswear').length || 0
      },
      recentImports: images?.slice(0, 10) || []
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Bulk Import Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import statistics' },
      { status: 500 }
    );
  }
}
