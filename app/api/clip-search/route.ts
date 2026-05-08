/**
 * CLIP Search API Endpoint
 * Searches for visually similar products using text queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 6 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Check if CLIP API is configured
    const clipApiUrl = process.env.CLIP_API_URL;

    if (!clipApiUrl) {
      // Return real products from Supabase for demo purposes
      const mockResults = await generateMockResults(query, limit);
      return NextResponse.json({
        results: mockResults,
        mock: true,
        message: 'Demo mode: using keyword matching (CLIP API not deployed)',
      });
    }

    // Call the actual CLIP API if deployed
    // We need more results to compensate for filtering out Beauty products
    const response = await fetch(`${clipApiUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: limit * 5, // Request 5x results to filter down
      }),
    });

    if (!response.ok) {
      throw new Error('CLIP API request failed');
    }

    const data = await response.json();

    // Detect if query is vibe-based (no specific product type mentioned)
    const queryLower = query.toLowerCase();
    const productTypeKeywords = [
      'dress', 'dresses', 'top', 'tops', 'shirt', 'shirts', 'blouse', 'blouses',
      'sweater', 'sweaters', 'cardigan', 'cardigans', 'jacket', 'jackets', 'coat', 'coats',
      'pants', 'jeans', 'trouser', 'trousers', 'skirt', 'skirts', 'short', 'shorts',
      'shoe', 'shoes', 'boot', 'boots', 'sneaker', 'sneakers', 'heel', 'heels',
      'bag', 'bags', 'purse', 'handbag', 'tote', 'clutch',
      'jewelry', 'jewellery', 'necklace', 'earring', 'bracelet', 'ring',
      'scarf', 'scarves', 'belt', 'belts', 'hat', 'hats'
    ];
    const hasProductTypeInQuery = productTypeKeywords.some(keyword => queryLower.includes(keyword));

    // Key outfit-building product types (when query is vibe-based)
    const coreOutfitTypes = [
      'Tops',
      'Dresses',
      'Bottoms',
      'Outerwear',
      'Shoes',
      'Bags_and_Accessories'
    ];

    // Filter out non-outfit-eligible products
    const outfitEligibleResults = (data.results || []).filter((product: any) => {
      const productType = product.productType1 || '';

      // Always exclude these categories
      if (productType === 'Beauty_and_personal_care' ||
          productType === 'Home' ||
          productType === 'Electronics') {
        return false;
      }

      // If query is vibe-based (no product type mentioned), only include core outfit items
      if (!hasProductTypeInQuery) {
        return coreOutfitTypes.includes(productType);
      }

      // Otherwise, include all clothing/fashion items
      return true;
    });

    // Return only the requested limit of outfit-eligible products
    return NextResponse.json({
      ...data,
      results: outfitEligibleResults.slice(0, limit),
      total: outfitEligibleResults.length,
      filtered: true,
      originalTotal: data.total,
    });
  } catch (error) {
    console.error('CLIP search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate mock results using real products from Supabase
async function generateMockResults(query: string, limit: number) {
  try {
    // Extract keywords from query for basic matching
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Detect if query is vibe-based (no specific product type mentioned)
    const productTypeKeywords = [
      'dress', 'dresses', 'top', 'tops', 'shirt', 'shirts', 'blouse', 'blouses',
      'sweater', 'sweaters', 'cardigan', 'cardigans', 'jacket', 'jackets', 'coat', 'coats',
      'pants', 'jeans', 'trouser', 'trousers', 'skirt', 'skirts', 'short', 'shorts',
      'shoe', 'shoes', 'boot', 'boots', 'sneaker', 'sneakers', 'heel', 'heels',
      'bag', 'bags', 'purse', 'handbag', 'tote', 'clutch',
      'jewelry', 'jewellery', 'necklace', 'earring', 'bracelet', 'ring',
      'scarf', 'scarves', 'belt', 'belts', 'hat', 'hats'
    ];
    const hasProductTypeInQuery = productTypeKeywords.some(keyword => queryLower.includes(keyword));

    // Key outfit-building product types (when query is vibe-based)
    const coreOutfitTypes = [
      'tops',
      'dresses',
      'bottoms',
      'outerwear',
      'shoes',
      'bags_and_accessories',
      'bags and accessories'
    ];

    console.log(`[CLIP Mock] Searching for: "${query}" with keywords:`, keywords);
    console.log(`[CLIP Mock] Has product type in query:`, hasProductTypeInQuery);

    // Try fetching from the newer products table with image_url field
    // Get a larger set to filter for relevance
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, brand, price, image_url, r2_image_url, product_type_1, colors, materials, department')
      .not('title', 'is', null)
      .limit(limit * 10); // Get many more to score and filter

    console.log(`[CLIP Mock] Fetched ${products?.length || 0} products from Supabase`);

    if (error || !products || products.length === 0) {
      console.error('Supabase query error:', error);

      // Try the H&M dataset table as fallback
      const { data: hmProducts, error: hmError } = await supabase
        .from('products')
        .select('product_id, prod_name, product_type_name, colour_group_name, index_group_name')
        .not('prod_name', 'is', null)
        .limit(limit * 3);

      if (hmError || !hmProducts || hmProducts.length === 0) {
        console.error('H&M table query error:', hmError);
        // Final fallback
        return Array.from({ length: limit }, (_, i) => ({
          productId: `fallback_${i}`,
          title: `${query} - Product ${i + 1}`,
          score: 0.95 - (i * 0.05),
          brand: 'Demo',
          imageUrl: null,
        }));
      }

      // Use H&M products with constructed URLs
      const shuffled = hmProducts.sort(() => Math.random() - 0.5).slice(0, limit);
      return shuffled.map((product, i) => ({
        productId: product.product_id,
        title: product.prod_name || 'Untitled Product',
        score: 0.92 - (i * 0.06),
        brand: product.index_group_name || 'H&M',
        productType: product.product_type_name,
        color: product.colour_group_name,
        imageUrl: `https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com/${String(product.product_id).padStart(10, '0')}.jpg`,
      }));
    }

    // Filter products first if vibe-based query
    let filteredProducts = products;
    if (!hasProductTypeInQuery) {
      filteredProducts = products.filter(product => {
        const productType = (product.product_type_1 || '').toLowerCase();

        // Always exclude these
        if (productType.includes('beauty') ||
            productType.includes('home') ||
            productType.includes('electronics')) {
          return false;
        }

        // Only include core outfit types
        return coreOutfitTypes.some(coreType =>
          productType.includes(coreType) ||
          productType.replace(/_/g, ' ').includes(coreType)
        );
      });
      console.log(`[CLIP Mock] Filtered to ${filteredProducts.length} core outfit items`);
    }

    // Score products by relevance to query
    const scoredProducts = filteredProducts.map(product => {
      const titleLower = (product.title || '').toLowerCase();
      const typeLower = (product.product_type_1 || '').toLowerCase();
      const colorLower = (product.colors || '').toLowerCase();
      const brandLower = (product.brand || '').toLowerCase();
      const materialLower = (product.materials || '').toLowerCase();
      const deptLower = (product.department || '').toLowerCase();

      const searchText = `${titleLower} ${typeLower} ${colorLower} ${brandLower} ${materialLower} ${deptLower}`;

      // Calculate relevance score based on keyword matches
      let relevanceScore = 0;

      for (const keyword of keywords) {
        if (titleLower.includes(keyword)) relevanceScore += 10; // Title match is strongest
        if (typeLower.includes(keyword)) relevanceScore += 5;
        if (colorLower.includes(keyword)) relevanceScore += 4;
        if (materialLower.includes(keyword)) relevanceScore += 3;
        if (brandLower.includes(keyword)) relevanceScore += 2;
        if (deptLower.includes(keyword)) relevanceScore += 2;
      }

      // Bonus for products with images
      if (product.image_url || product.r2_image_url) {
        relevanceScore += 1;
      }

      return { product, relevanceScore };
    });

    // Sort by relevance score, then shuffle within score tiers for variety
    scoredProducts.sort((a, b) => {
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (scoreDiff !== 0) return scoreDiff;
      return Math.random() - 0.5; // Shuffle within same score
    });

    // Take top matches
    const topMatches = scoredProducts.slice(0, limit);

    console.log(`[CLIP Mock] Top match scores:`, topMatches.map(m => m.relevanceScore));

    // Format results
    const results = topMatches.map((match, i) => {
      const product = match.product;
      const imageUrl = product.image_url || product.r2_image_url || null;

      // For demo purposes, generate realistic similarity scores
      // Top results should be 0.85-0.95, declining gradually
      const normalizedScore = 0.95 - (i * 0.04);

      return {
        productId: product.id,
        title: product.title || 'Untitled Product',
        score: normalizedScore,
        brand: product.brand || 'Unknown',
        productType: product.product_type_1,
        color: product.colors,
        price: product.price,
        imageUrl,
      };
    });

    return results;
  } catch (error) {
    console.error('Error generating mock results:', error);
    // Fallback
    return Array.from({ length: limit }, (_, i) => ({
      productId: `error_${i}`,
      title: `Product ${i + 1}`,
      score: 0.90 - (i * 0.05),
      brand: 'Unknown',
      imageUrl: null,
    }));
  }
}
