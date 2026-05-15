#!/usr/bin/env node
/**
 * Fix bag categorization in Supabase
 * Move products with "bag" in title from Accessories/Bottoms/etc to Bags category
 */

const { createClient } = require('@supabase/supabase-js');

// Bypass SSL issues in dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function fixBagCategories() {
  console.log('🔍 Finding bag products in Supabase...\n');

  // Fetch all products with "bag" in title or type fields
  const { data: products, error } = await supabase
    .from('products')
    .select('product_id, title, product_type_1, product_type_2, product_type_3, product_type_4')
    .or(
      'title.ilike.%bag%,' +
      'product_type_2.ilike.%bag%,' +
      'product_type_3.ilike.%bag%,' +
      'product_type_4.ilike.%bag%'
    );

  if (error) {
    console.error('❌ Error fetching:', error);
    return;
  }

  console.log(`Found ${products.length} products with "bag" in title or types\n`);

  // Filter to only those NOT already categorized as Bags
  const toUpdate = products.filter(p => p.product_type_1 !== 'Bags');

  console.log(`${toUpdate.length} need to be recategorized\n`);

  // Show breakdown
  const currentCategories = {};
  toUpdate.forEach(p => {
    const cat = p.product_type_1 || 'null';
    currentCategories[cat] = (currentCategories[cat] || 0) + 1;
  });

  console.log('Current categories:');
  Object.entries(currentCategories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${count.toString().padStart(5)} ${cat}`);
  });

  console.log('\n');
  console.log('Sample products to update:');
  toUpdate.slice(0, 10).forEach(p => {
    console.log(`  - ${p.title} (${p.product_type_1} → Bags)`);
  });

  console.log('\n');
  console.log('⚠️  This will update product_type_1 to "Bags" for these products.');
  console.log('⚠️  Press Ctrl+C to cancel, or press Enter to continue...');

  // Wait for user confirmation
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  console.log('\n🔄 Updating categories...\n');

  // Update in batches
  let updated = 0;
  const batchSize = 100;

  for (let i = 0; i < toUpdate.length; i += batchSize) {
    const batch = toUpdate.slice(i, i + batchSize);
    const ids = batch.map(p => p.product_id);

    const { error: updateError } = await supabase
      .from('products')
      .update({ product_type_1: 'Bags' })
      .in('product_id', ids);

    if (updateError) {
      console.error('❌ Error updating batch:', updateError);
      break;
    }

    updated += batch.length;
    console.log(`  ✅ Updated ${updated}/${toUpdate.length} products`);
  }

  console.log('\n🎉 Category update complete!');
  console.log('\nNext steps:');
  console.log('  1. Re-run export script to get updated data');
  console.log('  2. Upload to GitHub releases');
  console.log('  3. Update HF Space');
}

fixBagCategories().catch(console.error);
