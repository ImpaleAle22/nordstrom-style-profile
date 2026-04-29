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
    expectedMaterials?: string[];
    expectedBrands?: string[];
    expectedSeason?: string;
    ingredientQueries?: string[];
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
export declare function scoreIngredientFidelity(products: Product[], recipeContext: RecipeContext): number;
/**
 * Score query relevance (0-100)
 * How well do products match the search queries from the recipe?
 *
 * Uses CLIP semantic similarity scores (already computed during product search).
 * These embeddings capture semantic meaning better than keyword matching.
 *
 * Example:
 * - Query: "black leather jacket" → CLIP score: 0.87 → 87/100
 * - Product titled "Biker Jacket" (semantically similar) still scores high
 * - No penalty for synonyms or different wording
 */
export declare function scoreQueryRelevance(products: Product[], recipeContext: RecipeContext): number;
/**
 * Score season matching (0-100)
 * Does the recipe specify a season, and do the products match it?
 *
 * Example:
 * - Recipe: "fall" → Products have fall-appropriate fabrics → 100
 * - Recipe: "fall" → Products have lightweight summer fabrics → 30
 * - Recipe: no season specified → 100 (all-season)
 */
export declare function scoreSeasonMatching(products: Product[], recipeContext: RecipeContext): number;
/**
 * Score brand matching (0-100)
 * Did the recipe specify brands, and did we hit them?
 *
 * Example:
 * - Recipe: ["Nike", "Adidas"] → Product brand: "Nike" → 100
 * - Recipe: ["Nike", "Adidas"] → Product brand: "Puma" → 50 (athletic but not requested)
 * - Recipe: no brands specified → 100 (any brand is fine)
 */
export declare function scoreBrandMatching(products: Product[], recipeContext: RecipeContext): number;
/**
 * Compute complete recipe alignment score
 */
export declare function scoreRecipeAlignment(products: Product[], recipeContext: RecipeContext): RecipeAlignmentBreakdown;
//# sourceMappingURL=recipe-alignment.d.ts.map