/**
 * Rules Improvement Agent
 *
 * Uses Gemini 2.5 Flash Lite (or Claude Sonnet) to automatically improve tagging rules
 * by analyzing AI reasoning from hybrid-tagged outfits.
 *
 * This is a code-writing agent, not a report generator.
 */

import { jsonrepair } from 'jsonrepair';
import { getAllOutfits } from './outfit-storage';
import type { AnalysisReport } from './automatic-rule-analysis';

// ============================================================================
// TYPES
// ============================================================================

export interface ReasoningCorpusEntry {
  outfitId: string;
  rulesMaxConfidence: number;
  rulesTopHint: string | null;
  aiChose: {
    stylePillar: string | null;
    vibes: string[];
    occasions: string[];
  };
  aiConfidence: number;
  aiReasoning: string;
  outfitContext: {
    productTitles: string[];
    colors: string[];
    colorCount: number;
    hasBrightColors: boolean;
    itemCount: number;
  };
}

export interface RuleChange {
  type: 'keyword-expansion' | 'threshold-adjustment' | 'new-signal' | 'new-logic' | 'correction';
  target: string;
  description: string;
  evidenceCount: number;
  exampleReasoning: string;
}

export interface SkippedPattern {
  pattern: string;
  reason: string;
}

export interface ImprovementResult {
  improvedRulesCode: string;
  changes: RuleChange[];
  skipped: SkippedPattern[];
  projectedImpact: string;
  model: 'gemini-2.5-pro' | 'claude-sonnet-4.5';
  timestamp: string;
}

export type ModelType = 'gemini-2.5-pro' | 'claude-sonnet-4.5';

// ============================================================================
// CANONICAL DEFINITIONS
// ============================================================================

const STYLE_PILLARS_DOC = `# Style Pillars

Canonical reference for edit-engine's 9 style pillars.

## The 9 Pillars

### Romantic
Emotionally expressive, ornamental dressing. The design story is feeling and ornamentation — delicacy, movement, and beauty as intention. Menswear expression: floral prints, ruffled/pleated details, soft tailoring, womenswear-inspired silhouettes.
**Sub-terms:** Effortless Romantic, Feminine, Whimsical, Ladylike, Romantic Minimal, Delicate, Ethereal, Dandy

### Bohemian
Earthy, textural, unhurried dressing. Vintage finds, natural materials, layered pieces that feel discovered rather than assembled.
**Sub-terms:** Beachy, Eclectic, Vintage-inspired, Natural, Artisanal, Hippie, Free-spirited, Artistic, Worldly

### Casual
Relaxed, unfussy, everyday dressing. Comfort and ease are the premise — not sporty, not polished, just wearable and real.
**Sub-terms:** Pragmatic Casual, Sporty Casual

### Classic
Enduring, investment-minded dressing. Silhouettes and pieces that transcend seasons — polished without being trendy.
**Sub-terms:** Timeless Classic, Sophisticated, Polished, Dressy, Chic, Classic Chic, Tailored, Timeless, Menswear-inspired, Nautical, Preppy, Heritage

### Minimal
Restrained, intentional, form-forward dressing. Reduction as a design choice — clean lines, quiet color, nothing unnecessary.
**Sub-terms:** Modern Minimal, Sleek, Monochromatic, Understated, Modern, Architectural, Elegant, Refined

### Maximal
Bold, expressive, more-is-more dressing. Pattern, color, layering, and statement pieces as the point — not the accent.
**Sub-terms:** Daring Maximal, Bold, Vibrant, Tropical, Glam, Exotic, Quirky

### Fashion Forward
Trend-aware, directional dressing. Pieces that signal cultural currency.
**Sub-terms:** Streetwear, Urban, Edgy, Androgynous, Gender Neutral, Tomboy

### Athletic
Sport as identity and activity. Garments designed for specific sports or sporting cultures.
**Sub-terms:** Athleisure, Sportswear

### Utility
Function and terrain as design language. Gear-forward, construction-forward pieces.
**Sub-terms:** Utility Workwear, Utility Streetwear, Workwear, Military, Western, Rugged, Outdoorsy, Safari

## Key Distinctions

**Romantic vs. Bohemian:** Romantic is intentionally beautiful and delicate; Bohemian is earthy, textural, and found.
**Bohemian vs. Maximal:** Bohemian is organic and unhurried; Maximal is deliberate and loud.
**Minimal vs. Classic:** Classic is about enduring silhouettes; Minimal is about reduction.
**Athletic vs. Utility:** Athletic items have sport identity; Utility items have functional/terrain identity.`;

