import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    const imagesToImport = data.results || data.images || [];

    if (imagesToImport.length === 0) {
      return NextResponse.json(
        { error: 'No images found in file' },
        { status: 400 }
      );
    }

    // Transform to Supabase format
    const transformed = imagesToImport.map((img: any) => {
      const outfitAnalysis = img.outfitAnalysis || {};
      const displaySuitability = img.displaySuitability || {};
      const brandAdherence = img.brandAdherence || {};

      const pillar = (
        outfitAnalysis.stylePillar ||
        img.finalPillar ||
        img.pillar ||
        img.aiPillar ||
        'uncategorized'
      ).toLowerCase().replace(/ /g, '_');

      const gender = outfitAnalysis.gender || img.gender || 'unknown';

      const subterms: string[] = [];
      if (outfitAnalysis.subTerm) subterms.push(outfitAnalysis.subTerm);
      if (img.subTerms) subterms.push(...img.subTerms);
      if (img.subterms) subterms.push(...img.subterms);

      return {
        id: img.imageId || img.image_id,
        image_url: img.imageUrl || img.image_url,
        source: img.source || 'unknown',
        gender,
        style_pillar: pillar,
        sub_term: outfitAnalysis.subTerm || subterms[0] || null,
        spectrum_coordinate: outfitAnalysis.spectrumCoordinate || null,
        pillar_confidence: outfitAnalysis.pillarConfidence || null,
        vibes: outfitAnalysis.vibes || [],
        occasions: outfitAnalysis.occasions || [],
        formality_level: outfitAnalysis.formalityLevel || null,
        season: outfitAnalysis.season || [],
        is_complete_outfit: outfitAnalysis.isCompleteOutfit || false,
        visible_item_count: outfitAnalysis.visibleItemCount || null,
        brand_adherence_score: brandAdherence.score || null,
        is_art_directed: brandAdherence.isArtDirected || false,
        image_tone: brandAdherence.imageTone || null,
        reasoning: outfitAnalysis.reasoning || img.reasoning || null,
        status: displaySuitability.styleSwipeReady === false ? 'rejected' : 'active',
        tags: {
          // Store full original data for reference
          displaySuitability,
          brandAdherence,
          wasEdited: img.wasEdited,
          preCategorizedPillar: img.preCategorizedPillar,
        },
      };
    });

    // Insert into Supabase
    const { data: inserted, error } = await supabaseServer
      .from('lifestyle_images')
      .upsert(transformed, { onConflict: 'id' });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to import images', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: transformed.length,
      message: `Imported ${transformed.length} images successfully`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import images', details: String(error) },
      { status: 500 }
    );
  }
}
