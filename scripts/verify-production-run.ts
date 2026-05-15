#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyProductionRun() {
  // Sample products from beginning, middle, and end of the run
  const productIds = [
    'hm-kaggle-0599716002',      // Early: suede
    'hm-kaggle-0632523005',      // Early: suede
    'hm-kaggle-0850239001',      // Middle: cedar
    'hm-kaggle-0767820001',      // Middle: chiffon, viscose
    'hm-kaggle-0921571001',      // Late: tweed
    'lola-8295401'               // Last: mesh, nylon, rubber
  ];

  const { data, error } = await supabase
    .from('products')
    .select('product_id, materials, materials_confidence, materials_source')
    .in('product_id', productIds);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   DATABASE VERIFICATION - PRODUCTION RUN     ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  let updatedCount = 0;
  data?.forEach(p => {
    const hasData = p.materials && p.materials.length > 0;
    if (hasData) updatedCount++;
    
    console.log(`Product: ${p.product_id}`);
    console.log(`  Materials: ${hasData ? JSON.stringify(p.materials) : '❌ EMPTY'}`);
    console.log(`  Confidence: ${p.materials_confidence}%`);
    console.log(`  Source: ${p.materials_source || 'NULL'}`);
    console.log(`  ${hasData ? '✅ VERIFIED' : '❌ NOT UPDATED'}`);
    console.log('');
  });
  
  console.log(`📊 Summary: ${updatedCount}/${productIds.length} sampled products verified in database\n`);
  
  if (updatedCount === productIds.length) {
    console.log('✅ ALL SAMPLED PRODUCTS SUCCESSFULLY UPDATED!\n');
  } else {
    console.log(`⚠️  ${productIds.length - updatedCount} products not updated - may need investigation\n`);
  }
}

verifyProductionRun();
