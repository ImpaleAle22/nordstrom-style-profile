#!/usr/bin/env node
/**
 * Deduplicate products in Supabase
 * Keeps first occurrence of each product_id, deletes subsequent duplicates
 */

const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function deduplicateSupabase() {
  console.log('🔍 Finding duplicates in Supabase...\n');

  // Find all product_ids with duplicates
  const { data: duplicates, error: dupError } = await supabase
    .rpc('find_duplicate_products');

  if (dupError) {
    console.error('❌ Error finding duplicates:', dupError);
    console.log('\n⚠️  Creating RPC function...');

    // Create the RPC function if it doesn't exist
    console.log('\nRun this SQL in Supabase SQL Editor:');
    console.log(`
CREATE OR REPLACE FUNCTION find_duplicate_products()
RETURNS TABLE (product_id TEXT, duplicate_count BIGINT)
LANGUAGE SQL
AS $$
  SELECT product_id, COUNT(*) as duplicate_count
  FROM products
  GROUP BY product_id
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
$$;
    `);
    console.log('\nThen run this script again.');
    return;
  }

  if (!duplicates || duplicates.length === 0) {
    console.log('✅ No duplicates found! Database is clean.');
    return;
  }

  console.log(`Found ${duplicates.length} product_ids with duplicates\n`);
  console.log('Top 10 duplicates:');
  duplicates.slice(0, 10).forEach(dup => {
    console.log(`  ${dup.product_id}: ${dup.duplicate_count} copies`);
  });

  const totalDuplicates = duplicates.reduce((sum, dup) => sum + (dup.duplicate_count - 1), 0);
  console.log(`\nTotal duplicate records to remove: ${totalDuplicates}`);

  console.log('\n' + '='.repeat(70));
  console.log('⚠️  WARNING: This will DELETE duplicate records from Supabase!');
  console.log('='.repeat(70));
  console.log('\nStrategy: Keep the FIRST occurrence (lowest internal ID), delete others');
  console.log('\nPress Ctrl+C to cancel, or press Enter to continue...');

  // Wait for confirmation
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  console.log('\n🗑️  Removing duplicates...\n');

  let removedCount = 0;

  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < duplicates.length; i += batchSize) {
    const batch = duplicates.slice(i, i + batchSize);

    for (const dup of batch) {
      // Get all records for this product_id, ordered by internal ID
      const { data: records, error: fetchError } = await supabase
        .from('products')
        .select('id, product_id')
        .eq('product_id', dup.product_id)
        .order('id', { ascending: true });

      if (fetchError || !records || records.length < 2) {
        console.log(`  ⚠️  Skipping ${dup.product_id}: ${fetchError?.message || 'not found'}`);
        continue;
      }

      // Keep first, delete rest
      const toDelete = records.slice(1).map(r => r.id);

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', toDelete);

      if (deleteError) {
        console.error(`  ❌ Error deleting ${dup.product_id}:`, deleteError.message);
      } else {
        removedCount += toDelete.length;
        console.log(`  ✅ ${dup.product_id}: removed ${toDelete.length} duplicate(s)`);
      }
    }

    console.log(`  Progress: ${Math.min(i + batchSize, duplicates.length)}/${duplicates.length} product IDs processed\n`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 Deduplication complete!`);
  console.log('='.repeat(70));
  console.log(`\nRecords removed: ${removedCount}`);
  console.log(`Unique products remaining: ~${49736 - removedCount}\n`);

  console.log('Next steps:');
  console.log('  1. Verify count: SELECT COUNT(*) FROM products;');
  console.log('  2. Check for remaining duplicates (should be 0):');
  console.log('     SELECT product_id, COUNT(*) FROM products GROUP BY product_id HAVING COUNT(*) > 1;');
  console.log('  3. Add unique constraint to prevent future duplicates:');
  console.log('     ALTER TABLE products ADD CONSTRAINT products_product_id_key UNIQUE (product_id);');
  console.log('  4. Re-export clean data for CLIP');
}

deduplicateSupabase().catch(console.error);
