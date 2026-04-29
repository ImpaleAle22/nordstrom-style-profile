/**
 * Kitchen Stations - Modular Pipeline Architecture
 *
 * Each station is a filter that can be added, removed, or reordered.
 * Stations are pure functions: combinations → filtered combinations
 */

import type { OutfitCombination } from './types';
import { filterFormalityMismatches } from './formality-filter';
import { filterSimilarityClashes } from './similarity-filter';
import { validateOutfitRecipe } from '../outfit-building-rules';

/**
 * Station interface - all stations follow this pattern
 */
export interface KitchenStation {
  name: string;
  description: string;
  filter: (combinations: OutfitCombination[], config?: any) => StationResult | Promise<StationResult>;
}

/**
 * Station result - standardized output
 */
export interface StationResult {
  passed: OutfitCombination[];
  filtered: number;
  examples: string[];
  metrics?: Record<string, any>;
}

/**
 * Station 2.5: Formality Filter
 * Removes outfits with formality mismatches (evening gown + sneakers)
 *
 * Config options:
 * - capturePatternCandidates: boolean (Phase 2: Discovery Mode)
 * - recipeId: string (required if capturing candidates)
 * - recipeTitle: string (required if capturing candidates)
 */
export const formalityStation: KitchenStation = {
  name: 'Formality Filter',
  description: 'Removes outfits with mismatched formality levels (±1 level)',
  filter: async (combinations, config = {}) => {
    const result = await filterFormalityMismatches(combinations, {
      capturePatternCandidates: config.capturePatternCandidates || false,
      recipeId: config.recipeId,
      recipeTitle: config.recipeTitle,
    });
    return {
      passed: result.passed,
      filtered: result.filtered,
      examples: result.examples,
      metrics: result.candidatesCaptured ? { candidatesCaptured: result.candidatesCaptured } : undefined,
    };
  },
};

/**
 * Station 2.6: Similarity Filter
 * Uses CLIP embeddings to detect clashing items
 */
export const similarityStation: KitchenStation = {
  name: 'Similarity Filter',
  description: 'Removes outfits with clashing items (low embedding similarity)',
  filter: (combinations, config = { threshold: 0.10 }) => {
    const threshold = config.threshold || 0.10;
    const result = filterSimilarityClashes(combinations, threshold);
    return {
      passed: result.passed,
      filtered: result.filtered,
      examples: result.examples,
      metrics: { threshold },
    };
  },
};

/**
 * Station 3: Hard Rules Validation
 * Validates outfits against outfit building rules + duplicate product check
 */
export const hardRulesStation: KitchenStation = {
  name: 'Hard Rules Validation',
  description: 'Validates outfits against outfit building rules (4-6 slots, footwear, coverage, no duplicates)',
  filter: (combinations) => {
    const passed: OutfitCombination[] = [];
    const examples: string[] = [];
    let filtered = 0;

    combinations.forEach((combo, idx) => {
      // 1. Validate slot structure (roles, coverage, footwear)
      const validation = validateOutfitRecipe({
        slots: combo.items.map((item) => ({
          role: item.role,
          ingredient: {
            ingredientTitle: item.ingredientTitle,
            searchQuery: '',
            productTypes: [],
            materials: [],
            brands: [],
          },
        })),
      });

      if (!validation.valid) {
        filtered++;
        if (examples.length < 3) {
          const errors = validation.errors.join('; ');
          examples.push(`Outfit ${idx + 1}: ${errors}`);
        }
        return;
      }

      // 2. Check for duplicate products (CRITICAL: same product used twice)
      const productIds = combo.items.map((item) => item.product.id);
      const uniqueProductIds = new Set(productIds);

      if (productIds.length !== uniqueProductIds.size) {
        // Found duplicate products
        filtered++;
        if (examples.length < 3) {
          const duplicates = productIds.filter(
            (id, index) => productIds.indexOf(id) !== index
          );
          const dupProduct = combo.items.find((item) => duplicates.includes(item.product.id))?.product;
          examples.push(
            `Outfit ${idx + 1}: Duplicate product detected - "${dupProduct?.brand} ${dupProduct?.title}" used in multiple slots`
          );
        }
        return;
      }

      // 3. Check for duplicate accessory sub-types (e.g., two belts, two necklaces)
      // Accessories should be diversified (bag + jewelry is good, belt + belt is bad)
      const accessoryItems = combo.items.filter((item) => item.role === 'accessories');
      if (accessoryItems.length > 1) {
        const accessoryTypes = accessoryItems
          .map((item) => item.product.productType2)
          .filter((type) => type); // Filter out undefined

        const uniqueAccessoryTypes = new Set(accessoryTypes);

        if (accessoryTypes.length > uniqueAccessoryTypes.size) {
          // Found duplicate accessory sub-types
          filtered++;
          if (examples.length < 3) {
            const duplicateType = accessoryTypes.find(
              (type, index) => accessoryTypes.indexOf(type) !== index
            );
            examples.push(
              `Outfit ${idx + 1}: Duplicate accessory type detected - multiple "${duplicateType}" items (accessories should be diversified)`
            );
          }
          return;
        }
      }

      // Passed all validations
      passed.push(combo);
    });

    return { passed, filtered, examples };
  },
};

