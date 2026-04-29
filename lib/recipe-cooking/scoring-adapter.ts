/**
 * Scoring Adapter (Two-Score System)
 * Integrates scoring engine with recipe cooking system
 */

import type { ClipProduct, OutfitCombination, ScoredOutfit, IngredientWithProducts } from './types';
import {
  evaluateOutfitTwoScore,
  type RecipeContext,
} from '../../../services/outfit-composer/src/scoring';
import type {
  Product,
  CustomerSignals,
} from '../../../services/outfit-composer/src/types';

/**
 * Convert ClipProduct to scoring engine Product format
 */
function convertToProduct(clipProduct: ClipProduct): Product {
  return {
    _id: clipProduct.id,
    title: clipProduct.title,
    brand: clipProduct.brand,
    price: clipProduct.price,
    productId: clipProduct.id,
    primaryImageUrl: clipProduct.imageUrl,
    department: clipProduct.department,
    productType1: clipProduct.productType1,
    productType2: clipProduct.productType2,
    productType3: clipProduct.productType3,
    productType4: clipProduct.productType4,
    materials: clipProduct.materials,
    dominantColors: clipProduct.colors,
    patterns: clipProduct.patterns,
    occasions: clipProduct.occasions,
    seasons: clipProduct.season ? [clipProduct.season] : undefined,
    isOutfitEligible: true,
    // @ts-ignore - Pass through CLIP score for alignment scoring
    clip_score: clipProduct.clip_score,
  };
}

/**
 * Build recipe context from ingredients
 * Uses the RECIPE SPECIFICATION (what was asked for), not what products happened to be fetched
 */
function buildRecipeContext(
  ingredients: IngredientWithProducts[],
  recipeSeason?: string
): RecipeContext {
  // Extract expected materials from RECIPE SPECIFICATION (not from products[0])
  // This is what the recipe ASKED FOR, which is what alignment should measure against
  const expectedMaterials = ingredients.flatMap(ing =>
    ing.materials || []
  ).filter((m, idx, arr) => arr.indexOf(m) === idx); // unique

  // Extract expected brands from RECIPE SPECIFICATION
  const expectedBrands = ingredients.flatMap(ing =>
    ing.brands || []
  ).filter((b, idx, arr) => arr.indexOf(b) === idx); // unique

  // Extract search queries
  const ingredientQueries = ingredients.map(ing => ing.searchQuery);

  console.log(`[Recipe Context] Expected materials: ${expectedMaterials.join(', ') || 'none specified'}`);
  console.log(`[Recipe Context] Expected brands: ${expectedBrands.join(', ') || 'none specified'}`);

  return {
    expectedMaterials,
    expectedBrands,
    expectedSeason: recipeSeason,
    ingredientQueries,
  };
}

/**
 * Score a single outfit combination (Two-Score System)
 */
