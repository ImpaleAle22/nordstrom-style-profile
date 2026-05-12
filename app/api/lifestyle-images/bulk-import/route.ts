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
  // CLIP validation data (optional)
  embedding?: number[];
  clipValidation?: {
    similarity: number;
    confidence: 'high' | 'medium' | 'low';
    topPillars?: Array<{
      name: string;
      score: number;
    }>;
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
    console.log(`[Bulk Import] First image input:`, JSON.stringify(images[0], null, 2));

    // Transform tagged images to database format
    const records = images.map((img: TaggedImage, index: number) => {
      try {
        const { outfitAnalysis, brandAdherence } = img.lifestyleData;

        const record: any = {
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
          season: Array.isArray(outfitAnalysis.season) ? outfitAnalysis.season : [outfitAnalysis.season],
          gender: outfitAnalysis.gender,
          is_complete_outfit: outfitAnalysis.isCompleteOutfit,
          visible_item_count: outfitAnalysis.visibleItemCount,
          brand_adherence_score: brandAdherence.score,
          // Store reasoning in the 'reasoning' column instead
          reasoning: brandAdherence.reasoning || outfitAnalysis.reasoning || null,
          photographer: img.photographer || null,
          photographer_url: img.photographerUrl || null,
          status: 'active',
          created_at: new Date().toISOString()
        };

        // Add CLIP validation data if available
        if (img.embedding) {
          record.embedding = img.embedding;
        }
        if (img.clipValidation) {
          record.clip_validation = {
            similarity: img.clipValidation.similarity,
            confidence: img.clipValidation.confidence,
            topPillars: img.clipValidation.topPillars || []
          };
        }

        return record;
      } catch (transformError) {
        console.error(`[Bulk Import] Error transforming record ${index}:`, transformError);
        console.error(`[Bulk Import] Failed image data:`, JSON.stringify(img, null, 2));
        throw transformError;
      }
    });

    console.log(`[Bulk Import] First transformed record:`, JSON.stringify(records[0], null, 2));

    // Validate records before insertion
    const invalidRecords = records.filter(record => {
      const isValid = record.id &&
                      record.image_url &&
                      record.style_pillar &&
                      record.gender &&
                      record.pillar_confidence !== undefined &&
                      record.brand_adherence_score !== undefined;

      if (!isValid) {
        console.error('[Bulk Import] Invalid record:', {
          id: record.id,
          has_image_url: !!record.image_url,
          has_style_pillar: !!record.style_pillar,
          has_gender: !!record.gender,
          has_pillar_confidence: record.pillar_confidence !== undefined,
          has_brand_adherence_score: record.brand_adherence_score !== undefined
        });
      }

      return !isValid;
    });

    if (invalidRecords.length > 0) {
      console.error('[Bulk Import] Invalid records found:', invalidRecords.length);
      console.error('[Bulk Import] First invalid record:', JSON.stringify(invalidRecords[0], null, 2));
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
    console.log(`[Bulk Import] Attempting to insert ${records.length} records into Supabase...`);
    const { data, error } = await supabase
      .from('lifestyle_images')
      .upsert(records, {
        onConflict: 'image_url',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('[Bulk Import] Supabase error:', error);
      console.error('[Bulk Import] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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
    console.error('[Bulk Import] Error type:', typeof error);
    console.error('[Bulk Import] Error instanceof Error:', error instanceof Error);
    console.error('[Bulk Import] Error keys:', error ? Object.keys(error) : 'null');
    console.error('[Bulk Import] Error stringified:', JSON.stringify(error, null, 2));

    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

    return NextResponse.json(
      {
        error: 'Failed to import images',
        details: errorMessage || 'Unknown error'
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
