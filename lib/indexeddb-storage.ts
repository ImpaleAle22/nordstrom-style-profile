/**
 * IndexedDB Storage Wrapper
 * High-capacity storage for outfits AND recipes (100MB+ vs localStorage's 5-10MB)
 */

const DB_NAME = 'recipe-builder-db';
const DB_VERSION = 8; // Bumped to add image gaps store
const OUTFIT_STORE_NAME = 'outfits';
const RECIPE_STORE_NAME = 'recipes';
const RECIPE_STATUS_STORE_NAME = 'recipesStatus';
const PATTERN_CANDIDATES_STORE_NAME = 'patternCandidates';
const TRANSACTION_DATA_STORE_NAME = 'transactionData';
const BATCH_STORE_NAME = 'batches';
const PRODUCT_GAPS_STORE_NAME = 'productGaps';
const IMAGE_GAPS_STORE_NAME = 'imageGaps';

export interface StoredOutfit {
  outfitId: string;
  recipeId: string;
  recipeTitle: string;
  department: string;
  generatedAt: string;
  strategy: string;
  confidenceScore: number;
  qualityScore: number;
  alignmentScore: number;
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
    };
  }>;
  reasoning?: string;
  linkedToRecipe?: boolean;
  attributes?: {
    stylePillar: string | null;
    vibes: string[];
    occasions: string[];
    formality: number;
    confidence: {
      stylePillar: number;
      vibes: number;
      occasions: number;
    };
    taggedAt: string;
    taggedBy: 'ai' | 'rules' | 'hybrid';
    reasoning?: string;
  };
}

export interface RecipeStatus {
  recipeId: string;
  outfitCount: number;         // Total outfits for this recipe
  linkedCount: number;          // Linked outfits
  primaryCount: number;         // Primary tier count
  secondaryCount: number;       // Secondary tier count
  happyAccidentCount: number;   // Happy accident count
  lastCookedAt: string;         // ISO date string
  sessionId: string;            // e.g. "bulk-2026-04-13-001"

  // Pipeline diagnostics
  pipelineStats?: {
    totalGenerated: number;      // How many combinations Gemini generated
    formalityFiltered: number;   // Rejected by formality mismatch
    similarityFiltered: number;  // Rejected by similarity clash
    totalScored: number;         // Passed hard rules, got scored
  };
}

/**
 * Pattern Candidate - High quality outfit that failed formality check
 * Used for Discovery Mode (Phase 2) to automatically suggest new patterns
 */
export interface PatternCandidate {
  candidateId: string;          // Unique ID
  recipeId: string;             // Which recipe was being cooked
  recipeTitle: string;
  detectedAt: string;           // ISO timestamp
  rejectionReason: string;      // Why formality filter rejected it

  // Outfit structure
  items: Array<{
    role: string;
    formality: number;          // 1-6
    product: {
      id: string;
      title: string;
      brand: string;
      productType2?: string;
    };
  }>;

  // Scores (predicted - outfit wasn't scored since it failed formality)
  estimatedQuality?: number;    // If we have pre-scoring heuristics

  // Pattern discovery metadata
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'duplicate';
  suggestedPatternId?: string;  // If auto-grouped into a pattern suggestion
  notes?: string;
}

/**
 * Batch - Group of recipes created together (e.g., from vision import)
 * Enables bulk operations and filtering
 */
export interface Batch {
  batchId: string;              // Unique ID (e.g., "batch-2026-04-20-001")
  createdAt: string;            // ISO timestamp
  source: 'ai-vision' | 'manual' | 'import' | 'api';
  recipeCount: number;          // How many recipes in this batch
  label?: string;               // User-friendly label (e.g., "Spring Collection Import")
  description?: string;         // Optional description

  // Stats
  totalOutfits?: number;        // Total outfits generated from batch recipes
  cookedCount?: number;         // How many recipes have been cooked

  // Metadata
  department?: string;          // If all recipes are same department
  imageCount?: number;          // For vision imports: how many photos processed
}

/**
 * Product Gap - Missing product detected during recipe cooking
 * Tracks which products are most needed in the catalog
 */
