/**
 * Supabase Outfit Storage
 * Replaces IndexedDB with PostgreSQL queries
 * Maintains same interface as outfit-storage.ts for compatibility
 */

import { supabase } from './supabase-client';
import type { StoredOutfit } from './outfit-storage';

/**
 * Get all outfits
 */
export async function getAllOutfits(): Promise<StoredOutfit[]> {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .order('generated_at', { ascending: false });

    if (error) throw error;

    // Transform from snake_case to camelCase
    return (data || []).map(transformFromSupabase);
  } catch (error) {
    console.error('Failed to fetch outfits from Supabase:', error);
    return [];
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

    return (data || []).map(transformFromSupabase);
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

    return (data || []).map(transformFromSupabase);
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
 * Fetches missing imageUrls from CLIP API and updates outfits
 */
export async function fixOutfitImageUrls(): Promise<{ fixed: number; fetched: number; updated: number; total: number }> {
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
}
