/**
 * Smart Bulk Cook Helper
 *
 * Determines which recipes need (re)cooking based on existing outfits
 * Avoids duplicate generation and wasted AI cost
 * Includes ingredient health checks to detect zero-product queries
 */

import { getOutfitsByRecipe } from './indexeddb-storage';
import type { UnifiedRecipe } from './unified-recipe-types';
import { fetchProductsForIngredient } from './recipe-cooking/product-fetcher';
import type { OutfitRole } from './role-mappings';

export interface RecipeCookingStatus {
  recipeId: string;
  recipeTitle: string;
  needsCooking: boolean;
  reason: string;
  existingOutfitCount: number;
}

/**
 * Analyze which recipes need cooking based on existing outfits
 *
 * @param recipes - All recipes to analyze
 * @param minOutfitThreshold - Minimum number of outfits to consider "already cooked" (default: 10)
 * @returns Status for each recipe
 */
export async function analyzeRecipesForCooking(
  recipes: UnifiedRecipe[],
  minOutfitThreshold: number = 10
): Promise<RecipeCookingStatus[]> {
  const statuses: RecipeCookingStatus[] = [];

  for (const recipe of recipes) {
    try {
      // Get existing outfits for this recipe
      const existingOutfits = await getOutfitsByRecipe(recipe.id);
      const outfitCount = existingOutfits.length;

      let needsCooking = false;
      let reason = '';

      if (outfitCount === 0) {
        needsCooking = true;
        reason = 'No outfits generated yet';
      } else if (outfitCount < minOutfitThreshold) {
        needsCooking = true;
        reason = `Only ${outfitCount} outfits (threshold: ${minOutfitThreshold})`;
      } else {
        needsCooking = false;
        reason = `Already has ${outfitCount} outfits`;
      }

      statuses.push({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        needsCooking,
        reason,
        existingOutfitCount: outfitCount,
      });
    } catch (error) {
      // If we can't check outfits, assume it needs cooking
      statuses.push({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        needsCooking: true,
        reason: 'Unable to check existing outfits',
        existingOutfitCount: 0,
      });
    }
  }

  return statuses;
}

/**
 * Filter recipes to only those that need cooking
 *
 * @param recipes - All recipes
 * @param minOutfitThreshold - Minimum outfit count to skip re-cooking
 * @returns Recipes that need cooking
 */
export async function filterRecipesNeedingCooking(
  recipes: UnifiedRecipe[],
  minOutfitThreshold: number = 10
): Promise<{
  needsCooking: UnifiedRecipe[];
  alreadyCooked: UnifiedRecipe[];
  summary: {
    total: number;
    needsCooking: number;
    alreadyCooked: number;
    estimatedCost: string;
  };
}> {
  const statuses = await analyzeRecipesForCooking(recipes, minOutfitThreshold);

  const needsCooking: UnifiedRecipe[] = [];
  const alreadyCooked: UnifiedRecipe[] = [];

  statuses.forEach((status) => {
    const recipe = recipes.find((r) => r.id === status.recipeId);
    if (!recipe) return;

    if (status.needsCooking) {
      needsCooking.push(recipe);
    } else {
      alreadyCooked.push(recipe);
    }
  });

  // Estimate cost savings (rough estimate: $0.10 per recipe)
  const costPerRecipe = 0.10;
  const savedCost = alreadyCooked.length * costPerRecipe;

  return {
    needsCooking,
    alreadyCooked,
    summary: {
      total: recipes.length,
      needsCooking: needsCooking.length,
      alreadyCooked: alreadyCooked.length,
      estimatedCost: `$${savedCost.toFixed(2)} saved by skipping ${alreadyCooked.length} recipes`,
    },
  };
}

/**
 * Get detailed breakdown of outfit counts across all recipes
 */
export async function getOutfitCountBreakdown(
  recipes: UnifiedRecipe[]
): Promise<{
  byRecipe: Array<{ recipeId: string; title: string; count: number }>;
  total: number;
  distribution: {
    zero: number;
    low: number;    // 1-10
    medium: number; // 11-50
    high: number;   // 51+
  };
}> {
  const byRecipe: Array<{ recipeId: string; title: string; count: number }> = [];
  let total = 0;
  const distribution = { zero: 0, low: 0, medium: 0, high: 0 };

  for (const recipe of recipes) {
    const outfits = await getOutfitsByRecipe(recipe.id);
    const count = outfits.length;

    byRecipe.push({
      recipeId: recipe.id,
      title: recipe.title,
      count,
    });

    total += count;

    // Update distribution
    if (count === 0) distribution.zero++;
    else if (count <= 10) distribution.low++;
    else if (count <= 50) distribution.medium++;
    else distribution.high++;
  }

  return {
    byRecipe,
    total,
    distribution,
  };
}

