#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkProducts() {
  const productIds = ['hm-kaggle-0634825001', 'hm-kaggle-0841960002'];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('product_id', productIds);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📦 Raw Product Data:\n');
  console.log(JSON.stringify(data, null, 2));
}

checkProducts();
