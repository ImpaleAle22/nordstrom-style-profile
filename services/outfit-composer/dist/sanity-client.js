"use strict";
/**
 * Sanity Client for Outfit Composer
 *
 * Fetches recipes, ingredient sets, and products from Sanity CMS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOutfitRecipe = fetchOutfitRecipe;
exports.fetchAllRecipes = fetchAllRecipes;
exports.saveComposedOutfit = saveComposedOutfit;
const client_1 = require("@sanity/client");
const client = (0, client_1.createClient)({
    projectId: process.env.SANITY_PROJECT_ID || 'qqgs5pib',
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
    token: process.env.SANITY_TOKEN,
    useCdn: false, // Use fresh data for composition
});
/**
 * Fetch outfit recipe by ID with full ingredient sets and products
 */
async function fetchOutfitRecipe(recipeId) {
    const query = `
    *[_type == "outfitRecipe" && recipeId == $recipeId][0] {
      _id,
      recipeId,
      title,
      theme,
      department,
      season,
      color,
      slots[] {
        role,
        conditional,
        "ingredientSet": ingredientSet-> {
          _id,
          setId,
          displayTitle,
          query,
          theme,
          department,
          productType1,
          productType2,
          brands,
          tags,
          season,
          signal,
          "products": products[]-> {
            _id,
            title,
            brand,
            price,
            productId,
            primaryImageUrl,
            department,
            productType1,
            productType2,
            productType3,
            productType4,
            materials,
            dominantColors,
            simplifiedColors,
            vanityColor,
            patterns,
            occasions,
            seasons,
            weatherContext,
            activityContext,
            silhouette,
            sleeveStyle,
            neckline,
            heelStyle,
            isOutfitEligible
          }
        }
      }
    }
  `;
    const recipe = await client.fetch(query, { recipeId });
    return recipe;
}
/**
 * Fetch all outfit recipes (for batch processing)
 */
async function fetchAllRecipes() {
    const query = `
    *[_type == "outfitRecipe"] {
      _id,
      recipeId,
      title,
      theme,
      department,
      season
    }
  `;
    return client.fetch(query);
}
/**
 * Save composed outfit back to recipe (adds to sampleOutfits array)
 */
async function saveComposedOutfit(recipeId, outfitId, items, confidenceScore, aiReasoning) {
    // Find recipe document
    const recipe = await client.fetch('*[_type == "outfitRecipe" && recipeId == $recipeId][0] { _id }', { recipeId });
    if (!recipe) {
        throw new Error(`Recipe ${recipeId} not found`);
    }
    // Add outfit to sampleOutfits array
    await client
        .patch(recipe._id)
        .setIfMissing({ sampleOutfits: [] })
        .append('sampleOutfits', [
        {
            outfitId,
            items: items.map((item) => ({
                role: item.role,
                product: { _type: 'reference', _ref: item.productId },
            })),
            aiGenerated: true,
            aiConfidence: confidenceScore,
            aiReasoning,
        },
    ])
        .commit();
}
exports.default = client;
//# sourceMappingURL=sanity-client.js.map