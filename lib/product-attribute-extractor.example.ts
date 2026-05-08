/**
 * Example Usage of Product Attribute Extractor
 *
 * Shows how to use the extractor when adding new products
 */

import {
  extractProductAttributes,
  flattenForSupabaseUpdate,
  identifyLowConfidenceAttributes,
  identifyMissingAttributes,
} from './product-attribute-extractor';

// ============================================================================
// EXAMPLE 1: Simple Extraction
// ============================================================================

function example1_basicExtraction() {
  const description = "Fitted top in soft stretch jersey with a wide neckline and long sleeves.";

  const extracted = extractProductAttributes(description);

  if (extracted) {
    console.log('Extracted attributes:');
    console.log(`  Materials: ${extracted.materials?.value} (${extracted.materials?.confidence}%)`);
    console.log(`  Fit: ${extracted.fit?.value} (${extracted.fit?.confidence}%)`);
    console.log(`  Neckline: ${extracted.neckline?.value} (${extracted.neckline?.confidence}%)`);
    console.log(`  Overall: ${extracted.overall_confidence}%`);
  }

  // Output:
  // Materials: jersey, stretch (95%)
  // Fit: fitted (75%)
  // Neckline: wide neckline (78%)
  // Overall: 82%
}

// ============================================================================
// EXAMPLE 2: Hybrid Workflow (Rules + AI)
// ============================================================================

async function example2_hybridWorkflow(product: { description: string; productType: string }) {
  // Step 1: Extract with rules
  const extracted = extractProductAttributes(product.description);

  if (!extracted) {
    console.log('No attributes extracted - needs AI');
    // Call AI to tag from image
    // const aiResult = await tagProductWithAI(product);
    return;
  }

  // Step 2: Identify low-confidence attributes
  const needsAI = identifyLowConfidenceAttributes(extracted, 70);

  if (needsAI.length > 0) {
    console.log(`Low confidence attributes (needs AI): ${needsAI.join(', ')}`);
    // Call AI to verify these specific attributes
    // const aiResult = await tagProductWithAI(product, needsAI);
  } else {
    console.log('All attributes high confidence - no AI needed!');
  }

  // Step 3: Identify missing attributes
  const missing = identifyMissingAttributes(extracted, product.productType);

  if (missing.length > 0) {
    console.log(`Missing attributes (AI should add): ${missing.join(', ')}`);
    // Call AI to extract from image
    // const aiResult = await tagProductWithAI(product, missing);
  }
}

// ============================================================================
// EXAMPLE 3: Update Supabase
// ============================================================================

async function example3_updateSupabase(productId: string, description: string) {
  const extracted = extractProductAttributes(description);

  if (!extracted) {
    console.log('No attributes to update');
    return;
  }

  // Flatten for Supabase update
  const update = flattenForSupabaseUpdate(extracted);

  console.log('Supabase update object:', update);
  // {
  //   materials: ["jersey", "stretch"],
  //   materials_confidence: 95,
  //   materials_source: "rules-description",
  //   fit: "fitted",
  //   fit_confidence: 75,
  //   fit_source: "rules-description",
  //   ...
  //   overall_confidence: 82
  // }

  // Uncomment to actually update:
  // const { error } = await supabase
  //   .from('products')
  //   .update(update)
  //   .eq('id', productId);
}

// ============================================================================
// EXAMPLE 4: Batch Processing with Progress
// ============================================================================

async function example4_batchProcessing(products: Array<{ id: string; description: string }>) {
  const stats = {
    total: products.length,
    extracted: 0,
    highConfidence: 0,
    lowConfidence: 0,
    needsAI: 0,
  };

  for (const product of products) {
    const extracted = extractProductAttributes(product.description);

    if (!extracted) {
      stats.needsAI++;
      continue;
    }

    stats.extracted++;

    if (extracted.overall_confidence >= 80) {
      stats.highConfidence++;
      // Trust rules, save directly
    } else if (extracted.overall_confidence >= 60) {
      stats.lowConfidence++;
      // Save but flag for AI verification
    } else {
      stats.needsAI++;
      // Definitely needs AI
    }
  }

  console.log('Batch processing results:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Extracted: ${stats.extracted} (${(stats.extracted/stats.total*100).toFixed(1)}%)`);
  console.log(`  High confidence: ${stats.highConfidence}`);
  console.log(`  Low confidence: ${stats.lowConfidence}`);
  console.log(`  Needs AI: ${stats.needsAI}`);
}

// ============================================================================
// EXAMPLE 5: Real-World Product Import Workflow
// ============================================================================

async function example5_productImportWorkflow(newProduct: {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  productType: string;
}) {
  console.log(`\n🔍 Processing: ${newProduct.title}`);

  // Step 1: Extract attributes from description
  const extracted = extractProductAttributes(newProduct.description);

  if (!extracted) {
    console.log('❌ No description or no extractable attributes');
    console.log('→ Will use AI vision to tag from image');
    // await tagProductWithAI(newProduct);
    return;
  }

  console.log(`✅ Extracted ${extracted.extracted_count} attributes (${extracted.overall_confidence}% confidence)`);

  // Step 2: Determine AI strategy
  const lowConfidence = identifyLowConfidenceAttributes(extracted, 70);
  const missing = identifyMissingAttributes(extracted, newProduct.productType);

  if (lowConfidence.length === 0 && missing.length === 0) {
    // Perfect - rules got everything with high confidence
    console.log('🎯 High confidence on all expected attributes');
    console.log('→ Saving without AI verification');

    const update = flattenForSupabaseUpdate(extracted);
    // await supabase.from('products').update(update).eq('id', newProduct.id);

  } else {
    // Need AI for some attributes
    const aiTasks: string[] = [...lowConfidence, ...missing];
    console.log(`🤖 Need AI for: ${aiTasks.join(', ')}`);
    console.log('→ Will call AI vision to verify/fill gaps');

    // Save rules results first
    const update = flattenForSupabaseUpdate(extracted);
    // await supabase.from('products').update(update).eq('id', newProduct.id);

    // Then call AI for remaining attributes
    // const aiResult = await tagProductWithAI(newProduct, aiTasks);
    // await supabase.from('products').update(aiResult).eq('id', newProduct.id);
  }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

// Uncomment to run:
// example1_basicExtraction();
// example2_hybridWorkflow({ description: "...", productType: "tops" });
// example3_updateSupabase("product-123", "...");
// example4_batchProcessing([...]);
// example5_productImportWorkflow({ ... });
