/**
 * Query Retired Sub-Terms - Workstream 3 Task 4
 *
 * Query Supabase for existing outfits with retired v1 sub-terms.
 * Proposes v2 mappings for awareness (not applied automatically).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Retired sub-terms from v1
const RETIRED_SUBTERMS = [
  'Timeless Classic',
  'Chic',
  'Sophisticated',
  'Modern Minimal',
  'Elegant', // As Minimal sub-term only; vibe stays
  'Refined',
  'Effortless Romantic',
  'Daring Maximal',
  'Exotic',
  'Streetwear', // As Streetwear sub-term only; pillar name stays
  'Tomboy', // As sub-term only; vibe stays
  'Club Sport',
  'Utility Workwear',
  'Utility Streetwear',
];

// Proposed v2 mappings
const V2_MAPPINGS: Record<string, string[]> = {
  'Timeless Classic': ['Polished', 'Tailored'],
  'Chic': ['Polished', 'Dressy'],
  'Sophisticated': ['Polished', 'Dressy'],
  'Modern Minimal': ['Modern', 'Sleek'],
  'Elegant': ['Sleek', 'Understated', 'Quiet Luxury'],
  'Refined': ['Sleek', 'Understated', 'Quiet Luxury'],
  'Effortless Romantic': ['Effortless'],
  'Daring Maximal': ['Bold', 'Statement'],
  'Exotic': ['Eclectic Maximal', 'Statement'],
  'Streetwear': ['Urban', 'Edgy'],
  'Tomboy': ['Urban', 'Edgy'],
  'Club Sport': ['Tennis Club', 'Athleisure'],
  'Utility Workwear': ['Workwear'],
  'Utility Streetwear': ['Workwear Streetwear'],
};

async function queryRetiredSubterms() {
  console.log('=== RETIRED SUB-TERM MIGRATION ANALYSIS ===\n');
  console.log('Querying Supabase for outfits with retired v1 sub-terms...\n');

  // Fetch all outfits with attributes
  console.log('Fetching outfits with attributes (paginated)...');

  const allOutfits: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error } = await supabase
      .from('outfits')
      .select('outfit_id, attributes')
      .not('attributes', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching outfits:', error);
      process.exit(1);
    }

    if (pageData && pageData.length > 0) {
      allOutfits.push(...pageData);
      console.log(`  Page ${page + 1}: ${pageData.length} outfits`);
      hasMore = pageData.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`\nTotal outfits fetched: ${allOutfits.length}\n`);

  // Count retired sub-terms
  const retiredCounts: Record<string, number> = {};
  const retiredExamples: Record<string, any[]> = {};

  for (const subterm of RETIRED_SUBTERMS) {
    retiredCounts[subterm] = 0;
    retiredExamples[subterm] = [];
  }

  for (const outfit of allOutfits) {
    const attrs = outfit.attributes;
    const subStyle = attrs?.subStyle;

    if (subStyle && RETIRED_SUBTERMS.includes(subStyle)) {
      retiredCounts[subStyle]++;

      if (retiredExamples[subStyle].length < 5) {
        retiredExamples[subStyle].push({
          outfit_id: outfit.outfit_id,
          pillar: attrs.stylePillar,
          subStyle: attrs.subStyle,
          vibes: attrs.vibes,
          occasions: attrs.occasions,
        });
      }
    }
  }

  // Sort by count descending
  const sortedRetired = Object.entries(retiredCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  console.log('=== RETIRED SUB-TERM USAGE ===\n');

  if (sortedRetired.length === 0) {
    console.log('✅ No retired sub-terms found in production data\n');
    console.log('All outfits either:');
    console.log('  - Have no subStyle assigned');
    console.log('  - Have v2-compatible sub-terms');
    console.log('  - Were tagged before sub-terms were added\n');
    return;
  }

  console.log(`Found ${sortedRetired.length} retired sub-terms in use:\n`);

  for (const [subterm, count] of sortedRetired) {
    const pct = ((count / allOutfits.length) * 100).toFixed(2);
    console.log(`${subterm}: ${count} outfits (${pct}%)`);
  }

  console.log('\n=== PROPOSED V2 MAPPINGS ===\n');

  for (const [subterm, count] of sortedRetired) {
    const mappings = V2_MAPPINGS[subterm] || ['<needs manual review>'];
    console.log(`\n${subterm} (${count} outfits) →`);
    console.log(`  Proposed v2: ${mappings.join(' OR ')}`);

    const examples = retiredExamples[subterm];
    if (examples.length > 0) {
      console.log(`  Example outfits:`);
      for (const ex of examples.slice(0, 3)) {
        console.log(`    - ${ex.outfit_id}`);
        console.log(`      Pillar: ${ex.pillar}`);
        console.log(`      Vibes: ${ex.vibes?.join(', ') || 'none'}`);
        console.log(`      Occasions: ${ex.occasions?.slice(0, 2).join(', ') || 'none'}`);
      }
    }
  }

  console.log('\n=== MIGRATION STRATEGY ===\n');
  console.log('v2 tagger will re-tag from scratch using new sub-term lists.');
  console.log('Existing v1 subStyles stay in Supabase until each outfit is re-tagged.');
  console.log('No bulk migration needed — v2 overwrites on a per-outfit basis.\n');
  console.log('Proposed mappings above are for AWARENESS ONLY.\n');
  console.log('The v2 Pillar Station will assign new sub-terms based on:');
  console.log('  1. Marker-evidence scoring');
  console.log('  2. Expanded sub-term lists per pillar');
  console.log('  3. AI tie-breaking when needed\n');
}

queryRetiredSubterms().catch(console.error);
