#!/usr/bin/env node
/**
 * Final export: H&M products only
 * - All have R2 flat-lay images
 * - All have FashionSigLIP embeddings from flat-lay images
 * - No Kids products
 * - Consistent, clean dataset
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

const PROGRESS_FILE = path.join(__dirname, 'export-hm-progress.json');
const OUTPUT_FILE = path.join(__dirname, 'products-hm-only-final.json');
const BATCH_SIZE = 500;
const SAVE_EVERY = 5;

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`📂 Resuming from batch ${progress.batchNum}...`);
    console.log(`   Products so far: ${progress.products.length}\n`);
    return progress;
  }
  return { lastProductId: null, products: [], batchNum: 0 };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function saveFinalFile(products) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));
  const fileSize = fs.statSync(OUTPUT_FILE).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
  console.log(`\n💾 Final file saved: ${fileSizeMB} MB`);
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

async function exportHMOnly() {
  console.log('🚀 H&M ONLY EXPORT');
  console.log('='.repeat(70));
  console.log('Filtering:');
  console.log('  ✅ H&M products only (hm-kaggle-* product_ids)');
  console.log('  ✅ R2 flat-lay images only');
  console.log('  ✅ No Kids products');
  console.log('  ✅ Has embeddings');
  console.log('='.repeat(70));
  console.log('');

  const progress = loadProgress();
  let { lastProductId, products, batchNum } = progress;

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  while (true) {
    batchNum++;

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
        .like('product_id', 'hm-kaggle-%')
        .eq('is_outfit_eligible', true)
        .not('embedding_flat', 'is', null)
        .not('r2_image_url', 'is', null)
        .order('product_id', { ascending: true })
        .limit(BATCH_SIZE);

      if (lastProductId) {
        query = query.gt('product_id', lastProductId);
      }

      const { data, error } = await query;

      if (error) {
        consecutiveErrors++;
        console.error(`\n❌ Batch ${batchNum} error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`\n💥 Too many errors. Stopping.`);
          saveProgress({ lastProductId, products, batchNum });
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      consecutiveErrors = 0;

      if (!data || data.length === 0) {
        console.log(`\n✅ Reached end of dataset`);
        break;
      }

      // Filter out Kids
      const filtered = data.filter(p => {
        const dept = (p.department || '').toLowerCase();
        return !dept.includes('kid');
      });

      const kidsFiltered = data.length - filtered.length;

      // Transform to CLIP format
      const clipProducts = filtered.map(p => ({
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
        imageUrl: p.r2_image_url || p.image_url, // Prefer R2
        materials: p.materials || [],
        patterns: p.patterns || [],
        occasions: p.occasions || [],
        seasons: p.seasons || [],
        vibes: p.vibes || [],
        stylePillars: p.style_pillars || [],
        visionMetadata: p.vision_metadata || {},
        embeddingFlat: p.embedding_flat,
      }));

      products.push(...clipProducts);
      lastProductId = data[data.length - 1].product_id;

      console.log(`  Batch ${batchNum}: ${data.length} fetched, ${kidsFiltered} kids filtered, ${clipProducts.length} added (total: ${products.length})`);

      if (batchNum % SAVE_EVERY === 0) {
        saveProgress({ lastProductId, products, batchNum });
        console.log(`  💾 Progress saved`);
      }

      if (data.length < BATCH_SIZE) {
        console.log(`\n✅ Last batch`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      consecutiveErrors++;
      console.error(`\n❌ Exception (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err.message);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        saveProgress({ lastProductId, products, batchNum });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('📊 EXPORT COMPLETE');
  console.log('='.repeat(70));
  console.log(`  Total H&M products: ${products.length}`);

  const deptCounts = {};
  products.forEach(p => {
    const dept = p.department || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  console.log('\n  By Department:');
  Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => {
      const pct = ((count / products.length) * 100).toFixed(1);
      console.log(`    ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${dept}`);
    });

  const typeCounts = {};
  products.forEach(p => {
    const type = p.productType1 || 'Unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  console.log('\n  By Product Type:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([type, count]) => {
      console.log(`    ${count.toString().padStart(6)} ${type}`);
    });

  saveFinalFile(products);

  console.log('');
  console.log('🎉 H&M-only export complete!');
  console.log('');
  console.log('All products:');
  console.log('  ✅ Have R2 flat-lay images');
  console.log('  ✅ Have FashionSigLIP embeddings from those images');
  console.log('  ✅ Are outfit-eligible');
  console.log('  ✅ No Kids products');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Upload products-hm-only-final.json to GitHub releases as v2.0');
  console.log('  2. Update HF Space PRODUCTS_URL');
  console.log('  3. CLIP search should finally work correctly!');
}

exportHMOnly().catch(err => {
  console.error('\n💥 Fatal error:', err);
});
