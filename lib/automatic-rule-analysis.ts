/**
 * Automatic Rule Analysis
 *
 * Analyzes tagged outfits to automatically identify rule improvement opportunities
 * by comparing rules-based hints against AI decisions and reasoning.
 *
 * NO MANUAL REVIEW NEEDED - learns from AI's reasoning automatically.
 */

import { getAllOutfits } from './outfit-storage';
import type { StoredOutfit } from './outfit-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface RuleGap {
  gapType: 'missing-signal' | 'wrong-threshold' | 'incorrect-hint' | 'missed-attribute';
  attribute: 'stylePillar' | 'vibe' | 'occasion';
  description: string;
  examples: Array<{
    outfitId: string;
    rulesConfidence: number;
    aiChose: string;
    aiReasoning: string;
    aiConfidence: number;
    outfitContext: {
      productTitles: string[];
      colors: string[];
      hasAthletic: boolean;
      hasBrightColors: boolean;
      colorCount: number;
    };
  }>;
  frequency: number; // How often this gap occurs
  confidence: number; // 0-1, based on frequency and AI confidence
  suggestedFix: string;
}

export interface AnalysisReport {
  analyzedAt: string;
  totalOutfits: number;
  rulesOnlyCount: number;
  hybridCount: number;
  gaps: RuleGap[];
  summary: {
    rulesOnlyRate: number;
    avgRulesConfidence: number;
    avgAIConfidence: number;
    topMissingSignals: string[];
  };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze all tagged outfits to identify rule gaps
 */
export async function analyzeRuleGaps(): Promise<AnalysisReport> {
  const outfits = await getAllOutfits();
  const taggedOutfits = outfits.filter(o => o.attributes);

  if (taggedOutfits.length === 0) {
    return {
      analyzedAt: new Date().toISOString(),
      totalOutfits: 0,
      rulesOnlyCount: 0,
      hybridCount: 0,
      gaps: [],
      summary: {
        rulesOnlyRate: 0,
        avgRulesConfidence: 0,
        avgAIConfidence: 0,
        topMissingSignals: []
      }
    };
  }

  const rulesOnly = taggedOutfits.filter(o => o.attributes!.taggedBy === 'rules');
  const hybrid = taggedOutfits.filter(o => o.attributes!.taggedBy === 'hybrid');

  console.log(`📊 Analyzing ${taggedOutfits.length} tagged outfits...`);
  console.log(`   Rules-only: ${rulesOnly.length} (${(rulesOnly.length / taggedOutfits.length * 100).toFixed(0)}%)`);
  console.log(`   Hybrid (AI): ${hybrid.length} (${(hybrid.length / taggedOutfits.length * 100).toFixed(0)}%)`);

  // Analyze hybrid outfits to find patterns where AI had to step in
  const gaps = await detectGaps(hybrid);

  // Calculate summary metrics
  const avgRulesConfidence = rulesOnly.length > 0
    ? rulesOnly.reduce((sum, o) => sum + (o.attributes!.confidence?.stylePillar || 0), 0) / rulesOnly.length
    : 0;

  const avgAIConfidence = hybrid.length > 0
    ? hybrid.reduce((sum, o) => sum + (o.attributes!.confidence?.stylePillar || 0), 0) / hybrid.length
    : 0;

  return {
    analyzedAt: new Date().toISOString(),
    totalOutfits: taggedOutfits.length,
    rulesOnlyCount: rulesOnly.length,
    hybridCount: hybrid.length,
    gaps,
    summary: {
      rulesOnlyRate: rulesOnly.length / taggedOutfits.length,
      avgRulesConfidence,
      avgAIConfidence,
      topMissingSignals: extractTopSignals(gaps)
    }
  };
}

// ============================================================================
// GAP DETECTION
// ============================================================================

/**
 * Detect rule gaps by analyzing hybrid outfits
 */
async function detectGaps(hybridOutfits: StoredOutfit[]): Promise<RuleGap[]> {
  const gaps: RuleGap[] = [];

  // Pattern 1: AI mentions "bright colors" or "vibrant" in reasoning
  const brightColorMentions = hybridOutfits.filter(o => {
    const reasoning = o.attributes!.reasoning?.toLowerCase() || '';
    return reasoning.includes('bright') || reasoning.includes('vibrant') || reasoning.includes('colorful') || reasoning.includes('bold color');
  });

  if (brightColorMentions.length >= 3) {
    gaps.push({
      gapType: 'missing-signal',
      attribute: 'vibe',
      description: 'AI frequently mentions bright/vibrant colors that rules might be missing',
      examples: brightColorMentions.slice(0, 10).map(o => extractExample(o, 'bright colors')),
      frequency: brightColorMentions.length,
      confidence: Math.min(brightColorMentions.length / 20, 1),
      suggestedFix: 'Enhance color detection in rules - may need to lower threshold or expand color keywords'
    });
  }

  // Pattern 2: AI mentions "athletic" or "sporty" for energetic vibe
  const athleticMentions = hybridOutfits.filter(o => {
    const reasoning = o.attributes!.reasoning?.toLowerCase() || '';
    const hasEnergeticVibe = o.attributes!.vibes.includes('Energetic');
    return hasEnergeticVibe && (reasoning.includes('athletic') || reasoning.includes('sport') || reasoning.includes('active'));
  });

  if (athleticMentions.length >= 3) {
    gaps.push({
      gapType: 'wrong-threshold',
      attribute: 'vibe',
      description: 'AI needed to intervene for athletic → energetic connection (threshold too high?)',
      examples: athleticMentions.slice(0, 10).map(o => extractExample(o, 'athletic/energetic')),
      frequency: athleticMentions.length,
      confidence: Math.min(athleticMentions.length / 15, 1),
      suggestedFix: 'Lower confidence threshold for athletic → energetic vibe, or check keyword detection'
    });
  }

  // Pattern 3: AI mentions "patterns" or "prints" or "textures"
  const patternMentions = hybridOutfits.filter(o => {
    const reasoning = o.attributes!.reasoning?.toLowerCase() || '';
    return reasoning.includes('pattern') || reasoning.includes('print') || reasoning.includes('floral') || reasoning.includes('stripe');
  });

  if (patternMentions.length >= 5) {
    gaps.push({
      gapType: 'missing-signal',
      attribute: 'vibe',
      description: 'AI mentions patterns/prints frequently - rules have no pattern detection',
      examples: patternMentions.slice(0, 10).map(o => extractExample(o, 'patterns/prints')),
      frequency: patternMentions.length,
      confidence: Math.min(patternMentions.length / 25, 1),
      suggestedFix: 'Add pattern/print detection to product metadata (may need vision analysis)'
    });
  }

  // Pattern 4: AI tagged as "Maximal" pillar
  const maximalTags = hybridOutfits.filter(o => o.attributes!.stylePillar === 'Maximal');

  if (maximalTags.length >= 3) {
    gaps.push({
      gapType: 'missed-attribute',
      attribute: 'stylePillar',
      description: 'AI frequently identifies Maximal style that rules missed',
      examples: maximalTags.slice(0, 10).map(o => extractExample(o, 'maximal style')),
      frequency: maximalTags.length,
      confidence: Math.min(maximalTags.length / 15, 1),
      suggestedFix: 'Expand Maximal pillar detection keywords or lower confidence threshold'
    });
  }

  // Pattern 5: AI mentions "layering" or "layered"
  const layeringMentions = hybridOutfits.filter(o => {
    const reasoning = o.attributes!.reasoning?.toLowerCase() || '';
    return reasoning.includes('layer');
  });

  if (layeringMentions.length >= 3) {
    gaps.push({
      gapType: 'missing-signal',
      attribute: 'vibe',
      description: 'AI mentions layering (often for maximal/creative vibes)',
      examples: layeringMentions.slice(0, 10).map(o => extractExample(o, 'layering')),
      frequency: layeringMentions.length,
      confidence: Math.min(layeringMentions.length / 20, 1),
      suggestedFix: 'Add layering detection (4+ items might indicate maximal/creative styling)'
    });
  }

  // Pattern 6: Low AI confidence (< 0.6) - rules should help more
  const lowConfidence = hybridOutfits.filter(o =>
    (o.attributes!.confidence?.stylePillar || 0) < 0.6
  );

  if (lowConfidence.length >= 5) {
    gaps.push({
      gapType: 'wrong-threshold',
      attribute: 'stylePillar',
      description: 'AI has low confidence on many outfits - rules not providing enough guidance',
      examples: lowConfidence.slice(0, 10).map(o => extractExample(o, 'low confidence')),
      frequency: lowConfidence.length,
      confidence: Math.min(lowConfidence.length / 30, 1),
      suggestedFix: 'Review rule coverage - may need more keyword detection or better hints'
    });
  }

  // Sort by confidence
  return gaps.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Extract example data for a gap
 */
function extractExample(outfit: StoredOutfit, signal: string) {
  const allColors = outfit.items.flatMap(item => item.product.colors || []);
  const brightColors = ['red', 'orange', 'yellow', 'hot pink', 'neon', 'electric blue', 'bright'];
  const hasBrightColors = allColors.some(color =>
    brightColors.some(bright => color.toLowerCase().includes(bright))
  );

  const athleticKeywords = ['athletic', 'sport', 'gym', 'running', 'yoga', 'workout'];
  const hasAthletic = outfit.items.some(item =>
    athleticKeywords.some(kw => item.product.title.toLowerCase().includes(kw))
  );

  return {
    outfitId: outfit.outfitId,
    rulesConfidence: 0.5, // Below threshold (that's why AI was called)
    aiChose: outfit.attributes!.stylePillar || 'Unknown',
    aiReasoning: outfit.attributes!.reasoning || '',
    aiConfidence: outfit.attributes!.confidence?.stylePillar || 0,
    outfitContext: {
      productTitles: outfit.items.map(item => item.product.title),
      colors: allColors,
      hasAthletic,
      hasBrightColors,
      colorCount: new Set(allColors.map(c => c.toLowerCase())).size
    }
  };
}

/**
 * Extract top missing signals from gaps
 */
function extractTopSignals(gaps: RuleGap[]): string[] {
  const signals = gaps
    .filter(g => g.gapType === 'missing-signal')
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)
    .map(g => g.description);

  return signals;
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export analysis as JSON
 */
export function exportAnalysis(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Print analysis to console
 */
export function printAnalysis(report: AnalysisReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('AUTOMATIC RULE GAP ANALYSIS');
  console.log('='.repeat(80));
  console.log(`Analyzed: ${report.totalOutfits} outfits`);
  console.log(`Rules-only: ${report.rulesOnlyCount} (${(report.summary.rulesOnlyRate * 100).toFixed(0)}%)`);
  console.log(`Hybrid: ${report.hybridCount} (${((1 - report.summary.rulesOnlyRate) * 100).toFixed(0)}%)`);
  console.log(`\nAvg Rules Confidence: ${(report.summary.avgRulesConfidence * 100).toFixed(0)}%`);
  console.log(`Avg AI Confidence: ${(report.summary.avgAIConfidence * 100).toFixed(0)}%`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`IDENTIFIED ${report.gaps.length} RULE GAPS (sorted by confidence)`);
  console.log('='.repeat(80));

  report.gaps.forEach((gap, idx) => {
    console.log(`\n${idx + 1}. ${gap.description}`);
    console.log(`   Type: ${gap.gapType} | Attribute: ${gap.attribute}`);
    console.log(`   Frequency: ${gap.frequency} outfits | Confidence: ${(gap.confidence * 100).toFixed(0)}%`);
    console.log(`   Suggested Fix: ${gap.suggestedFix}`);
    console.log(`   Example: "${gap.examples[0]?.aiReasoning.slice(0, 100)}..."`);
  });

  if (report.summary.topMissingSignals.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('TOP MISSING SIGNALS:');
    console.log('='.repeat(80));
    report.summary.topMissingSignals.forEach((signal, idx) => {
      console.log(`${idx + 1}. ${signal}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}
