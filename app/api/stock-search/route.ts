import { NextRequest, NextResponse } from 'next/server';

export interface StockImage {
  id: string;
  source: 'pexels' | 'unsplash';
  url: string;
  thumbnail: string;
  photographer: string;
  photographerUrl: string;
  avgColor?: string;
  color?: string;
  blurHash?: string;
  alt?: string;
  downloadLocation?: string; // For Unsplash tracking
}

interface SearchMetadata {
  pexelsCount: number;
  unsplashCount: number;
  totalCount: number;
  rateLimitWarning?: string;
}

/**
 * POST /api/stock-search
 *
 * Aggregates stock photo results from multiple APIs
 *
 * Body:
 * {
 *   query: string;
 *   sources?: ('pexels' | 'unsplash')[];
 *   perPage?: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { query, sources = ['pexels', 'unsplash'], perPage = 30 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Stock Search] Query: "${query}", Sources: ${sources.join(', ')}, PerPage: ${perPage}`);

    // Create API call promises
    const apiCalls: Promise<StockImage[]>[] = [];

    if (sources.includes('pexels')) {
      apiCalls.push(searchPexels(query, Math.min(perPage, 80)));
    }

    if (sources.includes('unsplash')) {
      apiCalls.push(searchUnsplash(query, Math.min(perPage, 30)));
    }

    // Execute all searches in parallel
    const results = await Promise.allSettled(apiCalls);

    // Aggregate successful results
    const aggregated: StockImage[] = [];
    let pexelsCount = 0;
    let unsplashCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const images = result.value;
        aggregated.push(...images);

        // Track counts by source
        if (sources[index] === 'pexels') {
          pexelsCount = images.length;
        } else if (sources[index] === 'unsplash') {
          unsplashCount = images.length;
        }
      } else {
        console.error(`[Stock Search] Failed to fetch from ${sources[index]}:`, result.reason);
      }
    });

    const metadata: SearchMetadata = {
      pexelsCount,
      unsplashCount,
      totalCount: aggregated.length
    };

    console.log(`[Stock Search] Success - Total: ${metadata.totalCount} (Pexels: ${pexelsCount}, Unsplash: ${unsplashCount})`);

    return NextResponse.json({
      results: aggregated,
      metadata
    });
  } catch (error) {
    console.error('[Stock Search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search stock photos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Search Pexels API
 * Rate limit: 200 req/hour, 20,000/month
 */
async function searchPexels(query: string, perPage: number): Promise<StockImage[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn('[Pexels] API key not configured');
    return [];
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;

    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('[Pexels] Rate limit exceeded');
        throw new Error('Pexels rate limit exceeded');
      }
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.photos || !Array.isArray(data.photos)) {
      console.warn('[Pexels] No photos in response');
      return [];
    }

    return data.photos.map((photo: any) => ({
      id: `pexels_${photo.id}`,
      source: 'pexels' as const,
      url: photo.src.large2x,
      thumbnail: photo.src.medium,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      avgColor: photo.avg_color,
      alt: photo.alt || query
    }));
  } catch (error) {
    console.error('[Pexels] Search error:', error);
    throw error;
  }
}

/**
 * Search Unsplash API
 * Rate limit: 50 req/hour (demo mode)
 */
async function searchUnsplash(query: string, perPage: number): Promise<StockImage[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.warn('[Unsplash] API key not configured');
    return [];
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        console.error('[Unsplash] Rate limit exceeded');
        throw new Error('Unsplash rate limit exceeded');
      }
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      console.warn('[Unsplash] No results in response');
      return [];
    }

    return data.results.map((photo: any) => ({
      id: `unsplash_${photo.id}`,
      source: 'unsplash' as const,
      url: photo.urls.regular,
      thumbnail: photo.urls.small,
      photographer: photo.user.name,
      photographerUrl: `https://unsplash.com/@${photo.user.username}?utm_source=style_engine&utm_medium=referral`,
      color: photo.color,
      blurHash: photo.blur_hash,
      alt: photo.alt_description || query,
      downloadLocation: photo.links.download_location // For attribution tracking
    }));
  } catch (error) {
    console.error('[Unsplash] Search error:', error);
    throw error;
  }
}

/**
 * Track Unsplash download (required for attribution)
 * Call this when user selects an Unsplash image
 */
export async function trackUnsplashDownload(downloadLocation: string): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey || !downloadLocation) {
    return;
  }

  try {
    await fetch(downloadLocation, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });
  } catch (error) {
    console.error('[Unsplash] Failed to track download:', error);
  }
}
