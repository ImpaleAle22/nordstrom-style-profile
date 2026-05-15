/**
 * Outfit Tagging V2 - Batch Runner API
 *
 * Product-based batch selection with balanced sampling
 * Routes to v2 tagging pipeline with progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';

// Lazy load heavy imports to prevent blocking on module initialization
let supabase: any = null;
let tagOutfitV2: any = null;

async function getSupabase() {
  if (!supabase) {
    const { supabase: client } = await import('@/lib/supabase-client');
    supabase = client;
  }
  return supabase;
}

async function getTagOutfitV2() {
  if (!tagOutfitV2) {
    const { tagOutfitV2: fn } = await import('@/lib/attribute-tagger-v2');
    tagOutfitV2 = fn;
  }
  return tagOutfitV2;
}

// ============================================================================
// TYPES
// ============================================================================

interface ProductFilter {
  productTypes: string[];
  colors: string[];
  materials: string[];
  patterns: string[];
  denimWashes: string[];
  department: 'all' | 'womens' | 'mens';
  excludeTagged: boolean;
}

interface RunControls {
  mode: 'dry-run' | 'commit' | 'selective-commit';
  batchSize: number;
  balancedBy: 'none' | 'color' | 'productType' | 'pattern' | 'denimWash' | 'material';
  samplesPerGroup: number;
}

interface BatchProgress {
  phase: 'querying' | 'tagging' | 'complete' | 'error';
  current: number;
  total: number;
  percent: number;
  startedAt: string;
  lastUpdatedAt: string;
  results?: {
    successful: number;
    failed: number;
    needsReview: number;
    pillarDistribution: Record<string, number>;
  };
  error?: string;
}

// ============================================================================
// IN-MEMORY STATE
// ============================================================================

const progressMap = new Map<string, BatchProgress>();

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/admin/tagging-v2/run-batch
 * Start v2 tagging batch with product filters
 */
