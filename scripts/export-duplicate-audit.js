#!/usr/bin/env node
/**
 * Export detailed audit of all duplicate products
 * Use this to check outfit coverage before deletion
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing duplicates for audit...\n');

const products = require('./products-clip-supabase-complete.json');

// Group by product_id
const idMap = {};
products.forEach((product, index) => {
  if (!idMap[product.productId]) {
    idMap[product.productId] = [];
  }
  idMap[product.productId].push({
    arrayIndex: index,
    productId: product.productId,
    title: product.title,
    brand: product.brand,
    price: product.price,
    department: product.department,
    gender: product.gender,
    productType1: product.productType1,
    productType2: product.productType2,
    colors: product.simplifiedColors || product.colors,
    imageUrl: product.imageUrl,
    hasEmbedding: !!(product.embeddingFlat || product.embeddingOnModel),
  });
});

// Find duplicates
const duplicateGroups = Object.entries(idMap)
  .filter(([id, items]) => items.length > 1)
  .map(([id, items]) => ({
    productId: id,
    duplicateCount: items.length,
    instances: items,
  }));

console.log(`Found ${duplicateGroups.length} product IDs with duplicates`);
console.log(`Total duplicate records: ${duplicateGroups.reduce((sum, g) => sum + (g.duplicateCount - 1), 0)}\n`);

// Create detailed audit
const audit = {
  exportDate: new Date().toISOString(),
  summary: {
    totalProducts: products.length,
    uniqueProductIds: Object.keys(idMap).length,
    productIdsWithDuplicates: duplicateGroups.length,
    totalDuplicateRecords: duplicateGroups.reduce((sum, g) => sum + (g.duplicateCount - 1), 0),
  },
  duplicateGroups: duplicateGroups,

  // Create a flat list for easy reference
  allDuplicateProductIds: duplicateGroups.map(g => g.productId),

  // Instructions for outfit cleanup
  instructions: {
    purpose: 'This file lists all duplicate products before deduplication',
    usage: [
      '1. Check if any outfits reference these product IDs',
      '2. Outfits can reference ANY instance (they\'re identical)',
      '3. After deduplication, only the first instance remains',
      '4. No outfit updates needed (product_id stays the same)',
    ],
    deduplicationStrategy: 'Keep first occurrence (lowest array index), remove others',
  },

  // Breakdown by duplicate count
  breakdown: {
    duplicates_2x: duplicateGroups.filter(g => g.duplicateCount === 2).length,
    duplicates_3x: duplicateGroups.filter(g => g.duplicateCount === 3).length,
    duplicates_4x: duplicateGroups.filter(g => g.duplicateCount === 4).length,
    duplicates_5plus: duplicateGroups.filter(g => g.duplicateCount >= 5).length,
  },
};

// Save audit file
const auditPath = path.join(__dirname, 'duplicate-audit.json');
console.log('💾 Saving audit file...');
fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2));

const auditSize = (fs.statSync(auditPath).size / 1024 / 1024).toFixed(2);
console.log(`  ✅ Saved: duplicate-audit.json (${auditSize} MB)\n`);

// Also save a simple CSV for quick reference
const csvLines = [
  'product_id,duplicate_count,title,brand,product_type_1,first_array_index',
  ...duplicateGroups.map(g =>
    `"${g.productId}",${g.duplicateCount},"${g.instances[0].title}","${g.instances[0].brand}","${g.instances[0].productType1}",${g.instances[0].arrayIndex}`
  ),
];

const csvPath = path.join(__dirname, 'duplicate-audit.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'));
console.log(`  ✅ Saved: duplicate-audit.csv (for Excel/Google Sheets)\n`);

// Show examples
console.log('='.repeat(70));
console.log('SAMPLE DUPLICATES (first 5):');
console.log('='.repeat(70));

duplicateGroups.slice(0, 5).forEach((group, i) => {
  console.log(`\n${i + 1}. Product ID: ${group.productId} (${group.duplicateCount} copies)`);
  console.log(`   Title: ${group.instances[0].title}`);
  console.log(`   Brand: ${group.instances[0].brand}`);
  console.log(`   Type: ${group.instances[0].productType1}`);
  console.log(`   Instances at array indices: ${group.instances.map(inst => inst.arrayIndex).join(', ')}`);
  console.log(`   KEEP: index ${group.instances[0].arrayIndex}`);
  console.log(`   DELETE: indices ${group.instances.slice(1).map(inst => inst.arrayIndex).join(', ')}`);
});

console.log('\n' + '='.repeat(70));
console.log('NEXT STEPS:');
console.log('='.repeat(70));
console.log(`
1. ✅ Audit file created: duplicate-audit.json

2. Check outfit coverage:
   node scripts/check-outfit-duplicate-usage.js

3. Review the audit file before proceeding with deletion

4. Run Supabase deduplication:
   node scripts/deduplicate-supabase.js

5. Keep this audit file for reference if issues arise
`);
