#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOutfits() {
  console.log('Checking outfit structure...\n');

  // Get one outfit
  const { data: outfits } = await supabase
    .from('outfits')
    .select('outfit_id, items')
    .limit(1);

  if (!outfits || outfits.length === 0) {
    console.log('No outfits found!');
    return;
  }

  const outfit = outfits[0];
  console.log(`Outfit ID: ${outfit.outfit_id}`);
  console.log(`\nOutfit has ${outfit.items.length} items`);
  console.log(`\nFirst item structure:`);
  console.log(JSON.stringify(outfit.items[0], null, 2));

  // Check if items reference product IDs or embed full products
  const firstItem = outfit.items[0];
  if (firstItem.product) {
    console.log('\n⚠️ PROBLEM: Outfit embeds full product object!');
    console.log(`   Product ID: ${firstItem.product.id}`);
    console.log(`   Product imageUrl: ${firstItem.product.imageUrl}`);
    console.log('\n✅ SOLUTION: Change to just store product_id, fetch product data when displaying');
  } else if (firstItem.product_id) {
    console.log('\n✅ GOOD: Outfit references product_id');
    console.log(`   Product ID: ${firstItem.product_id}`);
  }
}

checkOutfits().catch(console.error);
