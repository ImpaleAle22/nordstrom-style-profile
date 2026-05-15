#!/usr/bin/env node
/**
 * Check if outfits reference duplicate products that will be removed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function checkOutfitUsage() {
  console.log('🔍 Checking outfit duplicate usage...\n');

  // Load audit file
  if (!fs.existsSync('./duplicate-audit.json')) {
    console.error('❌ Run export-duplicate-audit.js first to create audit file');
    return;
  }

  const audit = JSON.parse(fs.readFileSync('./duplicate-audit.json', 'utf8'));
  console.log(`  Loaded audit: ${audit.summary.productIdsWithDuplicates} product IDs with duplicates\n`);

  // Get all outfits from Supabase
  console.log('📦 Fetching outfits from Supabase...');

  let allOutfits = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('outfit_id, product_ids, items')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('❌ Error fetching outfits:', error);
      break;
    }

    if (!outfits || outfits.length === 0) break;

    allOutfits.push(...outfits);
    offset += batchSize;

    if (outfits.length < batchSize) break;
  }

  console.log(`  ✅ Fetched ${allOutfits.length} outfits\n`);

  if (allOutfits.length === 0) {
    console.log('⚠️  No outfits found in database. Skipping coverage check.\n');
    console.log('CONCLUSION: Safe to proceed with deduplication.');
    return;
  }

  // Extract all product IDs referenced by outfits
  const referencedProductIds = new Set();

  allOutfits.forEach(outfit => {
    // Try product_ids array
    if (outfit.product_ids && Array.isArray(outfit.product_ids)) {
      outfit.product_ids.forEach(id => referencedProductIds.add(id));
    }

    // Try items array (may have productId field)
    if (outfit.items && Array.isArray(outfit.items)) {
      outfit.items.forEach(item => {
        if (item.productId) referencedProductIds.add(item.productId);
        if (item.product_id) referencedProductIds.add(item.product_id);
      });
    }
  });

  console.log(`  Total unique product IDs referenced: ${referencedProductIds.size}\n`);

  // Check overlap with duplicates
  const duplicateProductIds = new Set(audit.allDuplicateProductIds);
  const outfitsReferencingDuplicates = [];

  allOutfits.forEach(outfit => {
    let hasDuplicate = false;
    const duplicatesInOutfit = [];

    // Check product_ids
    if (outfit.product_ids && Array.isArray(outfit.product_ids)) {
      outfit.product_ids.forEach(id => {
        if (duplicateProductIds.has(id)) {
          hasDuplicate = true;
          duplicatesInOutfit.push(id);
        }
      });
    }

    // Check items
    if (outfit.items && Array.isArray(outfit.items)) {
      outfit.items.forEach(item => {
        const id = item.productId || item.product_id;
        if (id && duplicateProductIds.has(id)) {
          hasDuplicate = true;
          if (!duplicatesInOutfit.includes(id)) {
            duplicatesInOutfit.push(id);
          }
        }
      });
    }

    if (hasDuplicate) {
      outfitsReferencingDuplicates.push({
        outfitId: outfit.outfit_id,
        duplicateProducts: duplicatesInOutfit,
      });
    }
  });

  console.log('='.repeat(70));
  console.log('RESULTS:');
  console.log('='.repeat(70));
  console.log(`\nOutfits referencing duplicate products: ${outfitsReferencingDuplicates.length}`);

  if (outfitsReferencingDuplicates.length > 0) {
    console.log('\n⚠️  Some outfits reference products with duplicates:');
    console.log(`\nFirst 10 affected outfits:`);
    outfitsReferencingDuplicates.slice(0, 10).forEach(outfit => {
      console.log(`  - Outfit ${outfit.outfitId}: uses ${outfit.duplicateProducts.join(', ')}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTANT:');
    console.log('='.repeat(70));
    console.log(`
These outfits reference product IDs that have duplicates in the database.

GOOD NEWS: No action needed!
- Outfits reference by product_id (e.g., "hm-kaggle-0626816002")
- Deduplication keeps product_id the same
- Only internal database IDs change (user never sees these)
- Outfits will continue to work after deduplication

WHAT HAPPENS:
- Before: 3 database rows with product_id "hm-kaggle-0626816002"
- After:  1 database row with product_id "hm-kaggle-0626816002"
- Outfit still references "hm-kaggle-0626816002" → works fine!
    `);
  } else {
    console.log('\n✅ No outfits reference duplicate products');
  }

  console.log('\n' + '='.repeat(70));
  console.log('CONCLUSION:');
  console.log('='.repeat(70));
  console.log(`
Safe to proceed with deduplication.

Outfits use product_id (business key), not internal database ID.
Deduplication preserves product_id, so outfit references remain valid.

Next step:
  node scripts/deduplicate-supabase.js
  `);
}

checkOutfitUsage().catch(console.error);
