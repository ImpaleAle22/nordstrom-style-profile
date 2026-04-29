/**
 * Axis AI Refiner - Per-Axis AI Refinement Layer
 *
 * Called when rules-based confidence is below threshold for a specific axis.
 * Makes ONE AI call per axis (not monolithic for whole outfit).
 *
 * This produces more reliable results than asking AI to tag everything at once.
 */

import type {
  ActivityContext,
  Season,
  SocialRegister,
  AxisValue,
  OutfitInput,
} from './axis-types';
import { tokenTracker } from './token-tracker';

// ============================================================================
// AI PROMPT TEMPLATES
// ============================================================================

const AXIS_INSTRUCTIONS = {
  formality: `
FORMALITY SCALE (1.0-6.0):
- 1.0-2.0: Very Casual (loungewear, athleisure, sweats)
- 2.0-3.0: Casual (jeans, t-shirts, sneakers)
- 3.0-4.0: Smart Casual (chinos, blazer + jeans, nice blouse)
- 4.0-5.0: Business Casual / Dressy (suit, dress pants, heels, cocktail dress)
- 5.0-5.5: Formal (full suit, formal dress, gown)
- 5.5-6.0: Black Tie (tuxedo, evening gown)

TASK: Assign a formality score (1.0-6.0) based on garment types, fabrics, and overall styling.
Consider: footwear formality, fabric weight, tailoring, layering.

RESPOND WITH ONLY VALID JSON:
{"value": 3.8, "confidence": 0.85, "reasoning": "Smart casual - blazer with dark jeans and loafers"}
`,

  activityContext: `
ACTIVITY CONTEXT OPTIONS:
- casual-low-key: At-home, errands, weekend comfort
- social-daytime: Coffee date, brunch, shopping, daytime social
- social-evening: Casual dinner, date night, going out
- professional: Work, office, business meeting
- event: Party, wedding, gala, structured social event
- active: Workout, sports, athletic activity

TASK: Assign ONE primary activity context. You may also assign a secondary context if the outfit genuinely spans two contexts (e.g., blazer + dark jeans = social-evening + professional).

RESPOND WITH ONLY VALID JSON:
{"value": "social-evening", "secondary": "professional", "confidence": 0.75, "reasoning": "Blazer with dark jeans - works for dinner or casual office"}

OR (if no secondary):
{"value": "social-daytime", "confidence": 0.85, "reasoning": "Sundress and sandals - clear daytime social context"}
`,

  season: `
SEASON OPTIONS (multi-value):
- spring: Light layers, transitional fabrics
- summer: Linen, cotton, minimal layers, open footwear
- fall: Layers, medium-weight fabrics, boots
- winter: Heavy fabrics, outerwear, closed footwear
- all-season: Neutral fabric weight, adaptable

TASK: Assign one OR MORE seasons. An outfit can work for multiple seasons.
Consider: fabric weight, layering, footwear openness, material keywords.

RESPOND WITH ONLY VALID JSON:
{"value": ["fall", "winter"], "confidence": 0.9, "reasoning": "Wool sweater and boots - cold weather appropriate"}
`,

  socialRegister: `
SOCIAL REGISTER OPTIONS:
- intimate: Personal, low-stakes, private context (close friends, at home)
- peer-social: Among friends/peers, low evaluative pressure (brunch, casual hangout)
- evaluative: Appearance is being assessed (job interview, first date, meeting partner's family)
- public-facing: Professional visibility, client-facing (office, business meeting)
- celebratory: Event-oriented, dress code expected (wedding, gala, cocktail party)

TASK: Assign ONE social register based on dress code conventions and styling choices.
This is the most subjective axis - use your judgment.

RESPOND WITH ONLY VALID JSON:
{"value": "evaluative", "confidence": 0.7, "reasoning": "Suit and polished styling suggests high-stakes social context"}
`,
};

