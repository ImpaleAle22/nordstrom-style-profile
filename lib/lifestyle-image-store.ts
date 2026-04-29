/**
 * Lifestyle Image Storage Layer
 * IndexedDB storage for lifestyle image tags
 */

import type {
  LifestyleImageRecord,
  LifestyleImageStats,
  StylePillar,
  ScanStatus,
} from './lifestyle-image-types';

const DB_NAME = 'lifestyle-image-db';
const DB_VERSION = 1;
const STORE_NAME = 'lifestyleImages';

/**
 * Open or create the IndexedDB database
 */
export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'imageId' });

        // Create indexes
        store.createIndex('source', 'source', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('taggedAt', 'taggedAt', { unique: false });
        store.createIndex('addedAt', 'addedAt', { unique: false });
        store.createIndex('pillar', 'outfitAnalysis.stylePillar', { unique: false });
      }
    };
  });
}

/**
 * Save or update a lifestyle image record
 */
export async function saveImage(image: LifestyleImageRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(image);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get a single lifestyle image by ID
 */
export async function getImage(imageId: string): Promise<LifestyleImageRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(imageId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get all lifestyle images
 */
export async function getAllImages(): Promise<LifestyleImageRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get images by style pillar
 */
export async function getImagesByPillar(pillar: StylePillar): Promise<LifestyleImageRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('pillar');
    const request = index.getAll(pillar);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get images by scan status
 */
export async function getImagesByStatus(status: ScanStatus): Promise<LifestyleImageRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll(status);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete a lifestyle image
 */
export async function deleteImage(imageId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(imageId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get statistics for dashboard
 */
export async function getStats(): Promise<LifestyleImageStats> {
  const images = await getAllImages();

  const stats: LifestyleImageStats = {
    total: images.length,
    byPillar: {},
    byStatus: {},
    styleProfileReady: 0,
    styleQuizReady: 0,
    styleSwipeReady: 0,
  };

  for (const image of images) {
    // Count by pillar
    if (image.outfitAnalysis?.stylePillar) {
      const pillar = image.outfitAnalysis.stylePillar;
      stats.byPillar[pillar] = (stats.byPillar[pillar] || 0) + 1;
    }

    // Count by status
    const status = image.status;
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // Count display suitability
    if (image.displaySuitability?.styleProfileReady) {
      stats.styleProfileReady++;
    }
    if (image.displaySuitability?.styleQuizReady) {
      stats.styleQuizReady++;
    }
    if (image.displaySuitability?.styleSwipeReady) {
      stats.styleSwipeReady++;
    }
  }

  return stats;
}

/**
 * Clear all lifestyle images (for testing/reset)
 */
export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
