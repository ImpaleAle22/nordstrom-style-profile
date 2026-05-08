/**
 * Supabase Outfit Storage
 * Replaces IndexedDB with PostgreSQL queries
 * Maintains same interface as outfit-storage.ts for compatibility
 */

import { supabase } from './supabase-client';
import type { StoredOutfit } from './outfit-storage';

/**
 * Get all outfits (with optional pagination)
 */
export async function getAllOutfits(options?: {
  offset?: number;
  limit?: number;
}): Promise<StoredOutfit[]> {
  try {
    const offset = options?.offset || 0;
    const limit = options?.limit || 1000;

    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    console.log(`Loaded ${data?.length || 0} outfits (offset: ${offset}, limit: ${limit})`);

    // Transform from snake_case to camelCase
    const outfits = (data || []).map(transformFromSupabase);

    // Enrich with current product data
    return await enrichOutfitsWithProductData(outfits);
  } catch (error) {
    console.error('Failed to fetch outfits from Supabase:', error);
    return [];
  }
}

/**
 * Get best image URL from product, prioritizing flat-lay over lifestyle/studio shots
 */
function getBestImageUrl(product: any): string {
  // Priority 1: Look for primary-flat-lay or flat-lay in images array
  if (product.images && Array.isArray(product.images)) {
    const flatLay = product.images.find(
      (img: any) => img.type === 'primary-flat-lay' || img.type === 'flat-lay'
    );
    if (flatLay?.url) return flatLay.url;
  }

  // Priority 2: Use r2_image_url (usually flat-lay for older products)
  if (product.r2_image_url) return product.r2_image_url;

  // Priority 3: Fallback to image_url (might be detail shot or lifestyle)
  if (product.image_url) return product.image_url;

  return ''; // No image available
}

/**
 * Enrich outfits with current product data from Supabase
 * Handles both old format (embedded product objects) and new format (product_id only)
 */
async function enrichOutfitsWithProductData(outfits: StoredOutfit[]): Promise<StoredOutfit[]> {
  try {
    // Extract all unique product IDs from all outfits
    const productIds = new Set<string>();
    outfits.forEach(outfit => {
      outfit.items.forEach(item => {
        // Handle both formats:
        // New: { role: "tops", product_id: "uuid" }
        // Old: { role: "tops", product: { id: "uuid", ... } }
        const productId = item.product_id || item.product?.id;
        if (productId) {
          productIds.add(productId);
        }
      });
    });

    if (productIds.size === 0) return outfits;

    console.log(`Fetching ${productIds.size} products to enrich outfit data...`);

    // Batch fetch using product_id (original IDs) instead of id (UUIDs)
    const productIdsArray = Array.from(productIds);
    const chunkSize = 50; // Can use larger chunks now
    const allProducts = [];

    for (let i = 0; i < productIdsArray.length; i += chunkSize) {
      const chunk = productIdsArray.slice(i, i + chunkSize);

      try {
        const { data: products, error } = await supabase
          .from('products')
          .select('id, product_id, image_url, r2_image_url, images, title, brand, price, department')
          .in('product_id', chunk); // Query by product_id field, not id!

        if (error) {
          console.error(`Failed to fetch products batch ${i}-${i+chunk.length}:`, error);
          continue;
        }

        if (products && products.length > 0) {
          console.log(`✓ Batch ${Math.floor(i / chunkSize) + 1}: Fetched ${products.length}/${chunk.length} products`);
          allProducts.push(...products);
        }
      } catch (err) {
        console.error(`Error fetching batch ${i}:`, err);
      }
    }

    console.log(`✓ Total products fetched: ${allProducts.length}/${productIds.size}`);

    if (allProducts.length === 0) {
      console.error('No products fetched for enrichment');
      return outfits;
    }

    // Create lookup map: product_id (original ID) -> current product data
    const productMap = new Map();
    allProducts.forEach(p => {
      productMap.set(p.product_id, { // Use product_id as key (not UUID id)
        id: p.product_id, // Keep original ID for compatibility
        title: p.title,
        brand: p.brand,
        price: p.price,
        department: p.department,
        imageUrl: getBestImageUrl(p), // Prioritize flat-lay images
      });
    });

    // Enrich each outfit's items with product data
    const enrichedOutfits = outfits.map(outfit => ({
      ...outfit,
      items: outfit.items.map(item => {
        const productId = item.product_id || item.product?.id;
        const currentProduct = productMap.get(productId);

        if (currentProduct) {
          // Return item with full product object (for backward compatibility with UI)
          return {
            role: item.role,
            product: currentProduct,
            ingredientTitle: item.ingredientTitle,
          };
        }

        // If product not found, keep original structure
        return item;
      })
    }));

    console.log(`✓ Enriched ${outfits.length} outfits with current product data`);
    return enrichedOutfits;

  } catch (error) {
    console.error('Error enriching outfits:', error);
    return outfits; // Return original outfits on error
  }
}

/**
 * Get outfits by recipe
 */
