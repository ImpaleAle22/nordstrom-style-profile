/**
 * Recipe Alignment Scoring
 *
 * Measures how well an outfit matches what the recipe asked for.
 * This is separate from outfit quality - a great outfit might have
 * low alignment if it doesn't match the recipe intent.
 *
 * PHILOSOPHY:
 * - Focus on ingredient fidelity (materials/styles) and query relevance
 * - Season is EMERGENT from the outfit (fabrics define season), not prescribed
 * - Brands are suggestions, not requirements
 */

import type { Product, RecipeAlignmentBreakdown } from '../types';

/**
 * Recipe context for alignment scoring
 */
export interface RecipeContext {
  expectedMaterials?: string[];    // PT2/materials specified in recipe
  expectedBrands?: string[];       // Brands specified in recipe
  expectedSeason?: string;         // Season specified in recipe
  ingredientQueries?: string[];    // Search queries from recipe slots
}

/**
 * Score ingredient fidelity (0-100)
 * Did we get the materials/styles specified in the recipe?
 *
 * Example:
 * - Recipe says "high-waist denim" → product has materials: ["Denim"] → 100
 * - Recipe says "high-waist denim" → product has materials: ["Cotton"] → 50
 * - Recipe says "high-waist denim" → product has no materials → 0
 */
export function scoreIngredientFidelity(
  products: Product[],
  recipeContext: RecipeContext
): number {
  const { expectedMaterials = [] } = recipeContext;

  // If recipe doesn't specify materials, assume perfect match
  if (expectedMaterials.length === 0) {
    return 100;
  }

  // Check how many products have expected materials
  const matches = products.filter(product => {
    const productMaterials = product.materials || [];
    // Product matches if it has at least one expected material
    return expectedMaterials.some(expected =>
      productMaterials.some(mat =>
        mat.toLowerCase().includes(expected.toLowerCase())
      )
    );
  });

  // Score based on match percentage
  const matchRate = matches.length / products.length;

  if (matchRate >= 0.8) return 100;  // 80%+ match = perfect
  if (matchRate >= 0.6) return 80;   // 60-79% match = good
  if (matchRate >= 0.4) return 60;   // 40-59% match = okay
  if (matchRate >= 0.2) return 40;   // 20-39% match = weak
  return 20;  // <20% match = poor
}

/**
 * Score query relevance (0-100)
 * How well do products match the search queries from the recipe?
 *
 * Uses CLIP semantic similarity scores (already computed during product search).
 * These embeddings capture semantic meaning better than keyword matching.
 *
 * WEIGHTED SCORING: Main garments (dress, tops, bottoms, shoes) weighted higher (1.2x)
 * than accessories (0.6x) because accessories are harder to match with CLIP and
 * shouldn't drag down the outfit score as much.
 *
 * Example:
 * - Query: "black leather jacket" → CLIP score: 0.87 → 87/100
 * - Product titled "Biker Jacket" (semantically similar) still scores high
 * - No penalty for synonyms or different wording
 */
export function scoreQueryRelevance(
  products: Product[],
  recipeContext: RecipeContext,
  productRoles?: string[]
): number {
  // Role-based weights for importance in outfit
  const getRoleWeight = (role?: string): number => {
    if (!role) return 1.0;
    const roleStr = role.toLowerCase();
    // Main garments: higher weight (these define the outfit)
    if (roleStr === 'one-piece' || roleStr === 'tops' || roleStr === 'bottoms' || roleStr === 'shoes') {
      return 1.2;
    }
    // Accessories: lower weight (harder to match with CLIP, less critical)
    if (roleStr === 'accessories' || roleStr === 'outerwear') {
      return 0.6;
    }
    return 1.0;
  };

  // CLIP scores are stored on products during search (0-1 range)
  // We already computed these embeddings - use them!
  const clipScores = products
    .map((p, idx) => {
      // Try to get CLIP score from product
      // @ts-ignore - clip_score might not be in Product type yet
      const clipScore = p.clip_score || p.clipScore;

      // CLIP scores are typically 0-1, convert to 0-100
      // If missing, assume reasonable match (70)
      const score = clipScore ? clipScore * 100 : 70;

      // Debug logging
      if (!clipScore) {
        console.log(`[Query Relevance] Missing CLIP score for product: ${p.title} (using default 70)`);
      }

      // Apply role-based weight
      const role = productRoles?.[idx];
      const weight = getRoleWeight(role);

      return { score, weight, role };
    });

  // Weighted average across all products
  const totalWeightedScore = clipScores.reduce((sum, s) => sum + (s.score * s.weight), 0);
  const totalWeight = clipScores.reduce((sum, s) => sum + s.weight, 0);
  const avgScore = totalWeightedScore / totalWeight;

  console.log(`[Query Relevance] CLIP scores: ${clipScores.map(s => `${s.score.toFixed(1)}(${s.role || '?'}×${s.weight.toFixed(1)})`).join(', ')} → weighted avg: ${Math.round(avgScore)}`);

  return Math.round(avgScore);
}

/**
 * Score season matching (0-100)
 * Does the recipe specify a season, and do the products match it?
 *
 * Example:
 * - Recipe: "fall" → Products have fall-appropriate fabrics → 100
 * - Recipe: "fall" → Products have lightweight summer fabrics → 30
 * - Recipe: no season specified → 100 (all-season)
 */
export function scoreSeasonMatching(
  products: Product[],
  recipeContext: RecipeContext
): number {
  const { expectedSeason } = recipeContext;

  // No season specified = all-season recipe
  if (!expectedSeason) {
    return 100;
  }

  // Check how many products have matching season
  const matches = products.filter(product => {
    const productSeasons = product.seasons || [];
    return productSeasons.some(s =>
      s.toLowerCase() === expectedSeason.toLowerCase()
    );
  });

  const matchRate = matches.length / products.length;

  if (matchRate >= 0.8) return 100;
  if (matchRate >= 0.6) return 80;
  if (matchRate >= 0.4) return 60;
  if (matchRate >= 0.2) return 40;
  return 20;
}

/**
 * Score brand matching (0-100)
 * Did the recipe specify brands, and did we hit them?
 *
 * Example:
 * - Recipe: ["Nike", "Adidas"] → Product brand: "Nike" → 100
 * - Recipe: ["Nike", "Adidas"] → Product brand: "Puma" → 50 (athletic but not requested)
 * - Recipe: no brands specified → 100 (any brand is fine)
 */
export function scoreBrandMatching(
  products: Product[],
  recipeContext: RecipeContext
): number {
  const { expectedBrands = [] } = recipeContext;

  // No brands specified = any brand is fine
  if (expectedBrands.length === 0) {
    return 100;
  }

  // Check how many products match expected brands
  const matches = products.filter(product => {
    return expectedBrands.some(expected =>
      product.brand.toLowerCase() === expected.toLowerCase()
    );
  });

  const matchRate = matches.length / products.length;

  if (matchRate >= 0.5) return 100;  // 50%+ match = good (some brands in outfit)
  if (matchRate >= 0.25) return 70;  // 25-49% match = okay
  return 40;  // <25% match = weak
}

/**
 * Compute complete recipe alignment score
 */
export function scoreRecipeAlignment(
  products: Product[],
  recipeContext: RecipeContext,
  productRoles?: string[]
): RecipeAlignmentBreakdown {
  return {
    ingredientFidelity: scoreIngredientFidelity(products, recipeContext),
    queryRelevance: scoreQueryRelevance(products, recipeContext, productRoles),
    seasonMatching: scoreSeasonMatching(products, recipeContext),
    brandMatching: scoreBrandMatching(products, recipeContext),
  };
}
