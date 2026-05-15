#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Loading products...');
const products = require('./products-clip-supabase-complete.json');
console.log(`  Loaded ${products.length} products\n`);

// Deduplicate by product_id, keeping first occurrence
const seen = new Set();
const deduplicated = [];

for (const product of products) {
  if (!seen.has(product.productId)) {
    seen.add(product.productId);
    deduplicated.push(product);
  }
}

console.log('📊 Results:');
console.log(`  Original: ${products.length} products`);
console.log(`  Deduplicated: ${deduplicated.length} products`);
console.log(`  Removed: ${products.length - deduplicated.length} duplicates\n`);

// Count by type
const typeCounts = {};
deduplicated.forEach(p => {
  const type = p.productType1 || 'Unknown';
  typeCounts[type] = (typeCounts[type] || 0) + 1;
});

console.log('Product breakdown:');
Object.entries(typeCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${count.toString().padStart(6)} ${type}`);
  });

// Save
const outputPath = path.join(__dirname, 'products-clip-supabase-deduplicated.json');
console.log(`\n💾 Saving to: products-clip-supabase-deduplicated.json`);
fs.writeFileSync(outputPath, JSON.stringify(deduplicated, null, 2));

const fileSize = fs.statSync(outputPath).size;
const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
console.log(`  ✅ Saved: ${fileSizeMB} MB\n`);

console.log('🎉 Deduplication complete!');
console.log('');
console.log('Next steps:');
console.log('  1. Upload to GitHub releases as v1.3-products-deduplicated');
console.log('  2. Update HF Space PRODUCTS_URL');
console.log('  3. Wait for HF Space to rebuild');
