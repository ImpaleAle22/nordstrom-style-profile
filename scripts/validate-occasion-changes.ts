/**
 * Post-Implementation Validation Script
 *
 * Samples 100 random outfits and compares old vs new occasion assignments.
 * Reports semantic changes to verify no regressions.
 *
 * Run: npx tsx scripts/validate-occasion-changes.ts
 */

// Load environment variables BEFORE any imports
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local and set process.env before Supabase client initializes
const envPath = join(__dirname, '../.env.local');
const result = config({ path: envPath });

if (result.error) {
  console.error('⚠️  Could not load .env.local:', result.error.message);
  console.error('   Trying environment variables from shell...\n');
} else {
  console.log('✅ Loaded environment variables from .env.local\n');
}

// Now import modules that depend on env vars
import { supabase } from '../lib/supabase-client';
import { getOccasionsForOutfit } from '../lib/stations/occasion-station';
import type { ActivityContext, Season, SocialRegister } from '../lib/axis-types';

// ============================================================================
// TYPES
// ============================================================================

interface OutfitSample {
  outfit_id: string;
  recipe_title: string;
  attributes: {
    occasions?: string[];
    axes?: {
      formality?: number;
      activityContext?: ActivityContext;
      socialRegister?: SocialRegister;
      season?: Season[];
    };
  } | null;
}

interface ValidationResult {
  outfitId: string;
  outfitTitle: string;
  oldOccasions: string[];
  newOccasions: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
  significantChange: boolean;
}

// ============================================================================
// SAMPLE OUTFITS
// ============================================================================

