/**
 * Workstream 1 — Task 1
 * Find the 5 bad-example outfits from the audit in Supabase
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findGraySweaterOutfit() {
  console.log('\n=== SEARCHING FOR BAD EXAMPLE 1: Gray Sweater Outfit ===\n');
  console.log('Looking for: Gray knit sweater + blue jeans + white sneakers + gold necklace\n');

  // Fetch all outfits with attributes (we need to search through items)
  const allData: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore && page < 10) { // Limit to first 10K outfits for performance
    const { data } = await supabase
      .from('outfits')
      .select('outfit_id, recipe_title, items, attributes')
      .not('attributes', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Searching through ${allData.length} outfits...\n`);

  // Search for gray sweater outfit
  const candidates = allData.filter(outfit => {
    const items = outfit.items || [];
    const titles = items.map((item: any) =>
      (item.ingredientTitle || item.product?.title || '').toLowerCase()
    ).join(' ');

    // Look for: sweater + jeans + sneaker + necklace
    const hasSweater = titles.includes('sweater') || titles.includes('knit');
    const hasJeans = titles.includes('jeans') || titles.includes('denim');
    const hasSneakers = titles.includes('sneaker');
    const hasNecklace = titles.includes('necklace');

    return hasSweater && hasJeans && hasSneakers && hasNecklace;
  });

  if (candidates.length > 0) {
    console.log(`✓ Found ${candidates.length} matching outfit(s):\n`);
    candidates.forEach((outfit, idx) => {
      console.log(`Match ${idx + 1}: ${outfit.outfit_id}`);
      console.log(`Recipe: ${outfit.recipe_title}`);
      console.log(`Items:`);
      outfit.items.forEach((item: any) => {
        console.log(`  - ${item.role}: ${item.ingredientTitle || item.product?.title || 'Unknown'}`);
      });
      console.log(`Current tags:`);
      console.log(`  stylePillar: ${outfit.attributes?.stylePillar || 'none'}`);
      console.log(`  formality: ${outfit.attributes?.formality || 'none'}`);
      console.log(`  activityContext: ${outfit.attributes?.activityContext || 'none'}`);
      console.log(`  socialRegister: ${outfit.attributes?.socialRegister || 'none'}`);
      console.log(`  occasions: ${outfit.attributes?.occasions?.length || 0} occasions`);
      console.log('');
    });

    return candidates[0].outfit_id;
  } else {
    console.log('✗ No exact match found. Will need to construct synthetic test outfit.\n');
    return null;
  }
}

async function findLeatherJacketOutfit() {
  console.log('\n=== SEARCHING FOR BAD EXAMPLE 2: Leather Biker Jacket ===\n');
  console.log('Looking for: Leather jacket + black jeans + combat boots + band t-shirt\n');

  const { data } = await supabase
    .from('outfits')
    .select('outfit_id, recipe_title, items, attributes')
    .not('attributes', 'is', null)
    .limit(5000);

  const candidates = (data || []).filter(outfit => {
    const titles = (outfit.items || []).map((item: any) =>
      (item.ingredientTitle || item.product?.title || '').toLowerCase()
    ).join(' ');

    const hasLeatherJacket = titles.includes('leather') && titles.includes('jacket');
    const hasJeans = titles.includes('jeans');
    const hasBoots = titles.includes('boot');

    return hasLeatherJacket && hasJeans && hasBoots;
  });

  if (candidates.length > 0) {
    console.log(`✓ Found ${candidates.length} matching outfit(s)\n`);
    console.log(`Using: ${candidates[0].outfit_id}`);
    return candidates[0].outfit_id;
  } else {
    console.log('✗ No match. Will construct synthetic.\n');
    return null;
  }
}

async function findBlazerJeansOutfit() {
  console.log('\n=== SEARCHING FOR BAD EXAMPLE 3: Blazer + Jeans ===\n');
  console.log('Looking for: Blazer + button-up + jeans + loafers\n');

  const { data } = await supabase
    .from('outfits')
    .select('outfit_id, recipe_title, items, attributes')
    .not('attributes', 'is', null)
    .limit(5000);

  const candidates = (data || []).filter(outfit => {
    const titles = (outfit.items || []).map((item: any) =>
      (item.ingredientTitle || item.product?.title || '').toLowerCase()
    ).join(' ');

    const hasBlazer = titles.includes('blazer');
    const hasJeans = titles.includes('jeans') || titles.includes('denim');
    const hasShirt = titles.includes('shirt') || titles.includes('button');

    return hasBlazer && hasJeans && hasShirt;
  });

  if (candidates.length > 0) {
    console.log(`✓ Found ${candidates.length} matching outfit(s)\n`);
    console.log(`Using: ${candidates[0].outfit_id}`);
    return candidates[0].outfit_id;
  } else {
    console.log('✗ No match. Will construct synthetic.\n');
    return null;
  }
}

async function main() {
  console.log('=== FINDING BAD EXAMPLE OUTFITS FOR AXIS DIAGNOSTIC ===');

  const found: any = {
    'Bad 1 (Gray Sweater)': await findGraySweaterOutfit(),
    'Bad 2 (Leather Jacket)': await findLeatherJacketOutfit(),
    'Bad 3 (Blazer+Jeans)': await findBlazerJeansOutfit(),
  };

  console.log('\n=== SUMMARY ===\n');
  Object.entries(found).forEach(([name, id]) => {
    console.log(`${name}: ${id || 'NOT FOUND - will use synthetic'}`);
  });

  console.log('\nNote: Bad Examples 4 & 5 will be constructed as synthetic test cases if needed.');
}

main();
