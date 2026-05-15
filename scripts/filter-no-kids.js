#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Filtering out Kids products only...\n');

const products = require('./products-clip-supabase-deduplicated.json');
console.log(`  Loaded ${products.length} products\n`);

// Filter out Kids only (keep Womenswear, Menswear, everything else)
const filtered = products.filter(p => {
  const dept = (p.department || '').toLowerCase();
  const brand = (p.brand || '').toLowerCase();

  // Remove anything with "kid" in department or brand
  return !dept.includes('kid') && !brand.includes('kidswear');
});

console.log('📊 Results:');
console.log(`  Original: ${products.length} products`);
console.log(`  Filtered (no kids): ${filtered.length} products`);
console.log(`  Removed: ${products.length - filtered.length} products\n`);

// Check what we removed
const removed = products.filter(p => {
  const dept = (p.department || '').toLowerCase();
  const brand = (p.brand || '').toLowerCase();
  return dept.includes('kid') || brand.includes('kidswear');
});

console.log('Removed products:');
removed.slice(0, 10).forEach(p => {
  console.log(`  - ${p.title} (${p.brand}, ${p.department})`);
});
if (removed.length > 10) {
  console.log(`  ... and ${removed.length - 10} more`);
}

// Department breakdown
const deptCounts = {};
filtered.forEach(p => {
  const dept = p.department || 'Unknown';
  deptCounts[dept] = (deptCounts[dept] || 0) + 1;
});

console.log('\nRemaining products by department:');
Object.entries(deptCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dept, count]) => {
    const pct = ((count / filtered.length) * 100).toFixed(1);
    console.log(`  ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${dept}`);
  });

// Save
const outputPath = path.join(__dirname, 'products-no-kids.json');
console.log(`\n💾 Saving to: products-no-kids.json`);
fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2));

const fileSize = fs.statSync(outputPath).size;
const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
console.log(`  ✅ Saved: ${fileSizeMB} MB\n`);

console.log('🎉 Kids filter complete!');
console.log('');
console.log('Next steps:');
console.log('  1. Upload to GitHub releases as v1.4-no-kids');
console.log('  2. Update HF Space PRODUCTS_URL');
console.log('  3. Both Womenswear AND Menswear will be available');
