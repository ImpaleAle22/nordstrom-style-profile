/**
 * Lightweight Hydration - Only Product Types
 *
 * Ultra-fast hydration that only copies productType2/3/4.
 * No heavy descriptions, images, or metadata.
 * Can handle 42K outfits without crashing.
 */

import type { StoredOutfit } from '../outfit-storage';
import { openDB } from 'idb';

// Use the correct database name from indexeddb-storage.ts
const DB_NAME = 'recipe-builder-db';
const DB_VERSION = 8;
const OUTFIT_STORE_NAME = 'outfits';

interface ProductTypeData {
  productId: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  productType4?: string;
}

// In-memory product type lookup (lightweight - only 4 fields per product)
let productTypeLookup: Map<string, ProductTypeData> | null = null;

/**
 * Load only product types from lightweight API endpoint
 * Much lighter than loading full product data (95% size reduction)
 */
async function loadProductTypes(): Promise<Map<string, ProductTypeData>> {
  if (productTypeLookup) {
    return productTypeLookup;
  }

  console.log('📦 Loading product types (lightweight API)...');

  try {
    // Fetch from lightweight endpoint (only returns type fields)
    // Add cache-busting timestamp to force fresh data
    const response = await fetch(`/api/product-types?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Failed to load product types: ${response.status}`);
    }

    const productTypes = await response.json();

    // Build lookup map
    productTypeLookup = new Map();
    productTypes.forEach((product: ProductTypeData) => {
      if (product.productId) {
        productTypeLookup!.set(product.productId, product);
      }
    });

    console.log(`✓ Loaded types for ${productTypeLookup.size} products`);
    return productTypeLookup;
  } catch (error) {
    console.error('Failed to load product types:', error);
    throw error;
  }
}

/**
 * Hydrate productType2/3/4 directly in IndexedDB
 * Processes outfits in batches without loading all into memory
 */
export async function hydrateProductTypesInPlace(
  options: {
    onProgress?: (current: number, total: number, updated: number) => void;
    batchSize?: number;
  } = {}
): Promise<{
  totalOutfits: number;
  outfitsUpdated: number;
  fieldsUpdated: number;
}> {
  const { onProgress, batchSize = 100 } = options;

  // Load product types lookup
  const typeLookup = await loadProductTypes();

  // Open IndexedDB to get all keys
  const db = await openDB(DB_NAME, DB_VERSION);

  let totalOutfits = 0;
  let outfitsUpdated = 0;
  let fieldsUpdated = 0;
  let processed = 0;

  // Get all outfit IDs first (lightweight) - in read-only transaction
  const allKeys = await db.getAllKeys(OUTFIT_STORE_NAME);
  totalOutfits = allKeys.length;

  console.log(`🔧 Hydrating product types for ${totalOutfits} outfits...`);

  // Process in batches - open NEW transaction for each batch
  for (let i = 0; i < allKeys.length; i += batchSize) {
    const batchKeys = allKeys.slice(i, i + batchSize);

    // Open a NEW transaction for this batch
    const tx = db.transaction(OUTFIT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OUTFIT_STORE_NAME);

    // Load batch of outfits
    const outfits = await Promise.all(
      batchKeys.map(key => store.get(key))
    );

    // Update each outfit in batch
    for (const outfit of outfits) {
      if (!outfit) continue;

      let outfitHasChanges = false;

      // Check each item
      for (const item of outfit.items) {
        const productTypes = typeLookup.get(item.product.id);

        if (!productTypes) {
          continue; // Product not found in master
        }

        // ALWAYS overwrite ALL product type fields (not just missing)
        // This ensures consistency and fixes any outdated/partial data
        let itemChanged = false;

        // ProductType1
        if (item.product.productType1 !== productTypes.productType1) {
          item.product.productType1 = productTypes.productType1;
          fieldsUpdated++;
          itemChanged = true;
        }

        // ProductType2
        if (item.product.productType2 !== productTypes.productType2) {
          item.product.productType2 = productTypes.productType2;
          fieldsUpdated++;
          itemChanged = true;
        }

        // ProductType3
        if (item.product.productType3 !== productTypes.productType3) {
          item.product.productType3 = productTypes.productType3;
          fieldsUpdated++;
          itemChanged = true;
        }

        // ProductType4
        if (item.product.productType4 !== productTypes.productType4) {
          item.product.productType4 = productTypes.productType4;
          fieldsUpdated++;
          itemChanged = true;
        }

        if (itemChanged) {
          outfitHasChanges = true;
        }
      }

      // Save outfit if changed
      if (outfitHasChanges) {
        await store.put(outfit);
        outfitsUpdated++;
      }

      processed++;
    }

    // Commit this batch's transaction
    await tx.done;

    // Report progress
    if (onProgress) {
      onProgress(processed, totalOutfits, outfitsUpdated);
    }

    // Yield to UI thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  console.log(`✅ Updated ${outfitsUpdated} outfits (${fieldsUpdated} fields)`);

  return {
    totalOutfits,
    outfitsUpdated,
    fieldsUpdated,
  };
}

/**
 * Count how many outfits are missing productType2
 */
export async function countMissingProductTypes(): Promise<{
  totalOutfits: number;
  missingType2: number;
  missingType3: number;
  missingType4: number;
}> {
  const db = await openDB(DB_NAME, DB_VERSION);

  const allOutfits = await db.getAll(OUTFIT_STORE_NAME);

  let missingType2 = 0;
  let missingType3 = 0;
  let missingType4 = 0;

  allOutfits.forEach(outfit => {
    outfit.items.forEach((item: any) => {
      if (!item.product.productType2) missingType2++;
      if (!item.product.productType3) missingType3++;
      if (!item.product.productType4) missingType4++;
    });
  });

  return {
    totalOutfits: allOutfits.length,
    missingType2,
    missingType3,
    missingType4,
  };
}
