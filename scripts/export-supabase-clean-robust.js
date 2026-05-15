#!/usr/bin/env node
/**
 * ROBUST export from Supabase - handles failures, saves progress, resumes
 * Uses cursor-based pagination to avoid limits
 * Filters out Kids products during export
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

// Progress file for resuming
const PROGRESS_FILE = path.join(__dirname, 'export-progress.json');
const OUTPUT_FILE = path.join(__dirname, 'products-supabase-clean.json');
const BATCH_SIZE = 500; // Smaller batches for reliability
const SAVE_EVERY = 5; // Save to disk every 5 batches

async function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`📂 Resuming from previous export...`);
    console.log(`   Last ID: ${progress.lastProductId}`);
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

  // Clean up progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

async function exportClean() {
  console.log('🚀 ROBUST SUPABASE EXPORT');
  console.log('='.repeat(70));
  console.log('Features:');
  console.log('  ✅ Cursor-based pagination (no offset limits)');
  console.log('  ✅ Incremental saves (resume on failure)');
  console.log('  ✅ Filters out Kids products');
  console.log('  ✅ Small batch size (500) for reliability');
  console.log('='.repeat(70));
  console.log('');

  const progress = await loadProgress();
  let { lastProductId, products, batchNum } = progress;

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  while (true) {
    batchNum++;

    try {
      // Build query with cursor pagination
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
        .limit(BATCH_SIZE);

      // Cursor pagination: start after last ID
      if (lastProductId) {
        query = query.gt('product_id', lastProductId);
      }

      const { data, error } = await query;

      if (error) {
        consecutiveErrors++;
        console.error(`\n❌ Batch ${batchNum} error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`\n💥 Too many consecutive errors. Stopping.`);
          console.log(`   Exported ${products.length} products before failure.`);
          saveProgress({ lastProductId, products, batchNum });
          console.log(`   Progress saved. Run script again to resume.\n`);
          return;
        }

        // Wait before retry
        console.log(`   Waiting 5 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Reset error counter on success
      consecutiveErrors = 0;

      if (!data || data.length === 0) {
        console.log(`\n✅ Reached end of dataset`);
        break;
      }

      // Filter out Kids products
      const filtered = data.filter(p => {
        const dept = (p.department || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        return !dept.includes('kid') && !brand.includes('kidswear');
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

      products.push(...clipProducts);
      lastProductId = data[data.length - 1].product_id;

      console.log(`  Batch ${batchNum}: ${data.length} fetched, ${kidsFiltered} kids filtered, ${clipProducts.length} added (total: ${products.length})`);

      // Save progress periodically
      if (batchNum % SAVE_EVERY === 0) {
        saveProgress({ lastProductId, products, batchNum });
        console.log(`  💾 Progress saved (batch ${batchNum})`);
      }

      // Check if last batch
      if (data.length < BATCH_SIZE) {
        console.log(`\n✅ Last batch received`);
        break;
      }

      // Small delay to be nice to Supabase
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      consecutiveErrors++;
      console.error(`\n❌ Exception in batch ${batchNum} (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err.message);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`\n💥 Too many consecutive errors. Stopping.`);
        saveProgress({ lastProductId, products, batchNum });
        console.log(`   Progress saved. Run script again to resume.\n`);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('📊 EXPORT COMPLETE');
  console.log('='.repeat(70));
  console.log(`  Total products: ${products.length}`);

  // Count by department
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

  // Count by type
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

  // Save final file
  saveFinalFile(products);

  console.log('');
  console.log('🎉 Export successful!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Upload products-supabase-clean.json to GitHub releases');
  console.log('  2. Update HF Space PRODUCTS_URL');
  console.log('  3. Test CLIP search');
}

exportClean().catch(err => {
  console.error('\n💥 Fatal error:', err);
  console.log('Progress should be saved. Run script again to resume.\n');
});
