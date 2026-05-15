/**
 * Workstream 0 — Task 5
 * Backfill taggerVersion: "v1" to all existing attributes blocks
 *
 * Usage:
 *   npx tsx scripts/backfill-v1-version-field.ts --dry-run    # Preview changes
 *   npx tsx scripts/backfill-v1-version-field.ts              # Execute backfill
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local explicitly (Next.js convention)
config({ path: resolve(process.cwd(), '.env.local') });

// Create Supabase client with SERVICE ROLE key (bypasses RLS for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('=== V1 TAGGER VERSION BACKFILL ===\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be written)' : 'COMMIT (will update Supabase)'}\n`);

  // Count total outfits
  const { count: totalCount } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  console.log(`Total outfits in Supabase: ${totalCount || 0}`);

  // Fetch ALL outfits with attributes (pagination required - Supabase has 1000 row default limit)
  console.log(`\nFetching all outfits with attributes (paginated)...`);
  const allOutfitsWithAttributes: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from('outfits')
      .select('outfit_id, attributes')
      .not('attributes', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (pageError) {
      console.error(`Error fetching page ${page}:`, pageError);
      return;
    }

    if (pageData && pageData.length > 0) {
      allOutfitsWithAttributes.push(...pageData);
      console.log(`  Page ${page + 1}: ${pageData.length} outfits (total: ${allOutfitsWithAttributes.length})`);
      hasMore = pageData.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`✓ Fetched ${allOutfitsWithAttributes.length} outfits with attributes\n`);

  // Filter in JS since JSONB null checks are tricky in PostgREST
  const outfitsToBackfill = allOutfitsWithAttributes.filter(row =>
    row.attributes && !row.attributes.taggerVersion
  );

  const outfitsWithNoAttributes = (totalCount || 0) - allOutfitsWithAttributes.length;
  const outfitsAlreadyVersioned = allOutfitsWithAttributes.length - outfitsToBackfill.length;

  console.log(`\nBreakdown:`);
  console.log(`  - Outfits with no attributes block: ${outfitsWithNoAttributes}`);
  console.log(`  - Outfits with attributes + taggerVersion already set: ${outfitsAlreadyVersioned}`);
  console.log(`  - Outfits needing v1 backfill: ${outfitsToBackfill.length}`);

  if (outfitsToBackfill.length === 0) {
    console.log('\n✓ No outfits need backfilling. All done!');
    return;
  }

  if (isDryRun) {
    console.log(`\n🔍 DRY RUN: Would backfill taggerVersion: "v1" to ${outfitsToBackfill.length} outfits`);
    console.log(`\nSample outfit IDs that would be updated:`);
    outfitsToBackfill.slice(0, 10).forEach(row => {
      console.log(`  - ${row.outfit_id}`);
    });
    if (outfitsToBackfill.length > 10) {
      console.log(`  ... and ${outfitsToBackfill.length - 10} more`);
    }
    console.log(`\nRun without --dry-run to execute the backfill.`);
    return;
  }

  // Execute backfill using individual UPDATEs (service role key bypasses RLS)
  // Note: Can't batch UPDATE with different JSONB values, so update individually
  console.log(`\n⚙️  Executing backfill (${outfitsToBackfill.length} outfits)...`);

  const reportInterval = 100;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < outfitsToBackfill.length; i++) {
    const row = outfitsToBackfill[i];

    // Merge taggerVersion into existing attributes
    const updatedAttributes = {
      ...row.attributes,
      taggerVersion: 'v1'
    };

    const { error: updateError } = await supabase
      .from('outfits')
      .update({ attributes: updatedAttributes })
      .eq('outfit_id', row.outfit_id);

    if (updateError) {
      errors++;
    } else {
      updated++;
    }

    // Report progress every 100 outfits
    if ((i + 1) % reportInterval === 0 || i === outfitsToBackfill.length - 1) {
      console.log(`  Progress: ${i + 1}/${outfitsToBackfill.length} (${updated} success, ${errors} errors)`);
    }
  }

  console.log(`\n=== BACKFILL COMPLETE ===`);
  console.log(`  Total outfits: ${totalCount}`);
  console.log(`  Successfully backfilled: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Outfits with no attributes (left untouched): ${outfitsWithNoAttributes}`);
}

main().catch(console.error);
