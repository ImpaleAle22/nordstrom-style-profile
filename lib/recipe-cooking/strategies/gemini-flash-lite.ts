/**
 * Gemini Flash Lite Strategy
 * Uses Gemini 2.5 Flash Lite to intelligently select outfit combinations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CombinationStrategy, IngredientWithProducts, OutfitCombination } from '../types';
import { DEFAULT_GEMINI_MODEL } from '../ai-models';
import { extractCoordinationHints, formatHintsForPrompt, getTopBottomRules } from '../coordination-hints';

export class GeminiFlashLiteStrategy implements CombinationStrategy {
  name = 'gemini-flash-lite';
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: DEFAULT_GEMINI_MODEL, // From ai-models.ts - SINGLE SOURCE OF TRUTH
      generationConfig: {
        temperature: 0.6, // Tagging learnings: 0.6 optimal for diversity+quality balance
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json', // Force JSON response
      },
    });
  }

  async generate(
    ingredients: IngredientWithProducts[],
    targetCount: number,
    recipeContext: {
      title: string;
      department: string;
      season?: string;
      theme?: string;
    }
  ): Promise<OutfitCombination[]> {
    try {
      const prompt = this.buildPrompt(ingredients, targetCount, recipeContext);

      console.log('\n=== Calling Gemini API ===');
      console.log(`Generating ${targetCount} outfits for: ${recipeContext.title}`);

      const result = await this.model.generateContent([{ text: prompt }]);
      const text = result.response.text().trim();

      console.log('Raw Gemini response length:', text.length);
      if (text.length < 10) {
        console.error('Gemini returned very short response:', text);
        throw new Error('Gemini returned empty or invalid response');
      }

      // Parse JSON response - be aggressive about extracting valid JSON
      let cleanedText = text
        .replace(/^```json\n?/, '')  // Remove opening code fence
        .replace(/\n?```$/, '')       // Remove closing code fence
        .trim();

      // Extract JSON array if there's text before/after
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      if (!cleanedText || cleanedText.length === 0) {
        console.error('Cleaned text is empty. Original response:', text);
        throw new Error('Cannot parse empty response from Gemini');
      }

      console.log('Parsing JSON response (first 200 chars):', cleanedText.substring(0, 200));
      console.log('Last 200 chars:', cleanedText.substring(cleanedText.length - 200));

      let response;
      try {
        response = JSON.parse(cleanedText);
      } catch (parseError: any) {
        // JSON is malformed - try to salvage valid outfits
        console.error('JSON parse failed:', parseError.message);
        console.error('Error at position:', parseError.message.match(/position (\d+)/)?.[1]);

        console.log('🔧 Attempting aggressive salvage...');

        // Strategy: Find the last complete outfit object
        // Pattern: ] (end selections array) followed by } (end outfit object)
        // Use regex to handle variable whitespace
        const outfitEndPattern = /\]\s*\}/g;
        const matches = [...cleanedText.matchAll(outfitEndPattern)];

        if (matches.length === 0) {
          console.error('❌ Could not find any complete outfit endings');
          throw parseError;
        }

        // Get the last match (last complete outfit)
        const lastMatch = matches[matches.length - 1];
        const lastOutfitEnd = lastMatch.index! + lastMatch[0].length;

        // Truncate there and close the array
        const truncated = cleanedText.substring(0, lastOutfitEnd) + '\n]';

        console.log(`Found ${matches.length} complete outfits, truncating at char ${lastOutfitEnd}`);

        try {
          response = JSON.parse(truncated);
          console.log(`✅ Salvaged ${response.length} outfits by truncation`);
        } catch (truncateError: any) {
          console.error('❌ Truncation failed:', truncateError.message);
          throw parseError;
        }
      }

      // Convert to OutfitCombination format
      const combinations = this.parseGeminiResponse(response, ingredients);

      console.log(`Gemini generated ${combinations.length} combinations`);
      return combinations;
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to random sampling
      console.log('Falling back to random sampling...');
      const { RandomSamplingStrategy } = await import('./random-sampling');
      const fallback = new RandomSamplingStrategy();
      return fallback.generate(ingredients, targetCount, recipeContext);
    }
  }

  private buildPrompt(
    ingredients: IngredientWithProducts[],
    targetCount: number,
    recipeContext: any
  ): string {
    // Separate ingredients into required (has products) and optional (no products)
    const requiredIngredients = ingredients.filter((ing) => ing.products.length > 0);
    const missingIngredients = ingredients.filter((ing) => ing.products.length === 0);

    if (requiredIngredients.length === 0) {
      throw new Error('No ingredients have products available');
    }

    if (missingIngredients.length > 0) {
      console.log(`\n⚠️  Gemini generating with partial ingredients:`);
      console.log(`   Available (${requiredIngredients.length}):`);
      requiredIngredients.forEach((i) => {
        console.log(`      ✓ ${i.ingredientTitle} (${i.role}) - ${i.products.length} products`);
      });
      console.log(`   Missing (${missingIngredients.length}):`);
      missingIngredients.forEach((i) => {
        console.log(`      ❌ ${i.ingredientTitle} (${i.role})`);
        console.log(`         Query: "${i.searchQuery}"`);
        console.log(`         This ingredient returned 0 products!`);
      });
    }

    // Build product pools summary with coordination hints
    // Number each pool explicitly to make it clear there are multiple
    const ingredientSummaries = requiredIngredients.map((ing, poolIndex) => {
      // RANDOMIZE product order for variety (was always showing top 10 by similarity)
      const shuffledProducts = [...ing.products].sort(() => Math.random() - 0.5);

      // Show rich product metadata for better AI styling decisions
      const productList = shuffledProducts
        .slice(0, 10) // Show first 10 for context
        .map((p, idx) => {
          const parts: string[] = [
            `${idx + 1}. ${p.brand} - ${p.title} ($${p.price})`
          ];

          // Colors (CRITICAL for coordination)
          if (p.colors && p.colors.length > 0) {
            parts.push(`Colors: ${p.colors.join(', ')}`);
          }

          // Materials (important for season/occasion)
          if (p.materials && p.materials.length > 0) {
            parts.push(`Materials: ${p.materials.join(', ')}`);
          }

          // Style details (silhouette, fit, length)
          const styleDetails: string[] = [];
          if (p.silhouette) styleDetails.push(p.silhouette);
          if (p.garmentLength) styleDetails.push(p.garmentLength);
          if (p.neckline) styleDetails.push(p.neckline);
          if (p.sleeveStyle) styleDetails.push(p.sleeveStyle);
          if (styleDetails.length > 0) {
            parts.push(`Style: ${styleDetails.join(', ')}`);
          }

          // Patterns (important for visual cohesion)
          if (p.patterns) {
            const patternStr = Array.isArray(p.patterns) ? p.patterns.join(', ') : p.patterns;
            if (patternStr) parts.push(`Pattern: ${patternStr}`);
          }

          // Description (GOLD - especially for H&M products)
          if (p.description && p.description.length > 10) {
            const cleanDesc = p.description
              .replace(/<[^>]*>/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 80);
            if (cleanDesc.length > 10) {
              parts.push(`"${cleanDesc}"`);
            }
          }

          return `    ${parts[0]}\n       ${parts.slice(1).join(' | ')}`;
        })
        .join('\n\n');

      // Extract coordination hints from query/title
      const hints = extractCoordinationHints(ing.searchQuery, ing.ingredientTitle, ing.role);
      const hintsText = formatHintsForPrompt(hints);

      return `
  POOL ${poolIndex + 1} - ${ing.role.toUpperCase()}: ${ing.ingredientTitle}${hintsText}
  Query: "${ing.searchQuery}"
  Available products (${ing.products.length} total, showing randomized sample):
${productList}
${ing.products.length > 10 ? `    ... and ${ing.products.length - 10} more` : ''}
`;
    });

    const missingNote = missingIngredients.length > 0
      ? `\n\nNOTE: The following ingredients have no products available and should be OMITTED from outfits:\n${missingIngredients.map((ing) => `- ${ing.role}: ${ing.ingredientTitle}`).join('\n')}`
      : '';

    // Add specific coordination guidance if recipe has tops + bottoms
    const hasTopAndBottom = requiredIngredients.some(i => i.role === 'tops') &&
                            requiredIngredients.some(i => i.role === 'bottoms');

    let coordinationGuidance = '';
    if (hasTopAndBottom) {
      const topIng = requiredIngredients.find(i => i.role === 'tops');
      const bottomIng = requiredIngredients.find(i => i.role === 'bottoms');

      if (topIng && bottomIng) {
        const topHints = extractCoordinationHints(topIng.searchQuery, topIng.ingredientTitle, 'tops');
        const bottomHints = extractCoordinationHints(bottomIng.searchQuery, bottomIng.ingredientTitle, 'bottoms');
        const rules = getTopBottomRules(topHints, bottomHints);

        if (rules) {
          coordinationGuidance = `\n\nTOPS + BOTTOMS COORDINATION:\n  ${rules}`;
        }
      }
    }

    return `You are a professional stylist creating outfits for ${recipeContext.department}.

Recipe: "${recipeContext.title}"
${recipeContext.season ? `Season: ${recipeContext.season}` : ''}
${recipeContext.theme ? `Theme: ${recipeContext.theme}` : ''}

Product pools:
${ingredientSummaries.join('\n')}${missingNote}${coordinationGuidance}

Create ${targetCount} complete, stylish outfits by selecting products from the pools above.

CRITICAL RULES:
1. SELECT ONE PRODUCT FROM EACH POOL: ${requiredIngredients.length} pools = ${requiredIngredients.length} products per outfit
${missingIngredients.length > 0 ? '   - SKIP any ingredients marked as unavailable' : `
   - Pool 1-${requiredIngredients.length}: SELECT ONE PRODUCT FROM EACH POOL NUMBER
   - Even if pools have the same role (e.g., POOL 1 - TOPS and POOL 2 - TOPS), you MUST select from BOTH pools
   - Example: If you see "POOL 1 - TOPS" and "POOL 2 - TOPS", your outfit needs TWO tops items (one from each pool)`}

2. NO DUPLICATE PRODUCTS: Each product can only be used ONCE per outfit
   - Do NOT select the same product from multiple pools
   - Example: If you pick "H&M Wide-cut Pants" from POOL 2 (productIndex: 3), you CANNOT use that same product in any other slot
   - Even if the same product appears in multiple pools, use it only ONCE
   - Choose DIFFERENT products for each slot

3. STYLING REQUIREMENTS:
   - Have cohesive colors and styles
   - Be appropriate for the theme and season
   - Mix high and low price points when possible

4. CREATE MAXIMUM VARIETY (CRITICAL):
   - Each outfit MUST be distinctly different from the others
   - Vary formality levels: mix casual, smart-casual, and dressy options
   - Vary color palettes: include neutral looks, bold colors, monochrome, and colorful combinations
   - Vary silhouettes and proportions: mix fitted/loose, cropped/long, structured/flowy
   - Don't default to safe combinations - take creative risks within the theme
   - If creating ${targetCount} outfits, aim for ${targetCount} unique style directions

CRITICAL COORDINATION RULES FOR TOPS + BOTTOMS:
1. COLOR HARMONY: Tops must complement bottom colors
   - Match neutrals (black/white/beige/navy)
   - OR create intentional contrast (e.g., white top + blue jeans)
   - Pull accent colors from patterns (floral dress → match one flower color)

2. SILHOUETTE BALANCE: Pair fitted with loose
   - Fitted top + loose/wide-leg bottoms = balanced
   - Loose/oversized top + fitted/slim bottoms = balanced
   - Both tight OR both loose = avoid (unflattering)

3. STYLE COHERENCE: Stay within same or adjacent style registers
   - Casual: tee + jeans, tank + shorts
   - Smart-casual: blouse + trousers, sweater + midi skirt
   - Don't mix: athletic top + formal skirt, leather jacket + romantic dress

4. PROPORTIONS: Length matters
   - Cropped tops → high-waist bottoms (show waist, not midriff)
   - Tunic/long tops → slim bottoms (avoid bulk)
   - Standard tops → any rise works

Return ONLY a JSON array of outfits (no other text). Each outfit MUST have exactly ${requiredIngredients.length} selections:

[
  {
    "reasoning": "edgy-feminine",
    "selections": [
      { "role": "tops", "productIndex": 0 },
      { "role": "bottoms", "productIndex": 2 },
      { "role": "tops", "productIndex": 1 },
      { "role": "shoes", "productIndex": 1 }
    ]
  }
]

VALIDATION CHECK: Count your selections for each outfit:
- You have ${requiredIngredients.length} ingredient pools above
- Each outfit's "selections" array MUST have exactly ${requiredIngredients.length} items
- If you only have ${requiredIngredients.length - 1} selections, you forgot one pool!

IMPORTANT:
- Keep "reasoning" to 2-3 words max (e.g., "edgy-feminine", "casual-chic", "boho-romantic", "minimal-sleek")
- Use productIndex to reference items from each ingredient's product list (0-indexed)
- Each selection must specify the ROLE that matches the pool (e.g., if POOL 1 is TOPS, use "role": "tops")
- If multiple pools have the same role, include that role multiple times (e.g., two "tops" entries for two tops pools)`;
  }

  private parseGeminiResponse(
    response: any[],
    ingredients: IngredientWithProducts[]
  ): OutfitCombination[] {
    const combinations: OutfitCombination[] = [];

    for (const outfit of response) {
      // Track which ingredients have been used in this outfit to prevent duplicates
      const usedIngredientIndices = new Set<number>();

      const items = outfit.selections
        .map((selection: any) => {
          // Normalize role to lowercase (Gemini sometimes returns uppercase)
          const normalizedRole = selection.role?.toLowerCase();

          // Find UNUSED ingredient with matching role
          // This handles multiple accessories (sunglasses, jewelry, bags) correctly
          let ingredientIndex = -1;
          for (let i = 0; i < ingredients.length; i++) {
            if (ingredients[i].role === normalizedRole && !usedIngredientIndices.has(i)) {
              ingredientIndex = i;
              break;
            }
          }

          if (ingredientIndex === -1) {
            // Either unknown role or all ingredients with this role already used
            const alreadyUsed = ingredients.some(
              (ing, idx) => ing.role === normalizedRole && usedIngredientIndices.has(idx)
            );
            if (alreadyUsed) {
              console.warn(
                `⚠️  Duplicate role in outfit: ${selection.role} (already used). Skipping to prevent duplicate ingredients.`
              );
            } else {
              console.warn(`⚠️  Skipping unknown role: ${selection.role} (not in ingredient list)`);
            }
            return null;
          }

          const ingredient = ingredients[ingredientIndex];

          if (ingredient.products.length === 0) {
            console.warn(`⚠️  Skipping ${ingredient.role} - no products available`);
            return null;
          }

          const product = ingredient.products[selection.productIndex];
          if (!product) {
            console.warn(
              `⚠️  Product index ${selection.productIndex} out of bounds for ${ingredient.ingredientTitle} (has ${ingredient.products.length} products)`
            );
            return null;
          }

          // Mark this ingredient as used
          usedIngredientIndices.add(ingredientIndex);

          return {
            role: normalizedRole,
            ingredientTitle: ingredient.ingredientTitle,
            product,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // Only include outfits that have at least some items
      if (items.length > 0) {
        combinations.push({
          items,
          reasoning: outfit.reasoning,
        });
      }
    }

    return combinations;
  }
}
