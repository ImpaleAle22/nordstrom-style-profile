/**
 * Demo Outfit Tagging API
 * Tags a single outfit for the presentation demo using v2 pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { tagOutfitV2 } from '@/lib/attribute-tagger-v2';
import type { OutfitInput } from '@/lib/axis-types';

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    // Build OutfitInput for v2 tagging system
    const demoOutfit: OutfitInput = {
      outfitId: `demo-${Date.now()}`,
      recipeId: 'demo-recipe',
      recipeTitle: 'Demo Outfit',
      department: 'womens',
      scoreBreakdown: {
        styleRegisterCoherence: 85,
        colorHarmony: 85,
        silhouetteBalance: 85,
        occasionAlignment: 85,
        seasonFabricWeight: 85,
      },
      items: products.map((product: any) => ({
        role: product.role || 'tops',
        ingredientTitle: product.name,
        product: {
          id: product.id,
          title: product.name,
          brand: product.brand || 'H&M',
          price: parseFloat(product.price) || 39.99,
          imageUrl: product.imageUrl || '',
          department: 'womens',
          colors: product.color ? [product.color] : [],
          description: product.name,
          productType1: product.productType || 'top',
        },
      })),
    };

    // Call v2 tagging pipeline (dry-run mode for demo)
    const result = await tagOutfitV2(demoOutfit, null, { mode: 'dry-run' });

    if (!result.success || !result.attributes) {
      throw new Error(result.error || 'Tagging failed');
    }

    const attributes = result.attributes;

    // Debug logging
    console.log('=== OUTFIT TAGGING V2 DEBUG ===');
    console.log('Products:', products.map(p => `${p.role}: ${p.name} (${p.color})`));
    console.log('Formality:', attributes.formality);
    console.log('Activity Context:', attributes.activityContext);
    console.log('Social Register:', attributes.socialRegister);
    console.log('Style Pillar:', attributes.stylePillar);
    console.log('Sub Style:', attributes.subStyle);
    console.log('Vibes:', attributes.vibes);
    console.log('Occasions:', attributes.occasions);
    console.log('Needs Review:', attributes.needsReview);
    console.log('Confidence:', JSON.stringify(attributes.confidence, null, 2));
    console.log('================================');

    return NextResponse.json({
      success: true,
      attributes,
    });
  } catch (error) {
    console.error('Demo tagging error:', error);
    return NextResponse.json(
      { error: 'Tagging failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