/**
 * Pipeline configuration - defines station order
 */
export interface PipelineConfig {
  stations: Array<{
    station: KitchenStation;
    config?: any;
  }>;
}

/**
 * Optimal pipeline for Gemini strategies
 *
 * Experiment results: 74% link rate (38/51 outfits)
 *
 * Rationale:
 * - Gemini generates high-quality outfits inherently
 * - Adding filters HURTS performance (drops to 22% with formality)
 * - Think of Gemini as a smart curator that doesn't need fixing
 * - Only validate against hard rules (required slots, coverage, etc.)
 */
export const GEMINI_OPTIMAL_PIPELINE: PipelineConfig = {
  stations: [
    { station: hardRulesStation },
  ],
};

/**
 * Optimal pipeline for random sampling
 *
 * Experiment results: 49% link rate (49/100 outfits)
 *
 * Rationale:
 * - Random generates volume quickly (100 in ~1.5s)
 * - Strict similarity (0.40) catches subtle style clashes
 * - Formality filter too aggressive (removes 50%), similarity more surgical
 * - Best free/fast option for high-quality results
 */
export const RANDOM_OPTIMAL_PIPELINE: PipelineConfig = {
  stations: [
    { station: similarityStation, config: { threshold: 0.40 } },
    { station: hardRulesStation },
  ],
};

/**
 * Conservative pipeline (original)
 *
 * Use when you want maximum filtering at cost of fewer results.
 * Good for recipes where formality mismatches are common.
 */
export const CONSERVATIVE_PIPELINE: PipelineConfig = {
  stations: [
    { station: formalityStation },
    { station: similarityStation, config: { threshold: 0.10 } },
    { station: hardRulesStation },
  ],
};

/**
 * Default pipeline - auto-selects based on strategy
 * Use GEMINI_OPTIMAL_PIPELINE or RANDOM_OPTIMAL_PIPELINE directly for explicit control
 */
export const DEFAULT_PIPELINE = RANDOM_OPTIMAL_PIPELINE;

/**
 * Legacy pipeline for backwards compatibility
 */
export const SIMILARITY_FIRST_PIPELINE: PipelineConfig = {
  stations: [
    { station: similarityStation, config: { threshold: 0.10 } },
    { station: formalityStation },
    { station: hardRulesStation },
  ],
};

/**
 * Run combinations through a pipeline
 */
export async function runPipeline(
  combinations: OutfitCombination[],
  pipeline: PipelineConfig = DEFAULT_PIPELINE
): Promise<{
  final: OutfitCombination[];
  stationResults: Array<{
    station: string;
    passed: number;
    filtered: number;
    examples: string[];
    metrics?: Record<string, any>;
  }>;
}> {
  let current = combinations;
  const stationResults: Array<{
    station: string;
    passed: number;
    filtered: number;
    examples: string[];
    metrics?: Record<string, any>;
  }> = [];

  console.log(`\n🏭 RUNNING KITCHEN PIPELINE (${pipeline.stations.length} stations)`);
  console.log(`Starting with ${combinations.length} combinations\n`);

  for (const { station, config } of pipeline.stations) {
    const result = await station.filter(current, config);

    console.log(`Station: ${station.name}`);
    console.log(`  Input: ${current.length} outfits`);
    console.log(`  Output: ${result.passed.length} outfits`);
    console.log(`  Filtered: ${result.filtered} outfits`);

    if (result.examples.length > 0) {
      console.log(`  Examples:`);
      result.examples.forEach(ex => console.log(`    - ${ex}`));
    }

    if (result.metrics) {
      console.log(`  Metrics:`, result.metrics);
    }

    console.log('');

    stationResults.push({
      station: station.name,
      passed: result.passed.length,
      filtered: result.filtered,
      examples: result.examples,
      metrics: result.metrics,
    });

    current = result.passed;
  }

  console.log(`Pipeline complete: ${current.length} outfits passed all stations\n`);

  return { final: current, stationResults };
}

/**
 * Analyze pipeline effectiveness
 * Useful for comparing different station orders
 */
export function analyzePipeline(
  stationResults: Array<{
    station: string;
    passed: number;
    filtered: number;
    examples: string[];
  }>
): {
  totalFiltered: number;
  filterRate: number;
  stationEfficiency: Array<{ station: string; filterRate: number }>;
} {
  const totalFiltered = stationResults.reduce((sum, r) => sum + r.filtered, 0);
  const initial = stationResults[0]?.passed + stationResults[0]?.filtered || 0;
  const filterRate = initial > 0 ? (totalFiltered / initial) * 100 : 0;

  const stationEfficiency = stationResults.map(r => {
    const input = r.passed + r.filtered;
    const rate = input > 0 ? (r.filtered / input) * 100 : 0;
    return {
      station: r.station,
      filterRate: rate,
    };
  });

  return { totalFiltered, filterRate, stationEfficiency };
}
