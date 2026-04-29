/**
 * outfit-building-rules.ts
 * Sparked · Nordstrom Experience Design
 *
 * Machine-enforceable outfit composition rules for Outfit Recipes.
 * Authoritative source: outfit-building-rules.md
 *
 * This file encodes the hard rules (Part 1) and scoring constants (Part 4)
 * from the rules doc. Soft rules (Part 2) are implemented in the AI outfit
 * composition service and are not represented here as validators.
 *
 * Usage:
 *   - Recipe builder validation: import { validateOutfitRecipe }
 *   - Outfit composition service: import { OUTFIT_CONFIDENCE_THRESHOLDS, STYLE_REGISTERS }
 *   - Sanity schema constraints: import { SLOT_ROLES, SLOT_CONSTRAINTS }
 */

// ---------------------------------------------------------------------------
// Slot Roles
// ---------------------------------------------------------------------------

export const SLOT_ROLES = [
  'tops',
  'bottoms',
  'one-piece',
  'shoes',
  'outerwear',
  'accessories',
] as const;

export type SlotRole = (typeof SLOT_ROLES)[number];

// ---------------------------------------------------------------------------
// Slot Constraints
// Max occurrences per role in a single Outfit Recipe
// ---------------------------------------------------------------------------

export const SLOT_CONSTRAINTS: Record<SlotRole, { max: number; required: boolean; notes?: string }> = {
  tops:        { max: 3, required: false, notes: 'Required unless one-piece is present. Max 3 for layering (e.g., tank + shirt + sweater)' },
  bottoms:     { max: 2, required: false, notes: 'Required unless one-piece is present. Max 2 for layering (e.g., skirt + tights/leggings). Can coexist with one-piece for layering (tights under dress).' },
  'one-piece': { max: 1, required: false, notes: 'Can layer with separates: one-piece + bottoms (tights under dress) OR one-piece + tops + bottoms (beach cover-up over swimwear)' },
  shoes:       { max: 1, required: true,  notes: 'Always required. No outfit is complete without footwear.' },
  outerwear:   { max: 1, required: false },
  accessories: { max: 4, required: false, notes: 'Up to 4 allowed (e.g., bag, jewelry, scarf, hat)' },
};

// ---------------------------------------------------------------------------
// Recipe Slot Shape
// ---------------------------------------------------------------------------

export interface OutfitSlot {
  role: SlotRole;
  ingredientSetId?: string;
  displayLabel?: string;
}

export interface OutfitRecipeForValidation {
  title?: string;
  slots: OutfitSlot[];
}

// ---------------------------------------------------------------------------
// Validation Result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];   // Hard rule violations — block save
  warnings: string[]; // Soft rule advisories — non-blocking
}

// ---------------------------------------------------------------------------
// Hard Rule Validators
// ---------------------------------------------------------------------------

/**
 * Rule 1.1 — Slot count must be between 4 and 6.
 */
function validateSlotCount(slots: OutfitSlot[]): string[] {
  const errors: string[] = [];
  if (slots.length < 4) {
    errors.push(`Outfit recipes require at least 4 slots. You have ${slots.length}.`);
  }
  if (slots.length > 6) {
    errors.push(`Outfit recipes allow at most 6 slots. You have ${slots.length}.`);
  }
  return errors;
}

/**
 * Rule 1.2 — Exactly one footwear (shoes) slot required.
 */
function validateFootwear(slots: OutfitSlot[]): string[] {
  const errors: string[] = [];
  const shoeSlots = slots.filter((s) => s.role === 'shoes');
  if (shoeSlots.length === 0) {
    errors.push('A footwear slot (shoes) is required. No outfit is complete without footwear.');
  }
  if (shoeSlots.length > 1) {
    errors.push('Only one footwear slot is allowed per outfit recipe.');
  }
  return errors;
}

