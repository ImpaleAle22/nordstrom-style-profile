/**
 * Scan all outfits for non-outfit-eligible items
 *
 * Checks product titles for tech accessories, home goods, etc.
 * that shouldn't be in fashion outfits
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Suspicious keywords that indicate non-outfit items
const SUSPICIOUS_KEYWORDS = {
  tech: [
    'phone case', 'phone shell', 'phone necklace', 'phone holder', 'phone stand', 'phone grip',
    'airpod', 'air pod', 'earbud', 'headphone',
    'charger', 'cable', 'adapter', 'cord',
    'screen protector', 'protector',
    'pop socket', 'popsocket',
    'tech', 'electronic', 'bluetooth',
    'usb', 'charging',
  ],
  home: [
    'pillow', 'cushion', 'throw', 'blanket',
    'candle', 'diffuser', 'room spray',
    'picture frame', 'photo frame',
    'vase', 'plant pot', 'planter',
    'mug', 'cup', 'glass', 'bottle',
    'towel', 'bathmat',
  ],
  beauty: [
    'makeup', 'cosmetic', 'foundation', 'lipstick', 'mascara',
    'nail polish', 'nail lacquer',
    'perfume', 'fragrance', 'cologne',
    'shampoo', 'conditioner', 'hair spray', 'hair gel',
    'lotion', 'cream', 'serum', 'moisturizer',
    'soap', 'body wash',
  ],
  other: [
    'keychain', 'key ring',
    'luggage tag', 'travel tag',
    'sticker', 'patch',
    'gift card', 'voucher',
  ],
};

async function scanOutfits() {
  console.log('🔍 Scanning all outfits for non-outfit-eligible items...\n');

  // Get total count first
  const { count, error: countError } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error getting count:', countError);
    return;
  }

  console.log(`Total outfits in database: ${count}\n`);

  // Fetch ALL outfits in batches
  const allOutfits = [];
  const batchSize = 1000;
  let offset = 0;

  while (true) {
    console.log(`Fetching batch ${Math.floor(offset / batchSize) + 1}...`);

    const { data: batch, error } = await supabase
      .from('outfits')
      .select('outfit_id, items')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching batch:', error);
      break;
    }

    if (!batch || batch.length === 0) break;

    allOutfits.push(...batch);
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  console.log(`Loaded ${allOutfits.length} outfits total.\n`);

  const outfits = allOutfits;

  // Track all product titles and their frequency
  const productTitleCounts = new Map();

  for (const outfit of outfits) {
    if (!outfit.items || !Array.isArray(outfit.items)) continue;

    for (const item of outfit.items) {
      const title = item.product?.title || item.title;
      if (!title) continue;

      const titleLower = title.toLowerCase();
      productTitleCounts.set(titleLower, (productTitleCounts.get(titleLower) || 0) + 1);
    }
  }

  console.log(`Found ${productTitleCounts.size} unique products across all outfits.\n`);

  // Find suspicious products
  const suspiciousProducts = [];

  for (const [title, count] of productTitleCounts.entries()) {
    for (const [category, keywords] of Object.entries(SUSPICIOUS_KEYWORDS)) {
      for (const keyword of keywords) {
        if (title.includes(keyword)) {
          suspiciousProducts.push({
            title,
            category,
            matchedKeyword: keyword,
            count,
          });
          break; // Only report each product once per category
        }
      }
    }
  }

  // Sort by frequency (most common first)
  suspiciousProducts.sort((a, b) => b.count - a.count);

  // Report findings
  if (suspiciousProducts.length === 0) {
    console.log('✅ No suspicious products found! All items appear to be outfit-eligible.');
    return;
  }

  console.log(`⚠️  Found ${suspiciousProducts.length} suspicious products:\n`);
  console.log('═'.repeat(80));

  // Group by category
  const byCategory = suspiciousProducts.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  for (const [category, items] of Object.entries(byCategory)) {
    console.log(`\n🚨 ${category.toUpperCase()} (${items.length} items)`);
    console.log('─'.repeat(80));

    for (const item of items) {
      console.log(`  ${item.title}`);
      console.log(`    → Matched: "${item.matchedKeyword}"`);
      console.log(`    → Appears in ${item.count} outfit${item.count > 1 ? 's' : ''}`);
    }
  }

  console.log('\n═'.repeat(80));
  console.log(`\nSummary:`);
  console.log(`  Total unique products: ${productTitleCounts.size}`);
  console.log(`  Suspicious products: ${suspiciousProducts.length} (${((suspiciousProducts.length / productTitleCounts.size) * 100).toFixed(1)}%)`);
  console.log(`  Total outfit contaminations: ${suspiciousProducts.reduce((sum, p) => sum + p.count, 0)}`);

  console.log('\n💡 Recommendation: Add these keywords to filterExplicitOnlyItems() function');
}

// Run the scan
scanOutfits().catch(console.error);