const VIBES_DOC = `# Vibes

Vibe captures the emotional feeling, energy, or mood a look conveys — how the outfit makes you feel.

## Active Vibe Terms

| Vibe | Description |
|---|---|
| Androgynous | Blends or transcends gender expression |
| Approachable | Warm, open, and non-intimidating |
| Artsy | Creative, expressive, and visually interesting |
| Bold | Makes a statement; visually assertive |
| Calm | Quiet, composed, and unhurried |
| Cozy | Warm, soft, and inviting; comfort as priority |
| Confident | Projects self-assurance |
| Cute | Sweet, light, and charming |
| Dramatic | High-impact and theatrical |
| Dressier | More formal than everyday |
| Effortless | Looks unstudied and natural |
| Energetic | Active, dynamic, and alive |
| Elegant | Refined and graceful |
| Feminine | Soft, delicate, and conventionally feminine |
| Free | Unstructured and uninhibited |
| Fresh | Clean, bright, and current |
| Glam | Polished and show-stopping |
| Luxe | Expensive-feeling and aspirational |
| Modest | Covered and understated |
| Playful | Fun and lighthearted |
| Polished | Neat and well put-together |
| Professional | Appropriate for work contexts |
| Relaxed | Easy and low-effort |
| Romantic | Soft, dreamy, and emotionally warm |
| Sexy | Alluring and intentionally appealing |
| Timeless | Classic and enduring |
| Tomboy | Casual and gender-relaxed |
| Understated | Deliberately quiet and refined |`;

const OCCASIONS_DOC = `# Occasions

Occasion captures where and when the customer will wear the item.

## Active Occasion Terms

### Wedding
Getting Married, Bridal, Bridesmaid, Mother of the Bride, Mother of the Groom, Rehearsal Dinner, Wedding Guest, Wedding Shower, Bachelorette Party

### Formal / Evening
Black Tie / Gala, Cocktail Party, Formal, Holiday Party, Graduation Party, Theatre, Wine Tasting

### Going Out
Date Night, Night Out, Concert, Festival, Happy Hour

### Casual Social
Brunch, Coffee Date, Lunch with Friends, Casual Dinner, Farmers Market, BBQ / Cookout, Entertaining at Home, Party, Baby Shower

### Work
Working in the Office, Work from Home, Business Trip, Interview

### Everyday / Errand
Weekend, Running Errands, Shopping Day, Sightseeing, Relaxing at Home

### School / Milestones
Back to School, Photoshoot

### Travel / Vacation
Vacation, Warm Weather Vacation, Cold Weather Vacation, Beach Day, Road Trip

### Sport / Active
Workout, Running, Yoga, Weight Lifting, Hiking, Skiing, Swimming, Golf, Baseball Game, Football Game, Rodeo, Spa Day`;

// ============================================================================
// DATA COLLECTION
// ============================================================================

/**
 * Collect AI reasoning corpus from all hybrid-tagged outfits
 */
