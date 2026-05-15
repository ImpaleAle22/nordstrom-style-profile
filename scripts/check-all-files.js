#!/usr/bin/env node
const fs = require('fs');

function checkFile(filename) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Checking: ${filename}`);
  console.log('='.repeat(70));

  if (!fs.existsSync(filename)) {
    console.log('  ❌ File not found');
    return;
  }

  const products = JSON.parse(fs.readFileSync(filename, 'utf8'));
  console.log(`  Total products: ${products.length}`);

  const ids = products.map(p => p.productId);
  const uniqueIds = new Set(ids);
  const duplicateCount = ids.length - uniqueIds.size;

  console.log(`  Unique IDs: ${uniqueIds.size}`);
  console.log(`  Duplicates: ${duplicateCount}`);

  if (duplicateCount > 0) {
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    const uniqueDuplicates = [...new Set(duplicates)];
    console.log(`\n  First 5 duplicate IDs:`);
    uniqueDuplicates.slice(0, 5).forEach(id => {
      const count = ids.filter(x => x === id).length;
      console.log(`    ${id}: ${count} copies`);
    });
  }
}

checkFile('./products-clip-supabase.json');
checkFile('./products-clip-supabase-complete.json');
checkFile('./products-clip-supabase-deduplicated.json');

console.log('\n');
