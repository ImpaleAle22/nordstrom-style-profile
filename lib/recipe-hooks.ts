/**
 * React Hooks for Recipe Builder Data Fetching
 *
 * Uses SWR for client-side data fetching with caching
 */

import useSWR from 'swr';
import { sanityClient } from './sanity-client';
import {
  ALL_INGREDIENT_SETS_QUERY,
  INGREDIENT_SETS_BY_TYPE_QUERY,
  ALL_BRANDS_QUERY,
  ALL_MATERIALS_QUERY,
  PRODUCT_TYPE2_BY_TYPE1_QUERY,
  PRODUCTS_BY_INGREDIENT_QUERY,
  ALL_OUTFIT_RECIPES_QUERY,
  OUTFIT_RECIPE_BY_ID_QUERY,
} from './sanity-queries';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ExistingIngredient {
  _id: string;
  setId: string;
  displayTitle: string;
  query: string;
  productType1: string;
  productType2?: string;
  brands: string[];
  tags: string[];
  department: string;
  usedInRecipes: number;
}

export interface Product {
  _id: string;
  title: string;
  brand: string;
  price: number;
  primaryImageUrl?: string;
  productType1: string;
  productType2?: string;
  productType3?: string;
}

export interface OutfitRecipeSummary {
  _id: string;
  _createdAt: string;
  recipeId: string;
  title: string;
  theme: string;
  department: string;
  season?: string;
  slotCount: number;
  sampleCount: number;
  aiGenerated: boolean;
}

// ─── INGREDIENT SET HOOKS ───────────────────────────────────────────────────

/**
 * Fetch all existing ingredient sets across all recipes
 */
export function useAllIngredientSets() {
  const { data, error, isLoading, mutate } = useSWR<ExistingIngredient[]>(
    'all-ingredient-sets',
    () => sanityClient.fetch(ALL_INGREDIENT_SETS_QUERY)
  );

  return {
    ingredientSets: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

/**
 * Fetch ingredient sets filtered by product type
 */
export function useIngredientSetsByType(productType1: string | null) {
  const { data, error, isLoading } = useSWR<ExistingIngredient[]>(
    productType1 ? ['ingredient-sets-by-type', productType1] : null,
    () => sanityClient.fetch(INGREDIENT_SETS_BY_TYPE_QUERY, { productType1 })
  );

  return {
    ingredientSets: data || [],
    isLoading,
    isError: error,
  };
}

// ─── PRODUCT METADATA HOOKS ─────────────────────────────────────────────────

/**
 * Fetch all unique brands
 */
export function useAllBrands() {
  const { data, error, isLoading } = useSWR<string[]>(
    'all-brands',
    async () => {
      const brands = await sanityClient.fetch<string[]>(ALL_BRANDS_QUERY);
      // Dedupe and sort
      return Array.from(new Set(brands)).sort();
    }
  );

  return {
    brands: data || [],
    isLoading,
    isError: error,
  };
}

/**
 * Fetch all unique materials
 */
export function useAllMaterials() {
  const { data, error, isLoading } = useSWR<string[]>(
    'all-materials',
    async () => {
      const materials = await sanityClient.fetch<string[]>(ALL_MATERIALS_QUERY);
      // Dedupe and sort
      return Array.from(new Set(materials)).sort();
    }
  );

  return {
    materials: data || [],
    isLoading,
    isError: error,
  };
}

/**
 * Fetch Product Type 2 values for a given Product Type 1
 */
export function useProductType2Options(productType1: string | null) {
  const { data, error, isLoading } = useSWR<string[]>(
    productType1 ? ['product-type2', productType1] : null,
    async () => {
      const types = await sanityClient.fetch<string[]>(
        PRODUCT_TYPE2_BY_TYPE1_QUERY,
        { productType1 }
      );
      // Dedupe and sort
      return Array.from(new Set(types)).sort();
    }
  );

  return {
    productType2Options: data || [],
    isLoading,
    isError: error,
  };
}

// ─── PRODUCT QUERY HOOKS ────────────────────────────────────────────────────

/**
 * Query products by ingredient criteria (for preview)
 */
export function useProductsByIngredient(params: {
  productType1: string | null;
  department?: string;
  brands?: string[];
  productType2?: string[];
}) {
  const cacheKey = params.productType1
    ? ['products-by-ingredient', JSON.stringify(params)]
    : null;

  const { data, error, isLoading } = useSWR<Product[]>(
    cacheKey,
    () =>
      sanityClient.fetch(PRODUCTS_BY_INGREDIENT_QUERY, {
        productType1: params.productType1,
        department: params.department || null,
        brands: params.brands || [],
        productType2: params.productType2 || [],
      })
  );

  return {
    products: data || [],
    productCount: data?.length || 0,
    isLoading,
    isError: error,
  };
}

// ─── OUTFIT RECIPE HOOKS ────────────────────────────────────────────────────

/**
 * Fetch all outfit recipes
 */
export function useAllOutfitRecipes() {
  const { data, error, isLoading, mutate } = useSWR<OutfitRecipeSummary[]>(
    'all-outfit-recipes',
    () => sanityClient.fetch(ALL_OUTFIT_RECIPES_QUERY)
  );

  return {
    recipes: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

/**
 * Fetch single outfit recipe by ID
 */
export function useOutfitRecipe(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['outfit-recipe', id] : null,
    () => sanityClient.fetch(OUTFIT_RECIPE_BY_ID_QUERY, { id })
  );

  return {
    recipe: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// ─── MUTATION HOOKS ─────────────────────────────────────────────────────────

/**
 * Create a new ingredient set in Sanity
 * Returns the created document with _id
 */
export async function createIngredientSet(document: any) {
  return await sanityClient.create(document);
}

/**
 * Create a new outfit recipe in Sanity
 * Returns the created document with _id
 */
export async function createOutfitRecipe(document: any) {
  return await sanityClient.create(document);
}

/**
 * Update an existing outfit recipe
 */
export async function updateOutfitRecipe(id: string, patches: any) {
  return await sanityClient.patch(id).set(patches).commit();
}

/**
 * Delete an outfit recipe
 */
export async function deleteOutfitRecipe(id: string) {
  return await sanityClient.delete(id);
}
