#!/usr/bin/env node
const products = require('./products-no-kids.json');

console.log('🔍 Checking product sources...\n');

// Identify source by product_id prefix
const sources = {};
products.forEach(p => {
  let source = 'Unknown';

  if (p.productId.startsWith('hm-kaggle-')) {
    source = 'H&M Kaggle';
  } else if (p.productId.startsWith('lola-')) {
    source = 'Lola/Nordstrom';
  } else if (p.productId.includes('universal_standard')) {
    source = 'Universal Standard';
  } else if (p.productId.includes('_women_') || p.productId.includes('_men_')) {
    source = 'Other Brands';
  }

  sources[source] = (sources[source] || 0) + 1;
});

console.log('Products by source:');
Object.entries(sources)
  .sort((a, b) => b[1] - a[1])
  .forEach(([source, count]) => {
    const pct = ((count / products.length) * 100).toFixed(1);
    console.log(`  ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${source}`);
  });

// Check if non-H&M products have embeddings
const nonHM = products.filter(p => !p.productId.startsWith('hm-kaggle-'));
const nonHMWithEmbeddings = nonHM.filter(p => p.embeddingFlat || p.embeddingOnModel);

console.log(`\nNon-H&M products: ${nonHM.length}`);
console.log(`Non-H&M with embeddings: ${nonHMWithEmbeddings.length}`);
console.log(`Non-H&M without embeddings: ${nonHM.length - nonHMWithEmbeddings.length}`);

// The dominant products
const dominant = products.filter(p =>
  p.title === 'Cassandra Divine Jersey Top - Black' ||
  p.title === 'Hooded Maisie Rain Mac' ||
  p.title === 'Henley Short Sleeve Ribbed Tee - Green Park'
);

console.log(`\nDominant products:`);
dominant.forEach(p => {
  console.log(`  ${p.productId} (${p.title})`);
});

// Check position in array
const indices = dominant.map(p => products.findIndex(prod => prod.productId === p.productId));
console.log(`\nArray indices of dominant products: ${indices.join(', ')}`);

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS:');
console.log('='.repeat(70));
console.log('These non-H&M products are appearing first for every query.');
console.log('Possible causes:');
console.log('  1. Non-H&M embeddings generated from different image source');
console.log('  2. Model bias toward these specific products');
console.log('  3. Array ordering issue (are they always first?)');
