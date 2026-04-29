/**
 * Sanity GROQ Queries for Recipe Builder
 */

// ─── INGREDIENT SETS ────────────────────────────────────────────────────────

/**
 * Fetch all ingredient sets across all recipes
 * Used for "existing ingredients" search in OutfitIngredientEditor
 */
export const ALL_INGREDIENT_SETS_QUERY = `
  *[_type == "outfitRecipe"] {
    "ingredients": slots[].ingredientSet-> {
      _id,
      setId,
      displayTitle,
      query,
      productType1,
      productType2,
      brands,
      tags,
      department,
      "usedInRecipes": count(*[_type == "outfitRecipe" && references(^._id)])
    }
  }.ingredients[]
`;

/**
 * Fetch ingredient sets filtered by product type
 */
export const INGREDIENT_SETS_BY_TYPE_QUERY = `
  *[_type == "outfitRecipe"] {
    "ingredients": slots[].ingredientSet-> {
      _id,
      setId,
      displayTitle,
      query,
      productType1,
      productType2,
      brands,
      tags,
      department,
      "usedInRecipes": count(*[_type == "outfitRecipe" && references(^._id)])
    }[productType1 == $productType1]
  }.ingredients[]
`;

// ─── PRODUCTS ───────────────────────────────────────────────────────────────

/**
 * Get all unique brands from products
 */
export const ALL_BRANDS_QUERY = `
  *[_type == "product" && defined(brand)] | order(brand asc) {
    brand
  }.brand
`;

/**
 * Get all unique materials from products
 */
export const ALL_MATERIALS_QUERY = `
  *[_type == "product" && defined(materials) && count(materials) > 0] {
    materials
  }.materials[] | order(@)
`;

/**
 * Get Product Type 2 values for a given Product Type 1
 */
export const PRODUCT_TYPE2_BY_TYPE1_QUERY = `
  *[_type == "product" && productType1 == $productType1 && defined(productType2)] {
    productType2
  }.productType2 | order(@)
`;

/**
 * Query products by ingredient set criteria
 * Used for preview/example products in ingredient editor
 */
export const PRODUCTS_BY_INGREDIENT_QUERY = `
  *[_type == "product"
    && status == "active"
    && isOutfitEligible == true
    && productType1 == $productType1
    && ($department == null || department == $department)
    && ($brands == null || count($brands) == 0 || brand in $brands)
    && ($productType2 == null || count($productType2) == 0 || productType2 in $productType2)
  ] [0...12] {
    _id,
    title,
    brand,
    price,
    primaryImageUrl,
    productType1,
    productType2,
    productType3
  }
`;

// ─── OUTFIT RECIPES ─────────────────────────────────────────────────────────

/**
 * Fetch all outfit recipes (for recipe list page)
 */
export const ALL_OUTFIT_RECIPES_QUERY = `
  *[_type == "outfitRecipe"] | order(_createdAt desc) {
    _id,
    _createdAt,
    recipeId,
    title,
    theme,
    department,
    season,
    "slotCount": count(slots),
    "sampleCount": count(sampleOutfits),
    aiGenerated
  }
`;

/**
 * Fetch single outfit recipe by ID
 */
export const OUTFIT_RECIPE_BY_ID_QUERY = `
  *[_type == "outfitRecipe" && _id == $id][0] {
    _id,
    _createdAt,
    _updatedAt,
    recipeId,
    title,
    theme,
    department,
    season,
    color,
    slots[] {
      role,
      ingredientSet->,
      conditional
    },
    sampleOutfits,
    aiGenerated,
    aiConfidence,
    aiReasoning
  }
`;

/**
 * Create new outfit recipe
 */
export function buildOutfitRecipeDocument(data: {
  recipeId: string;
  title: string;
  theme: string;
  department: string;
  season?: string;
  slots: Array<{
    role: string;
    ingredientSetId: string;
  }>;
}) {
  return {
    _type: 'outfitRecipe',
    recipeId: data.recipeId,
    title: data.title,
    theme: data.theme,
    department: data.department,
    season: data.season || null,
    slots: data.slots.map(slot => ({
      _type: 'object',
      role: slot.role,
      ingredientSet: {
        _type: 'reference',
        _ref: slot.ingredientSetId,
      },
    })),
    aiGenerated: false,
    sampleOutfits: [],
  };
}

/**
 * Create new ingredient set document
 */
export function buildIngredientSetDocument(data: {
  setId: string;
  displayTitle: string;
  query: string;
  theme: string;
  department: string;
  productType1: string;
  productType2?: string[];
  brands?: string[];
  tags?: string[];
  season?: string;
}) {
  return {
    _type: 'ingredientSet',
    setId: data.setId,
    displayTitle: data.displayTitle,
    query: data.query,
    theme: data.theme,
    department: data.department,
    productType1: data.productType1,
    productType2: data.productType2?.[0] || null,
    brands: data.brands || [],
    tags: data.tags || [],
    season: data.season || null,
    products: [], // Will be populated later by product query
    aiGenerated: false,
  };
}
