#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkVisionOutfitStatus() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   VISION OUTFITS - TAGGING STATUS            ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Get total count of vision outfits
  const { count: totalCount, error: countError } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true })
    .like('outfit_id', 'vision-%');

  if (countError) {
    console.error('Error getting total count:', countError);
    return;
  }

  console.log(`Total vision outfits: ${totalCount}\n`);

  // Get count of already tagged outfits
  const { count: taggedCount, error: taggedError } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true })
    .like('outfit_id', 'vision-%')
    .not('style_pillar', 'is', null);

  if (taggedError) {
    console.error('Error getting tagged count:', taggedError);
    return;
  }

  const untaggedCount = (totalCount || 0) - (taggedCount || 0);
  const percentTagged = totalCount ? ((taggedCount || 0) / totalCount * 100).toFixed(1) : 0;
  const percentUntagged = totalCount ? (untaggedCount / totalCount * 100).toFixed(1) : 0;

  console.log('Status:');
  console.log(`  ✅ Already tagged: ${taggedCount} (${percentTagged}%)`);
  console.log(`  ⏳ Need tagging: ${untaggedCount} (${percentUntagged}%)\n`);

  console.log('Expected after tagging:');
  const expectedSuccess = Math.round(untaggedCount * 0.875); // 87.5% success rate
  const expectedReview = untaggedCount - expectedSuccess;
  console.log(`  ✅ Successfully tagged: ~${expectedSuccess}`);
  console.log(`  ⚠️  Needs review: ~${expectedReview}`);
  console.log(`  📊 Total tagged: ~${(taggedCount || 0) + expectedSuccess} (${((((taggedCount || 0) + expectedSuccess) / (totalCount || 1)) * 100).toFixed(1)}%)\n`);
}

checkVisionOutfitStatus();
