/**
 * Station 2.7: AI Post-Filter
 *
 * Hybrid approach: Generate many outfits with random sampling (fast),
 * then use AI to filter the results (looking at the whole outfit).
 *
 * Philosophy:
 * - Random generation is fast (1000 outfits in seconds)
 * - AI is good at holistic evaluation ("does this work as a complete outfit?")
 * - AI is expensive per call, but filtering is batch-friendly
 * - Higher reject rate is fine - we generated many candidates
 *
 * Kitchen pipeline:
 * [Generate 200-500 with random]
 *     ↓
 * [Station 2.5: Formality Check]
 *     ↓
 * [Station 2.6: Similarity Check]
 *     ↓
 * [Station 2.7: AI Post-Filter] ← YOU ARE HERE
 *     Gemini looks at outfit and says "keep" or "reject"
 *     Reasons: color clash, pattern clash, style mismatch, etc.
 *     ↓
 * [Station 3: Hard Rules Validation]
 */

import type { OutfitCombination } from './types';
import type { KitchenStation, StationResult } from './kitchen-stations';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Use Gemini to evaluate a batch of outfits
 * Returns: array of boolean (keep/reject) for each outfit
 */
async function batchEvaluateOutfits(
  outfits: OutfitCombination[],
  recipeContext: {
    title: string;
    department: string;
    season?: string;
  }
): Promise<Array<{ keep: boolean; reason?: string }>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️  GEMINI_API_KEY not set, skipping AI filter');
    return outfits.map(() => ({ keep: true, reason: 'AI not available' }));
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Batch outfits (Gemini can handle multiple in one prompt)
  const batchSize = 10; // Evaluate 10 outfits per API call
  const results: Array<{ keep: boolean; reason?: string }> = [];

  for (let i = 0; i < outfits.length; i += batchSize) {
    const batch = outfits.slice(i, i + batchSize);

    const prompt = `You are a professional fashion stylist. Evaluate these ${batch.length} outfit combinations.
Recipe: ${recipeContext.title} (${recipeContext.department}, ${recipeContext.season || 'all seasons'})

For each outfit, decide if it should be KEPT or REJECTED based on:
- Color harmony (do the colors work together?)
- Pattern compatibility (mixing prints/patterns)
- Style coherence (consistent vibe/aesthetic)
- Formality matching (items at similar formality level)
- Overall fashionability (would you wear this?)

${batch
  .map(
    (outfit, idx) => `
OUTFIT ${i + idx + 1}:
${outfit.items.map((item) => `- ${item.role}: ${item.product.title} (${item.product.colors?.join(', ') || 'no color info'})`).join('\n')}
`
  )
  .join('\n')}

Return ONLY a JSON array with ${batch.length} objects:
[
  {"keep": true/false, "reason": "brief explanation"},
  ...
]

Be selective - reject outfits with obvious clashes. Keep the best 60-70%.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`   ⚠️  AI response not parseable for batch ${i / batchSize + 1}, keeping all`);
        results.push(...batch.map(() => ({ keep: true, reason: 'Parse error' })));
        continue;
      }

      const batchResults = JSON.parse(jsonMatch[0]);
      results.push(...batchResults);
    } catch (error: any) {
      console.warn(`   ⚠️  AI filter error for batch ${i / batchSize + 1}: ${error.message}`);
      results.push(...batch.map(() => ({ keep: true, reason: 'API error' })));
    }
  }

  return results;
}

/**
 * AI Post-Filter Station
 * Uses Gemini to evaluate complete outfits holistically
 */
export const aiFilterStation: KitchenStation = {
  name: 'AI Post-Filter',
  description: 'Uses Gemini to evaluate outfit compatibility holistically',
  filter: async (combinations, config = {}) => {
    const recipeContext = config.recipeContext || {
      title: 'Outfit Recipe',
      department: 'Unknown',
    };

    console.log(`   🤖 Evaluating ${combinations.length} outfits with Gemini...`);

    const evaluations = await batchEvaluateOutfits(combinations, recipeContext);

    const passed: OutfitCombination[] = [];
    const examples: string[] = [];
    let filtered = 0;

    combinations.forEach((outfit, idx) => {
      const evaluation = evaluations[idx] || { keep: true, reason: 'Not evaluated' };

      if (evaluation.keep) {
        passed.push(outfit);
      } else {
        filtered++;
        if (examples.length < 3 && evaluation.reason) {
          examples.push(`Outfit ${idx + 1}: ${evaluation.reason}`);
        }
      }
    });

    console.log(`   ✓ AI kept ${passed.length}/${combinations.length} outfits`);

    return {
      passed,
      filtered,
      examples,
      metrics: { batchSize: 10, evaluationCount: combinations.length },
    };
  },
};

/**
 * Hybrid Pipeline: Random Generation + AI Filtering
 *
 * Strategy:
 * 1. Generate 200-500 outfits with random sampling (fast, cheap)
 * 2. Filter with formality (remove obvious disasters)
 * 3. Filter with similarity (remove clashing items)
 * 4. Filter with AI (holistic evaluation)
 * 5. Validate with hard rules (final check)
 *
 * This gives you:
 * - Speed of random generation
 * - Intelligence of AI filtering
 * - Low API cost (filtering is cheaper than generation)
 */
export const HYBRID_AI_PIPELINE = {
  stations: [
    { station: { name: 'Formality Filter', description: '', filter: null as any } }, // Import actual stations
    { station: { name: 'Similarity Filter', description: '', filter: null as any } },
    { station: aiFilterStation, config: {} }, // AI post-filter
    { station: { name: 'Hard Rules Validation', description: '', filter: null as any } },
  ],
};

/**
 * Usage example:
 *
 * ```typescript
 * import { cookRecipe } from './lib/recipe-cooking';
 * import { aiFilterStation, formalityStation, similarityStation, hardRulesStation } from './kitchen-stations';
 *
 * const HYBRID_PIPELINE = {
 *   stations: [
 *     { station: formalityStation },
 *     { station: similarityStation, config: { threshold: 0.10 } },
 *     { station: aiFilterStation, config: { recipeContext: { title: recipe.title, department: recipe.department } } },
 *     { station: hardRulesStation },
 *   ],
 * };
 *
 * // Generate 300 with random, filter with AI
 * const result = await cookRecipe(recipe, {
 *   strategy: 'random-sampling',
 *   targetCount: 300,
 *   pipeline: HYBRID_PIPELINE,
 * });
 *
 * // Result: ~100-150 high-quality outfits
 * // Cost: ~2-3 cents (vs $1+ for 300 AI generations)
 * ```
 */
