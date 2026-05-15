/**
 * Vibes Station Test Suite
 *
 * Tests the pillar-gated vibe assignment on:
 * - 8 good examples from spec §2.2.3
 * - Gray-sweater bad example (regression test)
 *
 * Required outcomes per implementation brief Workstream 6:
 * - Every example produces 1-3 vibes from its pillar's coherence list
 * - At least 2 of 3 vibes overlap with expected vibes
 * - No out-of-list vibes after retry
 * - Gray sweater must NOT get Romantic/Elegant (hallucinated in v1)
 */

import { runVibesStation } from '../lib/stations/vibes-station';
import { PILLAR_VIBE_COHERENCE } from '../lib/pillar-vibe-coherence';
import type { OutfitInput } from '../lib/axis-types';
import type { StylePillar, Vibe } from '../lib/outfit-attributes';

// ============================================================================
// TEST DATA (8 GOOD EXAMPLES + 1 BAD EXAMPLE)
// ============================================================================

interface TestCase {
  name: string;
  pillar: StylePillar;
  outfit: OutfitInput;
  expectedVibes: Vibe[];
  isBadExample?: boolean; // True for regression tests
  hallucinatedVibes?: Vibe[]; // Vibes that must NOT appear (bad examples only)
}

const TEST_CASES: TestCase[] = [
  // ============================================================================
  // GOOD EXAMPLES (from spec §2.2.3)
  // ============================================================================

  {
    name: '1. Utility / Workwear',
    pillar: 'Utility',
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
    expectedVibes: ['Relaxed', 'Effortless'],
  },

  {
    name: '2. Minimal / Sleek',
    pillar: 'Minimal',
    outfit: {
      outfitId: 'test-minimal-sleek',
      recipeTitle: 'All-Black Minimal Look',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Black Turtleneck',
          product: {
            id: 'test-2-1',
            title: 'Black Merino Wool Turtleneck',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['merino wool'],
            silhouette: 'fitted',
            details: ['ribbed knit'],
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Black Wide-Leg Trousers',
          product: {
            id: 'test-2-2',
            title: 'Black Wide-Leg Trousers',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['wool blend'],
            silhouette: 'wide-leg',
            details: ['high waist', 'pressed crease'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Black Leather Loafers',
          product: {
            id: 'test-2-3',
            title: 'Black Leather Slip-On Loafers',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['leather'],
            details: ['slip-on', 'minimal hardware'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Silver Watch',
          product: {
            id: 'test-2-4',
            title: 'Minimalist Silver Watch',
            brand: 'Test',
            colors: ['silver'],
            department: 'womens',
            materials: ['stainless steel'],
            details: ['sleek', 'minimal dial'],
          },
        },
      ],
    },
    expectedVibes: ['Elegant', 'Understated', 'Polished'],
  },

  {
    name: '3. Athletic / Performance',
    pillar: 'Athletic',
    outfit: {
      outfitId: 'test-athletic-performance',
      recipeTitle: 'Running Outfit',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Performance Tank',
          product: {
            id: 'test-3-1',
            title: 'Technical Fabric Running Tank',
            brand: 'Test',
            colors: ['blue'],
            department: 'womens',
            materials: ['technical fabric', 'polyester'],
            silhouette: 'fitted',
            details: ['moisture-wicking', 'breathable'],
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Athletic Shorts',
          product: {
            id: 'test-3-2',
            title: 'Running Shorts',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['mesh', 'polyester'],
            details: ['elastic waist', 'reflective trim'],
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
            details: ['cushioned sole', 'breathable'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Sports Watch',
          product: {
            id: 'test-3-4',
            title: 'Digital Sports Watch',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['plastic', 'silicone'],
            details: ['digital', 'heart rate monitor'],
          },
        },
      ],
    },
    expectedVibes: ['Energetic', 'Confident'],
  },

  {
    name: '4. Romantic / Feminine',
    pillar: 'Romantic',
    outfit: {
      outfitId: 'test-romantic-feminine',
      recipeTitle: 'Floral Midi Dress',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'dresses',
          ingredientTitle: 'Floral Midi Dress',
          product: {
            id: 'test-4-1',
            title: 'Floral Print Midi Dress',
            brand: 'Test',
            colors: ['pink', 'white', 'green'],
            department: 'womens',
            materials: ['silk', 'chiffon'],
            silhouette: 'midi',
            patterns: ['floral'],
            details: ['ruffle trim', 'tie waist'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Nude Strappy Heels',
          product: {
            id: 'test-4-2',
            title: 'Strappy Heeled Sandals',
            brand: 'Test',
            colors: ['nude', 'beige'],
            department: 'womens',
            materials: ['leather'],
            silhouette: 'strappy',
            details: ['stiletto heel', 'ankle strap'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Pearl Earrings',
          product: {
            id: 'test-4-3',
            title: 'Pearl Drop Earrings',
            brand: 'Test',
            colors: ['white', 'gold'],
            department: 'womens',
            materials: ['pearl', 'gold'],
            details: ['delicate', 'drop style'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Woven Clutch',
          product: {
            id: 'test-4-4',
            title: 'Woven Straw Clutch',
            brand: 'Test',
            colors: ['neutral', 'tan'],
            department: 'womens',
            materials: ['straw', 'woven'],
            details: ['structured', 'clasp closure'],
          },
        },
      ],
    },
    expectedVibes: ['Elegant', 'Fresh', 'Feminine'],
  },

  {
    name: '5. Streetwear / Urban',
    pillar: 'Streetwear',
    outfit: {
      outfitId: 'test-streetwear-urban',
      recipeTitle: 'Urban Streetwear Look',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Oversized Graphic Hoodie',
          product: {
            id: 'test-5-1',
            title: 'Oversized Graphic Hoodie',
            brand: 'Test',
            colors: ['black', 'white'],
            department: 'mens',
            materials: ['cotton', 'polyester'],
            silhouette: 'oversized',
            details: ['graphic print', 'hood', 'drawstring'],
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Distressed Jeans',
          product: {
            id: 'test-5-2',
            title: 'Distressed Baggy Jeans',
            brand: 'Test',
            colors: ['blue', 'light wash'],
            department: 'mens',
            materials: ['denim', 'cotton'],
            silhouette: 'baggy',
            details: ['distressed', 'ripped knees'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'High-Top Sneakers',
          product: {
            id: 'test-5-3',
            title: 'High-Top Sneakers',
            brand: 'Test',
            colors: ['white', 'red'],
            department: 'mens',
            materials: ['leather', 'canvas'],
            details: ['high-top', 'chunky sole', 'lace-up'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Chain Necklace',
          product: {
            id: 'test-5-4',
            title: 'Chunky Chain Necklace',
            brand: 'Test',
            colors: ['silver'],
            department: 'mens',
            materials: ['metal'],
            details: ['chain', 'chunky'],
          },
        },
      ],
    },
    expectedVibes: ['Bold', 'Confident', 'Relaxed'],
  },

  {
    name: '6. Classic / Polished',
    pillar: 'Classic',
    outfit: {
      outfitId: 'test-classic-polished',
      recipeTitle: 'Camel Coat Outfit',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'outerwear',
          ingredientTitle: 'Camel Wool Coat',
          product: {
            id: 'test-6-1',
            title: 'Structured Camel Wool Coat',
            brand: 'Test',
            colors: ['camel', 'tan'],
            department: 'womens',
            materials: ['wool'],
            silhouette: 'structured',
            details: ['notched lapel', 'single-breasted'],
          },
        },
        {
          role: 'tops',
          ingredientTitle: 'Cream Cashmere Sweater',
          product: {
            id: 'test-6-2',
            title: 'Cashmere Crewneck Sweater',
            brand: 'Test',
            colors: ['cream', 'neutral'],
            department: 'womens',
            materials: ['cashmere'],
            silhouette: 'fitted',
            details: ['ribbed trim'],
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Dark Wash Straight-Leg Jeans',
          product: {
            id: 'test-6-3',
            title: 'Tailored Straight-Leg Jeans',
            brand: 'Test',
            colors: ['dark wash', 'black'],
            department: 'womens',
            materials: ['denim', 'cotton'],
            silhouette: 'straight-leg',
            details: ['tailored', 'clean hem'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Pointed-Toe Ankle Boots',
          product: {
            id: 'test-6-4',
            title: 'Black Leather Ankle Boots',
            brand: 'Test',
            colors: ['black'],
            department: 'womens',
            materials: ['leather'],
            silhouette: 'pointed-toe',
            details: ['block heel', 'side zip'],
          },
        },
      ],
    },
    expectedVibes: ['Polished', 'Timeless', 'Confident'],
  },

  {
    name: '7. Bohemian / Free-spirited',
    pillar: 'Bohemian',
    outfit: {
      outfitId: 'test-bohemian-free-spirited',
      recipeTitle: 'Boho Maxi Dress',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'dresses',
          ingredientTitle: 'Tiered Floral Maxi Dress',
          product: {
            id: 'test-7-1',
            title: 'Tiered Floral Maxi Dress',
            brand: 'Test',
            colors: ['rust', 'gold', 'brown', 'earth tones'],
            department: 'womens',
            materials: ['cotton'],
            silhouette: 'tiered',
            patterns: ['floral', 'botanical'],
            details: ['tiered ruffles', 'v-neckline'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Fringe Crossbody Bag',
          product: {
            id: 'test-7-2',
            title: 'Brown Leather Fringe Bag',
            brand: 'Test',
            colors: ['brown'],
            department: 'womens',
            materials: ['leather'],
            details: ['fringe trim', 'crossbody strap'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Suede Ankle Boots',
          product: {
            id: 'test-7-3',
            title: 'Tan Suede Ankle Boots',
            brand: 'Test',
            colors: ['tan', 'camel'],
            department: 'womens',
            materials: ['suede'],
            details: ['block heel', 'pull-on'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Layered Necklaces',
          product: {
            id: 'test-7-4',
            title: 'Gold Layered Pendant Necklaces',
            brand: 'Test',
            colors: ['gold'],
            department: 'womens',
            materials: ['gold', 'metal'],
            details: ['layered', 'mixed lengths'],
          },
        },
      ],
    },
    expectedVibes: ['Free', 'Effortless', 'Artsy'],
  },

  {
    name: '8. Maximal / Glam',
    pillar: 'Maximal',
    outfit: {
      outfitId: 'test-maximal-glam',
      recipeTitle: 'Sequin Mini Dress',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'dresses',
          ingredientTitle: 'Emerald Sequined Mini Dress',
          product: {
            id: 'test-8-1',
            title: 'Emerald Green Sequined Bodycon Mini Dress',
            brand: 'Test',
            colors: ['emerald', 'green'],
            department: 'womens',
            materials: ['sequin', 'polyester'],
            silhouette: 'bodycon',
            patterns: ['sequined'],
            details: ['all-over sequins', 'long sleeves'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Gold Stiletto Sandals',
          product: {
            id: 'test-8-2',
            title: 'Gold Strappy Stiletto Sandals',
            brand: 'Test',
            colors: ['gold'],
            department: 'womens',
            materials: ['leather', 'metallic'],
            silhouette: 'strappy',
            details: ['stiletto heel', 'thin straps'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Statement Chandelier Earrings',
          product: {
            id: 'test-8-3',
            title: 'Gold Crystal Chandelier Earrings',
            brand: 'Test',
            colors: ['gold', 'clear'],
            department: 'womens',
            materials: ['gold', 'crystal'],
            details: ['chandelier style', 'statement', 'drop earrings'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Gold Clutch',
          product: {
            id: 'test-8-4',
            title: 'Metallic Gold Chain-Strap Clutch',
            brand: 'Test',
            colors: ['gold'],
            department: 'womens',
            materials: ['metallic', 'gold'],
            details: ['chain strap', 'structured'],
          },
        },
      ],
    },
    expectedVibes: ['Glam', 'Bold', 'Sexy'],
  },

  // ============================================================================
  // BAD EXAMPLE (Gray Sweater - Regression Test)
  // ============================================================================

  {
    name: '9. Gray Sweater (BAD EXAMPLE - Regression Test)',
    pillar: 'Casual', // Pre-tagged manually for isolated Vibes Station test
    outfit: {
      outfitId: 'test-gray-sweater-bad',
      recipeTitle: 'Gray Sweater Casual Outfit',
      scoreBreakdown: { occasionAlignment: 50 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Gray Sweater',
          product: {
            id: 'test-bad-1',
            title: 'Gray Cotton Sweater',
            brand: 'Test',
            colors: ['gray'],
            department: 'womens',
            materials: ['cotton'],
            silhouette: 'relaxed fit',
            details: ['crew neck', 'ribbed trim'],
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Blue Jeans',
          product: {
            id: 'test-bad-2',
            title: 'Blue Denim Jeans',
            brand: 'Test',
            colors: ['blue', 'medium wash'],
            department: 'womens',
            materials: ['denim', 'cotton'],
            silhouette: 'straight-leg',
            details: ['five-pocket', 'belt loops'],
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'White Sneakers',
          product: {
            id: 'test-bad-3',
            title: 'White Canvas Sneakers',
            brand: 'Test',
            colors: ['white'],
            department: 'womens',
            materials: ['canvas'],
            details: ['lace-up', 'rubber sole'],
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Simple Gold Necklace',
          product: {
            id: 'test-bad-4',
            title: 'Gold Chain Necklace',
            brand: 'Test',
            colors: ['gold'],
            department: 'womens',
            materials: ['gold'],
            details: ['simple', 'delicate chain'],
          },
        },
      ],
    },
    expectedVibes: ['Relaxed', 'Effortless', 'Approachable'], // From Casual's coherence list
    isBadExample: true,
    hallucinatedVibes: ['Romantic', 'Elegant', 'Cute', 'Bold', 'Understated'], // Must NOT appear
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('=== VIBES STATION TEST - 8 GOOD EXAMPLES + 1 BAD EXAMPLE ===\n');

  let totalTests = 0;
  let passedTests = 0;

  for (const test of TEST_CASES) {
    console.log('='.repeat(80));
    console.log(`TEST: ${test.name}`);
    console.log('='.repeat(80));
    console.log();

    try {
      // Run Vibes Station
      const result = await runVibesStation(test.outfit, test.pillar);

      console.log('RESULT:');
      console.log(`  Vibes: ${result.vibes.join(', ')}`);
      console.log(`  Confidence: ${result.confidence.toFixed(3)}`);
      console.log(`  Defaulted: ${result.defaulted}`);
      console.log(`  Retried for Out-of-List: ${result.retriedForOutOfList}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log();

      console.log('EXPECTED:');
      console.log(`  Vibes: ${test.expectedVibes.join(', ')}`);
      if (test.isBadExample && test.hallucinatedVibes) {
        console.log(`  Must NOT include: ${test.hallucinatedVibes.join(', ')}`);
      }
      console.log();

      // Validation
      console.log('VALIDATION:');

      // Test 1: All vibes are from pillar's coherence list
      const coherentVibes = PILLAR_VIBE_COHERENCE[test.pillar];
      const allVibesInList = result.vibes.every(v => coherentVibes.includes(v));
      if (allVibesInList) {
        console.log(`  ✓ All vibes in ${test.pillar}'s coherence list`);
        passedTests++;
      } else {
        const outOfList = result.vibes.filter(v => !coherentVibes.includes(v));
        console.log(`  ✗ Out-of-list vibes: ${outOfList.join(', ')}`);
      }
      totalTests++;

      // Test 2: 1-3 vibes returned
      if (result.vibes.length >= 1 && result.vibes.length <= 3) {
        console.log(`  ✓ Vibe count (${result.vibes.length}) within range [1-3]`);
        passedTests++;
      } else {
        console.log(`  ✗ Vibe count (${result.vibes.length}) outside range [1-3]`);
      }
      totalTests++;

      // Test 3: At least 2 of 3 vibes overlap with expected (good examples only)
      if (!test.isBadExample) {
        const overlap = result.vibes.filter(v => test.expectedVibes.includes(v));
        const minOverlap = Math.min(2, test.expectedVibes.length);
        if (overlap.length >= minOverlap) {
          console.log(`  ✓ Overlap (${overlap.length}/${test.expectedVibes.length}): ${overlap.join(', ')}`);
          passedTests++;
        } else {
          console.log(`  ✗ Overlap (${overlap.length}/${test.expectedVibes.length}) below minimum ${minOverlap}`);
        }
        totalTests++;
      }

      // Test 4: No hallucinated vibes (bad examples only)
      if (test.isBadExample && test.hallucinatedVibes) {
        const hallucinated = result.vibes.filter(v => test.hallucinatedVibes!.includes(v));
        if (hallucinated.length === 0) {
          console.log(`  ✓ No hallucinated vibes (Romantic, Elegant, etc.)`);
          passedTests++;
        } else {
          console.log(`  ✗ Hallucinated vibes detected: ${hallucinated.join(', ')}`);
        }
        totalTests++;
      }

      // Test 5: No retry for out-of-list vibes (all examples)
      if (!result.retriedForOutOfList) {
        console.log(`  ✓ No retry needed (AI returned valid vibes on first call)`);
        passedTests++;
      } else {
        console.log(`  ⚠ Retry fired (AI returned out-of-list vibes on first call)`);
        // Not a failure, just a warning
      }
      totalTests++;

      console.log();
    } catch (error) {
      console.error('ERROR:', error);
      console.log();
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Pass rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log();

  if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log();
    console.log('Review failures above and adjust coherence map or station logic.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
