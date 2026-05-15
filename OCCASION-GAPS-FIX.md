# TASK: Refactor Occasion Station to Eliminate All Gaps

## Preconditions (READ FIRST)

1. **Read these files before implementing:**
   - `lib/outfit-attributes.ts` — contains canonical `OCCASIONS` export (~56 occasions)
   - `lib/axis-types.ts` — contains `ActivityContext`, `SocialRegister`, `Season`, and (likely) `OutfitAxes` enums/types

2. **Hard constraints:**
   - Formality scale is **1.0–6.0** (not 1–7 or 1–10)
   - ONLY use occasion strings from `OCCASIONS` export — do not invent new ones
   - ONLY use `activityContext` / `socialRegister` values from type definitions (confirm exact spelling, e.g. `"casual-low-key"` vs `"casual_lowkey"`)
   - Every canonical occasion must be reachable (inverse audit requirement)

3. **`OutfitAxes` type — confirm or define:**
   ```typescript
   // If not already exported from axis-types.ts, define in occasion-catalog.ts:
   export interface OutfitAxes {
     activityContext: ActivityContext;
     socialRegister: SocialRegister;
     formality: number;        // 1.0–6.0 continuous
     season: Season[];         // outfit can span multiple seasons
   }
   ```
   Note `outfit.season` is an array; `rule.seasons` is also an array; the intersection check is `outfit.season.some(s => rule.seasons!.includes(s))`.

---

## Architecture: Three-Layer Catalog + Scoring + Cascade

Replace exact-match lookup with range-based scoring plus a guaranteed fallback cascade.

### Layer 1: Occasion Catalog (Single Source of Truth)

Create `lib/occasion-catalog.ts`:

```typescript
import type { ActivityContext, Season, SocialRegister } from './axis-types';

export interface OccasionRule {
  name: string;                          // Must match a canonical occasion exactly
  formality: [number, number];           // [min, max] inclusive (1.0–6.0 scale)
  activityContext: ActivityContext[];    // Which contexts this lives in
  socialRegister: SocialRegister[];      // Which registers
  seasons?: Season[];                    // Optional; omit = all seasons
  priority?: number;                     // 0–10, used to break ties
}

export const OCCASION_CATALOG: OccasionRule[] = [
  // === COVERS GAP: social-daytime / 1.0 / peer-social ===
  {
    name: "Coffee Date",
    formality: [1.0, 2.5],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social", "intimate"],
    priority: 9
  },
  {
    name: "Running Errands",
    formality: [1.0, 2.0],
    activityContext: ["casual-low-key"],
    socialRegister: ["intimate"],
    priority: 6
  },
  {
    name: "Farmers Market",
    formality: [1.0, 2.5],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social"],
    priority: 7
  },

  // === COVERS GAP: social-daytime / 1.8 / peer-social ===
  {
    name: "Weekend",
    formality: [1.0, 3.0],
    activityContext: ["casual-low-key", "social-daytime"],
    socialRegister: ["intimate", "peer-social"],
    priority: 8
  },
  {
    name: "Brunch",
    formality: [1.5, 3.5],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social"],
    priority: 9
  },

  // === COVERS GAP: social-evening / 3.1 / peer-social ===
  {
    name: "Casual Dinner",
    formality: [2.5, 4.0],
    activityContext: ["social-evening"],
    socialRegister: ["peer-social", "intimate"],
    priority: 9
  },
  {
    name: "Happy Hour",
    formality: [2.5, 4.0],
    activityContext: ["social-evening"],
    socialRegister: ["peer-social"],
    priority: 9
  },
  {
    name: "Date Night",
    formality: [3.5, 5.5],
    activityContext: ["social-evening"],
    socialRegister: ["intimate"],
    priority: 9
  },

  // ... CONTINUE FOR ALL 56 CANONICAL OCCASIONS
  // Each rule should be ~1.5 formality units wide (not 2.5+)
  // Multi-context rules (like "Weekend") are intentional
];
```

**CRITICAL:** Seed the catalog with ALL 56 occasions from `outfit-attributes.ts`. Do not leave any unreachable. Specific occasions to confirm are seeded:

