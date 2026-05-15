/**
 * Product Values API
 *
 * Returns available product attributes for filtering:
 * - Product types (from product_type_1, product_type_2, product_type_3)
 * - Colors (from colors array)
 * - Materials (from materials array)
 * - Patterns (from vision_metadata)
 * - Denim washes (from vision_metadata)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // Fetch distinct product types without vision_metadata (can have invalid JSON)
    const { data: products, error } = await supabase
      .from('products')
      .select('product_type_1, product_type_2, product_type_3, colors, materials');

    if (error) {
      throw error;
    }

    // Aggregate distinct values
    const productTypes = new Set<string>();
    const colors = new Set<string>();
    const materials = new Set<string>();
    const patterns = new Set<string>();
    const denimWashes = new Set<string>();

    (products || []).forEach((product: any) => {
      // Product types
      if (product.product_type_1) productTypes.add(product.product_type_1);
      if (product.product_type_2) productTypes.add(product.product_type_2);
      if (product.product_type_3) productTypes.add(product.product_type_3);

      // Colors (array)
      if (Array.isArray(product.colors)) {
        product.colors.forEach((c: string) => colors.add(c));
      }

      // Materials (array)
      if (Array.isArray(product.materials)) {
        product.materials.forEach((m: string) => materials.add(m));
      }
    });

    // Note: Patterns and denim washes are in vision_metadata which may have invalid JSON
    // For now, we'll skip those to avoid JSON parse errors
    // TODO: Clean up vision_metadata column in database

    // Sort and return
    const result = {
      productTypes: Array.from(productTypes).sort(),
      colors: Array.from(colors).sort(),
      materials: Array.from(materials).sort(),
      patterns: Array.from(patterns).sort(),
      denimWashes: Array.from(denimWashes).sort(),
    };

    console.log(`Loaded product values:`, {
      productTypes: result.productTypes.length,
      colors: result.colors.length,
      materials: result.materials.length,
      patterns: result.patterns.length,
      denimWashes: result.denimWashes.length,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error loading product values:', error);
    return NextResponse.json({
      error: 'Failed to load product values',
      details: error.message,
    }, { status: 500 });
  }
}
