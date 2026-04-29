# Recipe Cooking System

Transform recipe templates into scored outfit combinations using AI and semantic search.

## Architecture

```
Recipe Template (localStorage)
  ↓ Product Fetcher
CLIP API (semantic search) → Product pools for each ingredient
  ↓ Combination Strategy
AI (Gemini/Claude) OR Random Sampling → Outfit combinations
  ↓ Validation
Hard Rules (4-6 slots, footwear, coverage)
  ↓ Scoring Engine
5-Module Confidence Score (0-100)
  ↓ Filtering
Min confidence threshold (default: 50)
  ↓ Storage
Sanity CMS (outfit schema) OR localStorage
```

## Usage

### Control Panel UI (Recommended)

1. Navigate to `/cooker` in Recipe Builder
2. Configure parameters:
   - **Strategy**: Choose AI model or random sampling
   - **Target Count**: Number of outfits to generate (default: 30)
   - **Products per Ingredient**: CLIP search limit (default: 20)
   - **Min Confidence**: Threshold for keeping outfits (default: 50)
3. Select recipe(s) to cook
4. Click "Start Cooking"

### Programmatic API

```typescript
import { cookRecipe } from '@/lib/recipe-cooking';
import type { UnifiedRecipe, CookingOptions } from '@/lib/recipe-cooking/types';

const recipe: UnifiedRecipe = { /* ... */ };

const options: CookingOptions = {
  strategy: 'gemini-flash-lite',
  targetCount: 30,
  productsPerIngredient: 20,
  minConfidence: 50,
  saveToSanity: false,
};

const result = await cookRecipe(recipe, options);

console.log(`Generated ${result.stats.totalPassed} outfits`);
console.log(`Primary: ${result.stats.primary}`);
console.log(`Secondary: ${result.stats.secondary}`);
```

### Quick Test

```bash
cd recipe-builder
npx tsx lib/recipe-cooking/test-cooking.ts
```

## Combination Strategies

### Random Sampling (Free, No AI)
- Randomly selects one product from each ingredient pool
- Generates N combinations
- Relies entirely on scoring engine to rank quality
- **Cost**: Free
- **Speed**: Fast (~1 sec for 30 outfits)
- **Use case**: Testing, bulk generation, no API key needed

### Gemini Flash Lite (Recommended)
- Uses Gemini 2.5 Flash Lite AI model
- Intelligently selects cohesive product combinations
- Provides reasoning for each outfit
- **Cost**: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- **Speed**: ~10 sec for 30 outfits
- **Use case**: Production, quality results, cost-effective

### Gemini Flash (Coming Soon)
- Slightly higher quality than Lite
- **Cost**: Same as Lite ($0.075/1M)
- **Speed**: ~15 sec for 30 outfits

### Claude Sonnet (Coming Soon)
- Highest quality reasoning
- **Cost**: $3 per 1M input tokens (40x more expensive)
- **Speed**: ~20 sec for 30 outfits
- **Use case**: Premium quality, critical recipes

## Adding New Strategies

Create a new strategy class:

```typescript
// lib/recipe-cooking/strategies/my-strategy.ts
import type { CombinationStrategy, IngredientWithProducts, OutfitCombination } from '../types';

export class MyStrategy implements CombinationStrategy {
  name = 'my-strategy';

  async generate(
    ingredients: IngredientWithProducts[],
    targetCount: number,
    recipeContext: any
  ): Promise<OutfitCombination[]> {
    // Your logic here
    // Return array of { items: [...], reasoning?: string }
  }
}
```

Register in `strategies/index.ts`:

```typescript
import { MyStrategy } from './my-strategy';

export const strategies: Record<string, () => CombinationStrategy> = {
  'random-sampling': () => new RandomSamplingStrategy(),
  'gemini-flash-lite': () => new GeminiFlashLiteStrategy(),
  'my-strategy': () => new MyStrategy(),
};
```

Update UI dropdown in `app/cooker/page.tsx`:

```tsx
<MenuItem value="my-strategy">
  My Strategy (Description)
</MenuItem>
```

## Scoring Details

### 5-Module Confidence Score

1. **Style Register Coherence** (30%) - Checks if all items share similar formality
2. **Color Harmony** (25%) - Evaluates color compatibility
3. **Silhouette Balance** (20%) - Assesses proportions and layering
4. **Occasion Alignment** (15%) - Matches outfit to theme/occasion
5. **Season & Fabric Weight** (10%) - Validates seasonal appropriateness

**Total**: 0-100 confidence score

### Pool Tiers

- **Primary (75+)**: High confidence, ready for customer display
- **Secondary (50-74)**: Moderate confidence, needs review
- **Suppressed (<50)**: Low confidence, filtered out by default

## Bulk Cooking

### Cook All Uncooked Recipes

```typescript
import { cookRecipeBatch, getUncookedRecipes } from '@/lib/recipe-cooking';

const allRecipes = await getRecipes();
const uncooked = getUncookedRecipes(allRecipes);
const results = await cookRecipeBatch(uncooked, options);
```

### Cook Stale Recipes

```typescript
import { getStaleRecipes } from '@/lib/recipe-cooking';

const stale = getStaleRecipes(allRecipes, 7); // Older than 7 days
const results = await cookRecipeBatch(stale, options);
```

### Cook on New Product Addition

```typescript
// When new products added to catalog
const newProductIds = ['prod_123', 'prod_456'];

// Find recipes whose ingredients would match these products
const affectedRecipes = allRecipes.filter(recipe =>
  recipe.slots.some(slot =>
    productMatchesIngredient(newProductIds, slot.ingredient)
  )
);

await cookRecipeBatch(affectedRecipes, options);
```

## Environment Setup

### Required

1. **CLIP API** running on `http://localhost:5002`
   ```bash
   cd services/clip-search
   python app.py
   ```

2. **Google API Key** (for Gemini strategies)
   ```bash
   export GOOGLE_API_KEY="your-key-here"
   # Or add to .env.local
   ```

### Optional

- **Sanity credentials** (if `saveToSanity: true`)

## Troubleshooting

### "CLIP API not available"
- Check CLIP service is running: `curl http://localhost:5002/health`
- Start CLIP: `cd services/clip-search && python app.py`

### "No products found for ingredient"
- Check ingredient search query is not too specific
- Verify CLIP has indexed products
- Try broader product type filters

### "GOOGLE_API_KEY not found"
- Set environment variable for Gemini strategies
- Or use `random-sampling` strategy (no API key needed)

### Low confidence scores
- Recipes may have incompatible ingredient combinations
- Try adjusting ingredient search queries to be more specific
- Check if products have required metadata (colors, materials, styleRegister)

## Performance

### Random Sampling Strategy
- 30 outfits: ~1 second
- 100 outfits: ~3 seconds

### Gemini Flash Lite Strategy
- 30 outfits: ~10 seconds
- 100 outfits: ~30 seconds

**Bottleneck**: CLIP API product fetching (parallel, ~1-2 sec total)

## Future Enhancements

- [ ] Real-time cooking progress updates (WebSocket)
- [ ] Outfit preview images (product collages)
- [ ] A/B test different strategies side-by-side
- [ ] Recipe auto-cooking on schedule (cron)
- [ ] Product availability checks (filter out-of-stock)
- [ ] Customer signal integration (cook personalized outfits)
- [ ] Outfit performance tracking (click-through, conversion)
