/**
 * API Route: Analyze Rule Gaps
 *
 * Analyzes all tagged outfits to identify rule improvement opportunities
 */

import { NextResponse } from 'next/server';
import { analyzeRuleGaps } from '@/lib/automatic-rule-analysis';

export async function GET() {
  try {
    const report = await analyzeRuleGaps();

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Gap analysis failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
