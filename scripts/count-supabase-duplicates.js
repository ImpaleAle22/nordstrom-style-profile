#!/usr/bin/env node
/**
 * Count total products and duplicates in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function countDuplicates() {
  console.log('🔍 Counting Supabase products and duplicates...\n');

  // Get total count
  console.log('Step 1: Total count...');
  const { count: totalCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting:', countError);
    return;
  }

  console.log(`  Total products: ${totalCount}\n`);

  // Get all product_ids to check duplicates
  console.log('Step 2: Fetching all product_ids...');

  let allProductIds = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('product_id')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('❌ Error fetching:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allProductIds.push(...data.map(p => p.product_id));
    offset += batchSize;

    process.stdout.write(`\r  Fetched: ${allProductIds.length}...`);

    if (data.length < batchSize) break;
  }

  console.log(`\n  ✅ Fetched ${allProductIds.length} product IDs\n`);

  // Count duplicates
  console.log('Step 3: Analyzing duplicates...');

  const idCounts = {};
  allProductIds.forEach(id => {
    idCounts[id] = (idCounts[id] || 0) + 1;
  });

  const uniqueIds = Object.keys(idCounts).length;
  const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);
  const totalDuplicateRecords = duplicateIds.reduce((sum, [id, count]) => sum + (count - 1), 0);

  console.log('\n' + '='.repeat(70));
  console.log('RESULTS:');
  console.log('='.repeat(70));
  console.log(`
Total database records:     ${totalCount}
Unique product_ids:         ${uniqueIds}
Product_ids with duplicates: ${duplicateIds.length}
Duplicate records to remove: ${totalDuplicateRecords}

After deduplication:        ${uniqueIds} products
  `);

  // Show top duplicates
  console.log('Top 10 duplicates:');
  duplicateIds
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([id, count]) => {
      console.log(`  ${id}: ${count} copies`);
    });

  console.log('\n' + '='.repeat(70));
  console.log('DUPLICATE BREAKDOWN:');
  console.log('='.repeat(70));

  const dupCounts = {};
  duplicateIds.forEach(([id, count]) => {
    const label = `${count}x duplicates`;
    dupCounts[label] = (dupCounts[label] || 0) + 1;
  });

  Object.entries(dupCounts)
    .sort((a, b) => {
      const aNum = parseInt(a[0]);
      const bNum = parseInt(b[0]);
      return aNum - bNum;
    })
    .forEach(([label, count]) => {
      console.log(`  ${count} product_ids appear ${label}`);
    });
}

countDuplicates().catch(console.error);
