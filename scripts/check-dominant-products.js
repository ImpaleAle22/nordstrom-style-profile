#!/usr/bin/env node
const products = require('./products-no-kids.json');

console.log('🔍 Checking products that dominate all queries...\n');

// The products that appear in every query
const dominantTitles = [
  'Cassandra Divine Jersey Top - Black',
  'Hooded Maisie Rain Mac',
  'Henley Short Sleeve Ribbed Tee - Green Park'
];

dominantTitles.forEach(title => {
  const product = products.find(p => p.title === title);

  if (!product) {
    console.log(`❌ Product not found: ${title}\n`);
    return;
  }

  console.log(`Product: ${product.title}`);
  console.log(`  Brand: ${product.brand}`);
  console.log(`  Type: ${product.productType1} > ${product.productType2}`);
  console.log(`  Department: ${product.department}`);
  console.log(`  Product ID: ${product.productId}`);

  const emb = product.embeddingFlat || product.embeddingOnModel;

  if (!emb) {
    console.log(`  ❌ NO EMBEDDING FOUND!\n`);
    return;
  }

  const embArray = typeof emb === 'string' ? JSON.parse(emb) : emb;

  console.log(`  Embedding length: ${embArray.length}`);
  console.log(`  First 10 values: [${embArray.slice(0, 10).map(v => v.toFixed(4)).join(', ')}]`);

  const mean = embArray.reduce((a, b) => a + b, 0) / embArray.length;
  const variance = embArray.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / embArray.length;
  const stdDev = Math.sqrt(variance);
  const magnitude = Math.sqrt(embArray.reduce((s, v) => s + v * v, 0));

  console.log(`  Mean: ${mean.toFixed(6)}`);
  console.log(`  Std Dev: ${stdDev.toFixed(6)}`);
  console.log(`  Magnitude (L2 norm): ${magnitude.toFixed(6)}`);
  console.log(`  All zeros? ${embArray.every(v => v === 0)}`);
  console.log('');
});

// Compare with a random H&M product
const randomHM = products.filter(p => p.brand === 'H&M' && p.productType1 === 'Tops')[0];
console.log('='.repeat(70));
console.log('COMPARISON: Random H&M Top');
console.log('='.repeat(70));
console.log(`Product: ${randomHM.title}`);

const embHM = randomHM.embeddingFlat || randomHM.embeddingOnModel;
const embArrayHM = typeof embHM === 'string' ? JSON.parse(embHM) : embHM;

console.log(`  First 10 values: [${embArrayHM.slice(0, 10).map(v => v.toFixed(4)).join(', ')}]`);

const meanHM = embArrayHM.reduce((a, b) => a + b, 0) / embArrayHM.length;
const varianceHM = embArrayHM.reduce((s, v) => s + Math.pow(v - meanHM, 2), 0) / embArrayHM.length;
const stdDevHM = Math.sqrt(varianceHM);
const magnitudeHM = Math.sqrt(embArrayHM.reduce((s, v) => s + v * v, 0));

console.log(`  Mean: ${meanHM.toFixed(6)}`);
console.log(`  Std Dev: ${stdDevHM.toFixed(6)}`);
console.log(`  Magnitude: ${magnitudeHM.toFixed(6)}`);
console.log('');

console.log('='.repeat(70));
console.log('HYPOTHESIS:');
console.log('='.repeat(70));
console.log('If dominant products have magnitude close to 1.0, they are normalized.');
console.log('If H&M products have magnitude close to 1.0, they are normalized too.');
console.log('If magnitudes differ significantly, normalization is inconsistent.');
