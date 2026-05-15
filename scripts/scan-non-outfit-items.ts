/**
 * Scan all outfits for non-outfit-eligible items
 *
 * Checks product titles for tech accessories, home goods, etc.
 * that shouldn't be in fashion outfits
 */

import { supabase } from '../lib/supabase-client';

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

interface SuspiciousProduct {
  title: string;
  category: string;
  matchedKeyword: string;
  count: number; // How many times it appears in outfits
}

async function scanOutfits() {
  console.log('🔍 Scanning all outfits for non-outfit-eligible items...\n');

  // Fetch all outfits from Supabase
  const { data: outfits, error } = await supabase
    .from('outfits')
    .select('id, items');

  if (error) {
    console.error('Error fetching outfits:', error);
    return;
  }

  if (!outfits || outfits.length === 0) {
    console.log('No outfits found in database.');
    return;
  }

  console.log(`Found ${outfits.length} outfits to scan.\n`);

  // Track all product titles and their frequency
  const productTitleCounts = new Map<string, number>();

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
  const suspiciousProducts: SuspiciousProduct[] = [];

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
  }, {} as Record<string, SuspiciousProduct[]>);

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
