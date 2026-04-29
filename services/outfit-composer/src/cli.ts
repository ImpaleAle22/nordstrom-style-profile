#!/usr/bin/env node
/**
 * CLI for Outfit Composer Service
 *
 * Usage:
 *   npm run compose:recipe -- --recipe hiking_womens_spring_outfit_01 --gender womens --season spring
 */

import 'dotenv/config';
import { composeOutfits } from './composer';
import type { CustomerSignals } from './types';

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
};

const recipeId = getArg('--recipe');
const gender = getArg('--gender') as 'womens' | 'mens' || 'womens';
const season = getArg('--season') as 'spring' | 'fall' || 'spring';
const dogOwner = args.includes('--dog-owner');
const maxOutfits = getArg('--max') ? parseInt(getArg('--max')!) : 5;
const minConfidence = getArg('--min-confidence') ? parseInt(getArg('--min-confidence')!) : 50;

if (!recipeId) {
  console.error('❌ Error: --recipe flag is required\n');
  console.log('Usage:');
  console.log('  npm run compose:recipe -- --recipe <recipeId> [options]\n');
  console.log('Options:');
  console.log('  --recipe <id>           Recipe ID to compose (required)');
  console.log('  --gender <womens|mens>  Customer gender (default: womens)');
  console.log('  --season <spring|fall>  Customer season (default: spring)');
  console.log('  --dog-owner             Customer owns a dog');
  console.log('  --max <n>               Max outfits to generate (default: 5)');
  console.log('  --min-confidence <n>    Min confidence threshold (default: 50)');
  console.log('\nExample:');
  console.log('  npm run compose:recipe -- --recipe hiking_womens_spring_outfit_01 --gender womens --season spring --dog-owner');
  process.exit(1);
}

const signals: CustomerSignals = {
  gender,
  season,
  dog_owner: dogOwner,
};

// Run composition
(async () => {
  const response = await composeOutfits({
    recipeId,
    customerSignals: signals,
    maxOutfits,
    minConfidence,
  });

  if (!response.success) {
    console.error(`\n❌ Composition failed: ${response.error}\n`);
    process.exit(1);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  Composition Results: ${response.metadata.recipeTitle}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  console.log(`Total Outfits Generated: ${response.outfits.length}`);
  console.log(`Processing Time: ${response.metadata.processingTimeMs}ms\n`);

  response.outfits.forEach((outfit, i) => {
    console.log(`\n─────────────────────────────────────────────────────────────`);
    console.log(`Outfit ${i + 1} - Confidence: ${outfit.confidenceScore}/100 (${outfit.poolTier.toUpperCase()})`);
    console.log(`─────────────────────────────────────────────────────────────`);

    console.log('\nItems:');
    outfit.items.forEach((item) => {
      console.log(`  ${item.role.toUpperCase()}:`);
      console.log(`    ${item.product.brand} ${item.product.title}`);
      console.log(`    $${item.product.price} | ${item.product.productType2 || 'N/A'}`);
      console.log(`    Colors: ${item.product.simplifiedColors?.join(', ') || item.product.vanityColor || 'N/A'}`);
    });

    console.log('\nScore Breakdown:');
    console.log(`  Style Register Coherence: ${outfit.scoreBreakdown.styleRegisterCoherence}/100`);
    console.log(`  Color Harmony:            ${outfit.scoreBreakdown.colorHarmony}/100`);
    console.log(`  Silhouette Balance:       ${outfit.scoreBreakdown.silhouetteBalance}/100`);
    console.log(`  Occasion Alignment:       ${outfit.scoreBreakdown.occasionAlignment}/100`);
    console.log(`  Season/Fabric Weight:     ${outfit.scoreBreakdown.seasonFabricWeight}/100`);

    if (outfit.aiReasoning) {
      console.log('\nAI Reasoning:');
      console.log(`  ${outfit.aiReasoning}`);
    }
  });

  console.log('\n════════════════════════════════════════════════════════════════\n');
})();
