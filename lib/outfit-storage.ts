/**
 * Outfit Storage
 * Manages cooked outfits in IndexedDB (migrated from localStorage for 100MB+ capacity)
 */

import type { ScoredOutfit } from './recipe-cooking/types';
import type { OutfitAttributes } from './outfit-attributes';
import * as IDB from './indexeddb-storage';

const LEGACY_STORAGE_KEY = 'cooked-outfits';
const MIGRATION_FLAG_KEY = 'outfits-migrated-to-indexeddb';

export interface StoredOutfit {
  outfitId: string;
  recipeId: string;
  recipeTitle: string;
  department: string;
  generatedAt: string;
  strategy: string;
  confidenceScore: number; // Legacy - same as qualityScore
  qualityScore: number; // New two-score system
  alignmentScore: number; // New two-score system
  poolTier: 'primary' | 'secondary' | 'suppressed' | 'happy-accident';
  scoreBreakdown: {
    styleRegisterCoherence: number;
    colorHarmony: number;
    silhouetteBalance: number;
    occasionAlignment: number;
    seasonFabricWeight: number;
  };
  items: Array<{
    role: string;
    ingredientTitle: string;
    product: {
      id: string;
      title: string;
      brand: string;
      price: number;
      imageUrl: string;
      department: string;
      colors?: string[];

      // Rich metadata (NEW - for attribute tagging)
      description?: string;
      materials?: string[];
      patterns?: string | string[];
      silhouette?: string;
      garmentLength?: string;
      neckline?: string;
      sleeveStyle?: string;
      fitDetails?: string;
      details?: string[];
      productType2?: string;
      productType3?: string;
      productType4?: string;
      weatherContext?: string[];
      productFeatures?: string[];
      visualAttributes?: string[];
      visionReasoning?: string;
    };
  }>;
  reasoning?: string;
  linkedToRecipe?: boolean;
  attributes?: OutfitAttributes; // Semantic tags: Style Pillar, Vibes, Occasions
}

/**
 * Migrate localStorage outfits to IndexedDB (runs once automatically)
 */
async function migrateFromLocalStorage(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  // Check if already migrated
  const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
  if (migrated === 'true') {
    return 0; // Already migrated
  }

  console.log('🔄 Migrating outfits from localStorage to IndexedDB...');

  // Get outfits from localStorage
  const data = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!data) {
    // No data to migrate
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    return 0;
  }

  try {
    const outfits: StoredOutfit[] = JSON.parse(data);
    console.log(`📦 Found ${outfits.length} outfits in localStorage`);

    // Batch save to IndexedDB
    await IDB.saveOutfitsBatch(outfits);

    // Mark as migrated
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    // Keep localStorage data for now (don't auto-delete in case of issues)
    console.log(`✓ Successfully migrated ${outfits.length} outfits to IndexedDB`);
    console.log('💡 localStorage data preserved as backup (can be cleared manually)');

    return outfits.length;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw new Error('Failed to migrate outfits to IndexedDB');
  }
}

/**
 * Save outfits from a cooking result
 */
