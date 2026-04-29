"use strict";
/**
 * Claude API Integration for Outfit Generation
 *
 * Uses Claude to intelligently select product combinations from ingredient sets.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOutfits = generateOutfits;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6-20250929';
/**
 * Build prompt for Claude to select outfit combinations
 */
function buildOutfitPrompt(recipe, signals) {
    const slots = recipe.slots.map((slot, idx) => {
        const products = slot.ingredientSet?.products || [];
        const productList = products
            .slice(0, 30) // Limit to 30 products per slot to avoid context overflow
            .map((p, i) => `${i + 1}. ${p.brand} ${p.title} ($${p.price}) [ID: ${p._id}]\n` +
            `   Type: ${p.productType1} > ${p.productType2 || 'N/A'}\n` +
            `   Colors: ${p.simplifiedColors?.join(', ') || p.vanityColor || 'N/A'}\n` +
            `   Materials: ${p.materials?.join(', ') || 'N/A'}\n` +
            `   Occasions: ${p.occasions?.join(', ') || 'N/A'}`)
            .join('\n\n');
        return `
## Slot ${idx + 1}: ${slot.role}
Ingredient Set: "${slot.ingredientSet?.displayTitle || 'Unknown'}"
Products available (${products.length} total, showing top 30):

${productList}
`;
    }).join('\n\n');
    return `You are an expert stylist for Nordstrom's personalized shopping experience. Your task is to create ${recipe.slots.length > 5 ? '3' : '5'} complete outfit combinations from the product pools below.

## Recipe: ${recipe.title}
**Theme:** ${recipe.theme}
**Department:** ${recipe.department}
**Season:** ${recipe.season || 'All seasons'}

## Customer Context:
- Gender: ${signals.gender}
- Season: ${signals.season}
- Dog owner: ${signals.dog_owner ? 'Yes' : 'No'}

## Required Slots:
${recipe.slots.map((s) => `- ${s.role}`).join('\n')}

## Available Products:
${slots}

---

## Your Task:

Generate ${recipe.slots.length > 5 ? '3' : '5'} complete outfit combinations by selecting ONE product from each slot. Consider:

1. **Style Coherence**: Keep all items in compatible style registers (e.g., all casual, or smart-casual → business-casual)
2. **Color Harmony**: Use neutrals + 1-2 accent colors, or monochromatic palettes
3. **Silhouette Balance**: Pair oversized tops with fitted bottoms (and vice versa)
4. **Occasion Fit**: Match theme "${recipe.theme}" and season "${signals.season}"
5. **Season Appropriateness**: Choose materials/weights suitable for ${signals.season}

## Output Format:

Return ONLY valid JSON (no markdown, no explanation):

{
  "outfits": [
    {
      "items": [
        { "role": "tops", "productId": "draft-abc123..." },
        { "role": "bottoms", "productId": "draft-xyz789..." },
        { "role": "shoes", "productId": "draft-def456..." }
      ],
      "reasoning": "Brief explanation of why this outfit works (style, color, proportion)"
    }
  ]
}

Generate diverse combinations - vary the style registers (e.g., 2 casual, 2 smart-casual, 1 elevated) and color palettes.`;
}
function parseClaudeResponse(text) {
    // Try to extract JSON from response (in case Claude adds markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.outfits || !Array.isArray(parsed.outfits)) {
        throw new Error('Invalid response structure: missing outfits array');
    }
    return parsed;
}
/**
 * Generate outfit combinations using Claude
 */
async function generateOutfits(recipe, signals, maxOutfits = 5) {
    console.log(`🤖 Calling Claude API to generate ${maxOutfits} outfits...`);
    const prompt = buildOutfitPrompt(recipe, signals);
    const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        temperature: 0.7, // Some creativity, but not too wild
        messages: [
            {
                role: 'user',
                content: prompt,
            },
        ],
    });
    // Extract text response
    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
    }
    const parsed = parseClaudeResponse(textContent.text);
    // Convert to OutfitItem format with full product objects
    const outfits = parsed.outfits.slice(0, maxOutfits).map((outfit) => {
        const items = outfit.items.map((item) => {
            // Find product in recipe slots
            const slot = recipe.slots.find((s) => s.role === item.role);
            const product = slot?.ingredientSet?.products.find((p) => p._id === item.productId);
            if (!product) {
                throw new Error(`Product ${item.productId} not found in slot ${item.role}`);
            }
            return {
                role: item.role,
                product,
            };
        });
        return {
            items,
            reasoning: outfit.reasoning,
        };
    });
    console.log(`✅ Generated ${outfits.length} outfits from Claude`);
    return outfits;
}
//# sourceMappingURL=claude-api.js.map