export async function collectReasoningCorpus(): Promise<ReasoningCorpusEntry[]> {
  const outfits = await getAllOutfits();
  const hybridOutfits = outfits.filter(o =>
    o.attributes && o.attributes.taggedBy === 'hybrid'
  );

  console.log(`📚 Collecting reasoning corpus from ${hybridOutfits.length} hybrid outfits...`);

  return hybridOutfits.map(outfit => {
    const attrs = outfit.attributes!;

    // Extract colors
    const allColors = outfit.items.flatMap(item => item.product.colors || []);
    const brightColors = ['red', 'orange', 'yellow', 'hot pink', 'neon', 'electric blue', 'bright'];
    const hasBrightColors = allColors.some(color =>
      brightColors.some(bright => color.toLowerCase().includes(bright))
    );

    return {
      outfitId: outfit.outfitId,
      rulesMaxConfidence: 0.5, // Below threshold (that's why AI was called)
      rulesTopHint: null, // We don't store this currently
      aiChose: {
        stylePillar: attrs.stylePillar,
        vibes: attrs.vibes,
        occasions: attrs.occasions
      },
      aiConfidence: attrs.confidence?.stylePillar || 0,
      aiReasoning: attrs.reasoning || '',
      outfitContext: {
        productTitles: outfit.items.map(item => item.product.title),
        colors: allColors,
        colorCount: new Set(allColors.map(c => c.toLowerCase())).size,
        hasBrightColors,
        itemCount: outfit.items.length
      }
    };
  });
}

// ============================================================================
// AGENT FUNCTIONS
// ============================================================================

/**
 * Run the rules improvement agent (collects corpus from IndexedDB)
 * Used for client-side calls only
 */
export async function runRulesImprovementAgent(
  currentRulesCode: string,
  gapAnalysis: AnalysisReport,
  model: ModelType = 'gemini-2.5-pro'
): Promise<ImprovementResult> {
  console.log(`🤖 Running rules improvement agent with ${model}...`);

  // Collect reasoning corpus
  const corpus = await collectReasoningCorpus();

  if (corpus.length === 0) {
    throw new Error('No hybrid-tagged outfits found. Run tagging first.');
  }

  console.log(`   Corpus size: ${corpus.length} outfits`);

  return runRulesImprovementAgentWithCorpus(currentRulesCode, corpus, gapAnalysis, model);
}

/**
 * Run the rules improvement agent with pre-collected corpus
 * Used for server-side API calls (corpus collected client-side and passed in)
 */
export async function runRulesImprovementAgentWithCorpus(
  currentRulesCode: string,
  corpus: ReasoningCorpusEntry[],
  gapAnalysis: AnalysisReport,
  model: ModelType = 'gemini-2.5-pro',
  userFeedback?: string
): Promise<ImprovementResult> {
  console.log(`🤖 Running rules improvement agent with ${model}...`);
  console.log(`   Corpus size: ${corpus.length} outfits`);
  if (userFeedback) {
    console.log(`   📝 User feedback provided (${userFeedback.length} chars)`);
  }

  if (corpus.length === 0) {
    throw new Error('No hybrid-tagged outfits found. Run tagging first.');
  }

  // Build prompt
  const systemPrompt = buildSystemPrompt(userFeedback);
  const userMessage = buildUserMessage(currentRulesCode, corpus, gapAnalysis);

  // Call AI
  let response: ImprovementResult;
  if (model === 'gemini-2.5-pro') {
    response = await callGemini(systemPrompt, userMessage);
  } else {
    response = await callClaude(systemPrompt, userMessage);
  }

  response.model = model;
  response.timestamp = new Date().toISOString();

  return response;
}

/**
 * Build system prompt with canonical definitions
 */
