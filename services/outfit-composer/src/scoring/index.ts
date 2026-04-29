/**
 * Main Scoring Engine (Two-Score System)
 *
 * Computes two independent scores:
 * 1. Outfit Quality - How good is the outfit?
 * 2. Recipe Alignment - How well does it match the recipe?
 */

import type {
  Product,
  CustomerSignals,
  OutfitQualityBreakdown,
  RecipeAlignmentBreakdown,
  QualityWeights,
  AlignmentWeights,
  OutfitContext,
  OutfitScoreBreakdown,
  ScoringWeights,
} from '../types';
import {
  DEFAULT_QUALITY_WEIGHTS,
  DEFAULT_ALIGNMENT_WEIGHTS,
  SCORE_THRESHOLDS,
  DEFAULT_SCORING_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
} from '../types';
import { scoreStyleRegisterCoherence } from './style-register';
import { scoreColorHarmony } from './color-harmony';
import { scoreSilhouetteBalance } from './silhouette-balance';
import { scoreOccasionAlignment, scoreSeasonFabricWeight } from './occasion-season';
import { scoreRecipeAlignment, type RecipeContext } from './recipe-alignment';

// ============================================================================
// NEW TWO-SCORE SYSTEM
// ============================================================================

/**
 * Compute outfit quality score breakdown
 * Measures how good the outfit is, independent of recipe
 */
export function scoreOutfitQuality(
  products: Product[],
  theme: string,
  signals: CustomerSignals
): OutfitQualityBreakdown {
  // Map existing scorers to quality components
  const styleCoherence = scoreStyleRegisterCoherence(products);
  const colorHarmony = scoreColorHarmony(products);
  const silhouetteBalance = scoreSilhouetteBalance(products);

  // General fashionability is blend of occasion + season appropriateness
  const occasionScore = scoreOccasionAlignment(products, theme);
  const seasonScore = scoreSeasonFabricWeight(products, signals);
  const generalFashionability = Math.round((occasionScore + seasonScore) / 2);

  return {
    colorHarmony,
    styleCoherence,
    silhouetteBalance,
    generalFashionability,
  };
}

/**
 * Compute weighted outfit quality score (0-100)
 */
export function computeQualityScore(
  breakdown: OutfitQualityBreakdown,
  weights: QualityWeights = DEFAULT_QUALITY_WEIGHTS
): number {
  return Math.round(
    breakdown.colorHarmony * weights.colorHarmony +
    breakdown.styleCoherence * weights.styleCoherence +
    breakdown.silhouetteBalance * weights.silhouetteBalance +
    breakdown.generalFashionability * weights.generalFashionability
  );
}

/**
 * Compute weighted alignment score (0-100)
 */
export function computeAlignmentScore(
  breakdown: RecipeAlignmentBreakdown,
  weights: AlignmentWeights = DEFAULT_ALIGNMENT_WEIGHTS
): number {
  return Math.round(
    breakdown.ingredientFidelity * weights.ingredientFidelity +
    breakdown.queryRelevance * weights.queryRelevance +
    breakdown.seasonMatching * weights.seasonMatching +
    breakdown.brandMatching * weights.brandMatching
  );
}

/**
 * Determine outfit tier based on both scores and context
 */
