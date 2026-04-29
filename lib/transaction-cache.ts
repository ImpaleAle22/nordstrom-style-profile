/**
 * Transaction Data Providers
 *
 * Provides access to transaction data separately from product data.
 * Two implementations:
 * 1. ClientTransactionDataProvider: IndexedDB cache + API fallback (Recipe Builder)
 * 2. ServerTransactionDataProvider: Direct file access (Customer Website - future)
 */

import type { TransactionData } from './outfit-ranking';

// ============================================================================
// Product ID Normalization
// ============================================================================

/**
 * Normalize product ID for transaction data lookup
 *
 * Outfit products may have prefixes like "hm-kaggle-0691507001"
 * Transaction data uses just numeric IDs like "691507001" (no leading zeros)
 *
 * This strips any prefix and extracts just the numeric part, removing leading zeros.
 */
function normalizeProductId(productId: string): string {
  // Strip common prefixes: hm-, hm-kaggle-, kaggle-, etc.
  // Match pattern: optional prefix, then numbers
  const match = productId.match(/(\d{9,})$/);
  if (match) {
    const numericPart = match[1];
    // Remove leading zeros (convert to number and back to string)
    return parseInt(numericPart, 10).toString();
  }

  // If no match, return as-is (might already be normalized)
  return productId;
}

/**
 * Create a lookup map with both original and normalized IDs
 */
function createIdMap(productIds: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const id of productIds) {
    const normalized = normalizeProductId(id);
    map.set(id, normalized);
  }
  return map;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Transaction Data Provider Interface
 */
export interface TransactionDataProvider {
  /**
   * Get transaction data for a single product
   */
  getTransactionData(productId: string): Promise<TransactionData | null>;

  /**
   * Get transaction data for multiple products (batch)
   */
  getTransactionDataBatch(productIds: string[]): Promise<Map<string, TransactionData>>;

  /**
   * Warm the cache (optional - for preloading)
   */
  warmCache?(): Promise<void>;

  /**
   * Get cache statistics (optional - for debugging)
   */
  getCacheStats?(): Promise<{ size: number; coverage: number }>;
}

// ============================================================================
// Client-Side Provider (IndexedDB + API)
// ============================================================================

const TX_CACHE_STORE_NAME = 'transactionData';
const TX_CACHE_DB_NAME = 'recipe-builder-db';
const TX_CACHE_DB_VERSION = 5; // Bumped from 4

/**
 * Client-Side Transaction Data Provider
 *
 * Strategy:
 * 1. Check IndexedDB cache first (fast - <10ms)
 * 2. If not found, fetch from API
 * 3. Cache API results for future use
 */
export class ClientTransactionDataProvider implements TransactionDataProvider {
  private db: IDBDatabase | null = null;
  private warmingPromise: Promise<void> | null = null;

  constructor(private autoWarm = true) {
    if (autoWarm && typeof window !== 'undefined') {
      // Start warming cache in background (non-blocking)
      this.warmingPromise = this.warmCache().catch((err) => {
        console.warn('[TransactionCache] Cache warming failed:', err);
      });
    }
  }