export async function POST(request: NextRequest) {
  console.log('🔵 POST /api/admin/tagging-v2/run-batch called');
  try {
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    const {
      filters,
      runControls,
      sessionId = `batch-v2-${Date.now()}`,
    }: {
      filters: ProductFilter;
      runControls: RunControls;
      sessionId?: string;
    } = body;

    // Initialize progress
    const progress: BatchProgress = {
      phase: 'querying',
      current: 0,
      total: 0,
      percent: 0,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    progressMap.set(sessionId, progress);

    // Start processing in background (wrapped in Promise to truly detach)
    Promise.resolve().then(() => processBatchInBackground(sessionId, filters, runControls));

    return NextResponse.json({
      message: 'Batch started',
      sessionId,
      progress,
    });

  } catch (error: any) {
    console.error('Error starting batch:', error);
    return NextResponse.json({
      error: 'Failed to start batch',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/tagging-v2/run-batch?sessionId=xxx
 * Get progress for a batch
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({
      error: 'Missing sessionId parameter',
    }, { status: 400 });
  }

  const progress = progressMap.get(sessionId);

  if (!progress) {
    return NextResponse.json({
      error: 'Session not found',
      sessionId,
    }, { status: 404 });
  }

  return NextResponse.json({
    sessionId,
    progress,
  });
}

// ============================================================================
// BACKGROUND PROCESSING
// ============================================================================

async function processBatchInBackground(
  sessionId: string,
  filters: ProductFilter,
  runControls: RunControls
) {
  const progress = progressMap.get(sessionId);
  if (!progress) return;

  try {
    // Step 1: Query outfits matching product filters
    progress.phase = 'querying';
    progress.lastUpdatedAt = new Date().toISOString();

    const outfitRows = await queryOutfitsByProductFilters(filters, runControls);

    if (outfitRows.length === 0) {
      progress.phase = 'error';
      progress.error = 'No outfits found matching filters';
      progress.lastUpdatedAt = new Date().toISOString();
      return;
    }

    console.log(`✓ Found ${outfitRows.length} outfits matching filters`);

    // Step 2: Tag each outfit
    progress.phase = 'tagging';
    progress.total = outfitRows.length;
    progress.lastUpdatedAt = new Date().toISOString();

    const results = {
      successful: 0,
      failed: 0,
      needsReview: 0,
      pillarDistribution: {} as Record<string, number>,
    };

    for (let i = 0; i < outfitRows.length; i++) {
      const outfitData = outfitRows[i];

      try {
        // Transform to OutfitInput format (async - fetches product data)
        const outfit = await transformToOutfitInput(outfitData);

        // Validate outfit has required data
        if (!outfit.items || outfit.items.length === 0) {
          console.warn(`Outfit ${outfit.outfitId} has no items, skipping`);
          results.failed++;
          continue;
        }

        // Get current attributes
        const currentAttributes = outfitData.attributes || null;

        // Tag with v2
        const tagOutfitV2Fn = await getTagOutfitV2();
        const tagResult = await tagOutfitV2Fn(outfit, currentAttributes, {
          mode: runControls.mode,
          outfitIds: [], // TODO: handle selective-commit
        });

        if (tagResult.success && tagResult.attributes) {
          results.successful++;

          if (tagResult.attributes.needsReview) {
            results.needsReview++;
          }

          // Track pillar distribution
          const pillar = tagResult.attributes.stylePillar;
          if (pillar) {
            results.pillarDistribution[pillar] = (results.pillarDistribution[pillar] || 0) + 1;
          }

          // If commit mode, write to Supabase
          if (runControls.mode === 'commit') {
            const outfitId = outfitData.outfit_id || outfitData.id;
            const supabaseClient = await getSupabase();
            await supabaseClient
              .from('outfits')
              .update({ attributes: tagResult.attributes })
              .eq('outfit_id', outfitId);
          }
        } else {
          console.error(`Tagging failed for outfit ${outfit.outfitId}:`, tagResult.error);
          results.failed++;
        }

      } catch (error) {
        const outfitId = outfitData.outfit_id || outfitData.id;
        console.error(`Error tagging outfit ${outfitId}:`, error);
        results.failed++;
      }

      // Update progress
      progress.current = i + 1;
      progress.percent = ((i + 1) / outfitRows.length) * 100;
      progress.results = results;
      progress.lastUpdatedAt = new Date().toISOString();
    }

    // Complete
    progress.phase = 'complete';
    progress.percent = 100;
    progress.lastUpdatedAt = new Date().toISOString();
    console.log(`✓ Batch complete: ${results.successful} successful, ${results.failed} failed, ${results.needsReview} needs review`);

  } catch (error: any) {
    console.error('Fatal error in batch processing:', error);
    progress.phase = 'error';
    progress.error = error.message;
    progress.lastUpdatedAt = new Date().toISOString();
  }
}

// ============================================================================
// QUERY BUILDER
// ============================================================================

/**
 * Query outfits by product filters with balanced sampling
 *
 * Strategy:
 * 1. Query products table with filters
 * 2. Get matching product_ids
 * 3. Query outfits containing those product_ids
 * 4. Sample based on balancing strategy
 */
async function queryOutfitsByProductFilters(
  filters: ProductFilter,
  runControls: RunControls
): Promise<any[]> {

  // Step 1: Query products with filters
  const matchingProducts = await queryProducts(filters);

  if (matchingProducts.length === 0) {
    console.log('No products match filters');
    return [];
  }

  console.log(`Found ${matchingProducts.length} products matching filters`);

  // Step 2: Find outfits containing these products
  if (runControls.balancedBy === 'none') {
    // Simple random sampling
    return await findOutfitsWithProducts(matchingProducts, runControls.batchSize, filters.excludeTagged);
  } else {
    // Balanced sampling by product dimension
    return await findOutfitsBalanced(matchingProducts, runControls, filters.excludeTagged);
  }
}

/**
 * Query products table with filters
 *
 * Strategy: Query all products, then filter client-side for AND logic between categories
 */
async function queryProducts(filters: ProductFilter): Promise<any[]> {
  // If no filters selected at all, limit to a reasonable number
  const hasFilters =
    filters.productTypes.length > 0 ||
    filters.colors.length > 0 ||
    filters.materials.length > 0 ||
    filters.patterns.length > 0 ||
    filters.denimWashes.length > 0 ||
    filters.department !== 'all';

  const supabaseClient = await getSupabase();
  let query = supabaseClient
    .from('products')
    .select('product_id, product_type_1, product_type_2, product_type_3, colors, materials, department');

  // Department filter
  if (filters.department !== 'all') {
    query = query.eq('department', filters.department);
  }

  // Fetch products - limit to 1000 if no filters to avoid performance issues
  const limit = hasFilters ? 10000 : 1000;
  const { data, error } = await query.limit(limit);

  if (!hasFilters) {
    console.warn(`⚠️ No filters selected, limiting to ${limit} random products`);
  }

  if (error) {
    console.error('Error querying products:', error);
    throw error;
  }

  let products = data || [];
  console.log(`Fetched ${products.length} products from database`);

  // Apply client-side filters (AND logic between categories)

  // Product types filter
  if (filters.productTypes.length > 0) {
    products = products.filter(p => {
      return filters.productTypes.some(type =>
        p.product_type_1 === type || p.product_type_2 === type || p.product_type_3 === type
      );
    });
    console.log(`After product type filter: ${products.length} products`);
  }

  // Colors filter
  if (filters.colors.length > 0) {
    products = products.filter(p => {
      if (!Array.isArray(p.colors)) return false;
      return filters.colors.some(color => p.colors.includes(color));
    });
    console.log(`After color filter: ${products.length} products`);
  }

  // Materials filter
  if (filters.materials.length > 0) {
    products = products.filter(p => {
      if (!Array.isArray(p.materials)) return false;
      return filters.materials.some(material => p.materials.includes(material));
    });
    console.log(`After material filter: ${products.length} products`);
  }

  // NOTE: Patterns and denim washes filters are disabled because vision_metadata
  // column contains invalid JSON that causes PostgreSQL errors
  // TODO: Clean up vision_metadata column in database
  if (filters.patterns.length > 0) {
    console.warn('⚠️ Pattern filtering is currently disabled (vision_metadata has invalid JSON)');
  }

  if (filters.denimWashes.length > 0) {
    console.warn('⚠️ Denim wash filtering is currently disabled (vision_metadata has invalid JSON)');
  }

  return products;
}

/**
 * Find outfits containing specified products
 * Returns full outfit rows (not just IDs)
 *
 * Uses pagination to work around Supabase 1000 row limit
 */
async function findOutfitsWithProducts(
  products: any[],
  limit: number,
  excludeTagged: boolean
): Promise<any[]> {
  const productIds = products.map(p => p.product_id);
  console.log(`Looking for outfits containing ${productIds.length} product IDs`);

  const matchingOutfits: any[] = [];
  const batchSize = 1000; // Supabase hard limit per query
  let offset = 0;
  let totalFetched = 0;
  // Limit search to avoid hanging - if we need to check more than 3000 outfits,
  // the user probably needs to use more specific filters
  const maxOutfitsToCheck = 3000;

  console.log(`Will search up to ${maxOutfitsToCheck} outfits for matches`);

  // Paginate through outfits until we find enough matches or run out
  while (matchingOutfits.length < limit && totalFetched < maxOutfitsToCheck) {
    const supabaseClient = await getSupabase();
    let query = supabaseClient
      .from('outfits')
      .select('*')
      .range(offset, offset + batchSize - 1);

    const { data: outfits, error } = await query;

    if (error) {
      console.error('Error querying outfits:', error);
      throw error;
    }

    if (!outfits || outfits.length === 0) {
      console.log(`No more outfits to fetch at offset ${offset}`);
      break;
    }

    totalFetched += outfits.length;
    console.log(`Batch ${Math.floor(offset / batchSize) + 1}: Fetched ${outfits.length} outfits (total: ${totalFetched})`);

    // Filter this batch for matches
    let batchMatches = outfits.filter(outfit => {
      const items = outfit.items || [];
      return items.some((item: any) => {
        const itemProductId = item.product?.id || item.product_id;
        return productIds.includes(itemProductId);
      });
    });

    // Apply excludeTagged filter client-side (more reliable than PostgREST JSON queries)
    if (excludeTagged) {
      const beforeFilter = batchMatches.length;
      batchMatches = batchMatches.filter(outfit => {
        const taggerVersion = outfit.attributes?.taggerVersion;
        return taggerVersion !== 'v2';
      });
      const excluded = beforeFilter - batchMatches.length;
      if (excluded > 0) {
        console.log(`  Excluded ${excluded} outfits already tagged with v2`);
      }
    }

    if (batchMatches.length > 0) {
      console.log(`  Found ${batchMatches.length} matches in this batch`);
      matchingOutfits.push(...batchMatches);
    }

    // Stop if we got fewer than batch size (last page)
    if (outfits.length < batchSize) {
      console.log('Reached last page of outfits');
      break;
    }

    offset += batchSize;
  }

  console.log(`Total: Found ${matchingOutfits.length} outfits containing matching products (checked ${totalFetched} total)`);

  if (matchingOutfits.length === 0) {
    console.log('⚠️ No outfits found with these products. Try:');
    console.log('  - Selecting fewer filters (more products = more chance of matches)');
    console.log('  - Different color combinations');
    console.log('  - Just product type filter (no colors)');
  }

  // Random sample from matches
  const shuffled = matchingOutfits.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, limit);
}

/**
 * Find outfits with balanced sampling by product dimension
 */
async function findOutfitsBalanced(
  products: any[],
  runControls: RunControls,
  excludeTagged: boolean
): Promise<any[]> {

  // Group products by the balancing dimension
  const groups = groupProductsByDimension(products, runControls.balancedBy);

  console.log(`Grouped into ${Object.keys(groups).length} ${runControls.balancedBy} groups`);

  const allOutfits: any[] = [];

  // Sample N outfits per group
  for (const [groupValue, groupProducts] of Object.entries(groups)) {
    console.log(`Sampling ${runControls.samplesPerGroup} outfits for ${runControls.balancedBy}="${groupValue}"`);

    const groupOutfits = await findOutfitsWithProducts(
      groupProducts,
      runControls.samplesPerGroup,
      excludeTagged
    );

    console.log(`  Found ${groupOutfits.length} outfits`);
    allOutfits.push(...groupOutfits);
  }

  return allOutfits;
}

/**
 * Group products by dimension
 */
function groupProductsByDimension(
  products: any[],
  dimension: string
): Record<string, any[]> {
  const groups: Record<string, any[]> = {};

  products.forEach(product => {
    let value: string | null = null;

    switch (dimension) {
      case 'color':
        value = Array.isArray(product.colors) && product.colors.length > 0
          ? product.colors[0]
          : null;
        break;
      case 'productType':
        value = product.product_type_1 || null;
        break;
      case 'material':
        value = Array.isArray(product.materials) && product.materials.length > 0
          ? product.materials[0]
          : null;
        break;
      case 'pattern':
        value = product.vision_metadata?.pattern || null;
        break;
      case 'denimWash':
        value = product.vision_metadata?.denimWash || null;
        break;
    }

    if (value) {
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(product);
    }
  });

  return groups;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Transform Supabase outfit row to OutfitInput format
 *
 * NOTE: Outfits store items as { role, product_id, ingredientTitle? }
 * Product data must be fetched separately from products table
 */
async function transformToOutfitInput(outfitData: any): Promise<any> {
  // Collect all product IDs from items
  const productIds = (outfitData.items || [])
    .map((item: any) => item.product_id || item.product?.id)
    .filter(Boolean);

  if (productIds.length === 0) {
    console.warn(`Outfit ${outfitData.outfit_id} has no product IDs`);
    return {
      outfitId: outfitData.outfit_id || outfitData.id,
      recipeTitle: outfitData.recipe_title || outfitData.recipe_id || 'Untitled Recipe',
      items: [],
    };
  }

  // Fetch all products in one query
  const supabaseClient = await getSupabase();
  const { data: products, error } = await supabaseClient
    .from('products')
    .select('product_id, title, brand, colors, department, materials, silhouette, patterns, details, vision_metadata')
    .in('product_id', productIds);

  if (error) {
    console.error(`Error fetching products for outfit ${outfitData.outfit_id}:`, error);
    throw error;
  }

  // Create product lookup map
  const productMap = new Map();
  (products || []).forEach((p: any) => {
    productMap.set(p.product_id, p);
  });

  // Transform items with full product data
  const items = (outfitData.items || [])
    .map((item: any) => {
      const productId = item.product_id || item.product?.id;
      const product = productMap.get(productId);

      if (!product) {
        console.warn(`Product ${productId} not found for outfit ${outfitData.outfit_id}`);
        return null;
      }

      return {
        role: item.role || 'tops',
        ingredientTitle: item.ingredientTitle || product.title || 'Unknown Item',
        product: {
          id: product.product_id,
          title: product.title || 'Unknown Product',
          brand: product.brand || 'Unknown',
          colors: Array.isArray(product.colors) ? product.colors : [],
          department: product.department || 'womens',
          materials: Array.isArray(product.materials) ? product.materials : [],
          silhouette: product.silhouette || product.vision_metadata?.silhouette || null,
          patterns: product.patterns || product.vision_metadata?.pattern || null,
          details: Array.isArray(product.details) ? product.details : [],
        },
      };
    })
    .filter(Boolean); // Remove null items (products not found)

  return {
    outfitId: outfitData.outfit_id || outfitData.id,
    recipeTitle: outfitData.recipe_title || outfitData.recipe_id || 'Untitled Recipe',
    items,
    recipeId: outfitData.recipe_id,
    generatedAt: outfitData.generated_at,
    // Default scoreBreakdown for outfits that don't have one
    // 50 = neutral middle value (will be converted to formality ~3.5)
    scoreBreakdown: outfitData.scoreBreakdown || {
      occasionAlignment: 50,
    },
  };
}
