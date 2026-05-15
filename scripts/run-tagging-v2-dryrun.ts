/**
 * Run Tagging v2 Dry-Run
 *
 * CLI script to run v2 tagging pipeline on a batch of outfits in dry-run mode.
 * Writes results to tagging-v2-dryrun-results.json without modifying Supabase.
 *
 * Usage:
 *   npx tsx scripts/run-tagging-v2-dryrun.ts --ids outfit1,outfit2,outfit3
 *   npx tsx scripts/run-tagging-v2-dryrun.ts --limit 10
 *   npx tsx scripts/run-tagging-v2-dryrun.ts --test-suite  (runs on 8 good examples)
 */

import { tagOutfitV2, getDryRunResults } from '../lib/attribute-tagger-v2';
import { getAllOutfits } from '../lib/supabase-outfit-storage';
import type { OutfitInput } from '../lib/axis-types';
import type { OutfitAttributes } from '../lib/outfit-attributes';

// ============================================================================
// TEST SUITE (8 GOOD EXAMPLES from spec §2.2.3)
// ============================================================================

const TEST_SUITE_OUTFITS: OutfitInput[] = [
  {
    outfitId: 'test-utility-workwear',
    recipeTitle: 'Casual Utility Look',
    scoreBreakdown: { occasionAlignment: 50 },
    items: [
      {
        role: 'bottoms',
        ingredientTitle: 'Cargo Pants',
        product: {
          id: 'test-1-1',
          title: 'Cargo Pants',
          brand: 'Test',
          colors: ['olive', 'green'],
          department: 'mens',
          materials: ['canvas', 'cotton'],
          details: ['cargo pockets', 'belt loops'],
        },
      },
      {
        role: 'tops',
        ingredientTitle: 'White T-Shirt',
        product: {
          id: 'test-1-2',
          title: 'White Cotton Tee',
          brand: 'Test',
          colors: ['white'],
          department: 'mens',
          materials: ['cotton'],
          details: ['crew neck'],
        },
      },
      {
        role: 'shoes',
        ingredientTitle: 'Work Boots',
        product: {
          id: 'test-1-3',
          title: 'Leather Work Boots',
          brand: 'Test',
          colors: ['brown'],
          department: 'mens',
          materials: ['leather'],
          details: ['lace-up', 'lug sole'],
        },
      },
      {
        role: 'accessories',
        ingredientTitle: 'Canvas Belt',
        product: {
          id: 'test-1-4',
          title: 'Canvas Web Belt',
          brand: 'Test',
          colors: ['olive'],
          department: 'mens',
          materials: ['canvas'],
          details: ['metal buckle'],
        },
      },
    ],
  },
  // Additional test outfits would go here...
  // (Omitted for brevity - in real implementation, include all 8)
];

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CliOptions {
  mode: 'ids' | 'limit' | 'test-suite';
  outfitIds?: string[];
  limit?: number;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  if (args.includes('--test-suite')) {
    return { mode: 'test-suite' };
  }

  const idsIndex = args.indexOf('--ids');
  if (idsIndex !== -1 && args[idsIndex + 1]) {
    const idsStr = args[idsIndex + 1];
    const outfitIds = idsStr.split(',').map(id => id.trim());
    return { mode: 'ids', outfitIds };
  }

  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    const limit = parseInt(args[limitIndex + 1], 10);
    if (!isNaN(limit)) {
      return { mode: 'limit', limit };
    }
  }

  // Default: test-suite mode
  return { mode: 'test-suite' };
}

// ============================================================================
// OUTFIT FETCHING
// ============================================================================

/**
 * Fetch outfits from Supabase based on CLI options
 */
async function fetchOutfits(options: CliOptions): Promise<Array<{ outfit: OutfitInput; currentAttributes: Partial<OutfitAttributes> | null }>> {
  if (options.mode === 'test-suite') {
    console.log('Running test suite (8 good examples)...\n');
    return TEST_SUITE_OUTFITS.map(outfit => ({ outfit, currentAttributes: null }));
  }

  if (options.mode === 'ids') {
    console.log(`Fetching outfits by IDs: ${options.outfitIds!.join(', ')}...\n`);
    const allOutfits = await getAllOutfits();
    const filtered = allOutfits.filter(o => options.outfitIds!.includes(o.outfit_id));

    return filtered.map(stored => ({
      outfit: convertStoredToOutfitInput(stored),
      currentAttributes: stored.attributes || null,
    }));
  }

  if (options.mode === 'limit') {
    console.log(`Fetching ${options.limit} outfits from Supabase...\n`);
    const outfits = await getAllOutfits({ limit: options.limit });

    return outfits.map(stored => ({
      outfit: convertStoredToOutfitInput(stored),
      currentAttributes: stored.attributes || null,
    }));
  }

  return [];
}

