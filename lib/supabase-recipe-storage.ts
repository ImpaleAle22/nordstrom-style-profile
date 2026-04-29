/**
 * Supabase Recipe Storage
 * Replaces IndexedDB with PostgreSQL queries
 * Maintains same interface as recipe-adapter.ts for compatibility
 */

import { supabase } from './supabase-client';

export interface RecipeBuilderRecipe {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  department?: string;
  slotCount?: number;
  slots: any[];
  source?: string;
  aiMetadata?: any;
  seasons?: string[];
  batchId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all recipes
 */
export async function getAllRecipes(): Promise<RecipeBuilderRecipe[]> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformFromSupabase);
  } catch (error) {
    console.error('Failed to fetch recipes from Supabase:', error);
    return [];
  }
}

/**
 * Get recipe by ID
 */
export async function getRecipeById(id: string): Promise<RecipeBuilderRecipe | null> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data ? transformFromSupabase(data) : null;
  } catch (error) {
    console.error('Failed to fetch recipe:', error);
    return null;
  }
}

/**
 * Save recipe (create or update)
 */
export async function saveRecipe(recipe: RecipeBuilderRecipe): Promise<void> {
  try {
    const supabaseRecipe = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      status: recipe.status,
      department: recipe.department,
      slot_count: recipe.slotCount || recipe.slots?.length,
      slots: recipe.slots,
      source: recipe.source,
      ai_metadata: recipe.aiMetadata,
      seasons: recipe.seasons || [],
      batch_id: recipe.batchId,
      created_at: recipe.createdAt,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('recipes')
      .upsert(supabaseRecipe, { onConflict: 'id' });

    if (error) throw error;

    console.log(`✓ Saved recipe: ${recipe.title}`);
  } catch (error) {
    console.error('Failed to save recipe:', error);
    throw error;
  }
}

/**
 * Delete recipe
 */
export async function deleteRecipe(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete recipe:', error);
    throw error;
  }
}

/**
 * Get recipes by batch
 */
export async function getRecipesByBatch(batchId: string): Promise<RecipeBuilderRecipe[]> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformFromSupabase);
  } catch (error) {
    console.error('Failed to fetch recipes by batch:', error);
    return [];
  }
}

/**
 * Get recipes by status
 */
export async function getRecipesByStatus(status: 'draft' | 'active' | 'archived'): Promise<RecipeBuilderRecipe[]> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformFromSupabase);
  } catch (error) {
    console.error('Failed to fetch recipes by status:', error);
    return [];
  }
}

/**
 * Get recipe count
 */
export async function getRecipeCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Failed to get recipe count:', error);
    return 0;
  }
}

/**
 * Save multiple recipes in batch
 */
export async function saveRecipesBatch(recipes: RecipeBuilderRecipe[]): Promise<void> {
  if (recipes.length === 0) return;

  try {
    const supabaseRecipes = recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      status: recipe.status,
      department: recipe.department,
      slot_count: recipe.slotCount || recipe.slots?.length,
      slots: recipe.slots,
      source: recipe.source,
      ai_metadata: recipe.aiMetadata,
      seasons: recipe.seasons || [],
      batch_id: recipe.batchId,
      created_at: recipe.createdAt,
      updated_at: recipe.updatedAt,
    }));

    const { error } = await supabase
      .from('recipes')
      .upsert(supabaseRecipes, { onConflict: 'id' });

    if (error) throw error;

    console.log(`✓ Saved ${recipes.length} recipes to Supabase`);
  } catch (error) {
    console.error('Failed to save recipes batch:', error);
    throw error;
  }
}

/**
 * Transform Supabase row (snake_case) to RecipeBuilderRecipe (camelCase)
 */
function transformFromSupabase(row: any): RecipeBuilderRecipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    department: row.department,
    slotCount: row.slot_count,
    slots: row.slots,
    source: row.source,
    aiMetadata: row.ai_metadata,
    seasons: row.seasons || [],
    batchId: row.batch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Export recipes to JSON
 */
export async function exportRecipesToJSON(): Promise<void> {
  const recipes = await getAllRecipes();
  const dataStr = JSON.stringify(recipes, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `recipes-backup-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✓ Exported ${recipes.length} recipes to JSON file`);
}
