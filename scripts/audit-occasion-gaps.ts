/**
 * Occasion Gaps Audit Script
 *
 * Two-way audit:
 * 1. Forward: Every axis combination returns non-empty occasions
 * 2. Inverse: Every canonical occasion is reachable via some axis combination
 * 3. Statistics: Track fallback usage (not a failure, just informational)
 *
 * Run: tsx scripts/audit-occasion-gaps.ts
 */

import { getOccasionsForOutfit } from '../lib/stations/occasion-station';
import { OCCASIONS } from '../lib/outfit-attributes';
import type { ActivityContext, Season, SocialRegister } from '../lib/axis-types';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const formalitySteps = Array.from({ length: 51 }, (_, i) => 1 + i * 0.1);  // 1.0 → 6.0
const contexts: ActivityContext[] = [
  "casual-low-key", "social-daytime", "social-evening",
  "professional", "event", "active"
];
const registers: SocialRegister[] = [
  "intimate", "peer-social", "evaluative", "public-facing", "celebratory"
];
const seasons: Season[] = ["spring", "summer", "fall", "winter"];

// Suppress console logs during audit
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

let fallbackStats = {
  seasonRelaxed: 0,
  registerRelaxed: 0,
  genericFloor: 0
};

// Intercept logs to count fallback usage
console.log = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('Season-relaxed fallback')) fallbackStats.seasonRelaxed++;
};
console.warn = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('Register-relaxed fallback')) fallbackStats.registerRelaxed++;
};
console.error = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('GENERIC_FLOOR fallback')) fallbackStats.genericFloor++;
};

// ============================================================================
// FORWARD AUDIT: Every axis combination returns non-empty
// ============================================================================

originalLog('🔍 Running forward audit: checking for gaps...\n');

let gapCount = 0;
const MAX_GAP_LOGS = 10;
const gapExamples: string[] = [];

for (const season of seasons) {
  for (const ctx of contexts) {
    for (const reg of registers) {
      for (const f of formalitySteps) {
        const result = getOccasionsForOutfit({
          activityContext: ctx,
          socialRegister: reg,
          formality: f,
          season: [season]
        });
        if (result.length === 0) {
          if (gapCount < MAX_GAP_LOGS) {
            gapExamples.push(`${ctx} / ${reg} / ${f.toFixed(1)} / ${season}`);
          }
          gapCount++;
        }
      }
    }
  }
}

// Restore console
console.log = originalLog;
console.warn = originalWarn;
console.error = originalError;

if (gapCount > 0) {
  console.error(`❌ FORWARD AUDIT FAILED: Found ${gapCount} empty results (should be ZERO)\n`);
  console.error('Examples:');
  gapExamples.forEach(ex => console.error(`   - ${ex}`));
  console.error('');
  process.exit(1);
}

console.log('✅ Forward audit passed: zero gaps (all combinations return non-empty)\n');

// ============================================================================
// INVERSE AUDIT: Every canonical occasion is reachable
// ============================================================================

console.log('🔍 Running inverse audit: checking all occasions are reachable...\n');

// Suppress logs during inverse audit too
console.log = (...args) => { const msg = args.join(' '); if (msg.includes('Season-relaxed fallback')) fallbackStats.seasonRelaxed++; };
console.warn = (...args) => { const msg = args.join(' '); if (msg.includes('Register-relaxed fallback')) fallbackStats.registerRelaxed++; };
console.error = (...args) => { const msg = args.join(' '); if (msg.includes('GENERIC_FLOOR fallback')) fallbackStats.genericFloor++; };

// Sweep all seasons so season-gated rules are not falsely marked unreachable
const allOccasions = Object.values(OCCASIONS).flat();
const reachable = new Set<string>();

for (const season of seasons) {
  for (const ctx of contexts) {
    for (const reg of registers) {
      for (const f of formalitySteps) {
        getOccasionsForOutfit({
          activityContext: ctx,
          socialRegister: reg,
          formality: f,
          season: [season]
        }).forEach(o => reachable.add(o));
      }
    }
  }
}

// Also test with wedding event roles (these occasions require roles to be reachable)
const weddingRoles = [
  'wedding-guest', 'bridal', 'bridesmaid', 'bride',
  'mother-of-bride', 'mother-of-groom'
];

for (const role of weddingRoles) {
  for (const season of seasons) {
    for (const f of formalitySteps) {
      getOccasionsForOutfit({
        activityContext: 'event',
        socialRegister: 'celebratory',
        formality: f,
        season: [season],
        eventRole: role
      }).forEach(o => reachable.add(o));
    }
  }
}

// Restore console again
console.log = originalLog;
console.warn = originalWarn;
console.error = originalError;

const unreachable = allOccasions.filter(o => !reachable.has(o));
if (unreachable.length) {
  console.error(`❌ INVERSE AUDIT FAILED: Unreachable occasions (not in catalog):\n`);
  unreachable.forEach(o => console.error(`   - ${o}`));
  console.error('');
  process.exit(1);
}

console.log('✅ Inverse audit passed: all occasions reachable\n');

// ============================================================================
// FALLBACK STATISTICS
// ============================================================================

const totalCombinations = seasons.length * contexts.length * registers.length * formalitySteps.length;
const mainCatalogHits = totalCombinations - fallbackStats.seasonRelaxed - fallbackStats.registerRelaxed - fallbackStats.genericFloor;

console.log('📊 Fallback Usage Statistics:\n');
console.log(`   Main catalog hits:      ${mainCatalogHits.toLocaleString()} (${(mainCatalogHits / totalCombinations * 100).toFixed(1)}%)`);
console.log(`   Season-relaxed:         ${fallbackStats.seasonRelaxed.toLocaleString()} (${(fallbackStats.seasonRelaxed / totalCombinations * 100).toFixed(1)}%)`);
console.log(`   Register-relaxed:       ${fallbackStats.registerRelaxed.toLocaleString()} (${(fallbackStats.registerRelaxed / totalCombinations * 100).toFixed(1)}%)`);
console.log(`   Generic floor:          ${fallbackStats.genericFloor.toLocaleString()} (${(fallbackStats.genericFloor / totalCombinations * 100).toFixed(1)}%)`);
console.log('');

if (fallbackStats.genericFloor > totalCombinations * 0.01) {
  console.warn(`⚠️  Generic floor usage is high (${(fallbackStats.genericFloor / totalCombinations * 100).toFixed(1)}%) - consider expanding catalog`);
  console.log('');
}

// ============================================================================
// SUCCESS
// ============================================================================

console.log('✅ All audits passed: zero gaps, all occasions reachable');
console.log(`   Total occasions: ${allOccasions.length}`);
console.log(`   Reachable: ${reachable.size}`);
console.log(`   Test coverage: ${totalCombinations.toLocaleString()} axis combinations`);
