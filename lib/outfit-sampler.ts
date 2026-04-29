/**
 * Outfit Sampler
 *
 * Creates diverse samples of outfits for testing attribute tagging.
 * Ensures variety across recipes, quality scores, pool tiers, departments, and formality.
 */

import type { StoredOutfit } from './outfit-storage';

// ============================================================================
// SAMPLING STRATEGIES
// ============================================================================

/**
 * Sample outfits with maximum diversity
 * Stratified sampling across multiple dimensions
 */
export function sampleDiverseOutfits(
  outfits: StoredOutfit[],
  sampleSize: number
): StoredOutfit[] {
  // Group outfits by multiple dimensions
  const byRecipe = groupByRecipe(outfits);
  const byTier = groupByTier(outfits);
  const byDepartment = groupByDepartment(outfits);
  const byQuality = groupByQuality(outfits);

  // Calculate sample per group (stratified sampling)
  const recipesCount = Object.keys(byRecipe).length;
  const tiersCount = Object.keys(byTier).length;
  const deptCount = Object.keys(byDepartment).length;

  // Multi-stage sampling:
  // 1. Sample recipes (ensure broad recipe coverage)
  // 2. Within each recipe, sample across tiers and departments
  // 3. Within each tier, sample across quality scores

  const selectedOutfits = new Set<string>();
  const result: StoredOutfit[] = [];

  // Stage 1: Recipe diversity (50% of sample)
  const recipeSampleSize = Math.floor(sampleSize * 0.5);
  const perRecipe = Math.ceil(recipeSampleSize / recipesCount);

  for (const [recipeId, recipeOutfits] of Object.entries(byRecipe)) {
    const recipeSample = sampleFromArray(recipeOutfits, perRecipe);
    recipeSample.forEach(o => {
      if (!selectedOutfits.has(o.outfitId) && result.length < sampleSize) {
        selectedOutfits.add(o.outfitId);
        result.push(o);
      }
    });
  }

  // Stage 2: Pool tier diversity (25% of sample)
  const tierSampleSize = Math.floor(sampleSize * 0.25);
  const perTier = Math.ceil(tierSampleSize / tiersCount);

  for (const [tier, tierOutfits] of Object.entries(byTier)) {
    const tierSample = sampleFromArray(
      tierOutfits.filter(o => !selectedOutfits.has(o.outfitId)),
      perTier
    );
    tierSample.forEach(o => {
      if (!selectedOutfits.has(o.outfitId) && result.length < sampleSize) {
        selectedOutfits.add(o.outfitId);
        result.push(o);
      }
    });
  }

  // Stage 3: Quality score diversity (15% of sample)
  const qualitySampleSize = Math.floor(sampleSize * 0.15);
  const perQuality = Math.ceil(qualitySampleSize / 5); // 5 quality buckets

  for (const [bucket, bucketOutfits] of Object.entries(byQuality)) {
    const qualitySample = sampleFromArray(
      bucketOutfits.filter(o => !selectedOutfits.has(o.outfitId)),
      perQuality
    );
    qualitySample.forEach(o => {
      if (!selectedOutfits.has(o.outfitId) && result.length < sampleSize) {
        selectedOutfits.add(o.outfitId);
        result.push(o);
      }
    });
  }

  // Stage 4: Fill remaining with random selection (10% of sample)
  const remaining = outfits.filter(o => !selectedOutfits.has(o.outfitId));
  const fillCount = sampleSize - result.length;
  if (fillCount > 0) {
    const randomSample = sampleFromArray(remaining, fillCount);
    result.push(...randomSample);
  }

  // Shuffle result to avoid sequential bias
  return shuffleArray(result);
}

/**
 * Simple random sample (for quick tests)
 */
export function sampleRandomOutfits(
  outfits: StoredOutfit[],
  sampleSize: number
): StoredOutfit[] {
  return sampleFromArray(outfits, sampleSize);
}

/**
 * Sample top-quality outfits (for validation)
 */
export function sampleTopQualityOutfits(
  outfits: StoredOutfit[],
  sampleSize: number
): StoredOutfit[] {
  const sorted = [...outfits].sort((a, b) => b.qualityScore - a.qualityScore);
  return sorted.slice(0, sampleSize);
}

/**
 * Sample edge cases (very high/low formality, unusual combinations)
 */
