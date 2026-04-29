/**
 * Auto-Triage System
 * Automatically analyzes recipe cooking results and triggers fixes
 *
 * Phase 1: Auto-trigger Discovery Mode for formality issues
 * Phase 2: Pattern auto-approval for high-confidence patterns
 * Phase 3: Self-healing recipe loop with automatic retry
 */

import type { CookingResult, CookingOptions } from './types';
import type { UnifiedRecipe } from '../unified-recipe-types';
import { trackFailedRecipe } from './self-healing-loop';

/**
 * Triage status categories
 */
export type TriageStatus = 'success' | 'low-yield' | 'zero-saved' | 'formality-bottleneck' | 'failed';

/**
 * Triage result with diagnostics and recommended actions
 */
export interface TriageResult {
  status: TriageStatus;
  needsAutoFix: boolean;
  diagnostics: string[];
  recommendedAction?: 'retry-with-discovery' | 'retry-with-conservative' | 'manual-review' | 'none';
  confidence: number; // 0-1, how confident we are in the diagnosis
}

/**
 * Analyze cooking result and determine if auto-fix is needed
 */
export function analyzeRecipeResult(result: CookingResult): TriageResult {
  const diagnostics: string[] = [];
  let status: TriageStatus = 'success';
  let needsAutoFix = false;
  let recommendedAction: TriageResult['recommendedAction'] = 'none';
  let confidence = 1.0;

  // Extract key metrics
  const totalGenerated = result.stats.totalGenerated;
  const totalSaved = result.stats.totalSaved;
  const formalityFiltered = result.stats.formalityFiltered;
  const similarityFiltered = result.stats.similarityFiltered;
  const linkedCount = result.stats.linkedCount;

  // Category 1: SUCCESS - Recipe is working well
  if (linkedCount >= 10) {
    status = 'success';
    diagnostics.push(`✅ Success: ${linkedCount} linked outfits`);
    return { status, needsAutoFix: false, diagnostics, confidence };
  }

  // Category 2: LOW YIELD - Some outfits but below threshold
  if (linkedCount > 0 && linkedCount < 10) {
    status = 'low-yield';
    diagnostics.push(`⚠️  Low yield: ${linkedCount}/10 linked outfits`);
    diagnostics.push(`Generated ${totalGenerated}, saved ${totalSaved}`);

    // Check if formality is the main issue
    if (formalityFiltered > totalGenerated * 0.3) {
      diagnostics.push(`Formality filtered ${formalityFiltered} (${Math.round(formalityFiltered/totalGenerated*100)}%) - pattern discovery may help`);
      recommendedAction = 'retry-with-discovery';
      needsAutoFix = true;
      confidence = 0.7;
    }

    return { status, needsAutoFix, diagnostics, recommendedAction, confidence };
  }

  // Category 3: ZERO SAVED - No outfits saved at all
  if (totalSaved === 0 && totalGenerated > 0) {
    status = 'zero-saved';
    diagnostics.push(`❌ Zero outfits saved from ${totalGenerated} generated`);

    // Diagnose the bottleneck
    if (formalityFiltered > 0) {
      status = 'formality-bottleneck';
      const formalityRate = Math.round((formalityFiltered / totalGenerated) * 100);
      diagnostics.push(`🔴 Formality filter bottleneck: ${formalityFiltered}/${totalGenerated} (${formalityRate}%) rejected`);
      diagnostics.push(`This is a smart casual pattern that needs to be learned`);
      recommendedAction = 'retry-with-discovery';
      needsAutoFix = true;
      confidence = 0.95;
    } else if (similarityFiltered > totalGenerated * 0.8) {
      const similarityRate = Math.round((similarityFiltered / totalGenerated) * 100);
      diagnostics.push(`🔴 Similarity filter bottleneck: ${similarityFiltered}/${totalGenerated} (${similarityRate}%) rejected`);
      diagnostics.push(`Products may be too similar/clashing - check ingredient queries`);
      recommendedAction = 'manual-review';
      needsAutoFix = false;
      confidence = 0.8;
    } else {
      diagnostics.push(`🔴 All outfits failed hard rules validation`);
      diagnostics.push(`Check recipe structure (need 4-6 slots, footwear required, etc.)`);
      recommendedAction = 'manual-review';
      needsAutoFix = false;
      confidence = 0.6;
    }

    return { status, needsAutoFix, diagnostics, recommendedAction, confidence };
  }

  // Category 4: FAILED - No outfits generated at all
  if (totalGenerated === 0) {
    status = 'failed';
    diagnostics.push(`❌ Recipe failed: No outfits generated`);
    diagnostics.push(`Check ingredient queries - may have no matching products`);
    recommendedAction = 'manual-review';
    needsAutoFix = false;
    confidence = 0.9;

    return { status, needsAutoFix, diagnostics, recommendedAction, confidence };
  }

  // Default: Something worked
  return { status, needsAutoFix, diagnostics, recommendedAction, confidence };
}

