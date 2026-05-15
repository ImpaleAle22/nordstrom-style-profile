/**
 * Gate 1 Validation - Workstream 2 Task 3
 *
 * Run the new runAxisStation on the 5 bad-example outfits from Workstream 1.
 *
 * Required outcomes per spec:
 * - All four axes hold in-enum values (or explicit null with needsReview: true)
 * - Formality is within ±0.5 of expected values
 */

import { runAxisStation } from '../lib/stations/axis-station';
import type { OutfitInput } from '../lib/axis-types';

// ============================================================================
// TEST OUTFITS (from Workstream 1)
// ============================================================================

const TEST_OUTFITS: Record<string, { outfit: OutfitInput; expected: any }> = {
  'gray_sweater': {
    outfit: {
      outfitId: 'test-gray-sweater',
      recipeTitle: 'Casual Gray Sweater & Jeans',
      scoreBreakdown: { occasionAlignment: 40 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Gray Knit Sweater',
          product: {
            id: 'prod-1',
            title: 'Crewneck Knit Sweater',
            brand: 'Nordstrom',
            colors: ['gray', 'grey'],
            department: 'womens',
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Medium Wash Jeans',
          product: {
            id: 'prod-2',
            title: 'High Rise Straight Leg Jeans',
            brand: 'Nordstrom',
            colors: ['blue', 'denim'],
            department: 'womens',
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'White Sneakers',
          product: {
            id: 'prod-3',
            title: 'Classic Court Sneakers',
            brand: 'Nordstrom',
            colors: ['white'],
            department: 'womens',
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Simple Gold Necklace',
          product: {
            id: 'prod-4',
            title: 'Delicate Chain Necklace',
            brand: 'Nordstrom',
            colors: ['gold'],
            department: 'womens',
          },
        },
      ],
    },
    expected: {
      formality: 2.5, // Range 2.5-3.0
      activityContext: 'casual-low-key', // or 'social-daytime'
      season: ['spring', 'fall', 'all-season'],
      socialRegister: 'intimate', // or 'peer-social'
    },
  },

  'blazer_jeans': {
    outfit: {
      outfitId: 'test-blazer-jeans',
      recipeTitle: 'Smart Casual Blazer & Jeans',
      scoreBreakdown: { occasionAlignment: 70 },
      items: [
        {
          role: 'outerwear',
          ingredientTitle: 'Navy Blazer',
          product: {
            id: 'prod-5',
            title: 'Classic Single Breasted Blazer',
            brand: 'Nordstrom',
            colors: ['navy', 'blue'],
            department: 'womens',
          },
        },
        {
          role: 'tops',
          ingredientTitle: 'White Button-Up Shirt',
          product: {
            id: 'prod-6',
            title: 'Cotton Oxford Shirt',
            brand: 'Nordstrom',
            colors: ['white'],
            department: 'womens',
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Dark Wash Jeans',
          product: {
            id: 'prod-7',
            title: 'Slim Fit Dark Denim',
            brand: 'Nordstrom',
            colors: ['blue', 'dark denim'],
            department: 'womens',
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Brown Leather Loafers',
          product: {
            id: 'prod-8',
            title: 'Leather Loafer',
            brand: 'Nordstrom',
            colors: ['brown'],
            department: 'womens',
          },
        },
      ],
    },
    expected: {
      formality: 4.5, // Range 4.0-4.5 (was hitting ceiling at 6.0 before fix)
      activityContext: 'professional', // or 'social-evening'
      season: ['spring', 'fall', 'all-season'],
      socialRegister: 'public-facing', // or 'peer-social'
    },
  },

  'cocktail_dress': {
    outfit: {
      outfitId: 'test-cocktail-dress',
      recipeTitle: 'Evening Cocktail Dress',
      scoreBreakdown: { occasionAlignment: 85 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Black Cocktail Dress',
          product: {
            id: 'prod-9',
            title: 'Satin Cocktail Dress',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'womens',
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Black Heels',
          product: {
            id: 'prod-10',
            title: 'Pointed Toe Pumps',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'womens',
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Statement Earrings',
          product: {
            id: 'prod-11',
            title: 'Crystal Drop Earrings',
            brand: 'Nordstrom',
            colors: ['silver'],
            department: 'womens',
          },
        },
      ],
    },
    expected: {
      formality: 5.5, // Range 5.0-5.5 (was hitting ceiling at 6.0 before fix)
      activityContext: 'social-evening', // or 'event'
      season: ['all-season'],
      socialRegister: 'evaluative', // or 'celebratory'
    },
  },

  'athleisure': {
    outfit: {
      outfitId: 'test-athleisure',
      recipeTitle: 'Athleisure Workout Look',
      scoreBreakdown: { occasionAlignment: 15 },
      items: [
        {
          role: 'tops',
          ingredientTitle: 'Sports Bra',
          product: {
            id: 'prod-12',
            title: 'High Support Sports Bra',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'womens',
          },
        },
        {
          role: 'tops',
          ingredientTitle: 'Athletic Hoodie',
          product: {
            id: 'prod-13',
            title: 'Performance Pullover Hoodie',
            brand: 'Nordstrom',
            colors: ['gray'],
            department: 'womens',
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Black Leggings',
          product: {
            id: 'prod-14',
            title: 'High Waist Yoga Leggings',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'womens',
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Running Sneakers',
          product: {
            id: 'prod-15',
            title: 'Performance Running Shoes',
            brand: 'Nordstrom',
            colors: ['black', 'white'],
            department: 'womens',
          },
        },
      ],
    },
    expected: {
      formality: 1.5, // Range 1.5-2.5 (may hit floor at 1.0)
      activityContext: 'active',
      season: ['all-season'],
      socialRegister: 'intimate',
    },
  },

  'tuxedo': {
    outfit: {
      outfitId: 'test-tuxedo',
      recipeTitle: 'Black Tie Formal',
      scoreBreakdown: { occasionAlignment: 98 },
      items: [
        {
          role: 'outerwear',
          ingredientTitle: 'Black Tuxedo Jacket',
          product: {
            id: 'prod-16',
            title: 'Classic Tuxedo Jacket',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'mens',
          },
        },
        {
          role: 'tops',
          ingredientTitle: 'White Dress Shirt',
          product: {
            id: 'prod-17',
            title: 'Formal Tuxedo Shirt',
            brand: 'Nordstrom',
            colors: ['white'],
            department: 'mens',
          },
        },
        {
          role: 'bottoms',
          ingredientTitle: 'Black Tuxedo Pants',
          product: {
            id: 'prod-18',
            title: 'Tuxedo Trousers',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'mens',
          },
        },
        {
          role: 'shoes',
          ingredientTitle: 'Black Patent Leather Shoes',
          product: {
            id: 'prod-19',
            title: 'Patent Leather Oxfords',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'mens',
          },
        },
        {
          role: 'accessories',
          ingredientTitle: 'Black Bow Tie',
          product: {
            id: 'prod-20',
            title: 'Silk Bow Tie',
            brand: 'Nordstrom',
            colors: ['black'],
            department: 'mens',
          },
        },
      ],
    },
    expected: {
      formality: 6.0, // Maximum formality
      activityContext: 'event',
      season: ['all-season'],
      socialRegister: 'celebratory', // or 'evaluative'
    },
  },
};

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

function validateFormality(actual: number, expected: number, tolerance: number = 0.5): {
  pass: boolean;
  message: string;
} {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  const sign = actual > expected ? '+' : '';
  return {
    pass,
    message: pass
      ? `✓ Formality ${actual.toFixed(1)} within ±${tolerance} of expected ${expected} (diff: ${sign}${(actual - expected).toFixed(1)})`
      : `✗ Formality ${actual.toFixed(1)} outside tolerance of expected ${expected} (diff: ${sign}${(actual - expected).toFixed(1)}, tolerance: ±${tolerance})`,
  };
}

function isValidEnum(value: any, validSet: string[]): boolean {
  return value !== null && value !== undefined && validSet.includes(value);
}

// ============================================================================
// RUN GATE 1 VALIDATION
// ============================================================================

function runGate1Validation() {
  console.log('=== GATE 1 VALIDATION - AXIS STATION ===\n');
  console.log('Running runAxisStation on 5 test outfits...\n');

  const validActivityContexts = ['casual-low-key', 'social-daytime', 'social-evening', 'professional', 'event', 'active'];
  const validSeasons = ['spring', 'summer', 'fall', 'winter', 'all-season'];
  const validSocialRegisters = ['intimate', 'peer-social', 'evaluative', 'public-facing', 'celebratory'];

  let totalTests = 0;
  let passedTests = 0;

  for (const [outfitName, { outfit, expected }] of Object.entries(TEST_OUTFITS)) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`OUTFIT: ${outfitName.toUpperCase()}`);
    console.log(`Recipe: ${outfit.recipeTitle}`);
    console.log(`OccasionAlignment: ${outfit.scoreBreakdown.occasionAlignment}`);
    console.log(`${'='.repeat(80)}\n`);

    const result = runAxisStation(outfit);

    // Display logs
    console.log('--- AXIS STATION LOGS ---\n');
    for (const log of result.logs) {
      console.log(`[${log.axis}:${log.stage}] ${log.message}`);
    }
    console.log();

    // Validate results
    console.log('--- VALIDATION RESULTS ---\n');

    // Test 1: Formality in valid range
    totalTests++;
    if (result.axes.formality.value >= 1.0 && result.axes.formality.value <= 6.0) {
      passedTests++;
      console.log(`✓ Formality ${result.axes.formality.value} in valid range [1.0, 6.0]`);
    } else {
      console.log(`✗ Formality ${result.axes.formality.value} OUTSIDE valid range [1.0, 6.0]`);
    }

    // Test 2: Formality within ±0.5 of expected
    totalTests++;
    const formalityCheck = validateFormality(result.axes.formality.value, expected.formality, 0.5);
    if (formalityCheck.pass) {
      passedTests++;
    }
    console.log(formalityCheck.message);

    // Test 3: ActivityContext is valid enum or null with needsReview
    totalTests++;
    if (result.axes.activityContext.value === null && result.needsReview) {
      passedTests++;
      console.log(`✓ ActivityContext is null with needsReview=true`);
    } else if (isValidEnum(result.axes.activityContext.value, validActivityContexts)) {
      passedTests++;
      console.log(`✓ ActivityContext "${result.axes.activityContext.value}" is valid enum value`);
    } else {
      console.log(`✗ ActivityContext "${result.axes.activityContext.value}" is NOT a valid enum value and needsReview=${result.needsReview}`);
    }

    // Test 4: Season is valid enum array or null with needsReview
    totalTests++;
    if (result.axes.season.value === null && result.needsReview) {
      passedTests++;
      console.log(`✓ Season is null with needsReview=true`);
    } else if (Array.isArray(result.axes.season.value) && result.axes.season.value.every(s => validSeasons.includes(s))) {
      passedTests++;
      console.log(`✓ Season [${result.axes.season.value.join(', ')}] contains only valid enum values`);
    } else {
      console.log(`✗ Season ${JSON.stringify(result.axes.season.value)} contains invalid values or is malformed`);
    }

    // Test 5: SocialRegister is valid enum or null with needsReview
    totalTests++;
    if (result.axes.socialRegister.value === null && result.needsReview) {
      passedTests++;
      console.log(`✓ SocialRegister is null with needsReview=true`);
    } else if (isValidEnum(result.axes.socialRegister.value, validSocialRegisters)) {
      passedTests++;
      console.log(`✓ SocialRegister "${result.axes.socialRegister.value}" is valid enum value`);
    } else {
      console.log(`✗ SocialRegister "${result.axes.socialRegister.value}" is NOT a valid enum value and needsReview=${result.needsReview}`);
    }

    // Summary for this outfit
    console.log(`\nOutfit needsReview: ${result.needsReview}`);
    console.log(`Bold signal detected: ${result.hasBoldSignal}`);
  }

  // Overall summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('GATE 1 SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Pass rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (passedTests === totalTests) {
    console.log('✅ GATE 1 PASSED - All tests passed\n');
    console.log('All four axes hold in-enum values or explicit null with needsReview=true');
    console.log('Formality scores are within ±0.5 of expected values');
    console.log('\nReady to proceed to Workstream 3');
  } else {
    console.log('❌ GATE 1 FAILED - Some tests failed\n');
    console.log('Review failed tests above and fix before proceeding');
  }
}

// Run validation
runGate1Validation();
