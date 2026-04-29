/**
 * Outfit Ranking System - Predicted Engagement Score
 *
 * Combines quality scores with real transaction data to predict
 * which outfits would get the most customer engagement.
 *
 * Based on 31.8M H&M transactions + synthetic inference for full catalog.
 *
 * ARCHITECTURE: Transaction data is accessed via provider interface,
 * NOT embedded in product objects. This maintains clean separation
 * between product attributes and engagement metrics.
 */

import type { StoredOutfit } from './outfit-storage';
import type { TransactionDataProvider } from './transaction-cache';

/**
 * Customer Profile for Personalization
 */
export interface CustomerProfile {
  age?: number;
  gender?: 'womens' | 'mens' | 'all';
  pricePoint?: 'low' | 'mid' | 'high';
  stylePreference?: 'minimal' | 'bold' | 'classic' | 'trendy' | 'eclectic';
  colorPreference?: string[]; // Preferred colors
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  engagementLevel?: 'high' | 'medium' | 'low'; // How engaged with fashion
}

/**
 * Ranking Mode
 */
export type RankingMode = 'baseline' | 'personalized';

/**
 * Ranking Options
 */
export interface RankingOptions {
  mode?: RankingMode; // 'baseline' = generic, 'personalized' = customer-adjusted
  customerProfile?: CustomerProfile;
  transactionDataProvider?: TransactionDataProvider; // Provider for transaction data
}

/**
 * Transaction Data from Product
 */
