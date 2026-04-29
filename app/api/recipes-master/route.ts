/**
 * Recipes MASTER API
 * Loads recipes-MASTER.json
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const masterPath = join(process.cwd(), '../scripts/recipes-MASTER.json');
    const data = readFileSync(masterPath, 'utf-8');
    const recipes = JSON.parse(data);

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Failed to load recipes MASTER:', error);
    return NextResponse.json(
      { error: 'Failed to load recipes' },
      { status: 500 }
    );
  }
}
