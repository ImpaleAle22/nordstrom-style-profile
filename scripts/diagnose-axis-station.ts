/**
 * Workstream 1 — Task 2 & 3
 * Instrument resolveAxes() to trace Bug 1 (empty axes) and Bug 2 (skewed formality)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { resolveAxes } from '../lib/axis-resolver';
import {
  refineFormality,
  refineActivityContext,
  refineSeason,
  refineSocialRegister,
} from '../lib/axis-ai-refiner';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test outfits (synthetic + real)
const TEST_OUTFITS = {
  'bad1_gray_sweater': {
    recipeTitle: 'Casual Gray Sweater & Jeans',
    department: 'womens',
    scoreBreakdown: { occasionAlignment: 40 }, // Base for formality calculation
    items: [
      {
        role: 'tops',
        ingredientTitle: 'Gray Knit Sweater',
        product: {
          title: 'PEBBLE Knitted Sweater',
          colors: ['gray', 'neutral'],
          materials: ['cotton', 'knit'],
          department: 'womens',
          silhouette: 'relaxed',
          productType2: 'sweater'
        }
      },
      {
        role: 'bottoms',
        ingredientTitle: 'Blue Jeans',
        product: {
          title: 'D1 PE NORI High Rise Jeans',
          colors: ['blue', 'denim'],
          materials: ['denim', 'cotton'],
          department: 'womens',
          productType2: 'jeans'
        }
      },
      {
        role: 'shoes',
        ingredientTitle: 'White Sneakers',
        product: {
          title: 'Laura Sneaker',
          colors: ['white'],
          materials: ['leather', 'rubber'],
          department: 'womens',
          productType2: 'sneakers'
        }
      },
      {
        role: 'accessories',
        ingredientTitle: 'Gold Necklace',
        product: {
          title: 'Class Rulle Necklace',
          colors: ['gold'],
          materials: ['metal'],
          department: 'womens',
          productType2: 'necklace'
        }
      }
    ]
  },
  'bad2_leather_jacket': {
    // Real outfit ID: ai_h_m_men_jeans_1773350230040_32_1776117215552_13
    // Will fetch from Supabase
  },
  'bad3_blazer_jeans': {
    recipeTitle: 'Smart Casual Blazer & Jeans',
    department: 'mens',
    scoreBreakdown: { occasionAlignment: 70 },
    items: [
      {
        role: 'outerwear',
        ingredientTitle: 'Navy Blazer',
        product: {
          title: 'Structured Navy Blazer',
          colors: ['navy', 'blue'],
          materials: ['wool', 'cotton'],
          department: 'mens',
          silhouette: 'structured',
          productType2: 'blazer'
        }
      },
      {
        role: 'tops',
        ingredientTitle: 'White Button-Up',
        product: {
          title: 'Classic White Oxford Shirt',
          colors: ['white'],
          materials: ['cotton'],
          department: 'mens',
          productType2: 'shirt'
        }
      },
      {
        role: 'bottoms',
        ingredientTitle: 'Dark Jeans',
        product: {
          title: 'Dark Wash Straight Jeans',
          colors: ['blue', 'dark'],
          materials: ['denim'],
          department: 'mens',
          productType2: 'jeans'
        }
      },
      {
        role: 'shoes',
        ingredientTitle: 'Brown Loafers',
        product: {
          title: 'Leather Penny Loafers',
          colors: ['brown'],
          materials: ['leather'],
          department: 'mens',
          productType2: 'loafers'
        }
      }
    ]
  },
  'bad4_cocktail_dress': {
    recipeTitle: 'Evening Cocktail Look',
    department: 'womens',
    scoreBreakdown: { occasionAlignment: 85 },
    items: [
      {
        role: 'dresses',
        ingredientTitle: 'Black Bodycon Dress',
        product: {
          title: 'Knee-Length Black Dress',
          colors: ['black'],
          materials: ['polyester', 'spandex'],
          department: 'womens',
          silhouette: 'bodycon',
          productType2: 'dress'
        }
      },
      {
        role: 'shoes',
        ingredientTitle: 'Gold Strappy Heels',
        product: {
          title: 'Metallic Gold Heels',
          colors: ['gold', 'metallic'],
          materials: ['synthetic'],
          department: 'womens',
          productType2: 'heels'
        }
      },
      {
        role: 'accessories',
        ingredientTitle: 'Statement Earrings',
        product: {
          title: 'Chandelier Earrings',
          colors: ['silver'],
          materials: ['metal'],
          department: 'womens',
          productType2: 'earrings'
        }
      }
    ]
  },
  'bad5_athleisure': {
    recipeTitle: 'Athleisure Comfort',
    department: 'womens',
    scoreBreakdown: { occasionAlignment: 30 },
    items: [
      {
        role: 'bottoms',
        ingredientTitle: 'Black Leggings',
        product: {
          title: 'Athletic Performance Leggings',
          colors: ['black'],
          materials: ['polyester', 'spandex'],
          department: 'womens',
          productType2: 'leggings'
        }
      },
      {
        role: 'tops',
        ingredientTitle: 'Oversized Sweatshirt',
        product: {
          title: 'Relaxed Fit Sweatshirt',
          colors: ['gray'],
          materials: ['cotton', 'fleece'],
          department: 'womens',
          silhouette: 'oversized',
          productType2: 'sweatshirt'
        }
      },
      {
        role: 'shoes',
        ingredientTitle: 'White Sneakers',
        product: {
          title: 'Classic White Sneakers',
          colors: ['white'],
          materials: ['leather', 'rubber'],
          department: 'womens',
          productType2: 'sneakers'
        }
      }
    ]
  }
};

async function fetchRealOutfit(outfitId: string) {
  const { data } = await supabase
    .from('outfits')
    .select('*')
    .eq('outfit_id', outfitId)
    .single();

  return data;
}

async function diagnoseOutfit(name: string, outfit: any) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`OUTFIT: ${name}`);
  console.log(`Recipe: ${outfit.recipeTitle || outfit.recipe_title}`);
  console.log(`${'='.repeat(80)}\n`);

  console.log('ITEMS:');
  outfit.items.forEach((item: any) => {
    const product = item.product || {};
    console.log(`  ${item.role}: ${item.ingredientTitle || product.title}`);
    console.log(`    Colors: ${product.colors?.join(', ') || 'none'}`);
    console.log(`    Materials: ${product.materials?.join(', ') || 'none'}`);
  });

  console.log(`\nBase Formality Calculation:`);
  const baseScore = (outfit.scoreBreakdown?.occasionAlignment || outfit.score_breakdown?.occasionAlignment || 50) / 100 * 5 + 1;
  console.log(`  occasionAlignment: ${outfit.scoreBreakdown?.occasionAlignment || outfit.score_breakdown?.occasionAlignment || 50}`);
  console.log(`  Formula: (${outfit.scoreBreakdown?.occasionAlignment || outfit.score_breakdown?.occasionAlignment || 50} / 100) * 5 + 1 = ${baseScore.toFixed(2)}`);

  try {
    console.log(`\n${'—'.repeat(80)}`);
    console.log('RUNNING resolveAxes()...\n');

    const result = resolveAxes(outfit);
    const axes = result.axes;

    console.log('RESULTS:');
    console.log(`  Formality: ${axes.formality.value} (confidence: ${axes.formality.confidence}, source: ${axes.formality.source})`);
    console.log(`  Activity Context: ${axes.activityContext.value} (confidence: ${axes.activityContext.confidence}, source: ${axes.activityContext.source})`);
    console.log(`  Season: ${axes.season.value.join(', ')} (confidence: ${axes.season.confidence}, source: ${axes.season.source})`);
    console.log(`  Social Register: ${axes.socialRegister.value} (confidence: ${axes.socialRegister.confidence}, source: ${axes.socialRegister.source})`);

    // Check for Bug 1 (empty axes)
    if (axes.activityContext.value === '???' || axes.socialRegister.value === '???') {
      console.log(`\n⚠️  BUG 1 DETECTED: Empty axis values!`);
      console.log(`  activityContext: ${axes.activityContext.value}`);
      console.log(`  socialRegister: ${axes.socialRegister.value}`);
    }

    // Check for Bug 2 (skewed formality)
    if (name === 'bad1_gray_sweater' && axes.formality.value > 4.0) {
      console.log(`\n⚠️  BUG 2 DETECTED: Formality too high!`);
      console.log(`  Expected: 2.5-3.0`);
      console.log(`  Actual: ${axes.formality.value}`);
      console.log(`  Base from rules: ${baseScore.toFixed(2)}`);
      console.log(`  Inflation: +${(axes.formality.value - baseScore).toFixed(2)}`);
    }

    return result;
  } catch (error) {
    console.error('ERROR:', error);
    return null;
  }
}

async function main() {
  console.log('=== AXIS STATION DIAGNOSTIC ===');
  console.log('Instrumenting resolveAxes() to trace Bug 1 and Bug 2\n');

  const results: any = {};

  // Test outfit 1: Gray sweater (synthetic)
  results.bad1 = await diagnoseOutfit('bad1_gray_sweater', TEST_OUTFITS.bad1_gray_sweater);

  // Test outfit 2: Leather jacket (real from Supabase)
  console.log('\n\nFetching real outfit from Supabase...');
  const realOutfit = await fetchRealOutfit('ai_h_m_men_jeans_1773350230040_32_1776117215552_13');
  if (realOutfit) {
    results.bad2 = await diagnoseOutfit('bad2_leather_jacket (REAL)', realOutfit);
  }

  // Test outfit 3: Blazer + jeans (synthetic)
  results.bad3 = await diagnoseOutfit('bad3_blazer_jeans', TEST_OUTFITS.bad3_blazer_jeans);

  // Test outfit 4: Cocktail dress (synthetic)
  results.bad4 = await diagnoseOutfit('bad4_cocktail_dress', TEST_OUTFITS.bad4_cocktail_dress);

  // Test outfit 5: Athleisure (synthetic)
  results.bad5 = await diagnoseOutfit('bad5_athleisure', TEST_OUTFITS.bad5_athleisure);

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('SUMMARY OF BUGS DETECTED');
  console.log(`${'='.repeat(80)}\n`);

  let bug1Count = 0;
  let bug2Count = 0;

  Object.entries(results).forEach(([name, result]: [string, any]) => {
    if (result && result.axes) {
      const hasEmptyAxes = result.axes.activityContext?.value === '???' || result.axes.socialRegister?.value === '???';
      const hasSkewedFormality = name === 'bad1' && result.axes.formality?.value > 4.0;

      if (hasEmptyAxes) {
        bug1Count++;
        console.log(`${name}: ❌ Bug 1 (empty axes)`);
      }
      if (hasSkewedFormality) {
        bug2Count++;
        console.log(`${name}: ❌ Bug 2 (skewed formality)`);
      }
      if (!hasEmptyAxes && !hasSkewedFormality) {
        console.log(`${name}: ✓ No bugs`);
      }
    }
  });

  console.log(`\nTotal Bug 1 occurrences: ${bug1Count}/5`);
  console.log(`Total Bug 2 occurrences: ${bug2Count}/5`);

  console.log('\n\nNext step: Analyze traces to identify root causes and propose fixes.');
}

main();
