/**
 * Semantic Product Search API (CLIP)
 *
 * Proxies requests to the Python CLIP API server running on localhost:5002
 * Provides semantic search capabilities for the Recipe Builder
 */

import { NextRequest, NextResponse } from 'next/server';

const CLIP_API_URL = 'http://localhost:5002';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || '';
  const productType1 = searchParams.get('productType1') || '';
  const productType2 = searchParams.get('productType2') || '';
  const department = searchParams.get('department') || '';
  const limit = searchParams.get('limit') || '20';

  if (!query || query.length < 3) {
    return NextResponse.json({
      results: [],
      total: 0,
      message: 'Query must be at least 3 characters'
    });
  }

  if (!productType1) {
    return NextResponse.json({
      error: 'Product type (productType1) is required for semantic search',
      message: 'CLIP search requires explicit product type to maintain accuracy'
    }, { status: 400 });
  }

  try {
    // Build query params for Python API
    const params = new URLSearchParams({
      q: query,
      type: productType1,
      limit
    });

    if (productType2) params.append('type2', productType2);
    if (department) params.append('department', department);

    // Call Python CLIP API
    const response = await fetch(`${CLIP_API_URL}/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CLIP API returned ${response.status}`);
    }

    const data = await response.json();

    // Transform results to match frontend expectations
    const transformedResults = data.results?.map((result: any) => {
      // CLIP API returns flat objects with imageUrl
      // Frontend expects images array with url/localImagePath
      const product = result.product || result; // Handle both nested and flat structures

      return {
        productId: product.productId,
        title: product.title,
        brand: product.brand,
        price: product.price,
        department: product.department,
        productType1: product.productType1,
        productType2: product.productType2,
        images: product.imageUrl ? [{
          url: product.imageUrl,
          localImagePath: product.imageUrl, // Same as url for local images
          isPrimary: true,
          type: 'flat_lay'
        }] : [],
        url: product.url || `#${product.productId}`,
        score: result.score || product.score || 0,
      };
    }) || [];

    return NextResponse.json({
      results: transformedResults,
      total: transformedResults.length,
      searchType: 'semantic-clip'
    });

  } catch (error: any) {
    console.error('Error calling CLIP API:', error);

    return NextResponse.json({
      error: 'Semantic search unavailable',
      message: error.message || 'Could not connect to CLIP API server',
      fallback: 'Use text-based search instead'
    }, { status: 503 });
  }
}