export interface ProductGap {
  gapId: string;                // Unique ID (hash of query + filters)
  ingredientTitle: string;      // What ingredient was being searched for
  searchQuery: string;          // Actual search query that returned 0 results
  role: string;                 // Outfit role (tops, bottoms, shoes, etc.)
  frequency: number;            // How many times this gap has been seen
  lastSeen: string;             // ISO timestamp of most recent occurrence
  firstSeen: string;            // ISO timestamp of first occurrence

  // Recipe references - which recipes need this product
  recipeReferences: Array<{
    recipeId: string;
    recipeTitle: string;
    cookedAt: string;
  }>;

  // Product specification (what filters were used)
  productType1?: string[];
  productType2?: string[];
  materials?: string[];
  colors?: string[];
  department?: string;

  // Gap status
  status: 'active' | 'resolved' | 'ignored';
  resolvedAt?: string;          // When gap was marked resolved
  notes?: string;               // User notes about this gap
}

/**
 * Image Gap - Product exists but has no displayable image
 * Different from Product Gap (which tracks missing products)
 */
export interface ImageGap {
  gapId: string;                // Unique ID (productId)
  productId: string;            // Product that needs an image
  productTitle: string;         // Product name
  brand?: string;
  department?: string;
  productType1?: string;
  productType2?: string;
  frequency: number;            // How many times it would have been used
  firstSeen: string;            // When first detected
  lastSeen: string;             // Most recent detection
  status: 'active' | 'resolved' | 'ignored';
  notes?: string;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create outfit store if it doesn't exist
      if (!db.objectStoreNames.contains(OUTFIT_STORE_NAME)) {
        const objectStore = db.createObjectStore(OUTFIT_STORE_NAME, { keyPath: 'outfitId' });

        // Create indexes for efficient querying
        objectStore.createIndex('recipeId', 'recipeId', { unique: false });
        objectStore.createIndex('poolTier', 'poolTier', { unique: false });
        objectStore.createIndex('generatedAt', 'generatedAt', { unique: false });
        objectStore.createIndex('qualityScore', 'qualityScore', { unique: false });

        console.log('✓ Created IndexedDB outfit store with indexes');
      }

      // Create recipe store if it doesn't exist
      if (!db.objectStoreNames.contains(RECIPE_STORE_NAME)) {
        const recipeStore = db.createObjectStore(RECIPE_STORE_NAME, { keyPath: 'id' });

        // Create indexes for efficient querying
        recipeStore.createIndex('type', 'type', { unique: false });
        recipeStore.createIndex('department', 'department', { unique: false });
        recipeStore.createIndex('createdAt', 'createdAt', { unique: false });

        console.log('✓ Created IndexedDB recipe store with indexes');
      }

      // Create recipe status store if it doesn't exist
      if (!db.objectStoreNames.contains(RECIPE_STATUS_STORE_NAME)) {
        const statusStore = db.createObjectStore(RECIPE_STATUS_STORE_NAME, { keyPath: 'recipeId' });

        // Create indexes for efficient querying
        statusStore.createIndex('sessionId', 'sessionId', { unique: false });
        statusStore.createIndex('lastCookedAt', 'lastCookedAt', { unique: false });
        statusStore.createIndex('outfitCount', 'outfitCount', { unique: false });

        console.log('✓ Created IndexedDB recipe status store with indexes');
      }

      // Create pattern candidates store if it doesn't exist (Phase 2: Discovery Mode)
      if (!db.objectStoreNames.contains(PATTERN_CANDIDATES_STORE_NAME)) {
        const candidatesStore = db.createObjectStore(PATTERN_CANDIDATES_STORE_NAME, { keyPath: 'candidateId' });

        // Create indexes for efficient querying
        candidatesStore.createIndex('recipeId', 'recipeId', { unique: false });
        candidatesStore.createIndex('reviewStatus', 'reviewStatus', { unique: false });
        candidatesStore.createIndex('detectedAt', 'detectedAt', { unique: false });
        candidatesStore.createIndex('suggestedPatternId', 'suggestedPatternId', { unique: false });

        console.log('✓ Created IndexedDB pattern candidates store with indexes');
      }

      // Create transaction data cache store if it doesn't exist (Phase 3d: Ranking Architecture)
      if (!db.objectStoreNames.contains(TRANSACTION_DATA_STORE_NAME)) {
        const txDataStore = db.createObjectStore(TRANSACTION_DATA_STORE_NAME, { keyPath: 'productId' });

        // Create index for product ID lookup
        txDataStore.createIndex('productId', 'productId', { unique: true });

        console.log('✓ Created IndexedDB transaction data store with indexes');
      }