/**
 * Rule 1.3 — Garment coverage: must have (tops + bottoms) OR (one-piece), with layering exceptions.
 *
 * UPDATED: Allow layering scenarios:
 * - one-piece + bottoms = valid (tights under dress)
 * - one-piece + tops + bottoms = valid (beach cover-up over swimwear, kimono over outfit)
 * - one-piece + tops (without bottoms) = invalid (can't wear just shirt under dress)
 */
function validateGarmentCoverage(slots: OutfitSlot[]): string[] {
  const errors: string[] = [];
  const hasTops      = slots.some((s) => s.role === 'tops');
  const hasBottoms   = slots.some((s) => s.role === 'bottoms');
  const hasOnePiece  = slots.some((s) => s.role === 'one-piece');

  // Invalid: one-piece + tops (WITHOUT bottoms) - this doesn't make sense
  // Example: dress + t-shirt (incomplete coverage)
  if (hasOnePiece && hasTops && !hasBottoms) {
    errors.push(
      "A one-piece slot with tops requires bottoms to complete the layering. " +
      "Valid: one-piece + tops + bottoms (e.g., cover-up over swimwear). " +
      "Invalid: one-piece + tops only."
    );
  }

  // Valid scenarios:
  // - one-piece + bottoms = tights under dress
  // - one-piece + tops + bottoms = beach cover-up over bikini, kimono over outfit
  // - tops + bottoms = standard separates

  // No garment coverage at all
  if (!hasOnePiece && !hasTops && !hasBottoms) {
    errors.push(
      "Outfit must include garment coverage: either (tops + bottoms) or a one-piece slot."
    );
  }

  // Separates without one-piece: need BOTH tops and bottoms
  if (!hasOnePiece) {
    if (hasTops && !hasBottoms) {
      errors.push("A tops slot requires a matching bottoms slot, or replace both with a one-piece.");
    }
    if (hasBottoms && !hasTops) {
      errors.push("A bottoms slot requires a matching tops slot, or replace both with a one-piece.");
    }
  }

  return errors;
}

/**
 * Rule 1.4 — No role appears more times than its allowed maximum.
 */
function validateRoleUniqueness(slots: OutfitSlot[]): string[] {
  const errors: string[] = [];
  const roleCounts: Partial<Record<SlotRole, number>> = {};

  for (const slot of slots) {
    roleCounts[slot.role] = (roleCounts[slot.role] ?? 0) + 1;
  }

  for (const [role, count] of Object.entries(roleCounts) as [SlotRole, number][]) {
    const constraint = SLOT_CONSTRAINTS[role];
    if (!constraint) {
      errors.push(`Unknown role "${role}" - valid roles are: ${Object.keys(SLOT_CONSTRAINTS).join(', ')}`);
      continue;
    }
    if (count > constraint.max) {
      errors.push(
        `Role "${role}" appears ${count} times but is allowed at most ${constraint.max} time(s).`
      );
    }
  }

  return errors;
}

/**
 * Rule 1.5 — All slot roles must be valid enum values.
 */