export interface TransactionData {
  transactionCount: number;
  uniqueCustomers: number;
  avgPurchaseFrequency: number;
  customerSegments: {
    age: {
      '<25': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
    };
    engagement: {
      regular: number;
      monthly: number;
      none: number;
    };
  };
  seasonalTrend: {
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  synthetic?: boolean; // true = inferred, false = real H&M data
}

/**
 * Ranking Components Breakdown
 */
export interface RankingBreakdown {
  qualityScore: number;           // 0-100 (fashion quality)
  popularityScore: number;         // 0-100 (transaction volume)
  segmentMatchScore: number;       // 0-100 (customer demographic fit)
  seasonalRelevanceScore: number;  // 0-100 (seasonal trend match)
  diversityScore: number;          // 0-100 (novelty/uniqueness)
  freshnessScore: number;          // 0-100 (recency bias)
  predictedEngagement: number;     // 0-100 (final weighted score)
}

/**
 * Enriched Outfit with Ranking
 */
export interface RankedOutfit extends StoredOutfit {
  ranking: RankingBreakdown;
}

// ============================================================================
// Scoring Components
// ============================================================================

/**
 * Calculate Product Popularity Score (0-100)
 * Based on transaction volume
 */
function calculatePopularityScore(transactionData: TransactionData): number {
  const txCount = transactionData.transactionCount;

  // Scale transaction count to 0-100
  // Using log scale because transaction distribution is highly skewed
  // Typical range: 10-50,000 transactions
  // Log10(50000) ≈ 4.7, Log10(100) ≈ 2, Log10(10) ≈ 1
  const logTx = Math.log10(Math.max(txCount, 1));

  // Map log scale to 0-100
  // 1-10 tx = 0-20, 10-100 tx = 20-50, 100-1000 tx = 50-75, 1000+ tx = 75-100
  const normalized = Math.min(100, (logTx - 1) * 25); // (log10(10) - 1) * 25 = 25

  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate Customer Segment Match Score (0-100)
 * How well does outfit match customer demographics
 */
function calculateSegmentMatchScore(
  outfit: StoredOutfit,
  customerProfile: CustomerProfile,
  transactionDataMap: Map<string, TransactionData>
): number {
  // If no customer profile, return neutral score
  if (!customerProfile.age && !customerProfile.engagementLevel) {
    return 50;
  }

  let totalScore = 0;
  let components = 0;

  // Age match
  if (customerProfile.age) {
    const ageGroup =
      customerProfile.age < 25
        ? '<25'
        : customerProfile.age < 35
        ? '25-34'
        : customerProfile.age < 45
        ? '35-44'
        : customerProfile.age < 55
        ? '45-54'
        : customerProfile.age < 65
        ? '55-64'
        : '65+';

    // Calculate average age segment appeal across all products in outfit
    const ageScores = outfit.items.map((item) => {
      const txData = transactionDataMap.get(item.product.id);
      if (!txData) return 50; // Neutral if no data

      const totalCustomers = Object.values(txData.customerSegments.age).reduce(
        (sum, count) => sum + count,
        0
      );
      const ageGroupCustomers = txData.customerSegments.age[ageGroup] || 0;

      // Score based on percentage of customers in this age group
      const percentage = totalCustomers > 0 ? ageGroupCustomers / totalCustomers : 0;
      return percentage * 100;
    });

    totalScore += ageScores.reduce((sum, score) => sum + score, 0) / ageScores.length;
    components++;
  }

  // Engagement level match
  if (customerProfile.engagementLevel) {
    const engagementKey =
      customerProfile.engagementLevel === 'high'
        ? 'regular'
        : customerProfile.engagementLevel === 'medium'
        ? 'monthly'
        : 'none';

    const engagementScores = outfit.items.map((item) => {
      const txData = transactionDataMap.get(item.product.id);
      if (!txData) return 50;

      const totalCustomers = Object.values(txData.customerSegments.engagement).reduce(
        (sum, count) => sum + count,
        0
      );
      const engagementCustomers = txData.customerSegments.engagement[engagementKey] || 0;

      const percentage = totalCustomers > 0 ? engagementCustomers / totalCustomers : 0;
      return percentage * 100;
    });

    totalScore += engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;
    components++;
  }

  return components > 0 ? totalScore / components : 50;
}

/**
 * Calculate Seasonal Relevance Score (0-100)
 * Boost outfits with products popular in current season
 */
function calculateSeasonalRelevanceScore(
  outfit: StoredOutfit,
  currentSeason: 'spring' | 'summer' | 'fall' | 'winter' | undefined,
  transactionDataMap: Map<string, TransactionData>
): number {
  if (!currentSeason) return 50; // Neutral if no season specified

  const seasonalScores = outfit.items.map((item) => {
    const txData = transactionDataMap.get(item.product.id);
    if (!txData) return 50;

    const totalTx = Object.values(txData.seasonalTrend).reduce((sum, count) => sum + count, 0);
    const seasonalTx = txData.seasonalTrend[currentSeason] || 0;

    // Score based on percentage of transactions in this season
    const percentage = totalTx > 0 ? seasonalTx / totalTx : 0.25; // Default 25% if no data

    // Boost if above average (25%)
    // 25% = 50 score, 40% = 100 score, 10% = 0 score
    const score = ((percentage - 0.25) / 0.15) * 50 + 50;
    return Math.max(0, Math.min(100, score));
  });

  return seasonalScores.reduce((sum, score) => sum + score, 0) / seasonalScores.length;
}

/**
 * Calculate Diversity Score (0-100)
 * Rewards outfits that are unique/novel
 * (Placeholder for now - requires global outfit analysis)
 */
function calculateDiversityScore(outfit: StoredOutfit): number {
  // TODO: Implement diversity detection
  // - Color palette novelty (different from most common combos)
  // - Product combination rarity (unusual pairings)
  // - Style mixing creativity (intentional contrast)

  // For now, use style mixing as a proxy
  const styleRegisters = outfit.items.map((item) => item.product.productType2 || 'Unknown');
  const uniqueStyles = new Set(styleRegisters).size;

  // More diverse items = higher score
  // 2 types = 40, 3 types = 60, 4+ types = 80
  return Math.min(100, 20 + uniqueStyles * 20);
}

/**
 * Calculate Freshness Score (0-100)
 * Bias toward recently generated outfits (discovery)
 */
function calculateFreshnessScore(outfit: StoredOutfit): number {
  const generatedAt = new Date(outfit.generatedAt);
  const now = new Date();
  const daysOld = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Freshness decay curve
  if (daysOld < 7) return 100; // Last week = 100
  if (daysOld < 30) return 75; // Last month = 75
  if (daysOld < 90) return 50; // Last quarter = 50
  return 25; // Older = 25
}

// ============================================================================
// Main Ranking Functions
// ============================================================================

/**
 * Calculate Predicted Engagement Score for an outfit
 */
export function calculatePredictedEngagement(
  outfit: StoredOutfit,
  transactionDataMap: Map<string, TransactionData>,
  customerProfile?: CustomerProfile,
  mode: RankingMode = 'baseline'
): RankingBreakdown {
  const profile = customerProfile || {};

  // Calculate component scores
  const qualityScore = outfit.qualityScore || 50;

  // Calculate average popularity across all products
  const popularityScores = outfit.items.map((item) => {
    const txData = transactionDataMap.get(item.product.id);
    return txData ? calculatePopularityScore(txData) : 50;
  });
  const popularityScore =
    popularityScores.reduce((sum, score) => sum + score, 0) / popularityScores.length;

  const segmentMatchScore = calculateSegmentMatchScore(outfit, profile, transactionDataMap);
  const seasonalRelevanceScore = calculateSeasonalRelevanceScore(outfit, profile.season, transactionDataMap);
  const diversityScore = calculateDiversityScore(outfit);
  const freshnessScore = calculateFreshnessScore(outfit);

  // Weighted combination
  // Baseline mode: Quality + Popularity dominate (no personalization)
  // Personalized mode: Add demographic and seasonal adjustments
  let predictedEngagement: number;

  if (mode === 'baseline') {
    predictedEngagement =
      qualityScore * 0.5 + // Fashion quality (50%)
      popularityScore * 0.35 + // Transaction volume (35%)
      diversityScore * 0.08 + // Novelty (8%)
      freshnessScore * 0.07; // Recency (7%)
  } else {
    predictedEngagement =
      qualityScore * 0.3 + // Fashion quality (30%)
      popularityScore * 0.25 + // Transaction volume (25%)
      segmentMatchScore * 0.2 + // Customer fit (20%)
      seasonalRelevanceScore * 0.15 + // Seasonal relevance (15%)
      diversityScore * 0.05 + // Novelty (5%)
      freshnessScore * 0.05; // Recency (5%)
  }

  return {
    qualityScore,
    popularityScore,
    segmentMatchScore,
    seasonalRelevanceScore,
    diversityScore,
    freshnessScore,
    predictedEngagement: Math.round(predictedEngagement),
  };
}

/**
 * Rank outfits by predicted engagement
 *
 * New architecture: Transaction data accessed via provider, not embedded in products.
 * Supports baseline (generic) and personalized (customer-specific) ranking modes.
 */
export async function rankOutfits(
  outfits: StoredOutfit[],
  options: RankingOptions = {}
): Promise<RankedOutfit[]> {
  const {
    mode = 'baseline',
    customerProfile,
    transactionDataProvider,
  } = options;

  // Filter by gender if specified
  let filteredOutfits = outfits;
  if (customerProfile?.gender && customerProfile.gender !== 'all') {
    filteredOutfits = outfits.filter((outfit) => {
      const deptLower = outfit.department.toLowerCase();
      if (customerProfile.gender === 'womens') {
        return deptLower.includes('women') || deptLower.includes('ladies');
      } else if (customerProfile.gender === 'mens') {
        return deptLower.includes('men') && !deptLower.includes('women');
      }
      return true;
    });
  }

  // Batch fetch transaction data for all products in all outfits
  let transactionDataMap = new Map<string, TransactionData>();
  if (transactionDataProvider) {
    const allProductIds = new Set<string>();
    for (const outfit of filteredOutfits) {
      for (const item of outfit.items) {
        allProductIds.add(item.product.id);
      }
    }

    console.log(`[Ranking] Fetching transaction data for ${allProductIds.size} unique products...`);
    const startTime = performance.now();

    try {
      transactionDataMap = await transactionDataProvider.getTransactionDataBatch(
        Array.from(allProductIds)
      );
      const elapsed = performance.now() - startTime;
      console.log(`[Ranking] Fetched ${transactionDataMap.size} transaction records in ${elapsed.toFixed(0)}ms`);
    } catch (error) {
      console.warn('[Ranking] Failed to fetch transaction data:', error);
      // Continue with empty map - will use neutral scores
    }
  }

  console.log(`[Ranking] Calculating scores for ${filteredOutfits.length} outfits...`);
  const ranked = filteredOutfits
    .map((outfit) => ({
      ...outfit,
      ranking: calculatePredictedEngagement(outfit, transactionDataMap, customerProfile, mode),
    }))
    .sort((a, b) => b.ranking.predictedEngagement - a.ranking.predictedEngagement);

  console.log(`[Ranking] ✓ Ranked ${ranked.length} outfits (mode: ${mode})`);
  return ranked;
}

/**
 * Rank outfits for a specific product (PDP context)
 * Filters to outfits containing the product, then ranks
 */
export async function rankOutfitsForProduct(
  outfits: StoredOutfit[],
  productId: string,
  options: RankingOptions = {}
): Promise<RankedOutfit[]> {
  const filteredOutfits = outfits.filter((outfit) =>
    outfit.items.some((item) => item.product.id === productId)
  );

  return rankOutfits(filteredOutfits, options);
}

// ============================================================================
// Product Diversity Functions
// ============================================================================

/**
 * Calculate product overlap between two outfits
 * Returns percentage (0-100) of products that appear in both
 */
export function calculateProductOverlap(outfit1: StoredOutfit, outfit2: StoredOutfit): number {
  const products1 = new Set(outfit1.items.map((item) => item.product.id));
  const products2 = new Set(outfit2.items.map((item) => item.product.id));

  // Count how many products are shared
  let sharedCount = 0;
  for (const productId of products1) {
    if (products2.has(productId)) {
      sharedCount++;
    }
  }

  // Calculate overlap as percentage of smaller outfit
  const minSize = Math.min(products1.size, products2.size);
  const overlapPercent = minSize > 0 ? (sharedCount / minSize) * 100 : 0;

  return Math.round(overlapPercent);
}

/**
 * Get diverse outfits by ensuring recipe variety AND product diversity
 *
 * Algorithm:
 * 1. Phase 1: Best outfit from each unique recipe (no repeats)
 * 2. Phase 2: Fill remaining slots with <maxOverlap% product overlap
 * 3. Phase 3: If still not full, relax constraints
 *
 * @param rankedOutfits - Already ranked outfits (sorted by score)
 * @param limit - How many outfits to return
 * @param maxOverlap - Maximum product overlap % allowed (default 50%)
 */
export function getDiverseOutfits(
  rankedOutfits: RankedOutfit[],
  limit: number,
  maxOverlap: number = 50
): RankedOutfit[] {
  const result: RankedOutfit[] = [];
  const seenRecipes = new Set<string>();

  // Phase 1: Get best outfit from each unique recipe
  for (const outfit of rankedOutfits) {
    if (!seenRecipes.has(outfit.recipeId)) {
      result.push(outfit);
      seenRecipes.add(outfit.recipeId);
      if (result.length >= limit) return result;
    }
  }

  // Phase 2: Fill remaining slots with product diversity constraint
  for (const outfit of rankedOutfits) {
    // Skip if already included
    if (result.some((r) => r.outfitId === outfit.outfitId)) {
      continue;
    }

    // Check product overlap with all selected outfits
    let meetsConstraint = true;
    for (const selected of result) {
      const overlap = calculateProductOverlap(outfit, selected);
      if (overlap > maxOverlap) {
        meetsConstraint = false;
        break;
      }
    }

    if (meetsConstraint) {
      result.push(outfit);
      if (result.length >= limit) return result;
    }
  }

  // Phase 3: If still not full, relax constraints and fill remaining
  for (const outfit of rankedOutfits) {
    if (!result.some((r) => r.outfitId === outfit.outfitId)) {
      result.push(outfit);
      if (result.length >= limit) return result;
    }
  }

  return result;
}

/**
 * Get diverse outfits for a specific product (PDP context)
 *
 * Shows outfits that:
 * 1. Contain the specified product
 * 2. Have diverse styling (different recipes + product combinations)
 * 3. Are highly ranked
 *
 * Example: PDP carousel showing 20 ways to style a specific pair of jeans
 */
export function getDiverseOutfitsForProduct(
  rankedOutfits: RankedOutfit[],
  productId: string,
  limit: number = 20,
  options: { maxOverlap?: number } = {}
): RankedOutfit[] {
  // Filter to outfits containing the product
  const outfitsWithProduct = rankedOutfits.filter((outfit) =>
    outfit.items.some((item) => item.product.id === productId)
  );

  // Apply diversity algorithm
  return getDiverseOutfits(outfitsWithProduct, limit, options.maxOverlap);
}

/**
 * Check transaction data coverage for outfits via provider
 * Returns diagnostic info about data availability
 */
export async function checkTransactionDataCoverage(
  outfits: StoredOutfit[],
  transactionDataProvider: TransactionDataProvider
): Promise<{
  totalProducts: number;
  productsWithData: number;
  productsWithoutData: number;
  coveragePercent: number;
  sampleProductsWithoutData: string[];
}> {
  // Collect all unique product IDs
  const allProductIds = new Set<string>();
  for (const outfit of outfits) {
    for (const item of outfit.items) {
      allProductIds.add(item.product.id);
    }
  }

  // Batch fetch transaction data
  const transactionDataMap = await transactionDataProvider.getTransactionDataBatch(
    Array.from(allProductIds)
  );

  let productsWithData = 0;
  let productsWithoutData = 0;
  const sampleWithoutData: string[] = [];

  for (const productId of allProductIds) {
    if (transactionDataMap.has(productId)) {
      productsWithData++;
    } else {
      productsWithoutData++;
      if (sampleWithoutData.length < 10) {
        sampleWithoutData.push(productId);
      }
    }
  }

  return {
    totalProducts: allProductIds.size,
    productsWithData,
    productsWithoutData,
    coveragePercent: allProductIds.size > 0 ? (productsWithData / allProductIds.size) * 100 : 0,
    sampleProductsWithoutData: sampleWithoutData,
  };
}

/**
 * Get customer profile from signals (for Next.js integration)
 */
export function buildCustomerProfile(signals: any): CustomerProfile {
  return {
    gender: signals.gender,
    season: signals.season,
    age: signals.age,
    pricePoint: signals.price_sensitivity === 'high' ? 'low' : signals.price_sensitivity === 'low' ? 'high' : 'mid',
    engagementLevel: 'medium', // Default
  };
}

// ============================================================================
// Analytics & Insights
// ============================================================================

/**
 * Get ranking insights for debugging
 */
export function getRankingInsights(rankedOutfits: RankedOutfit[]): {
  avgQuality: number;
  avgPopularity: number;
  avgSegmentMatch: number;
  avgSeasonal: number;
  avgDiversity: number;
  avgFreshness: number;
  avgPredictedEngagement: number;
  topRankingFactors: Array<{ factor: string; avgScore: number }>;
} {
  const count = rankedOutfits.length;
  if (count === 0) {
    return {
      avgQuality: 0,
      avgPopularity: 0,
      avgSegmentMatch: 0,
      avgSeasonal: 0,
      avgDiversity: 0,
      avgFreshness: 0,
      avgPredictedEngagement: 0,
      topRankingFactors: [],
    };
  }

  const avgQuality =
    rankedOutfits.reduce((sum, o) => sum + o.ranking.qualityScore, 0) / count;
  const avgPopularity =
    rankedOutfits.reduce((sum, o) => sum + o.ranking.popularityScore, 0) / count;
  const avgSegmentMatch =
    rankedOutfits.reduce((sum, o) => sum + o.ranking.segmentMatchScore, 0) / count;
  const avgSeasonal =
    rankedOutfits.reduce((sum, o) => sum + o.ranking.seasonalRelevanceScore, 0) / count;
  const avgDiversity =
    rankedOutfits.reduce((sum, o) => sum + o.ranking.diversityScore, 0) / count;
  const avgFreshness =
    rankedOutfits.reduce((sum, o) => sum + o.ranking.freshnessScore, 0) / count;
  const avgPredictedEngagement =
    rankedOutfits.reduce((sum, o) => sum + o.ranking.predictedEngagement, 0) / count;

  const topRankingFactors = [
    { factor: 'Quality', avgScore: avgQuality },
    { factor: 'Popularity', avgScore: avgPopularity },
    { factor: 'Segment Match', avgScore: avgSegmentMatch },
    { factor: 'Seasonal', avgScore: avgSeasonal },
    { factor: 'Diversity', avgScore: avgDiversity },
    { factor: 'Freshness', avgScore: avgFreshness },
  ].sort((a, b) => b.avgScore - a.avgScore);

  return {
    avgQuality,
    avgPopularity,
    avgSegmentMatch,
    avgSeasonal,
    avgDiversity,
    avgFreshness,
    avgPredictedEngagement,
    topRankingFactors,
  };
}

/**
 * Get diversity insights for a set of outfits
 */
export function getDiversityInsights(outfits: StoredOutfit[]): {
  uniqueRecipes: number;
  uniqueProducts: number;
  avgProductsPerOutfit: number;
  avgProductOverlap: number;
  maxProductOverlap: number;
  minProductOverlap: number;
} {
  if (outfits.length === 0) {
    return {
      uniqueRecipes: 0,
      uniqueProducts: 0,
      avgProductsPerOutfit: 0,
      avgProductOverlap: 0,
      maxProductOverlap: 0,
      minProductOverlap: 0,
    };
  }

  // Unique recipes
  const recipeIds = new Set(outfits.map((o) => o.recipeId));

  // Unique products
  const productIds = new Set<string>();
  let totalProducts = 0;
  for (const outfit of outfits) {
    totalProducts += outfit.items.length;
    for (const item of outfit.items) {
      productIds.add(item.product.id);
    }
  }

  // Product overlap analysis (compare consecutive outfits)
  const overlapScores: number[] = [];
  for (let i = 1; i < outfits.length; i++) {
    const overlap = calculateProductOverlap(outfits[i - 1], outfits[i]);
    overlapScores.push(overlap);
  }

  const avgOverlap = overlapScores.length > 0
    ? overlapScores.reduce((sum, val) => sum + val, 0) / overlapScores.length
    : 0;
  const maxOverlap = overlapScores.length > 0 ? Math.max(...overlapScores) : 0;
  const minOverlap = overlapScores.length > 0 ? Math.min(...overlapScores) : 0;

  return {
    uniqueRecipes: recipeIds.size,
    uniqueProducts: productIds.size,
    avgProductsPerOutfit: totalProducts / outfits.length,
    avgProductOverlap: Math.round(avgOverlap),
    maxProductOverlap: maxOverlap,
    minProductOverlap: minOverlap,
  };
}
