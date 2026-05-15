#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkVisionSample() {
  // Get a few vision outfits to see their structure
  const { data, error } = await supabase
    .from('outfits')
    .select('outfit_id, recipe_title, attributes')
    .like('outfit_id', 'vision-%')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   VISION OUTFITS - CURRENT STATUS            ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  let taggedCount = 0;
  let untaggedCount = 0;
  
  data?.forEach(o => {
    const attrs = o.attributes as any;
    const isTagged = attrs?.stylePillar && attrs?.vibes && attrs?.occasions;
    if (isTagged) taggedCount++;
    else untaggedCount++;
    
    console.log(`${isTagged ? '✅' : '⏳'} ${o.outfit_id}`);
    if (attrs) {
      console.log(`   Pillar: ${attrs.stylePillar || 'NULL'}`);
      console.log(`   Vibes: ${attrs.vibes ? JSON.stringify(attrs.vibes).substring(0, 60) + '...' : 'NULL'}`);
      console.log(`   Occasions: ${attrs.occasions ? JSON.stringify(attrs.occasions).substring(0, 60) + '...' : 'NULL'}`);
    } else {
      console.log(`   Attributes: NULL`);
    }
    console.log('');
  });
  
  console.log(`Sample: ${taggedCount} tagged, ${untaggedCount} untagged (out of 10)`);
  console.log(`\nEstimated for all 12,961 outfits:`);
  const estTagged = Math.round(12961 * taggedCount / 10);
  const estUntagged = Math.round(12961 * untaggedCount / 10);
  console.log(`  ✅ Already tagged: ~${estTagged} (${(taggedCount * 10)}%)`);
  console.log(`  ⏳ Need tagging: ~${estUntagged} (${(untaggedCount * 10)}%)`);
  console.log(`\nExpected after this phase:`);
  const expectedSuccess = Math.round(estUntagged * 0.875);
  console.log(`  ✅ Successfully tagged: ~${expectedSuccess} more`);
  console.log(`  ⚠️  Needs review: ~${estUntagged - expectedSuccess}`);
  console.log(`  📊 Total tagged: ~${estTagged + expectedSuccess} (${((estTagged + expectedSuccess) / 12961 * 100).toFixed(1)}%)`);
}

checkVisionSample();
