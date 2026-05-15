/**
 * Workstream 0 — Tasks 3 & 4
 * Query Supabase for sample outfits and v1 attribute coverage statistics
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local explicitly (Next.js convention)
config({ path: resolve(process.cwd(), '.env.local') });

// Create Supabase client directly (after env is loaded)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('=== WORKSTREAM 0: SUPABASE OUTFIT COVERAGE ANALYSIS ===\n');

  // Task 3: Pull 3 sample outfits with attributes
  console.log('TASK 3: Sample 3 outfits with attributes blocks\n');
  const { data: sampleOutfits, error: sampleError } = await supabase
    .from('outfits')
    .select('outfit_id, recipe_title, department, attributes')
    .not('attributes', 'is', null)
    .limit(3);

  if (sampleError) {
    console.error('Error fetching sample outfits:', sampleError);
  } else {
    sampleOutfits?.forEach((outfit, idx) => {
      console.log(`\n--- Sample ${idx + 1}: ${outfit.outfit_id} ---`);
      console.log(`Recipe: ${outfit.recipe_title}`);
      console.log(`Department: ${outfit.department}`);
      console.log(`Attributes present:`, Object.keys(outfit.attributes || {}).join(', '));
      console.log(`Full attributes block:`, JSON.stringify(outfit.attributes, null, 2));
    });
  }

  // Task 4: Compute coverage statistics
  console.log('\n\n=== TASK 4: V1 ATTRIBUTE COVERAGE STATISTICS ===\n');

  // Total outfit count
  const { count: totalCount, error: countError } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  console.log(`Total outfits in Supabase: ${totalCount || 0}`);

  if (countError) {
    console.error('Error getting total count:', countError);
    return;
  }

  // Count with any attributes block
  const { count: withAttributesCount } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true })
    .not('attributes', 'is', null);

  console.log(`Outfits with any attributes block: ${withAttributesCount || 0} (${((withAttributesCount || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);

  // For detailed field analysis, need to fetch ALL data (pagination required - Supabase has 1000 row default limit)
  console.log(`\nFetching all outfits with attributes (paginated)...`);
  const allAttributesData: any[] = [];
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
      break;
    }

    if (pageData && pageData.length > 0) {
      allAttributesData.push(...pageData);
      console.log(`  Fetched page ${page + 1}: ${pageData.length} outfits (total: ${allAttributesData.length})`);
      hasMore = pageData.length === pageSize; // If we got a full page, there might be more
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`✓ Total outfits with attributes fetched: ${allAttributesData.length}\n`);

  // Count with stylePillar set
  const withStylePillar = allAttributesData?.filter(row =>
    row.attributes?.stylePillar && row.attributes.stylePillar !== null
  ).length || 0;

  console.log(`Outfits with stylePillar set: ${withStylePillar} (${(withStylePillar / (totalCount || 1) * 100).toFixed(1)}%)`);

  // Count with all four axes set
  const withAllFourAxes = allAttributesData?.filter(row => {
    const attr = row.attributes;
    return attr?.formality != null &&
           attr?.activityContext != null &&
           attr?.season != null &&
           attr?.socialRegister != null;
  }).length || 0;

  console.log(`Outfits with all 4 axes (formality, activityContext, season, socialRegister): ${withAllFourAxes} (${(withAllFourAxes / (totalCount || 1) * 100).toFixed(1)}%)`);

  // Count with non-empty occasions array
  const withOccasions = allAttributesData?.filter(row =>
    row.attributes?.occasions &&
    Array.isArray(row.attributes.occasions) &&
    row.attributes.occasions.length > 0
  ).length || 0;

  console.log(`Outfits with occasions array non-empty: ${withOccasions} (${(withOccasions / (totalCount || 1) * 100).toFixed(1)}%)`);

  // Additional analysis: v1 vs v2 tags
  const withV1Tags = allAttributesData?.filter(row =>
    row.attributes?.taggerVersion === 'v1'
  ).length || 0;

  const withV2Tags = allAttributesData?.filter(row =>
    row.attributes?.taggerVersion === 'v2'
  ).length || 0;

  const withoutVersion = allAttributesData?.filter(row =>
    !row.attributes?.taggerVersion
  ).length || 0;

  console.log(`\nTagger version breakdown:`);
  console.log(`  v1: ${withV1Tags}`);
  console.log(`  v2: ${withV2Tags}`);
  console.log(`  (no version field): ${withoutVersion}`);

  // Sample attributes blocks with inconsistencies
  console.log(`\n\n=== ATTRIBUTE BLOCK INCONSISTENCIES ===\n`);

  const inconsistencies: string[] = [];

  // Check for outfits with attributes but no stylePillar
  const missingPillar = allAttributesData?.filter(row =>
    !row.attributes?.stylePillar
  ).length || 0;

  if (missingPillar > 0) {
    inconsistencies.push(`${missingPillar} outfits have attributes block but no stylePillar`);
  }

  // Check for outfits with stylePillar but no vibes
  const missingVibes = allAttributesData?.filter(row =>
    row.attributes?.stylePillar &&
    (!row.attributes?.vibes || !Array.isArray(row.attributes.vibes) || row.attributes.vibes.length === 0)
  ).length || 0;

  if (missingVibes > 0) {
    inconsistencies.push(`${missingVibes} outfits have stylePillar but no vibes array`);
  }

  // Check for outfits with partial axis data
  const partialAxes = allAttributesData?.filter(row => {
    const attr = row.attributes;
    const axesPresent = [
      attr?.formality != null,
      attr?.activityContext != null,
      attr?.season != null,
      attr?.socialRegister != null
    ];
    const count = axesPresent.filter(Boolean).length;
    return count > 0 && count < 4;
  }).length || 0;

  if (partialAxes > 0) {
    inconsistencies.push(`${partialAxes} outfits have partial axis data (1-3 axes, not all 4)`);
  }

  if (inconsistencies.length > 0) {
    inconsistencies.forEach(issue => console.log(`⚠️  ${issue}`));
  } else {
    console.log('✓ No major inconsistencies detected');
  }

  console.log('\n=== END COVERAGE ANALYSIS ===\n');
}

main().catch(console.error);
