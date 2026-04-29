/**
 * API Route: Apply Rules Code
 *
 * Applies improved rules code to attribute-tagger.ts (with backup)
 */

import { NextResponse } from 'next/server';
import { applyImprovedRulesCode } from '@/lib/rules-code-utils';

export async function POST(request: Request) {
  try {
    const { improvedCode } = await request.json();

    if (!improvedCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'No improved code provided'
        },
        { status: 400 }
      );
    }

    const result = applyImprovedRulesCode(improvedCode);

    if (result.success) {
      return NextResponse.json({
        success: true,
        backupPath: result.backupPath
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Failed to apply rules code:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
