#!/usr/bin/env node
const products = require('./products-clip-supabase-complete.json');

console.log('Total products:', products.length);

// Check for duplicate product IDs
const ids = products.map(p => p.productId);
const uniqueIds = new Set(ids);
const duplicateCount = ids.length - uniqueIds.size;

console.log('Unique product IDs:', uniqueIds.size);
console.log('Duplicate product IDs:', duplicateCount);

if (duplicateCount > 0) {
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  const uniqueDuplicates = [...new Set(duplicates)];
  console.log('\nFirst 10 duplicate IDs:');
  uniqueDuplicates.slice(0, 10).forEach(id => {
    const count = ids.filter(x => x === id).length;
    console.log(`  ${id}: ${count} copies`);
  });
}

// Check Nike products
const nikeProducts = products.filter(p => (p.brand || '').toLowerCase().includes('nike'));
console.log('\nNike products:', nikeProducts.length);
console.log('First 5 Nike products:');
nikeProducts.slice(0, 5).forEach(p => {
  console.log(`  ${p.productId}: ${p.title} - ${p.brand}`);
});

// Check if embeddings exist and are valid
let validEmbeddings = 0;
let invalidEmbeddings = 0;
let stringEmbeddings = 0;

products.forEach(p => {
  const emb = p.embeddingFlat || p.embeddingOnModel;
  if (emb) {
    if (typeof emb === 'string') {
      stringEmbeddings++;
      try {
        JSON.parse(emb);
        validEmbeddings++;
      } catch (e) {
        invalidEmbeddings++;
      }
    } else if (Array.isArray(emb)) {
      validEmbeddings++;
    } else {
      invalidEmbeddings++;
    }
  }
});

console.log('\nEmbeddings:');
console.log('  Valid:', validEmbeddings);
console.log('  Invalid:', invalidEmbeddings);
console.log('  String format:', stringEmbeddings);
