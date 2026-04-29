/**
 * Analyze Cookable Recipes
 * Identifies recipes that will likely cook successfully based on product availability
 */

import { getAllRecipes } from '../recipe-adapter';

interface RecipeCookability {
  recipeId: string;
  title: string;
  department: string;
  slotCount: number;
  slots: Array<{
    role: string;
    ingredientTitle: string;
    searchQuery: string;
    productTypes: string[];
    materials: string[];
  }>;
  cookabilityScore: number; // 0-100
  reasons: string[];
}

// Basic product types we know have good coverage
const WELL_COVERED_TYPES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Shoes',
  'Outerwear',
];

// Basic materials we know exist
const AVAILABLE_MATERIALS = [
  'Denim',
  'Cotton',
  'Leather',
  'Polyester',
  'Knit',
];

/**
 * Score a recipe's likelihood of cooking successfully
 */
function scoreRecipeCookability(recipe: any): RecipeCookability {
  let score = 100;
  const reasons: string[] = [];

  if (!recipe.slots || recipe.slots.length === 0) {
    return {
      recipeId: recipe.id,
      title: recipe.title,
      department: recipe.department,
      slotCount: 0,
      slots: [],
      cookabilityScore: 0,
      reasons: ['No slots defined'],
    };
  }

  const slots = recipe.slots.map((slot: any) => ({
    role: slot.role,
    ingredientTitle: slot.ingredient.ingredientTitle,
    searchQuery: slot.ingredient.searchQuery,
    productTypes: slot.ingredient.productTypes,
    materials: slot.ingredient.materials,
  }));

  // Check each slot
  for (const slot of slots) {
    const productType = slot.productTypes[0];

    // Check if product type is well-covered
    if (!WELL_COVERED_TYPES.includes(productType)) {
      score -= 20;
      reasons.push(`${slot.role}: Product type "${productType}" has limited coverage`);
    }

    // Check for overly specific queries (e.g., specific colors, patterns)
    const specificTerms = ['shimmer', 'sequin', 'metallic', 'vintage', 'distressed'];
    if (specificTerms.some(term => slot.searchQuery.toLowerCase().includes(term))) {
      score -= 10;
      reasons.push(`${slot.role}: Very specific search query may have few matches`);
    }

    // Check for jewelry/accessories (low coverage)
    if (slot.role === 'accessories') {
      const jewelryTerms = ['necklace', 'earring', 'bracelet', 'ring'];
      if (jewelryTerms.some(term => slot.searchQuery.toLowerCase().includes(term))) {
        score -= 30;
        reasons.push(`${slot.role}: Jewelry has very low coverage (1-2 products)`);
      }
    }

    // Check for bags (low coverage)
    if (slot.searchQuery.toLowerCase().includes('bag')) {
      score -= 25;
      reasons.push(`${slot.role}: Bags have low coverage (~13 products)`);
    }
  }

  if (reasons.length === 0) {
    reasons.push('All slots use well-covered product types');
  }

  return {
    recipeId: recipe.id,
    title: recipe.title,
    department: recipe.department,
    slotCount: slots.length,
    slots,
    cookabilityScore: Math.max(0, score),
    reasons,
  };
}

/**
 * Analyze all recipes and return top cookable ones
 */
export function analyzeCookableRecipes(limit: number = 10): RecipeCookability[] {
  const recipes = getAllRecipes();

  const analyzed = recipes
    .filter(r => r.slots && r.slots.length >= 4) // Must have at least 4 slots
    .map(scoreRecipeCookability)
    .sort((a, b) => b.cookabilityScore - a.cookabilityScore);

  return analyzed.slice(0, limit);
}

/**
 * Get recipes above a certain cookability threshold
 */
export function getCookableRecipes(minScore: number = 70): RecipeCookability[] {
  const recipes = getAllRecipes();

  const analyzed = recipes
    .filter(r => r.slots && r.slots.length >= 4)
    .map(scoreRecipeCookability)
    .filter(r => r.cookabilityScore >= minScore)
    .sort((a, b) => b.cookabilityScore - a.cookabilityScore);

  return analyzed;
}

/**
 * Print analysis report
 */
export function printCookabilityReport() {
  const top10 = analyzeCookableRecipes(10);
  const cookable = getCookableRecipes(70);

  console.log('\n========================================');
  console.log('📊 Recipe Cookability Analysis');
  console.log('========================================\n');

  console.log(`Total recipes: ${getAllRecipes().length}`);
  console.log(`Recipes with 4+ slots: ${getAllRecipes().filter(r => r.slots && r.slots.length >= 4).length}`);
  console.log(`Likely cookable (score ≥70): ${cookable.length}`);
  console.log('\n');

  console.log('Top 10 Most Cookable Recipes:');
  console.log('========================================\n');

  top10.forEach((recipe, idx) => {
    console.log(`${idx + 1}. ${recipe.title}`);
    console.log(`   ID: ${recipe.recipeId}`);
    console.log(`   Score: ${recipe.cookabilityScore}/100`);
    console.log(`   Slots: ${recipe.slotCount} (${recipe.slots.map(s => s.role).join(', ')})`);
    console.log(`   Department: ${recipe.department}`);
    if (recipe.reasons.length > 0) {
      console.log(`   Notes:`);
      recipe.reasons.forEach(r => console.log(`     - ${r}`));
    }
    console.log('');
  });

  return { top10, cookable };
}
