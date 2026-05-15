#!/usr/bin/env node
/**
 * Migrate Outfits to Product ID References
 *
 * Transforms outfit structure from:
 *   { role: "tops", product: { id: "...", title: "...", imageUrl: "..." } }
 *
 * To:
 *   { role: "tops", product_id: "..." }
 *
 * This makes products table the single source of truth for all product data.
 */

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

async function migrateOutfits() {
  console.log('🔄 Starting outfit migration...\n');
  console.log('This will transform outfit structure to use product_id references only.');
  console.log('');

  // Get count first
  const { count } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  console.log(`Total outfits: ${count}\n`);

  // Fetch all outfits (paginate)
  let allOutfits = [];
  const pageSize = 1000;
  let page = 0;

  console.log('📦 Loading outfits...');

  while (true) {
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching outfits:', error);
      process.exit(1);
    }

    if (!outfits || outfits.length === 0) break;

    allOutfits = allOutfits.concat(outfits);
    page++;
    process.stdout.write(`\r  Loaded ${allOutfits.length} / ${count} outfits...`);

    if (outfits.length < pageSize) break;
  }

  console.log(`\n✓ Loaded all ${allOutfits.length} outfits\n`);

  // Show sample transformation
  if (allOutfits.length > 0 && allOutfits[0].items && allOutfits[0].items.length > 0) {
    console.log('📋 Sample transformation:\n');
    const sampleItem = allOutfits[0].items[0];

    console.log('BEFORE:');
    console.log(JSON.stringify(sampleItem, null, 2));
    console.log('');

    const transformedItem = transformItem(sampleItem);
    console.log('AFTER:');
    console.log(JSON.stringify(transformedItem, null, 2));
    console.log('');
  }

  // Pause for confirmation
  console.log('⚠️  This will update ALL outfits in Supabase.');
  console.log('   Make sure you have a backup! (run: node scripts/backup-outfits.js)');
  console.log('');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🚀 Starting migration...\n');

  // Transform and update each outfit
  let updated = 0;
  let errors = 0;

  for (const outfit of allOutfits) {
    try {
      // Transform items array
      const transformedItems = outfit.items.map(transformItem);

      // Update outfit in Supabase
      const { error } = await supabase
        .from('outfits')
        .update({ items: transformedItems })
        .eq('outfit_id', outfit.outfit_id);

      if (error) {
        console.error(`\n❌ Error updating ${outfit.outfit_id}:`, error.message);
        errors++;
      } else {
        updated++;
        if (updated % 100 === 0) {
          process.stdout.write(`\r  Updated ${updated} / ${allOutfits.length} outfits...`);
        }
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${outfit.outfit_id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n\n✅ MIGRATION COMPLETE`);
  console.log(`   Updated: ${updated} outfits`);
  console.log(`   Errors: ${errors}`);
  console.log('');
  console.log('✨ Outfits now reference products by ID only.');
  console.log('   Product data (images, titles, prices) will be fetched from products table.');
  console.log('');
}

/**
 * Transform item from embedded product to product_id reference
 */
function transformItem(item) {
  // Extract product ID from embedded product object
  const productId = item.product?.id || item.product_id;

  if (!productId) {
    console.warn('⚠️  Item missing product ID:', item);
    return item; // Keep as-is if no ID found
  }

  // New structure: just role and product_id
  const transformed = {
    role: item.role,
    product_id: productId,
  };

  // Keep ingredientTitle if it exists (useful metadata)
  if (item.ingredientTitle) {
    transformed.ingredientTitle = item.ingredientTitle;
  }

  return transformed;
}

migrateOutfits().catch(console.error);
