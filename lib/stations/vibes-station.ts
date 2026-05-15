/**
 * Vibes Station - Pillar-Gated Vibe Assignment
 *
 * Implements the constrained vibe assignment from spec §2.3.
 * Given a pillar, assigns 1-3 vibes from that pillar's coherence list only.
 *
 * Key features:
 * - AI candidate list is pre-filtered to pillar-coherent vibes (6-10 options)
 * - Out-of-list vibes rejected with retry
 * - Zero-vibe default to pillar's first seed vibe
 * - Temperature 0.3 for moderate creativity within constraints
 */

import { callGemini } from '../gemini-client';
import { PILLAR_VIBE_COHERENCE, getCoherentVibes } from '../pillar-vibe-coherence';
import type { StylePillar, Vibe } from '../outfit-attributes';
import type { OutfitInput } from '../axis-types';

// ============================================================================
// TYPES
// ============================================================================

export interface VibesStationResult {
  vibes: Vibe[];
  confidence: number;
  reasoning: string;
  defaulted: boolean; // True if zero vibes returned and defaulted to seed
  retriedForOutOfList: boolean; // True if retry fired due to out-of-list vibes
}

export interface VibesStationOptions {
  // Future extension point (e.g., tier: 'primary' | 'secondary')
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const MIN_VIBES = 1;
const MAX_VIBES = 3;

// ============================================================================
// PAYLOAD BUILDING
// ============================================================================

/**
 * Build trimmed payload per spec §3
 *
 * Same as Pillar Station - includes role, title, colors, materials,
 * silhouette, patterns, details (top 3). Excludes brand.
 */
function buildTrimmedPayload(outfit: OutfitInput): string {
  const lines: string[] = [];

  for (const item of outfit.items) {
    const parts: string[] = [];

    // Role and title
    parts.push(`${item.role.toUpperCase()}: "${item.ingredientTitle}"`);

    // Colors
    if (item.product.colors && item.product.colors.length > 0) {
      parts.push(`Colors: ${item.product.colors.join(', ')}`);
    }

    // Materials
    if (item.product.materials && item.product.materials.length > 0) {
      parts.push(`Materials: ${item.product.materials.join(', ')}`);
    }

    // Silhouette
    if (item.product.silhouette) {
      parts.push(`Silhouette: ${item.product.silhouette}`);
    }

    // Patterns
    if (item.product.patterns) {
      const patterns = Array.isArray(item.product.patterns)
        ? item.product.patterns.join(', ')
        : item.product.patterns;
      parts.push(`Patterns: ${patterns}`);
    }

    // Details (top 3)
    if (item.product.details && item.product.details.length > 0) {
      const topDetails = item.product.details.slice(0, 3).join(', ');
      parts.push(`Details: ${topDetails}`);
    }

    lines.push(parts.join('\n'));
  }

  return lines.join('\n\n');
}

// ============================================================================
// AI VIBE SELECTION
// ============================================================================

/**
 * AI call to select 1-3 vibes from pillar's coherence list
 *
 * Temperature: 0.3 (moderate creativity within constraints)
 */
async function selectVibes(
  outfitPayload: string,
  pillar: StylePillar,
  candidateVibes: Vibe[],
  isRetry: boolean = false
): Promise<{ vibes: Vibe[]; reasoning: string }> {
  const vibeList = candidateVibes.map((v, i) => `${i + 1}. ${v}`).join('\n');

  const retryWarning = isRetry
    ? `\n\nCRITICAL: This is a RETRY because you previously returned vibes not in the list.
You MUST choose ONLY from the list below. Do NOT propose any other vibes.\n`
    : '';

  const prompt = `You are assigning vibes (emotional register) to a ${pillar} outfit.

OUTFIT:
${outfitPayload}

CANDIDATE VIBES for ${pillar} (choose 1-3 from this list ONLY):
${vibeList}${retryWarning}

Select 1-3 vibes that best capture the emotional feel of this outfit.

CRITICAL INSTRUCTIONS:
- You MUST choose vibes from the list above only
- Do NOT propose vibes not in the list
- The candidate list is pre-filtered for coherence with the ${pillar} pillar
- Do NOT second-guess the pillar assignment
- Choose 1-3 vibes (minimum 1, maximum 3)
- Prioritize the most distinctive vibes (avoid generic defaults)

Return ONLY a JSON object with this structure:
{
  "vibes": ["Vibe1", "Vibe2"],
  "reasoning": "brief explanation (1-2 sentences)"
}`;

  try {
    const { text } = await callGemini(
      GEMINI_MODEL,
      prompt,
      {
        temperature: 0.3,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
      }
    );

    const parsed = JSON.parse(text);

    if (!parsed.vibes || !Array.isArray(parsed.vibes)) {
      throw new Error('Invalid vibe response format (missing vibes array)');
    }

    return {
      vibes: parsed.vibes as Vibe[],
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('Error selecting vibes:', error);
    throw new Error(`Vibe selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// POST-PROCESSING
// ============================================================================

/**
 * Validate vibes against candidate list
 *
 * Returns: { valid: Vibe[], invalid: string[] }
 */
function validateVibes(
  vibes: Vibe[],
  candidateVibes: Vibe[]
): { valid: Vibe[]; invalid: string[] } {
  const valid: Vibe[] = [];
  const invalid: string[] = [];

  for (const vibe of vibes) {
    if (candidateVibes.includes(vibe)) {
      valid.push(vibe);
    } else {
      invalid.push(vibe);
    }
  }

  return { valid, invalid };
}

/**
 * Get default vibe for pillar (first in coherence list)
 */
function getDefaultVibe(pillar: StylePillar): Vibe {
  const coherentVibes = PILLAR_VIBE_COHERENCE[pillar];
  return coherentVibes[0]; // First vibe is the seed/default
}

// ============================================================================
// MAIN VIBES STATION
// ============================================================================

/**
 * Run Vibes Station
 *
 * Entry point for pillar-gated vibe assignment
 */
export async function runVibesStation(
  outfit: OutfitInput,
  pillar: StylePillar,
  options: VibesStationOptions = {}
): Promise<VibesStationResult> {
  try {
    // Step 1: Get candidate vibes from coherence map
    const candidateVibes = getCoherentVibes(pillar);

    if (candidateVibes.length === 0) {
      // Should never happen if coherence map is complete
      console.error(`No coherent vibes found for pillar: ${pillar}`);
      return {
        vibes: [],
        confidence: 0,
        reasoning: `No coherent vibes defined for ${pillar}`,
        defaulted: true,
        retriedForOutOfList: false,
      };
    }

    // Step 2: Build trimmed payload
    const payload = buildTrimmedPayload(outfit);

    // Step 3: AI call to select vibes
    let result = await selectVibes(payload, pillar, candidateVibes, false);

    console.log(`[VIBES STATION] AI returned vibes:`, result.vibes);
    console.log(`[VIBES STATION] Candidate vibes for ${pillar}:`, candidateVibes);

    // Step 4: Validate vibes against candidate list
    let { valid, invalid } = validateVibes(result.vibes, candidateVibes);

    console.log(`[VIBES STATION] After validation - valid:`, valid, 'invalid:', invalid);

    let retriedForOutOfList = false;

    // Step 5: Retry once if out-of-list vibes detected
    if (invalid.length > 0) {
      console.warn(`Out-of-list vibes detected: ${invalid.join(', ')}. Retrying with stricter prompt.`);
      retriedForOutOfList = true;

      // Retry with stricter prompt
      result = await selectVibes(payload, pillar, candidateVibes, true);
      const retryValidation = validateVibes(result.vibes, candidateVibes);
      valid = retryValidation.valid;
      invalid = retryValidation.invalid;

      // After retry, drop any remaining out-of-list vibes
      if (invalid.length > 0) {
        console.warn(`Out-of-list vibes still present after retry: ${invalid.join(', ')}. Dropping.`);
      }
    }

    // Step 6: Enforce min/max vibe count
    const finalVibes = valid.slice(0, MAX_VIBES); // Cap at 3

    // Step 7: Default if zero vibes remain
    let defaulted = false;
    if (finalVibes.length === 0) {
      const defaultVibe = getDefaultVibe(pillar);
      console.warn(`Zero vibes after validation. Defaulting to ${pillar}'s seed vibe: ${defaultVibe}`);
      finalVibes.push(defaultVibe);
      defaulted = true;
    }

    // Step 8: Calculate confidence
    // Confidence is high if:
    // - No retry needed (0.9)
    // - Retry succeeded (0.75)
    // - Defaulted (0.5)
    let confidence = 0.9;
    if (defaulted) {
      confidence = 0.5;
    } else if (retriedForOutOfList) {
      confidence = 0.75;
    }

    // Step 9: Return result
    return {
      vibes: finalVibes,
      confidence,
      reasoning: result.reasoning,
      defaulted,
      retriedForOutOfList,
    };
  } catch (error) {
    console.error('Vibes Station error:', error);

    // On error, default to pillar's first vibe
    const defaultVibe = getDefaultVibe(pillar);
    return {
      vibes: [defaultVibe],
      confidence: 0.3,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Defaulted to seed vibe.`,
      defaulted: true,
      retriedForOutOfList: false,
    };
  }
}
