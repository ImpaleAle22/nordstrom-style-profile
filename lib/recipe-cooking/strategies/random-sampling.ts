/**
 * Random Sampling Strategy
 * Generates random outfit combinations and relies on scoring engine to rank them
 */

import type { CombinationStrategy, IngredientWithProducts, OutfitCombination } from '../types';

export class RandomSamplingStrategy implements CombinationStrategy {
  name = 'random-sampling';

  async generate(
    ingredients: IngredientWithProducts[],
    targetCount: number,
    _recipeContext: any
  ): Promise<OutfitCombination[]> {
    const combinations: OutfitCombination[] = [];

    // Validate all ingredients have products
    for (const ingredient of ingredients) {
      if (ingredient.products.length === 0) {
        console.warn(`No products found for ingredient: ${ingredient.ingredientTitle}`);
      }
    }

    // Generate random combinations
    let attempts = 0;
    const maxAttempts = targetCount * 10; // Limit attempts to avoid infinite loop

    while (combinations.length < targetCount && attempts < maxAttempts) {
      attempts++;

      const usedProductIds = new Set<string>();
      const items = [];
      let hasDuplicate = false;

      // Build outfit one ingredient at a time, checking for duplicates
      for (const ingredient of ingredients) {
        if (ingredient.products.length === 0) {
          hasDuplicate = true;
          break;
        }

        // Try to find a product that hasn't been used yet
        let productAttempts = 0;
        let product = null;

        while (productAttempts < ingredient.products.length) {
          const randomIndex = Math.floor(Math.random() * ingredient.products.length);
          const candidate = ingredient.products[randomIndex];

          if (!usedProductIds.has(candidate.id)) {
            // Found unused product
            product = candidate;
            usedProductIds.add(candidate.id);
            break;
          }

          productAttempts++;
        }

        if (!product) {
          // Couldn't find unique product for this ingredient
          hasDuplicate = true;
          break;
        }

        items.push({
          role: ingredient.role,
          ingredientTitle: ingredient.ingredientTitle,
          product,
        });
      }

      // Only add outfit if complete and no duplicates
      if (!hasDuplicate && items.length === ingredients.length) {
        combinations.push({ items });
      }
    }

    console.log(`Random sampling generated ${combinations.length} combinations`);
    return combinations;
  }
}
