#!/usr/bin/env node
/**
 * Export CLIP-ready products from Supabase
 * Filters out beauty, home goods, and other non-outfit-eligible items
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

async function exportProducts() {
  console.log('🔍 Fetching outfit-eligible products from Supabase...');

  let allProducts = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    console.log(`  Fetching batch ${Math.floor(offset / batchSize) + 1} (offset: ${offset})...`);

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
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allProducts.push(...data);
    offset += batchSize;

    console.log(`  ✅ Fetched ${data.length} products (total: ${allProducts.length})`);

    if (data.length < batchSize) {
      break; // Last batch
    }
  }

  console.log('');
  console.log('📊 Product Statistics:');
  console.log('  Total products:', allProducts.length);

  // Count by type
  const typeCounts = {};
  let withImages = 0;
  let withEmbeddings = 0;

  allProducts.forEach(p => {
    const type = p.product_type_1 || 'Unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    if (p.image_url || p.r2_image_url) withImages++;
    if (p.embedding_flat) withEmbeddings++;
  });

  console.log('  With images:', withImages);
  console.log('  With embeddings:', withEmbeddings);
  console.log('');
  console.log('  Top product types:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([type, count]) => {
      console.log(`    ${count.toString().padStart(6)} ${type}`);
    });

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

  // Save to file
  const outputPath = path.join(__dirname, 'products-clip-supabase.json');
  console.log('');
  console.log('💾 Writing to:', outputPath);

  fs.writeFileSync(outputPath, JSON.stringify(clipProducts, null, 2));

  const fileSize = fs.statSync(outputPath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log('  ✅ Saved:', `${fileSizeMB} MB`);
  console.log('');
  console.log('🎉 Export complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Upload to Hugging Face Space or R2');
  console.log('  2. Update CLIP service to use this file');
  console.log('  3. Redeploy CLIP service');
}

exportProducts().catch(console.error);
