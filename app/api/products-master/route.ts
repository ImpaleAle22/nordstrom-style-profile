/**
 * Products MASTER API
 * Loads products-MASTER-SOURCE-OF-TRUTH.json
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const masterPath = join(process.cwd(), '../scripts/products-MASTER-SOURCE-OF-TRUTH.json');
    const data = readFileSync(masterPath, 'utf-8');
    const products = JSON.parse(data);

    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to load products MASTER:', error);
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    );
  }
}
