import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * API Route: Load Fixed Recipes
 * Reads the fixed recipes from scripts/unified-recipes.json
 */
export async function GET() {
  try {
    // Path to the fixed recipes file (using FIXED-v5: 357 recipes, includes 24 new manual recipes)
    const recipesPath = join(process.cwd(), '..', 'scripts', 'unified-recipes-FIXED-v5.json');

    // Read the file
    const fileContent = await readFile(recipesPath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Return the recipes
    return NextResponse.json({
      recipes: data.recipes,
      totalRecipes: data.totalRecipes,
      transformedAt: data.transformedAt,
      source: data.source,
    });
  } catch (error: any) {
    console.error('Failed to load recipes:', error);
    return NextResponse.json(
      { error: 'Failed to load recipes', message: error.message },
      { status: 500 }
    );
  }
}
