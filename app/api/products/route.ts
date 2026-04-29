import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);

// Cache the total count and file mtime to avoid recounting on every request
let cachedTotal: number | null = null;
let cachedMtime: number | null = null;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const department = searchParams.get('department');
    const productType = searchParams.get('productType');
    const aiTagged = searchParams.get('aiTagged');
    const search = searchParams.get('search')?.toLowerCase();

    const filePath = '/Users/hqh4/claude/edit-engine/scripts/products-MASTER-SOURCE-OF-TRUTH.json';

    console.log(`API called: page=${page}, limit=${limit}, filters:`, { department, productType, aiTagged, search });

    // Check if file has been modified
    const stats = fs.statSync(filePath);
    const currentMtime = stats.mtimeMs;

    // Use jq to slice and filter the JSON array efficiently
    const startIndex = (page - 1) * limit;

    // Build jq filter
    let jqFilter = '.';

    // Apply filters
    const conditions: string[] = [];

    if (department && department !== 'all') {
      conditions.push(`.department == "${department}"`);
    }

    if (productType && productType !== 'all') {
      conditions.push(`.productType1 == "${productType}"`);
    }

    if (aiTagged === 'true') {
      conditions.push('.visionMetadata != null');
    } else if (aiTagged === 'false') {
      conditions.push('.visionMetadata == null');
    }

    if (search) {
      const escapedSearch = search.replace(/"/g, '\\"');
      conditions.push(`(.title, .brand, .productType1, .productType2) | tostring | ascii_downcase | contains("${escapedSearch}")`);
    }

    if (conditions.length > 0) {
      jqFilter = `[.[] | select(${conditions.join(' and ')})]`;
    }

    let total: number;

    // Only get count if:
    // 1. We have filters (can't cache filtered counts)
    // 2. File has been modified since last cache
    // 3. We don't have a cached count yet
    if (conditions.length > 0 || cachedTotal === null || cachedMtime !== currentMtime) {
      console.log('Getting count from jq...');
      const countCmd = `jq -c '${jqFilter} | length' "${filePath}"`;
      const { stdout: countOut } = await execPromise(countCmd, { maxBuffer: 10 * 1024 * 1024 });
      total = parseInt(countOut.trim());

      // Cache if no filters
      if (conditions.length === 0) {
        cachedTotal = total;
        cachedMtime = currentMtime;
        console.log(`Cached total count: ${total}`);
      }
    } else {
      // Use cached count
      total = cachedTotal;
      console.log(`Using cached total: ${total}`);
    }

    // Get paginated slice with imageUrl extracted
    console.log('Getting product slice...');
    const sliceCmd = `jq -c '${jqFilter} | .[${startIndex}:${startIndex + limit}] | map(. + {imageUrl: (.images[0].url // "")})' "${filePath}"`;

    const { stdout: productsOut } = await execPromise(sliceCmd, { maxBuffer: 50 * 1024 * 1024 });
    const products = JSON.parse(productsOut);

    console.log(`Returned ${products.length} products for page ${page}`);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalProducts: total,
        filteredProducts: total,
      }
    });

  } catch (error) {
    console.error('Error loading products:', error);
    return NextResponse.json(
      { error: `Failed to load products: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
