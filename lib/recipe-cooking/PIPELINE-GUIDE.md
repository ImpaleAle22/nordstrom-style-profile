# Pipeline Selection Guide

**Last Updated:** April 11, 2026
**Based on:** Empirical experiments with 2 strategies × 6 pipelines

## Quick Reference

| What You Want | Use This | Link Rate | Speed | Cost |
|---------------|----------|-----------|-------|------|
| **Best quality** | Gemini + auto | 74% | 22s | $0.02 |
| **Best free** | Random + auto | 49% | 1.4s | $0 |
| **Maximum volume** | Random 200 + formality | 30% | 1.5s | $0 |
| **Custom filtering** | Explicit pipeline | varies | varies | varies |

## Auto-Selection (Recommended)

The cooker automatically selects the optimal pipeline based on your strategy:

```typescript
// Gemini → GEMINI_OPTIMAL_PIPELINE (hard rules only)
await cookRecipe(recipe, {
  strategy: 'gemini-flash-lite',
  targetCount: 50,
});
// Result: 74% link rate, ~38 linked outfits

// Random → RANDOM_OPTIMAL_PIPELINE (strict similarity 0.40 + hard rules)
await cookRecipe(recipe, {
  strategy: 'random-sampling',
  targetCount: 100,
});
// Result: 49% link rate, ~49 linked outfits
```

## Why Different Pipelines?

### Gemini Generates Quality
- **Curates combinations** while generating
- Already thinks about compatibility
- **Adding filters HURTS** (drops from 74% → 22% with formality)
- Only needs hard rules validation

### Random Generates Volume
- **Fast but unfiltered** - generates all possibilities
- Needs similarity filter to catch subtle clashes
- Strict threshold (0.40) works best
- Formality too aggressive (removes 50%)

## Manual Pipeline Override

```typescript
import {
  GEMINI_OPTIMAL_PIPELINE,
  RANDOM_OPTIMAL_PIPELINE,
  CONSERVATIVE_PIPELINE
} from './kitchen-stations';

// Force a specific pipeline
await cookRecipe(recipe, {
  strategy: 'random-sampling',
  pipeline: CONSERVATIVE_PIPELINE, // Max filtering
});
```

## Custom Pipeline

```typescript
import {
  formalityStation,
  similarityStation,
  hardRulesStation
} from './kitchen-stations';

const MY_PIPELINE = {
  stations: [
    { station: similarityStation, config: { threshold: 0.30 } },
    { station: hardRulesStation },
  ],
};

await cookRecipe(recipe, {
  strategy: 'random-sampling',
  pipeline: MY_PIPELINE,
});
```

## Experiment Data

**Recipe:** "Chic Bomber and Lace Skirt Combo" (5 ingredients, Womenswear)

| Strategy | Pipeline | Generated | Filtered | Valid | Linked | Rate | Time |
|----------|----------|-----------|----------|-------|--------|------|------|
| Gemini | No filters | 51 | 0 | 51 | 38 | 74% | 21.8s |
| Gemini | Formality | 50 | 25 | 25 | 11 | 22% | 23.5s |
| Random | Strict sim (0.40) | 100 | 6 | 94 | 49 | 49% | 1.4s |
| Random | Formality | 100 | 46 | 54 | 33 | 33% | 1.6s |
| Random | No filters | 100 | 0 | 100 | 40 | 40% | 1.8s |

## Station Descriptions

**Formality Filter (Station 2.5)**
- Catches obvious disasters (evening gown + sneakers)
- Uses 6-level formality hierarchy
- Rule: items within ±1 level
- **Best for:** Mixed-formality recipes
- **Avoid with:** Gemini (too aggressive)

**Similarity Filter (Station 2.6)**
- Uses FashionSigLIP embeddings (768-dim vectors)
- Detects subtle style clashes
- Threshold 0.10 = safety net, 0.40 = strict
- **Best for:** Random generation
- **Works with:** Any strategy

**Hard Rules Validation (Station 3)**
- Required slots (4-6)
- Footwear required
- Garment coverage rules
- **Always include** this station

## Tuning Thresholds

**Similarity threshold guide:**
- **0.10** - Catches catastrophic clashes (evening gown + athletic wear)
- **0.40** - Catches subtle mismatches (recommended for random)
- **0.60** - Very strict, may filter too much

**General rule:** Lower threshold = more permissive, higher = more strict

## Cost Analysis

**Gemini (50 outfits, 74% link rate)**
- API calls: 1 generation call (~$0.02)
- Time: ~22 seconds
- Cost per linked outfit: $0.0005

**Random (100 outfits, 49% link rate)**
- API calls: 0 (uses CLIP API which is local)
- Time: ~1.4 seconds
- Cost per linked outfit: $0

**Conclusion:** Random is free and fast. Gemini is worth it for quality.
