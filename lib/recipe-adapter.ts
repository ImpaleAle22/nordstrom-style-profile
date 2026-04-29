/**
 * Recipe Adapter
 * Converts Recipe Builder format to Outfit Composer format
 * Handles both manually created and AI-generated recipes
 * Migrated to IndexedDB for 100MB+ capacity
 */

import { getRoleFromPT1, type OutfitRole } from './role-mappings';
import type { UnifiedRecipe } from './unified-recipe-types';
import * as IDB from './indexeddb-storage';

const LEGACY_STORAGE_KEY = 'outfit-recipes';
const MIGRATION_FLAG_KEY = 'recipes-migrated-to-indexeddb';

// ============================================================================
// RECIPE BUILDER TYPES (localStorage format)
// ============================================================================

export interface RecipeBuilderIngredient {
  productTypes: string[];
  ingredientTitle: string;
  searchQuery: string;
  brands: string[];
  materials: string[]; // PT2 subcategories
  confidence?: number; // AI-generated recipes may have this
  originalQuery?: string; // AI-generated recipes may have this
}

export interface RecipeBuilderSlot {
  role: OutfitRole;
  ingredient: RecipeBuilderIngredient;
}

export interface RecipeBuilderRecipe {
  id: string;
  title: string;
  department: string;
  slotCount: number;
  seasons: string[];
  slots?: RecipeBuilderSlot[]; // New format
  ingredients?: RecipeBuilderIngredient[]; // Old format (backward compatibility)
  createdAt: string;
  status: 'published';
  source?: 'manual' | 'ai-vision'; // Track recipe source
  aiMetadata?: UnifiedRecipe['aiMetadata']; // Preserve AI metadata

  // Cooking status tracking
  cookingStatus?: {
    lastCooked?: string; // ISO timestamp
    lastStatus: 'success' | 'failed' | 'partial' | 'needs-review';
    lastLinkedCount?: number; // How many outfits linked last time
    lastError?: string; // Error message if failed
    notes?: string; // User notes about what needs fixing
  };
}

// ============================================================================
// OUTFIT COMPOSER TYPES (expected format)
// ============================================================================

export interface ComposerIngredientSet {
  setId: string;
  displayTitle: string;
  query: string;
  department: string;
  productType1: string;
  productType2?: string[];
  brands?: string[];
  materials?: string[];
  season?: string;
}

export interface ComposerSlot {
  role: OutfitRole;
  ingredientSet: ComposerIngredientSet;
}

export interface ComposerRecipe {
  recipeId: string;
  title: string;
  department: string;
  season?: string;
  slots: ComposerSlot[];
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert Recipe Builder ingredient to Composer ingredient set
 */
function convertIngredient(
  ingredient: RecipeBuilderIngredient,
  department: string,
  season?: string
): ComposerIngredientSet {
  return {
    setId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    displayTitle: ingredient.ingredientTitle,
    query: ingredient.searchQuery,
    department,
    productType1: ingredient.productTypes[0] || '',
    productType2: ingredient.materials.length > 0 ? ingredient.materials : undefined,
    brands: ingredient.brands.length > 0 ? ingredient.brands : undefined,
    season,
  };
}

/**
 * Convert Recipe Builder recipe to Outfit Composer format
 */
export function convertRecipeToComposerFormat(
  builderRecipe: RecipeBuilderRecipe | any
): ComposerRecipe {
  // Pick primary season if multiple selected
  const season = builderRecipe.seasons.length > 0
    ? builderRecipe.seasons[0].toLowerCase()
    : undefined;

  // Handle backward compatibility: old recipes have 'ingredients' not 'slots'
  let slots: RecipeBuilderSlot[];

  if (builderRecipe.slots) {
    // New format with slots
    slots = builderRecipe.slots;
  } else if (builderRecipe.ingredients) {
    // Old format with ingredients - convert to slots
    slots = builderRecipe.ingredients.map((ingredient: RecipeBuilderIngredient) => ({
      role: getRoleFromPT1(ingredient.productTypes[0]),
      ingredient,
    }));
  } else {
    slots = [];
  }

  // Convert slots
  const composerSlots: ComposerSlot[] = slots.map((slot) => ({
    role: slot.role,
    ingredientSet: convertIngredient(
      slot.ingredient,
      builderRecipe.department,
      season
    ),
  }));

  return {
    recipeId: builderRecipe.id,
    title: builderRecipe.title,
    department: builderRecipe.department,
    season,
    slots: composerSlots,
  };
}

/**
 * Load recipe from localStorage and convert to Composer format
 */
export function loadRecipeForComposer(recipeId: string): ComposerRecipe | null {
  if (typeof window === 'undefined') return null;

  const recipesJson = localStorage.getItem('outfit-recipes');
  if (!recipesJson) return null;

  const recipes: RecipeBuilderRecipe[] = JSON.parse(recipesJson);
  const recipe = recipes.find((r) => r.id === recipeId);

  if (!recipe) return null;

  return convertRecipeToComposerFormat(recipe);
}

/**
 * Migrate localStorage recipes to IndexedDB (runs once automatically)
 */
async function migrateRecipesFromLocalStorage(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  // Check if already migrated
  const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
  if (migrated === 'true') {
    return 0; // Already migrated
  }

  console.log('🔄 Migrating recipes from localStorage to IndexedDB...');

  // Get recipes from localStorage
  const data = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!data) {
    // No data to migrate
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    return 0;
  }

