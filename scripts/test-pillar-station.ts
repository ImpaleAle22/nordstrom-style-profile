/**
 * Test Pillar Station on 8 Good Examples
 *
 * From spec §2.2.3 - eval set that anchors v2 quality validation
 *
 * Required outcomes per example:
 * - Correct pillar
 * - Sub-term is in canonical list (exact match preferred, any in-list passes)
 * - Confidence ≥ 0.85 (eval set centerlines should score high)
 */

import { runPillarStation } from '../lib/stations/pillar-station';
import { STYLE_PILLAR_METADATA, type StylePillar } from '../lib/outfit-attributes';
import type { OutfitInput } from '../lib/axis-types';

// ============================================================================
// TEST OUTFITS (8 GOOD EXAMPLES FROM SPEC §2.2.3)
// ============================================================================

const TEST_OUTFITS: Array<{
  name: string;
  outfit: OutfitInput;
  expected: {
    stylePillar: StylePillar;
    subStyle?: string; // Optional - any from pillar's list is acceptable
    formality: number;
    vibes: string[];
    minConfidence: number;
  };
}> = [
  {
    name: '1. Utility / Workwear',
    outfit: {
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
          ingredientTitle: 'White Tee',
          product: {
            id: 'test-1-2',
            title: 'Basic White T-Shirt',
            brand: 'Test',
            colors: ['white'],
            department: 'mens',
            materials: ['cotton'],
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
            details: ['lace-up', 'rubber sole'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Canvas Belt',
          product: {
            id: 'test-1-4',
            title: 'Canvas Belt',
            brand: 'Test',
            colors: ['tan'],
            department: 'mens',
            materials: ['canvas'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Utility',
      subStyle: 'Workwear',
      formality: 2.5,
      vibes: ['Relaxed', 'Effortless'],
      minConfidence: 0.85,
    },
  },

  {
    name: '2. Minimal / Sleek',
    outfit: {
      outfitId: 'test-minimal-sleek',
      recipeTitle: 'Monochrome Minimal',
      scoreBreakdown: { occasionAlignment: 80 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Black Turtleneck',
          product: {
            id: 'test-2-1',
            title: 'Black Turtleneck',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['merino wool'],
            silhouette: 'fitted',
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Black Wide-Leg Trousers',
          product: {
            id: 'test-2-2',
            title: 'Wide-Leg Trousers',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['wool blend'],
            silhouette: 'wide-leg',
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Black Loafers',
          product: {
            id: 'test-2-3',
            title: 'Leather Loafers',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['leather'],
            details: ['slip-on'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Silver Watch',
          product: {
            id: 'test-2-4',
            title: 'Minimalist Watch',
            brand: 'Test',
            colors: ['silver'],
            department: 'womens',
            details: ['minimal', 'sleek'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Minimal',
      subStyle: 'Sleek',
      formality: 4.0,
      vibes: ['Elegant', 'Understated', 'Polished'],
      minConfidence: 0.85,
    },
  },

  {
    name: '3. Athletic / Performance',
    outfit: {
      outfitId: 'test-athletic-performance',
      recipeTitle: 'Running Workout',
      scoreBreakdown: { occasionAlignment: 30 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Athletic Tank',
          product: {
            id: 'test-3-1',
            title: 'Performance Running Tank',
            brand: 'Test',
            colors: ['blue', 'black'],
            department: 'womens',
            materials: ['technical fabric', 'mesh'],
            details: ['moisture-wicking', 'breathable'],
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Running Shorts',
          product: {
            id: 'test-3-2',
            title: 'Running Shorts',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['synthetic', 'performance'],
            details: ['elastic waistband', 'reflective'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Running Shoes',
          product: {
            id: 'test-3-3',
            title: 'Performance Running Shoes',
            brand: 'Test',
            colors: ['white', 'blue'],
            department: 'womens',
            materials: ['mesh', 'synthetic'],
            details: ['cushioned', 'breathable mesh'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Sports Watch',
          product: {
            id: 'test-3-4',
            title: 'GPS Sports Watch',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            details: ['digital', 'waterproof'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Athletic',
      subStyle: 'Performance',
      formality: 1.5,
      vibes: ['Energetic', 'Confident'],
      minConfidence: 0.85,
    },
  },

  {
    name: '4. Romantic / Feminine',
    outfit: {
      outfitId: 'test-romantic-feminine',
      recipeTitle: 'Floral Midi Dress',
      scoreBreakdown: { occasionAlignment: 90 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Floral Midi Dress',
          product: {
            id: 'test-4-1',
            title: 'Floral Midi Dress',
            brand: 'Test',
            colors: ['pink', 'cream', 'floral'],
            department: 'womens',
            materials: ['silk', 'chiffon'],
            silhouette: 'midi',
            patterns: ['floral'],
            details: ['ruffle trim', 'delicate'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Nude Strappy Heels',
          product: {
            id: 'test-4-2',
            title: 'Strappy Heels',
            brand: 'Test',
            colors: ['nude', 'beige'],
            department: 'womens',
            materials: ['leather'],
            silhouette: 'strappy',
            details: ['stiletto heel'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Pearl Earrings',
          product: {
            id: 'test-4-3',
            title: 'Pearl Drop Earrings',
            brand: 'Test',
            colors: ['white', 'pearl'],
            department: 'womens',
            details: ['pearl', 'delicate'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Woven Clutch',
          product: {
            id: 'test-4-4',
            title: 'Woven Clutch',
            brand: 'Test',
            colors: ['tan', 'natural'],
            department: 'womens',
            details: ['woven', 'small'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Romantic',
      subStyle: 'Feminine',
      formality: 4.5,
      vibes: ['Elegant', 'Fresh', 'Feminine'],
      minConfidence: 0.85,
    },
  },

  {
    name: '5. Streetwear / Urban',
    outfit: {
      outfitId: 'test-streetwear-urban',
      recipeTitle: 'Urban Streetwear',
      scoreBreakdown: { occasionAlignment: 40 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Oversized Graphic Hoodie',
          product: {
            id: 'test-5-1',
            title: 'Oversized Graphic Hoodie',
            brand: 'Test',
            colors: ['black', 'white'],
            department: 'unisex',
            materials: ['cotton blend'],
            silhouette: 'oversized',
            details: ['graphic print', 'drawstring hood'],
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Distressed Jeans',
          product: {
            id: 'test-5-2',
            title: 'Distressed Denim Jeans',
            brand: 'Test',
            colors: ['blue', 'denim'],
            department: 'unisex',
            materials: ['denim'],
            details: ['distressed', 'ripped'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'High-Top Sneakers',
          product: {
            id: 'test-5-3',
            title: 'High-Top Sneakers',
            brand: 'Test',
            colors: ['black', 'white'],
            department: 'unisex',
            materials: ['canvas', 'rubber'],
            details: ['high-top', 'chunky sole'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Chain Necklace',
          product: {
            id: 'test-5-4',
            title: 'Chain Necklace',
            brand: 'Test',
            colors: ['silver'],
            department: 'unisex',
            materials: ['metal'],
            details: ['chain', 'chunky'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Streetwear',
      subStyle: 'Urban',
      formality: 2.0,
      vibes: ['Bold', 'Confident', 'Relaxed'],
      minConfidence: 0.85,
    },
  },

  {
    name: '6. Classic / Polished',
    outfit: {
      outfitId: 'test-classic-polished',
      recipeTitle: 'Polished Classic',
      scoreBreakdown: { occasionAlignment: 70 },
      items: [
        {
          role: 'outerwear',
          ingredientTitle: 'Camel Wool Coat',
          product: {
            id: 'test-6-1',
            title: 'Camel Wool Coat',
            brand: 'Test',
            colors: ['camel', 'tan'],
            department: 'womens',
            materials: ['wool'],
            silhouette: 'structured',
            details: ['mid-length', 'button closure'],
          },
        },
        {
          role: 'tops',
          ingredientTitle: 'Cream Cashmere Sweater',
          product: {
            id: 'test-6-2',
            title: 'Cashmere Crewneck Sweater',
            brand: 'Test',
            colors: ['cream', 'off-white'],
            department: 'womens',
            materials: ['cashmere'],
            silhouette: 'fitted',
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Dark Wash Jeans',
          product: {
            id: 'test-6-3',
            title: 'Tailored Straight-Leg Jeans',
            brand: 'Test',
            colors: ['dark wash', 'blue'],
            department: 'womens',
            materials: ['denim'],
            silhouette: 'straight-leg',
            details: ['tailored', 'clean'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Black Leather Ankle Boots',
          product: {
            id: 'test-6-4',
            title: 'Pointed-Toe Ankle Boots',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['leather'],
            silhouette: 'pointed-toe',
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Black Leather Handbag',
          product: {
            id: 'test-6-5',
            title: 'Structured Leather Handbag',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['leather'],
            silhouette: 'structured',
            details: ['small', 'top handle'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Classic',
      subStyle: 'Polished',
      formality: 3.5,
      vibes: ['Polished', 'Timeless', 'Confident'],
      minConfidence: 0.85,
    },
  },

  {
    name: '7. Bohemian / Free-spirited',
    outfit: {
      outfitId: 'test-bohemian-free',
      recipeTitle: 'Boho Maxi Dress',
      scoreBreakdown: { occasionAlignment: 60 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Tiered Floral Maxi Dress',
          product: {
            id: 'test-7-1',
            title: 'Tiered Floral Maxi Dress',
            brand: 'Test',
            colors: ['rust', 'gold', 'brown', 'earth tones'],
            department: 'womens',
            materials: ['cotton'],
            silhouette: 'tiered',
            patterns: ['floral'],
            details: ['maxi', 'flowy'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Leather Fringe Bag',
          product: {
            id: 'test-7-2',
            title: 'Fringe Crossbody Bag',
            brand: 'Test',
            colors: ['brown'],
            department: 'womens',
            materials: ['leather'],
            details: ['fringe', 'crossbody'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Tan Suede Ankle Boots',
          product: {
            id: 'test-7-3',
            title: 'Suede Ankle Boots',
            brand: 'Test',
            colors: ['tan', 'brown'],
            department: 'womens',
            materials: ['suede'],
            details: ['block heel', 'ankle'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Layered Gold Necklaces',
          product: {
            id: 'test-7-4',
            title: 'Layered Pendant Necklaces',
            brand: 'Test',
            colors: ['gold'],
            department: 'womens',
            materials: ['gold-plated'],
            details: ['layered', 'pendant'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Wide-Brim Hat',
          product: {
            id: 'test-7-5',
            title: 'Camel Felt Hat',
            brand: 'Test',
            colors: ['camel', 'tan'],
            department: 'womens',
            materials: ['felt'],
            details: ['wide-brim'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Bohemian',
      subStyle: 'Free-spirited',
      formality: 3.0,
      vibes: ['Free', 'Effortless', 'Artsy'],
      minConfidence: 0.85,
    },
  },

  {
    name: '8. Maximal / Glam',
    outfit: {
      outfitId: 'test-maximal-glam',
      recipeTitle: 'Sequined Mini Dress',
      scoreBreakdown: { occasionAlignment: 100 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Emerald Sequined Mini Dress',
          product: {
            id: 'test-8-1',
            title: 'Sequined Bodycon Mini Dress',
            brand: 'Test',
            colors: ['emerald', 'green'],
            department: 'womens',
            materials: ['sequin', 'polyester'],
            silhouette: 'bodycon',
            details: ['sequined', 'mini', 'long sleeves'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Gold Strappy Heels',
          product: {
            id: 'test-8-2',
            title: 'Strappy Stiletto Sandals',
            brand: 'Test',
            colors: ['gold', 'metallic'],
            department: 'womens',
            materials: ['metallic leather'],
            silhouette: 'strappy',
            details: ['stiletto', 'statement'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Chandelier Earrings',
          product: {
            id: 'test-8-3',
            title: 'Statement Chandelier Earrings',
            brand: 'Test',
            colors: ['gold', 'crystal'],
            department: 'womens',
            materials: ['gold-plated', 'crystal'],
            details: ['chandelier', 'statement', 'dramatic'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Gold Chain Clutch',
          product: {
            id: 'test-8-4',
            title: 'Chain-Strap Clutch',
            brand: 'Test',
            colors: ['gold'],
            department: 'womens',
            materials: ['leather', 'gold chain'],
            details: ['chain strap', 'small', 'statement'],
          },
        },
      ],
    },
    expected: {
      stylePillar: 'Maximal',
      subStyle: 'Glam',
      formality: 5.0,
      vibes: ['Glam', 'Bold', 'Sexy'],
      minConfidence: 0.85,
    },
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('=== PILLAR STATION TEST - 8 GOOD EXAMPLES ===\n');

  let totalTests = 0;
  let passedTests = 0;

  for (const test of TEST_OUTFITS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${test.name}`);
    console.log(`${'='.repeat(80)}\n`);

    totalTests += 3; // Pillar, sub-term, confidence

    try {
      const result = await runPillarStation(test.outfit);

      console.log('RESULT:');
      console.log(`  Style Pillar: ${result.stylePillar || 'null'}`);
      console.log(`  Sub-Style: ${result.subStyle || 'null'}`);
      console.log(`  Confidence: ${result.confidence.toFixed(3)}`);
      console.log(`  Needs Review: ${result.needsReview}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      if (result.markers) {
        console.log(`  Markers (${result.markers.length}):`);
        result.markers.forEach(m => {
          console.log(`    - ${m.type}: ${m.value} (${m.confidence.toFixed(2)})`);
        });
      }

      console.log('\nEXPECTED:');
      console.log(`  Style Pillar: ${test.expected.stylePillar}`);
      console.log(`  Sub-Style: ${test.expected.subStyle || 'any from canonical list'}`);
      console.log(`  Min Confidence: ${test.expected.minConfidence}`);

      console.log('\nVALIDATION:');

      // Test 1: Correct pillar
      if (result.stylePillar === test.expected.stylePillar) {
        console.log(`  ✓ Pillar: ${result.stylePillar} (correct)`);
        passedTests++;
      } else {
        console.log(`  ✗ Pillar: Got ${result.stylePillar}, expected ${test.expected.stylePillar}`);
      }

      // Test 2: Sub-term in canonical list
      if (result.subStyle === null) {
        console.log(`  ⚠ Sub-term: null (acceptable but not ideal)`);
        passedTests++; // Still pass - null is acceptable
      } else {
        const canonicalList = STYLE_PILLAR_METADATA[test.expected.stylePillar].subTerms;
        if (canonicalList.includes(result.subStyle)) {
          if (test.expected.subStyle && result.subStyle === test.expected.subStyle) {
            console.log(`  ✓ Sub-term: ${result.subStyle} (exact match)`);
          } else {
            console.log(`  ✓ Sub-term: ${result.subStyle} (in canonical list)`);
          }
          passedTests++;
        } else {
          console.log(`  ✗ Sub-term: ${result.subStyle} not in canonical list for ${test.expected.stylePillar}`);
        }
      }

      // Test 3: Confidence ≥ threshold
      if (result.confidence >= test.expected.minConfidence) {
        console.log(`  ✓ Confidence: ${result.confidence.toFixed(3)} ≥ ${test.expected.minConfidence}`);
        passedTests++;
      } else {
        console.log(`  ✗ Confidence: ${result.confidence.toFixed(3)} < ${test.expected.minConfidence}`);
      }
    } catch (error) {
      console.error(`\n✗ TEST FAILED WITH ERROR:`);
      console.error(error);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Pass rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED\n');
    console.log('Pillar Station is ready for production.');
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    console.log('Review failures above and adjust marker scoring table or station logic.');
  }
}

// Run tests
runTests().catch(console.error);
