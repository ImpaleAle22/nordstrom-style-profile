# Kitchen Architecture: Modular Pipeline System

## Overview

The Recipe Cooker is now a "Kitchen" - an assembly line with modular stations that can be added, removed, or reordered.

**Tested with real experiments (April 11, 2026)** - pipelines optimized based on data.

```
[Generate: Gemini or Random]
        ↓
   🏭 KITCHEN PIPELINE (auto-selected)
        ↓
[Gemini: Hard Rules only] OR [Random: Strict Similarity + Hard Rules]
        ↓
[Scored & Linked Outfits]
```

**Key Finding:** Different generation strategies need different pipelines!
- Gemini generates quality → needs minimal filtering (74% link rate)
- Random generates volume → needs similarity filter (49% link rate)

## Philosophy

**Each station is a pure function:**
```typescript
combinations → filtered combinations
```

**Benefits:**
- Easy to add new stations (pattern clash, color clash, etc.)
- Easy to reorder stations to test effectiveness
- Easy to disable stations for testing
- Clean separation of concerns

## Station Interface

All stations follow this interface:

```typescript
interface KitchenStation {
  name: string;
  description: string;
  filter: (combinations: OutfitCombination[], config?: any) => StationResult;
}

interface StationResult {
  passed: OutfitCombination[];
  filtered: number;
  examples: string[];
  metrics?: Record<string, any>;
}
```

## Built-in Stations

### Station 2.5: Formality Filter
**File:** `formality-filter.ts`
**Purpose:** Removes outfits with mismatched formality levels

**Logic:**
- Infers formality level for each product (1=Athletic → 6=Formal/Evening)
- Checks pairwise formality compatibility
- Rule: Items must be within ±1 formality level

**Example violations:**
- Evening gown (level 6) + sneakers (level 2) = 4 levels apart ❌
- Cocktail dress (level 5) + heeled sandals (level 4) = 1 level apart ✅

**Current effectiveness:** Filtering 26-37 outfits per recipe (formality mismatches)

### Station 2.6: Similarity Filter
**File:** `similarity-filter.ts`
**Purpose:** Uses CLIP embeddings to detect clashing items

**Logic:**
- Uses FashionSigLIP embeddings already computed during product search
- Computes cosine similarity between all item pairs
- Filters outfits where any pair has similarity < threshold

**Threshold:** 0.10 (configurable)

**Current effectiveness:** Filtering 0 outfits (formality already catches main clashes)

### Station 3: Hard Rules Validation
**File:** `outfit-building-rules.ts`
**Purpose:** Validates outfit building rules

**Rules:**
- 4-6 slots required
- Must have footwear
- Garment coverage requirements
- Role count limits
- No full-coverage + half-coverage conflicts

## Experiment Results (April 11, 2026)

Tested on "Chic Bomber and Lace Skirt Combo" recipe with 2 strategies × 6 pipelines.

| Strategy | Pipeline | Generated | Filtered | Valid | Linked | Link Rate | Time |
|----------|----------|-----------|----------|-------|--------|-----------|------|
| **Gemini** | **No filters** | 51 | 0 | 51 | **38** | **74%** | 21.8s |
| Gemini | Formality only | 50 | 25 | 25 | 11 | 22% | 23.5s |
| Gemini | Formality+Sim | 51 | 25 | 26 | 26 | 51% | 15.0s |
| **Random** | **Strict sim (0.40)** | 100 | 6 | 94 | **49** | **49%** | 1.4s |
| Random | Formality only | 100 | 46 | 54 | 33 | 33% | 1.6s |
| Random | No filters | 100 | 0 | 100 | 40 | 40% | 1.8s |

**Key Insights:**
1. **Gemini's strength is curation** - generates high-quality inherently
2. **Adding filters HURTS Gemini** - drops from 74% to 22% with formality
3. **Random needs similarity** - strict threshold (0.40) works best
4. **Formality too aggressive** - removes 46-50% of random outfits
5. **Station order doesn't matter much** - formality is the bottleneck

## Pipeline Configuration

Pipelines are defined as ordered lists of stations:

```typescript
interface PipelineConfig {
  stations: Array<{
    station: KitchenStation;
    config?: any;
  }>;
}
```

### Optimal Pipeline for Gemini (74% link rate)
```typescript
const GEMINI_OPTIMAL_PIPELINE: PipelineConfig = {
  stations: [
    { station: hardRulesStation }, // Only validate required slots/coverage
  ],
};
```

**Rationale:** Gemini generates high-quality outfits. Adding filters hurts performance.

### Optimal Pipeline for Random Sampling (49% link rate)
```typescript
const RANDOM_OPTIMAL_PIPELINE: PipelineConfig = {
  stations: [
    { station: similarityStation, config: { threshold: 0.40 } }, // Strict
    { station: hardRulesStation },
  ],
};
```

