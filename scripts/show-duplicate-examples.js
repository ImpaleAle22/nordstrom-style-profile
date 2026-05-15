#!/usr/bin/env node
const products = require('./products-clip-supabase-complete.json');

console.log('🔍 Analyzing duplicate products...\n');

// Find duplicates
const idMap = {};
products.forEach((p, index) => {
  if (!idMap[p.productId]) {
    idMap[p.productId] = [];
  }
  idMap[p.productId].push({ ...p, originalIndex: index });
});

// Get duplicates
const duplicates = Object.entries(idMap)
  .filter(([id, items]) => items.length > 1)
  .slice(0, 5); // First 5 duplicate sets

duplicates.forEach(([productId, items], setIndex) => {
  console.log('='.repeat(80));
  console.log(`Duplicate Set ${setIndex + 1}: ${productId} (${items.length} copies)`);
  console.log('='.repeat(80));

  items.forEach((item, copyIndex) => {
    console.log(`\nCopy ${copyIndex + 1}:`);
    console.log(`  Product ID:    ${item.productId}`);
    console.log(`  Title:         ${item.title}`);
    console.log(`  Brand:         ${item.brand}`);
    console.log(`  Price:         $${item.price}`);
    console.log(`  Department:    ${item.department}`);
    console.log(`  Gender:        ${item.gender}`);
    console.log(`  Product Type:  ${item.productType1} > ${item.productType2}`);
    console.log(`  Colors:        ${JSON.stringify(item.simplifiedColors || item.colors)}`);
    console.log(`  Image URL:     ${item.imageUrl ? item.imageUrl.substring(0, 80) + '...' : 'N/A'}`);

    // Check if embedding exists and show first few values
    const emb = item.embeddingFlat || item.embeddingOnModel;
    if (emb) {
      const embArray = typeof emb === 'string' ? JSON.parse(emb) : emb;
      console.log(`  Embedding:     [${embArray.slice(0, 5).join(', ')}...] (${embArray.length} dims)`);
    }
  });

  console.log('\n');
});

// Check if images are different
console.log('\n' + '='.repeat(80));
console.log('ANALYSIS: Are duplicates different color variants?');
console.log('='.repeat(80));

let sameImage = 0;
let diffImage = 0;
let sameColor = 0;
let diffColor = 0;

Object.values(idMap)
  .filter(items => items.length > 1)
  .forEach(items => {
    const images = items.map(i => i.imageUrl);
    const colors = items.map(i => JSON.stringify(i.simplifiedColors || i.colors));

    const uniqueImages = new Set(images);
    const uniqueColors = new Set(colors);

    if (uniqueImages.size === 1) sameImage++;
    else diffImage++;

    if (uniqueColors.size === 1) sameColor++;
    else diffColor++;
  });

const totalDupSets = Object.values(idMap).filter(items => items.length > 1).length;

console.log(`\nTotal duplicate sets: ${totalDupSets}`);
console.log(`\nImage URL comparison:`);
console.log(`  Same image URL:       ${sameImage} (${(sameImage/totalDupSets*100).toFixed(1)}%)`);
console.log(`  Different image URLs: ${diffImage} (${(diffImage/totalDupSets*100).toFixed(1)}%)`);
console.log(`\nColor comparison:`);
console.log(`  Same colors:          ${sameColor} (${(sameColor/totalDupSets*100).toFixed(1)}%)`);
console.log(`  Different colors:     ${diffColor} (${(diffColor/totalDupSets*100).toFixed(1)}%)`);

console.log(`\n${'='.repeat(80)}`);
console.log('CONCLUSION:');
if (sameImage / totalDupSets > 0.9) {
  console.log('✅ Most duplicates are TRUE DUPLICATES (same image, same product)');
  console.log('   These should be removed from the dataset.');
} else if (diffImage / totalDupSets > 0.5) {
  console.log('⚠️  Many duplicates have different images');
  console.log('   These might be color variants that need different product IDs.');
} else {
  console.log('❓ Mixed results - needs manual review');
}
console.log('='.repeat(80));
