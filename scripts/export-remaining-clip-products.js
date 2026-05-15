#!/usr/bin/env node
/**
 * Export remaining CLIP products from Supabase (starting at offset 25000)
 * Merges with existing file to create complete dataset
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
  console.log('🔍 Fetching remaining products from Supabase...');
  console.log('   Starting from offset 25,000\n');

  let allProducts = [];
  let offset = 25000; // Start where we left off
  const batchSize = 1000;

  while (true) {
    const batchNumber = Math.floor(offset / batchSize) + 1;
    console.log(`  Fetching batch ${batchNumber} (offset: ${offset})...`);

    try {
      const { data, error } = await supabase
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
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching:', error);
        console.log('\n⚠️  Stopping at offset:', offset);
        break;
      }

      if (!data || data.length === 0) {
        console.log('\n✅ Reached end of dataset');
        break;
      }

      allProducts.push(...data);
      offset += batchSize;

      console.log(`  ✅ Fetched ${data.length} products (total remaining: ${allProducts.length})`);

      if (data.length < batchSize) {
        console.log('\n✅ Last batch - export complete');
        break;
      }
    } catch (err) {
      console.error('❌ Exception:', err.message);
      console.log('⚠️  Stopping at offset:', offset);
      break;
    }
  }

  console.log('');
  console.log('📊 Statistics:');
  console.log('  New products fetched:', allProducts.length);

  // Transform to CLIP format
  console.log('');
  console.log('🔄 Transforming to CLIP format...');

  const clipProducts = allProducts.map(p => ({
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

  // Load existing file
  const existingPath = path.join(__dirname, 'products-clip-supabase.json');
  console.log('');
  console.log('📂 Loading existing file...');

  let existingProducts = [];
  if (fs.existsSync(existingPath)) {
    existingProducts = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    console.log('  Existing products:', existingProducts.length);
  }

  // Merge
  const mergedProducts = [...existingProducts, ...clipProducts];
  console.log('  Total after merge:', mergedProducts.length);

  // Save merged file
  const outputPath = path.join(__dirname, 'products-clip-supabase-complete.json');
  console.log('');
  console.log('💾 Writing merged file to:', outputPath);

  fs.writeFileSync(outputPath, JSON.stringify(mergedProducts, null, 2));

  const fileSize = fs.statSync(outputPath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log('  ✅ Saved:', `${fileSizeMB} MB`);
  console.log('');
  console.log('🎉 Export complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Upload to GitHub releases as v1.2-products-complete');
  console.log('  2. Update HF Space PRODUCTS_URL');
  console.log('  3. Test with full 49K+ products');
}

exportRemainingProducts().catch(console.error);
