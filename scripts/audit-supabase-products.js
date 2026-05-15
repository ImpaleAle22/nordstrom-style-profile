#!/usr/bin/env node
/**
 * Comprehensive audit of Supabase products table
 * Check: schema, images, descriptions, embeddings, data quality
 */

const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slsrksnenvagilmdwxka.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEhH69mxAkf3FAprPAvhsA_82W0uQxg'
);

async function auditSupabase() {
  console.log('🔍 SUPABASE PRODUCTS TABLE AUDIT');
  console.log('='.repeat(70));
  console.log('');

  // Sample products to check schema
  console.log('📋 Step 1: Check table schema...\n');

  const { data: sample, error: sampleError } = await supabase
    .from('products')
    .select('*')
    .limit(5);

  if (sampleError) {
    console.error('❌ Error fetching sample:', sampleError);
    return;
  }

  console.log('Available fields:');
  const fields = Object.keys(sample[0] || {});
  fields.forEach(field => {
    const sampleValue = sample[0][field];
    const type = Array.isArray(sampleValue) ? 'array' : typeof sampleValue;
    console.log(`  - ${field} (${type})`);
  });

  // Check for description fields
  const descFields = fields.filter(f => f.toLowerCase().includes('desc') || f.toLowerCase().includes('detail'));
  console.log(`\n📝 Description fields found: ${descFields.join(', ') || 'NONE'}`);

  // Get total count
  console.log('\n📊 Step 2: Count products...\n');

  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting:', countError);
    return;
  }

  console.log(`Total products: ${count}`);

  // Sample more products for quality check
  console.log('\n🔬 Step 3: Sample 100 products for quality audit...\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('product_id, title, image_url, r2_image_url, embedding_flat, is_outfit_eligible, department, product_type_1, detail_desc, prod_name')
    .limit(100);

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  // Check image availability
  const withImageUrl = products.filter(p => p.image_url);
  const withR2Url = products.filter(p => p.r2_image_url);
  const withEitherImage = products.filter(p => p.image_url || p.r2_image_url);
  const withNoImages = products.filter(p => !p.image_url && !p.r2_image_url);

  console.log('Image availability (100 sample):');
  console.log(`  image_url:      ${withImageUrl.length}/100`);
  console.log(`  r2_image_url:   ${withR2Url.length}/100`);
  console.log(`  Either:         ${withEitherImage.length}/100`);
  console.log(`  No images:      ${withNoImages.length}/100`);

  // Check embeddings
  const withEmbeddings = products.filter(p => p.embedding_flat);
  const embeddingTypes = {};
  withEmbeddings.forEach(p => {
    const type = typeof p.embedding_flat;
    embeddingTypes[type] = (embeddingTypes[type] || 0) + 1;
  });

  console.log('\nEmbeddings (100 sample):');
  console.log(`  Has embedding:  ${withEmbeddings.length}/100`);
  console.log(`  Types:`, embeddingTypes);

  // Check descriptions
  const withDetailDesc = products.filter(p => p.detail_desc);
  const withTitle = products.filter(p => p.title);
  const withProdName = products.filter(p => p.prod_name);

  console.log('\nText fields (100 sample):');
  console.log(`  detail_desc:    ${withDetailDesc.length}/100`);
  console.log(`  title:          ${withTitle.length}/100`);
  console.log(`  prod_name:      ${withProdName.length}/100`);

  // Show examples
  console.log('\n📝 Step 4: Example products...\n');

  products.slice(0, 3).forEach((p, i) => {
    console.log(`Example ${i + 1}:`);
    console.log(`  product_id:     ${p.product_id}`);
    console.log(`  title:          ${p.title || 'NULL'}`);
    console.log(`  prod_name:      ${p.prod_name || 'NULL'}`);
    console.log(`  detail_desc:    ${p.detail_desc ? p.detail_desc.substring(0, 80) + '...' : 'NULL'}`);
    console.log(`  image_url:      ${p.image_url ? 'EXISTS' : 'NULL'}`);
    console.log(`  r2_image_url:   ${p.r2_image_url ? 'EXISTS' : 'NULL'}`);
    console.log(`  embedding:      ${p.embedding_flat ? 'EXISTS' : 'NULL'}`);
    console.log(`  department:     ${p.department || 'NULL'}`);
    console.log(`  product_type_1: ${p.product_type_1 || 'NULL'}`);
    console.log('');
  });

  // Check outfit eligibility
  const outfitEligible = products.filter(p => p.is_outfit_eligible === true);
  console.log(`Outfit eligible: ${outfitEligible.length}/100`);

  console.log('\n' + '='.repeat(70));
  console.log('🎯 CRITICAL QUESTIONS:');
  console.log('='.repeat(70));
  console.log(`
1. Do we have detail_desc field? ${withDetailDesc.length > 0 ? '✅ YES' : '❌ NO'}
2. Were embeddings generated from detail_desc or title? ${withDetailDesc.length > 0 ? '⚠️ NEEDS CHECK' : '❌ Probably from title'}
3. Do products have images? ${withEitherImage.length >= 90 ? '✅ YES (most)' : '⚠️ PATCHY'}
4. Are embeddings in the right format? ${withEmbeddings.length > 0 ? '✅ YES' : '❌ NO'}

RECOMMENDATION:
- If embeddings were generated from titles/SKUs (not detail_desc), they will be poor quality
- FashionSigLIP needs 1-2 sentence descriptions of garment type, fit, material, details
- May need to regenerate embeddings from proper descriptions
  `);
}

auditSupabase().catch(console.error);
