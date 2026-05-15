#!/usr/bin/env node
/**
 * Export remaining CLIP products from Supabase using cursor-based pagination
 * Much faster than offset-based queries
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Bypass SSL issues in dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function exportRemainingProducts() {
  console.log('🔍 Fetching remaining products from Supabase (cursor-based)...');

  // Load existing products to find where to start
  const existingPath = path.join(__dirname, 'products-clip-supabase.json');
  let existingProducts = [];
  let lastProductId = null;

  if (fs.existsSync(existingPath)) {
    existingProducts = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    console.log('  Existing products:', existingProducts.length);

    // Find the last product_id to start after
    if (existingProducts.length > 0) {
      lastProductId = existingProducts[existingProducts.length - 1].productId;
      console.log('  Last product ID:', lastProductId);
    }
  }

  let allNewProducts = [];
  const batchSize = 500; // Smaller batches for reliability
  let currentId = lastProductId;
  let batchNum = 1;

  console.log('');
  console.log('Starting fetch...\n');

  while (true) {
    console.log(`  Batch ${batchNum} (after ID: ${currentId || 'start'})...`);

    try {
      let query = supabase
        .from('products')
        .select(`
          product_id,
          title,
          brand,
          price,
          department,
          gender,
          product_type_1,
          product_type_2,
          product_type_3,
          product_type_4,
          simplified_colors,
          colors,
          image_url,
          r2_image_url,
          materials,
          patterns,
          occasions,
          seasons,
          vibes,
          style_pillars,
          vision_metadata,
          embedding_flat,
          is_outfit_eligible
        `)
        .eq('is_outfit_eligible', true)
        .not('embedding_flat', 'is', null)
        .order('product_id', { ascending: true })
        .limit(batchSize);

      // Use cursor pagination if we have a starting point
      if (currentId) {
        query = query.gt('product_id', currentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error:', error.message);
        break;
      }

      if (!data || data.length === 0) {
        console.log('\n✅ No more products - complete!');
        break;
      }

      allNewProducts.push(...data);
      currentId = data[data.length - 1].product_id;

      console.log(`  ✅ Fetched ${data.length} (total new: ${allNewProducts.length})`);

      batchNum++;

      if (data.length < batchSize) {
        console.log('\n✅ Last batch - complete!');
        break;
      }

      // Small delay to be nice to Supabase
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error('❌ Exception:', err.message);
      break;
    }
  }

  console.log('');
  console.log('📊 Statistics:');
  console.log('  Existing products:', existingProducts.length);
  console.log('  New products:', allNewProducts.length);
  console.log('  Total:', existingProducts.length + allNewProducts.length);

  // Transform new products to CLIP format
  console.log('');
  console.log('🔄 Transforming new products...');

  const clipProducts = allNewProducts.map(p => ({
    productId: p.product_id,
    title: p.title,
    brand: p.brand,
    price: p.price,
    department: p.department,
    gender: p.gender,
    productType1: p.product_type_1,
    productType2: p.product_type_2,
    productType3: p.product_type_3,
    productType4: p.product_type_4,
    simplifiedColors: p.simplified_colors || [],
    colors: p.colors,
    imageUrl: p.image_url || p.r2_image_url,
    materials: p.materials || [],
    patterns: p.patterns || [],
    occasions: p.occasions || [],
    seasons: p.seasons || [],
    vibes: p.vibes || [],
    stylePillars: p.style_pillars || [],
    visionMetadata: p.vision_metadata || {},
    embeddingFlat: p.embedding_flat,
  }));

  // Merge
  const mergedProducts = [...existingProducts, ...clipProducts];

  // Count by type
  const typeCounts = {};
  mergedProducts.forEach(p => {
    const type = p.productType1 || 'Unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  console.log('');
  console.log('  Product breakdown:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([type, count]) => {
      console.log(`    ${count.toString().padStart(6)} ${type}`);
    });

  // Save merged file
  const outputPath = path.join(__dirname, 'products-clip-supabase-complete.json');
  console.log('');
  console.log('💾 Writing complete file...');

  fs.writeFileSync(outputPath, JSON.stringify(mergedProducts, null, 2));

  const fileSize = fs.statSync(outputPath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log('  ✅ Saved:', `${fileSizeMB} MB`);
  console.log('');
  console.log('🎉 Complete dataset ready!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Upload to GitHub releases');
  console.log('  2. Update HF Space PRODUCTS_URL');
}

exportRemainingProducts().catch(console.error);
