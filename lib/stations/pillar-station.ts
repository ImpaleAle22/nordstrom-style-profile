/**
 * Pillar Station - Marker-Evidence Style Pillar Classification
 *
 * Implements the marker-evidence pattern from spec §2.2:
 * 1. AI gathers markers (materials, silhouettes, details, colors) - does NOT classify
 * 2. Code scores markers against pillar table
 * 3. Threshold gate: pillar needs ≥3 markers to qualify
 * 4. AI tie-break if multiple pillars within 10% of top score
 * 5. Sub-term assignment from canonical list
 * 6. Confidence aggregation from marker stack strength
 *
 * NO AI second-pass in this workstream - returns needsReview if confidence < threshold
 */

import { callGemini } from '../gemini-client';
import { scoreMarkers, applyThresholdGate, type Marker } from '../marker-scoring';
import { STYLE_PILLAR_METADATA, type StylePillar } from '../outfit-attributes';
import type { OutfitInput } from '../axis-types';

// ============================================================================
// TYPES
// ============================================================================

export interface PillarStationResult {
  stylePillar: StylePillar | null;
  subStyle: string | null;
  confidence: number;
  reasoning: string;
  markers?: Marker[]; // Detected markers (for debugging)
  needsReview: boolean;
  reviewReason?: string;
}

