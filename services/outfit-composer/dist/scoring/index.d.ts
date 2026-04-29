/**
 * Main Scoring Engine (Two-Score System)
 *
 * Computes two independent scores:
 * 1. Outfit Quality - How good is the outfit?
 * 2. Recipe Alignment - How well does it match the recipe?
 */
import type { Product, CustomerSignals, OutfitQualityBreakdown, RecipeAlignmentBreakdown, QualityWeights, AlignmentWeights, OutfitContext, OutfitScoreBreakdown, ScoringWeights } from '../types';
import { type RecipeContext } from './recipe-alignment';
/**
 * Compute outfit quality score breakdown
 * Measures how good the outfit is, independent of recipe
 */
export declare function scoreOutfitQuality(products: Product[], theme: string, signals: CustomerSignals): OutfitQualityBreakdown;
/**
 * Compute weighted outfit quality score (0-100)
 */
export declare function computeQualityScore(breakdown: OutfitQualityBreakdown, weights?: QualityWeights): number;
/**
 * Compute weighted alignment score (0-100)
 */
export declare function computeAlignmentScore(breakdown: RecipeAlignmentBreakdown, weights?: AlignmentWeights): number;
/**
 * Determine outfit tier based on both scores and context
 */
export declare function getOutfitTier(qualityScore: number, alignmentScore: number, context?: OutfitContext): 'primary' | 'secondary' | 'suppressed' | 'happy-accident';
/**
 * Complete two-score evaluation pipeline
 */
export declare function evaluateOutfitTwoScore(products: Product[], theme: string, signals: CustomerSignals, recipeContext: RecipeContext, context?: OutfitContext): {
    qualityScore: number;
    qualityBreakdown: OutfitQualityBreakdown;
    alignmentScore: number;
    alignmentBreakdown: RecipeAlignmentBreakdown;
    poolTier: "primary" | "secondary" | "suppressed" | "happy-accident";
};
/**
 * @deprecated Use scoreOutfitQuality instead
 */
export declare function scoreOutfit(products: Product[], theme: string, signals: CustomerSignals, weights?: ScoringWeights): OutfitScoreBreakdown;
/**
 * @deprecated Use computeQualityScore instead
 */
export declare function computeConfidenceScore(breakdown: OutfitScoreBreakdown, weights?: ScoringWeights): number;
/**
 * @deprecated Use getOutfitTier instead
 */
export declare function getPoolTier(score: number): 'primary' | 'secondary' | 'suppressed';
/**
 * @deprecated Use evaluateOutfitTwoScore instead
 */
export declare function evaluateOutfit(products: Product[], theme: string, signals: CustomerSignals, weights?: ScoringWeights): {
    breakdown: OutfitScoreBreakdown;
    confidenceScore: number;
    poolTier: "primary" | "secondary" | "suppressed";
};
export * from './style-register';
export * from './color-harmony';
export * from './silhouette-balance';
export * from './occasion-season';
export * from './recipe-alignment';
//# sourceMappingURL=index.d.ts.map