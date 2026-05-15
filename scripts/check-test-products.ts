#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkProducts() {
  // Check products from the FIRST test (5 products that should have been tagged)
  const productIds = [
    'handm_men_shoes_1773350388978_4',  // Should have: leather, rubber
    'handm_women_pants_1773349744383_14', // Should have: knit, ribbed knit
    'handm_women_shoes_1773350028138_12'  // Should have: faux leather
  ];

  const { data, error } = await supabase
    .from('products')
    .select('product_id, materials, materials_confidence, materials_source')
    .in('product_id', productIds);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n✅ Products from FIRST test (5 products):\n');
  data?.forEach(p => {
    console.log(`Product: ${p.product_id}`);
    console.log(`  Materials: ${p.materials ? JSON.stringify(p.materials) : 'NULL'}`);
    console.log(`  Confidence: ${p.materials_confidence}%`);
    console.log(`  Source: ${p.materials_source}`);
    console.log('');
  });
}

checkProducts();