- **Concert** — spans low to mid formality, suggest `[2.0, 4.0]`, `["social-evening"]`, `["peer-social", "public-facing"]`
- **Game Night** — confirm canonical; suggest `[1.5, 3.0]`, `["casual-low-key", "social-evening"]`, `["intimate", "peer-social"]`
- **Wedding occasions (Bridal, Bridesmaid, Wedding Guest, etc.)** — these are event-role tags rather than pure formality positions. Use best-guess bands (`[4.5, 6.0]` for most, `[5.0, 6.0]` for Bridal) and add a `// TODO: event-role dimension, Phase 2` comment.

### Add a load-time validator

At module load time, validate every rule:

```typescript
import { OCCASIONS } from './outfit-attributes';

const ALL_CANONICAL_OCCASIONS = new Set(Object.values(OCCASIONS).flat());

function validateCatalog(): void {
  for (const rule of OCCASION_CATALOG) {
    if (!ALL_CANONICAL_OCCASIONS.has(rule.name)) {
      throw new Error(`Catalog rule "${rule.name}" is not in canonical OCCASIONS`);
    }
  }
}

validateCatalog();
```

This catches typos like `"Coffee Dat"` before they cause silent unreachability.

---

### Layer 2: Scoring Function

Refactor `lib/stations/occasion-station.ts`:

```typescript
import { OCCASION_CATALOG, type OccasionRule, type OutfitAxes } from '../occasion-catalog';

const MIN_SCORE = 0.6;  // Minimum score to include an occasion; tune empirically

function scoreOccasion(outfit: OutfitAxes, rule: OccasionRule): number {
  // Hard filters — must match or score is 0
  if (!rule.activityContext.includes(outfit.activityContext)) return 0;
  if (!rule.socialRegister.includes(outfit.socialRegister)) return 0;
  if (outfit.formality < rule.formality[0] || outfit.formality > rule.formality[1]) return 0;
  if (rule.seasons && !outfit.season.some(s => rule.seasons!.includes(s))) return 0;

  // Soft score — how centered is the outfit in this rule's formality window?
  const [min, max] = rule.formality;
  const center = (min + max) / 2;
  const halfWidth = (max - min) / 2;
  const distanceFromCenter = Math.abs(outfit.formality - center);
  const centeringScore = halfWidth > 0 ? 1 - (distanceFromCenter / halfWidth) : 1;  // 0–1

  // Specificity bonus — narrower ranges are more precise
  const rangeWidth = max - min;
  const specificityBonus = Math.max(0, (2 - rangeWidth) / 2);  // narrower = better

  return centeringScore + (rule.priority ?? 5) / 10 + specificityBonus * 0.2;
}

export function getOccasionsForOutfit(axes: OutfitAxes): string[] {
  const scored = OCCASION_CATALOG
    .map(rule => ({ name: rule.name, score: scoreOccasion(axes, rule) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return getFallbackOccasions(axes);  // Layer 3
  }

  // Score floor + top-4 cap: avoid padding with weak matches
  return scored
    .filter(r => r.score >= MIN_SCORE)
    .slice(0, 4)
    .map(r => r.name);
}
```

**Why score floor instead of hard top-4:** an outfit with one strong match gets one occasion (correct); an outfit sitting on a busy intersection gets 3–4. The "1–4 occasions" goal is met without arbitrary padding.

---

### Layer 3: Fallback Cascade (Guaranteed Non-Empty)

Cascade order prioritizes preserving semantic meaning:

