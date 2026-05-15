#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyBatch() {
  // Check a sample of products from different parts of the batch
  const productIds = [
    'handm_women_shoes_1773350028138_19',  // Early: suede, leather
    'hm-kaggle-0843903001',                // Middle: straw, metal
    'hm-kaggle-0866237001',                // Late: straw
    'hm-kaggle-0767820001',                // Late: chiffon, viscose
    'hm-kaggle-0850239001'                 // Late: cedar
  ];

  const { data, error } = await supabase
    .from('products')
    .select('product_id, materials, materials_confidence, materials_source')
    .in('product_id', productIds);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n🎉 DATABASE VERIFICATION - 57-Product Batch:\n');
  
  let updatedCount = 0;
  data?.forEach(p => {
    const hasData = p.materials && p.materials.length > 0;
    if (hasData) updatedCount++;
    
    console.log(`Product: ${p.product_id}`);
    console.log(`  Materials: ${hasData ? JSON.stringify(p.materials) : '❌ EMPTY'}`);
    console.log(`  Confidence: ${p.materials_confidence}%`);
    console.log(`  Source: ${p.materials_source || 'NULL'}`);
    console.log(`  ${hasData ? '✅ UPDATED' : '❌ NOT UPDATED'}`);
    console.log('');
  });
  
  console.log(`\n📊 Summary: ${updatedCount}/${productIds.length} products verified in database`);
}

verifyBatch();
