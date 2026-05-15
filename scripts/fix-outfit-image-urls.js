#!/usr/bin/env node
/**
 * Fix Outfit Image URLs
 *
 * Updates outfit.items[].product.imageUrl from localhost to R2 URLs
 * by matching product IDs from old format (hm-kaggle-*) to new UUIDs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Extract article number from various formats
function extractArticleNumber(productId) {
  // hm-kaggle-0775026001 -> 0775026001
  if (productId.startsWith('hm-kaggle-')) {
    return productId.replace('hm-kaggle-', '').split('_')[0];
  }
  return null;
}

async function fixOutfitImageUrls() {
  console.log('🔍 Loading outfits...');

  // Load ALL outfits (paginate to avoid 1000 record limit)
  let allOutfits = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: outfits, error: outfitsError } = await supabase
      .from('outfits')
      .select('outfit_id, items')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (outfitsError) {
      console.error('Error loading outfits:', outfitsError);
      return;
    }

    if (!outfits || outfits.length === 0) break;

    allOutfits = allOutfits.concat(outfits);
    page++;

    if (outfits.length < pageSize) break; // Last page
  }

  console.log(`✓ Loaded ${allOutfits.length} outfits`);

  // Find outfits with localhost URLs
  const outfitsToFix = allOutfits.filter(outfit => {
    return outfit.items.some(item =>
      item.product.imageUrl && item.product.imageUrl.includes('localhost')
    );
  });

  console.log(`🔧 Found ${outfitsToFix.length} outfits with localhost URLs`);

  if (outfitsToFix.length === 0) {
    console.log('✅ No outfits need fixing!');
    return;
  }

  // Load ALL products with R2 URLs for lookup (paginate)
  console.log('📦 Loading products for lookup...');
  let allProducts = [];
  page = 0;

  while (true) {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, r2_image_url, image_url, brand')
      .not('r2_image_url', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (productsError) {
      console.error('Error loading products:', productsError);
      return;
    }

    if (!products || products.length === 0) break;

    allProducts = allProducts.concat(products);
    page++;
    console.log(`  ... loaded ${allProducts.length} products so far`);

    if (products.length < pageSize) break; // Last page
  }

  console.log(`✓ Loaded ${allProducts.length} products with R2 URLs`);

  // Create lookup maps for different product ID formats
  const articleMap = new Map(); // article number -> imageUrl
  const idMap = new Map(); // old product ID -> imageUrl

  allProducts.forEach(product => {
    const imageUrl = product.image_url || product.r2_image_url;

    // Map 1: Extract article number from R2 URL for H&M Kaggle
    // https://...r2.dev/products/hm-kaggle-0775026001_flat_lay_01.jpg
    const hmMatch = product.r2_image_url.match(/hm-kaggle-(\d+)/);
    if (hmMatch) {
      articleMap.set(hmMatch[1], imageUrl);
      idMap.set(`hm-kaggle-${hmMatch[1]}`, imageUrl);
    }

    // Map 2: Try to extract any product identifier from R2 URL
    const filenameMatch = product.r2_image_url.match(/\/([^\/]+)\.(jpg|png|webp)/i);
    if (filenameMatch) {
      const filename = filenameMatch[1];
      idMap.set(filename, imageUrl);
    }
  });

  console.log(`✓ Created lookup maps with ${articleMap.size} articles + ${idMap.size} IDs`);

  // Fix each outfit
  let fixed = 0;
  let notFound = 0;

  for (const outfit of outfitsToFix) {
    let modified = false;
    const updatedItems = outfit.items.map(item => {
      if (item.product.imageUrl && item.product.imageUrl.includes('localhost')) {
        let correctUrl = null;

        // Try 1: Direct ID match
        if (idMap.has(item.product.id)) {
          correctUrl = idMap.get(item.product.id);
        }
        // Try 2: Article number match (for H&M Kaggle)
        else {
          const articleNum = extractArticleNumber(item.product.id);
          if (articleNum && articleMap.has(articleNum)) {
            correctUrl = articleMap.get(articleNum);
          }
        }

        if (correctUrl) {
          console.log(`  ✓ ${item.product.id} -> ${correctUrl.substring(0, 60)}...`);
          item.product.imageUrl = correctUrl;
          modified = true;
        } else {
          console.log(`  ⚠️ No match for ${item.product.id}`);
          notFound++;
        }
      }
      return item;
    });

    if (modified) {
      // Update outfit in Supabase
      const { error: updateError } = await supabase
        .from('outfits')
        .update({ items: updatedItems })
        .eq('outfit_id', outfit.outfit_id);

      if (updateError) {
        console.error(`Error updating ${outfit.outfit_id}:`, updateError);
      } else {
        fixed++;
      }
    }
  }

  console.log('');
  console.log('✅ COMPLETE');
  console.log(`   Fixed: ${fixed} outfits`);
  console.log(`   Not found: ${notFound} products`);
  console.log('');
  console.log('Refresh /admin/outfits to see fixed images!');
}

// Run it
fixOutfitImageUrls().catch(console.error);
