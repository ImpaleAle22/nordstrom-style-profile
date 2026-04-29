/**
 * Transaction Data API
 *
 * Serves transaction/engagement data separately from product data.
 * Supports batch lookup and bulk loading for cache warming.
 *
 * Data separation principle: Products contain only product attributes.
 * Transaction data lives here and is accessed via ID references.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Transaction data structure
interface TransactionData {
  transactionCount: number;
  uniqueCustomers: number;
  avgPurchaseFrequency: number;
  customerSegments: {
    age: {
      '<25': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
    };
    engagement: {
      regular: number;
      monthly: number;
      none: number;
    };
  };
  seasonalTrend: {
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  synthetic?: boolean;
}

interface TransactionDataFile {
  generatedAt: string;
  totalProducts: number;
  dataSource: string;
  products: Record<string, TransactionData>;
}

// Load transaction data at module level (cached across requests)
let transactionDataCache: Map<string, TransactionData> | null = null;
let loadError: string | null = null;

function loadTransactionData(): Map<string, TransactionData> {
  if (transactionDataCache) {
    return transactionDataCache;
  }

  try {
    const filePath = path.join(process.cwd(), '..', 'scripts', 'hm-transaction-stats.json');
    console.log(`[Transaction API] Loading from: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: TransactionDataFile = JSON.parse(fileContent);

    // Convert to Map for O(1) lookup
    transactionDataCache = new Map(Object.entries(data.products));

    console.log(`[Transaction API] ✓ Loaded ${transactionDataCache.size} products (${(fileContent.length / 1024 / 1024).toFixed(1)}MB)`);

    return transactionDataCache;
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Transaction API] Failed to load transaction data:', loadError);
    throw new Error(`Failed to load transaction data: ${loadError}`);
  }
}

/**
 * GET /api/transaction-data
 *
 * Query modes:
 * 1. Batch lookup: ?productIds=id1,id2,id3 (comma-separated)
 * 2. Bulk load: ?limit=1000&offset=0 (for cache warming)
 */
export async function GET(request: NextRequest) {
  try {
    // Load data (cached after first load)
    const data = loadTransactionData();

    const { searchParams } = new URL(request.url);
    const productIdsParam = searchParams.get('productIds');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Mode 1: Batch lookup by IDs
    if (productIdsParam) {
      const productIds = productIdsParam.split(',').map(id => id.trim());

      const result: Record<string, TransactionData | null> = {};
      let found = 0;
      let missing = 0;

      for (const productId of productIds) {
        const txData = data.get(productId);
        if (txData) {
          result[productId] = txData;
          found++;
        } else {
          result[productId] = null;
          missing++;
        }
      }

      return NextResponse.json({
        success: true,
        count: productIds.length,
        found,
        missing,
        data: result,
      });
    }

    // Mode 2: Bulk load (for cache warming)
    if (limitParam !== null) {
      const limit = parseInt(limitParam, 10) || 100;
      const offset = parseInt(offsetParam || '0', 10);

      // Convert Map to array for pagination
      const allEntries = Array.from(data.entries());
      const slice = allEntries.slice(offset, offset + limit);

      const result: Record<string, TransactionData> = {};
      for (const [productId, txData] of slice) {
        result[productId] = txData;
      }

      return NextResponse.json({
        success: true,
        count: slice.length,
        offset,
        nextOffset: offset + slice.length < allEntries.length ? offset + slice.length : null,
        totalAvailable: allEntries.length,
        data: result,
      });
    }

    // No valid params
    return NextResponse.json({
      success: false,
      error: 'Invalid request. Use ?productIds=id1,id2,id3 or ?limit=100&offset=0',
      usage: {
        batchLookup: '/api/transaction-data?productIds=hm-0715624001,hm-0706016001',
        bulkLoad: '/api/transaction-data?limit=1000&offset=0',
      },
    }, { status: 400 });

  } catch (error) {
    console.error('[Transaction API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/transaction-data/health
 * Check if transaction data is loaded
 */
export async function HEAD() {
  try {
    const data = loadTransactionData();
    return NextResponse.json({
      success: true,
      loaded: true,
      productCount: data.size,
      cacheSize: `${(JSON.stringify(Array.from(data.entries())).length / 1024 / 1024).toFixed(1)}MB`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      loaded: false,
      error: loadError || 'Unknown error',
    }, { status: 500 });
  }
}
