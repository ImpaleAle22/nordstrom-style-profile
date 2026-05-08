/**
 * Public API: Semantic Product Search
 *
 * Combines CLIP visual similarity with Supabase product data
 * to provide natural language product search.
 *
 * Example: "cozy warm fall sweaters" → returns matching products
 */

import { NextRequest, NextResponse } from 'next/server';

const CLIP_API_URL = process.env.NEXT_PUBLIC_CLIP_API_URL || 'https://briancassidy-style-clip-search.hf.space';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 12, gender = 'all' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      );
    }

    // Call CLIP API for semantic search
    const clipResponse = await fetch(`${CLIP_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k: limit,
        department: gender === 'all' ? undefined : gender === 'womenswear' ? 'Womenswear' : 'Menswear',
      }),
    });

    if (!clipResponse.ok) {
      throw new Error(`CLIP API error: ${clipResponse.status}`);
    }

    const data = await clipResponse.json();

    // CLIP API returns { results: [...], total: N, limit: N, offset: N }
    const results = data.results || [];

    // Return formatted results
    return NextResponse.json({
      query,
      count: results.length,
      total: data.total,
      products: results.map((product: any) => ({
        id: product.productId,
        name: product.title,
        brand: product.brand,
        price: product.price,
        image_url: product.imageUrl,
        gender: product.department?.toLowerCase(),
        category: product.productType1,
        subcategory: product.productType2,
        colors: product.simplifiedColors,
        similarity_score: product.score,
      })),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search products',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/public/search',
    method: 'POST',
    description: 'Semantic product search using natural language',
    example: {
      query: 'cozy warm fall sweaters',
      limit: 12,
      gender: 'womenswear', // or 'menswear' or 'all'
    },
    clip_api: CLIP_API_URL,
    status: 'ready',
  });
}