function buildSystemPrompt(userFeedback?: string): string {
  const feedbackSection = userFeedback ? `

HUMAN EXPERT FEEDBACK:
The domain expert has provided the following guidance for improving the rules:

${userFeedback}

IMPORTANT: Prioritize and incorporate this human feedback into your improvements. The expert understands fashion nuances and edge cases that may not be obvious from the data alone.

---
` : '';

  return `You are an expert TypeScript engineer and fashion systems architect improving an outfit tagging rules engine.

You will receive:
1. The current rules engine source code (TypeScript)
2. A corpus of AI reasoning — explanations a fashion AI gave when it tagged outfits the rules couldn't handle
3. Canonical definitions of each style pillar and vibe
4. A preliminary gap analysis report${userFeedback ? '\n5. Human expert feedback providing domain guidance' : ''}

Your job is to produce an IMPROVED version of the rules engine that handles more outfits correctly without needing AI assistance.
${feedbackSection}
RULES FOR YOUR IMPROVEMENTS:
- Preserve all existing TypeScript structure, interfaces, and exports exactly
- Only modify the logic inside generateRulesBasedHints() and its helper functions
- You may add new helper functions
- You may add new keyword arrays
- You may adjust confidence thresholds
- You may add new signal detection logic
- Do NOT change function signatures, return types, or anything outside generateRulesBasedHints()
- Every change must be grounded in the AI reasoning corpus — do not invent signals that aren't evidenced
- When uncertain whether a pattern is real or noise, be conservative: raise a threshold rather than adding a new rule

CANONICAL DEFINITIONS (use these as your authority):

${STYLE_PILLARS_DOC}

---

${VIBES_DOC}

---

${OCCASIONS_DOC}

---

OUTPUT FORMAT:
Respond with a JSON object (NO markdown code fences, just pure JSON):
{
  "improvedRulesCode": "// Full TypeScript source of the improved generateRulesBasedHints() function and any new helpers",
  "changes": [
    {
      "type": "keyword-expansion" | "threshold-adjustment" | "new-signal" | "new-logic" | "correction",
      "target": "stylePillar.Bohemian" | "vibe.Energetic" | etc,
      "description": "What changed and why",
      "evidenceCount": 12,
      "exampleReasoning": "The AI reasoning that motivated this change"
    }
  ],
  "skipped": [
    {
      "pattern": "Pattern that was identified but not acted on",
      "reason": "Why it was skipped (insufficient evidence, needs vision data, etc.)"
    }
  ],
  "projectedImpact": "Brief assessment of expected improvement to rules-only rate"
}`;
}

/**
 * Build user message with current rules + corpus + gap analysis
 */
function buildUserMessage(
  currentRulesCode: string,
  corpus: ReasoningCorpusEntry[],
  gapAnalysis: AnalysisReport
): string {
  // Calculate corpus stats
  const veryLowConfidence = corpus.filter(e => e.rulesMaxConfidence < 0.3).length;
  const noHint = corpus.filter(e => !e.rulesTopHint).length;

  return `## Current Rules Engine Source Code

\`\`\`typescript
${currentRulesCode}
\`\`\`

---

## AI Reasoning Corpus

Total hybrid outfits analyzed: ${corpus.length}
Outfits where rules confidence was very low (<0.3): ${veryLowConfidence}
Outfits where rules had no hint at all: ${noHint}

${JSON.stringify(corpus, null, 2)}

---

## Preliminary Gap Analysis

${JSON.stringify(gapAnalysis, null, 2)}

---

## Your Task

Analyze the AI reasoning corpus against the current rules. Identify patterns where the AI consistently made confident decisions that the rules missed or underweighted. Produce an improved version of generateRulesBasedHints() that captures these patterns as deterministic rules.

Prioritize improvements by:
1. High-frequency patterns (10+ occurrences) where AI confidence was high (>0.8)
2. Cases where the rules had NO hint for what the AI chose (complete misses)
3. Threshold adjustments where rules detected the right thing but scored it too low
4. New signals that are clearly detectable from text data (product titles, colors, brands)

Do NOT attempt to add rules for things that require visual information (patterns, prints, textures, fit/silhouette) unless the product titles reliably contain that information. Flag these as "needs vision data" in skipped.`;
}

/**
 * Clean common JSON issues from Gemini responses
 * Multiple passes to handle various malformation patterns
 */
