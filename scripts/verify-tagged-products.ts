#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkProducts() {
  // Check a few recently tagged products
  const productIds = [
    'hm-kaggle-0634825001',
    'hm-kaggle-0588245004',
    'hm-kaggle-0841960002',
    'handm_women_tops_1773349844414_3',
    'hm-kaggle-0682765001'
  ];

  const { data, error } = await supabase
    .from('products')
    .select('product_id, title, materials, materials_confidence, materials_source')
    .in('product_id', productIds);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n✅ Database Verification - Recently Tagged Products:\n');
  data?.forEach(p => {
    console.log(`Product: ${p.product_id}`);
    console.log(`  Title: ${p.title || 'N/A'}`);
    console.log(`  Materials: ${p.materials ? p.materials.join(', ') : 'N/A'}`);
    console.log(`  Confidence: ${p.materials_confidence}%`);
    console.log(`  Source: ${p.materials_source}`);
    console.log('');
  });
}

checkProducts();