export async function saveOutfits(
  recipeId: string,
  recipeTitle: string,
  department: string,
  strategy: string,
  outfits: ScoredOutfit[]
): Promise<void> {
  if (typeof window === 'undefined') return;

  // Ensure migration has happened
  await migrateFromLocalStorage();

  const newOutfits: StoredOutfit[] = outfits.map((outfit, idx) => ({
    outfitId: `${recipeId}_${Date.now()}_${idx}`,
    recipeId,
    recipeTitle,
    department,
    generatedAt: new Date().toISOString(),
    strategy,
    confidenceScore: outfit.confidenceScore || outfit.qualityScore, // Legacy fallback
    qualityScore: outfit.qualityScore,
    alignmentScore: outfit.alignmentScore,
    poolTier: outfit.poolTier,
    scoreBreakdown: outfit.scoreBreakdown,
    items: outfit.items.map((item) => ({
      role: item.role,
      ingredientTitle: item.ingredientTitle,
      product: {
        id: item.product.id,
        title: item.product.title,
        brand: item.product.brand,
        price: item.product.price,
        imageUrl: item.product.imageUrl,
        department: item.product.department,
        colors: item.product.colors,

        // Rich metadata (NEW - preserve from CLIP API)
        description: item.product.description,
        materials: item.product.materials,
        patterns: item.product.patterns,
        silhouette: item.product.silhouette,
        garmentLength: item.product.garmentLength,
        neckline: item.product.neckline,
        sleeveStyle: item.product.sleeveStyle,
        fitDetails: item.product.fitDetails,
        details: item.product.details,
        productType2: item.product.productType2,
        productType3: item.product.productType3,
        productType4: item.product.productType4,
        weatherContext: item.product.weatherContext,
        productFeatures: item.product.productFeatures,
        visualAttributes: item.product.visualAttributes,
        visionReasoning: item.product.visionReasoning,
      },
    })),
    reasoning: outfit.reasoning,
    linkedToRecipe: outfit.linkedToRecipe,
  }));

  // Save to IndexedDB (batch operation for speed)
  await IDB.saveOutfitsBatch(newOutfits);

  console.log(`✓ Saved ${newOutfits.length} outfits to IndexedDB`);
}

/**
 * Get all cooked outfits
 */
export async function getAllOutfits(): Promise<StoredOutfit[]> {
  if (typeof window === 'undefined') return [];

  // Ensure migration has happened
  await migrateFromLocalStorage();

  try {
    return await IDB.getAllOutfits();
  } catch (error) {
    console.error('Failed to retrieve outfits from IndexedDB:', error);
    return [];
  }
}

/**
 * Get outfits for a specific recipe
 */
export async function getOutfitsByRecipe(recipeId: string): Promise<StoredOutfit[]> {
  if (typeof window === 'undefined') return [];

  await migrateFromLocalStorage();

  try {
    return await IDB.getOutfitsByRecipe(recipeId);
  } catch (error) {
    console.error('Failed to retrieve outfits by recipe:', error);
    return [];
  }
}

/**
 * Get outfits by pool tier
 */
export async function getOutfitsByTier(tier: 'primary' | 'secondary' | 'suppressed' | 'happy-accident'): Promise<StoredOutfit[]> {
  if (typeof window === 'undefined') return [];

  await migrateFromLocalStorage();

  try {
    return await IDB.getOutfitsByTier(tier);
  } catch (error) {
    console.error('Failed to retrieve outfits by tier:', error);
    return [];
  }
}

/**
 * Delete an outfit
 */
export async function deleteOutfit(outfitId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  await migrateFromLocalStorage();

  try {
    await IDB.deleteOutfit(outfitId);
  } catch (error) {
    console.error('Failed to delete outfit:', error);
    throw error;
  }
}

/**
 * Delete all outfits for a recipe
 */
export async function deleteOutfitsByRecipe(recipeId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  await migrateFromLocalStorage();

  try {
    await IDB.deleteOutfitsByRecipe(recipeId);
  } catch (error) {
    console.error('Failed to delete outfits by recipe:', error);
    throw error;
  }
}

/**
 * Clear all outfits
 */
export async function clearAllOutfits(): Promise<void> {
  if (typeof window === 'undefined') return;

  await migrateFromLocalStorage();

  try {
    await IDB.clearAllOutfits();
  } catch (error) {
    console.error('Failed to clear outfits:', error);
    throw error;
  }
}

/**
 * Get outfit statistics
 */