async function sampleOutfits(count: number): Promise<OutfitSample[]> {
  console.log(`📥 Fetching ${count} random outfits with axes data from database...\n`);

  // Fetch outfits that have been tagged with v2 (have axes data)
  // Use pagination to get more than 1000 if needed
  const samples: OutfitSample[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (samples.length < count) {
    const { data, error } = await supabase
      .from('outfits')
      .select('outfit_id, recipe_title, attributes')
      .not('attributes', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`   Error fetching outfits:`, error.message);
      break;
    }

    if (!data || data.length === 0) {
      break; // No more data
    }

    // Filter to only outfits with axes data
    const validOutfits = data.filter(o =>
      o.attributes &&
      o.attributes.axes &&
      o.attributes.axes.formality &&
      o.attributes.axes.activityContext &&
      o.attributes.axes.socialRegister &&
      o.attributes.axes.season
    );

    samples.push(...validOutfits as OutfitSample[]);

    if (data.length < batchSize) {
      break; // Last batch
    }

    offset += batchSize;
  }

  // Shuffle and take sample
  const shuffled = samples.sort(() => Math.random() - 0.5);
  const finalSample = shuffled.slice(0, count);

  console.log(`   Found ${samples.length.toLocaleString()} outfits with axes data`);
  console.log(`   Sampled: ${finalSample.length} outfits\n`);

  return finalSample;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateOutfit(outfit: OutfitSample): ValidationResult | null {
  // Skip if no attributes at all
  if (!outfit.attributes) {
    return null;
  }

  const oldOccasions = outfit.attributes.occasions || [];

  // Skip if no axes data (can't re-compute)
  const axes = outfit.attributes.axes;
  if (!axes || !axes.formality || !axes.activityContext || !axes.socialRegister || !axes.season) {
    return null;
  }

  // Re-compute occasions with new system
  const newOccasions = getOccasionsForOutfit({
    formality: axes.formality,
    activityContext: axes.activityContext,
    socialRegister: axes.socialRegister,
    season: axes.season
  });

  // Compare
  const oldSet = new Set(oldOccasions);
  const newSet = new Set(newOccasions);

  const added = newOccasions.filter(o => !oldSet.has(o));
  const removed = oldOccasions.filter(o => !newSet.has(o));
  const unchanged = oldOccasions.filter(o => newSet.has(o));

  // Flag as significant if more than 2 occasions changed or all occasions removed
  const significantChange = (added.length + removed.length > 2) ||
                           (removed.length > 0 && unchanged.length === 0);

  return {
    outfitId: outfit.outfit_id,
    outfitTitle: outfit.recipe_title || 'Untitled',
    oldOccasions,
    newOccasions,
    added,
    removed,
    unchanged,
    significantChange
  };
}

// ============================================================================
// REPORTING
// ============================================================================

function printReport(results: ValidationResult[]): void {
  console.log('========================================');
  console.log('VALIDATION REPORT');
  console.log('========================================\n');

  // Overall stats
  const totalValidated = results.length;
  const unchanged = results.filter(r => r.added.length === 0 && r.removed.length === 0).length;
  const changed = results.filter(r => r.added.length > 0 || r.removed.length > 0).length;
  const significant = results.filter(r => r.significantChange).length;

  console.log(`📊 Overall Statistics:`);
  console.log(`   Total validated: ${totalValidated}`);
  console.log(`   Unchanged: ${unchanged} (${(unchanged/totalValidated*100).toFixed(1)}%)`);
  console.log(`   Changed: ${changed} (${(changed/totalValidated*100).toFixed(1)}%)`);
  console.log(`   Significant changes: ${significant} (${(significant/totalValidated*100).toFixed(1)}%)\n`);

  // Change patterns
  const allAdded = results.flatMap(r => r.added);
  const allRemoved = results.flatMap(r => r.removed);

  const addedCounts = new Map<string, number>();
  allAdded.forEach(o => addedCounts.set(o, (addedCounts.get(o) || 0) + 1));

  const removedCounts = new Map<string, number>();
  allRemoved.forEach(o => removedCounts.set(o, (removedCounts.get(o) || 0) + 1));

  console.log(`📈 Most Frequently Added Occasions:`);
  const topAdded = Array.from(addedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topAdded.length > 0) {
    topAdded.forEach(([occasion, count]) => {
      console.log(`   ${occasion}: +${count}`);
    });
  } else {
    console.log(`   (none)`);
  }
  console.log('');

  console.log(`📉 Most Frequently Removed Occasions:`);
  const topRemoved = Array.from(removedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topRemoved.length > 0) {
    topRemoved.forEach(([occasion, count]) => {
      console.log(`   ${occasion}: -${count}`);
    });
  } else {
    console.log(`   (none)`);
  }
  console.log('');

  // Significant changes
  if (significant > 0) {
    console.log(`⚠️  Significant Changes (${significant} outfits):\n`);

    results.filter(r => r.significantChange).slice(0, 10).forEach(result => {
      console.log(`   ${result.outfitTitle.substring(0, 60)}`);
      console.log(`   ID: ${result.outfitId}`);
      console.log(`   Old: [${result.oldOccasions.join(', ')}]`);
      console.log(`   New: [${result.newOccasions.join(', ')}]`);
      if (result.added.length > 0) {
        console.log(`   Added: [${result.added.join(', ')}]`);
      }
      if (result.removed.length > 0) {
        console.log(`   Removed: [${result.removed.join(', ')}]`);
      }
      console.log('');
    });

    if (significant > 10) {
      console.log(`   ... and ${significant - 10} more\n`);
    }
  }

  // Final verdict
  console.log('========================================');
  if (significant < totalValidated * 0.1) {
    console.log('✅ VALIDATION PASSED: Less than 10% significant changes');
  } else if (significant < totalValidated * 0.25) {
    console.log('⚠️  VALIDATION WARNING: 10-25% significant changes');
  } else {
    console.log('❌ VALIDATION FAILED: More than 25% significant changes');
  }
  console.log('========================================\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    // Sample outfits
    const outfits = await sampleOutfits(100);

    if (outfits.length === 0) {
      console.error('❌ No outfits sampled');
      process.exit(1);
    }

    // Validate each outfit
    console.log('🔄 Validating occasions...\n');
    const results: ValidationResult[] = [];
    let skipped = 0;

    for (const outfit of outfits) {
      const result = validateOutfit(outfit);
      if (result) {
        results.push(result);
      } else {
        skipped++;
      }
    }

    if (skipped > 0) {
      console.log(`   Skipped ${skipped} outfits (missing axes data)\n`);
    }

    if (results.length === 0) {
      console.error('❌ No outfits could be validated (all missing axes data)');
      process.exit(1);
    }

    // Print report
    printReport(results);

    // Exit
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