export function getOutfitTier(
  qualityScore: number,
  alignmentScore: number,
  context: OutfitContext = 'recipe-page'
): 'primary' | 'secondary' | 'suppressed' | 'happy-accident' {
  const qualityLevel =
    qualityScore >= SCORE_THRESHOLDS.quality.high ? 'high' :
    qualityScore >= SCORE_THRESHOLDS.quality.medium ? 'medium' : 'low';

  const alignmentLevel =
    alignmentScore >= SCORE_THRESHOLDS.alignment.high ? 'high' :
    alignmentScore >= SCORE_THRESHOLDS.alignment.medium ? 'medium' : 'low';

  // Suppress low-quality outfits regardless of context
  if (qualityLevel === 'low') {
    return 'suppressed';
  }

  if (context === 'recipe-page') {
    // Recipe page: Alignment is MORE important than quality
    if (alignmentLevel === 'high' && qualityLevel === 'high') {
      return 'primary';  // Perfect match
    }
    if (alignmentLevel === 'high' || (alignmentLevel === 'medium' && qualityLevel === 'high')) {
      return 'secondary';  // Good enough
    }
    if (alignmentLevel === 'low' && qualityLevel === 'high') {
      return 'happy-accident';  // High quality but doesn't match recipe
    }
    return 'suppressed';
  } else {
    // Discovery context: Quality is all that matters
    if (qualityLevel === 'high') {
      return 'primary';
    }
    return 'secondary';
  }
}

/**
 * Complete two-score evaluation pipeline
 */
export function evaluateOutfitTwoScore(
  products: Product[],
  theme: string,
  signals: CustomerSignals,
  recipeContext: RecipeContext,
  context: OutfitContext = 'recipe-page',
  productRoles?: string[]
) {
  // Score quality
  const qualityBreakdown = scoreOutfitQuality(products, theme, signals);
  const qualityScore = computeQualityScore(qualityBreakdown);

  // Score alignment (with weighted scoring by role)
  const alignmentBreakdown = scoreRecipeAlignment(products, recipeContext, productRoles);
  const alignmentScore = computeAlignmentScore(alignmentBreakdown);

  // Determine tier
  const poolTier = getOutfitTier(qualityScore, alignmentScore, context);

  return {
    qualityScore,
    qualityBreakdown,
    alignmentScore,
    alignmentBreakdown,
    poolTier,
  };
}

// ============================================================================
// LEGACY SINGLE-SCORE SYSTEM (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use scoreOutfitQuality instead
 */
export function scoreOutfit(
  products: Product[],
  theme: string,
  signals: CustomerSignals,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): OutfitScoreBreakdown {
  return {
    styleRegisterCoherence: scoreStyleRegisterCoherence(products),
    colorHarmony: scoreColorHarmony(products),
    silhouetteBalance: scoreSilhouetteBalance(products),
    occasionAlignment: scoreOccasionAlignment(products, theme),
    seasonFabricWeight: scoreSeasonFabricWeight(products, signals),
  };
}

/**
 * @deprecated Use computeQualityScore instead
 */
export function computeConfidenceScore(
  breakdown: OutfitScoreBreakdown,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  return Math.round(
    breakdown.styleRegisterCoherence * weights.styleRegisterCoherence +
    breakdown.colorHarmony * weights.colorHarmony +
    breakdown.silhouetteBalance * weights.silhouetteBalance +
    breakdown.occasionAlignment * weights.occasionAlignment +
    breakdown.seasonFabricWeight * weights.seasonFabricWeight
  );
}

/**
 * @deprecated Use getOutfitTier instead
 */
export function getPoolTier(score: number): 'primary' | 'secondary' | 'suppressed' {
  if (score >= CONFIDENCE_THRESHOLDS.primary) return 'primary';
  if (score >= CONFIDENCE_THRESHOLDS.secondary) return 'secondary';
  return 'suppressed';
}

/**
 * @deprecated Use evaluateOutfitTwoScore instead
 */
export function evaluateOutfit(
  products: Product[],
  theme: string,
  signals: CustomerSignals,
  weights?: ScoringWeights
) {
  const breakdown = scoreOutfit(products, theme, signals, weights);
  const confidenceScore = computeConfidenceScore(breakdown, weights);
  const poolTier = getPoolTier(confidenceScore);

  return {
    breakdown,
    confidenceScore,
    poolTier,
  };
}

// Re-export scoring modules for direct access
export * from './style-register';
export * from './color-harmony';
export * from './silhouette-balance';
export * from './occasion-season';
export * from './recipe-alignment';
