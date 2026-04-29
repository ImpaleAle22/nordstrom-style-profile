/**
 * Product Fetcher - Fetches products from CLIP API and hydrates from Sanity
 */

import type { ClipProduct, IngredientWithProducts } from './types';
import type { OutfitRole } from '../role-mappings';
import { sanityClient } from '../sanity-client';
import { extractColorsFromQuery } from './color-extraction';

const CLIP_API_URL = 'http://localhost:5002';

interface ClipSearchResponse {
  results: Array<{
    // NEW: Lightweight response format (CLIP API v2)
    productId?: string;
    title?: string;
    brand?: string;
    price?: number;
    imageUrl?: string; // Direct URL (lightweight API)
    department?: string;
    productType1?: string;
    productType2?: string;
    simplifiedColors?: string[];
    score: number;
    // OLD: Full product format (backwards compatibility)
    product?: {
      productId: string;
      title: string;
      brand: string;
      price: number;
      department: string;
      productType1?: string;
      productType2?: string;
      productType3?: string;
      productType4?: string;
      colors?: string[];
      simplifiedColors?: string[];
      colorNames?: string[];
      materials?: string[];
      images?: Array<{ url: string; isPrimary: boolean; type: string }> | string[];
      url?: string;
    };
  }>;
  total: number; // Total matching products (pagination)
  limit?: number; // Page size
  offset?: number; // Pagination offset
}

/**
 * Helper: Sanitize productId for Sanity document ID
 * Same logic as import script
 */
