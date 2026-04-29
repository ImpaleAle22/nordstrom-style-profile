/**
 * Recipe Builder Actions
 *
 * Handles recipe creation, validation, and persistence to Sanity
 */

import {
  createIngredientSet,
  createOutfitRecipe,
  updateOutfitRecipe,
} from './recipe-hooks';
import {
  buildIngredientSetDocument,
  buildOutfitRecipeDocument,
} from './sanity-queries';
import {
  validateOutfitRecipe,
  type SlotRole,
  type OutfitSlot,
} from './outfit-building-rules';

export interface IngredientData {
  productTypes: string[];
  ingredientTitle: string;
  searchQuery: string;
  brands: string[];
  materials: string[]; // Actually productType2
}

export interface RecipeFormData {
  title: string;
  department: 'Womenswear' | 'Menswear';
  seasons: string[];
  ingredients: (IngredientData | null)[];
}

/**
 * Generate a unique ID for recipes and ingredient sets
 */
function generateId(prefix: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const timestamp = Date.now().toString(36);
  return `${prefix}_${slug}_${timestamp}`;
}

/**
 * Map product type (Type1) to outfit slot role
 * Based on OUTFIT-BUILDING-RULES.md
 */
function mapProductTypeToRole(productType: string): SlotRole {
  const normalized = productType.toLowerCase();

  // Map to outfit building rules roles
  if (normalized.includes('top')) return 'tops';
  if (normalized.includes('bottom')) return 'bottoms';
  if (normalized.includes('dress') || normalized.includes('jumpsuit') || normalized.includes('romper')) return 'one-piece';
  if (normalized.includes('shoe') || normalized.includes('boot') || normalized.includes('sneaker') || normalized.includes('sandal')) return 'shoes';
  if (normalized.includes('outerwear') || normalized.includes('jacket') || normalized.includes('coat')) return 'outerwear';

  // Default to accessories for bags, jewelry, belts, scarves, headwear, etc.
  return 'accessories';
}

/**
 * Validate recipe form data
 * Includes both basic form validation AND outfit composition rules
 */