// ============================================================================
// AI REFINEMENT FUNCTIONS (Per-Axis)
// ============================================================================

interface AIRefinementInput {
  outfit: OutfitInput;
  currentValue: any;
  currentConfidence: number;
  currentReason: string;
  axisName: string;
}

/**
 * Build rich product context from metadata (Phase 4)
 * AI sees descriptions, materials, patterns, silhouette, vision analysis
 */
function buildProductContext(item: OutfitInput['items'][0]): string {
  const parts: string[] = [item.ingredientTitle];
  const product = item.product;

  // Add structured attributes
  if (product.materials?.length) {
    parts.push(`Materials: ${product.materials.join(', ')}`);
  }

  if (product.patterns) {
    const patterns = Array.isArray(product.patterns) ? product.patterns.join(', ') : product.patterns;
    parts.push(`Pattern: ${patterns}`);
  }

  if (product.silhouette) {
    parts.push(`Silhouette: ${product.silhouette}`);
  }

  if (product.garmentLength) {
    parts.push(`Length: ${product.garmentLength}`);
  }

  if (product.neckline) {
    parts.push(`Neckline: ${product.neckline}`);
  }

  if (product.sleeveStyle) {
    parts.push(`Sleeves: ${product.sleeveStyle}`);
  }

  if (product.fitDetails) {
    parts.push(`Fit: ${product.fitDetails}`);
  }

  // Add vision scan (if available)
  if (product.visionScan?.fabricWeight) {
    parts.push(`Fabric weight: ${product.visionScan.fabricWeight}`);
  }

  // Add comprehensive description if available (truncated to 200 chars for brevity)
  if (product.comprehensiveDescription) {
    const desc = product.comprehensiveDescription.slice(0, 200);
    parts.push(`Description: ${desc}${product.comprehensiveDescription.length > 200 ? '...' : ''}`);
  } else if (product.description) {
    parts.push(`Description: ${product.description}`);
  }

  // Add vision reasoning if available (AI's visual analysis)
  if (product.visionReasoning) {
    const reasoning = product.visionReasoning.slice(0, 150);
    parts.push(`Visual analysis: ${reasoning}${product.visionReasoning.length > 150 ? '...' : ''}`);
  }

  // Add product-level tags (help with axis resolution)
  if (product.formalityTier) {
    parts.push(`Product formality: ${product.formalityTier}`);
  }

  if (product.seasons?.length) {
    parts.push(`Product seasons: ${product.seasons.join(', ')}`);
  }

  if (product.trendTags?.length) {
    parts.push(`Style tags: ${product.trendTags.join(', ')}`);
  }

  return parts.join(' | ');
}

/**
 * Build prompt for AI refinement of a specific axis
 * Phase 4: Now includes rich product metadata instead of just titles
 */
function buildAxisPrompt(input: AIRefinementInput): string {
  const { outfit, currentValue, currentConfidence, currentReason, axisName } = input;

  // Phase 4: Build rich product context (materials, patterns, descriptions, etc.)
  const itemsText = outfit.items
    .map((item, i) => `${i + 1}. ${item.role}: ${buildProductContext(item)}`)
    .join('\n\n');

  return `OUTFIT:
${itemsText}

RULES-BASED SUGGESTION: ${JSON.stringify(currentValue)} (confidence: ${currentConfidence.toFixed(2)})
Reasoning: "${currentReason}"

${AXIS_INSTRUCTIONS[axisName as keyof typeof AXIS_INSTRUCTIONS]}

Return ONLY valid JSON.
`;
}

/**
 * Call AI to refine a specific axis
 *
 * @param axisName - Which axis to refine
 * @param outfit - Full outfit data
 * @param currentValue - Rules-based value
 * @param currentConfidence - Rules-based confidence
 * @param currentReason - Rules-based reasoning
 * @returns Refined AxisValue
 */