function cleanGeminiJson(jsonStr: string): string {
  // Remove trailing commas before closing brackets/braces
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between array elements: "item1" "item2" -> "item1", "item2"
  jsonStr = jsonStr.replace(/"(\s+)"/g, '", "');

  // Fix missing commas after closing brackets/braces followed by opening ones
  jsonStr = jsonStr.replace(/](\s*)\[/g, '], [');
  jsonStr = jsonStr.replace(/}(\s*){/g, '}, {');

  // Fix missing commas between array elements (value followed by value)
  jsonStr = jsonStr.replace(/](\s+)"/g, '], "');
  jsonStr = jsonStr.replace(/"(\s+)\[/g, '", [');

  // Fix missing commas after string values before property names
  jsonStr = jsonStr.replace(/"(\s+)([a-zA-Z_][a-zA-Z0-9_]*):/g, '", "$2":');

  // Fix unquoted property names (more aggressive pattern)
  // Match: word characters followed by colon, not already quoted
  jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):/g, '$1"$2"$3:');

  // Remove comments (// or /* */)
  jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');
  jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');

  // Fix single quotes to double quotes for property names
  jsonStr = jsonStr.replace(/'([^']*?)':/g, '"$1":');

  // Remove control characters except newlines (which should already be in strings)
  jsonStr = jsonStr.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');

  // Second pass: catch any remaining trailing commas
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

  return jsonStr;
}

/**
 * Call Gemini 2.5 Flash API
 */
async function callGemini(systemPrompt: string, userMessage: string): Promise<ImprovementResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in environment');
  }

  const model = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt + '\n\n---\n\n' + userMessage }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent code generation
      maxOutputTokens: 16000, // Increased for larger code outputs
      responseMimeType: 'application/json'
    }
  };

  console.log('   Calling Gemini 2.5 Flash Lite...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract text from Gemini response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No text in Gemini response');
  }

  // Parse JSON with jsonrepair (handles malformed JSON from Gemini)
  let parsed;
  try {
    let jsonStr = text.trim();

    // Strip markdown code blocks
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/, '').trim();
      jsonStr = jsonStr.replace(/\s*```\s*$/, '').trim();
    }

    // Extract JSON if there's surrounding text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    // Try parsing with jsonrepair first (handles most malformations)
    try {
      const repairedJson = jsonrepair(jsonStr);
      parsed = JSON.parse(repairedJson);
    } catch (repairError) {
      // jsonrepair failed, try manual cleaning
      console.warn('jsonrepair failed, trying manual cleaning:', repairError);
      jsonStr = cleanGeminiJson(jsonStr);
      parsed = JSON.parse(jsonStr);
    }
  } catch (error) {
    console.error('Failed to parse Gemini response as JSON');
    console.error('Raw response (first 2000 chars):', text.substring(0, 2000));
    console.error('Parse error:', error);

    // Try to identify problematic location
    if (error instanceof Error && error.message.includes('position')) {
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const contextStart = Math.max(0, pos - 100);
        const contextEnd = Math.min(text.length, pos + 100);
        console.error('Context around error position:', text.substring(contextStart, contextEnd));
      }
    }

    throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}. Check server logs for full response.`);
  }

  return {
    improvedRulesCode: parsed.improvedRulesCode,
    changes: parsed.changes || [],
    skipped: parsed.skipped || [],
    projectedImpact: parsed.projectedImpact || '',
    model: 'gemini-2.5-pro', // UI label (actual model: gemini-2.5-flash-lite)
    timestamp: new Date().toISOString()
  };
}

/**
 * Call Claude Sonnet 4.5 API (requires @anthropic-ai/sdk to be installed)
 */
async function callClaude(systemPrompt: string, userMessage: string): Promise<ImprovementResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment');
  }

  try {
    // Use dynamic import - only loads if SDK is installed
    const { default: Anthropic } = await import('@anthropic-ai/sdk');

    const client = new Anthropic({ apiKey });

    console.log('   Calling Claude Sonnet 4.5...');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    if (!text) {
      throw new Error('No text in Claude response');
    }

    // Parse JSON
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      parsed = JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse Claude response as JSON:', text);
      throw new Error(`Failed to parse Claude response: ${error}`);
    }

    return {
      improvedRulesCode: parsed.improvedRulesCode,
      changes: parsed.changes || [],
      skipped: parsed.skipped || [],
      projectedImpact: parsed.projectedImpact || '',
      model: 'claude-sonnet-4.5',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot find module '@anthropic-ai/sdk'")) {
      throw new Error('Claude Sonnet requires @anthropic-ai/sdk to be installed. Run: npm install @anthropic-ai/sdk\n\nOr use Gemini 2.5 Pro instead (default model).');
    }
    throw error;
  }
}