  try {
    const recipes: RecipeBuilderRecipe[] = JSON.parse(data);
    console.log(`📦 Found ${recipes.length} recipes in localStorage`);

    // Batch save to IndexedDB
    await IDB.saveRecipesBatch(recipes);

    // Mark as migrated
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    // Keep localStorage data for now (don't auto-delete in case of issues)
    console.log(`✓ Successfully migrated ${recipes.length} recipes to IndexedDB`);
    console.log('💡 localStorage data preserved as backup (can be cleared manually)');

    return recipes.length;
  } catch (error) {
    console.error('❌ Recipe migration failed:', error);
    throw new Error('Failed to migrate recipes to IndexedDB');
  }
}

/**
 * Get all published recipes from IndexedDB
 */
export async function getAllRecipes(): Promise<RecipeBuilderRecipe[]> {
  if (typeof window === 'undefined') return [];

  // Ensure migration has happened
  await migrateRecipesFromLocalStorage();

  try {
    return await IDB.getAllRecipes();
  } catch (error) {
    console.error('Failed to retrieve recipes from IndexedDB:', error);
    return [];
  }
}

/**
 * Import AI-generated recipes into IndexedDB
 * Converts UnifiedRecipe format to RecipeBuilderRecipe format
 */
export async function importAIRecipes(unifiedRecipes: UnifiedRecipe[]): Promise<number> {
  if (typeof window === 'undefined') return 0;

  await migrateRecipesFromLocalStorage();

  // Get existing recipes
  const existing = await getAllRecipes();
  const existingIds = new Set(existing.map(r => r.id));

  // Convert unified recipes to RecipeBuilderRecipe format
  const newRecipes = unifiedRecipes
    .filter(r => !existingIds.has(r.id)) // Skip duplicates
    .map(convertUnifiedToBuilder);

  if (newRecipes.length > 0) {
    // Save new recipes to IndexedDB
    await IDB.saveRecipesBatch(newRecipes);
  }

  return newRecipes.length;
}

/**
 * Convert UnifiedRecipe to RecipeBuilderRecipe
 */
function convertUnifiedToBuilder(unified: UnifiedRecipe): RecipeBuilderRecipe {
  return {
    id: unified.id,
    title: unified.title,
    department: unified.department,
    slotCount: unified.slotCount,
    seasons: unified.seasons,
    slots: unified.slots.map(slot => ({
      role: slot.role,
      ingredient: {
        productTypes: slot.ingredient.productTypes,
        ingredientTitle: slot.ingredient.ingredientTitle,
        searchQuery: slot.ingredient.searchQuery,
        brands: slot.ingredient.brands,
        materials: slot.ingredient.materials,
        confidence: slot.ingredient.confidence,
        originalQuery: slot.ingredient.originalQuery,
      }
    })),
    createdAt: unified.createdAt,
    status: unified.status,
    source: unified.source,
    aiMetadata: unified.aiMetadata,
  };
}

/**
 * Clear all recipes from localStorage (use with caution!)
 */
export function clearAllRecipes(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('outfit-recipes');
}

/**
 * Detect and fix duplicate recipe IDs
 * Returns number of duplicates fixed
 */
export async function fixDuplicateRecipeIds(): Promise<{ fixed: number; duplicates: string[] }> {
  if (typeof window === 'undefined') return { fixed: 0, duplicates: [] };

  await migrateRecipesFromLocalStorage();

  const recipes = await getAllRecipes();
  const seenIds = new Map<string, number>(); // id -> count
  const duplicateIds: string[] = [];
  let fixed = 0;

  // Detect duplicates
  recipes.forEach((recipe) => {
    const count = seenIds.get(recipe.id) || 0;
    seenIds.set(recipe.id, count + 1);
    if (count > 0) {
      duplicateIds.push(recipe.id);
    }
  });

  if (duplicateIds.length === 0) {
    return { fixed: 0, duplicates: [] };
  }

  console.log('🔧 Duplicate recipe IDs detected:', duplicateIds);

  // Fix duplicates by regenerating IDs
  const fixedRecipes = recipes.map((recipe) => {
    const count = seenIds.get(recipe.id)!;
    if (count > 1) {
      // This is a duplicate - generate new ID
      const newId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`  - Fixed: "${recipe.title}" (${recipe.id} → ${newId})`);
      seenIds.set(recipe.id, count - 1); // Decrement count for next occurrence
      fixed++;
      return { ...recipe, id: newId };
    }
    return recipe;
  });

  // Save fixed recipes to IndexedDB
  await IDB.saveRecipesBatch(fixedRecipes);
  console.log(`✓ Fixed ${fixed} duplicate recipe IDs`);

  return { fixed, duplicates: duplicateIds };
}