  /**
   * Open IndexedDB connection
   */
  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(TX_CACHE_DB_NAME, TX_CACHE_DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create transaction data store if it doesn't exist
        if (!db.objectStoreNames.contains(TX_CACHE_STORE_NAME)) {
          const store = db.createObjectStore(TX_CACHE_STORE_NAME, { keyPath: 'productId' });
          store.createIndex('productId', 'productId', { unique: true });
          console.log('[TransactionCache] ✓ Created transactionData store (v5)');
        }
      };
    });
  }

  /**
   * Get transaction data for a single product
   */
  async getTransactionData(productId: string): Promise<TransactionData | null> {
    try {
      // Check IndexedDB cache first
      const cached = await this.getCachedData(productId);
      if (cached) return cached;

      // Fetch from API
      const result = await this.fetchFromAPI([productId]);
      return result.get(productId) || null;
    } catch (error) {
      console.error('[TransactionCache] Error getting data:', error);
      return null;
    }
  }

  /**
   * Get transaction data for multiple products (batch)
   */
  async getTransactionDataBatch(productIds: string[]): Promise<Map<string, TransactionData>> {
    const result = new Map<string, TransactionData>();

    try {
      console.log(`[TransactionCache] Batch fetch requested for ${productIds.length} products`);

      // Normalize IDs for lookup
      const idMap = createIdMap(productIds);
      const normalizedIds = Array.from(new Set(idMap.values())); // Unique normalized IDs

      console.log(`[TransactionCache] Normalized ${productIds.length} IDs to ${normalizedIds.length} unique IDs`);
      console.log(`[TransactionCache] Sample: ${productIds[0]} → ${normalizeProductId(productIds[0])}`);

      const startTime = performance.now();

      // Check cache for normalized IDs
      const cacheResults = await this.getCachedDataBatch(normalizedIds);
      const cacheTime = performance.now() - startTime;
      console.log(`[TransactionCache] Cache lookup: ${cacheResults.size}/${normalizedIds.length} found in ${cacheTime.toFixed(0)}ms`);

      // Map cached results back to original IDs
      for (const [originalId, normalizedId] of idMap.entries()) {
        const cached = cacheResults.get(normalizedId);
        if (cached) {
          result.set(originalId, cached);
        }
      }

      // Find missing normalized IDs
      const missing: string[] = [];
      for (const normalizedId of normalizedIds) {
        if (!cacheResults.has(normalizedId)) {
          missing.push(normalizedId);
        }
      }

      // Fetch missing from API
      if (missing.length > 0) {
        console.log(`[TransactionCache] Fetching ${missing.length} missing products from API...`);
        const apiStartTime = performance.now();
        const fetched = await this.fetchFromAPI(missing);
        const apiTime = performance.now() - apiStartTime;
        console.log(`[TransactionCache] API fetch: ${fetched.size}/${missing.length} found in ${apiTime.toFixed(0)}ms`);

        // Map fetched results back to original IDs
        for (const [originalId, normalizedId] of idMap.entries()) {
          if (!result.has(originalId)) {
            const txData = fetched.get(normalizedId);
            if (txData) {
              result.set(originalId, txData);
            }
          }
        }
      }

      const totalTime = performance.now() - startTime;
      console.log(`[TransactionCache] ✓ Batch complete: ${result.size}/${productIds.length} products in ${totalTime.toFixed(0)}ms`);
      return result;
    } catch (error) {
      console.error('[TransactionCache] Error in batch fetch:', error);
      return result; // Return partial results
    }
  }

  /**
   * Get cached data for a single product
   */
  private async getCachedData(productId: string): Promise<TransactionData | null> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([TX_CACHE_STORE_NAME], 'readonly');
        const store = transaction.objectStore(TX_CACHE_STORE_NAME);
        const request = store.get(productId);

        request.onsuccess = () => {
          const cached = request.result;
          resolve(cached ? cached.data : null);
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('[TransactionCache] Cache read error:', error);
      return null;
    }
  }

  /**
   * Get cached data for multiple products
   */
  private async getCachedDataBatch(productIds: string[]): Promise<Map<string, TransactionData>> {
    const result = new Map<string, TransactionData>();

    // Handle empty array case
    if (productIds.length === 0) {
      return result;
    }

    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([TX_CACHE_STORE_NAME], 'readonly');
        const store = transaction.objectStore(TX_CACHE_STORE_NAME);

        let completed = 0;

        for (const productId of productIds) {
          const request = store.get(productId);

          request.onsuccess = () => {
            const cached = request.result;
            if (cached && cached.data) {
              result.set(productId, cached.data);
            }
            completed++;
            if (completed === productIds.length) {
              resolve(result);
            }
          };

          request.onerror = () => {
            completed++;
            if (completed === productIds.length) {
              resolve(result);
            }
          };
        }
      });
    } catch (error) {
      console.error('[TransactionCache] Batch cache read error:', error);
      return result;
    }
  }

  /**
   * Fetch transaction data from API
   * @param productIds - Already normalized product IDs
   */
  private async fetchFromAPI(productIds: string[]): Promise<Map<string, TransactionData>> {
    const result = new Map<string, TransactionData>();

    try {
      // Batch API call (max 100 IDs per request to avoid URL length limits)
      const BATCH_SIZE = 100;
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);
        const idsParam = batch.join(',');

        const response = await fetch(`/api/transaction-data?productIds=${idsParam}`);
        if (!response.ok) {
          console.error('[TransactionCache] API error:', response.statusText);
          continue;
        }

        const json = await response.json();
        if (json.success && json.data) {
          // Cache results with normalized IDs
          await this.cacheDataBatch(json.data);

          // Add to result (productIds are already normalized)
          for (const [productId, txData] of Object.entries(json.data)) {
            if (txData) {
              result.set(productId, txData as TransactionData);
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.error('[TransactionCache] API fetch error:', error);
      return result;
    }
  }

  /**
   * Cache transaction data batch
   */
  private async cacheDataBatch(data: Record<string, TransactionData | null>): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([TX_CACHE_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(TX_CACHE_STORE_NAME);

        for (const [productId, txData] of Object.entries(data)) {
          if (txData) {
            store.put({ productId, data: txData });
          }
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve(); // Don't fail on cache errors
      });
    } catch (error) {
      console.error('[TransactionCache] Cache write error:', error);
    }
  }

  /**
   * Warm cache by loading bulk data from API
   */
  async warmCache(): Promise<void> {
    console.log('[TransactionCache] Starting cache warm...');
    const startTime = performance.now();

    try {
      let offset = 0;
      const limit = 5000; // Load 5K products per request
      let totalLoaded = 0;

      while (true) {
        const response = await fetch(`/api/transaction-data?limit=${limit}&offset=${offset}`);
        if (!response.ok) break;

        const json = await response.json();
        if (!json.success || !json.data) break;

        // Cache batch
        await this.cacheDataBatch(json.data);
        totalLoaded += json.count;

        console.log(`[TransactionCache] Loaded ${totalLoaded} products...`);

        // Check if more data available
        if (json.nextOffset === null) break;
        offset = json.nextOffset;
      }

      const duration = performance.now() - startTime;
      console.log(`[TransactionCache] ✓ Cache warmed: ${totalLoaded} products in ${duration.toFixed(0)}ms`);
    } catch (error) {
      console.error('[TransactionCache] Cache warming failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; coverage: number }> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([TX_CACHE_STORE_NAME], 'readonly');
        const store = transaction.objectStore(TX_CACHE_STORE_NAME);
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          const size = countRequest.result;
          // Coverage = cached / total available (104,547)
          const coverage = (size / 104547) * 100;
          resolve({ size, coverage });
        };

        countRequest.onerror = () => resolve({ size: 0, coverage: 0 });
      });
    } catch (error) {
      return { size: 0, coverage: 0 };
    }
  }
}

// ============================================================================
// Server-Side Provider (Direct File Access)
// ============================================================================

/**
 * Server-Side Transaction Data Provider
 *
 * NOTE: This is exported but should ONLY be used in server-side code.
 * It imports 'fs' which is not available in browser environments.
 * For client-side use, use ClientTransactionDataProvider instead.
 *
 * USAGE: Import this only in API routes or server components:
 * ```typescript
 * // In API route or server component:
 * import { ServerTransactionDataProvider } from '@/lib/transaction-cache-server';
 * ```
 */

// NOTE: ServerTransactionDataProvider moved to separate file to avoid
// bundling server-side code (fs module) into client bundle.
// See: transaction-cache-server.ts
