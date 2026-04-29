/**
 * API Route: Extract Rules Code
 *
 * Returns the current generateRulesBasedHints() function code
 */

import { NextResponse } from 'next/server';
import { extractCurrentRulesCode } from '@/lib/rules-code-utils';

export async function GET() {
  try {
    const code = extractCurrentRulesCode();

    return NextResponse.json({
      success: true,
      code
    });

  } catch (error) {
    console.error('Failed to extract rules code:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
