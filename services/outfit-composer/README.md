# Outfit Composer Service

AI-powered outfit composition engine for Sparked Edit Engine. Generates personalized outfit combinations from recipe templates with confidence scoring.

## Architecture

The Outfit Composer takes recipe templates (which define ingredient sets for each slot) and generates actual outfit combinations using:

1. **Claude API** - Intelligently selects product combinations
2. **Hard Rule Validation** - Ensures outfits meet structural requirements
3. **Soft Rule Scoring** - Evaluates style, color, silhouette, occasion, and season fit
4. **Confidence Thresholds** - Filters outfits by quality score

## Installation

```bash
cd services/outfit-composer
npm install
```

## Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Required environment variables:

```bash
# Anthropic API Key (required)
ANTHROPIC_API_KEY=your_api_key_here

# Sanity Configuration (required)
SANITY_PROJECT_ID=qqgs5pib
SANITY_DATASET=production
SANITY_TOKEN=your_sanity_token_here

# Optional Configuration
OUTFIT_CONFIDENCE_THRESHOLD=75
OUTFIT_MAX_COMBINATIONS=50
CLAUDE_MODEL=claude-sonnet-4-6-20250929
```

## Usage

### CLI

```bash
# Compose outfits from a recipe
npm run compose:recipe -- --recipe hiking_womens_spring_outfit_01 --gender womens --season spring

# With all options
npm run compose:recipe -- \
  --recipe datenight_womens_fall_outfit_01 \
  --gender womens \
  --season fall \
  --dog-owner \
  --max 5 \
  --min-confidence 75
```

### Programmatic API

```typescript
import { composeOutfits } from '@sparked/outfit-composer';

const response = await composeOutfits({
  recipeId: 'hiking_womens_spring_outfit_01',
  customerSignals: {
    gender: 'womens',
    season: 'spring',
    dog_owner: false,
  },
  maxOutfits: 5,
  minConfidence: 75,
});

if (response.success) {
  response.outfits.forEach((outfit) => {
    console.log(`Outfit ${outfit.outfitId}: ${outfit.confidenceScore}/100`);
    outfit.items.forEach((item) => {
      console.log(`  ${item.role}: ${item.product.brand} ${item.product.title}`);
    });
  });
}
```

## Scoring System

Each outfit receives a **confidence score (0-100)** based on weighted components:

| Component | Weight | Description |
|-----------|--------|-------------|
| Style Register Coherence | 25% | Items maintain compatible style levels (athletic → formal) |
| Color Harmony | 25% | Colors follow harmony models (monochromatic, neutral anchor, etc.) |
| Silhouette Balance | 20% | Proportions are balanced (oversized top + fitted bottom) |
| Occasion Alignment | 15% | Items match the theme/occasion (hiking, date night) |
| Season/Fabric Weight | 15% | Materials appropriate for season (linen in spring, wool in fall) |

### Pool Tiers

- **Primary (≥75)**: High-quality outfits, surface first
- **Secondary (50-74)**: Acceptable outfits, overflow pool
- **Suppressed (<50)**: Low quality, retain but don't surface

## Outfit Composition Flow

```
Recipe Template + Customer Signals
         ↓
Fetch Ingredient Sets from Sanity
         ↓
Claude generates 3-5 combinations
         ↓
Validate Hard Rules (4-6 slots, footwear, coverage)
         ↓
Score Soft Rules (style, color, silhouette, occasion, season)
         ↓
Filter by confidence threshold
         ↓
Return ranked outfits with scores
```

## Hard Rules (Blocking)

From `OUTFIT-BUILDING-RULES.md`:

- ✅ 4-6 slots required
- ✅ Exactly one footwear slot
- ✅ Top + bottom OR one-piece (full coverage)
- ✅ No duplicate roles (except 2 accessories allowed)

## Soft Rules (Scoring)

From `OUTFIT-BUILDING-RULES.md`:

- Style register coherence (adjacent registers compatible)
- Color harmony models (monochromatic, neutral anchor, complementary)
- Silhouette balance (oversized + fitted pairing)
- Occasion appropriateness (hiking items for hiking theme)
- Season/fabric weight (linen in spring, wool in fall)

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## Integration Points

### Recipe Builder

Recipes are created in the Recipe Builder app (`recipe-builder/`). The Outfit Composer consumes these recipes to generate outfits.

### Customer Website

The Customer Website (`website/`) displays composed outfits as part of personalized edit pages.

### Sanity CMS

All data flows through Sanity:
- Outfit Recipes (templates)
- Ingredient Sets (product pools)
- Products (1,885 items)

## Extending the Service

### Add New Scoring Rules

1. Create new scorer in `src/scoring/`
2. Add to `scoreOutfit()` in `src/scoring/index.ts`
3. Update `OutfitScoreBreakdown` type
4. Adjust weights in `DEFAULT_SCORING_WEIGHTS`

### Custom Claude Prompts

Edit `buildOutfitPrompt()` in `src/claude-api.ts` to adjust:
- Styling instructions
- Context provided to Claude
- Output format

### Save Composed Outfits

Use `saveComposedOutfit()` to persist generated outfits back to Sanity:

```typescript
import { saveComposedOutfit } from './sanity-client';

await saveComposedOutfit(
  recipeId,
  outfitId,
  items.map((item) => ({ role: item.role, productId: item.product._id })),
  confidenceScore,
  aiReasoning
);
```

## References

- **Outfit Building Rules**: `/OUTFIT-BUILDING-RULES.md`
- **Recipe Builder Integration**: `/recipe-builder/OUTFIT-RULES-INTEGRATION.md`
- **Sanity Schemas**: `/sanity/schemas/`

---

**Sparked · Nordstrom Experience Design · 2026**
