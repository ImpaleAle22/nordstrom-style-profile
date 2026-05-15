/**
 * Test Wedding Event-Role Dimension
 *
 * Verifies that wedding occasions with role tags span appropriate
 * formality ranges (garden wedding through black-tie).
 *
 * Run: npx tsx scripts/test-wedding-roles.ts
 */

import { getOccasionsForOutfit } from '../lib/stations/occasion-station';

console.log('🧪 Testing Wedding Event-Role Dimension...\n');

// ============================================================================
// TEST 1: Bridesmaid - Garden Wedding (low formality)
// ============================================================================

const test1 = getOccasionsForOutfit({
  activityContext: 'event',
  socialRegister: 'celebratory',
  formality: 3.5,
  season: ['spring'],
  eventRole: 'bridesmaid'
});

console.log('Test 1: Bridesmaid at Garden Wedding (formality 3.5)');
console.log(`  Result: [${test1.join(', ')}]`);
console.log(`  Expected: "Bridesmaid" should be #1`);
console.log(`  ✅ PASS: ${test1[0] === 'Bridesmaid' ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 2: Bridesmaid - Black Tie Wedding (high formality)
// ============================================================================

const test2 = getOccasionsForOutfit({
  activityContext: 'event',
  socialRegister: 'celebratory',
  formality: 5.5,
  season: ['spring'],
  eventRole: 'bridesmaid'
});

console.log('Test 2: Bridesmaid at Black-Tie Wedding (formality 5.5)');
console.log(`  Result: [${test2.join(', ')}]`);
console.log(`  Expected: "Bridesmaid" should be #1`);
console.log(`  ✅ PASS: ${test2[0] === 'Bridesmaid' ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 3: Wedding Guest (formality 4.5)
// ============================================================================

const test3 = getOccasionsForOutfit({
  activityContext: 'event',
  socialRegister: 'celebratory',
  formality: 4.5,
  season: ['summer'],
  eventRole: 'wedding-guest'
});

console.log('Test 3: Wedding Guest (formality 4.5)');
console.log(`  Result: [${test3.join(', ')}]`);
console.log(`  Expected: "Wedding Guest" should be #1`);
console.log(`  ✅ PASS: ${test3[0] === 'Wedding Guest' ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 4: Mother of the Bride (formality 5.0)
// ============================================================================

const test4 = getOccasionsForOutfit({
  activityContext: 'event',
  socialRegister: 'celebratory',
  formality: 5.0,
  season: ['summer'],
  eventRole: 'mother-of-bride'
});

console.log('Test 4: Mother of the Bride (formality 5.0)');
console.log(`  Result: [${test4.join(', ')}]`);
console.log(`  Expected: "Mother of the Bride" should be #1`);
console.log(`  ✅ PASS: ${test4[0] === 'Mother of the Bride' ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 5: Bridal (formality 5.5)
// ============================================================================

const test5 = getOccasionsForOutfit({
  activityContext: 'event',
  socialRegister: 'celebratory',
  formality: 5.5,
  season: ['summer'],
  eventRole: 'bridal'
});

console.log('Test 5: Bridal (formality 5.5)');
console.log(`  Result: [${test5.join(', ')}]`);
console.log(`  Expected: "Bridal" or "Getting Married" should be #1`);
console.log(`  ✅ PASS: ${test5[0] === 'Bridal' || test5[0] === 'Getting Married' ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 6: Formal event WITHOUT role (fallback to formality)
// ============================================================================

const test6 = getOccasionsForOutfit({
  activityContext: 'event',
  socialRegister: 'celebratory',
  formality: 5.5,
  season: ['summer']
  // No eventRole - should match based on formality
});

console.log('Test 6: Formal Event without Role (formality 5.5)');
console.log(`  Result: [${test6.join(', ')}]`);
console.log(`  Expected: High-formality occasions like "Black Tie / Gala", "Formal"`);
console.log(`  ✅ PASS: ${test6.some(o => ['Black Tie / Gala', 'Formal', 'Cocktail Party'].includes(o)) ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 7: Role prevents false matches at wrong formality
// ============================================================================

const test7 = getOccasionsForOutfit({
  activityContext: 'event',
  socialRegister: 'celebratory',
  formality: 3.5,
  season: ['summer']
  // No role - at this formality, should NOT get wedding occasions
});

console.log('Test 7: Event at 3.5 without Role (should avoid wedding-specific)');
console.log(`  Result: [${test7.join(', ')}]`);
console.log(`  Expected: General events like "Graduation Party", "Wine Tasting", not wedding-specific`);
console.log(`  ✅ PASS: ${!test7.includes('Bridesmaid') && !test7.includes('Wedding Guest') ? 'YES' : 'NO'}\n`);

// ============================================================================
// SUMMARY
// ============================================================================

const allPass =
  test1[0] === 'Bridesmaid' &&
  test2[0] === 'Bridesmaid' &&
  test3[0] === 'Wedding Guest' &&
  test4[0] === 'Mother of the Bride' &&
  (test5[0] === 'Bridal' || test5[0] === 'Getting Married') &&
  test6.some(o => ['Black Tie / Gala', 'Formal', 'Cocktail Party'].includes(o)) &&
  !test7.includes('Bridesmaid') && !test7.includes('Wedding Guest');

if (allPass) {
  console.log('========================================');
  console.log('✅ All wedding role tests passed!');
  console.log('========================================');
  console.log('');
  console.log('Wedding occasions now support:');
  console.log('  ✓ Wide formality ranges (3.5-6.0)');
  console.log('  ✓ Role-based specificity (bridesmaid, guest, etc.)');
  console.log('  ✓ Appropriate fallback when role not detected');
  console.log('');
  process.exit(0);
} else {
  console.log('========================================');
  console.log('❌ Some tests failed');
  console.log('========================================');
  process.exit(1);
}