export function scoreOutfitCombination(
  combination: OutfitCombination,
  theme: string,
  signals: CustomerSignals,
  recipeContext: RecipeContext,
  recipeId?: string,
  minAlignmentForLink: number = 9  // Link Primary AND Secondary tiers (medium threshold)
): ScoredOutfit {
  try {
    // Convert ClipProducts to Product format
    const products = combination.items.map((item) => convertToProduct(item.product));

    // Extract roles for weighted scoring
    const productRoles = combination.items.map((item) => item.role);

    console.log(`[Scoring] Outfit with ${products.length} items, theme: ${theme}`);

    // Score using two-score system (with weighted alignment by role)
    const {
      qualityScore,
      qualityBreakdown,
      alignmentScore,
      alignmentBreakdown,
      poolTier,
    } = evaluateOutfitTwoScore(products, theme, signals, recipeContext, 'recipe-page', productRoles);

    console.log(`[Scoring] Quality: ${qualityScore}, Alignment: ${alignmentScore}, Tier: ${poolTier}`);

    // Determine if outfit should be linked to recipe
    const linkedToRecipe = alignmentScore >= minAlignmentForLink;
    console.log(`[Scoring] linkedToRecipe: ${linkedToRecipe} (alignment ${alignmentScore} >= threshold ${minAlignmentForLink})`);

    return {
      ...combination,
      qualityScore,
      alignmentScore,
      poolTier,
      qualityBreakdown,
      alignmentBreakdown,
      linkedToRecipe,
      sourceRecipeId: recipeId,
      // Legacy support (use quality score as confidence)
      confidenceScore: qualityScore,
      scoreBreakdown: {
        styleRegisterCoherence: qualityBreakdown.styleCoherence,
        colorHarmony: qualityBreakdown.colorHarmony,
        silhouetteBalance: qualityBreakdown.silhouetteBalance,
        occasionAlignment: qualityBreakdown.generalFashionability,
        seasonFabricWeight: qualityBreakdown.generalFashionability,
      },
    };
  } catch (error) {
    console.error('[Scoring] ERROR scoring outfit:', error);
    console.error('[Scoring] Outfit items:', combination.items.map(i => i.product.title));

    // Return fallback scores
    return {
      ...combination,
      qualityScore: 0,
      alignmentScore: 0,
      poolTier: 'suppressed',
      qualityBreakdown: {
        colorHarmony: 0,
        styleCoherence: 0,
        silhouetteBalance: 0,
        generalFashionability: 0,
      },
      alignmentBreakdown: {
        ingredientFidelity: 0,
        queryRelevance: 0,
        seasonMatching: 0,
        brandMatching: 0,
      },
      linkedToRecipe: false,
      sourceRecipeId: recipeId,
      confidenceScore: 0,
      scoreBreakdown: {
        styleRegisterCoherence: 0,
        colorHarmony: 0,
        silhouetteBalance: 0,
        occasionAlignment: 0,
        seasonFabricWeight: 0,
      },
    };
  }
}

/**
 * Score multiple outfit combinations in batch (Two-Score System)
 */
export function scoreOutfitBatch(
  combinations: OutfitCombination[],
  theme: string,
  signals: CustomerSignals,
  ingredients?: IngredientWithProducts[],
  recipeSeason?: string,
  recipeId?: string,
  minAlignmentForLink: number = 80
): ScoredOutfit[] {
  // Build recipe context if ingredients provided
  const recipeContext = ingredients
    ? buildRecipeContext(ingredients, recipeSeason)
    : { ingredientQueries: [] };

  const scored = combinations.map((combo) =>
    scoreOutfitCombination(combo, theme, signals, recipeContext, recipeId, minAlignmentForLink)
  );

  // Sort by quality score descending (primary sort)
  // Then by alignment score (secondary sort for tie-breaking)
  scored.sort((a, b) => {
    if (b.qualityScore !== a.qualityScore) {
      return b.qualityScore - a.qualityScore;
    }
    return b.alignmentScore - a.alignmentScore;
  });

  return scored;
}

/**
 * Filter outfits by minimum confidence threshold
 */
export function filterByConfidence(
  outfits: ScoredOutfit[],
  minConfidence: number
): ScoredOutfit[] {
  return outfits.filter((outfit) => outfit.confidenceScore >= minConfidence);
}

/**
 * Get statistics about scored outfits
 */
export function getOutfitStats(outfits: ScoredOutfit[]) {
  const primary = outfits.filter((o) => o.poolTier === 'primary').length;
  const secondary = outfits.filter((o) => o.poolTier === 'secondary').length;
  const suppressed = outfits.filter((o) => o.poolTier === 'suppressed').length;

  return {
    total: outfits.length,
    primary,
    secondary,
    suppressed,
    avgScore: outfits.reduce((sum, o) => sum + o.confidenceScore, 0) / outfits.length || 0,
    highScore: outfits[0]?.confidenceScore || 0,
    lowScore: outfits[outfits.length - 1]?.confidenceScore || 0,
  };
}
