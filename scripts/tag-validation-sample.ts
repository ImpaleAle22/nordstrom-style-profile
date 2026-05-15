/**
 * Tag 100 Sample Outfits for Validation
 *
 * Tags a random sample of outfits with the new v2 system and outputs results
 * for manual semantic review.
 *
 * Run: npx tsx scripts/tag-validation-sample.ts
 */

import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env.local') });

import { supabase } from '../lib/supabase-client';
import { tagOutfitV2 } from '../lib/attribute-tagger-v2';
import type { ActivityContext, Season, SocialRegister } from '../lib/axis-types';
import * as fs from 'fs';

// ============================================================================
// TYPES
// ============================================================================

interface OutfitData {
  outfit_id: string;
  recipe_id: string;
  recipe_title: string;
  department: string;
  items: Array<{
    role: string;
    product_id: string;
    ingredientTitle: string;
  }>;
  score_breakdown: {
    colorHarmony: number;
    occasionAlignment: number;
    silhouetteBalance: number;
    seasonFabricWeight: number;
    styleRegisterCoherence: number;
  };
}

interface TaggedOutfit {
  outfit_id: string;
  recipe_title: string;
  department: string;
  items: string[];
  axes: {
    formality: number;
    activityContext: ActivityContext;
    socialRegister: SocialRegister;
    season: Season[];
  };
  occasions: string[];
  stylePillars: string[];
  vibes: string[];
}

// ============================================================================
// FETCH PRODUCTS (On-Demand for Sampled Outfits)
// ============================================================================

async function fetchProductsForOutfits(outfits: OutfitData[]): Promise<Map<string, any>> {
  console.log('📦 Loading products for sampled outfits...');

  // Collect all unique product IDs from outfits
  const productIds = new Set<string>();
  outfits.forEach(outfit => {
    outfit.items.forEach(item => {
      productIds.add(item.product_id);
    });
  });

  console.log(`   Need ${productIds.size} unique products`);

  const productMap = new Map<string, any>();

  // Fetch in batches of 100 (Supabase IN clause limit)
  const productIdArray = Array.from(productIds);
  const batchSize = 100;

  for (let i = 0; i < productIdArray.length; i += batchSize) {
    const batch = productIdArray.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('product_id', batch);

    if (error) {
      console.error(`   Error fetching batch ${i / batchSize + 1}:`, error.message);
      continue;
    }

    if (data) {
      data.forEach(p => productMap.set(p.product_id, p));
    }
  }

  console.log(`   Loaded ${productMap.size} products\n`);
  return productMap;
}

// ============================================================================
// SAMPLE OUTFITS
// ============================================================================

async function sampleOutfits(count: number): Promise<OutfitData[]> {
  console.log(`📥 Sampling ${count} valid outfits...\n`);

  // Get total count
  const { count: totalCount } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  if (!totalCount || totalCount === 0) {
    throw new Error('No outfits found');
  }

  console.log(`   Total outfits in database: ${totalCount.toLocaleString()}`);

  // Sample by fetching larger batch and filtering for valid ones
  const randomOffset = Math.floor(Math.random() * Math.max(0, totalCount - count * 3));

  const { data, error } = await supabase
    .from('outfits')
    .select('*')
    .range(randomOffset, randomOffset + count * 3 - 1);

  if (error) {
    throw new Error(`Error sampling outfits: ${error.message}`);
  }

  // Filter to only valid outfits (all items have product_ids and score_breakdown)
  const validOutfits = (data || []).filter(outfit => {
    if (!outfit.items || outfit.items.length === 0) {
      return false;
    }
    if (!outfit.score_breakdown) {
      return false;
    }

    // Check all items have valid product IDs
    const hasValidIds = outfit.items.every((item: any) => {
      if (!item.product_id) return false;
      if (typeof item.product_id !== 'string') return false;
      if (item.product_id === 'undefined' || item.product_id === 'null') return false;
      return true;
    });

    return hasValidIds;
  });

  if (validOutfits.length === 0 && data && data.length > 0) {
    // Debug: show why first outfit was rejected
    const firstOutfit = data[0];
    console.log(`   Debug: First outfit structure:`);
    console.log(`   - has items: ${!!firstOutfit.items}`);
    console.log(`   - items length: ${firstOutfit.items?.length}`);
    console.log(`   - has score_breakdown: ${!!firstOutfit.score_breakdown}`);
    if (firstOutfit.items && firstOutfit.items.length > 0) {
      const firstItem = firstOutfit.items[0];
      console.log(`   - first item product_id: ${firstItem.product_id} (type: ${typeof firstItem.product_id})`);
    }
  }

  const sample = validOutfits.slice(0, count);
  console.log(`   Found ${validOutfits.length} valid outfits, sampled ${sample.length}\n`);
  return sample as OutfitData[];
}

// ============================================================================
// TAG OUTFITS
// ============================================================================

