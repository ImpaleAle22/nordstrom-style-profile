"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreIngredientFidelity = scoreIngredientFidelity;
exports.scoreQueryRelevance = scoreQueryRelevance;
exports.scoreSeasonMatching = scoreSeasonMatching;
exports.scoreBrandMatching = scoreBrandMatching;
exports.scoreRecipeAlignment = scoreRecipeAlignment;
/**
 * Score ingredient fidelity (0-100)
 * Did we get the materials/styles specified in the recipe?
 *
 * Example:
 * - Recipe says "high-waist denim" → product has materials: ["Denim"] → 100
 * - Recipe says "high-waist denim" → product has materials: ["Cotton"] → 50
 * - Recipe says "high-waist denim" → product has no materials → 0
 */
function scoreIngredientFidelity(products, recipeContext) {
    const { expectedMaterials = [] } = recipeContext;
    // If recipe doesn't specify materials, assume perfect match
    if (expectedMaterials.length === 0) {
        return 100;
    }
    // Check how many products have expected materials
    const matches = products.filter(product => {
        const productMaterials = product.materials || [];
        // Product matches if it has at least one expected material
        return expectedMaterials.some(expected => productMaterials.some(mat => mat.toLowerCase().includes(expected.toLowerCase())));
    });
    // Score based on match percentage
    const matchRate = matches.length / products.length;
    if (matchRate >= 0.8)
        return 100; // 80%+ match = perfect
    if (matchRate >= 0.6)
        return 80; // 60-79% match = good
    if (matchRate >= 0.4)
        return 60; // 40-59% match = okay
    if (matchRate >= 0.2)
        return 40; // 20-39% match = weak
    return 20; // <20% match = poor
}
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
function scoreQueryRelevance(products, recipeContext) {
    // CLIP scores are stored on products during search (0-1 range)
    // We already computed these embeddings - use them!
    const clipScores = products
        .map(p => {
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
        return score;
    });
    // Average across all products
    const avgScore = clipScores.reduce((sum, s) => sum + s, 0) / clipScores.length;
    console.log(`[Query Relevance] CLIP scores: ${clipScores.map(s => s.toFixed(1)).join(', ')} → avg: ${Math.round(avgScore)}`);
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
function scoreSeasonMatching(products, recipeContext) {
    const { expectedSeason } = recipeContext;
    // No season specified = all-season recipe
    if (!expectedSeason) {
        return 100;
    }
    // Check how many products have matching season
    const matches = products.filter(product => {
        const productSeasons = product.seasons || [];
        return productSeasons.some(s => s.toLowerCase() === expectedSeason.toLowerCase());
    });
    const matchRate = matches.length / products.length;
    if (matchRate >= 0.8)
        return 100;
    if (matchRate >= 0.6)
        return 80;
    if (matchRate >= 0.4)
        return 60;
    if (matchRate >= 0.2)
        return 40;
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
function scoreBrandMatching(products, recipeContext) {
    const { expectedBrands = [] } = recipeContext;
    // No brands specified = any brand is fine
    if (expectedBrands.length === 0) {
        return 100;
    }
    // Check how many products match expected brands
    const matches = products.filter(product => {
        return expectedBrands.some(expected => product.brand.toLowerCase() === expected.toLowerCase());
    });
    const matchRate = matches.length / products.length;
    if (matchRate >= 0.5)
        return 100; // 50%+ match = good (some brands in outfit)
    if (matchRate >= 0.25)
        return 70; // 25-49% match = okay
    return 40; // <25% match = weak
}
/**
 * Compute complete recipe alignment score
 */
function scoreRecipeAlignment(products, recipeContext) {
    return {
        ingredientFidelity: scoreIngredientFidelity(products, recipeContext),
        queryRelevance: scoreQueryRelevance(products, recipeContext),
        seasonMatching: scoreSeasonMatching(products, recipeContext),
        brandMatching: scoreBrandMatching(products, recipeContext),
    };
}
//# sourceMappingURL=recipe-alignment.js.map