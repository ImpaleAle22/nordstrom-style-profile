/**
 * Recipe Cooking System - Main Orchestrator
 *
 * Cooks recipes by:
 * 1. Fetching products from CLIP API for each ingredient
 * 2. Generating outfit combinations using pluggable strategies
 * 3. Scoring outfits with 5-module confidence engine
 * 4. Filtering by confidence threshold
 * 5. Optionally saving to Sanity
 */

import type { UnifiedRecipe } from '../unified-recipe-types';
import type { CookingOptions, CookingResult, IngredientWithProducts } from './types';
import { fetchProductsForAllIngredients, testClipConnection } from './product-fetcher';
import { getStrategy } from './strategies';
import { scoreOutfitBatch, filterByConfidence, getOutfitStats } from './scoring-adapter';
import {
  runPipeline,
  DEFAULT_PIPELINE,
  GEMINI_OPTIMAL_PIPELINE,
  RANDOM_OPTIMAL_PIPELINE,
  type PipelineConfig
} from './kitchen-stations';
import type { CustomerSignals } from '../../../services/outfit-composer/src/types';
import { recordProductGaps } from '../product-gap-tracking';

/**
 * Recipe health check - validates recipe before cooking
 * Returns status and list of problematic ingredients
 */
export function validateRecipeHealth(
  ingredientsWithProducts: IngredientWithProducts[]
): {
  status: 'ready' | 'partial' | 'failed';
  missingIngredients: string[];
  totalIngredients: number;
  availableIngredients: number;
  minItemsRequired: number;
} {
  const totalIngredients = ingredientsWithProducts.length;
  const missingIngredients = ingredientsWithProducts
    .filter((ing) => ing.products.length === 0)
    .map((ing) => ing.ingredientTitle);
  const availableIngredients = totalIngredients - missingIngredients.length;

  // Outfit building rules: need 4-6 items minimum
  const minItemsRequired = 4;

  let status: 'ready' | 'partial' | 'failed';
  if (missingIngredients.length === 0) {
    status = 'ready'; // All ingredients have products
  } else if (availableIngredients >= minItemsRequired) {
    status = 'partial'; // Can still make outfits (meets 4-item minimum)
  } else {
    status = 'failed'; // Too few ingredients (<4 items)
  }

  return {
    status,
    missingIngredients,
    totalIngredients,
    availableIngredients,
    minItemsRequired,
  };
}

// Default cooking options
const DEFAULT_OPTIONS: Required<CookingOptions> = {
  strategy: 'gemini-flash-lite',
  targetCount: 30,
  productsPerIngredient: 20,
  minQuality: 50,
  minAlignment: 9,  // Link Primary AND Secondary tiers (medium threshold)
  generative: false,
  saveToSanity: false,
};

/**
 * Cook a single recipe
 */
