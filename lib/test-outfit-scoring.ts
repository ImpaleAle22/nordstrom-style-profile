/**
 * test-outfit-scoring.ts
 * Test script to validate the new intentional contrast scoring system
 */

import {
  computeIntentionalContrastScore,
  computeUnifyingStrength,
  computeOutfitQualityScore,
  getRegisterDistance,
  STYLE_REGISTER_INDEX,
  type StyleRegister,
} from './outfit-building-rules.js';

interface TestCase {
  name: string;
  description: string;
  maxRegisterDistance: number;
  unifyingElements: {
    colorHarmony: number;
    silhouetteBalance: number;
    materialConsistency?: number;
    tonalConsistency?: number;
  };
  expectedIntentionalContrast: number;
  expectedQuality: number;
  generalFashionability: number;
}

const testCases: TestCase[] = [
  {
    name: "Example 1: Edgy + Feminine (Monochrome Black)",
    description: "Black leather moto jacket + black floral midi dress + black ankle boots",
    maxRegisterDistance: 3, // edgy (1) to elevated (4)
    unifyingElements: {
      colorHarmony: 95,
      silhouetteBalance: 90,
      materialConsistency: 60,
      tonalConsistency: 70,
    },
    generalFashionability: 85,
    expectedIntentionalContrast: 95, // Strong unifying → BOOST
    expectedQuality: 93,
  },
  {
    name: "Example 2: Athletic + Elevated (Sleek Silhouettes)",
    description: "Technical nylon track pants + silk cami + minimalist heeled mules",
    maxRegisterDistance: 4, // athletic (0) to elevated (4)
    unifyingElements: {
      colorHarmony: 75,
      silhouetteBalance: 85,
      materialConsistency: 50,
      tonalConsistency: 90,
    },
    generalFashionability: 80,
    expectedIntentionalContrast: 95, // Strong unifying → BOOST
    expectedQuality: 88,
  },
  {
    name: "Example 3: Casual + Formal (Tailoring)",
    description: "Graphic band tee + tailored wool trousers + oxford loafers",
    maxRegisterDistance: 2, // casual (1) to business-casual (3)
    unifyingElements: {
      colorHarmony: 80,
      silhouetteBalance: 85,
      materialConsistency: 40,
      tonalConsistency: 65,
    },
    generalFashionability: 80,
    expectedIntentionalContrast: 95, // Strong unifying → BOOST
    expectedQuality: 87,
  },
  {
    name: "Example 4: Grunge + Romantic (Texture)",
    description: "Distressed band tee + lace midi skirt + combat boots",
    maxRegisterDistance: 3, // casual (1) to elevated (4)
    unifyingElements: {
      colorHarmony: 70,
      silhouetteBalance: 90,
      materialConsistency: 85,
      tonalConsistency: 80,
    },
    generalFashionability: 75,
    expectedIntentionalContrast: 95, // Strong unifying → BOOST
    expectedQuality: 85,
  },
  {
    name: "Example 5: Neon Athletic + Floral (NO Unifying Element)",
    description: "Neon green athletic jacket + pastel floral midi dress + sport sandals",
    maxRegisterDistance: 4, // athletic (0) to elevated (4)
    unifyingElements: {
      colorHarmony: 20,
      silhouetteBalance: 40,
      materialConsistency: 30,
      tonalConsistency: 25,
    },
    generalFashionability: 40,
    expectedIntentionalContrast: 30, // Weak unifying → PENALIZE
    expectedQuality: 28,
  },
  {
    name: "Example 6: Adjacent Registers (Naturally Coherent)",
    description: "Linen trousers + silk cami + mule sandals",
    maxRegisterDistance: 2, // smart-casual (2) to elevated (4)
    unifyingElements: {
      colorHarmony: 90,
      silhouetteBalance: 85,
      materialConsistency: 70,
      tonalConsistency: 80,
    },
    generalFashionability: 85,
    expectedIntentionalContrast: 95, // Strong unifying → BOOST
    expectedQuality: 90,
  },
];

function runTests() {
  console.log("\n🧪 Testing New Intentional Contrast Scoring System\n");
  console.log("=".repeat(80));

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\n📋 ${test.name}`);
    console.log(`   ${test.description}`);
    console.log(`   Max Register Distance: ${test.maxRegisterDistance}`);

    // Compute unifying strength
    const unifyingStrength = computeUnifyingStrength(test.unifyingElements);
    console.log(`   Unifying Strength: ${unifyingStrength}`);

    // Compute intentional contrast score
    const intentionalContrast = computeIntentionalContrastScore(
      test.maxRegisterDistance,
      unifyingStrength
    );

    // Compute quality score
    const qualityScore = computeOutfitQualityScore({
      colorHarmony: test.unifyingElements.colorHarmony,
      intentionalContrast,
      silhouetteBalance: test.unifyingElements.silhouetteBalance,
      generalFashionability: test.generalFashionability,
    });

    // Check intentional contrast
    const contrastMatches = intentionalContrast === test.expectedIntentionalContrast;
    console.log(`   Intentional Contrast: ${intentionalContrast} (expected: ${test.expectedIntentionalContrast}) ${contrastMatches ? '✅' : '❌'}`);

    // Check quality score (allow ±1 tolerance due to rounding)
    const qualityMatches = Math.abs(qualityScore - test.expectedQuality) <= 1;
    console.log(`   Quality Score: ${qualityScore} (expected: ${test.expectedQuality}) ${qualityMatches ? '✅' : '❌'}`);

    if (contrastMatches && qualityMatches) {
      console.log(`   ✅ PASS`);
      passed++;
    } else {
      console.log(`   ❌ FAIL`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`\n📊 Results: ${passed}/${testCases.length} tests passed`);

  if (failed === 0) {
    console.log("✅ All tests passed! The intentional contrast system is working correctly.\n");
  } else {
    console.log(`❌ ${failed} tests failed. Please review the scoring logic.\n`);
  }

  return failed === 0;
}

// Test getRegisterDistance function
function testRegisterDistance() {
  console.log("\n🧪 Testing Register Distance Calculation\n");
  console.log("=".repeat(80));

  const tests = [
    { a: 'athletic' as StyleRegister, b: 'elevated' as StyleRegister, expected: 4 },
    { a: 'casual' as StyleRegister, b: 'business-casual' as StyleRegister, expected: 2 },
    { a: 'smart-casual' as StyleRegister, b: 'elevated' as StyleRegister, expected: 2 },
    { a: 'casual' as StyleRegister, b: 'casual' as StyleRegister, expected: 0 },
  ];

  let passed = 0;
  for (const test of tests) {
    const distance = getRegisterDistance(test.a, test.b);
    const matches = distance === test.expected;
    console.log(`   ${test.a} → ${test.b}: ${distance} (expected: ${test.expected}) ${matches ? '✅' : '❌'}`);
    if (matches) passed++;
  }

  console.log(`\n📊 Register Distance: ${passed}/${tests.length} tests passed\n`);
  return passed === tests.length;
}

// Run all tests
if (require.main === module) {
  const distanceTestsPassed = testRegisterDistance();
  const scoringTestsPassed = runTests();

  if (distanceTestsPassed && scoringTestsPassed) {
    console.log("🎉 All pipeline tests passed! Ready for production.\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Please review the implementation.\n");
    process.exit(1);
  }
}

export { runTests, testRegisterDistance };