function validateRoleEnum(slots: OutfitSlot[]): string[] {
  const errors: string[] = [];
  for (const slot of slots) {
    if (!SLOT_ROLES.includes(slot.role)) {
      errors.push(`"${slot.role}" is not a valid slot role. Valid roles: ${SLOT_ROLES.join(', ')}.`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Advisory Warnings (non-blocking)
// ---------------------------------------------------------------------------

function generateWarnings(slots: OutfitSlot[]): string[] {
  const warnings: string[] = [];
  const hasOuterwear   = slots.some((s) => s.role === 'outerwear');
  const accessorySlots = slots.filter((s) => s.role === 'accessories');

  // Thin slot count with no accessories
  if (slots.length === 4 && accessorySlots.length === 0) {
    warnings.push(
      "This outfit has only 4 slots and no accessories. " +
      "An accessories slot can elevate the look and increase combination variety."
    );
  }

  // Two accessory slots (allowed, but flag if labels suggest same sub-type)
  if (accessorySlots.length === 2) {
    const labels = accessorySlots.map((s) => s.displayLabel?.toLowerCase() ?? '');
    const JEWELRY_TERMS = ['jewelry', 'earring', 'necklace', 'bracelet', 'ring'];
    const BAG_TERMS     = ['bag', 'purse', 'tote', 'clutch', 'handbag'];
    const bothJewelry   = labels.every((l) => JEWELRY_TERMS.some((t) => l.includes(t)));
    const bothBags      = labels.every((l) => BAG_TERMS.some((t) => l.includes(t)));
    if (bothJewelry || bothBags) {
      warnings.push(
        "Both accessory slots appear to target the same sub-category. " +
        "Consider diversifying (e.g., one bag slot + one jewelry slot)."
      );
    }
  }

  // No outerwear — remind author for layering contexts
  if (!hasOuterwear && slots.length <= 5) {
    warnings.push(
      "No outerwear slot is defined. Consider adding one if this recipe targets fall or winter contexts."
    );
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Primary Export: validateOutfitRecipe
// ---------------------------------------------------------------------------

/**
 * Validates an Outfit Recipe against all hard rules and generates advisory warnings.
 *
 * @param recipe - The outfit recipe to validate
 * @returns ValidationResult with errors (blocking) and warnings (advisory)
 *
 * @example
 * const result = validateOutfitRecipe({ title: "Fall Cardigan Look", slots });
 * if (!result.valid) {
 *   // Block save, surface result.errors to author
 * }
 * // Always surface result.warnings as advisory UI hints
 */
export function validateOutfitRecipe(recipe: OutfitRecipeForValidation): ValidationResult {
  const { slots } = recipe;
  const errors: string[] = [];

  errors.push(...validateRoleEnum(slots));
  errors.push(...validateSlotCount(slots));
  errors.push(...validateFootwear(slots));
  errors.push(...validateGarmentCoverage(slots));
  errors.push(...validateRoleUniqueness(slots));

  // Only generate warnings if hard rules pass — avoids noise during invalid states
  const warnings = errors.length === 0 ? generateWarnings(slots) : [];

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Two-Score System: Recipe Alignment + Outfit Quality
// Used by the AI outfit composition service
// ---------------------------------------------------------------------------

/**
 * Recipe Alignment Score (0-100)
 * How well does this outfit match what the recipe asked for?
 * - Ingredient fidelity (materials, styles specified in recipe)
 * - Brand matching (if recipe specified brands)
 * - Season matching (recipe season vs actual fabrics)
 * - Query relevance (CLIP semantic similarity to search queries)
 */
export const RECIPE_ALIGNMENT_WEIGHTS = {
  ingredientFidelity:  0.60,  // Did we get the materials/styles specified?
  queryRelevance:      0.40,  // How well do products match search queries?
  seasonMatching:      0.00,  // Season is emergent from outfit, not prescribed by recipe
  brandMatching:       0.00,  // Brands are suggestions, not requirements
} as const;

/**
 * Outfit Quality Score (0-100)
 * How good is this outfit, independent of recipe?
 * - Color harmony (do colors work together?)
 * - Intentional contrast (style mixing unified by color/silhouette/material/tone?)
 * - Silhouette balance (well-proportioned?)
 * - General fashionability (would a stylist approve?)
 */
export const OUTFIT_QUALITY_WEIGHTS = {
  colorHarmony:           0.35,  // Do colors work together?
  intentionalContrast:    0.30,  // Style mixing with unifying element?
  silhouetteBalance:      0.25,  // Well-proportioned?
  generalFashionability:  0.10,  // Overall styling quality
} as const;

/** Score thresholds for classification */
export const SCORE_THRESHOLDS = {
  quality: {
    high: 70,
    medium: 50,
  },
  alignment: {
    high: 80,
    medium: 60,
  },
} as const;

/**
 * Compute Recipe Alignment Score
 */
export function computeRecipeAlignmentScore(components: {
  ingredientFidelity: number;
  queryRelevance: number;
  seasonMatching: number;
  brandMatching: number;
}): number {
  return Math.round(
    components.ingredientFidelity * RECIPE_ALIGNMENT_WEIGHTS.ingredientFidelity +
    components.queryRelevance     * RECIPE_ALIGNMENT_WEIGHTS.queryRelevance +
    components.seasonMatching     * RECIPE_ALIGNMENT_WEIGHTS.seasonMatching +
    components.brandMatching      * RECIPE_ALIGNMENT_WEIGHTS.brandMatching
  );
}

/**
 * Compute Outfit Quality Score
 *
 * @param components - Component scores (0-100 each)
 * @param components.colorHarmony - Color harmony score
 * @param components.intentionalContrast - Style mixing score (use computeIntentionalContrastScore)
 * @param components.silhouetteBalance - Silhouette balance score
 * @param components.generalFashionability - Overall styling quality
 * @returns Outfit Quality Score (0-100)
 *
 * @example
 * // Black leather jacket + black floral dress (edgy + feminine)
 * computeOutfitQualityScore({
 *   colorHarmony: 95,              // Monochrome black
 *   intentionalContrast: 95,       // Style mix unified by color
 *   silhouetteBalance: 90,         // Fitted jacket + flowy dress
 *   generalFashionability: 85
 * }) // → 93 (high quality, intentional contrast)
 */
export function computeOutfitQualityScore(components: {
  colorHarmony: number;
  intentionalContrast: number;
  silhouetteBalance: number;
  generalFashionability: number;
}): number {
  return Math.round(
    components.colorHarmony          * OUTFIT_QUALITY_WEIGHTS.colorHarmony +
    components.intentionalContrast   * OUTFIT_QUALITY_WEIGHTS.intentionalContrast +
    components.silhouetteBalance     * OUTFIT_QUALITY_WEIGHTS.silhouetteBalance +
    components.generalFashionability * OUTFIT_QUALITY_WEIGHTS.generalFashionability
  );
}

/**
 * Classification based on context
 */
export type OutfitContext = 'recipe-page' | 'discovery';
export type OutfitTier = 'primary' | 'secondary' | 'suppressed' | 'happy-accident';

/**
 * Determine outfit tier based on scores and context
 *
 * @param qualityScore - Outfit Quality Score (0-100)
 * @param alignmentScore - Recipe Alignment Score (0-100)
 * @param context - Where this outfit will be displayed
 * @returns tier classification
 */
export function getOutfitTier(
  qualityScore: number,
  alignmentScore: number,
  context: OutfitContext = 'recipe-page'
): OutfitTier {
  const qualityLevel =
    qualityScore >= SCORE_THRESHOLDS.quality.high ? 'high' :
    qualityScore >= SCORE_THRESHOLDS.quality.medium ? 'medium' : 'low';

  const alignmentLevel =
    alignmentScore >= SCORE_THRESHOLDS.alignment.high ? 'high' :
    alignmentScore >= SCORE_THRESHOLDS.alignment.medium ? 'medium' : 'low';

  // Suppress low-quality outfits regardless of context
  if (qualityLevel === 'low') {
    return 'suppressed';
  }

  if (context === 'recipe-page') {
    // Recipe page: Alignment is MORE important than quality
    // We want outfits that prove the recipe concept
    if (alignmentLevel === 'high' && qualityLevel === 'high') {
      return 'primary';  // Perfect match
    }
    if (alignmentLevel === 'high' || (alignmentLevel === 'medium' && qualityLevel === 'high')) {
      return 'secondary';  // Good enough
    }
    if (alignmentLevel === 'low' && qualityLevel === 'high') {
      return 'happy-accident';  // High quality but doesn't match recipe - could be new recipe
    }
    return 'suppressed';
  } else {
    // Discovery context: Quality is all that matters
    // Alignment is irrelevant when showing standalone outfits
    if (qualityLevel === 'high') {
      return 'primary';
    }
    return 'secondary';  // Medium quality still surfaces
  }
}

// ---------------------------------------------------------------------------
// Legacy API (backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use computeOutfitQualityScore instead */
export const OUTFIT_CONFIDENCE_THRESHOLDS = {
  primary:   75,
  secondary: 50,
  suppress:  0,
} as const;

/** @deprecated Use OUTFIT_QUALITY_WEIGHTS instead */
export const OUTFIT_CONFIDENCE_WEIGHTS = {
  styleRegisterCoherence:  0.25,
  colorHarmony:            0.25,
  silhouetteBalance:       0.20,
  occasionAlignment:       0.15,
  seasonFabricWeight:      0.15,
} as const;

/** @deprecated Use computeOutfitQualityScore instead */
export function computeOutfitConfidenceScore(scores: {
  styleRegisterCoherence:  number;
  colorHarmony:            number;
  silhouetteBalance:       number;
  occasionAlignment:       number;
  seasonFabricWeight:      number;
}): number {
  return Math.round(
    scores.styleRegisterCoherence  * OUTFIT_CONFIDENCE_WEIGHTS.styleRegisterCoherence  +
    scores.colorHarmony            * OUTFIT_CONFIDENCE_WEIGHTS.colorHarmony            +
    scores.silhouetteBalance       * OUTFIT_CONFIDENCE_WEIGHTS.silhouetteBalance       +
    scores.occasionAlignment       * OUTFIT_CONFIDENCE_WEIGHTS.occasionAlignment       +
    scores.seasonFabricWeight      * OUTFIT_CONFIDENCE_WEIGHTS.seasonFabricWeight
  );
}

/** @deprecated Use getOutfitTier instead */
export function getOutfitPoolTier(score: number): 'primary' | 'secondary' | 'suppressed' {
  if (score >= OUTFIT_CONFIDENCE_THRESHOLDS.primary)   return 'primary';
  if (score >= OUTFIT_CONFIDENCE_THRESHOLDS.secondary) return 'secondary';
  return 'suppressed';
}

// ---------------------------------------------------------------------------
// Style Register Reference (Soft Rules — for AI reasoning context)
// Not enforced in the recipe builder; used by the composition service
// ---------------------------------------------------------------------------

export const STYLE_REGISTERS = [
  'athletic',
  'casual',
  'smart-casual',
  'business-casual',
  'elevated',
  'formal',
] as const;

export type StyleRegister = (typeof STYLE_REGISTERS)[number];

export const STYLE_REGISTER_INDEX: Record<StyleRegister, number> = {
  'athletic':        0,
  'casual':          1,
  'smart-casual':    2,
  'business-casual': 3,
  'elevated':        4,
  'formal':          5,
};

/**
 * Returns the distance between two style registers (0-5).
 * Used to determine if style mixing is happening (distance ≥ 2).
 */
export function getRegisterDistance(a: StyleRegister, b: StyleRegister): number {
  return Math.abs(STYLE_REGISTER_INDEX[a] - STYLE_REGISTER_INDEX[b]);
}

/**
 * @deprecated Use getRegisterDistance and computeIntentionalContrastScore instead
 * Returns true if two style registers are compatible (adjacent ±1 or same).
 * Non-adjacent combinations may still be valid with a bridging element
 * (e.g., a blazer bridging casual → smart-casual), but that is evaluated
 * by the AI composition service, not here.
 */
export function areRegistersCompatible(a: StyleRegister, b: StyleRegister): boolean {
  return Math.abs(STYLE_REGISTER_INDEX[a] - STYLE_REGISTER_INDEX[b]) <= 1;
}

/**
 * Compute Intentional Contrast Score (0-100)
 *
 * Core philosophy: Style mixing is GOOD when there's a unifying element.
 * Non-adjacent style registers (edgy + feminine, athletic + elevated, etc.)
 * score HIGH if unified by color, silhouette, material, or tone.
 *
 * @param maxRegisterDistance - Max distance between any two items' style registers (0-5)
 * @param unifyingStrength - Strength of unifying elements (0-100)
 *   - Based on: max(colorHarmony, silhouetteBalance, materialConsistency, tonalConsistency)
 *
 * @returns Intentional Contrast Score (0-100)
 *
 * @example
 * // Black leather jacket + black floral dress (edgy + feminine, unified by monochrome)
 * computeIntentionalContrastScore(3, 95) // → 95 (BOOST for intentional contrast)
 *
 * // Neon athletic jacket + floral dress (athletic + feminine, no unifying element)
 * computeIntentionalContrastScore(3, 30) // → 30 (incoherent mixing)
 *
 * // Casual denim + casual tee (adjacent registers)
 * computeIntentionalContrastScore(0, 70) // → 85 (naturally coherent)
 */
export function computeIntentionalContrastScore(
  maxRegisterDistance: number,
  unifyingStrength: number
): number {
  if (maxRegisterDistance >= 2) {
    // Non-adjacent registers - style mixing is happening
    if (unifyingStrength >= 80) {
      // Strong unifying element → INTENTIONAL CONTRAST (BOOST)
      return 95;
    } else if (unifyingStrength >= 60) {
      // Moderate unifying element → acceptable mix
      return 70;
    } else {
      // Weak unifying element → incoherent mixing
      return 30;
    }
  } else {
    // Adjacent registers (≤1 distance) - naturally compatible
    return 85;
  }
}

/**
 * Compute Unifying Strength (0-100)
 *
 * Measures how strongly the outfit is unified by color, silhouette, material, or tone.
 * This is the max of all unifying element scores.
 *
 * @param unifyingElements - Scores for each unifying element type
 * @returns Maximum unifying element score (0-100)
 *
 * @example
 * // All-black outfit (monochrome unification)
 * computeUnifyingStrength({ colorHarmony: 95, silhouetteBalance: 70, materialConsistency: 60, tonalConsistency: 50 })
 * // → 95 (color harmony is strongest)
 *
 * // All leather outfit (material unification)
 * computeUnifyingStrength({ colorHarmony: 60, silhouetteBalance: 70, materialConsistency: 90, tonalConsistency: 80 })
 * // → 90 (material consistency is strongest)
 */
export function computeUnifyingStrength(unifyingElements: {
  colorHarmony: number;
  silhouetteBalance: number;
  materialConsistency?: number;
  tonalConsistency?: number;
}): number {
  return Math.max(
    unifyingElements.colorHarmony,
    unifyingElements.silhouetteBalance,
    unifyingElements.materialConsistency ?? 0,
    unifyingElements.tonalConsistency ?? 0
  );
}

// ---------------------------------------------------------------------------
// Style Mixing Examples: How the New Scoring System Works
// ---------------------------------------------------------------------------

/**
 * EXAMPLE 1: Edgy + Feminine (Distance = 3, Unified by Monochrome)
 * ✅ High Quality Outfit (Score: 93)
 *
 * Products:
 * - Black leather moto jacket (Style: edgy = index 1)
 * - Black floral midi dress (Style: feminine/elevated = index 4)
 * - Black ankle boots (Style: edgy = index 1)
 *
 * Scores:
 * - maxRegisterDistance = 3 (edgy to elevated)
 * - colorHarmony = 95 (monochrome black - strong harmony)
 * - silhouetteBalance = 90 (fitted jacket + flowy dress - good contrast)
 * - materialConsistency = 60 (leather + cotton + leather - moderate)
 * - tonalConsistency = 70 (all matte finishes)
 *
 * unifyingStrength = max(95, 90, 60, 70) = 95
 * intentionalContrast = computeIntentionalContrastScore(3, 95) = 95 (BOOST!)
 * generalFashionability = 85
 *
 * outfitQuality = 0.35*95 + 0.30*95 + 0.25*90 + 0.10*85 = 93
 *
 * Result: PRIMARY TIER - Intentional contrast successfully executed
 */

/**
 * EXAMPLE 2: Athletic + Elevated (Distance = 3, Unified by Sleek Silhouettes)
 * ✅ High Quality Outfit (Score: 88)
 *
 * Products:
 * - Technical nylon track pants (Style: athletic = index 0)
 * - Silk cami (Style: elevated = index 4)
 * - Minimalist heeled mules (Style: elevated = index 4)
 *
 * Scores:
 * - maxRegisterDistance = 4 (athletic to elevated)
 * - colorHarmony = 75 (neutral anchor: black pants + ivory cami)
 * - silhouetteBalance = 85 (slim track pants + fitted cami + sleek mules)
 * - materialConsistency = 50 (nylon + silk + leather - low)
 * - tonalConsistency = 90 (all sleek/luxe finishes - strong!)
 *
 * unifyingStrength = max(75, 85, 50, 90) = 90
 * intentionalContrast = computeIntentionalContrastScore(4, 90) = 95 (BOOST!)
 * generalFashionability = 80
 *
 * outfitQuality = 0.35*75 + 0.30*95 + 0.25*85 + 0.10*80 = 84
 *
 * Result: PRIMARY TIER - High-low mixing with tonal consistency
 */

/**
 * EXAMPLE 3: Casual + Formal (Distance = 3, Unified by Tailoring)
 * ✅ Good Quality Outfit (Score: 85)
 *
 * Products:
 * - Graphic band tee (Style: casual = index 1)
 * - Tailored wool trousers (Style: business-casual = index 3)
 * - Oxford loafers (Style: business-casual = index 3)
 *
 * Scores:
 * - maxRegisterDistance = 2 (casual to business-casual)
 * - colorHarmony = 80 (neutral anchor: grey tee + charcoal pants)
 * - silhouetteBalance = 85 (relaxed top + structured bottoms)
 * - materialConsistency = 40 (cotton + wool + leather)
 * - tonalConsistency = 65 (tee is casual, rest is polished)
 *
 * unifyingStrength = max(80, 85, 40, 65) = 85
 * intentionalContrast = computeIntentionalContrastScore(2, 85) = 95 (BOOST!)
 * generalFashionability = 80
 *
 * outfitQuality = 0.35*80 + 0.30*95 + 0.25*85 + 0.10*80 = 86
 *
 * Result: PRIMARY TIER - Successful high-low mixing
 */

/**
 * EXAMPLE 4: Grunge + Romantic (Distance = 3, Unified by Texture)
 * ✅ Good Quality Outfit (Score: 87)
 *
 * Products:
 * - Distressed band tee (Style: casual/grunge = index 1)
 * - Lace midi skirt (Style: elevated/romantic = index 4)
 * - Combat boots (Style: casual/edgy = index 1)
 *
 * Scores:
 * - maxRegisterDistance = 3 (casual to elevated)
 * - colorHarmony = 70 (black + cream - neutral anchor but not perfect)
 * - silhouetteBalance = 90 (fitted tee + full skirt + chunky boots)
 * - materialConsistency = 85 (all have texture: distressed + lace + leather)
 * - tonalConsistency = 80 (all have edge/texture)
 *
 * unifyingStrength = max(70, 90, 85, 80) = 90
 * intentionalContrast = computeIntentionalContrastScore(3, 90) = 95 (BOOST!)
 * generalFashionability = 75
 *
 * outfitQuality = 0.35*70 + 0.30*95 + 0.25*90 + 0.10*75 = 83
 *
 * Result: PRIMARY TIER - Texture unifies contrasting styles
 */

/**
 * EXAMPLE 5: Neon Athletic + Floral Feminine (Distance = 3, NO Unifying Element)
 * ❌ Low Quality Outfit (Score: 33)
 *
 * Products:
 * - Neon green athletic jacket (Style: athletic = index 0)
 * - Pastel floral midi dress (Style: elevated/romantic = index 4)
 * - Sport sandals (Style: athletic = index 0)
 *
 * Scores:
 * - maxRegisterDistance = 4 (athletic to elevated)
 * - colorHarmony = 20 (neon green + pastels - clash)
 * - silhouetteBalance = 40 (boxy jacket + flowy dress - not intentional)
 * - materialConsistency = 30 (nylon + cotton + rubber - no theme)
 * - tonalConsistency = 25 (athletic finishes + delicate florals - clash)
 *
 * unifyingStrength = max(20, 40, 30, 25) = 40
 * intentionalContrast = computeIntentionalContrastScore(4, 40) = 30 (PENALIZE)
 * generalFashionability = 40
 *
 * outfitQuality = 0.35*20 + 0.30*30 + 0.25*40 + 0.10*40 = 30
 *
 * Result: SUPPRESSED - No unifying element makes this chaotic, not stylish
 */

/**
 * EXAMPLE 6: Adjacent Registers (Distance = 1, Naturally Coherent)
 * ✅ Good Quality Outfit (Score: 85)
 *
 * Products:
 * - Linen trousers (Style: smart-casual = index 2)
 * - Silk cami (Style: elevated = index 4)
 * - Mule sandals (Style: elevated = index 4)
 *
 * Scores:
 * - maxRegisterDistance = 2 (smart-casual to elevated)
 * - colorHarmony = 90 (analogous: ivory + beige + tan)
 * - silhouetteBalance = 85 (relaxed pants + fitted top + sleek shoes)
 * - materialConsistency = 70 (natural fibers: linen + silk + leather)
 * - tonalConsistency = 80 (all elevated/luxe)
 *
 * unifyingStrength = max(90, 85, 70, 80) = 90
 * intentionalContrast = computeIntentionalContrastScore(2, 90) = 95 (BOOST!)
 * generalFashionability = 85
 *
 * outfitQuality = 0.35*90 + 0.30*95 + 0.25*85 + 0.10*85 = 90
 *
 * Result: PRIMARY TIER - Naturally coherent with strong execution
 */

// ---------------------------------------------------------------------------
// Neutral Colors (Soft Rules — color harmony)
// ---------------------------------------------------------------------------

export const NEUTRAL_COLORS = new Set([
  'black', 'white', 'ivory', 'cream', 'off-white',
  'beige', 'sand', 'camel', 'tan', 'khaki',
  'taupe', 'stone', 'grey', 'gray', 'charcoal',
  'navy', 'brown',
]);

export function isNeutral(color: string): boolean {
  return NEUTRAL_COLORS.has(color.toLowerCase().trim());
}

// ---------------------------------------------------------------------------
// Fabric Weight Season Guide (Soft Rules — season appropriateness)
// ---------------------------------------------------------------------------

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type FabricWeight = 'lightweight' | 'midweight' | 'heavyweight' | 'sheer';

export const SEASON_FABRIC_GUIDE: Record<Season, { preferred: FabricWeight[]; avoid: FabricWeight[] }> = {
  spring: { preferred: ['lightweight', 'midweight'],          avoid: ['heavyweight'] },
  summer: { preferred: ['lightweight', 'sheer'],              avoid: ['heavyweight'] },
  fall:   { preferred: ['midweight', 'heavyweight'],          avoid: ['sheer'] },
  winter: { preferred: ['heavyweight'],                       avoid: ['sheer', 'lightweight'] },
};

/**
 * Returns a season-fabric compatibility score (0–100).
 * 100 = preferred weight for season, 50 = neutral, 0 = avoid.
 */
export function getFabricSeasonScore(fabricWeight: FabricWeight, season: Season): number {
  const guide = SEASON_FABRIC_GUIDE[season];
  if (guide.preferred.includes(fabricWeight)) return 100;
  if (guide.avoid.includes(fabricWeight))     return 0;
  return 50;
}