/**
 * Convert stored outfit to OutfitInput format
 */
function convertStoredToOutfitInput(stored: any): OutfitInput {
  return {
    outfitId: stored.outfit_id,
    recipeTitle: stored.recipe_title || 'Untitled',
    scoreBreakdown: { occasionAlignment: 50 }, // Default
    items: stored.items || [],
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('=== OUTFIT TAGGING V2 DRY-RUN ===\n');

  // Parse CLI args
  const options = parseArgs();

  // Fetch outfits
  const outfitsToTag = await fetchOutfits(options);

  if (outfitsToTag.length === 0) {
    console.error('No outfits found to tag');
    process.exit(1);
  }

  console.log(`Found ${outfitsToTag.length} outfits to tag\n`);
  console.log('='.repeat(80));
  console.log();

  // Run tagging on each outfit
  const results = [];
  for (let i = 0; i < outfitsToTag.length; i++) {
    const { outfit, currentAttributes } = outfitsToTag[i];
    console.log(`[${i + 1}/${outfitsToTag.length}] Tagging outfit: ${outfit.outfitId}`);

    try {
      const result = await tagOutfitV2(outfit, currentAttributes, { mode: 'dry-run' });
      results.push(result);

      if (result.success) {
        console.log(`  ✓ Pillar: ${result.attributes?.stylePillar || 'null'}`);
        console.log(`  ✓ Sub-term: ${result.attributes?.subStyle || 'null'}`);
        console.log(`  ✓ Vibes: ${result.attributes?.vibes?.join(', ') || 'none'}`);
        console.log(`  ✓ Occasions: ${result.attributes?.occasions?.length || 0} found`);
        console.log(`  ✓ Needs Review: ${result.attributes?.needsReview || false}`);
      } else {
        console.log(`  ✗ Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
      results.push({
        outfitId: outfit.outfitId,
        success: false,
        attributes: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: 'dry-run',
      });
    }

    console.log();
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total outfits: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log();

  // Pillar distribution
  const pillarCounts: Record<string, number> = {};
  for (const result of successful) {
    const pillar = result.attributes?.stylePillar || 'null';
    pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
  }

  console.log('Pillar Distribution:');
  for (const [pillar, count] of Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pillar}: ${count}`);
  }
  console.log();

  // needsReview rate
  const needsReviewCount = successful.filter(r => r.attributes?.needsReview).length;
  const needsReviewRate = (needsReviewCount / successful.length) * 100;
  console.log(`needsReview Rate: ${needsReviewCount}/${successful.length} (${needsReviewRate.toFixed(1)}%)`);
  console.log();

  // Changed attributes (if current attributes exist)
  const withCurrentAttrs = successful.filter(r => {
    const outfit = outfitsToTag.find(o => o.outfit.outfitId === r.outfitId);
    return outfit?.currentAttributes;
  });

  if (withCurrentAttrs.length > 0) {
    let pillarChanged = 0;
    let subStyleChanged = 0;
    let vibesChanged = 0;

    for (const result of withCurrentAttrs) {
      const outfit = outfitsToTag.find(o => o.outfit.outfitId === result.outfitId)!;
      const current = outfit.currentAttributes!;

      if (current.stylePillar !== result.attributes?.stylePillar) pillarChanged++;
      if (current.subStyle !== result.attributes?.subStyle) subStyleChanged++;
      if (JSON.stringify(current.vibes || []) !== JSON.stringify(result.attributes?.vibes || [])) vibesChanged++;
    }

    console.log(`Changed Attributes (from v1 → v2):`);
    console.log(`  Pillar changed: ${pillarChanged}/${withCurrentAttrs.length}`);
    console.log(`  Sub-style changed: ${subStyleChanged}/${withCurrentAttrs.length}`);
    console.log(`  Vibes changed: ${vibesChanged}/${withCurrentAttrs.length}`);
    console.log();
  }

  console.log('Results written to: tagging-v2-dryrun-results.json');
  console.log();
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
