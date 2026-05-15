#!/usr/bin/env node
/**
 * Investigate why certain products appear in every search result
 */

const products = require('./products-supabase-clean.json');

console.log('🔍 Investigating dominant products...\n');

// Products that keep appearing
const suspectIds = [
  'universal_standard_women_tops_1773349900248_17', // Cassandra Divine Jersey Top
  'handm_women_shoes_1773350028138_8', // Knee-High Boots
];

console.log('Checking suspect products...\n');

suspectIds.forEach(id => {
  const product = products.find(p => p.productId === id);

  if (!product) {
    console.log(`❌ Product not found: ${id}\n`);
    return;
  }

  console.log(`Product: ${product.title}`);
  console.log(`  ID: ${product.productId}`);
  console.log(`  Brand: ${product.brand}`);
  console.log(`  Type: ${product.productType1}`);
  console.log(`  Image: ${product.imageUrl?.substring(0, 80)}`);

  const emb = product.embeddingFlat;
  if (!emb) {
    console.log(`  ❌ NO EMBEDDING!\n`);
    return;
  }

  const embArray = typeof emb === 'string' ? JSON.parse(emb) : emb;

  console.log(`  Embedding length: ${embArray.length}`);
  console.log(`  Embedding type: ${typeof embArray[0]}`);
  console.log(`  First 5 values: [${embArray.slice(0, 5).map(v => v?.toFixed(4) || 'null').join(', ')}]`);

  const magnitude = Math.sqrt(embArray.reduce((s, v) => s + (v || 0) * (v || 0), 0));
  const mean = embArray.reduce((a, b) => a + (b || 0), 0) / embArray.length;

  console.log(`  Magnitude: ${magnitude.toFixed(6)}`);
  console.log(`  Mean: ${mean.toFixed(6)}`);
  console.log(`  All zeros: ${embArray.every(v => v === 0)}`);
  console.log(`  Has nulls: ${embArray.some(v => v === null || v === undefined)}`);
  console.log('');
});

// Compare with random H&M products
console.log('='.repeat(70));
console.log('Comparison: 3 random H&M products');
console.log('='.repeat(70));

const hmProducts = products.filter(p => p.productId.startsWith('hm-kaggle-'));
const randomSample = [0, Math.floor(hmProducts.length / 2), hmProducts.length - 1].map(i => hmProducts[i]);

randomSample.forEach((p, i) => {
  console.log(`\nH&M Product ${i + 1}: ${p.title}`);

  const emb = p.embeddingFlat;
  const embArray = typeof emb === 'string' ? JSON.parse(emb) : emb;

  const magnitude = Math.sqrt(embArray.reduce((s, v) => s + v * v, 0));
  const mean = embArray.reduce((a, b) => a + b, 0) / embArray.length;

  console.log(`  Magnitude: ${magnitude.toFixed(6)}`);
  console.log(`  Mean: ${mean.toFixed(6)}`);
  console.log(`  First 5: [${embArray.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
});

console.log('\n' + '='.repeat(70));
console.log('QUESTION:');
console.log('='.repeat(70));
console.log(`
If all products have magnitude ~1.0, embeddings are properly normalized.
If dominant products have different magnitude, that's the problem.
If magnitudes are all the same, the issue is elsewhere (maybe broken embeddings, or HF Space bug).
`);