      // Create batches store if it doesn't exist (Batch System)
      if (!db.objectStoreNames.contains(BATCH_STORE_NAME)) {
        const batchStore = db.createObjectStore(BATCH_STORE_NAME, { keyPath: 'batchId' });

        // Create indexes for efficient querying
        batchStore.createIndex('createdAt', 'createdAt', { unique: false });
        batchStore.createIndex('source', 'source', { unique: false });
        batchStore.createIndex('department', 'department', { unique: false });

        console.log('✓ Created IndexedDB batches store with indexes');
      }

      // Create product gaps store if it doesn't exist (Phase 3: Recipe Precision System)
      if (!db.objectStoreNames.contains(PRODUCT_GAPS_STORE_NAME)) {
        const gapsStore = db.createObjectStore(PRODUCT_GAPS_STORE_NAME, { keyPath: 'gapId' });

        // Create indexes for efficient querying
        gapsStore.createIndex('frequency', 'frequency', { unique: false });
        gapsStore.createIndex('lastSeen', 'lastSeen', { unique: false });
        gapsStore.createIndex('role', 'role', { unique: false });
        gapsStore.createIndex('status', 'status', { unique: false });

        console.log('✓ Created IndexedDB product gaps store with indexes');
      }

      // Create image gaps store if it doesn't exist (Phase 3: Image Gap Tracking)
      if (!db.objectStoreNames.contains(IMAGE_GAPS_STORE_NAME)) {
        const imageGapsStore = db.createObjectStore(IMAGE_GAPS_STORE_NAME, { keyPath: 'gapId' });

        // Create indexes for efficient querying
        imageGapsStore.createIndex('productId', 'productId', { unique: false });
        imageGapsStore.createIndex('frequency', 'frequency', { unique: false });
        imageGapsStore.createIndex('lastSeen', 'lastSeen', { unique: false });
        imageGapsStore.createIndex('status', 'status', { unique: false });
        imageGapsStore.createIndex('department', 'department', { unique: false });

        console.log('✓ Created IndexedDB image gaps store with indexes');
      }
    };
  });
}

/**
 * Save a single outfit to IndexedDB
 */
export async function saveOutfit(outfit: StoredOutfit): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);
    const request = store.put(outfit);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save outfit'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Save multiple outfits in a single transaction (much faster)
 */
export async function saveOutfitsBatch(outfits: StoredOutfit[]): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);

    let completed = 0;
    let failed = 0;

    for (const outfit of outfits) {
      const request = store.put(outfit);

      request.onsuccess = () => {
        completed++;
      };

      request.onerror = () => {
        failed++;
        console.error(`Failed to save outfit ${outfit.outfitId}`);
      };
    }

    transaction.oncomplete = () => {
      db.close();
      console.log(`✓ Batch saved ${completed} outfits (${failed} failed)`);
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Batch save transaction failed'));
    };
  });
}

/**
 * Get all outfits from IndexedDB
 */
export async function getAllOutfits(): Promise<StoredOutfit[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readonly');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve outfits'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get outfits by recipeId
 */
export async function getOutfitsByRecipe(recipeId: string): Promise<StoredOutfit[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readonly');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);
    const index = store.index('recipeId');
    const request = index.getAll(recipeId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve outfits by recipe'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get outfits by pool tier
 */
export async function getOutfitsByTier(tier: 'primary' | 'secondary' | 'suppressed' | 'happy-accident'): Promise<StoredOutfit[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readonly');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);
    const index = store.index('poolTier');
    const request = index.getAll(tier);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve outfits by tier'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a single outfit
 */
export async function deleteOutfit(outfitId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);
    const request = store.delete(outfitId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete outfit'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete all outfits for a recipe
 */
export async function deleteOutfitsByRecipe(recipeId: string): Promise<void> {
  const outfits = await getOutfitsByRecipe(recipeId);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);

    for (const outfit of outfits) {
      store.delete(outfit.outfitId);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to delete outfits by recipe'));
    };
  });
}

/**
 * Clear all outfits
 */
export async function clearAllOutfits(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear outfits'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get outfit count (fast)
 */
export async function getOutfitCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readonly');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count outfits'));
    };

    transaction.oncomplete = () => db.close();
  });
}


