#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Filtering to Womenswear only...\n');

const products = require('./products-clip-supabase-deduplicated.json');
console.log(`  Loaded ${products.length} products\n`);

// Filter to Womenswear only
const womenswear = products.filter(p => p.department === 'Womenswear');

console.log('📊 Results:');
console.log(`  Original: ${products.length} products`);
console.log(`  Womenswear only: ${womenswear.length} products`);
console.log(`  Removed: ${products.length - womenswear.length} products\n`);

// Check what we removed
const removed = products.filter(p => p.department !== 'Womenswear');
const removedDepts = {};
removed.forEach(p => {
  const dept = p.department || 'Unknown';
  removedDepts[dept] = (removedDepts[dept] || 0) + 1;
});

console.log('Removed by department:');
Object.entries(removedDepts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dept, count]) => {
    console.log(`  ${count.toString().padStart(6)} ${dept}`);
  });

// Count by type
const typeCounts = {};
womenswear.forEach(p => {
  const type = p.productType1 || 'Unknown';
  typeCounts[type] = (typeCounts[type] || 0) + 1;
});

console.log('\nWomenswear breakdown:');
Object.entries(typeCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${count.toString().padStart(6)} ${type}`);
  });

// Save
const outputPath = path.join(__dirname, 'products-womenswear-only.json');
console.log(`\n💾 Saving to: products-womenswear-only.json`);
fs.writeFileSync(outputPath, JSON.stringify(womenswear, null, 2));

const fileSize = fs.statSync(outputPath).size;
const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
console.log(`  ✅ Saved: ${fileSizeMB} MB\n`);

console.log('🎉 Womenswear filter complete!');
console.log('');
console.log('Next steps:');
console.log('  1. Upload to GitHub releases as v1.4-womenswear-only');
console.log('  2. Update HF Space PRODUCTS_URL');
console.log('  3. CLIP search will now show only women\'s products');