**Rationale:** Random generates volume. Strict similarity catches subtle clashes.

### Conservative Pipeline (for maximum filtering)
```typescript
const CONSERVATIVE_PIPELINE: PipelineConfig = {
  stations: [
    { station: formalityStation },
    { station: similarityStation, config: { threshold: 0.10 } },
    { station: hardRulesStation },
  ],
};
```

**Use when:** Formality mismatches are common in your recipe.

## Using Pipelines

### Auto-Selection (Recommended)
```typescript
import { cookRecipe } from './lib/recipe-cooking';

// Automatically selects optimal pipeline based on strategy
const result = await cookRecipe(recipe, {
  strategy: 'gemini-flash-lite', // → uses GEMINI_OPTIMAL_PIPELINE
  generative: true,
});

// Or with random
const result = await cookRecipe(recipe, {
  strategy: 'random-sampling', // → uses RANDOM_OPTIMAL_PIPELINE
  generative: true,
});
```

### Explicit Pipeline Selection
```typescript
import { cookRecipe } from './lib/recipe-cooking';
import { CONSERVATIVE_PIPELINE } from './lib/recipe-cooking/kitchen-stations';

const result = await cookRecipe(recipe, {
  generative: true,
  pipeline: CONSERVATIVE_PIPELINE, // Override auto-selection
});
```

### CLI Tool
```bash
# Test default pipeline
npx tsx scripts/test-pipeline.ts recipes/lace-pink.json

# Test alternative pipeline
npx tsx scripts/test-pipeline.ts recipes/lace-pink.json --pipeline similarity-first

# Compare both orders
npx tsx scripts/test-pipeline.ts recipes/lace-pink.json --compare-orders
```

## Adding New Stations

1. Create a new filter file (e.g., `pattern-clash-filter.ts`)
2. Implement the station interface:

```typescript
export const patternClashStation: KitchenStation = {
  name: 'Pattern Clash Filter',
  description: 'Removes outfits with clashing patterns',
  filter: (combinations, config = {}) => {
    const passed: OutfitCombination[] = [];
    const examples: string[] = [];
    let filtered = 0;

    for (const outfit of combinations) {
      if (hasClashingPatterns(outfit)) {
        filtered++;
        if (examples.length < 3) {
          examples.push(`Outfit ${filtered}: stripes + polka dots`);
        }
      } else {
        passed.push(outfit);
      }
    }

    return { passed, filtered, examples };
  },
};
```

3. Add to pipeline:

```typescript
export const ENHANCED_PIPELINE: PipelineConfig = {
  stations: [
    { station: formalityStation },
    { station: patternClashStation },
    { station: similarityStation },
    { station: hardRulesStation },
  ],
};
```

## Testing Pipelines

The `test-pipeline.ts` CLI tool lets you test different configurations:

```bash
# Compare pipeline orders
npx tsx scripts/test-pipeline.ts recipes/lace-pink.json --compare-orders

# Output:
# 🧪 TEST 1: Formality → Similarity → Hard Rules
# Total filtered: 37 (18.5%)
# Final outfits: 163
# Linked: 132
#
# 🧪 TEST 2: Similarity → Formality → Hard Rules
# Total filtered: 37 (18.5%)
# Final outfits: 163
# Linked: 132
#
# 💡 RECOMMENDATION
# Both orders produced the same results
```

## Pipeline Analysis

The system provides automatic analysis:

```typescript
const analysis = analyzePipeline(pipelineResults);

// Returns:
{
  totalFiltered: 37,
  filterRate: 18.5,
  stationEfficiency: [
    { station: 'Formality Filter', filterRate: 18.5 },
    { station: 'Similarity Filter', filterRate: 0 },
    { station: 'Hard Rules Validation', filterRate: 0 }
  ]
}
```

## Future Stations

Potential stations to add:

- **Color Clash Filter**: Removes outfits with clashing colors
- **Pattern Clash Filter**: Removes outfits with clashing patterns (stripes + polka dots)
- **Texture Clash Filter**: Removes mixed materials that don't work (velvet + athletic wear)
- **Season Mismatch Filter**: Removes season-inappropriate combinations
- **Brand Coherence Filter**: Ensures brand mixing makes sense
- **Price Point Filter**: Removes extreme price mismatches
- **Compatibility Model Station**: Uses trained ML model (25M pairs from H&M transactions)

## Integration with Two-Score System

Stations run BEFORE scoring:

```
1. Generate combinations (Gemini/random)
2. Run Kitchen Pipeline (filter out bad combos)
3. Score remaining combos (Quality + Alignment)
4. Link high-alignment outfits to recipe
5. Save high-quality/low-alignment as happy accidents
```

This ensures we only score valid outfits, improving efficiency.