/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Update outfit attributes (for batch tagging)
 */
export async function updateOutfitAttributes(
  outfitId: string,
  attributes: any
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OUTFIT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OUTFIT_STORE_NAME);

    // Get existing outfit
    const getRequest = store.get(outfitId);

    getRequest.onsuccess = () => {
      const outfit = getRequest.result;
      if (outfit) {
        outfit.attributes = attributes;

        const putRequest = store.put(outfit);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update outfit attributes'));
      } else {
        reject(new Error('Outfit not found'));
      }
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get outfit'));
    };

    transaction.oncomplete = () => db.close();
  });
}

// ============================================================================
// RECIPE STORAGE
// ============================================================================

/**
 * Save multiple recipes in a single transaction (much faster)
 */
/**
 * Strip base64-encoded images from recipe to save space
 * Base64 images can be 4+ MB each and bloat IndexedDB
 */
function stripBase64Images(recipe: any): any {
  if (!recipe.aiMetadata?.sourceImageUrl) return recipe;

  const cleaned = { ...recipe };

  if (cleaned.aiMetadata.sourceImageUrl.startsWith('data:image')) {
    // Keep the data URL prefix but strip the actual base64 data
    const prefix = cleaned.aiMetadata.sourceImageUrl.split(',')[0];
    cleaned.aiMetadata = {
      ...cleaned.aiMetadata,
      sourceImageUrl: prefix + ',<base64-stripped-for-storage>'
    };
  }

  return cleaned;
}

export async function saveRecipesBatch(recipes: any[]): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECIPE_STORE_NAME);

    let completed = 0;
    let failed = 0;
    let stripped = 0;

    for (const recipe of recipes) {
      // Strip base64 images before saving
      const cleanedRecipe = stripBase64Images(recipe);
      if (cleanedRecipe !== recipe) stripped++;

      const request = store.put(cleanedRecipe);

      request.onsuccess = () => {
        completed++;
      };

      request.onerror = () => {
        failed++;
        console.error(`Failed to save recipe ${recipe.id}`);
      };
    }

    transaction.oncomplete = () => {
      db.close();
      console.log(`✓ Batch saved ${completed} recipes (${failed} failed, ${stripped} had base64 images stripped)`);
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Batch save transaction failed'));
    };
  });
}

/**
 * Get all recipes from IndexedDB
 */
export async function getAllRecipes(): Promise<any[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(RECIPE_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve recipes'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Save a single recipe
 */
export async function saveRecipe(recipe: any): Promise<void> {
  const db = await openDB();

  // Strip base64 images before saving
  const cleanedRecipe = stripBase64Images(recipe);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECIPE_STORE_NAME);
    const request = store.put(cleanedRecipe);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save recipe'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(recipeId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECIPE_STORE_NAME);
    const request = store.delete(recipeId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete recipe'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get recipe count (fast)
 */
export async function getRecipeCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(RECIPE_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count recipes'));
    };

    transaction.oncomplete = () => db.close();
  });
}

// ============================================================================
// RECIPE STATUS TRACKING
// ============================================================================

/**
 * Generate a unique session ID for bulk cooking
 * Format: "bulk-YYYY-MM-DD-NNN" (e.g. "bulk-2026-04-13-001")
 */
export function generateSessionId(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.getTime().toString().slice(-3); // Last 3 digits of timestamp
  return `bulk-${dateStr}-${timeStr}`;
}

/**
 * Get outfit counts for a recipe (by querying outfits store)
 */
export async function getOutfitCountsByRecipe(recipeId: string): Promise<{
  total: number;
  linked: number;
  primary: number;
  secondary: number;
  happyAccident: number;
}> {
  const outfits = await getOutfitsByRecipe(recipeId);

  const linked = outfits.filter(o => o.linkedToRecipe !== false).length;
  const primary = outfits.filter(o => o.poolTier === 'primary').length;
  const secondary = outfits.filter(o => o.poolTier === 'secondary').length;
  const happyAccident = outfits.filter(o => o.poolTier === 'happy-accident').length;

  return {
    total: outfits.length,
    linked,
    primary,
    secondary,
    happyAccident,
  };
}