export async function getOutfitsByRecipe(recipeId: string): Promise<StoredOutfit[]> {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('generated_at', { ascending: false });

    if (error) throw error;

    const outfits = (data || []).map(transformFromSupabase);
    return await enrichOutfitsWithProductData(outfits);
  } catch (error) {
    console.error('Failed to fetch outfits by recipe:', error);
    return [];
  }
}

/**
 * Get outfits by pool tier
 */
export async function getOutfitsByTier(tier: 'primary' | 'secondary' | 'suppressed' | 'happy-accident'): Promise<StoredOutfit[]> {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('pool_tier', tier)
      .order('quality_score', { ascending: false });

    if (error) throw error;

    const outfits = (data || []).map(transformFromSupabase);
    return await enrichOutfitsWithProductData(outfits);
  } catch (error) {
    console.error('Failed to fetch outfits by tier:', error);
    return [];
  }
}

/**
 * Save outfits from cooking result
 */
export async function saveOutfits(
  recipeId: string,
  recipeTitle: string,
  department: string,
  strategy: string,
  outfits: any[]
): Promise<void> {
  try {
    const newOutfits = outfits.map((outfit, idx) => {
      const outfitId = `${recipeId}_${Date.now()}_${idx}`;

      return {
        outfit_id: outfitId,
        recipe_id: recipeId,
        recipe_title: recipeTitle,
        department,
        strategy,
        quality_score: outfit.qualityScore,
        alignment_score: outfit.alignmentScore,
        confidence_score: outfit.confidenceScore || outfit.qualityScore,
        pool_tier: outfit.poolTier,
        score_breakdown: outfit.scoreBreakdown,
        items: outfit.items,
        reasoning: outfit.reasoning,
        linked_to_recipe: outfit.linkedToRecipe || false,
        attributes: outfit.attributes || null,
        generated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('outfits')
      .insert(newOutfits);

    if (error) throw error;

    console.log(`✓ Saved ${newOutfits.length} outfits to Supabase`);
  } catch (error) {
    console.error('Failed to save outfits to Supabase:', error);
    throw error;
  }
}

/**
 * Delete an outfit
 */
export async function deleteOutfit(outfitId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('outfits')
      .delete()
      .eq('outfit_id', outfitId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete outfit:', error);
    throw error;
  }
}

/**
 * Delete all outfits for a recipe
 */
export async function deleteOutfitsByRecipe(recipeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('outfits')
      .delete()
      .eq('recipe_id', recipeId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete outfits by recipe:', error);
    throw error;
  }
}

/**
 * Get outfit count
 */
export async function getOutfitCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Failed to get outfit count:', error);
    return 0;
  }
}

/**
 * Get outfit statistics (optimized with SQL queries - no memory loading)
 */
export async function getOutfitStats() {
  try {
    // Get total count (fast - no data loading)
    const total = await getOutfitCount();

    // Count by pool tier (separate fast queries)
    const { count: primaryCount } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true })
      .eq('pool_tier', 'primary');

    const { count: secondaryCount } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true })
      .eq('pool_tier', 'secondary');

    const { count: suppressedCount } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true })
      .eq('pool_tier', 'suppressed');

    // Count tagged (has non-empty attributes)
    // NOTE: SQL query doesn't work for JSONB empty object check, so we load and count in JS
    const { data: attributesData } = await supabase
      .from('outfits')
      .select('attributes');

    let taggedCount = 0;
    if (attributesData) {
      taggedCount = attributesData.filter(row =>
        row.attributes &&
        typeof row.attributes === 'object' &&
        Object.keys(row.attributes).length > 0
      ).length;
    }

    // Get unique recipe count
    const { data: recipeData } = await supabase
      .from('outfits')
      .select('recipe_id');

    const uniqueRecipes = new Set(recipeData?.map(r => r.recipe_id) || []);

    // For byRecipe breakdown, we need to load all recipe_ids (lightweight)
    const byRecipe = new Map<string, number>();
    if (recipeData) {
      recipeData.forEach((row) => {
        byRecipe.set(row.recipe_id, (byRecipe.get(row.recipe_id) || 0) + 1);
      });
    }

    // For avgScore, we need to calculate from actual data
    // This is still expensive, but only loads scores not full outfits
    const { data: scoreData } = await supabase
      .from('outfits')
      .select('quality_score, confidence_score');

    let avgScore = 0;
    if (scoreData && scoreData.length > 0) {
      const sumScores = scoreData.reduce((sum, row) => {
        return sum + (row.confidence_score || row.quality_score || 0);
      }, 0);
      avgScore = sumScores / scoreData.length;
    }

    return {
      total,
      primary: primaryCount || 0,
      secondary: secondaryCount || 0,
      suppressed: suppressedCount || 0,
      tagged: taggedCount || 0,
      untagged: total - (taggedCount || 0),
      recipeCount: uniqueRecipes.size,
      avgScore,
      byRecipe: Object.fromEntries(byRecipe),
    };
  } catch (error) {
    console.error('Failed to get outfit stats:', error);
    // Return safe defaults on error
    return {
      total: 0,
      primary: 0,
      secondary: 0,
      suppressed: 0,
      tagged: 0,
      untagged: 0,
      recipeCount: 0,
      avgScore: 0,
      byRecipe: {},
    };
  }
}

