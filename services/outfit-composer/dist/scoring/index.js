"use strict";
/**
 * Main Scoring Engine (Two-Score System)
 *
 * Computes two independent scores:
 * 1. Outfit Quality - How good is the outfit?
 * 2. Recipe Alignment - How well does it match the recipe?
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreOutfitQuality = scoreOutfitQuality;
exports.computeQualityScore = computeQualityScore;
exports.computeAlignmentScore = computeAlignmentScore;
exports.getOutfitTier = getOutfitTier;
exports.evaluateOutfitTwoScore = evaluateOutfitTwoScore;
exports.scoreOutfit = scoreOutfit;
exports.computeConfidenceScore = computeConfidenceScore;
exports.getPoolTier = getPoolTier;
exports.evaluateOutfit = evaluateOutfit;
const types_1 = require("../types");
const style_register_1 = require("./style-register");
const color_harmony_1 = require("./color-harmony");
const silhouette_balance_1 = require("./silhouette-balance");
const occasion_season_1 = require("./occasion-season");
const recipe_alignment_1 = require("./recipe-alignment");
// ============================================================================
// NEW TWO-SCORE SYSTEM
// ============================================================================
/**
 * Compute outfit quality score breakdown
 * Measures how good the outfit is, independent of recipe
 */
function scoreOutfitQuality(products, theme, signals) {
    // Map existing scorers to quality components
    const styleCoherence = (0, style_register_1.scoreStyleRegisterCoherence)(products);
    const colorHarmony = (0, color_harmony_1.scoreColorHarmony)(products);
    const silhouetteBalance = (0, silhouette_balance_1.scoreSilhouetteBalance)(products);
    // General fashionability is blend of occasion + season appropriateness
    const occasionScore = (0, occasion_season_1.scoreOccasionAlignment)(products, theme);
    const seasonScore = (0, occasion_season_1.scoreSeasonFabricWeight)(products, signals);
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
function computeQualityScore(breakdown, weights = types_1.DEFAULT_QUALITY_WEIGHTS) {
    return Math.round(breakdown.colorHarmony * weights.colorHarmony +
        breakdown.styleCoherence * weights.styleCoherence +
        breakdown.silhouetteBalance * weights.silhouetteBalance +
        breakdown.generalFashionability * weights.generalFashionability);
}
/**
 * Compute weighted alignment score (0-100)
 */
function computeAlignmentScore(breakdown, weights = types_1.DEFAULT_ALIGNMENT_WEIGHTS) {
    return Math.round(breakdown.ingredientFidelity * weights.ingredientFidelity +
        breakdown.queryRelevance * weights.queryRelevance +
        breakdown.seasonMatching * weights.seasonMatching +
        breakdown.brandMatching * weights.brandMatching);
}
/**
 * Determine outfit tier based on both scores and context
 */
function getOutfitTier(qualityScore, alignmentScore, context = 'recipe-page') {
    const qualityLevel = qualityScore >= types_1.SCORE_THRESHOLDS.quality.high ? 'high' :
        qualityScore >= types_1.SCORE_THRESHOLDS.quality.medium ? 'medium' : 'low';
    const alignmentLevel = alignmentScore >= types_1.SCORE_THRESHOLDS.alignment.high ? 'high' :
        alignmentScore >= types_1.SCORE_THRESHOLDS.alignment.medium ? 'medium' : 'low';
    // Suppress low-quality outfits regardless of context
    if (qualityLevel === 'low') {
        return 'suppressed';
    }
    if (context === 'recipe-page') {
        // Recipe page: Alignment is MORE important than quality
        if (alignmentLevel === 'high' && qualityLevel === 'high') {
            return 'primary'; // Perfect match
        }
        if (alignmentLevel === 'high' || (alignmentLevel === 'medium' && qualityLevel === 'high')) {
            return 'secondary'; // Good enough
        }
        if (alignmentLevel === 'low' && qualityLevel === 'high') {
            return 'happy-accident'; // High quality but doesn't match recipe
        }
        return 'suppressed';
    }
    else {
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
function evaluateOutfitTwoScore(products, theme, signals, recipeContext, context = 'recipe-page') {
    // Score quality
    const qualityBreakdown = scoreOutfitQuality(products, theme, signals);
    const qualityScore = computeQualityScore(qualityBreakdown);
    // Score alignment
    const alignmentBreakdown = (0, recipe_alignment_1.scoreRecipeAlignment)(products, recipeContext);
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
function scoreOutfit(products, theme, signals, weights = types_1.DEFAULT_SCORING_WEIGHTS) {
    return {
        styleRegisterCoherence: (0, style_register_1.scoreStyleRegisterCoherence)(products),
        colorHarmony: (0, color_harmony_1.scoreColorHarmony)(products),
        silhouetteBalance: (0, silhouette_balance_1.scoreSilhouetteBalance)(products),
        occasionAlignment: (0, occasion_season_1.scoreOccasionAlignment)(products, theme),
        seasonFabricWeight: (0, occasion_season_1.scoreSeasonFabricWeight)(products, signals),
    };
}
/**
 * @deprecated Use computeQualityScore instead
 */
function computeConfidenceScore(breakdown, weights = types_1.DEFAULT_SCORING_WEIGHTS) {
    return Math.round(breakdown.styleRegisterCoherence * weights.styleRegisterCoherence +
        breakdown.colorHarmony * weights.colorHarmony +
        breakdown.silhouetteBalance * weights.silhouetteBalance +
        breakdown.occasionAlignment * weights.occasionAlignment +
        breakdown.seasonFabricWeight * weights.seasonFabricWeight);
}
/**
 * @deprecated Use getOutfitTier instead
 */
function getPoolTier(score) {
    if (score >= types_1.CONFIDENCE_THRESHOLDS.primary)
        return 'primary';
    if (score >= types_1.CONFIDENCE_THRESHOLDS.secondary)
        return 'secondary';
    return 'suppressed';
}
/**
 * @deprecated Use evaluateOutfitTwoScore instead
 */
function evaluateOutfit(products, theme, signals, weights) {
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
__exportStar(require("./style-register"), exports);
__exportStar(require("./color-harmony"), exports);
__exportStar(require("./silhouette-balance"), exports);
__exportStar(require("./occasion-season"), exports);
__exportStar(require("./recipe-alignment"), exports);
//# sourceMappingURL=index.js.map