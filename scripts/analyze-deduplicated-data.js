#!/usr/bin/env node
const products = require('./products-clip-supabase-deduplicated.json');

console.log('📊 Analyzing deduplicated dataset...\n');
console.log(`Total products: ${products.length}\n`);

// Department breakdown
const deptCounts = {};
products.forEach(p => {
  const dept = p.department || 'Unknown';
  deptCounts[dept] = (deptCounts[dept] || 0) + 1;
});

console.log('By Department:');
Object.entries(deptCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dept, count]) => {
    const pct = ((count / products.length) * 100).toFixed(1);
    console.log(`  ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${dept}`);
  });

// Brand breakdown (top 20)
const brandCounts = {};
products.forEach(p => {
  const brand = p.brand || 'Unknown';
  brandCounts[brand] = (brandCounts[brand] || 0) + 1;
});

console.log('\nTop 20 Brands:');
Object.entries(brandCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([brand, count]) => {
    const pct = ((count / products.length) * 100).toFixed(1);
    console.log(`  ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${brand}`);
  });

// Kids products
const kidsProducts = products.filter(p =>
  (p.department || '').toLowerCase().includes('kid') ||
  (p.brand || '').toLowerCase().includes('kidswear')
);

console.log(`\n⚠️  Kids products: ${kidsProducts.length} (${((kidsProducts.length / products.length) * 100).toFixed(1)}%)`);
console.log('   These should NOT be in a women\'s fashion POC\n');

// Nike products
const nikeProducts = products.filter(p =>
  (p.brand || '').toLowerCase().includes('nike')
);

console.log(`Nike products: ${nikeProducts.length} (${((nikeProducts.length / products.length) * 100).toFixed(1)}%)`);

console.log('\nFirst 10 Nike products:');
nikeProducts.slice(0, 10).forEach(p => {
  console.log(`  ${p.productId}: ${p.title} - ${p.department}`);
});