/**
 * Save or update recipe status
 */
export async function saveRecipeStatus(status: RecipeStatus): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STATUS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECIPE_STATUS_STORE_NAME);
    const request = store.put(status);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save recipe status'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get recipe status by ID
 */
export async function getRecipeStatus(recipeId: string): Promise<RecipeStatus | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STATUS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(RECIPE_STATUS_STORE_NAME);
    const request = store.get(recipeId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get recipe status'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all recipe statuses
 */
export async function getAllRecipeStatuses(): Promise<RecipeStatus[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STATUS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(RECIPE_STATUS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all recipe statuses'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete recipe status
 */
export async function deleteRecipeStatus(recipeId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECIPE_STATUS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(RECIPE_STATUS_STORE_NAME);
    const request = store.delete(recipeId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete recipe status'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update recipe status after cooking (convenience function)
 */
export async function updateRecipeStatusAfterCooking(
  recipeId: string,
  sessionId: string,
  pipelineStats?: {
    totalGenerated: number;
    formalityFiltered: number;
    similarityFiltered: number;
    totalScored: number;
  }
): Promise<void> {
  const counts = await getOutfitCountsByRecipe(recipeId);

  const status: RecipeStatus = {
    recipeId,
    outfitCount: counts.total,
    linkedCount: counts.linked,
    primaryCount: counts.primary,
    secondaryCount: counts.secondary,
    happyAccidentCount: counts.happyAccident,
    lastCookedAt: new Date().toISOString(),
    sessionId,
    pipelineStats,
  };

  await saveRecipeStatus(status);
}

// ============================================================================
// PATTERN CANDIDATES (Phase 2: Discovery Mode)
// ============================================================================

/**
 * Save a pattern candidate (outfit that failed formality but might be valid)
 */
export async function savePatternCandidate(candidate: PatternCandidate): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);
    const request = store.put(candidate);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save pattern candidate'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all pattern candidates
 */
export async function getAllPatternCandidates(): Promise<PatternCandidate[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve pattern candidates'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get pattern candidates by review status
 */
export async function getPatternCandidatesByStatus(
  status: 'pending' | 'approved' | 'rejected' | 'duplicate'
): Promise<PatternCandidate[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);
    const index = store.index('reviewStatus');
    const request = index.getAll(status);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve pattern candidates by status'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get pattern candidates by suggested pattern ID
 */
export async function getPatternCandidatesByPatternId(patternId: string): Promise<PatternCandidate[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);
    const index = store.index('suggestedPatternId');
    const request = index.getAll(patternId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve pattern candidates by pattern ID'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update pattern candidate review status
 */
export async function updatePatternCandidateStatus(
  candidateId: string,
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'duplicate',
  notes?: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);

    // Get existing candidate
    const getRequest = store.get(candidateId);

    getRequest.onsuccess = () => {
      const candidate = getRequest.result;
      if (candidate) {
        candidate.reviewStatus = reviewStatus;
        if (notes) candidate.notes = notes;

        const putRequest = store.put(candidate);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update candidate'));
      } else {
        reject(new Error('Candidate not found'));
      }
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get candidate'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete pattern candidate
 */
export async function deletePatternCandidate(candidateId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);
    const request = store.delete(candidateId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete pattern candidate'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear all pattern candidates
 */
export async function clearAllPatternCandidates(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear pattern candidates'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get pattern candidate count
 */
export async function getPatternCandidateCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PATTERN_CANDIDATES_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PATTERN_CANDIDATES_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count pattern candidates'));
    };

    transaction.oncomplete = () => db.close();
  });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Create a new batch
 */
export async function createBatch(batch: Batch): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(BATCH_STORE_NAME);
    const request = store.add(batch);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to create batch'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get a single batch
 */
export async function getBatch(batchId: string): Promise<Batch | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE_NAME], 'readonly');
    const store = transaction.objectStore(BATCH_STORE_NAME);
    const request = store.get(batchId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get batch'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all batches (sorted by createdAt DESC)
 */
export async function getAllBatches(): Promise<Batch[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE_NAME], 'readonly');
    const store = transaction.objectStore(BATCH_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const batches = request.result || [];
      // Sort by createdAt descending (newest first)
      batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(batches);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all batches'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update a batch
 */
export async function updateBatch(batch: Batch): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(BATCH_STORE_NAME);
    const request = store.put(batch);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to update batch'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a batch
 */
export async function deleteBatch(batchId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(BATCH_STORE_NAME);
    const request = store.delete(batchId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete batch'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get batch count
 */
export async function getBatchCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE_NAME], 'readonly');
    const store = transaction.objectStore(BATCH_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count batches'));
    };

    transaction.oncomplete = () => db.close();
  });
}

// ============================================================================
// PRODUCT GAPS (Phase 3: Recipe Precision System)
// ============================================================================

/**
 * Record a product gap or increment frequency if it already exists
 */
export async function recordProductGap(gap: Omit<ProductGap, 'frequency' | 'firstSeen'>): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);

    // Try to get existing gap
    const getRequest = store.get(gap.gapId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;

      if (existing) {
        // Increment frequency and update references
        existing.frequency += 1;
        existing.lastSeen = gap.lastSeen;

        // Merge recipe references (avoid duplicates)
        const newRefs = gap.recipeReferences.filter(
          newRef => !existing.recipeReferences.some(
            existingRef => existingRef.recipeId === newRef.recipeId
          )
        );
        existing.recipeReferences.push(...newRefs);

        const putRequest = store.put(existing);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update product gap'));
      } else {
        // Create new gap
        const newGap: ProductGap = {
          ...gap,
          frequency: 1,
          firstSeen: gap.lastSeen,
        };

        const addRequest = store.add(newGap);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(new Error('Failed to record product gap'));
      }
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get product gap'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all product gaps
 */
export async function getAllProductGaps(): Promise<ProductGap[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all product gaps'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get product gaps by status
 */
export async function getProductGapsByStatus(status: 'active' | 'resolved' | 'ignored'): Promise<ProductGap[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);
    const index = store.index('status');
    const request = index.getAll(status);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get product gaps by status'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get product gaps by role
 */
export async function getProductGapsByRole(role: string): Promise<ProductGap[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);
    const index = store.index('role');
    const request = index.getAll(role);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get product gaps by role'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update product gap status
 */
export async function updateProductGapStatus(
  gapId: string,
  status: 'active' | 'resolved' | 'ignored',
  notes?: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);

    const getRequest = store.get(gapId);

    getRequest.onsuccess = () => {
      const gap = getRequest.result;
      if (gap) {
        gap.status = status;
        if (notes !== undefined) gap.notes = notes;
        if (status === 'resolved') {
          gap.resolvedAt = new Date().toISOString();
        }

        const putRequest = store.put(gap);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update product gap'));
      } else {
        reject(new Error('Product gap not found'));
      }
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get product gap'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a product gap
 */
export async function deleteProductGap(gapId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);
    const request = store.delete(gapId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete product gap'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear all product gaps
 */
export async function clearAllProductGaps(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear product gaps'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get product gap count
 */
export async function getProductGapCount(status?: 'active' | 'resolved' | 'ignored'): Promise<number> {
  if (status) {
    const gaps = await getProductGapsByStatus(status);
    return gaps.length;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRODUCT_GAPS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PRODUCT_GAPS_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count product gaps'));
    };

    transaction.oncomplete = () => db.close();
  });
}

// ============================================================================
// IMAGE GAPS (Phase 3: Image Gap Tracking)
// ============================================================================

/**
 * Save or update an image gap
 */
export async function saveImageGap(gap: ImageGap): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);
    const request = store.put(gap);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save image gap'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Bulk save image gaps
 */
export async function saveImageGapsBatch(gaps: ImageGap[]): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);

    let completed = 0;
    let failed = 0;

    for (const gap of gaps) {
      const request = store.put(gap);

      request.onsuccess = () => {
        completed++;
      };

      request.onerror = () => {
        failed++;
        console.error(`Failed to save image gap ${gap.gapId}`);
      };
    }

    transaction.oncomplete = () => {
      db.close();
      if (failed > 0) {
        console.warn(`✓ Saved ${completed} image gaps (${failed} failed)`);
      } else {
        console.log(`✓ Saved ${completed} image gaps`);
      }
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Batch save image gaps transaction failed'));
    };
  });
}

