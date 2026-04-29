/**
 * Product Search API
 *
 * Searches products from master file based on query, product type, brands, materials
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load products once at module level
const PRODUCTS_FILE = path.join(process.cwd(), '../scripts/products-MASTER-SOURCE-OF-TRUTH.json');
let cachedProducts: any[] | null = null;

function loadProducts(): any[] {
  if (cachedProducts) return cachedProducts;

  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    cachedProducts = JSON.parse(data);
    return cachedProducts;
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}

function scoreMatch(product: any, query: string, filters: any): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Track how many query words matched (require minimum threshold)
  let wordsMatched = 0;

  // Title matching (highest weight)
  const title = (product.title || '').toLowerCase();
  queryWords.forEach(word => {
    if (title.includes(word)) {
      score += 15;
      wordsMatched++;
    }
  });

  // Exact phrase match bonus (very high relevance)
  if (title.includes(queryLower)) {
    score += 30;
  }

  // Type3/Type4 matching (NEW - style details like "bomber", "cropped", "midi")
  if (product.productType3) {
    const type3 = product.productType3.toLowerCase();
    queryWords.forEach(word => {
      if (type3.includes(word)) {
        score += 20; // High weight for style match
        wordsMatched++;
      }
    });
    if (type3.includes(queryLower)) {
      score += 25; // Exact phrase in Type3
    }
  }

  if (product.productType4) {
    const type4 = product.productType4.toLowerCase();
    queryWords.forEach(word => {
      if (type4.includes(word)) {
        score += 15;
        wordsMatched++;
      }
    });
  }

  // AI Description matching (NEW - comprehensive + stylist)
  if (product.aiEnriched?.descriptions) {
    const comprehensiveDesc = (product.aiEnriched.descriptions.comprehensive || '').toLowerCase();
    const stylistDesc = (product.aiEnriched.descriptions.stylist || '').toLowerCase();

    // Comprehensive description
    queryWords.forEach(word => {
      if (comprehensiveDesc.includes(word)) {
        score += 5;
        wordsMatched++;
      }
    });

    // Exact phrase in description
    if (comprehensiveDesc.includes(queryLower)) {
      score += 15;
    }

    // Stylist description (customer-friendly language)
    queryWords.forEach(word => {
      if (stylistDesc.includes(word)) {
        score += 3;
      }
    });
  }

  // Materials matching - smart mapping
  const materialKeywords: { [key: string]: string[] } = {
    'jeans': ['Denim'],
    'denim': ['Denim'],
    'leather': ['Leather'],
    'suede': ['Suede'],
    'cotton': ['Cotton'],
    'linen': ['Linen'],
    'silk': ['Silk'],
    'wool': ['Wool'],
  };

  queryWords.forEach(word => {
    if (materialKeywords[word] && product.materials) {
      materialKeywords[word].forEach(material => {
        if (product.materials.includes(material)) {
          score += 12; // High weight for material match
          wordsMatched++;
        }
      });
    }
  });

  // Direct materials matching (from materials array)
  if (product.materials) {
    queryWords.forEach(word => {
      if (product.materials.some((m: string) => m.toLowerCase().includes(word))) {
        score += 8;
        wordsMatched++;
      }
    });
  }

  // Filter-based materials matching
  if (filters.materials && filters.materials.length > 0 && product.materials) {
    const materialMatches = filters.materials.filter((m: string) =>
      product.materials.includes(m)
    );
    score += materialMatches.length * 10;
  }

  // Product type matching
  if (filters.productType2 && product.productType2 === filters.productType2) {
    score += 15;
  }

  // Brand matching
  if (filters.brands && filters.brands.length > 0) {
    if (filters.brands.includes(product.brand)) {
      score += 10;
    }
  }

  // Color matching
  queryWords.forEach(word => {
    if (product.colors && product.colors.some((c: string) => c.toLowerCase().includes(word))) {
      score += 8;
      wordsMatched++;
    }
  });

  // AI Color data matching (NEW - vanity names)
  if (product.aiEnriched?.colors?.vanity?.topPick) {
    const vanityColor = product.aiEnriched.colors.vanity.topPick.toLowerCase();
    queryWords.forEach(word => {
      if (vanityColor.includes(word)) {
        score += 6;
      }
    });
  }

  // Lifestyle attributes matching (NEW - occasions, seasons)
  if (product.aiEnriched?.lifestyle) {
    const occasions = (product.aiEnriched.lifestyle.occasions || []).join(' ').toLowerCase();
    const seasons = (product.aiEnriched.lifestyle.weather?.seasons || []).join(' ').toLowerCase();

    queryWords.forEach(word => {
      if (occasions.includes(word)) score += 4;
      if (seasons.includes(word)) score += 4;
    });
  }

  // Require minimum match threshold (at least 50% of query words must match)
  const matchThreshold = Math.ceil(queryWords.length * 0.5);
  if (wordsMatched < matchThreshold) {
    return 0; // Not relevant enough
  }

  return score;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || '';
  const department = searchParams.get('department') || '';
  const productType1 = searchParams.get('productType1') || '';
  const productType2 = searchParams.get('productType2') || '';
  const brands = searchParams.get('brands')?.split(',').filter(Boolean) || [];
  const materials = searchParams.get('materials')?.split(',').filter(Boolean) || [];
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!query || query.length < 3) {
    return NextResponse.json({
      results: [],
      total: 0,
      message: 'Query must be at least 3 characters'
    });
  }

  const products = loadProducts();

  // Extract color keywords from query for strict filtering
  const colorKeywords = [
    'black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange',
    'brown', 'grey', 'gray', 'beige', 'navy', 'burgundy', 'tan', 'khaki', 'olive',
    'cream', 'ivory', 'charcoal', 'rust', 'mustard', 'teal', 'maroon'
  ];

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  const colorsInQuery = queryWords.filter(word => colorKeywords.includes(word));

  // Filter and score products
  let results = products
    .filter((product: any) => {
      // Must be outfit eligible
      if (!product.isOutfitEligible) return false;

      // Department filter (strict)
      if (department && product.department !== department) return false;

      // Product Type filter (relaxed - only filter if explicitly requested)
      if (productType1 && product.productType1 !== productType1) return false;

      // COLOR FILTER (STRICT) - If user specifies a color, product MUST have that color as PRIMARY
      if (colorsInQuery.length > 0) {
        let hasMatchingColor = false;

        // First check AI enriched color data (most accurate - checks PRIMARY color only)
        if (product.aiEnriched?.colors) {
          // Check technical colors with "primary" or "main body" coverage
          const primaryTechnicalColors = (product.aiEnriched.colors.technical || [])
            .filter((c: any) => c.coverage === 'primary' || c.coverage === 'main body')
            .map((c: any) => c.colorName?.toLowerCase() || '');

          if (primaryTechnicalColors.length > 0) {
            hasMatchingColor = colorsInQuery.some(color =>
              primaryTechnicalColors.some((pc: string) => pc.includes(color))
            );
          }

          // Also check vanity color name (first word is usually the dominant color)
          if (!hasMatchingColor) {
            const vanityColor = (product.aiEnriched.colors.vanity?.topPick || '').toLowerCase();
            const vanityFirstWord = vanityColor.split(' ')[0];
            hasMatchingColor = colorsInQuery.some(color => vanityFirstWord === color || vanityColor.startsWith(color));
          }
        }

        // Fallback: Check basic colors array (less accurate)
        if (!hasMatchingColor && product.colors && product.colors.length > 0) {
          // Only check first color in array (assumed to be primary)
          const primaryColor = product.colors[0].toLowerCase();
          hasMatchingColor = colorsInQuery.some(color => primaryColor.includes(color));
        }

        // Last resort: Check title
        if (!hasMatchingColor) {
          const title = (product.title || '').toLowerCase();
          // Only match if color is at the START of title (more likely to be primary)
          hasMatchingColor = colorsInQuery.some(color => title.startsWith(color) || title.includes(` ${color} `));
        }

        if (!hasMatchingColor) {
          return false; // Strict color filter - must match PRIMARY color
        }
      }

      return true;
    })
    .map((product: any) => ({
      product,
      score: scoreMatch(product, query, { productType2, brands, materials })
    }))
    .filter((item: any) => item.score > 0) // Only include matches
    .sort((a: any, b: any) => b.score - a.score) // Sort by score
    .slice(0, limit) // Limit results
    .map((item: any) => ({
      productId: item.product.productId,
      title: item.product.title,
      brand: item.product.brand,
      price: item.product.price,
      department: item.product.department,
      productType1: item.product.productType1,
      productType2: item.product.productType2,
      productType3: item.product.productType3,
      productType4: item.product.productType4,
      colors: item.product.colors || [],
      materials: item.product.materials || [],
      images: item.product.images || [],
      url: item.product.url,
      score: item.score
    }));

  return NextResponse.json({
    results,
    total: results.length,
    query,
    filters: {
      department,
      productType1,
      productType2,
      brands,
      materials
    }
  });
}
