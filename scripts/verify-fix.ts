#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkProducts() {
  const productIds = [
    'handm_women_shoes_1773350028138_14',  // Should NOW have: faux leather
    'handm_women_shoes_1773350028138_24'   // Should NOW have: suede, leather
  ];

  const { data, error } = await supabase
    .from('products')
    .select('product_id, materials, materials_confidence, materials_source')
    .in('product_id', productIds);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n🎉 VERIFICATION - Products after FIX:\n');
  data?.forEach(p => {
    console.log(`Product: ${p.product_id}`);
    console.log(`  Materials: ${p.materials ? JSON.stringify(p.materials) : 'NULL'}`);
    console.log(`  Confidence: ${p.materials_confidence}%`);
    console.log(`  Source: ${p.materials_source}`);
    const expected = p.product_id.includes('_14') ? '["faux leather"]' : '["suede","leather"]';
    const match = JSON.stringify(p.materials) === expected;
    console.log(`  ${match ? '✅ MATCH!' : '❌ MISMATCH'}`);
    console.log('');
  });
}

checkProducts();
