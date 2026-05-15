/**
 * Unit test for the 3 known gaps from the original bug report
 *
 * These were the specific axis combinations that triggered the occasion gaps issue.
 */

import { getOccasionsForOutfit } from '../lib/stations/occasion-station';

console.log('🧪 Testing 3 known gaps from bug report...\n');

// Test 1: social-evening / 3.1 / peer-social
const test1 = getOccasionsForOutfit({
  activityContext: 'social-evening',
  socialRegister: 'peer-social',
  formality: 3.1,
  season: ['spring']
});

console.log('Test 1: social-evening / 3.1 / peer-social');
console.log(`  Result: [${test1.join(', ')}]`);
console.log(`  Expected: Should include "Casual Dinner", "Happy Hour"`);
console.log(`  ✅ PASS: ${test1.includes('Casual Dinner') && test1.includes('Happy Hour') ? 'YES' : 'NO'}\n`);

// Test 2: social-daytime / 1.0 / peer-social
const test2 = getOccasionsForOutfit({
  activityContext: 'social-daytime',
  socialRegister: 'peer-social',
  formality: 1.0,
  season: ['spring']
});

console.log('Test 2: social-daytime / 1.0 / peer-social');
console.log(`  Result: [${test2.join(', ')}]`);
console.log(`  Expected: Should include "Coffee Date", "Farmers Market"`);
console.log(`  ✅ PASS: ${test2.includes('Coffee Date') && test2.includes('Farmers Market') ? 'YES' : 'NO'}\n`);

// Test 3: social-daytime / 1.8 / peer-social
const test3 = getOccasionsForOutfit({
  activityContext: 'social-daytime',
  socialRegister: 'peer-social',
  formality: 1.8,
  season: ['spring']
});

console.log('Test 3: social-daytime / 1.8 / peer-social');
console.log(`  Result: [${test3.join(', ')}]`);
console.log(`  Expected: Should include "Coffee Date" and "Weekend" (Brunch at 1.5-3.5 may not be top-4)`);
console.log(`  ✅ PASS: ${test3.includes('Coffee Date') && test3.includes('Weekend') ? 'YES' : 'NO'}\n`);

// Summary
const allPass =
  test1.includes('Casual Dinner') && test1.includes('Happy Hour') &&
  test2.includes('Coffee Date') && test2.includes('Farmers Market') &&
  test3.includes('Coffee Date') && test3.includes('Weekend');

if (allPass) {
  console.log('✅ All 3 known gaps fixed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
