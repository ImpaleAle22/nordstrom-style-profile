/**
 * API Route: Product Types (Lightweight)
 *
 * Returns ONLY productType1/2/3/4 fields for all products.
 * Serves pre-generated cache file (7.93MB vs 1.1GB master file).
 *
 * To update cache: cd ../scripts && node extract-product-types.cjs
 */

import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Path to pre-generated cache file
    const cacheFilePath = path.join(
      process.cwd(),
      '..',
      'scripts',
      'product-types-cache.json'
    );

    // Check if cache exists
    if (!fs.existsSync(cacheFilePath)) {
      return new Response(
        JSON.stringify({
          error: 'Product types cache not found',
          hint: 'Run: cd ../scripts && node extract-product-types.cjs'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📦 Loading product types from cache (7.93MB)...');

    // Simply read and serve the pre-generated cache
    const productTypes = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));

    console.log(`✓ Loaded types for ${productTypes.length} products`);

    return new Response(JSON.stringify(productTypes), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error: any) {
    console.error('Error loading product types:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to load product types', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
