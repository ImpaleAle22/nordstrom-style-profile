import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const department = searchParams.get('department');
    const productType = searchParams.get('productType');
    const aiTagged = searchParams.get('aiTagged');
    const search = searchParams.get('search')?.toLowerCase();

    console.log(`API called: page=${page}, limit=${limit}, filters:`, { department, productType, aiTagged, search });

    // Start with base query
    let query = supabase
      .from('products')
      .select('id, title, brand, price, department, image_url, r2_image_url, colors, materials, product_type_1, product_type_2, product_type_3, product_type_4, vision_metadata', { count: 'exact' });

    // Apply filters
    if (department && department !== 'all') {
      query = query.eq('department', department);
    }

    if (productType && productType !== 'all') {
      query = query.eq('product_type_1', productType);
    }

    if (aiTagged === 'true') {
      query = query.not('vision_metadata', 'is', null);
    } else if (aiTagged === 'false') {
      query = query.is('vision_metadata', null);
    }

    if (search) {
      // Search across multiple fields
      query = query.or(`title.ilike.%${search}%,brand.ilike.%${search}%,product_type_1.ilike.%${search}%,product_type_2.ilike.%${search}%`);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }

    // Transform to match frontend expectations
    const products = (data || []).map(p => ({
      productId: p.id,
      title: p.title,
      brand: p.brand,
      price: p.price,
      department: p.department,
      imageUrl: p.image_url || p.r2_image_url || '', // Fallback logic
      colors: p.colors,
      materials: p.materials,
      productType1: p.product_type_1,
      productType2: p.product_type_2,
      productType3: p.product_type_3,
      productType4: p.product_type_4,
      visionMetadata: p.vision_metadata,
    }));

    const total = count || 0;

    console.log(`Returned ${products.length} products for page ${page} of ${Math.ceil(total / limit)}`);

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