export function sampleEdgeCases(outfits: StoredOutfit[]): StoredOutfit[] {
  const edgeCases: StoredOutfit[] = [];

  // Very high formality (likely formal/gala)
  const highFormality = outfits
    .filter(o => o.scoreBreakdown.occasionAlignment >= 5.5)
    .slice(0, 20);
  edgeCases.push(...highFormality);

  // Very low formality (loungewear/athletic)
  const lowFormality = outfits
    .filter(o => o.scoreBreakdown.occasionAlignment <= 1.5)
    .slice(0, 20);
  edgeCases.push(...lowFormality);

  // Happy accidents (unexpected high quality)
  const happyAccidents = outfits
    .filter(o => o.poolTier === 'happy-accident' && o.qualityScore >= 80)
    .slice(0, 20);
  edgeCases.push(...happyAccidents);

  // Low quality (for testing rules fallback)
  const lowQuality = outfits
    .filter(o => o.qualityScore < 50)
    .slice(0, 20);
  edgeCases.push(...lowQuality);

  return edgeCases;
}

// ============================================================================
// GROUPING HELPERS
// ============================================================================

function groupByRecipe(outfits: StoredOutfit[]): Record<string, StoredOutfit[]> {
  const groups: Record<string, StoredOutfit[]> = {};
  for (const outfit of outfits) {
    if (!groups[outfit.recipeId]) {
      groups[outfit.recipeId] = [];
    }
    groups[outfit.recipeId].push(outfit);
  }
  return groups;
}

function groupByTier(outfits: StoredOutfit[]): Record<string, StoredOutfit[]> {
  const groups: Record<string, StoredOutfit[]> = {};
  for (const outfit of outfits) {
    const tier = outfit.poolTier || 'unknown';
    if (!groups[tier]) {
      groups[tier] = [];
    }
    groups[tier].push(outfit);
  }
  return groups;
}

function groupByDepartment(outfits: StoredOutfit[]): Record<string, StoredOutfit[]> {
  const groups: Record<string, StoredOutfit[]> = {};
  for (const outfit of outfits) {
    const dept = outfit.department || 'unknown';
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(outfit);
  }
  return groups;
}

function groupByQuality(outfits: StoredOutfit[]): Record<string, StoredOutfit[]> {
  const groups: Record<string, StoredOutfit[]> = {
    'very-high': [], // 90+
    'high': [], // 80-90
    'medium': [], // 70-80
    'low': [], // 60-70
    'very-low': [] // <60
  };

  for (const outfit of outfits) {
    const score = outfit.qualityScore;
    if (score >= 90) groups['very-high'].push(outfit);
    else if (score >= 80) groups['high'].push(outfit);
    else if (score >= 70) groups['medium'].push(outfit);
    else if (score >= 60) groups['low'].push(outfit);
    else groups['very-low'].push(outfit);
  }

  return groups;
}

// ============================================================================
// ARRAY HELPERS
// ============================================================================

/**
 * Sample N items from array (random without replacement)
 */
function sampleFromArray<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr];

  const shuffled = shuffleArray([...arr]);
  return shuffled.slice(0, n);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// DIVERSITY METRICS
// ============================================================================

/**
 * Calculate diversity score for a sample
 */
export function calculateDiversity(sample: StoredOutfit[]): {
  recipeCount: number;
  tierDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
  qualityRange: { min: number; max: number; avg: number };
  formalityRange: { min: number; max: number; avg: number };
  diversityScore: number; // 0-100
} {
  const recipeIds = new Set(sample.map(o => o.recipeId));
  const tiers = groupByTier(sample);
  const departments = groupByDepartment(sample);

  const qualities = sample.map(o => o.qualityScore);
  const formalities = sample.map(o => o.scoreBreakdown.occasionAlignment);

  const qualityRange = {
    min: Math.min(...qualities),
    max: Math.max(...qualities),
    avg: qualities.reduce((sum, q) => sum + q, 0) / qualities.length
  };

  const formalityRange = {
    min: Math.min(...formalities),
    max: Math.max(...formalities),
    avg: formalities.reduce((sum, f) => sum + f, 0) / formalities.length
  };

  // Calculate diversity score (higher is more diverse)
  const recipeDiv = recipeIds.size; // More recipes = more diverse
  const tierDiv = Object.keys(tiers).length; // Coverage across tiers
  const deptDiv = Object.keys(departments).length; // Coverage across departments
  const qualitySpread = qualityRange.max - qualityRange.min; // Quality range
  const formalitySpread = formalityRange.max - formalityRange.min; // Formality range

  const diversityScore =
    (recipeDiv / sample.length) * 30 + // Recipe diversity (30%)
    (tierDiv / 4) * 20 + // Tier diversity (20%)
    (deptDiv / 3) * 20 + // Department diversity (20%)
    (qualitySpread / 100) * 15 + // Quality spread (15%)
    (formalitySpread / 6) * 15; // Formality spread (15%)

  return {
    recipeCount: recipeIds.size,
    tierDistribution: Object.fromEntries(
      Object.entries(tiers).map(([k, v]) => [k, v.length])
    ),
    departmentDistribution: Object.fromEntries(
      Object.entries(departments).map(([k, v]) => [k, v.length])
    ),
    qualityRange,
    formalityRange,
    diversityScore: Math.round(diversityScore * 100)
  };
}