function sanitizeDocumentId(productId: string): string {
  return productId.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

/**
 * Helper: Select best image for outfit display
 * Priority: primary-flat-lay > any flat-lay > first non-lifestyle image > any image
 * Converts localImagePath to public URL when url is null
 */
function selectBestOutfitImage(images?: Array<{ url: string | null; localImagePath?: string; type?: string; isPrimary?: boolean }>): string {
  if (!images || images.length === 0) return '';

  function getImageUrl(img: any): string {
    if (img.url) return img.url;
    // Convert localImagePath to public URL
    // "product-images/hm-kaggle-0608674001_flat_lay_01.jpg" → "/product-images/hm-kaggle-0608674001_flat_lay_01.jpg"
    if (img.localImagePath) {
      // If already in correct format, use as-is; otherwise extract filename
      if (img.localImagePath.startsWith('product-images/')) {
        return `/${img.localImagePath}`;
      }
      const filename = img.localImagePath.split('/').pop();
      return `/product-images/${filename}`;
    }
    return '';
  }

  // Priority 1: Primary flat-lay
  const primaryFlatLay = images.find(img =>
    img.type === 'primary-flat-lay' || (img.type?.includes('flat-lay') && img.isPrimary)
  );
  if (primaryFlatLay) {
    const url = getImageUrl(primaryFlatLay);
    if (url) return url;
  }

  // Priority 2: Any flat-lay
  const anyFlatLay = images.find(img => img.type?.includes('flat-lay'));
  if (anyFlatLay) {
    const url = getImageUrl(anyFlatLay);
    if (url) return url;
  }

  // Priority 3: First non-lifestyle image (avoid on-model-lifestyle)
  const nonLifestyle = images.find(img => !img.type?.includes('lifestyle'));
  if (nonLifestyle) {
    const url = getImageUrl(nonLifestyle);
    if (url) return url;
  }

  // Priority 4: Fallback to first image
  return getImageUrl(images[0]) || '';
}

/**
 * Check if a query explicitly requests hair accessories
 */
function isHairAccessoryRequested(query: string): boolean {
  const hairKeywords = ['hair', 'scrunchie', 'tie', 'clip', 'headband', 'barrette', 'hairband'];
  const queryLower = query.toLowerCase();
  return hairKeywords.some(kw => queryLower.includes(kw));
}

/**
 * Check if a query explicitly requests hosiery/tights
 */
function isHosieryRequested(query: string): boolean {
  const hosieryKeywords = ['sock', 'tights', 'hosiery', 'stockings', 'pantyhose'];
  const queryLower = query.toLowerCase();
  return hosieryKeywords.some(kw => queryLower.includes(kw));
}

/**
 * Filter products based on role and query intent
 * Removes "explicit-only" items (hair accessories, socks) unless explicitly requested
 */
function filterExplicitOnlyItems(
  products: ClipProduct[],
  role: OutfitRole,
  searchQuery: string
): ClipProduct[] {
  // For accessories role, filter out hair accessories unless explicitly requested
  if (role === 'accessories' && !isHairAccessoryRequested(searchQuery)) {
    products = products.filter(p => p.productType2 !== 'Hair Accessories');
  }

  // For all roles, filter out hosiery unless explicitly requested
  if (!isHosieryRequested(searchQuery)) {
    products = products.filter(p => {
      const pt2 = p.productType2?.toLowerCase() || '';
      return !pt2.includes('sock') && !pt2.includes('tights') && !pt2.includes('hosiery');
    });
  }

  return products;
}

/**
 * Hydrate product data from Sanity using productId from CLIP
 * Returns full product with flat-lay image selected
 */
async function hydrateProductFromSanity(
  productId: string,
  clipScore: number,
  embedding?: number[]
): Promise<ClipProduct | null> {
  try {
    const sanityId = `product.${sanitizeDocumentId(productId)}`;

    const product = await sanityClient.fetch(
      `*[_type == "product" && _id == $sanityId][0]{
        _id,
        productId,
        title,
        brand,
        price,
        department,
        productType1,
        productType2,
        productType3,
        productType4,
        materials,
        simplifiedColors,
        images,
        url
      }`,
      { sanityId }
    );

    if (!product) {
      console.warn(`⚠️  Product not found in Sanity: ${productId}`);
      return null;
    }

    // Select best image for outfit display
    const imageUrl = selectBestOutfitImage(product.images);

    return {
      id: product.productId,
      title: product.title,
      brand: product.brand,
      price: product.price,
      imageUrl,
      department: product.department,
      gender: product.department,
      productType1: product.productType1,
      productType2: product.productType2,
      productType3: product.productType3,
      productType4: product.productType4,
      materials: product.materials,
      colors: product.simplifiedColors,
      patterns: [],
      styleRegister: undefined,
      occasions: [],
      season: undefined,
      clip_score: clipScore,
      embedding: embedding, // Store CLIP embedding for similarity checks
    };
  } catch (error) {
    console.error(`Error hydrating product ${productId} from Sanity:`, error);
    return null;
  }
}

/**
 * Generate fallback queries for ingredients with no results
 * Try broader searches based on role
 */
function generateFallbackQuery(role: OutfitRole, originalQuery: string): string | null {
  const roleFallbacks: Record<string, string> = {
    'accessories': 'accessories',
    'hats': 'hats caps',
    'bags': 'bags purses',
    'shoes': 'shoes',
    'tops': 'tops shirts',
    'bottoms': 'pants jeans',
    'one-piece': 'dresses',
    'outerwear': 'jackets coats',
  };

  const fallback = roleFallbacks[role];
  if (fallback && fallback !== originalQuery.toLowerCase()) {
    console.log(`   💡 Trying fallback query for ${role}: "${fallback}"`);
    return fallback;
  }

  return null;
}

/**
 * Fetch products for a single ingredient from CLIP API
 * Includes automatic fallback for zero-result queries
 */
export async function fetchProductsForIngredient(
  ingredientTitle: string,
  searchQuery: string,
  role: OutfitRole,
  filters?: {
    productType1?: string[];
    productType2?: string[];
    materials?: string[];
    brands?: string[];
    department?: string;
    colors?: string[]; // NEW: Explicit color filters
    colorMatchMode?: 'strict' | 'fuzzy' | 'none'; // NEW: Color matching mode
  },
  limit: number = 20,
  attemptFallback: boolean = true
): Promise<IngredientWithProducts> {
  try {
    // Auto-extract colors from query (NEW - Color Filtering System)
    const autoColors = extractColorsFromQuery(searchQuery);
    const explicitColors = filters?.colors || [];
    const colorMatchMode = filters?.colorMatchMode || (autoColors.length > 0 ? 'strict' : 'none');

    // Use explicit colors if provided, otherwise use auto-extracted
    const colorsToFilter = explicitColors.length > 0 ? explicitColors : autoColors;

    if (colorsToFilter.length > 0) {
      console.log(`   🎨 ${explicitColors.length > 0 ? 'Explicit' : 'Auto-extracted'} colors: ${colorsToFilter.join(', ')}`);
    }

    // Build query parameters for GET request
    const params = new URLSearchParams();
    params.append('q', searchQuery);
    params.append('limit', limit.toString());
    params.append('embeddings', 'true'); // Request embeddings for similarity checking

    // Add filters as query params
    if (filters?.productType1 && filters.productType1.length > 0) {
      // Map recipe productTypes to CLIP API types
      let type = filters.productType1[0];
      if (type === 'Bags') type = 'Accessories'; // Bags are under Accessories in CLIP
      params.append('type', type); // CLIP API expects single type
    }
    if (filters?.productType2 && filters.productType2.length > 0) {
      params.append('type2', filters.productType2[0]); // CLIP API expects single type2
    }
    if (filters?.department) {
      params.append('department', filters.department);
    }

    // Add color filters (NEW - only if strict mode)
    if (colorMatchMode === 'strict' && colorsToFilter.length > 0) {
      params.append('colors', JSON.stringify(colorsToFilter));
    }

    const response = await fetch(`${CLIP_API_URL}/search?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`CLIP API error: ${response.status} ${response.statusText}`);
    }

    const data: ClipSearchResponse = await response.json();

    // Flatten the response structure: { product: {...}, score: 0.07 } → { ...product, score: 0.07 }
    const flattenedResults = (data.results || []).map((item: any) => ({
      ...(item.product || item),
      score: item.score
    }));

    console.log(`   CLIP API returned ${flattenedResults.length} results for "${ingredientTitle}"`);

    // Debug: Check if we have valid productIds
    const validIds = flattenedResults.filter(r => r.productId).length;
    if (validIds < flattenedResults.length) {
      console.warn(`   ⚠️  ${flattenedResults.length - validIds} results missing productId!`);
      console.warn(`   First result structure:`, flattenedResults[0]);
    }

    // Use CLIP API data directly (no Sanity hydration needed)
    const products: ClipProduct[] = flattenedResults.map((item) => {
      const imageUrl = item.imageUrl || selectBestOutfitImage(item.images) || '';

      // Debug: Log if imageUrl is missing
      if (!imageUrl) {
        console.warn(`   ⚠️  No imageUrl for product: ${item.productId} - ${item.title}`);
        console.warn(`   Item has imageUrl field:`, !!item.imageUrl);
        console.warn(`   Item has images array:`, !!item.images, item.images?.length);
      }

      return {
        id: item.productId,
        title: item.title || 'Untitled Product',
        brand: item.brand || 'Unknown Brand',
        price: item.price || 0,
        // CRITICAL: CLIP API now returns lightweight responses with imageUrl at top level
        // Use imageUrl directly if present (new API), otherwise fallback to images array (old API)
        imageUrl,
        department: item.department || filters?.department || 'Unknown',
        gender: item.department || filters?.department,
        productType1: item.productType1,
        productType2: item.productType2,
        productType3: item.productType3,
        productType4: item.productType4,
        materials: item.materials || [],
        colors: item.simplifiedColors || item.colors || [],

        // Phase 2 metadata - COPY FROM CLIP API (don't hardcode empty!)
        patterns: item.patterns || [],
        silhouette: item.silhouette,
        garmentLength: item.garmentLength,
        neckline: item.neckline,
        sleeveStyle: item.sleeveStyle,
        fitDetails: item.fitDetails,
        details: item.details || [],
        weatherContext: item.weatherContext || [],
        productFeatures: item.productFeatures || [],
        visualAttributes: item.visualAttributes || [],

        // AI-generated descriptions
        description: item.description,
        comprehensiveDescription: item.comprehensiveDescription,
        stylistDescription: item.stylistDescription,
        visionReasoning: item.visionReasoning,

        // Lifestyle/occasion metadata
        occasions: item.occasions || [],
        seasons: item.seasons || [],
        formalityTier: item.formalityTier,
        versatilityScore: item.versatilityScore,
        trendTags: item.trendTags || [],
        lifestyleOccasions: item.lifestyleOccasions || [],
        activityContext: item.activityContext || [],

        // Legacy fields (keep for backwards compatibility)
        styleRegister: undefined,
        season: undefined,

        clip_score: item.score,
        embedding: item.embedding, // May be undefined if not available
      };
    });

    console.log(`   ✓ Loaded ${products.length} products from CLIP API`);

    if (products.length === 0 && flattenedResults.length > 0) {
      console.error(`   ❌ FAILED TO PARSE PRODUCTS for "${ingredientTitle}"!`);
    }

    // Filter out "explicit-only" items unless explicitly requested
    const beforeFilter = products.length;
    const filteredProducts = filterExplicitOnlyItems(products, role, searchQuery);
    const filtered = beforeFilter - filteredProducts.length;

    if (filtered > 0) {
      console.log(`   🔍 Filtered out ${filtered} explicit-only items (hair accessories, socks)`);
    }

    // Color filter fallback: If strict color filtering returned 0 results, retry without color filter
    if (filteredProducts.length === 0 && colorMatchMode === 'strict' && colorsToFilter.length > 0 && attemptFallback) {
      console.log(`   ⚠️  Zero results with color filter (${colorsToFilter.join(', ')}), retrying without...`);

      // Retry without color filter
      const fallbackResult = await fetchProductsForIngredient(
        ingredientTitle,
        searchQuery,
        role,
        { ...filters, colorMatchMode: 'none' }, // Disable color filter
        limit,
        true // Keep general fallback enabled
      );

      if (fallbackResult.products.length > 0) {
        console.log(`   ⚠️  Color fallback: Found ${fallbackResult.products.length} products without color filter`);
        return {
          ingredientTitle,
          searchQuery: `${searchQuery} (⚠️ relaxed color filter)`,
          role,
          products: fallbackResult.products,
          colorWarning: `Requested colors (${colorsToFilter.join(', ')}) not found. Showing products in all colors.`
        };
      }
    }

    // If no products found and fallback enabled, try broader search
    if (filteredProducts.length === 0 && attemptFallback) {
      const fallbackQuery = generateFallbackQuery(role, searchQuery);
      if (fallbackQuery) {
        console.log(`   ⚠️  Zero results for "${searchQuery}", trying fallback...`);

        // Retry with fallback query (recursively, but disable further fallback)
        const fallbackResult = await fetchProductsForIngredient(
          ingredientTitle,
          fallbackQuery,
          role,
          filters,
          limit,
          false // Disable further fallback attempts
        );

        if (fallbackResult.products.length > 0) {
          console.log(`   ✅ Fallback successful: ${fallbackResult.products.length} products found`);
          return {
            ingredientTitle,
            searchQuery: `${searchQuery} (fallback: ${fallbackQuery})`,
            role,
            products: fallbackResult.products,
          };
        } else {
          console.log(`   ❌ Fallback also returned zero results`);
        }
      }
    }

    return {
      ingredientTitle,
      searchQuery,
      role,
      products: filteredProducts,
      // Preserve recipe specification for alignment scoring
      productTypes: filters?.productType1 || filters?.productType2 ? [...(filters.productType1 || []), ...(filters.productType2 || [])] : undefined,
      materials: filters?.materials,
      brands: filters?.brands,
    };
  } catch (error) {
    console.error(`Error fetching products for "${ingredientTitle}":`, error);
    // Return empty products on error
    return {
      ingredientTitle,
      searchQuery,
      role,
      products: [],
      // Preserve recipe specification even on error
      productTypes: filters?.productType1 || filters?.productType2 ? [...(filters.productType1 || []), ...(filters.productType2 || [])] : undefined,
      materials: filters?.materials,
      brands: filters?.brands,
    };
  }
}

/**
 * Fetch products for all ingredients in parallel
 */
export async function fetchProductsForAllIngredients(
  ingredients: Array<{
    ingredientTitle: string;
    searchQuery: string;
    role: OutfitRole;
    productTypes?: string[];
    productType2?: string[];
    materials?: string[];
    brands?: string[];
  }>,
  department: string,
  productsPerIngredient: number = 20
): Promise<IngredientWithProducts[]> {
  const fetchPromises = ingredients.map((ingredient) => {
    const filters: any = {
      department,
    };

    if (ingredient.productTypes && ingredient.productTypes.length > 0) {
      filters.productType1 = ingredient.productTypes;
    }

    if (ingredient.productType2 && ingredient.productType2.length > 0) {
      filters.productType2 = ingredient.productType2;
    }

    if (ingredient.materials && ingredient.materials.length > 0) {
      filters.materials = ingredient.materials;
    }

    if (ingredient.brands && ingredient.brands.length > 0) {
      filters.brands = ingredient.brands;
    }

    return fetchProductsForIngredient(
      ingredient.ingredientTitle,
      ingredient.searchQuery,
      ingredient.role,
      filters,
      productsPerIngredient
    );
  });

  const results = await Promise.all(fetchPromises);

  // Log results
  console.log('\n=== Product Fetching Results ===');
  results.forEach((result) => {
    console.log(`${result.ingredientTitle}: ${result.products.length} products`);
  });
  console.log('================================\n');

  return results;
}

/**
 * Test CLIP API connection
 */
export async function testClipConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${CLIP_API_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('CLIP API connection failed:', error);
    return false;
  }
}