```typescript
function getFallbackOccasions(axes: OutfitAxes): string[] {
  // Pass A: Drop season constraint (mostly safe)
  const withoutSeason = OCCASION_CATALOG
    .filter(r => r.activityContext.includes(axes.activityContext))
    .filter(r => r.socialRegister.includes(axes.socialRegister))
    .filter(r => axes.formality >= r.formality[0] && axes.formality <= r.formality[1]);

  if (withoutSeason.length) {
    console.log(
      `[occasion-station] Season-relaxed fallback for ${axes.activityContext}/${axes.formality}/${axes.socialRegister}`
    );
    return withoutSeason.slice(0, 3).map(r => r.name);
  }

  // Pass B: Drop socialRegister constraint (LOUD WARNING — semantic change)
  const withoutRegister = OCCASION_CATALOG
    .filter(r => r.activityContext.includes(axes.activityContext))
    .filter(r => axes.formality >= r.formality[0] && axes.formality <= r.formality[1]);

  if (withoutRegister.length) {
    console.warn(
      `⚠️ [occasion-station] Register-relaxed fallback for ${axes.activityContext}/${axes.formality}/${axes.socialRegister} — review catalog coverage`
    );
    return withoutRegister.slice(0, 2).map(r => r.name);
  }

  // Pass C: GENERIC_FLOOR — last resort; logs as error (means catalog incomplete)
  console.error(
    `❌ [occasion-station] GENERIC_FLOOR fallback for ${axes.activityContext}/${axes.formality}/${axes.socialRegister} — catalog incomplete`
  );
  return [GENERIC_FLOOR[axes.activityContext][formalityBucket(axes.formality)]];
}

function formalityBucket(f: number): 'low' | 'mid' | 'high' {
  if (f < 2.5) return 'low';
  if (f < 4.0) return 'mid';   // boundary chosen to match catalog density
  return 'high';
}

// IMPORTANT: All values must be canonical occasions from outfit-attributes.ts
// AND should also appear as rules in the catalog (to avoid naming drift).
const GENERIC_FLOOR: Record<ActivityContext, Record<'low' | 'mid' | 'high', string>> = {
  "casual-low-key":  { low: "Relaxing at Home", mid: "Weekend",              high: "Entertaining at Home" },
  "social-daytime":  { low: "Running Errands",  mid: "Coffee Date",          high: "Lunch with Friends" },
  "social-evening":  { low: "Casual Dinner",    mid: "Night Out",            high: "Cocktail Party" },
  "professional":    { low: "Work from Home",   mid: "Working in the Office", high: "Business Trip" },
  "event":           { low: "Holiday Party",    mid: "Cocktail Party",       high: "Black Tie / Gala" },
  "active":          { low: "Workout",          mid: "Yoga",                 high: "Golf" }
};

// Validate GENERIC_FLOOR at module load
function validateGenericFloor(): void {
  for (const [ctx, buckets] of Object.entries(GENERIC_FLOOR)) {
    for (const [bucket, name] of Object.entries(buckets)) {
      if (!ALL_CANONICAL_OCCASIONS.has(name)) {
        throw new Error(`GENERIC_FLOOR[${ctx}][${bucket}] = "${name}" is not a canonical occasion`);
      }
    }
  }
}

validateGenericFloor();
```

**Key design choices:**
1. Season drops first (usually safe — "Brunch" works year-round)
2. Register drops second with **loud warning** (semantically significant)
3. GENERIC_FLOOR is last resort and logs as **error** (means catalog incomplete)
4. All floor values are themselves canonical occasions AND should ideally also exist as catalog rules — eliminates string drift

---

## Audit Scripts (Both Directions)

Create `scripts/audit-occasion-gaps.ts`:

```typescript
import { getOccasionsForOutfit } from '../lib/stations/occasion-station';
import { OCCASIONS } from '../lib/outfit-attributes';
import type { ActivityContext, Season, SocialRegister } from '../lib/axis-types';

const formalitySteps = Array.from({ length: 51 }, (_, i) => 1 + i * 0.1);  // 1.0 → 6.0
const contexts: ActivityContext[] = [
  "casual-low-key", "social-daytime", "social-evening",
  "professional", "event", "active"
];
const registers: SocialRegister[] = [
  "intimate", "peer-social", "evaluative", "public-facing", "celebratory"
];
const seasons: Season[] = ["spring", "summer", "fall", "winter"];

// ---------- FORWARD AUDIT: every axis combination returns non-empty ----------
let gapCount = 0;
const MAX_GAP_LOGS = 10;

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
            console.error(`GAP: ${ctx} / ${reg} / ${f.toFixed(1)} / ${season}`);
          } else if (gapCount === MAX_GAP_LOGS) {
            console.error(`... (further gaps suppressed)`);
          }
          gapCount++;
        }
      }
    }
  }
}

if (gapCount > 0) {
  throw new Error(`Found ${gapCount} occasion gaps`);
}

// ---------- INVERSE AUDIT: every canonical occasion is reachable ----------
// Sweep all seasons so season-gated rules are not falsely marked unreachable.
const allOccasions = Object.values(OCCASIONS).flat();
const reachable = new Set<string>();

for (const season of seasons) {
  for (const ctx of contexts) {
    for (const reg of registers) {
      for (const f of formalitySteps) {
        getOccasionsForOutfit({ activityContext: ctx, socialRegister: reg, formality: f, season: [season] })
          .forEach(o => reachable.add(o));
      }
    }
  }
}

const unreachable = allOccasions.filter(o => !reachable.has(o));
if (unreachable.length) {
  throw new Error(`Unreachable occasions (not in catalog): ${unreachable.join(", ")}`);
}

console.log('✅ All audits passed: zero gaps, all occasions reachable');
```

