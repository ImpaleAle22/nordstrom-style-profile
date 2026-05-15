import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function deleteAirPods() {
  const toDelete = [];
  let offset = 0;
  const batchSize = 1000;

  console.log('🔍 Finding all AirPods cases...\n');

  while (true) {
    const { data: batch } = await supabase
      .from('outfits')
      .select('outfit_id, recipe_id, items')
      .range(offset, offset + batchSize - 1);

    if (!batch || batch.length === 0) break;

    for (const outfit of batch) {
      if (!outfit.items) continue;
      for (const item of outfit.items) {
        const title = (item.product?.title || item.title || '').toLowerCase();
        if (title.includes('air pod') || title.includes('airpod')) {
          toDelete.push(outfit.outfit_id);
          console.log(`  Found: ${outfit.outfit_id}`);
          break;
        }
      }
    }

    offset += batchSize;
    if (batch.length < batchSize) break;
  }

  console.log(`\n🗑️  Deleting ${toDelete.length} outfits with AirPods cases...`);

  if (toDelete.length > 0) {
    const { data, error } = await supabase
      .from('outfits')
      .delete()
      .in('outfit_id', toDelete)
      .select('outfit_id');

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log(`✅ Successfully deleted ${data.length} outfits\n`);
    }
  } else {
    console.log('✅ No AirPods cases found!\n');
  }
}

deleteAirPods();
