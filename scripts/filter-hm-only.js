#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Filtering to H&M products only...\n');

const products = require('./products-no-kids.json');
console.log(`  Loaded ${products.length} products\n`);

// Filter to H&M only (consistent embeddings)
const hmOnly = products.filter(p => p.productId.startsWith('hm-kaggle-'));

console.log('📊 Results:');
console.log(`  Original: ${products.length} products`);
console.log(`  H&M only: ${hmOnly.length} products`);
console.log(`  Removed: ${products.length - hmOnly.length} non-H&M products\n`);

// Department breakdown
const deptCounts = {};
hmOnly.forEach(p => {
  const dept = p.department || 'Unknown';
  deptCounts[dept] = (deptCounts[dept] || 0) + 1;
});

console.log('By Department:');
Object.entries(deptCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dept, count]) => {
    const pct = ((count / hmOnly.length) * 100).toFixed(1);
    console.log(`  ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${dept}`);
  });

// Type breakdown
const typeCounts = {};
hmOnly.forEach(p => {
  const type = p.productType1 || 'Unknown';
  typeCounts[type] = (typeCounts[type] || 0) + 1;
});

console.log('\nBy Product Type:');
Object.entries(typeCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${count.toString().padStart(6)} ${type}`);
  });

// Save
const outputPath = path.join(__dirname, 'products-hm-only.json');
console.log(`\n💾 Saving to: products-hm-only.json`);
fs.writeFileSync(outputPath, JSON.stringify(hmOnly, null, 2));

const fileSize = fs.statSync(outputPath).size;
const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
console.log(`  ✅ Saved: ${fileSizeMB} MB\n`);

console.log('🎉 H&M filter complete!');
console.log('');
console.log('This will fix CLIP search - H&M products have consistent embeddings');
console.log('');
console.log('Next steps:');
console.log('  1. Upload to GitHub releases as v1.5-hm-only');
console.log('  2. Update HF Space PRODUCTS_URL');
console.log('  3. CLIP search will show diverse results');
