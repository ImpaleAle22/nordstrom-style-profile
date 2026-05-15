/**
 * Find outfits in Supabase that currently have Bug 1 (empty axes with "???")
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('=== SEARCHING FOR BUG 1 OUTFITS (activityContext or socialRegister = "???") ===\n');

  // Fetch all outfits with attributes (paginated)
  const allData: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
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

  console.log(`Searching ${allData.length} outfits...\n`);

  // Find outfits with "???" in activityContext or socialRegister
  const bug1Outfits = allData.filter(outfit => {
    const attr = outfit.attributes;
    return attr && (
      attr.activityContext === '???' ||
      attr.socialRegister === '???'
    );
  });

  console.log(`Found ${bug1Outfits.length} outfits with Bug 1\n`);

  if (bug1Outfits.length > 0) {
    console.log('Sample outfits with Bug 1:\n');
    bug1Outfits.slice(0, 5).forEach((outfit, idx) => {
      console.log(`${idx + 1}. ${outfit.outfit_id}`);
      console.log(`   Recipe: ${outfit.recipe_title}`);
      console.log(`   Items (${outfit.items.length}):`);
      outfit.items.forEach((item: any) => {
        console.log(`     - ${item.role}: ${item.ingredientTitle || item.product?.title || 'Unknown'}`);
      });
      console.log(`   Attributes:`);
      console.log(`     stylePillar: ${outfit.attributes?.stylePillar}`);
      console.log(`     formality: ${outfit.attributes?.formality}`);
      console.log(`     activityContext: ${outfit.attributes?.activityContext}`);
      console.log(`     socialRegister: ${outfit.attributes?.socialRegister}`);
      console.log(`     occasions: [${outfit.attributes?.occasions?.join(', ') || 'EMPTY'}]`);
      console.log('');
    });
  }

  // Also find outfits with high formality for casual items (Bug 2)
  console.log('\n=== SEARCHING FOR BUG 2 OUTFITS (formality > 4.5 for casual items) ===\n');

  const bug2Candidates = allData.filter(outfit => {
    const attr = outfit.attributes;
    if (!attr || attr.formality == null) return false;

    // High formality but casual pillar
    const highFormalityCasual = attr.stylePillar === 'Casual' && attr.formality > 4.5;

    // Or check if items suggest casual but formality is high
    const items = outfit.items || [];
    const titles = items.map((item: any) =>
      (item.ingredientTitle || item.product?.title || '').toLowerCase()
    ).join(' ');

    const hasCasualItems = titles.includes('jeans') || titles.includes('sweater') || titles.includes('t-shirt') || titles.includes('sneaker');
    const highFormalityWithCasualItems = hasCasualItems && attr.formality > 4.5;

    return highFormalityCasual || highFormalityWithCasualItems;
  });

  console.log(`Found ${bug2Candidates.length} potential Bug 2 outfits\n`);

  if (bug2Candidates.length > 0) {
    console.log('Sample outfits with potential Bug 2:\n');
    bug2Candidates.slice(0, 3).forEach((outfit, idx) => {
      console.log(`${idx + 1}. ${outfit.outfit_id}`);
      console.log(`   Recipe: ${outfit.recipe_title}`);
      console.log(`   Formality: ${outfit.attributes?.formality} (stylePillar: ${outfit.attributes?.stylePillar})`);
      console.log(`   Items:`);
      outfit.items.forEach((item: any) => {
        console.log(`     - ${item.ingredientTitle || item.product?.title || 'Unknown'}`);
      });
      console.log('');
    });
  }
}

main();
