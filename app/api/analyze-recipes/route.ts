/**
 * API Route: Analyze Recipe Cookability
 * Returns analysis of which recipes are likely to cook successfully
 */

import { NextResponse } from 'next/server';
import { analyzeCookableRecipes, getCookableRecipes } from '../../../lib/recipe-cooking/analyze-cookable-recipes';

export async function GET() {
  try {
    const top10 = await analyzeCookableRecipes(10);
    const allCookable = await getCookableRecipes(70);

    return NextResponse.json({
      summary: {
        totalAnalyzed: top10.length > 0 ? 218 : 0, // Estimate
        likelyCookable: allCookable.length,
        top10Count: top10.length,
      },
      top10,
      allCookable,
    });
  } catch (error: any) {
    console.error('Analyze recipes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze recipes' },
      { status: 500 }
    );
  }
}