/**
 * Get all image gaps
 */
export async function getAllImageGaps(): Promise<ImageGap[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all image gaps'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get image gaps by status
 */
export async function getImageGapsByStatus(status: 'active' | 'resolved' | 'ignored'): Promise<ImageGap[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);
    const index = store.index('status');
    const request = index.getAll(status);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get image gaps by status'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update image gap status
 */
export async function updateImageGapStatus(
  gapId: string,
  status: 'active' | 'resolved' | 'ignored',
  notes?: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);

    const getRequest = store.get(gapId);

    getRequest.onsuccess = () => {
      const gap = getRequest.result;
      if (gap) {
        gap.status = status;
        if (notes !== undefined) gap.notes = notes;

        const putRequest = store.put(gap);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update image gap'));
      } else {
        reject(new Error('Image gap not found'));
      }
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get image gap'));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete an image gap
 */
export async function deleteImageGap(gapId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);
    const request = store.delete(gapId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete image gap'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear all image gaps
 */
export async function clearAllImageGaps(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear image gaps'));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get image gap count
 */
export async function getImageGapCount(status?: 'active' | 'resolved' | 'ignored'): Promise<number> {
  if (status) {
    const gaps = await getImageGapsByStatus(status);
    return gaps.length;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_GAPS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(IMAGE_GAPS_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count image gaps'));
    };

    transaction.oncomplete = () => db.close();
  });
}

// ============================================================================
// EXPORT/IMPORT (Master Files Sync)
// ============================================================================

/**
 * Export all recipes to JSON file (browser download)
 * Use this to backup recipes or export to master file
 * Strips base64 images to keep file size manageable
 */
export async function exportRecipesToJSON(): Promise<void> {
  if (typeof window === 'undefined') return;

  const recipes = await getAllRecipes();

  // Strip base64 images from recipes (they bloat the file from 1 MB to 826 MB!)
  const cleanedRecipes = recipes.map(recipe => {
    const cleaned = { ...recipe };

    // Remove base64-encoded images from aiMetadata.sourceImageUrl
    if (cleaned.aiMetadata?.sourceImageUrl?.startsWith('data:image')) {
      cleaned.aiMetadata = {
        ...cleaned.aiMetadata,
        sourceImageUrl: cleaned.aiMetadata.sourceImageUrl.split(',')[0] + ',<base64-data-stripped>'
      };
    }

    return cleaned;
  });

  console.log(`Stripped base64 images from ${recipes.length} recipes for export`);

  // Export cleaned recipes - chunk if needed
  let dataBlob: Blob;
  try {
    // Try compact JSON first (no formatting)
    const dataStr = JSON.stringify(cleanedRecipes);
    dataBlob = new Blob([dataStr], { type: 'application/json' });
  } catch (error) {
    // If that fails, chunk the data by creating JSON for each recipe separately
    console.log('Dataset too large for single stringify, chunking...');
    const chunks: string[] = ['['];

    for (let i = 0; i < cleanedRecipes.length; i++) {
      const recipeJson = JSON.stringify(cleanedRecipes[i]);
      chunks.push(recipeJson);
      if (i < cleanedRecipes.length - 1) {
        chunks.push(',');
      }
    }
    chunks.push(']');

    dataBlob = new Blob(chunks, { type: 'application/json' });
  }

  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `recipes-export-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✓ Exported ${recipes.length} recipes to JSON file (base64 images stripped)`);
}

/**
 * Import recipes from JSON file
 * Merges with existing recipes (doesn't overwrite by ID)
 */
export async function importRecipesFromJSON(jsonData: any[]): Promise<number> {
  if (typeof window === 'undefined') return 0;

  const existing = await getAllRecipes();
  const existingIds = new Set(existing.map((r: any) => r.id));

  // Only import recipes that don't already exist
  const newRecipes = jsonData.filter((r) => !existingIds.has(r.id));

  if (newRecipes.length > 0) {
    try {
      await saveRecipesBatch(newRecipes);
      console.log(`✓ Imported ${newRecipes.length} new recipes to IndexedDB`);
      return newRecipes.length;
    } catch (e) {
      console.error('Failed to import recipes:', e);
      throw e;
    }
  }

  return 0;
}