export async function getOutfitStats() {
  const outfits = await getAllOutfits();
  const byRecipe = new Map<string, number>();

  outfits.forEach((outfit) => {
    byRecipe.set(outfit.recipeId, (byRecipe.get(outfit.recipeId) || 0) + 1);
  });

  return {
    total: outfits.length,
    primary: outfits.filter((o) => o.poolTier === 'primary').length,
    secondary: outfits.filter((o) => o.poolTier === 'secondary').length,
    suppressed: outfits.filter((o) => o.poolTier === 'suppressed').length,
    recipeCount: byRecipe.size,
    avgScore: outfits.reduce((sum, o) => sum + o.confidenceScore, 0) / outfits.length || 0,
    byRecipe: Object.fromEntries(byRecipe),
  };
}

/**
 * Export all outfits to JSON file
 * Use this to backup outfits before clearing storage
 */
export async function exportOutfitsToJSON(): Promise<void> {
  if (typeof window === 'undefined') return;

  const outfits = await getAllOutfits();
  const dataStr = JSON.stringify(outfits, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `outfits-backup-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✓ Exported ${outfits.length} outfits to JSON file`);
}

/**
 * Import outfits from JSON file
 * Merges with existing outfits (doesn't overwrite)
 */
export async function importOutfitsFromJSON(jsonData: StoredOutfit[]): Promise<number> {
  if (typeof window === 'undefined') return 0;

  await migrateFromLocalStorage();

  const existing = await getAllOutfits();
  const existingIds = new Set(existing.map(o => o.outfitId));

  // Only import outfits that don't already exist
  const newOutfits = jsonData.filter(o => !existingIds.has(o.outfitId));

  if (newOutfits.length > 0) {
    try {
      await IDB.saveOutfitsBatch(newOutfits);
      console.log(`✓ Imported ${newOutfits.length} new outfits to IndexedDB`);
      return newOutfits.length;
    } catch (e) {
      console.error('Failed to import outfits:', e);
      throw e;
    }
  }

  return 0;
}

/**
 * Replace ALL outfits from JSON file
 * Clears existing and imports all (no duplicate checking)
 */
export async function replaceAllOutfitsFromJSON(jsonData: StoredOutfit[]): Promise<number> {
  if (typeof window === 'undefined') return 0;

  await migrateFromLocalStorage();

  try {
    // Clear everything first
    console.log('🗑️ Clearing all existing outfits...');
    await clearAllOutfits();

    // Import all without checking for duplicates
    console.log(`📦 Importing ${jsonData.length} outfits...`);
    await IDB.saveOutfitsBatch(jsonData);

    console.log(`✅ Successfully replaced all outfits with ${jsonData.length} new ones`);
    return jsonData.length;
  } catch (e) {
    console.error('❌ Failed to replace outfits:', e);
    throw e;
  }
}

/**
 * Fix image URLs in stored outfits
 * Converts old relative URLs to new absolute CLIP API URLs
 * Also fetches missing imageUrls from CLIP API
 *
 * Old format: /product-images/filename.jpg (Recipe Builder port, doesn't exist)
 * New format: http://localhost:5002/product-images-unified/filename.jpg (CLIP API)
 */
