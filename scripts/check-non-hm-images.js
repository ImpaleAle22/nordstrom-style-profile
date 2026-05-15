#!/usr/bin/env node
/**
 * Check if non-H&M products have flat-lay images in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function checkNonHMImages() {
  console.log('🔍 Checking non-H&M products for flat-lay images...\n');

  // Get non-H&M products
  const { data: products, error } = await supabase
    .from('products')
    .select('product_id, title, brand, image_url, r2_image_url, images, embedding_flat')
    .not('product_id', 'like', 'hm-kaggle-%')
    .eq('is_outfit_eligible', true)
    .not('embedding_flat', 'is', null)
    .limit(50);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${products.length} non-H&M products\n`);

  let withR2Flatlay = 0;
  let withImagesArray = 0;
  let withLocalPath = 0;
  let onlyExternal = 0;

  console.log('Sample products:\n');

  products.slice(0, 10).forEach((p, i) => {
    console.log(`${i + 1}. ${p.product_id} (${p.brand})`);
    console.log(`   Title: ${p.title}`);
    console.log(`   image_url: ${p.image_url?.substring(0, 60) || 'NULL'}`);
    console.log(`   r2_image_url: ${p.r2_image_url?.substring(0, 60) || 'NULL'}`);
    console.log(`   images array: ${p.images ? JSON.stringify(p.images.slice(0, 1)) : 'NULL'}`);

    // Check if has R2 flat-lay
    if (p.r2_image_url && p.r2_image_url.includes('r2.dev')) {
      withR2Flatlay++;
      console.log(`   ✅ Has R2 flat-lay URL`);
    }

    // Check images array
    if (p.images && p.images.length > 0) {
      withImagesArray++;
      const hasLocalPath = p.images.some(img => img.localImagePath);
      if (hasLocalPath) {
        withLocalPath++;
        console.log(`   ✅ Has localImagePath in images array`);
      }
    }

    if (!p.r2_image_url && (!p.images || p.images.length === 0)) {
      onlyExternal++;
      console.log(`   ❌ Only has external on-model images`);
    }

    console.log('');
  });

  console.log('='.repeat(70));
  console.log('SUMMARY (50 sample):');
  console.log('='.repeat(70));
  console.log(`  Total non-H&M: ${products.length}`);
  console.log(`  With R2 flat-lay: ${withR2Flatlay}`);
  console.log(`  With images array: ${withImagesArray}`);
  console.log(`  With localImagePath: ${withLocalPath}`);
  console.log(`  Only external images: ${onlyExternal}`);
  console.log('');

  // Check brands
  const brands = {};
  products.forEach(p => {
    brands[p.brand || 'Unknown'] = (brands[p.brand || 'Unknown'] || 0) + 1;
  });

  console.log('By Brand:');
  Object.entries(brands)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, count]) => {
      console.log(`  ${count.toString().padStart(3)} ${brand}`);
    });
}

checkNonHMImages().catch(console.error);