async function refineAxisWithAI(
  axisName: 'formality' | 'activityContext' | 'season' | 'socialRegister',
  outfit: OutfitInput,
  currentValue: any,
  currentConfidence: number,
  currentReason: string
): Promise<AxisValue<any>> {
  const prompt = buildAxisPrompt({
    outfit,
    currentValue,
    currentConfidence,
    currentReason,
    axisName,
  });

  // Temperature by axis (from architecture spec)
  const temperatures = {
    formality: 0.2,
    activityContext: 0.3,
    season: 0.2,
    socialRegister: 0.5,
  };

  try {
    // Use Gemini Flash Lite - fast, cheap, good for structured tagging
    const response = await fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        prompt: prompt,
        generationConfig: {
          temperature: temperatures[axisName],
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 300, // Reduced from 500
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Log and track token usage
    const usage = data.usageMetadata;
    if (usage) {
      tokenTracker.record(usage.promptTokenCount, usage.candidatesTokenCount);
      console.log(`🔢 ${axisName}: ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out = ${usage.totalTokenCount} | Running: ${tokenTracker.getSummaryString()}`);
    }

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    // Parse JSON response - handle markdown code blocks
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    // Extract JSON if there's any surrounding text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonStr);

    // Validate response structure
    if (!parsed.value || parsed.confidence === undefined || !parsed.reasoning) {
      throw new Error(`Invalid AI response structure: ${text}`);
    }

    return {
      value: parsed.value,
      confidence: Math.max(0.6, Math.min(1.0, parsed.confidence)), // Clamp 0.6-1.0
      reason: parsed.reasoning,
      source: 'ai',
    };
  } catch (error) {
    console.error(`AI refinement failed for ${axisName}:`, error);
    // Fall back to rules-based value
    return {
      value: currentValue,
      confidence: currentConfidence,
      reason: `${currentReason} (AI refinement failed, using rules)`,
      source: 'rules',
    };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Refine formality score with AI
 */
export async function refineFormality(
  outfit: OutfitInput,
  rulesValue: AxisValue<number>
): Promise<AxisValue<number>> {
  return refineAxisWithAI(
    'formality',
    outfit,
    rulesValue.value,
    rulesValue.confidence,
    rulesValue.reason
  ) as Promise<AxisValue<number>>;
}

/**
 * Refine activity context with AI
 */
export async function refineActivityContext(
  outfit: OutfitInput,
  rulesValue: AxisValue<ActivityContext> & { secondary?: ActivityContext }
): Promise<AxisValue<ActivityContext> & { secondary?: ActivityContext }> {
  const refined = await refineAxisWithAI(
    'activityContext',
    outfit,
    { primary: rulesValue.value, secondary: rulesValue.secondary },
    rulesValue.confidence,
    rulesValue.reason
  );

  // Handle secondary context from AI response
  const value = typeof refined.value === 'string' ? refined.value : refined.value.primary;
  const secondary = typeof refined.value === 'object' ? refined.value.secondary : undefined;

  return {
    value: value as ActivityContext,
    secondary: secondary as ActivityContext | undefined,
    confidence: refined.confidence,
    reason: refined.reason,
    source: 'ai',
  };
}

/**
 * Refine season with AI
 */
export async function refineSeason(
  outfit: OutfitInput,
  rulesValue: AxisValue<Season[]>
): Promise<AxisValue<Season[]>> {
  return refineAxisWithAI(
    'season',
    outfit,
    rulesValue.value,
    rulesValue.confidence,
    rulesValue.reason
  ) as Promise<AxisValue<Season[]>>;
}

/**
 * Refine social register with AI
 */
export async function refineSocialRegister(
  outfit: OutfitInput,
  rulesValue: AxisValue<SocialRegister>
): Promise<AxisValue<SocialRegister>> {
  return refineAxisWithAI(
    'socialRegister',
    outfit,
    rulesValue.value,
    rulesValue.confidence,
    rulesValue.reason
  ) as Promise<AxisValue<SocialRegister>>;
}