export async function fixOutfitImageUrls(): Promise<{ fixed: number; fetched: number; total: number }> {
  if (typeof window === 'undefined') return { fixed: 0, fetched: 0, total: 0 };

  const outfits = await getAllOutfits();
  let fixedCount = 0;
  let fetchedCount = 0;

  // Collect products with missing imageUrls
  const missingImageProducts = new Set<string>();
  outfits.forEach((outfit) => {
    outfit.items.forEach((item) => {
      if (!item.product.imageUrl || item.product.imageUrl === '') {
        missingImageProducts.add(item.product.id);
      }
    });
  });

  // Fetch imageUrls from CLIP API for missing products
  const productImageMap = new Map<string, string>();
  if (missingImageProducts.size > 0) {
    console.log(`🔍 Fetching imageUrls for ${missingImageProducts.size} products from CLIP API...`);

    try {
      // Batch fetch from CLIP API /product/:id endpoint
      const fetchPromises = Array.from(missingImageProducts).map(async (productId) => {
        try {
          const response = await fetch(`http://localhost:5002/product/${productId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.product?.imageUrl) {
              productImageMap.set(productId, data.product.imageUrl);
              return true;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch imageUrl for ${productId}`);
        }
        return false;
      });

      await Promise.all(fetchPromises);
      fetchedCount = productImageMap.size;
      console.log(`✓ Fetched ${fetchedCount} imageUrls from CLIP API`);
    } catch (error) {
      console.error('Error fetching imageUrls:', error);
    }
  }

  const fixedOutfits = outfits.map((outfit) => {
    const fixedItems = outfit.items.map((item) => {
      const oldUrl = item.product.imageUrl;
      let newUrl = oldUrl;

      // Fix missing URLs: fetch from CLIP API
      if (!oldUrl || oldUrl === '') {
        const fetchedUrl = productImageMap.get(item.product.id);
        if (fetchedUrl) {
          newUrl = fetchedUrl;
          // Don't increment fixedCount here, use fetchedCount instead
        }
      }
      // Fix relative URLs: /product-images/file.jpg → http://localhost:5002/product-images/file.jpg
      else if (oldUrl.startsWith('/product-images/') && !oldUrl.startsWith('http')) {
        const filename = oldUrl.split('/').pop();
        newUrl = `http://localhost:5002/product-images/${filename}`;
        fixedCount++;
      }
      // Fix old broken URLs: product-images-unified → product-images
      else if (oldUrl.includes('/product-images-unified/')) {
        newUrl = oldUrl.replace('/product-images-unified/', '/product-images/');
        fixedCount++;
      }

      return {
        ...item,
        product: {
          ...item.product,
          imageUrl: newUrl,
        },
      };
    });

    return {
      ...outfit,
      items: fixedItems,
    };
  });

  if (fixedCount > 0 || fetchedCount > 0) {
    // Save all fixed outfits back to IndexedDB
    await IDB.saveOutfitsBatch(fixedOutfits);
    console.log(`✓ Fixed ${fixedCount} malformed URLs, fetched ${fetchedCount} missing URLs`);
  }

  return { fixed: fixedCount, fetched: fetchedCount, total: outfits.length };
}

/**
 * Clear localStorage backup (call after confirming IndexedDB migration)
 * Only clears outfit data, not the migration flag
 */
export function clearLocalStorageBackup(): void {
  if (typeof window === 'undefined') return;

  const data = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (data) {
    try {
      const outfitCount = JSON.parse(data).length;
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      console.log(`✓ Cleared localStorage backup (${outfitCount} outfits)`);
      console.log('💡 IndexedDB is now the primary storage');
    } catch (e) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      console.log('✓ Cleared localStorage backup');
    }
  } else {
    console.log('ℹ️  No localStorage backup found');
  }
}

/**
 * Get storage info for debugging
 */
export async function getStorageInfo() {
  if (typeof window === 'undefined') return null;

  const localStorageData = localStorage.getItem(LEGACY_STORAGE_KEY);
  let localStorageCount = 0;
  let localStorageSize = '0KB';

  if (localStorageData) {
    try {
      localStorageCount = JSON.parse(localStorageData).length;
      localStorageSize = `~${Math.round(localStorageData.length / 1024)}KB`;
    } catch (e) {
      // Ignore parse errors
    }
  }

  const migrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  const indexedDBCount = await IDB.getOutfitCount();

  return {
    localStorage: {
      outfitCount: localStorageCount,
      hasMigrated: migrated,
      sizeEstimate: localStorageSize,
    },
    indexedDB: {
      outfitCount: indexedDBCount,
      isAvailable: IDB.isIndexedDBAvailable(),
    },
  };
}

/**
 * Save multiple outfits in batch (for hydration)
 * Re-export from indexeddb-storage
 */
export async function saveOutfitsBatch(outfits: StoredOutfit[]): Promise<void> {
  return IDB.saveOutfitsBatch(outfits);
}
