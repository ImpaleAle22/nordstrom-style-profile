/**
 * Demo Outfit Tagging API
 * Tags a single outfit for the presentation demo
 */

import { NextRequest, NextResponse } from 'next/server';
import { tagOutfit } from '@/lib/attribute-tagger';
import type { StoredOutfit } from '@/lib/outfit-storage';

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    // Build a simple StoredOutfit from demo products
    const demoOutfit: StoredOutfit = {
      outfitId: `demo-${Date.now()}`,
      recipeId: 'demo-recipe',
      recipeTitle: 'Demo Outfit',
      department: 'womens',
      generatedAt: new Date().toISOString(),
      strategy: 'demo',
      confidenceScore: 0.85,
      qualityScore: 0.85,
      alignmentScore: 0.85,
      poolTier: 'primary',
      scoreBreakdown: {
        styleRegisterCoherence: 0.85,
        colorHarmony: 0.85,
        silhouetteBalance: 0.85,
        occasionAlignment: 0.85,
        seasonFabricWeight: 0.85,
      },
      items: products.map((product: any) => ({
        role: product.role || 'top',
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
          productType: product.productType || 'top',
        },
      })),
    };

    // Call real AI tagging
    const attributes = await tagOutfit(demoOutfit);

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