/**
 * Update cooking status for a recipe
 */
export async function updateRecipeCookingStatus(
  recipeId: string,
  status: 'success' | 'failed' | 'partial' | 'needs-review',
  linkedCount?: number,
  error?: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  await migrateRecipesFromLocalStorage();

  const recipes = await getAllRecipes();
  const recipeIndex = recipes.findIndex((r) => r.id === recipeId);

  if (recipeIndex === -1) {
    console.warn(`Recipe ${recipeId} not found, cannot update status`);
    return;
  }

  recipes[recipeIndex].cookingStatus = {
    lastCooked: new Date().toISOString(),
    lastStatus: status,
    lastLinkedCount: linkedCount,
    lastError: error,
  };

  // Save only the updated recipe (not all recipes) for efficiency
  await IDB.saveRecipe(recipes[recipeIndex]);
  console.log(`✓ Updated recipe status: ${recipeId} → ${status}`);
}

/**
 * Mark recipe as needing review
 */
export async function markRecipeForReview(recipeId: string, notes?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  await migrateRecipesFromLocalStorage();

  const recipes = await getAllRecipes();
  const recipeIndex = recipes.findIndex((r) => r.id === recipeId);

  if (recipeIndex === -1) return;

  if (!recipes[recipeIndex].cookingStatus) {
    recipes[recipeIndex].cookingStatus = {
      lastStatus: 'needs-review',
    };
  } else {
    recipes[recipeIndex].cookingStatus.lastStatus = 'needs-review';
  }

  if (notes) {
    recipes[recipeIndex].cookingStatus!.notes = notes;
  }

  await IDB.saveRecipe(recipes[recipeIndex]);
}

/**
 * Clear "needs review" flag
 */
export async function markRecipeAsReviewed(recipeId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  await migrateRecipesFromLocalStorage();

  const recipes = await getAllRecipes();
  const recipeIndex = recipes.findIndex((r) => r.id === recipeId);

  if (recipeIndex === -1) return;

  if (recipes[recipeIndex].cookingStatus) {
    // Clear the needs-review status but keep history
    if (recipes[recipeIndex].cookingStatus!.lastStatus === 'needs-review') {
      delete recipes[recipeIndex].cookingStatus;
    }
  }

  await IDB.saveRecipe(recipes[recipeIndex]);
}

/**
 * Get recipes filtered by cooking status
 */
export async function getRecipesByStatus(status: 'success' | 'failed' | 'partial' | 'needs-review'): Promise<RecipeBuilderRecipe[]> {
  const recipes = await getAllRecipes();
  return recipes.filter((r) => r.cookingStatus?.lastStatus === status);
}

/**
 * Get recipes that need attention (failed or needs-review)
 */
export async function getProblematicRecipes(): Promise<RecipeBuilderRecipe[]> {
  const recipes = await getAllRecipes();
  return recipes.filter(
    (r) =>
      r.cookingStatus?.lastStatus === 'failed' ||
      r.cookingStatus?.lastStatus === 'needs-review' ||
      r.cookingStatus?.lastStatus === 'partial'
  );
}

/**
 * Get recipe statistics
 */
export async function getRecipeStats() {
  const recipes = await getAllRecipes();
  return {
    total: recipes.length,
    bySource: {
      manual: recipes.filter(r => r.source === 'manual' || !r.source).length,
      aiVision: recipes.filter(r => r.source === 'ai-vision').length,
    },
    byDepartment: {
      Womenswear: recipes.filter(r => r.department === 'Womenswear').length,
      Menswear: recipes.filter(r => r.department === 'Menswear').length,
    },
    bySlotCount: {
      4: recipes.filter(r => r.slotCount === 4).length,
      5: recipes.filter(r => r.slotCount === 5).length,
      6: recipes.filter(r => r.slotCount === 6).length,
    },
    byCookingStatus: {
      success: recipes.filter(r => r.cookingStatus?.lastStatus === 'success').length,
      failed: recipes.filter(r => r.cookingStatus?.lastStatus === 'failed').length,
      partial: recipes.filter(r => r.cookingStatus?.lastStatus === 'partial').length,
      needsReview: recipes.filter(r => r.cookingStatus?.lastStatus === 'needs-review').length,
      neverCooked: recipes.filter(r => !r.cookingStatus).length,
    },
  };
}
