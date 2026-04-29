/**
 * Recipe Status from Supabase Outfits
 * Replaces IndexedDB recipe status by calculating from actual outfits
 */

import { supabase } from './supabase-client';

export interface RecipeStatus {
  recipeId: string;
  outfitCount: number;
  linkedCount: number;
  primaryCount: number;
  secondaryCount: number;
  happyAccidentCount: number;
  lastCookedAt: string;
  sessionId: string;
}

/**
 * Get outfit counts for all recipes
 */
export async function getAllRecipeStatuses(): Promise<RecipeStatus[]> {
  try {
    // Use RPC to aggregate in the database (much faster than fetching all rows)
    const { data, error } = await supabase.rpc('get_recipe_stats');

    if (error) {
      console.warn('RPC function not available, falling back to batch fetch:', error.message);
      return await getAllRecipeStatusesFallback();
    }

    // Transform RPC result to RecipeStatus format
    return (data || []).map((row: any) => ({
      recipeId: row.recipe_id,
      outfitCount: row.total_outfits,
      linkedCount: row.linked_outfits,
      primaryCount: row.primary_outfits,
      secondaryCount: row.secondary_outfits,
      happyAccidentCount: row.happy_accident_outfits,
      lastCookedAt: row.last_cooked_at,
      sessionId: 'supabase',
    }));
  } catch (error) {
    console.error('Failed to get recipe statuses from Supabase:', error);
    return [];
  }
}

/**
 * Fallback: Fetch in large batches when RPC not available
 */
async function getAllRecipeStatusesFallback(): Promise<RecipeStatus[]> {
  const statusMap = new Map<string, RecipeStatus>();
  let offset = 0;
  const batchSize = 5000;
  let hasMore = true;

  console.log('📦 Fetching recipe statuses in batches...');

  while (hasMore) {
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('recipe_id, pool_tier, linked_to_recipe, generated_at')
      .range(offset, offset + batchSize - 1)
      .order('recipe_id'); // Order by recipe_id to cluster similar IDs together

    if (error) {
      console.error(`Batch fetch error at offset ${offset}:`, error);
      break;
    }

    if (!outfits || outfits.length === 0) {
      hasMore = false;
      break;
    }

    // Process batch
    outfits.forEach((outfit) => {
      const recipeId = outfit.recipe_id;

      if (!statusMap.has(recipeId)) {
        statusMap.set(recipeId, {
          recipeId,
          outfitCount: 0,
          linkedCount: 0,
          primaryCount: 0,
          secondaryCount: 0,
          happyAccidentCount: 0,
          lastCookedAt: outfit.generated_at,
          sessionId: 'supabase',
        });
      }

      const status = statusMap.get(recipeId)!;
      status.outfitCount++;

      if (outfit.linked_to_recipe) {
        status.linkedCount++;
      }

      if (outfit.pool_tier === 'primary') {
        status.primaryCount++;
      } else if (outfit.pool_tier === 'secondary') {
        status.secondaryCount++;
      } else if (outfit.pool_tier === 'happy-accident') {
        status.happyAccidentCount++;
      }

      if (new Date(outfit.generated_at) > new Date(status.lastCookedAt)) {
        status.lastCookedAt = outfit.generated_at;
      }
    });

    console.log(`  Fetched ${offset + outfits.length} outfits, found ${statusMap.size} unique recipes so far`);
    offset += batchSize;

    if (outfits.length < batchSize) {
      hasMore = false;
    }
  }

  console.log(`✓ Complete: ${statusMap.size} recipes with outfits`);
  return Array.from(statusMap.values());
}

/**
 * Get status for a single recipe
 */
export async function getRecipeStatus(recipeId: string): Promise<RecipeStatus | null> {
  try {
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('pool_tier, linked_to_recipe, generated_at')
      .eq('recipe_id', recipeId);

    if (error) throw error;

    if (!outfits || outfits.length === 0) {
      return null;
    }

    const status: RecipeStatus = {
      recipeId,
      outfitCount: outfits.length,
      linkedCount: outfits.filter(o => o.linked_to_recipe).length,
      primaryCount: outfits.filter(o => o.pool_tier === 'primary').length,
      secondaryCount: outfits.filter(o => o.pool_tier === 'secondary').length,
      happyAccidentCount: outfits.filter(o => o.pool_tier === 'happy-accident').length,
      lastCookedAt: outfits.reduce((latest, o) =>
        new Date(o.generated_at) > new Date(latest) ? o.generated_at : latest,
        outfits[0].generated_at
      ),
      sessionId: 'supabase',
    };

    return status;
  } catch (error) {
    console.error('Failed to get recipe status:', error);
    return null;
  }
}

/**
 * Get total outfit count across all recipes
 */
export async function getTotalOutfitCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Failed to get total outfit count:', error);
    return 0;
  }
}