export async function cookRecipe(
  recipe: UnifiedRecipe,
  options: CookingOptions = {}
): Promise<CookingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  console.log('\n========================================');
  console.log(`🧑‍🍳 COOKING RECIPE: ${recipe.title}`);
  console.log(`Strategy: ${opts.strategy}`);
  console.log(`Mode: ${opts.generative ? 'Generative (many outfits, selective linking)' : 'Traditional (linked to recipe)'}`);
  console.log(`Target: ${opts.targetCount} outfits`);
  if (opts.generative) {
    console.log(`Quality threshold: ${opts.minQuality} (save all above)`);
    console.log(`Alignment threshold: ${opts.minAlignment} (link to recipe if above)`);
  }
  console.log('========================================\n');

  try {
    // Step 1: Validate CLIP API connection
    console.log('Step 1: Testing CLIP API connection...');
    const clipReady = await testClipConnection();
    if (!clipReady) {
      throw new Error('CLIP API not available at http://localhost:5002');
    }
    console.log('✓ CLIP API ready\n');

    // Step 2: Validate recipe has slots
    if (!recipe.slots || recipe.slots.length === 0) {
      throw new Error('Recipe has no slots');
    }

    // Step 3: Fetch products for all ingredients
    console.log(`Step 2: Fetching products for ${recipe.slots.length} ingredients...`);
    console.log(`\n=== Recipe Ingredient Roles ===`);
    recipe.slots.forEach((slot, idx) => {
      console.log(`  ${idx + 1}. ${slot.ingredient.ingredientTitle} → role: ${slot.role}`);
    });
    console.log(`================================\n`);

    const ingredients = recipe.slots.map((slot) => ({
      ingredientTitle: slot.ingredient.ingredientTitle,
      searchQuery: slot.ingredient.searchQuery,
      role: slot.role,
      productTypes: slot.ingredient.productTypes,
      productType2: slot.ingredient.productType2,
      materials: slot.ingredient.materials,
      brands: slot.ingredient.brands,
    }));

    const ingredientsWithProducts = await fetchProductsForAllIngredients(
      ingredients,
      recipe.department,
      opts.productsPerIngredient
    );

    // Validate recipe health (check if we have enough ingredients)
    const health = validateRecipeHealth(ingredientsWithProducts);

    console.log(`\n=== Recipe Health Check ===`);
    console.log(`Status: ${health.status.toUpperCase()}`);
    console.log(`Available ingredients: ${health.availableIngredients}/${health.totalIngredients}`);
    console.log(`Minimum required: ${health.minItemsRequired} items`);

    if (health.missingIngredients.length > 0) {
      console.log(`\n⚠️  Missing ingredients (0 products):`);
      health.missingIngredients.forEach((name) => {
        const ing = ingredientsWithProducts.find((i) => i.ingredientTitle === name);
        const slot = recipe.slots?.find((s) => s.ingredient.ingredientTitle === name);
        console.log(`   - "${name}"`);
        console.log(`     Query: "${ing?.searchQuery}"`);
        console.log(`     Types: ${slot?.ingredient.productTypes.join(', ')}`);
      });
    }

    // Handle different health statuses
    if (health.status === 'failed') {
      const errorMsg = `Recipe failed health check: only ${health.availableIngredients}/${health.totalIngredients} ingredients have products (need ${health.minItemsRequired} minimum)`;
      console.error(`\n❌ ${errorMsg}`);
      console.error(`Missing: ${health.missingIngredients.join(', ')}`);
      console.error(`\n💡 Suggested fix: Update recipe ingredients or review product catalog\n`);
      throw new Error(errorMsg);
    }

    if (health.status === 'partial') {
      const warningMsg = `Cooking with partial ingredients: ${health.availableIngredients}/${health.totalIngredients} available`;
      console.warn(`\n⚠️  ${warningMsg}`);
      console.warn(`Missing: ${health.missingIngredients.join(', ')}`);
      console.warn(`Outfits will be generated without these ingredients\n`);
      errors.push(warningMsg);
    } else {
      console.log(`✅ All ingredients have products\n`);
    }
    console.log('===========================\n');

    // Record product gaps (Phase 3: Recipe Precision System)
    if (health.missingIngredients.length > 0) {
      try {
        const missingIngredientData = health.missingIngredients.map(name => {
          const ing = ingredientsWithProducts.find(i => i.ingredientTitle === name);
          const slot = recipe.slots?.find(s => s.ingredient.ingredientTitle === name);

          return {
            title: name,
            query: ing?.searchQuery || '',
            role: ing?.role || '',
            filters: {
              productType1: slot?.ingredient.productTypes,
              productType2: slot?.ingredient.productType2,
              materials: slot?.ingredient.materials,
              department: recipe.department,
            },
          };
        });

        await recordProductGaps(missingIngredientData, {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          cookedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('⚠️  Failed to record product gaps:', error);
        // Don't fail cooking if gap recording fails
      }
    }

    // Old code for backwards compatibility (now just warnings)
    const emptyIngredients = ingredientsWithProducts.filter((ing) => ing.products.length === 0);
    if (emptyIngredients.length > 0) {
      emptyIngredients.forEach(ing => {
        const slot = recipe.slots?.find(s => s.ingredient.ingredientTitle === ing.ingredientTitle);
        console.error(`   - "${ing.ingredientTitle}"`);
        console.error(`     Query: "${ing.searchQuery}"`);
        console.error(`     Types: ${slot?.ingredient.productTypes.join(', ')}`);
      });
    }

    // Step 4: Generate outfit combinations
    console.log(`\nStep 3: Generating combinations using ${opts.strategy}...`);

    // Log ingredient product pool sizes for diagnostics
    console.log(`\n=== Product Pool Sizes ===`);
    ingredientsWithProducts.forEach((ing) => {
      console.log(`  ${ing.ingredientTitle}: ${ing.products.length} products`);
    });
    console.log(`===========================\n`);

    const strategy = getStrategy(opts.strategy);
    const combinations = await strategy.generate(ingredientsWithProducts, opts.targetCount, {
      title: recipe.title,
      department: recipe.department,
      season: recipe.seasons?.[0],
      theme: recipe.id.split('_')[0], // Extract theme from ID (e.g., "hiking_womens_01" → "hiking")
    });

    console.log(`✓ Strategy generated ${combinations.length} combinations\n`);

    // If no combinations generated, return diagnostic result instead of throwing
    if (combinations.length === 0) {
      console.error('\n❌ ZERO COMBINATIONS GENERATED');
      console.error('========================================');
      console.error('Possible causes:');
      console.error('  1. Strategy failed to generate (AI error, prompt issue)');
      console.error('  2. Product pools too small for the target count');
      console.error('  3. Ingredient constraints too strict');
      console.error('\nProduct pool sizes:');
      ingredientsWithProducts.forEach((ing) => {
        console.error(`  - ${ing.ingredientTitle}: ${ing.products.length} products`);
      });
      console.error('========================================\n');

      // Return empty result with diagnostics instead of throwing
      return {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        strategy: opts.strategy,
        generativeMode: opts.generative,
        linkedOutfits: [],
        unlinkedOutfits: [],
        outfits: [],
        stats: {
          totalGenerated: 0,
          formalityFiltered: 0,
          similarityFiltered: 0,
          totalScored: 0,
          totalSaved: 0,
          totalLinked: 0,
          totalUnlinked: 0,
          primary: 0,
          secondary: 0,
          suppressed: 0,
          happyAccidents: 0,
          linkedCount: 0,
        },
        pipelineResults: [],
        errors: ['No combinations generated - strategy returned empty array'],
        diagnostics: {
          reason: 'zero_combinations_generated',
          productPools: ingredientsWithProducts.map(ing => ({
            ingredient: ing.ingredientTitle,
            productCount: ing.products.length,
            role: ing.role,
          })),
          suggestion: 'Check product pools are large enough. Try Discovery Mode to capture candidates.',
        },
        cookedAt: new Date().toISOString(),
      };
    }

    // Step 4: Run Kitchen Pipeline
    console.log(`\nStep 4: Running Kitchen Pipeline...`);

    // Auto-select optimal pipeline based on strategy (if not explicitly provided)
    let pipeline: PipelineConfig;
    if (opts.pipeline) {
      pipeline = opts.pipeline;
      console.log(`   Using custom pipeline (${opts.pipeline.stations.length} stations)`);
    } else if (opts.discoveryMode) {
      // Discovery Mode: Use formality filter with candidate capture
      console.log(`   🔬 Discovery Mode enabled - using formality filter to capture candidates`);
      const isRandom = opts.strategy === 'random-sampling';
      const { formalityStation, similarityStation, hardRulesStation } = await import('./kitchen-stations');

      pipeline = {
        stations: [
          {
            station: formalityStation,
            config: {
              capturePatternCandidates: true,
              recipeId: recipe.id,
              recipeTitle: recipe.title,
            }
          },
          ...(isRandom ? [{ station: similarityStation, config: { threshold: 0.40 } }] : []),
          { station: hardRulesStation },
        ],
      };
    } else {
      // Auto-select based on experiments:
      // - Gemini: no filters needed (74% link rate)
      // - Random: strict similarity works best (49% link rate)
      const isGemini = opts.strategy?.includes('gemini') || opts.strategy?.includes('claude');
      pipeline = isGemini ? GEMINI_OPTIMAL_PIPELINE : RANDOM_OPTIMAL_PIPELINE;
      console.log(`   Auto-selected ${isGemini ? 'GEMINI_OPTIMAL' : 'RANDOM_OPTIMAL'} pipeline (${pipeline.stations.length} stations)`);
    }

    const pipelineResult = await runPipeline(combinations, pipeline);
    const validCombinations = pipelineResult.final;

    // Extract stats for backward compatibility
    const formalityStation = pipelineResult.stationResults.find(s => s.station === 'Formality Filter');
    const similarityStation = pipelineResult.stationResults.find(s => s.station === 'Similarity Filter');
    const formalityFiltered = formalityStation?.filtered || 0;
    const similarityFiltered = similarityStation?.filtered || 0;

    // Step 6: Score outfits (Two-Score System)
    console.log(`Step 6: Scoring ${validCombinations.length} valid outfits...`);

    // Build customer signals from recipe
    const signals: CustomerSignals = {
      gender: recipe.department === 'Womenswear' ? 'womens' : 'mens',
      season: (recipe.seasons?.[0]?.toLowerCase() as 'spring' | 'fall') || 'spring',
    };

    const theme = recipe.id.split('_')[0]; // Extract theme
    const recipeSeason = recipe.seasons?.[0];

    // Score with recipe context for alignment scoring
    const scoredOutfits = scoreOutfitBatch(
      validCombinations,
      theme,
      signals,
      ingredientsWithProducts,
      recipeSeason,
      recipe.id,
      opts.minAlignment
    );

    // Step 7: Filter and separate based on mode
    if (opts.generative) {
      console.log(`\nStep 7: Generative Mode - Filtering & Linking...`);
      console.log(`  Quality threshold: ${opts.minQuality}`);
      console.log(`  Alignment threshold: ${opts.minAlignment}`);

      // Log score distributions for tuning
      const qualityScores = scoredOutfits.map(o => o.qualityScore).sort((a, b) => b - a);
      const alignmentScores = scoredOutfits.map(o => o.alignmentScore).sort((a, b) => b - a);

      console.log(`\n  Quality Score Distribution:`);
      console.log(`    Max: ${qualityScores[0]}`);
      console.log(`    75th percentile: ${qualityScores[Math.floor(qualityScores.length * 0.25)]}`);
      console.log(`    Median: ${qualityScores[Math.floor(qualityScores.length * 0.5)]}`);
      console.log(`    Min: ${qualityScores[qualityScores.length - 1]}`);

      console.log(`\n  Alignment Score Distribution:`);
      console.log(`    Max: ${alignmentScores[0]}`);
      console.log(`    75th percentile: ${alignmentScores[Math.floor(alignmentScores.length * 0.25)]}`);
      console.log(`    Median: ${alignmentScores[Math.floor(alignmentScores.length * 0.5)]}`);
      console.log(`    Min: ${alignmentScores[alignmentScores.length - 1]}`);

      // Save all outfits with quality >= minQuality
      const savedOutfits = scoredOutfits.filter(o => o.qualityScore >= opts.minQuality);

      // Separate linked vs unlinked
      const linkedOutfits = savedOutfits.filter(o => o.linkedToRecipe);
      const unlinkedOutfits = savedOutfits.filter(o => !o.linkedToRecipe);

      const stats = {
        totalGenerated: combinations.length,
        formalityFiltered,
        similarityFiltered,
        totalScored: validCombinations.length,
        totalSaved: savedOutfits.length,
        totalLinked: linkedOutfits.length,
        totalUnlinked: unlinkedOutfits.length,
        primary: linkedOutfits.filter((o) => o.poolTier === 'primary').length,
        secondary: linkedOutfits.filter((o) => o.poolTier === 'secondary').length,
        suppressed: scoredOutfits.filter((o) => o.qualityScore < opts.minQuality).length,
        happyAccidents: unlinkedOutfits.filter((o) => o.poolTier === 'happy-accident').length,
        linkedCount: linkedOutfits.length, // Alias for auto-triage
      };

      console.log('\n========================================');
      console.log('✅ GENERATIVE COOKING COMPLETE');
      console.log('========================================');
      console.log(`Generated: ${stats.totalGenerated} combinations`);
      console.log(`Formality filtered: ${stats.formalityFiltered} (mismatched formality levels)`);
      console.log(`Similarity filtered: ${stats.similarityFiltered} (clashing items)`);
      console.log(`Valid: ${stats.totalScored} (passed hard rules)`);
      console.log(`Saved: ${stats.totalSaved} (quality ≥ ${opts.minQuality})`);
      console.log(`\nLinking:`);
      console.log(`  Linked to recipe (alignment ≥ ${opts.minAlignment}): ${stats.totalLinked}`);
      console.log(`    - Primary: ${stats.primary}`);
      console.log(`    - Secondary: ${stats.secondary}`);
      console.log(`  Unlinked (saved for future recipes): ${stats.totalUnlinked}`);
      console.log(`    - Happy Accidents (quality ≥70, alignment <60): ${stats.happyAccidents}`);
      console.log(`    - Other unlinked (medium quality/alignment): ${stats.totalUnlinked - stats.happyAccidents}`);
      console.log(`  Discarded (low quality): ${stats.suppressed}`);
      console.log('========================================\n');

      return {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        strategy: opts.strategy,
        generativeMode: true,
        linkedOutfits,
        unlinkedOutfits,
        outfits: savedOutfits, // All saved outfits
        stats,
        pipelineResults: pipelineResult.stationResults,
        errors: errors.length > 0 ? errors : undefined,
        cookedAt: new Date().toISOString(),
        ingredientHealth: health.missingIngredients.length > 0 ? {
          totalIngredients: health.totalIngredients,
          availableIngredients: health.availableIngredients,
          missingIngredients: health.missingIngredients.map(name => {
            const ing = ingredientsWithProducts.find(i => i.ingredientTitle === name);
            return {
              title: name,
              query: ing?.searchQuery || '',
              role: ing?.role || '',
            };
          }),
        } : undefined,
      };
    } else {
      // Traditional mode: filter by quality, link all to recipe
      console.log(`\nStep 7: Traditional Mode - Filtering by minimum quality ${opts.minQuality}...`);
      const passedOutfits = scoredOutfits.filter(o => o.qualityScore >= opts.minQuality);

      const stats = {
        totalGenerated: combinations.length,
        formalityFiltered,
        similarityFiltered,
        totalScored: validCombinations.length,
        totalSaved: passedOutfits.length,
        totalLinked: passedOutfits.length, // All linked in traditional mode
        totalUnlinked: 0,
        primary: passedOutfits.filter((o) => o.poolTier === 'primary').length,
        secondary: passedOutfits.filter((o) => o.poolTier === 'secondary').length,
        suppressed: passedOutfits.filter((o) => o.poolTier === 'suppressed').length,
        happyAccidents: passedOutfits.filter((o) => o.poolTier === 'happy-accident').length,
        linkedCount: passedOutfits.length, // Alias for auto-triage
      };

      console.log('\n========================================');
      console.log('✅ COOKING COMPLETE (Traditional Mode)');
      console.log('========================================');
      console.log(`Generated: ${stats.totalGenerated} combinations`);
      console.log(`Formality filtered: ${stats.formalityFiltered} (mismatched formality levels)`);
      console.log(`Similarity filtered: ${stats.similarityFiltered} (clashing items)`);
      console.log(`Valid: ${stats.totalScored} (passed hard rules)`);
      console.log(`Passed quality threshold: ${stats.totalSaved}`);
      console.log(`\nBy Pool Tier:`);
      console.log(`  Primary (high quality + high alignment): ${stats.primary}`);
      console.log(`  Secondary (good quality or good alignment): ${stats.secondary}`);
      console.log(`  Happy Accidents (high quality + low alignment): ${stats.happyAccidents}`);
      console.log(`  Suppressed (low quality): ${stats.suppressed}`);
      console.log('========================================\n');

      return {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        strategy: opts.strategy,
        generativeMode: false,
        linkedOutfits: passedOutfits,
        unlinkedOutfits: [],
        outfits: passedOutfits,
        stats,
        pipelineResults: pipelineResult.stationResults,
        errors: errors.length > 0 ? errors : undefined,
        cookedAt: new Date().toISOString(),
        ingredientHealth: health.missingIngredients.length > 0 ? {
          totalIngredients: health.totalIngredients,
          availableIngredients: health.availableIngredients,
          missingIngredients: health.missingIngredients.map(name => {
            const ing = ingredientsWithProducts.find(i => i.ingredientTitle === name);
            return {
              title: name,
              query: ing?.searchQuery || '',
              role: ing?.role || '',
            };
          }),
        } : undefined,
      };
    }
  } catch (error) {
    console.error('\n❌ COOKING FAILED:', error);
    throw error;
  }
}

/**
 * Cook multiple recipes in sequence
 */
export async function cookRecipeBatch(
  recipes: UnifiedRecipe[],
  options: CookingOptions = {}
): Promise<CookingResult[]> {
  const results: CookingResult[] = [];

  for (const recipe of recipes) {
    try {
      const result = await cookRecipe(recipe, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to cook ${recipe.title}:`, error);
      // Continue with next recipe
    }
  }

  return results;
}

/**
 * Cook all uncooked recipes
 */
export function getUncookedRecipes(allRecipes: UnifiedRecipe[]): UnifiedRecipe[] {
  // Filter recipes that have never been cooked
  // In future, track lastCookedAt in recipe metadata
  return allRecipes.filter((recipe) => {
    // For now, cook all recipes
    return true;
  });
}

/**
 * Cook recipes older than X days
 */
export function getStaleRecipes(
  allRecipes: UnifiedRecipe[],
  daysOld: number
): UnifiedRecipe[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Filter recipes with lastCookedAt older than cutoff
  // For now, this is a placeholder
  return allRecipes.filter((recipe) => {
    // TODO: Check recipe.lastCookedAt against cutoff
    return false;
  });
}

// Export types and utilities
export * from './types';
export { testClipConnection } from './product-fetcher';
export { getStrategy } from './strategies';
