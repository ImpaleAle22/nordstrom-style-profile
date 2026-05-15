#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import { tagOutfitV2 } from '../lib/attribute-tagger-v2.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TaggingResult {
  successful: number;
  failed: number;
  needsReview: number;
  pillarDistribution: Record<string, number>;
}

async function tagVisionOutfitsDirect(limit: number, dryRun: boolean = true) {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   VISION OUTFITS TAGGING - DIRECT APPROACH   ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'COMMIT'}`);
  console.log(`Limit: ${limit} outfits\n`);

  // Fetch vision outfits
  console.log('Fetching vision outfits...');
  const { data: outfits, error } = await supabase
    .from('outfits')
    .select('*')
    .like('outfit_id', 'vision-%')
    .limit(limit);

  if (error) {
    console.error('Error fetching outfits:', error);
    return;
  }

  console.log(`✓ Found ${outfits?.length || 0} vision outfits\n`);

  const results: TaggingResult = {
    successful: 0,
    failed: 0,
    needsReview: 0,
    pillarDistribution: {}
  };

  // Tag each outfit
  for (let i = 0; i < (outfits?.length || 0); i++) {
    const outfitData = outfits![i];
    const progress = `[${i + 1}/${outfits!.length}]`;

    try {
      // Transform to input format
      const outfit = await transformToOutfitInput(outfitData);

      if (!outfit.items || outfit.items.length === 0) {
        console.log(`${progress} ${outfit.outfitId} - ❌ No items`);
        results.failed++;
        continue;
      }

      // Tag
      const tagResult = await tagOutfitV2(outfit, null, { mode: dryRun ? 'dry-run' : 'commit' });

      if (tagResult.success && tagResult.attributes) {
        results.successful++;

        if ((tagResult.attributes as any).needsReview) {
          results.needsReview++;
        }

        const pillar = tagResult.attributes.stylePillar;
        if (pillar) {
          results.pillarDistribution[pillar] = (results.pillarDistribution[pillar] || 0) + 1;
        }

        console.log(`${progress} ${outfit.outfitId} - ✅ ${pillar}${(tagResult.attributes as any).needsReview ? ' (needs review)' : ''}`);

        // Write to database if commit mode
        if (!dryRun) {
          await supabase
            .from('outfits')
            .update({ attributes: tagResult.attributes })
            .eq('outfit_id', outfitData.outfit_id);
        }
      } else {
        console.log(`${progress} ${outfit.outfitId} - ❌ ${tagResult.error || 'Unknown error'}`);
        results.failed++;
      }

    } catch (error) {
      console.log(`${progress} ${outfitData.outfit_id} - ❌ ${error}`);
      results.failed++;
    }
  }

  // Summary
  const total = results.successful + results.failed;
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   RESULTS                                     ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log(`Total: ${total}`);
  console.log(`  ✅ Successful: ${results.successful} (${(results.successful / total * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Needs review: ${results.needsReview} (${(results.needsReview / total * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${results.failed} (${(results.failed / total * 100).toFixed(1)}%)\n`);

  if (Object.keys(results.pillarDistribution).length > 0) {
    console.log('Pillar Distribution:');
    Object.entries(results.pillarDistribution)
      .sort(([, a], [, b]) => b - a)
      .forEach(([pillar, count]) => {
        console.log(`  ${pillar}: ${count}`);
      });
    console.log('');
  }

  const successRate = (results.successful / total * 100).toFixed(1);
  if (parseFloat(successRate) >= 85) {
    console.log(`✅ Success rate ${successRate}% exceeds 85% target!`);
    if (dryRun) {
      console.log('   Ready to run in COMMIT mode.\n');
    }
  } else {
    console.log(`⚠️  Success rate ${successRate}% below 85% target.\n`);
  }
}

async function transformToOutfitInput(outfitData: any): Promise<any> {
  const productIds = (outfitData.items || [])
    .map((item: any) => item.product_id || item.product?.id)
    .filter(Boolean);

  if (productIds.length === 0) {
    return {
      outfitId: outfitData.outfit_id,
      recipeTitle: outfitData.recipe_title || 'Untitled',
      items: []
    };
  }

  const { data: products } = await supabase
    .from('products')
    .select('product_id, title, brand, colors, department, materials, silhouette, patterns, details, vision_metadata')
    .in('product_id', productIds);

  const productMap = new Map();
  (products || []).forEach((p: any) => productMap.set(p.product_id, p));

  const items = (outfitData.items || [])
    .map((item: any) => {
      const productId = item.product_id || item.product?.id;
      const product = productMap.get(productId);
      if (!product) return null;

      return {
        role: item.role || 'tops',
        ingredientTitle: item.ingredientTitle || product.title || 'Unknown',
        product: {
          id: product.product_id,
          title: product.title || 'Unknown',
          brand: product.brand || 'Unknown',
          colors: Array.isArray(product.colors) ? product.colors : [],
          department: product.department || 'womens',
          materials: Array.isArray(product.materials) ? product.materials : [],
          silhouette: product.silhouette || product.vision_metadata?.silhouette || null,
          patterns: product.patterns || product.vision_metadata?.pattern || null,
          details: Array.isArray(product.details) ? product.details : []
        }
      };
    })
    .filter(Boolean);

  return {
    outfitId: outfitData.outfit_id,
    recipeTitle: outfitData.recipe_title || 'Untitled',
    items,
    scoreBreakdown: outfitData.scoreBreakdown || { occasionAlignment: 50 }
  };
}

// Parse command line args
const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');
const dryRun = !args.includes('--commit');

tagVisionOutfitsDirect(limit, dryRun);