export function validateRecipe(data: RecipeFormData): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic form validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Recipe title is required');
  }

  const filledIngredients = data.ingredients.filter((ing) => ing !== null);

  if (filledIngredients.length < 2) {
    errors.push('At least 2 ingredient slots must be filled');
  }

  filledIngredients.forEach((ing, index) => {
    if (!ing) return;

    if (!ing.ingredientTitle || ing.ingredientTitle.trim().length === 0) {
      errors.push(`Ingredient ${index + 1}: Title is required`);
    }

    if (!ing.searchQuery || ing.searchQuery.trim().length < 5) {
      errors.push(`Ingredient ${index + 1}: Search query must be at least 5 characters`);
    }

    if (ing.productTypes.length === 0) {
      errors.push(`Ingredient ${index + 1}: Product type must be selected`);
    }
  });

  // Outfit composition validation (hard rules + advisory warnings)
  // Only validate if basic form validation passes
  if (errors.length === 0 && filledIngredients.length > 0) {
    // Map ingredients to outfit slots
    const outfitSlots: OutfitSlot[] = filledIngredients.map((ing) => ({
      role: mapProductTypeToRole(ing!.productTypes[0]),
      displayLabel: ing!.ingredientTitle,
    }));

    // Validate against outfit building rules
    const outfitValidation = validateOutfitRecipe({
      title: data.title,
      slots: outfitSlots,
    });

    // Merge errors and warnings
    errors.push(...outfitValidation.errors);
    warnings.push(...outfitValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Save a new outfit recipe to Sanity
 *
 * This will:
 * 1. Create ingredient set documents for each new ingredient
 * 2. Create the outfit recipe document with references to ingredient sets
 *
 * @returns The created recipe document with _id
 */
export async function saveOutfitRecipe(
  data: RecipeFormData,
  theme: string = 'hiking'
): Promise<{ success: boolean; recipeId?: string; error?: string; warnings?: string[] }> {
  try {
    // Validate first
    const validation = validateRecipe(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // Filter out empty slots
    const filledIngredients = data.ingredients.filter((ing) => ing !== null);

    // Step 1: Create ingredient set documents for each slot
    const ingredientSetIds: string[] = [];
    const slotRoles: string[] = [];

    for (let i = 0; i < filledIngredients.length; i++) {
      const ing = filledIngredients[i];
      if (!ing) continue;

      // Generate setId
      const setId = generateId('ingredient', ing.ingredientTitle);

      // Build ingredient set document
      const ingredientDoc = buildIngredientSetDocument({
        setId,
        displayTitle: ing.ingredientTitle,
        query: ing.searchQuery,
        theme,
        department: data.department,
        productType1: ing.productTypes[0],
        productType2: ing.materials, // materials field holds productType2
        brands: ing.brands,
        tags: [],
        season: data.seasons.length > 0 ? data.seasons[0] : undefined,
      });

      // Create in Sanity
      const created = await createIngredientSet(ingredientDoc);
      ingredientSetIds.push(created._id);

      // Assign role based on product type (using outfit building rules mapping)
      const role = mapProductTypeToRole(ing.productTypes[0]);
      slotRoles.push(role);
    }

    // Step 2: Create outfit recipe document
    const recipeId = generateId('recipe', data.title);

    const recipeDoc = buildOutfitRecipeDocument({
      recipeId,
      title: data.title,
      theme,
      department: data.department,
      season: data.seasons.length > 0 ? data.seasons[0] : undefined,
      slots: ingredientSetIds.map((id, index) => ({
        role: slotRoles[index],
        ingredientSetId: id,
      })),
    });

    const createdRecipe = await createOutfitRecipe(recipeDoc);

    return {
      success: true,
      recipeId: createdRecipe._id,
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    };
  } catch (error) {
    console.error('Error saving recipe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generate a recipe title based on ingredients (AI alternative)
 */
export function generateRecipeTitle(ingredients: (IngredientData | null)[]): string {
  const filledIngredients = ingredients.filter((ing) => ing !== null);

  if (filledIngredients.length === 0) {
    return 'Untitled Recipe';
  }

  // Get primary categories (non-accessories)
  const primaryCategories = [
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Jumpsuits/Coveralls',
  ];

  const primaryItems = filledIngredients.filter((ing) =>
    ing && primaryCategories.includes(ing.productTypes[0])
  );

  if (primaryItems.length === 0) {
    // All accessories, use first 2
    const first = filledIngredients[0];
    const second = filledIngredients[1];

    if (first && second) {
      return `${first.ingredientTitle} + ${second.ingredientTitle}`;
    }

    return first?.ingredientTitle || 'Untitled Recipe';
  }

  // Build title from primary items
  if (primaryItems.length === 1) {
    const item = primaryItems[0];
    return `${item?.ingredientTitle} Outfit`;
  }

  if (primaryItems.length === 2) {
    const [first, second] = primaryItems;
    return `${first?.ingredientTitle} + ${second?.ingredientTitle}`;
  }

  // 3+ items, describe outfit type
  const hasTop = primaryItems.some((ing) => ing?.productTypes[0] === 'Tops');
  const hasBottom = primaryItems.some((ing) => ing?.productTypes[0] === 'Bottoms');
  const hasDress = primaryItems.some((ing) => ing?.productTypes[0] === 'Dresses');
  const hasOuterwear = primaryItems.some((ing) => ing?.productTypes[0] === 'Outerwear');

  if (hasDress) {
    return hasOuterwear ? 'Layered Dress Outfit' : 'Complete Dress Look';
  }

  if (hasTop && hasBottom) {
    return hasOuterwear ? 'Layered Complete Outfit' : 'Complete Casual Outfit';
  }

  return 'Complete Outfit';
}