/**
 * Transform Supabase row (snake_case) to StoredOutfit (camelCase)
 */
function transformFromSupabase(row: any): StoredOutfit {
  return {
    outfitId: row.outfit_id,
    recipeId: row.recipe_id,
    recipeTitle: row.recipe_title,
    department: row.department,
    generatedAt: row.generated_at,
    strategy: row.strategy,
    confidenceScore: row.confidence_score || row.quality_score,
    qualityScore: row.quality_score,
    alignmentScore: row.alignment_score,
    poolTier: row.pool_tier,
    scoreBreakdown: row.score_breakdown,
    items: row.items,
    reasoning: row.reasoning,
    linkedToRecipe: row.linked_to_recipe,
    attributes: row.attributes,
  };
}

/**
 * Export/Import compatibility (for migration from IndexedDB)
 */
export async function exportOutfitsToJSON(): Promise<void> {
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
 * Save multiple outfits in batch
 */
export async function saveOutfitsBatch(outfits: StoredOutfit[]): Promise<void> {
  if (outfits.length === 0) return;

  try {
    // Transform to snake_case for Supabase
    const supabaseOutfits = outfits.map(outfit => ({
      outfit_id: outfit.outfitId,
      recipe_id: outfit.recipeId,
      recipe_title: outfit.recipeTitle,
      department: outfit.department,
      quality_score: outfit.qualityScore,
      alignment_score: outfit.alignmentScore,
      confidence_score: outfit.confidenceScore,
      pool_tier: outfit.poolTier,
      score_breakdown: outfit.scoreBreakdown,
      items: outfit.items,
      strategy: outfit.strategy,
      reasoning: outfit.reasoning,
      linked_to_recipe: outfit.linkedToRecipe,
      attributes: outfit.attributes,
      generated_at: outfit.generatedAt,
    }));

    const { error } = await supabase
      .from('outfits')
      .upsert(supabaseOutfits, { onConflict: 'outfit_id' });

    if (error) throw error;

    console.log(`✓ Saved ${outfits.length} outfits to Supabase`);
  } catch (error) {
    console.error('Failed to save outfits batch:', error);
    throw error;
  }
}

/**
 * Fix image URLs in Supabase outfits
 * DEPRECATED: After migration to product_id references, enrichment layer handles this automatically
 */
export async function fixOutfitImageUrls(): Promise<{ fixed: number; fetched: number; updated: number; total: number }> {
  // No-op after migration - enrichment handles image URLs automatically
  console.log('✓ Image URL fixing handled by enrichment layer (post-migration)');
  return { fixed: 0, fetched: 0, updated: 0, total: 0 };

  /* OLD CODE - DISABLED AFTER MIGRATION
  try {
    const outfits = await getAllOutfits();
    let fetchedCount = 0;
    let updatedCount = 0;

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
    }

    // Fix outfits with missing imageUrls
    const outfitsToUpdate: StoredOutfit[] = [];

    for (const outfit of outfits) {
      let hasChanges = false;
      const fixedItems = outfit.items.map((item) => {
        const oldUrl = item.product.imageUrl;
        let newUrl = oldUrl;

        // Fix missing URLs: fetch from CLIP API
        if (!oldUrl || oldUrl === '') {
          const fetchedUrl = productImageMap.get(item.product.id);
          if (fetchedUrl) {
            newUrl = fetchedUrl;
            hasChanges = true;
          }
        }
        // Fix relative URLs: /product-images/file.jpg → http://localhost:5002/product-images/file.jpg
        else if (oldUrl.startsWith('/product-images/') && !oldUrl.startsWith('http')) {
          const filename = oldUrl.split('/').pop();
          newUrl = `http://localhost:5002/product-images/${filename}`;
          hasChanges = true;
        }
        // Fix old broken URLs: product-images-unified → product-images
        else if (oldUrl.includes('/product-images-unified/')) {
          newUrl = oldUrl.replace('/product-images-unified/', '/product-images/');
          hasChanges = true;
        }

        return {
          ...item,
          product: {
            ...item.product,
            imageUrl: newUrl,
          },
        };
      });

      if (hasChanges) {
        outfitsToUpdate.push({
          ...outfit,
          items: fixedItems,
        });
      }
    }

    // Update outfits in Supabase
    if (outfitsToUpdate.length > 0) {
      await saveOutfitsBatch(outfitsToUpdate);
      updatedCount = outfitsToUpdate.length;
      console.log(`✓ Updated ${updatedCount} outfits with fixed imageUrls`);
    }

    return {
      fixed: updatedCount,
      fetched: fetchedCount,
      updated: updatedCount,
      total: outfits.length
    };
  } catch (error) {
    console.error('Failed to fix outfit imageUrls:', error);
    throw error;
  }
  */
}
