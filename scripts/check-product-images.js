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

async function checkProducts() {
  console.log('Checking product images...\n');

  // Get total count
  const { count: total } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`Total products: ${total}\n`);

  // Sample first 5
  console.log('FIRST 5 PRODUCTS:');
  const { data: first5 } = await supabase
    .from('products')
    .select('id, title, image_url, r2_image_url, brand')
    .limit(5);

  first5.forEach(p => {
    console.log(`\n${p.title} (${p.brand})`);
    console.log(`  image_url: ${p.image_url || 'NULL'}`);
    console.log(`  r2_image_url: ${p.r2_image_url || 'NULL'}`);
  });

  // Sample last 5 (by offset, not created_at since that column might not exist)
  console.log('\n\nLAST 5 PRODUCTS (from end of table):');
  const { data: last5 } = await supabase
    .from('products')
    .select('id, title, image_url, r2_image_url, brand')
    .range(total - 5, total - 1);

  if (last5) {
    last5.forEach(p => {
      console.log(`\n${p.title} (${p.brand})`);
      console.log(`  image_url: ${p.image_url || 'NULL'}`);
      console.log(`  r2_image_url: ${p.r2_image_url || 'NULL'}`);
    });
  }

  // Count by states (need to paginate - Supabase default limit is 1000)
  console.log('\n\nCounting image URL states (this may take a minute)...');

  const stats = {
    hasImageUrl: 0,
    hasR2Url: 0,
    hasBoth: 0,
    hasNeither: 0
  };

  const pageSize = 1000;
  let page = 0;

  while (true) {
    const { data: products } = await supabase
      .from('products')
      .select('image_url, r2_image_url')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!products || products.length === 0) break;

    products.forEach(p => {
      const hasImg = p.image_url && p.image_url.trim() !== '';
      const hasR2 = p.r2_image_url && p.r2_image_url.trim() !== '';

      if (hasImg) stats.hasImageUrl++;
      if (hasR2) stats.hasR2Url++;
      if (hasImg && hasR2) stats.hasBoth++;
      if (!hasImg && !hasR2) stats.hasNeither++;
    });

    page++;
    process.stdout.write(`\r  Processed ${Math.min(page * pageSize, total)} / ${total} products...`);

    if (products.length < pageSize) break;
  }

  console.log('\n\nIMAGE URL STATISTICS:');
  console.log(`  Has image_url: ${stats.hasImageUrl} (${(stats.hasImageUrl/total*100).toFixed(1)}%)`);
  console.log(`  Has r2_image_url: ${stats.hasR2Url} (${(stats.hasR2Url/total*100).toFixed(1)}%)`);
  console.log(`  Has both: ${stats.hasBoth} (${(stats.hasBoth/total*100).toFixed(1)}%)`);
  console.log(`  Has neither: ${stats.hasNeither} (${(stats.hasNeither/total*100).toFixed(1)}%)`);
}

checkProducts().catch(console.error);