/**
 * Determine if we should auto-retry with Discovery Mode
 */
export function shouldAutoRetryWithDiscovery(triage: TriageResult, autoFixAttempts: number = 0): boolean {
  // Don't retry if we've already tried multiple times
  if (autoFixAttempts >= 2) {
    console.log(`⚠️  Already attempted ${autoFixAttempts} auto-fixes - skipping to avoid infinite loop`);
    return false;
  }

  // Only retry if we have high confidence in the diagnosis
  if (triage.confidence < 0.7) {
    console.log(`⚠️  Low confidence (${triage.confidence}) in diagnosis - skipping auto-retry`);
    return false;
  }

  // Only retry if recommended action is discovery mode
  return triage.needsAutoFix && triage.recommendedAction === 'retry-with-discovery';
}

/**
 * Build options for auto-retry with Discovery Mode
 */
export function buildAutoRetryOptions(
  originalOptions: CookingOptions,
  triage: TriageResult
): CookingOptions {
  console.log(`\n🔧 Building auto-retry options for ${triage.status}`);
  console.log(`   Diagnosis: ${triage.diagnostics.join(', ')}`);

  // Enable Discovery Mode and use Conservative Pipeline
  const retryOptions: CookingOptions = {
    ...originalOptions,
    discoveryMode: true, // Enable pattern candidate capture
  };

  console.log(`   Retry configuration: Discovery Mode = ON`);

  return retryOptions;
}

/**
 * Log triage results to console
 */
export function logTriageResults(recipeTitle: string, triage: TriageResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏥 AUTO-TRIAGE: ${recipeTitle}`);
  console.log('='.repeat(60));
  console.log(`Status: ${triage.status.toUpperCase()}`);
  console.log(`Needs Auto-Fix: ${triage.needsAutoFix ? 'YES' : 'NO'}`);
  console.log(`Confidence: ${Math.round(triage.confidence * 100)}%`);
  console.log(`\nDiagnostics:`);
  triage.diagnostics.forEach(d => console.log(`  ${d}`));

  if (triage.recommendedAction && triage.recommendedAction !== 'none') {
    console.log(`\nRecommended Action: ${triage.recommendedAction}`);
  }

  console.log('='.repeat(60));
}

/**
 * Full auto-triage workflow
 * Returns true if auto-retry was triggered
 */
export async function performAutoTriage(
  recipe: UnifiedRecipe,
  result: CookingResult,
  originalOptions: CookingOptions,
  autoFixAttempts: number = 0
): Promise<{ shouldRetry: boolean; retryOptions?: CookingOptions; triage: TriageResult }> {
  // Step 1: Analyze the result
  const triage = analyzeRecipeResult(result);

  // Step 2: Log diagnostics
  logTriageResults(recipe.title, triage);

  // Step 3: Track failed recipes for Phase 3 self-healing
  if (triage.status === 'formality-bottleneck') {
    trackFailedRecipe(recipe, result, 'formality-bottleneck', originalOptions);
  } else if (triage.status === 'low-yield' && triage.recommendedAction === 'retry-with-discovery') {
    trackFailedRecipe(recipe, result, 'low-yield-formality', originalOptions);
  }

  // Step 4: Determine if auto-retry is warranted
  const shouldRetry = shouldAutoRetryWithDiscovery(triage, autoFixAttempts);

  if (shouldRetry) {
    // Step 5: Build retry options
    const retryOptions = buildAutoRetryOptions(originalOptions, triage);

    console.log(`\n🔁 AUTO-RETRY TRIGGERED: Re-cooking with Discovery Mode...`);
    console.log(`   Attempt ${autoFixAttempts + 1}/2\n`);

    return { shouldRetry: true, retryOptions, triage };
  }

  if (triage.needsAutoFix && !shouldRetry) {
    console.log(`\n⏸️  Auto-fix needed but conditions not met for retry`);
    console.log(`   Recipe tagged for manual review\n`);
  }

  return { shouldRetry: false, triage };
}
