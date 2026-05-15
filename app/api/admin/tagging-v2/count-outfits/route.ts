/**
 * Count Outfits API
 *
 * Returns count of outfits matching product filters
 * Used for displaying "X outfits match" in the UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters } = body;

    // Query products with filters
    let productQuery = supabase
      .from('products')
      .select('product_id');

    // Build flat OR conditions
    const orConditions: string[] = [];

    // Product types
    if (filters.productTypes?.length > 0) {
      filters.productTypes.forEach((type: string) => {
        orConditions.push(`product_type_1.eq.${type}`);
        orConditions.push(`product_type_2.eq.${type}`);
        orConditions.push(`product_type_3.eq.${type}`);
      });
    }

    // Colors (JSONB array - use contains with array syntax)
    if (filters.colors?.length > 0) {
      filters.colors.forEach((color: string) => {
        // Use square brackets for JSON arrays
        orConditions.push(`colors.cs.[${JSON.stringify(color)}]`);
      });
    }

    // Materials (JSONB array - use contains with array syntax)
    if (filters.materials?.length > 0) {
      filters.materials.forEach((material: string) => {
        // Use square brackets for JSON arrays
        orConditions.push(`materials.cs.[${JSON.stringify(material)}]`);
      });
    }

    // Patterns
    if (filters.patterns?.length > 0) {
      filters.patterns.forEach((p: string) => {
        orConditions.push(`vision_metadata->pattern.eq.${p}`);
      });
    }

    // Denim washes
    if (filters.denimWashes?.length > 0) {
      filters.denimWashes.forEach((w: string) => {
        orConditions.push(`vision_metadata->denimWash.eq.${w}`);
      });
    }

    // Department (separate AND condition)
    if (filters.department && filters.department !== 'all') {
      productQuery = productQuery.eq('department', filters.department);
    }

    // Apply flat OR conditions
    if (orConditions.length > 0) {
      productQuery = productQuery.or(orConditions.join(','));
    }

    const { data: products, error: productError } = await productQuery;

    if (productError) {
      throw productError;
    }

    const productIds = (products || []).map((p: any) => p.product_id);

    if (productIds.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Query outfits containing these products
    let outfitQuery = supabase
      .from('outfits')
      .select('id, items, attributes', { count: 'exact', head: false })
      .limit(5000);

    if (filters.excludeTagged) {
      outfitQuery = outfitQuery.or(`attributes->taggerVersion.is.null,attributes->taggerVersion.neq.v2`);
    }

    const { data: outfits, error: countError } = await outfitQuery;

    if (countError) {
      throw countError;
    }

    // Filter outfits that contain at least one matching product
    const matchingOutfits = (outfits || []).filter((outfit: any) => {
      const items = outfit.items || [];
      return items.some((item: any) => {
        const itemProductId = item.product_id || item.product?.id;
        return productIds.includes(itemProductId);
      });
    });

    return NextResponse.json({ count: matchingOutfits.length });

  } catch (error: any) {
    console.error('Error counting outfits:', error);
    return NextResponse.json({
      error: 'Failed to count outfits',
      details: error.message,
    }, { status: 500 });
  }
}
