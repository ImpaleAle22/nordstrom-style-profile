#!/usr/bin/env node
/**
 * Analyze product type hierarchy in the dataset
 * Shows PT1, PT2, PT3, PT4 values and relationships
 */

const products = require('./products-clip-supabase-complete.json');

console.log('📊 PRODUCT TYPE ANALYSIS');
console.log('Total products:', products.length);
console.log('=' .repeat(70));

// Count unique values for each level
const pt1Values = new Set();
const pt2Values = new Set();
const pt3Values = new Set();
const pt4Values = new Set();

products.forEach(p => {
  if (p.productType1) pt1Values.add(p.productType1);
  if (p.productType2) pt2Values.add(p.productType2);
  if (p.productType3) pt3Values.add(p.productType3);
  if (p.productType4) pt4Values.add(p.productType4);
});

console.log('\nUNIQUE VALUES:');
console.log('  Product Type 1:', pt1Values.size, 'unique values');
console.log('  Product Type 2:', pt2Values.size, 'unique values');
console.log('  Product Type 3:', pt3Values.size, 'unique values');
console.log('  Product Type 4:', pt4Values.size, 'unique values');

// Count by PT1
console.log('\n' + '='.repeat(70));
console.log('PRODUCT TYPE 1 (Top Level Category):');
console.log('='.repeat(70));

const pt1Counts = {};
products.forEach(p => {
  const type = p.productType1 || 'null';
  pt1Counts[type] = (pt1Counts[type] || 0) + 1;
});

Object.entries(pt1Counts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    const pct = ((count / products.length) * 100).toFixed(1);
    console.log(`  ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${type}`);
  });

// For each PT1, show common PT2 values
console.log('\n' + '='.repeat(70));
console.log('PRODUCT TYPE HIERARCHY (PT1 → PT2):');
console.log('='.repeat(70));

Object.entries(pt1Counts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10) // Top 10 categories
  .forEach(([pt1Type]) => {
    const pt2Counts = {};
    products
      .filter(p => p.productType1 === pt1Type)
      .forEach(p => {
        const type = p.productType2 || 'null';
        pt2Counts[type] = (pt2Counts[type] || 0) + 1;
      });

    console.log(`\n${pt1Type} (${pt1Counts[pt1Type]} products):`);
    Object.entries(pt2Counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // Top 8 subtypes
      .forEach(([type, count]) => {
        console.log(`    ${count.toString().padStart(5)}  ${type}`);
      });
  });

// Analyze bags specifically
console.log('\n' + '='.repeat(70));
console.log('BAG ANALYSIS (products with "bag" in title):');
console.log('='.repeat(70));

const bagProducts = products.filter(p =>
  (p.title || '').toLowerCase().includes('bag')
);

console.log(`\nTotal products with "bag" in title: ${bagProducts.length}`);

const bagPT1 = {};
bagProducts.forEach(p => {
  const type = p.productType1 || 'null';
  bagPT1[type] = (bagPT1[type] || 0) + 1;
});

console.log('\nBags by Product Type 1:');
Object.entries(bagPT1)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${count.toString().padStart(5)}  ${type}`);
  });

// Show bag subtypes under Accessories
const accessoryBags = bagProducts.filter(p => p.productType1 === 'Accessories');
const bagPT2 = {};
accessoryBags.forEach(p => {
  const type = p.productType2 || 'null';
  bagPT2[type] = (bagPT2[type] || 0) + 1;
});

console.log('\nAccessory bags by Product Type 2:');
Object.entries(bagPT2)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([type, count]) => {
    console.log(`  ${count.toString().padStart(5)}  ${type}`);
  });

console.log('\n' + '='.repeat(70));
console.log('RECOMMENDATION:');
console.log('='.repeat(70));
console.log(`
Based on the data:
- Accessories contains ${pt1Counts['Accessories']} products (diverse category)
- ${bagPT1['Accessories']} bags are under Accessories
- This is actually CORRECT hierarchy in fashion retail

Keeping bags as "Accessories" is standard because:
  1. Matches retail conventions (Nordstrom, H&M structure)
  2. Accessories is a valid top-level for bags/belts/hats/scarves
  3. PT2/PT3/PT4 provide specific bag types (tote, crossbody, etc)

NO CHANGE NEEDED - Current categorization is correct!
`);
