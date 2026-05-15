/**
 * Delete outfits containing tech accessories (phone cases, AirPods cases)
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

// Tech accessory keywords to search for
const TECH_KEYWORDS = [
  'phone case',
  'phone shell',
  'phone necklace',
  'airpod',
  'air pod',
  'earbud case',
  'phone grip',
  'pop socket',
  'popsocket',
];

async function findAndDeleteTechOutfits() {
  console.log('🔍 Scanning for outfits with tech accessories...\n');

  // Get total count first
  const { count, error: countError } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error getting count:', countError);
    return;
  }

  console.log(`Total outfits in database: ${count}\n`);

  // Fetch ALL outfits in batches (Supabase default limit is 1000)
  const allOutfits = [];
  const batchSize = 1000;
  let offset = 0;

  while (true) {
    console.log(`Fetching batch ${Math.floor(offset / batchSize) + 1} (${offset}-${offset + batchSize})...`);

    const { data: batch, error } = await supabase
      .from('outfits')
      .select('outfit_id, recipe_id, items, quality_score, alignment_score')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching batch:', error);
      break;
    }

    if (!batch || batch.length === 0) break;

    allOutfits.push(...batch);
    offset += batchSize;

    if (batch.length < batchSize) break; // Last batch
  }

  console.log(`\nLoaded ${allOutfits.length} outfits total.\n`);

  const outfits = allOutfits;

  // Find contaminated outfits
  const contaminatedOutfits = [];

  for (const outfit of outfits) {
    if (!outfit.items || !Array.isArray(outfit.items)) continue;

    for (const item of outfit.items) {
      const title = (item.product?.title || item.title || '').toLowerCase();

      for (const keyword of TECH_KEYWORDS) {
        if (title.includes(keyword)) {
          contaminatedOutfits.push({
            outfit_id: outfit.outfit_id,
            recipe_id: outfit.recipe_id,
            contaminated_item: item.product?.title || item.title,
            matched_keyword: keyword,
            quality_score: outfit.quality_score,
            alignment_score: outfit.alignment_score,
          });
          break; // Only need to flag once per outfit
        }
      }
    }
  }

  if (contaminatedOutfits.length === 0) {
    console.log('✅ No contaminated outfits found! All outfits are clean.');
    return;
  }

  console.log(`⚠️  Found ${contaminatedOutfits.length} contaminated outfits:\n`);
  console.log('═'.repeat(80));

  // List contaminated outfits
  contaminatedOutfits.forEach((outfit, idx) => {
    console.log(`${idx + 1}. Outfit ID: ${outfit.outfit_id}`);
    console.log(`   Recipe: ${outfit.recipe_id || 'none'}`);
    console.log(`   Tech Item: "${outfit.contaminated_item}"`);
    console.log(`   Matched: "${outfit.matched_keyword}"`);
    console.log(`   Scores: Quality ${outfit.quality_score}, Alignment ${outfit.alignment_score}`);
    console.log('');
  });

  console.log('═'.repeat(80));
  console.log(`\nTotal contaminated outfits: ${contaminatedOutfits.length}`);
  console.log('\n🗑️  Deleting contaminated outfits...\n');

  // Delete contaminated outfits
  const outfitIdsToDelete = contaminatedOutfits.map(o => o.outfit_id);

  const { data: deleted, error: deleteError } = await supabase
    .from('outfits')
    .delete()
    .in('outfit_id', outfitIdsToDelete)
    .select();

  if (deleteError) {
    console.error('❌ Error deleting outfits:', deleteError);
    return;
  }

  console.log(`✅ Successfully deleted ${deleted?.length || 0} contaminated outfits`);

  // Show breakdown by recipe
  const byRecipe = contaminatedOutfits.reduce((acc, outfit) => {
    const recipe = outfit.recipe_id || 'no-recipe';
    acc[recipe] = (acc[recipe] || 0) + 1;
    return acc;
  }, {});

  console.log('\nDeleted outfits by recipe:');
  for (const [recipe, count] of Object.entries(byRecipe)) {
    console.log(`  ${recipe}: ${count} outfits`);
  }

  console.log('\n✨ Cleanup complete!');
}

// Run the cleanup
findAndDeleteTechOutfits().catch(console.error);
