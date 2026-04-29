/**
 * Product Hydration System
 *
 * Refreshes outfit product data from the master source (master JSON file).
 * Solves the stale data problem where product updates don't flow through to outfits.
 *
 * Use cases:
 * - Product metadata improved (colors, materials, descriptions)
 * - Product types corrected (e.g., swim shorts mislabeled as pants)
 * - Prices updated
 * - Images changed
 */

import type { StoredOutfit } from '../outfit-storage';

export interface HydrationResult {
  outfitId: string;
  itemsUpdated: number;
  itemsFailed: number;
  changes: Array<{
    productId: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface HydrationStats {
  totalOutfits: number;
  outfitsUpdated: number;
  outfitsUnchanged: number;
  outfitsFailed: number;
  totalChanges: number;
  changesByField: Record<string, number>;
}

// In-memory product lookup cache
let productLookup: Map<string, any> | null = null;
let loadingPromise: Promise<Map<string, any>> | null = null;

/**
 * Load master products file and build lookup map
 * Only loads once, then cached in memory
 * Coordinated across parallel calls (only one fetch happens)
 */
async function loadProductLookup(): Promise<Map<string, any>> {
  // Return cached data if available
  if (productLookup) {
    return productLookup;
  }

  // If already loading, wait for that to complete
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading (only happens once)
  loadingPromise = (async () => {
    console.log('📦 Loading master product data...');

    try {
      // Fetch from Next.js API route
      const response = await fetch('/api/master-products');

      if (!response.ok) {
        throw new Error(`Failed to load products: ${response.status}`);
      }

      const products = await response.json();

      // Build lookup map by productId
      productLookup = new Map();
      products.forEach((product: any) => {
        if (product.productId) {
          productLookup!.set(product.productId, product);
        }
      });

      console.log(`✓ Loaded ${productLookup.size} products into memory`);

      return productLookup;
    } catch (error) {
      console.error('Failed to load master products:', error);
      loadingPromise = null; // Reset so retry is possible
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Get product by ID from master source
 */
async function getProductById(productId: string): Promise<any | null> {
  const lookup = await loadProductLookup();
  return lookup.get(productId) || null;
}

/**
 * Compare two values and determine if they're different
 * Handles arrays, objects, and primitives
 */
function hasChanged(oldValue: any, newValue: any): boolean {
  // Both null/undefined
  if (!oldValue && !newValue) return false;

  // One is null/undefined
  if (!oldValue || !newValue) return true;

  // Arrays
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length !== newValue.length) return true;
    return oldValue.some((v, i) => v !== newValue[i]);
  }

  // Objects (skip for now - too complex)
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }

  // Primitives
  return oldValue !== newValue;
}

/**
 * Hydrate a single outfit with fresh product data
 * Returns updated outfit and list of changes
 */
export async function hydrateOutfit(
  outfit: StoredOutfit
): Promise<{ outfit: StoredOutfit; result: HydrationResult }> {
  const changes: HydrationResult['changes'] = [];
  let itemsUpdated = 0;
  let itemsFailed = 0;

  const updatedItems = await Promise.all(
    outfit.items.map(async (item) => {
      try {
        // Fetch fresh product data from master source
        const freshProduct = await getProductById(item.product.id);

        if (!freshProduct) {
          itemsFailed++;
          return item; // Keep old data
        }

        // Compare and track changes
        const itemChanges: typeof changes = [];

        // Map master product fields to outfit product fields
        const fieldMappings: Record<string, string> = {
          // Direct mappings
          'title': 'title',
          'brand': 'brand',
          'price': 'price',
          'department': 'department',
          'productType2': 'productType2',
          'productType3': 'productType3',
          'productType4': 'productType4',

          // Array fields
          'simplifiedColors': 'colors',  // Master uses 'simplifiedColors', outfits use 'colors'
          'materials': 'materials',
          'patterns': 'patterns',
          'details': 'details',
          'weatherContext': 'weatherContext',
          'productFeatures': 'productFeatures',
          'visualAttributes': 'visualAttributes',
          'seasons': 'seasons',

          // Nested AI data (from master's aiGeneratedDescriptions)
          'comprehensiveDescription': 'comprehensiveDescription',
          'stylistDescription': 'stylistDescription',
          'description': 'description',
          'visionReasoning': 'visionReasoning',

          // Nested AI data (from master's aiLifestyleAnalysis)
          'formalityTier': 'formalityTier',
          'versatilityScore': 'versatilityScore',
          'trendTags': 'trendTags',
          'lifestyleOccasions': 'lifestyleOccasions',

          // Style attributes
          'silhouette': 'silhouette',
          'garmentLength': 'garmentLength',
          'neckline': 'neckline',
          'sleeveStyle': 'sleeveStyle',
          'fitDetails': 'fitDetails',
        };

        const updatedProduct = { ...item.product };
        let hasAnyChanges = false;

        // Extract nested AI data if present
        let aiData: any = {};
        if (freshProduct.aiGeneratedDescriptions) {
          aiData = { ...aiData, ...freshProduct.aiGeneratedDescriptions };
        }
        if (freshProduct.aiLifestyleAnalysis) {
          aiData = {
            ...aiData,
            formalityTier: freshProduct.aiLifestyleAnalysis.formalityTier?.tier,
            versatilityScore: freshProduct.aiLifestyleAnalysis.versatilityScore?.score,
            trendTags: freshProduct.aiLifestyleAnalysis.trendTags,
            lifestyleOccasions: freshProduct.aiLifestyleAnalysis.occasions,
          };
        }

        // Merge AI data into freshProduct for easier access
        const enrichedProduct = { ...freshProduct, ...aiData };

        for (const [masterField, outfitField] of Object.entries(fieldMappings)) {
          const oldValue = (item.product as any)[outfitField];
          const newValue = enrichedProduct[masterField];

          if (hasChanged(oldValue, newValue)) {
            itemChanges.push({
              productId: item.product.id,
              field: outfitField,
              oldValue,
              newValue,
            });
            (updatedProduct as any)[outfitField] = newValue;
            hasAnyChanges = true;
          }
        }

        if (hasAnyChanges) {
          itemsUpdated++;
          changes.push(...itemChanges);
        }

        return {
          ...item,
          product: updatedProduct,
        };
      } catch (error) {
        console.error(`Error hydrating item ${item.product.id}:`, error);
        itemsFailed++;
        return item; // Keep old data on error
      }
    })
  );

  const updatedOutfit: StoredOutfit = {
    ...outfit,
    items: updatedItems,
  };

  const result: HydrationResult = {
    outfitId: outfit.outfitId,
    itemsUpdated,
    itemsFailed,
    changes,
  };

  return { outfit: updatedOutfit, result };
}

/**
 * Hydrate multiple outfits in batch
 * Returns updated outfits and aggregated stats
 */
export async function hydrateOutfitsBatch(
  outfits: StoredOutfit[],
  options: {
    onProgress?: (current: number, total: number) => void;
    batchSize?: number;
  } = {}
): Promise<{
  outfits: StoredOutfit[];
  stats: HydrationStats;
  results: HydrationResult[];
}> {
  const { onProgress, batchSize = 50 } = options; // Increased from 10 - now using in-memory lookup

  const results: HydrationResult[] = [];
  const updatedOutfits: StoredOutfit[] = [];

  // Process in batches to avoid overwhelming the CLIP API
  for (let i = 0; i < outfits.length; i += batchSize) {
    const batch = outfits.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(outfit => hydrateOutfit(outfit))
    );

    batchResults.forEach(({ outfit, result }) => {
      updatedOutfits.push(outfit);
      results.push(result);
    });

    if (onProgress) {
      onProgress(Math.min(i + batchSize, outfits.length), outfits.length);
    }
  }

  // Calculate stats
  const stats: HydrationStats = {
    totalOutfits: outfits.length,
    outfitsUpdated: results.filter(r => r.itemsUpdated > 0).length,
    outfitsUnchanged: results.filter(r => r.itemsUpdated === 0 && r.itemsFailed === 0).length,
    outfitsFailed: results.filter(r => r.itemsFailed > 0).length,
    totalChanges: results.reduce((sum, r) => sum + r.changes.length, 0),
    changesByField: {},
  };

  // Count changes by field
  results.forEach(result => {
    result.changes.forEach(change => {
      stats.changesByField[change.field] = (stats.changesByField[change.field] || 0) + 1;
    });
  });

  return { outfits: updatedOutfits, stats, results };
}

/**
 * Generate human-readable hydration report
 */
export function formatHydrationStats(stats: HydrationStats): string {
  const lines: string[] = [];

  lines.push('Product Hydration Report');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Total outfits processed: ${stats.totalOutfits}`);
  lines.push(`  ✅ Updated: ${stats.outfitsUpdated} (${Math.round(stats.outfitsUpdated / stats.totalOutfits * 100)}%)`);
  lines.push(`  ✓ Unchanged: ${stats.outfitsUnchanged}`);
  lines.push(`  ❌ Failed: ${stats.outfitsFailed}`);
  lines.push('');
  lines.push(`Total changes: ${stats.totalChanges}`);
  lines.push('');
  lines.push('Changes by field:');

  const sortedFields = Object.entries(stats.changesByField)
    .sort((a, b) => b[1] - a[1]);

  sortedFields.forEach(([field, count]) => {
    lines.push(`  ${field.padEnd(30)} ${count}`);
  });

  return lines.join('\n');
}

/**
 * Check if product data needs hydration (basic freshness check)
 */
export function needsHydration(outfit: StoredOutfit, maxAgeHours: number = 24 * 7): boolean {
  const outfitAge = Date.now() - new Date(outfit.generatedAt).getTime();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  // Check if outfit is older than threshold
  if (outfitAge > maxAge) {
    return true;
  }

  // Check if any products are missing critical metadata
  const hasMissingMetadata = outfit.items.some(item => {
    return !item.product.productType2 ||
           !item.product.colors ||
           item.product.colors.length === 0;
  });

  return hasMissingMetadata;
}