async function tagSample(
  outfits: OutfitData[],
  productMap: Map<string, any>
): Promise<TaggedOutfit[]> {
  console.log(`🏷️  Tagging ${outfits.length} outfits...\n`);

  const results: TaggedOutfit[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < outfits.length; i++) {
    const outfit = outfits[i];

    // Show progress every 10 outfits
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${outfits.length}`);
    }

    try {
      // Fetch full product data for each item
      const outfitInput = {
        outfitId: outfit.outfit_id,
        recipeId: outfit.recipe_id,
        recipeTitle: outfit.recipe_title,
        department: outfit.department,
        items: outfit.items.map(item => {
          const product = productMap.get(item.product_id);
          if (!product) {
            throw new Error(`Product not found: ${item.product_id}`);
          }
          return {
            role: item.role,
            ingredientTitle: item.ingredientTitle,
            product: product
          };
        }),
        scoreBreakdown: outfit.score_breakdown
      };

      // Tag with v2 system (dry-run mode for validation)
      const result = await tagOutfitV2(
        outfitInput,
        null,  // currentAttributes - we're doing fresh tagging
        { mode: 'dry-run' }  // Don't write to database
      );

      if (result.success && result.attributes && result.attributes.axes && result.attributes.occasions) {
        results.push({
          outfit_id: outfit.outfit_id,
          recipe_title: outfit.recipe_title,
          department: outfit.department,
          items: outfit.items.map(i => i.ingredientTitle),
          axes: result.attributes.axes,
          occasions: result.attributes.occasions,
          stylePillars: result.attributes.stylePillars || [],
          vibes: result.attributes.vibes || []
        });
        successCount++;
      } else {
        console.error(`   ⚠️  Outfit ${outfit.outfit_id}: ${result.error || 'Missing attributes'}`);
        errorCount++;
      }
    } catch (error: any) {
      // Log full error for debugging
      if (errorCount === 0) {
        // Show FULL stack trace for first error only
        console.error(`\n⚠️  FIRST ERROR - Full Stack Trace:`);
        console.error(`   Outfit: ${outfit.outfit_id}`);
        console.error(error.stack || error);
        console.error('');
      } else if (errorCount < 3) {
        // Show message for next few
        console.error(`   ⚠️  Outfit ${outfit.outfit_id}:`);
        console.error(`        ${(error.stack || error.message || String(error)).split('\n')[0]}`);
      } else {
        // Just show message after that
        console.error(`   ⚠️  Outfit ${outfit.outfit_id}: ${error.message}`);
      }
      errorCount++;
    }
  }

  console.log(`\n   ✅ Successfully tagged: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}\n`);

  return results;
}

// ============================================================================
// OUTPUT RESULTS
// ============================================================================

function outputResults(results: TaggedOutfit[]): void {
  const outputPath = join(__dirname, '../validation-sample-results.json');

  // Save full results to JSON
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`💾 Full results saved to: validation-sample-results.json\n`);

  // Print summary
  console.log('========================================');
  console.log('VALIDATION SAMPLE RESULTS');
  console.log('========================================\n');

  // Occasion frequency
  const occasionCounts = new Map<string, number>();
  results.forEach(r => {
    r.occasions.forEach(o => {
      occasionCounts.set(o, (occasionCounts.get(o) || 0) + 1);
    });
  });

  console.log('📊 Occasion Distribution (top 15):');
  Array.from(occasionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([occasion, count]) => {
      const pct = (count / results.length * 100).toFixed(1);
      console.log(`   ${occasion}: ${count} (${pct}%)`);
    });
  console.log('');

  // Formality distribution
  const formalityBuckets = {
    '1.0-2.0 (Casual)': 0,
    '2.1-3.5 (Smart Casual)': 0,
    '3.6-4.5 (Business)': 0,
    '4.6-5.5 (Dressy)': 0,
    '5.6-6.0 (Formal)': 0
  };

  results.forEach(r => {
    const f = r.axes.formality;
    if (f <= 2.0) formalityBuckets['1.0-2.0 (Casual)']++;
    else if (f <= 3.5) formalityBuckets['2.1-3.5 (Smart Casual)']++;
    else if (f <= 4.5) formalityBuckets['3.6-4.5 (Business)']++;
    else if (f <= 5.5) formalityBuckets['4.6-5.5 (Dressy)']++;
    else formalityBuckets['5.6-6.0 (Formal)']++;
  });

  console.log('📈 Formality Distribution:');
  Object.entries(formalityBuckets).forEach(([range, count]) => {
    const pct = (count / results.length * 100).toFixed(1);
    console.log(`   ${range}: ${count} (${pct}%)`);
  });
  console.log('');

  // Context distribution
  const contextCounts = new Map<string, number>();
  results.forEach(r => {
    const ctx = r.axes.activityContext;
    contextCounts.set(ctx, (contextCounts.get(ctx) || 0) + 1);
  });

  console.log('🎯 Activity Context Distribution:');
  Array.from(contextCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([context, count]) => {
      const pct = (count / results.length * 100).toFixed(1);
      console.log(`   ${context}: ${count} (${pct}%)`);
    });
  console.log('');

  // Show 10 example outfits
  console.log('📝 Sample Outfits (first 10):');
  console.log('');

  results.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. ${r.recipe_title}`);
    console.log(`   Items: ${r.items.slice(0, 3).join(', ')}${r.items.length > 3 ? '...' : ''}`);
    console.log(`   Formality: ${r.axes.formality} | Context: ${r.axes.activityContext} | Register: ${r.axes.socialRegister}`);
    console.log(`   Occasions: ${r.occasions.slice(0, 4).join(', ')}`);
    console.log('');
  });

  console.log('========================================');
  console.log(`✅ Review complete JSON file for all ${results.length} outfits`);
  console.log('========================================\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    // Sample outfits first
    const outfits = await sampleOutfits(100);

    if (outfits.length === 0) {
      throw new Error('No outfits sampled');
    }

    // Fetch only the products we need
    const productMap = await fetchProductsForOutfits(outfits);

    if (productMap.size === 0) {
      throw new Error('No products loaded');
    }

    // Tag outfits
    const results = await tagSample(outfits, productMap);

    if (results.length === 0) {
      throw new Error('No outfits successfully tagged');
    }

    // Output results
    outputResults(results);

    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
