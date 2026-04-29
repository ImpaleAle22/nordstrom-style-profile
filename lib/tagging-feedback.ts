/**
 * Tagging Feedback System
 *
 * Captures user corrections to outfit attribute tags to improve rules over time.
 * Enables continuous learning from AI+human feedback.
 */

import type { OutfitAttributes } from './outfit-attributes';

// ============================================================================
// TYPES
// ============================================================================

export interface TaggingFeedback {
  outfitId: string;
  timestamp: string;

  // What the system tagged
  systemTags: OutfitAttributes;

  // What the user corrected to (if any)
  userCorrections?: Partial<OutfitAttributes>;

  // User feedback
  feedback: {
    accuracy: 'correct' | 'partially-correct' | 'incorrect';
    issues?: string[]; // What was wrong (e.g., "energetic should include bright colors")
    notes?: string; // Free-form user notes
  };

  // Context for learning
  outfitContext: {
    hasAthletic: boolean;
    hasBrightColors: boolean;
    hasMaximalStyle: boolean;
    colorCount: number;
    productTitles: string[];
  };
}

export interface RuleImprovement {
  ruleName: string;
  issue: string;
  examples: TaggingFeedback[];
  confidence: number; // 0-1, based on # of examples
  suggestedFix: string;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'tagging-feedback';

/**
 * Save feedback for an outfit's tags
 */
export function saveFeedback(feedback: TaggingFeedback): void {
  if (typeof window === 'undefined') return;

  const existing = loadAllFeedback();

  // Replace if already exists for this outfit
  const filtered = existing.filter(f => f.outfitId !== feedback.outfitId);
  filtered.push(feedback);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log(`💾 Saved feedback for outfit ${feedback.outfitId}`);
  } catch (error) {
    console.error('Failed to save feedback:', error);
  }
}

/**
 * Load all feedback
 */
export function loadAllFeedback(): TaggingFeedback[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load feedback:', error);
    return [];
  }
}

/**
 * Get feedback for a specific outfit
 */
export function getFeedback(outfitId: string): TaggingFeedback | null {
  const all = loadAllFeedback();
  return all.find(f => f.outfitId === outfitId) || null;
}

/**
 * Clear all feedback (for testing)
 */
export function clearAllFeedback(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  console.log('🧹 Cleared all tagging feedback');
}

// ============================================================================
// ANALYSIS
// ============================================================================

/**
 * Analyze feedback to identify rule improvements
 */
export function analyzeRuleImprovements(): RuleImprovement[] {
  const feedback = loadAllFeedback();

  if (feedback.length === 0) {
    return [];
  }

  const improvements: RuleImprovement[] = [];

  // Pattern 1: Energetic vibe missing on outfits with bright colors
  const energeticMissing = feedback.filter(f =>
    f.feedback.accuracy !== 'correct' &&
    f.outfitContext.hasBrightColors &&
    !f.systemTags.vibes.includes('Energetic') &&
    f.userCorrections?.vibes?.includes('Energetic')
  );

  if (energeticMissing.length >= 3) {
    improvements.push({
      ruleName: 'energetic-bright-colors',
      issue: 'Energetic vibe not detected for outfits with bright colors',
      examples: energeticMissing,
      confidence: Math.min(energeticMissing.length / 10, 1),
      suggestedFix: 'Add bright color detection to energetic vibe rule'
    });
  }

  // Pattern 2: Energetic vibe missing on maximal style outfits
  const energeticMaximal = feedback.filter(f =>
    f.feedback.accuracy !== 'correct' &&
    f.outfitContext.hasMaximalStyle &&
    !f.systemTags.vibes.includes('Energetic') &&
    f.userCorrections?.vibes?.includes('Energetic')
  );

  if (energeticMaximal.length >= 3) {
    improvements.push({
      ruleName: 'energetic-maximal-style',
      issue: 'Energetic vibe not detected for maximal style outfits',
      examples: energeticMaximal,
      confidence: Math.min(energeticMaximal.length / 10, 1),
      suggestedFix: 'Link maximal style pillar to energetic vibe'
    });
  }

  // Pattern 3: Style pillar misclassification
  const pillarMismatches = feedback.filter(f =>
    f.feedback.accuracy !== 'correct' &&
    f.userCorrections?.stylePillar &&
    f.systemTags.stylePillar !== f.userCorrections.stylePillar
  );

  // Group by pillar transition (e.g., "Athletic -> Maximal")
  const pillarTransitions = new Map<string, TaggingFeedback[]>();
  pillarMismatches.forEach(f => {
    if (!f.userCorrections?.stylePillar) return;
    const key = `${f.systemTags.stylePillar} -> ${f.userCorrections.stylePillar}`;
    if (!pillarTransitions.has(key)) {
      pillarTransitions.set(key, []);
    }
    pillarTransitions.get(key)!.push(f);
  });

  pillarTransitions.forEach((examples, transition) => {
    if (examples.length >= 3) {
      improvements.push({
        ruleName: `pillar-${transition.toLowerCase().replace(/\s+/g, '-')}`,
        issue: `Style pillar frequently misclassified: ${transition}`,
        examples,
        confidence: Math.min(examples.length / 10, 1),
        suggestedFix: `Review rule criteria for ${transition.split(' -> ')[0]} vs ${transition.split(' -> ')[1]}`
      });
    }
  });

  // Sort by confidence
  return improvements.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get tagging accuracy metrics
 */
export function getAccuracyMetrics(): {
  total: number;
  correct: number;
  partiallyCorrect: number;
  incorrect: number;
  accuracyRate: number;
} {
  const feedback = loadAllFeedback();

  const correct = feedback.filter(f => f.feedback.accuracy === 'correct').length;
  const partiallyCorrect = feedback.filter(f => f.feedback.accuracy === 'partially-correct').length;
  const incorrect = feedback.filter(f => f.feedback.accuracy === 'incorrect').length;

  return {
    total: feedback.length,
    correct,
    partiallyCorrect,
    incorrect,
    accuracyRate: feedback.length > 0 ? (correct + partiallyCorrect * 0.5) / feedback.length : 0
  };
}

/**
 * Export feedback as JSON for analysis
 */
export function exportFeedback(): string {
  const feedback = loadAllFeedback();
  const metrics = getAccuracyMetrics();
  const improvements = analyzeRuleImprovements();

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    metrics,
    improvements,
    feedback
  }, null, 2);
}
