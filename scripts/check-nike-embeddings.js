#!/usr/bin/env node
const products = require('./products-no-kids.json');

console.log('🔍 Checking Nike embeddings...\n');

const nikeProducts = products.filter(p =>
  (p.brand || '').toLowerCase().includes('nike')
);

console.log(`Nike products: ${nikeProducts.length}\n`);

// Sample Nike embeddings
const sampleNike = nikeProducts.slice(0, 3);
console.log('First 3 Nike products:');
sampleNike.forEach(p => {
  const emb = p.embeddingFlat || p.embeddingOnModel;
  const embArray = typeof emb === 'string' ? JSON.parse(emb) : emb;

  console.log(`\n  ${p.title}`);
  console.log(`    Type: ${p.productType1} > ${p.productType2}`);
  console.log(`    Embedding length: ${embArray.length}`);
  console.log(`    First 5 values: [${embArray.slice(0, 5).join(', ')}]`);
  console.log(`    Mean: ${(embArray.reduce((a,b) => a+b, 0) / embArray.length).toFixed(4)}`);
  console.log(`    Std dev: ${Math.sqrt(embArray.reduce((s, v) => s + Math.pow(v, 2), 0) / embArray.length).toFixed(4)}`);
});

// Sample non-Nike H&M products
const hmProducts = products.filter(p => p.brand === 'H&M').slice(0, 3);
console.log('\n\nFirst 3 H&M products (for comparison):');
hmProducts.forEach(p => {
  const emb = p.embeddingFlat || p.embeddingOnModel;
  const embArray = typeof emb === 'string' ? JSON.parse(emb) : emb;

  console.log(`\n  ${p.title}`);
  console.log(`    Type: ${p.productType1} > ${p.productType2}`);
  console.log(`    Embedding length: ${embArray.length}`);
  console.log(`    First 5 values: [${embArray.slice(0, 5).join(', ')}]`);
  console.log(`    Mean: ${(embArray.reduce((a,b) => a+b, 0) / embArray.length).toFixed(4)}`);
  console.log(`    Std dev: ${Math.sqrt(embArray.reduce((s, v) => s + Math.pow(v, 2), 0) / embArray.length).toFixed(4)}`);
});

console.log('\n');
console.log('='.repeat(70));
console.log('HYPOTHESIS: If Nike embeddings have much higher magnitude (std dev),');
console.log('they would dominate cosine similarity even for unrelated queries.');
console.log('='.repeat(70));
