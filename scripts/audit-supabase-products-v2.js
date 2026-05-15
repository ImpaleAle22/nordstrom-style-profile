#!/usr/bin/env node
/**
 * Audit Supabase products - check what we actually have
 */

const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function auditSupabase() {
  console.log('🔍 SUPABASE PRODUCTS AUDIT');
  console.log('='.repeat(70));
  console.log('');

  // Sample 100 products
  const { data: products, error } = await supabase
    .from('products')
    .select('product_id, title, brand, image_url, r2_image_url, images, embedding_flat, embedding_source, embedding_model, is_outfit_eligible, department, product_type_1, details, materials, patterns')
    .limit(100);

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  console.log(`✅ Fetched ${products.length} products\n`);

  // Image availability
  const withImageUrl = products.filter(p => p.image_url);
  const withR2 = products.filter(p => p.r2_image_url);
  const withImagesArray = products.filter(p => p.images && p.images.length > 0);
  const withAnyImage = products.filter(p => p.image_url || p.r2_image_url || (p.images && p.images.length > 0));

  console.log('📸 IMAGE AVAILABILITY (100 sample):');
  console.log(`  image_url:      ${withImageUrl.length}/100`);
  console.log(`  r2_image_url:   ${withR2.length}/100`);
  console.log(`  images array:   ${withImagesArray.length}/100`);
  console.log(`  ANY image:      ${withAnyImage.length}/100\n`);

  // Check images array content
  if (withImagesArray.length > 0) {
    const sampleImages = products.find(p => p.images && p.images.length > 0).images;
    console.log('Sample images array structure:');
    console.log(JSON.stringify(sampleImages[0], null, 2));
    console.log('');
  }

  // Embeddings
  const withEmbedding = products.filter(p => p.embedding_flat);
  const embeddingSource = {};
  const embeddingModel = {};

  withEmbedding.forEach(p => {
    const source = p.embedding_source || 'unknown';
    const model = p.embedding_model || 'unknown';
    embeddingSource[source] = (embeddingSource[source] || 0) + 1;
    embeddingModel[model] = (embeddingModel[model] || 0) + 1;
  });

  console.log('🧠 EMBEDDINGS (100 sample):');
  console.log(`  Has embedding:  ${withEmbedding.length}/100`);
  console.log(`  By source:`, embeddingSource);
  console.log(`  By model:`, embeddingModel);
  console.log('');

  // Text content
  const withTitle = products.filter(p => p.title && p.title.length > 0);
  const withDetails = products.filter(p => p.details && p.details.length > 0);
  const withMaterials = products.filter(p => p.materials && p.materials.length > 0);
  const withPatterns = products.filter(p => p.patterns);

  console.log('📝 TEXT CONTENT (100 sample):');
  console.log(`  title:          ${withTitle.length}/100`);
  console.log(`  details array:  ${withDetails.length}/100`);
  console.log(`  materials:      ${withMaterials.length}/100`);
  console.log(`  patterns:       ${withPatterns.length}/100\n`);

  // Show 3 examples
  console.log('='.repeat(70));
  console.log('EXAMPLES:');
  console.log('='.repeat(70));

  products.slice(0, 3).forEach((p, i) => {
    console.log(`\nProduct ${i + 1}:`);
    console.log(`  ID: ${p.product_id}`);
    console.log(`  Title: ${p.title}`);
    console.log(`  Brand: ${p.brand}`);
    console.log(`  Type: ${p.product_type_1}`);
    console.log(`  Image URL: ${p.image_url ? p.image_url.substring(0, 60) + '...' : 'NULL'}`);
    console.log(`  R2 URL: ${p.r2_image_url ? p.r2_image_url.substring(0, 60) + '...' : 'NULL'}`);
    console.log(`  Images array: ${p.images ? p.images.length + ' images' : 'NULL'}`);
    console.log(`  Details: ${p.details ? JSON.stringify(p.details.slice(0, 3)) : 'NULL'}`);
    console.log(`  Materials: ${p.materials ? JSON.stringify(p.materials) : 'NULL'}`);
    console.log(`  Patterns: ${p.patterns || 'NULL'}`);
    console.log(`  Embedding: ${p.embedding_flat ? 'EXISTS' : 'NULL'}`);
    console.log(`  Embedding source: ${p.embedding_source || 'NULL'}`);
    console.log(`  Embedding model: ${p.embedding_model || 'NULL'}`);
  });

  // Check outfit eligibility
  const outfitEligible = products.filter(p => p.is_outfit_eligible === true);
  console.log(`\n📦 Outfit eligible: ${outfitEligible.length}/100\n`);

  console.log('='.repeat(70));
  console.log('🎯 KEY FINDINGS:');
  console.log('='.repeat(70));
  console.log(`
1. Images: ${withAnyImage.length}% have at least one image
2. Embeddings: ${withEmbedding.length}% have embeddings
3. Embedding source: What was used to generate them?
4. Text richness: title=${withTitle.length}%, details=${withDetails.length}%, materials=${withMaterials.length}%

CRITICAL QUESTION:
Were embeddings generated from:
  a) Just the title (e.g., "Dallas ISW 31") → POOR for CLIP
  b) Rich description (e.g., "White cotton shirt with...") → GOOD for CLIP
  c) The actual product image → BEST for CLIP

Check embedding_source field to determine this.
  `);
}

auditSupabase().catch(console.error);