export interface PillarStationOptions {
  tier?: 'primary' | 'secondary'; // Primary: Flash-Lite (default), Secondary: Flash (escalation)
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_MODEL_PRIMARY = 'gemini-2.5-flash-lite'; // Primary tier (fast, cost-effective)
const GEMINI_MODEL_SECONDARY = 'gemini-2.5-flash'; // Secondary tier (stronger, for escalation)
const CONFIDENCE_THRESHOLD = 0.60; // Below this, outfit needs review (lowered from 0.65 to reduce false negatives)

// ============================================================================
// PAYLOAD BUILDING
// ============================================================================

/**
 * Build trimmed payload per spec §3
 *
 * Excludes: brand, description, visionReasoning, excess visualAttributes
 * Includes: role, ingredientTitle, colors, materials, silhouette, patterns, details (top 3)
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
// AI MARKER GATHERING
// ============================================================================

/**
 * AI call to gather markers (NOT classify)
 *
 * Temperature: 0.2 (low for consistency)
 */
async function gatherMarkers(outfitPayload: string, tier: 'primary' | 'secondary' = 'primary'): Promise<Marker[]> {
  const model = tier === 'primary' ? GEMINI_MODEL_PRIMARY : GEMINI_MODEL_SECONDARY;
  const prompt = `You are a fashion marker detector. Your job is to identify MARKERS in an outfit, NOT to classify the style.

OUTFIT:
${outfitPayload}

Identify markers present in this outfit from these categories:

1. MATERIALS: What fabrics/materials do you see?
   Examples: wool, cashmere, cotton, silk, satin, leather, sequin, denim, canvas, technical fabric, mesh, velvet, suede, lace

2. SILHOUETTES: What shapes/cuts/fits do you observe?
   Examples: structured, tailored, fitted, oversized, wide-leg, straight-leg, bodycon, a-line, tiered, maxi, midi, mini, cropped, flowy

3. DETAILS: What specific design elements/features are present?
   Examples: graphic, distressed, cargo pockets, fringe, embroidered, ruffle, bow, pearl, floral, chain, sequined, cutout, stiletto, button-down

4. COLORS: What color palette/tones dominate?
   Examples: black, white, monochrome, camel, earth tones, rust, emerald, vibrant, pastel, neutral

CRITICAL INSTRUCTIONS:
- DO NOT classify the outfit into a style pillar
- DO NOT suggest what style this "might be"
- ONLY list the markers you directly observe
- Be specific (e.g., "wool" not "warm fabric")
- List 5-12 markers total across all categories
- Focus on the most distinctive/clear markers

Return ONLY a JSON object with this structure:
{
  "markers": [
    { "type": "material", "value": "wool", "confidence": 0.9 },
    { "type": "silhouette", "value": "structured", "confidence": 0.85 },
    { "type": "detail", "value": "cargo pockets", "confidence": 0.95 },
    { "type": "color", "value": "earth tones", "confidence": 0.8 }
  ]
}

Confidence should be 0.7-1.0 (how certain you are the marker is present).`;

  try {
    const { text } = await callGemini(
      model,
      prompt,
      {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
      }
    );

    // Parse JSON response
    const parsed = JSON.parse(text);

    if (!parsed.markers || !Array.isArray(parsed.markers)) {
      throw new Error('Invalid marker response format');
    }

    // Validate and normalize markers
    const markers: Marker[] = parsed.markers
      .filter((m: any) =>
        m.type && m.value &&
        ['material', 'silhouette', 'detail', 'color'].includes(m.type)
      )
      .map((m: any) => ({
        type: m.type,
        value: m.value.toLowerCase().trim(),
        confidence: m.confidence || 0.8,
      }));

    return markers;
  } catch (error) {
    console.error('Error gathering markers:', error);
    throw new Error(`Marker gathering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// AI TIE-BREAK
// ============================================================================

/**
 * AI tie-break when multiple pillars within 10% of top score
 *
 * Shows only candidate pillars and marker evidence
 * Temperature: 0.1 (very low for deterministic tie-break)
 */
async function tieBreakPillars(
  candidates: StylePillar[],
  markers: Marker[],
  tier: 'primary' | 'secondary' = 'primary'
): Promise<StylePillar> {
  const model = tier === 'primary' ? GEMINI_MODEL_PRIMARY : GEMINI_MODEL_SECONDARY;
  const markerSummary = markers
    .map(m => `- ${m.type}: ${m.value} (confidence: ${m.confidence.toFixed(2)})`)
    .join('\n');

  const prompt = `You are a fashion style classifier doing a tie-break decision.

DETECTED MARKERS:
${markerSummary}

CANDIDATE STYLE PILLARS (tied within 10% of top score):
${candidates.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Based ONLY on the markers above, which pillar is the BEST fit?

PILLAR DEFINITIONS:
- Classic: Enduring, investment-minded, polished (blazer, trousers, wool, cashmere, tailored)
- Minimal: Restrained, intentional, form-forward (black, white, sleek, monochrome, fitted)
- Romantic: Emotionally expressive, ornamental (lace, silk, floral, ruffle, soft colors)
- Bohemian: Earthy, textural, unhurried (earth tones, fringe, tiered, maxi, suede)
- Maximal: Bold, expressive, more-is-more (sequins, vibrant, statement, dramatic)
- Streetwear: Urban, attitude-forward (oversized, graphic, distressed, chunky, chain)
- Athletic: Sport as identity (technical fabric, performance, mesh, running shoes)
- Utility: Function and terrain as design (cargo, canvas, work boots, structured utility)
- Casual: Relaxed, unfussy, everyday (denim, cotton, simple, relaxed)

Return ONLY a JSON object:
{
  "winner": "PillarName",
  "reasoning": "brief explanation (1-2 sentences)"
}`;

  try {
    const { text } = await callGemini(
      model,
      prompt,
      {
        temperature: 0.1, // Very low for deterministic tie-break
        topK: 20,
        topP: 0.85,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
      }
    );

    const parsed = JSON.parse(text);

    if (!parsed.winner || !candidates.includes(parsed.winner)) {
      // Fallback to first candidate if AI returns invalid pillar
      console.warn(`Tie-break returned invalid pillar "${parsed.winner}", using first candidate`);
      return candidates[0];
    }

    return parsed.winner as StylePillar;
  } catch (error) {
    console.error('Error in tie-break:', error);
    // Fallback to first candidate on error
    return candidates[0];
  }
}

// ============================================================================
// SUB-TERM ASSIGNMENT
// ============================================================================

/**
 * Assign sub-term from winning pillar's canonical list
 *
 * AI call with constrained list
 */
async function assignSubTerm(
  pillar: StylePillar,
  outfitPayload: string,
  markers: Marker[],
  tier: 'primary' | 'secondary' = 'primary'
): Promise<string | null> {
  const model = tier === 'primary' ? GEMINI_MODEL_PRIMARY : GEMINI_MODEL_SECONDARY;
  const canonicalSubTerms = STYLE_PILLAR_METADATA[pillar].subTerms;

  if (canonicalSubTerms.length === 0) {
    return null;
  }

  const markerSummary = markers
    .slice(0, 8) // Top 8 markers for context
    .map(m => `${m.value}`)
    .join(', ');

  const prompt = `You are assigning a sub-term to a ${pillar} outfit.

OUTFIT MARKERS:
${markerSummary}

CANONICAL SUB-TERMS for ${pillar} (choose EXACTLY ONE from this list):
${canonicalSubTerms.map((st, i) => `${i + 1}. ${st}`).join('\n')}

Which sub-term BEST describes this specific ${pillar} outfit?

CRITICAL: You MUST choose from the list above. Do not propose any other sub-term.

Return ONLY a JSON object:
{
  "subTerm": "ExactSubTermFromList"
}`;

  try {
    const { text } = await callGemini(
      model,
      prompt,
      {
        temperature: 0.2,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 100,
        responseMimeType: 'application/json',
      }
    );

    const parsed = JSON.parse(text);

    if (!parsed.subTerm) {
      return null;
    }

    // Validate sub-term is in canonical list
    if (!canonicalSubTerms.includes(parsed.subTerm)) {
      console.warn(`AI returned non-canonical sub-term "${parsed.subTerm}", rejecting`);
      return null;
    }

    return parsed.subTerm;
  } catch (error) {
    console.error('Error assigning sub-term:', error);
    return null;
  }
}

// ============================================================================
// MAIN PILLAR STATION
// ============================================================================

/**
 * Run Pillar Station
 *
 * Entry point for marker-evidence pillar classification
 */
export async function runPillarStation(
  outfit: OutfitInput,
  options: PillarStationOptions = {}
): Promise<PillarStationResult> {
  const tier = options.tier || 'primary';

  try {
    // Step 1: Build trimmed payload
    const payload = buildTrimmedPayload(outfit);

    // Step 2: AI gathers markers (does NOT classify)
    const markers = await gatherMarkers(payload, tier);

    if (markers.length === 0) {
      return {
        stylePillar: null,
        subStyle: null,
        confidence: 0,
        reasoning: 'No markers detected',
        markers: [],
        needsReview: true,
        reviewReason: 'no_markers_detected',
      };
    }

    // Step 3: Score markers against pillar table
    const scores = scoreMarkers(markers);

    // Step 4: Apply threshold gate
    const gateResult = applyThresholdGate(scores);

    if (!gateResult.pass) {
      return {
        stylePillar: null,
        subStyle: null,
        confidence: 0,
        reasoning: gateResult.reason,
        markers,
        needsReview: true,
        reviewReason: 'threshold_gate_failed',
      };
    }

    // Step 5: Handle ties (if candidates > 1)
    let winner = gateResult.winner!;

    if (gateResult.candidates.length > 1) {
      winner = await tieBreakPillars(gateResult.candidates, markers, tier);
    }

    // Step 6: Assign sub-term
    const subTerm = await assignSubTerm(winner, payload, markers, tier);

    // Step 7: Check confidence threshold
    if (gateResult.confidence < CONFIDENCE_THRESHOLD) {
      return {
        stylePillar: null,
        subStyle: null,
        confidence: gateResult.confidence,
        reasoning: `Confidence ${gateResult.confidence.toFixed(2)} below threshold ${CONFIDENCE_THRESHOLD}`,
        markers,
        needsReview: true,
        reviewReason: 'pillar_confidence_below_threshold',
      };
    }

    // Success
    return {
      stylePillar: winner,
      subStyle: subTerm,
      confidence: gateResult.confidence,
      reasoning: gateResult.reason,
      markers,
      needsReview: false,
    };
  } catch (error) {
    console.error('Pillar Station error:', error);
    return {
      stylePillar: null,
      subStyle: null,
      confidence: 0,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      needsReview: true,
      reviewReason: 'station_error',
    };
  }
}