**Notes on the audit fixes:**
- Sweeps **all seasons**, not just spring — season-gated rules (Holiday Party, Beach Vacation) would otherwise be falsely flagged unreachable.
- Caps console output to 10 gaps to keep failure logs readable.

Run as a unit test or CI check.

---

## Design Rationale

1. **Range widths default to ~1.5 units, not 2.5+** — prevents dilution of top-N selection
2. **Specificity bonus** — narrower ranges score higher (more precise)
3. **Score floor (`MIN_SCORE = 0.6`)** — avoids padding with weak matches; outfits with one strong fit get one occasion, busy intersections get 3–4
4. **Fallback loudness** — register-drop logs as warning, floor logs as error
5. **Multi-context rules are intentional** (e.g., "Weekend" spans casual-low-key + social-daytime)
6. **Load-time validators** — catalog and floor names are checked against canonical `OCCASIONS` at startup, catching typos immediately

---

## Testing Requirements

### Unit tests for the 3 known gaps:

| Axes | Expected occasions (subset) |
|---|---|
| `social-evening / 3.1 / peer-social` | "Casual Dinner", "Happy Hour" |
| `social-daytime / 1.0 / peer-social` | "Coffee Date", "Farmers Market" |
| `social-daytime / 1.8 / peer-social` | "Coffee Date", "Weekend", "Brunch" |

### Regression test:
Run `scripts/audit-occasion-gaps.ts` and assert zero failures.

### Post-implementation validation (run before declaring done):

1. `npm run audit-occasions` → expect `✅ All audits passed`
2. Re-tag a 100-outfit sample from the existing dataset
3. Diff occasions before vs. after for the same outfits
4. Verify NO outfit gets occasions that contradict its register (e.g., `intimate` outfit getting "Cocktail Party")
5. Manually review any outfits where occasions changed dramatically — these are potential catalog regressions

This catches the case where the refactor "works" by the audit but assigns semantically *worse* occasions than the old system did to outfits that previously had tags.

---

## Deliverables

1. **`lib/occasion-catalog.ts`** (new) — complete 56-occasion seed + load-time validator
2. **`lib/stations/occasion-station.ts`** (refactored) — scoring + fallback logic + GENERIC_FLOOR validator
3. **`scripts/audit-occasion-gaps.ts`** (new) — forward and inverse audits, all seasons swept
4. **Unit tests** for the 3 known gaps
5. **Remove** the `"⚠ Occasion gap logged"` warning path — replaced by the fallback cascade

---

## Out of Scope (Future Cleanup)

**Noted circularity:** `outfit.scoreBreakdown.occasionAlignment` (0–100) is used as a formality base in the Axis Station, then adjusted by garment signals. This is OK for now but should eventually be replaced with pure garment-marker-based formality computation. Add a `// TODO: remove occasion-score circularity in formality computation` comment in `axis-resolver.ts`.

**Wedding event-role dimension:** Bridal / Bridesmaid / etc. are event roles, not pure formality positions. Phase 2 work: add a `role` dimension to `OccasionRule` so the same dress can be tagged Bridesmaid at formality 3.5 (garden wedding) or 5.5 (black-tie wedding).

---

## Final Check Before Implementation

- [ ] `OutfitAxes` type is imported or defined explicitly
- [ ] All catalog `name` fields match `OCCASIONS` export exactly (validator enforces)
- [ ] All `GENERIC_FLOOR` values are canonical occasions (validator enforces)
- [ ] All `GENERIC_FLOOR` values also appear as catalog rules (no naming drift)
- [ ] Range widths are mostly 1.5–2.0 (not 2.5+)
- [ ] Multi-context rules are intentional and documented
- [ ] Audit script sweeps all 4 seasons, not just spring
- [ ] Audit script caps console output to 10 gaps
- [ ] `formalityBucket` boundaries (`2.5`, `4.0`) match catalog density
- [ ] `MIN_SCORE` floor is set (default 0.6, tune empirically)
- [ ] Concert, Game Night, and Wedding-category occasions are explicitly seeded
- [ ] `axis-types.ts` enum spelling confirmed (no typos like `casual_lowkey` vs `casual-low-key`)