/**
 * Ingredient Health Status
 */
export interface IngredientHealth {
  ingredientTitle: string;
  searchQuery: string;
  role: string;
  productCount: number;
  healthy: boolean; // false if productCount === 0
}

/**
 * Recipe Health Status
 */
export interface RecipeHealthStatus {
  recipeId: string;
  recipeTitle: string;
  healthy: boolean;
  emptyIngredients: number;
  totalIngredients: number;
  ingredients: IngredientHealth[];
  reason: string;
}

/**
 * Check ingredient health for a single recipe
 * Tests each ingredient query to see if it returns products
 */
export async function checkRecipeIngredientHealth(
  recipe: UnifiedRecipe
): Promise<RecipeHealthStatus> {
  const ingredientHealths: IngredientHealth[] = [];
  let emptyCount = 0;

  for (const slot of recipe.slots) {
    const ingredient = slot.ingredient;

    // Skip slots with no ingredient (data issue)
    if (!ingredient) {
      console.warn(`Recipe "${recipe.title}" has slot "${slot.role}" with no ingredient`);
      emptyCount++;
      ingredientHealths.push({
        ingredientTitle: `[Missing Ingredient for ${slot.role}]`,
        searchQuery: '',
        role: slot.role,
        productCount: 0,
        healthy: false,
      });
      continue;
    }

    try {
      // Test the ingredient query with a limit of 1 (fast check)
      const result = await fetchProductsForIngredient(
        ingredient.ingredientTitle,
        ingredient.searchQuery,
        slot.role as OutfitRole,
        {
          productType1: ingredient.productTypes,
          productType2: ingredient.productType2,
          materials: ingredient.materials,
          brands: ingredient.brands,
          department: recipe.department,
        },
        1, // Only need to know if ANY products exist
        false // Disable fallback for accurate health check
      );

      const healthy = result.products.length > 0;
      if (!healthy) emptyCount++;

      ingredientHealths.push({
        ingredientTitle: ingredient.ingredientTitle,
        searchQuery: ingredient.searchQuery,
        role: slot.role,
        productCount: result.products.length,
        healthy,
      });
    } catch (error) {
      // If fetch fails, mark as unhealthy
      emptyCount++;
      ingredientHealths.push({
        ingredientTitle: ingredient.ingredientTitle,
        searchQuery: ingredient.searchQuery,
        role: slot.role,
        productCount: 0,
        healthy: false,
      });
    }
  }

  const totalIngredients = recipe.slots.length;
  const healthy = emptyCount === 0;
  let reason = '';

  if (emptyCount === 0) {
    reason = 'All ingredients have products available';
  } else if (emptyCount === totalIngredients) {
    reason = `All ${totalIngredients} ingredients return 0 products`;
  } else {
    reason = `${emptyCount} of ${totalIngredients} ingredients return 0 products`;
  }

  return {
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    healthy,
    emptyIngredients: emptyCount,
    totalIngredients,
    ingredients: ingredientHealths,
    reason,
  };
}

/**
 * Check ingredient health for multiple recipes
 * Returns health status for each recipe
 */
export async function checkRecipeIngredientsHealth(
  recipes: UnifiedRecipe[],
  onProgress?: (current: number, total: number) => void
): Promise<RecipeHealthStatus[]> {
  const statuses: RecipeHealthStatus[] = [];

  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];

    if (onProgress) {
      onProgress(i + 1, recipes.length);
    }

    const status = await checkRecipeIngredientHealth(recipe);
    statuses.push(status);
  }

  return statuses;
}

/**
 * Filter recipes based on ingredient health
 * Separates healthy recipes from unhealthy ones
 */
export async function filterRecipesByHealth(
  recipes: UnifiedRecipe[],
  onProgress?: (current: number, total: number) => void
): Promise<{
  healthy: UnifiedRecipe[];
  unhealthy: UnifiedRecipe[];
  healthStatuses: RecipeHealthStatus[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    totalEmptyIngredients: number;
  };
}> {
  const healthStatuses = await checkRecipeIngredientsHealth(recipes, onProgress);

  const healthy: UnifiedRecipe[] = [];
  const unhealthy: UnifiedRecipe[] = [];
  let totalEmptyIngredients = 0;

  healthStatuses.forEach((status) => {
    const recipe = recipes.find((r) => r.id === status.recipeId);
    if (!recipe) return;

    totalEmptyIngredients += status.emptyIngredients;

    if (status.healthy) {
      healthy.push(recipe);
    } else {
      unhealthy.push(recipe);
    }
  });

  return {
    healthy,
    unhealthy,
    healthStatuses,
    summary: {
      total: recipes.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      totalEmptyIngredients,
    },
  };
}
