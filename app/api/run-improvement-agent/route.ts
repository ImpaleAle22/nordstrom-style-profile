/**
 * API Route: Run Improvement Agent
 *
 * Uses AI to analyze reasoning corpus and generate improved rules code
 */

import { NextResponse } from 'next/server';
import type { ModelType, ReasoningCorpusEntry, ImprovementResult } from '@/lib/rules-improvement-agent';
import type { AnalysisReport } from '@/lib/automatic-rule-analysis';

export async function POST(request: Request) {
  try {
    const { currentRulesCode, corpus, gapAnalysis, model, userFeedback } = await request.json();

    if (!currentRulesCode || !corpus || !gapAnalysis) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Import here to avoid loading in module scope
    const { runRulesImprovementAgentWithCorpus } = await import('@/lib/rules-improvement-agent');

    const result = await runRulesImprovementAgentWithCorpus(
      currentRulesCode,
      corpus as ReasoningCorpusEntry[],
      gapAnalysis as AnalysisReport,
      model as ModelType || 'gemini-2.5-pro',
      userFeedback as string | undefined
    );

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Improvement agent failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
