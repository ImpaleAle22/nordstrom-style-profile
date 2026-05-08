/**
 * Attribute Validation Rules
 *
 * Cross-checks AI-extracted attributes against rules-extracted attributes
 * to catch logical inconsistencies and reject hallucinated values.
 *
 * Example: If rules say "long sleeve", AI can't add "cap sleeve" style
 * because cap sleeves are by definition short.
 */

export interface ExtractedAttributes {
  // From rules (trusted source)
  materials?: string[];
  fit?: string;
  sleeve_style?: string;
  neckline?: string;
  waistline?: string;
  silhouette?: string;

  // Metadata
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: string[];
  warnings: string[];
  resolution?: {
    attribute: string;
    action: 'reject_ai' | 'downgrade_confidence' | 'flag_review' | 'accept_both';
    reason: string;
  }[];
}

// ============================================================================
// INCOMPATIBILITY RULES
// ============================================================================

/**
 * Sleeve length implications
 * Some sleeve styles have inherent length constraints
 */
const SLEEVE_LENGTH_CONSTRAINTS: Record<string, string[]> = {
  // These styles can ONLY be short
  'cap sleeve': ['short', 'very short'],
  'flutter sleeve': ['short', 'very short'],
  'sleeveless': ['none'],

  // These can be various lengths
  'puff sleeve': ['short', 'long', '3/4'],
  'bell sleeve': ['long', '3/4'],
  'bishop sleeve': ['long'],
  'raglan': ['short', 'long', '3/4'],

  // Straps
  'spaghetti strap': ['none'],
  'tank': ['none'],
};

/**
 * Neckline incompatibilities
 * Some necklines exclude certain sleeve types
 */
const NECKLINE_SLEEVE_CONSTRAINTS: Record<string, {
  incompatible_sleeves?: string[];
  requires_sleeves?: boolean;
}> = {
  'strapless': {
    incompatible_sleeves: ['long sleeve', 'short sleeve', 'cap sleeve', '3/4 sleeve'],
    requires_sleeves: false,
  },
  'halter': {
    incompatible_sleeves: ['long sleeve', 'short sleeve', 'cap sleeve'],
    requires_sleeves: false,
  },
  'off-shoulder': {
    incompatible_sleeves: ['cap sleeve', 'flutter sleeve'],
    requires_sleeves: false,
  },
  'one-shoulder': {
    incompatible_sleeves: ['long sleeve', '3/4 sleeve'],
    requires_sleeves: false,
  },
};

/**
 * Fit vs Silhouette consistency
 * Some combinations don't make sense
 */
const FIT_SILHOUETTE_CONFLICTS: Array<{
  fit: string;
  incompatible_silhouettes: string[];
  reason: string;
}> = [
  {
    fit: 'fitted',
    incompatible_silhouettes: ['oversized', 'loose', 'boxy'],
    reason: 'Fitted implies close to body, conflicts with oversized/loose',
  },
  {
    fit: 'oversized',
    incompatible_silhouettes: ['bodycon', 'fitted', 'slim'],
    reason: 'Oversized implies loose, conflicts with fitted silhouettes',
  },
  {
    fit: 'tight',
    incompatible_silhouettes: ['relaxed', 'loose', 'oversized'],
    reason: 'Tight conflicts with loose silhouettes',
  },
];

/**
 * Material plausibility
 * Reject obvious AI hallucinations when rules state specific materials
 */
const MATERIAL_CONFLICTS: Array<{
  rules_material: string[];
  ai_incompatible: string[];
  reason: string;
}> = [
  {
    rules_material: ['wool', 'cashmere', 'alpaca'],
    ai_incompatible: ['polyester', 'nylon', 'spandex'],
    reason: 'Natural luxury fibers stated in text, AI seeing synthetic - trust text',
  },
  {
    rules_material: ['cotton', 'linen'],
    ai_incompatible: ['leather', 'suede', 'faux leather'],
    reason: 'Natural plant fibers stated in text, AI seeing leather - trust text',
  },
  {
    rules_material: ['silk'],
    ai_incompatible: ['cotton', 'polyester'],
    reason: 'Silk explicitly stated, AI seeing common fabrics - trust text',
  },
  {
    rules_material: ['denim'],
    ai_incompatible: ['jersey', 'knit'],
    reason: 'Denim is woven, AI seeing knit construction - trust text',
  },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate sleeve attributes
 */
function validateSleeves(
  rulesAttrs: ExtractedAttributes,
  aiAttrs: ExtractedAttributes
): { conflicts: string[]; resolution?: any } {
  const conflicts: string[] = [];
  const resolution: any[] = [];

  // Extract sleeve info
  const rulesSleeve = rulesAttrs.sleeve_style?.toLowerCase();
  const aiSleeve = aiAttrs.sleeve_style?.toLowerCase();

  if (!rulesSleeve || !aiSleeve) return { conflicts };

  // Check if AI sleeve style conflicts with stated sleeve length
  // e.g., rules say "long sleeve", AI says "cap sleeve" (cap = always short)
  const aiSleeveConstraints = SLEEVE_LENGTH_CONSTRAINTS[aiSleeve];

  if (aiSleeveConstraints) {
    // Check if rules mention length
    if (rulesSleeve.includes('long') && !aiSleeveConstraints.includes('long')) {
      conflicts.push(
        `Rules say "${rulesSleeve}", but AI suggests "${aiSleeve}" which can only be ${aiSleeveConstraints.join('/')} length`
      );
      resolution.push({
        attribute: 'sleeve_style',
        action: 'reject_ai',
        reason: 'AI sleeve style incompatible with stated sleeve length',
      });
    }

    if (rulesSleeve.includes('short') && aiSleeveConstraints.includes('long') && !aiSleeveConstraints.includes('short')) {
      conflicts.push(
        `Rules say "${rulesSleeve}", but AI suggests "${aiSleeve}" which is typically long`
      );
      resolution.push({
        attribute: 'sleeve_style',
        action: 'reject_ai',
        reason: 'AI sleeve style incompatible with stated sleeve length',
      });
    }
  }

  return { conflicts, resolution: resolution.length > 0 ? resolution : undefined };
}

/**
 * Validate neckline + sleeve compatibility
 */
function validateNecklineSleeveCompatibility(
  rulesAttrs: ExtractedAttributes,
  aiAttrs: ExtractedAttributes
): { conflicts: string[]; resolution?: any } {
  const conflicts: string[] = [];
  const resolution: any[] = [];

  const neckline = (rulesAttrs.neckline || aiAttrs.neckline)?.toLowerCase();
  const sleeveRules = rulesAttrs.sleeve_style?.toLowerCase();
  const sleeveAI = aiAttrs.sleeve_style?.toLowerCase();

  if (!neckline) return { conflicts };

  const constraints = NECKLINE_SLEEVE_CONSTRAINTS[neckline];
  if (!constraints) return { conflicts };

  // Check if AI is adding incompatible sleeves
  if (sleeveAI && constraints.incompatible_sleeves) {
    const isIncompatible = constraints.incompatible_sleeves.some(
      incomp => sleeveAI.includes(incomp)
    );

    if (isIncompatible) {
      conflicts.push(
        `Neckline "${neckline}" is incompatible with sleeve style "${sleeveAI}"`
      );
      resolution.push({
        attribute: 'sleeve_style',
        action: 'reject_ai',
        reason: `${neckline} necklines cannot have ${sleeveAI}`,
      });
    }
  }

  // Check if rules already stated incompatible sleeves
  if (sleeveRules && constraints.incompatible_sleeves) {
    const isIncompatible = constraints.incompatible_sleeves.some(
      incomp => sleeveRules.includes(incomp)
    );

    if (isIncompatible) {
      conflicts.push(
        `WARNING: Rules extracted incompatible combination: ${neckline} + ${sleeveRules}`
      );
      resolution.push({
        attribute: 'neckline',
        action: 'flag_review',
        reason: 'Description contains contradictory attributes - needs manual check',
      });
    }
  }

  return { conflicts, resolution: resolution.length > 0 ? resolution : undefined };
}

/**
 * Validate fit vs silhouette consistency
 */
function validateFitSilhouette(
  rulesAttrs: ExtractedAttributes,
  aiAttrs: ExtractedAttributes
): { conflicts: string[]; resolution?: any } {
  const conflicts: string[] = [];
  const resolution: any[] = [];

  const rulesFit = rulesAttrs.fit?.toLowerCase();
  const aiSilhouette = aiAttrs.silhouette?.toLowerCase();

  if (!rulesFit || !aiSilhouette) return { conflicts };

  // Check for known conflicts
  for (const rule of FIT_SILHOUETTE_CONFLICTS) {
    if (rulesFit.includes(rule.fit)) {
      const hasConflict = rule.incompatible_silhouettes.some(
        incomp => aiSilhouette.includes(incomp)
      );

      if (hasConflict) {
        conflicts.push(
          `Fit "${rulesFit}" from rules conflicts with AI silhouette "${aiSilhouette}": ${rule.reason}`
        );
        resolution.push({
          attribute: 'silhouette',
          action: 'reject_ai',
          reason: rule.reason,
        });
      }
    }
  }

  return { conflicts, resolution: resolution.length > 0 ? resolution : undefined };
}

/**
 * Validate materials consistency
 */
function validateMaterials(
  rulesAttrs: ExtractedAttributes,
  aiAttrs: ExtractedAttributes
): { conflicts: string[]; resolution?: any } {
  const conflicts: string[] = [];
  const resolution: any[] = [];

  const rulesMaterials = rulesAttrs.materials?.map(m => m.toLowerCase()) || [];
  const aiMaterials = aiAttrs.materials?.map(m => m.toLowerCase()) || [];

  if (rulesMaterials.length === 0 || aiMaterials.length === 0) {
    return { conflicts };
  }

  // Check if AI contradicts explicit materials from rules
  for (const conflictRule of MATERIAL_CONFLICTS) {
    const rulesHasExplicit = conflictRule.rules_material.some(
      mat => rulesMaterials.includes(mat.toLowerCase())
    );

    const aiHasIncompatible = conflictRule.ai_incompatible.some(
      mat => aiMaterials.includes(mat.toLowerCase())
    );

    if (rulesHasExplicit && aiHasIncompatible) {
      conflicts.push(
        `Materials conflict: Rules state ${rulesMaterials.join(', ')} (from description), ` +
        `but AI suggests ${aiMaterials.join(', ')}. ${conflictRule.reason}`
      );
      resolution.push({
        attribute: 'materials',
        action: 'reject_ai',
        reason: 'Rules extracted explicit materials from text - trust text over vision',
      });
    }
  }

  return { conflicts, resolution: resolution.length > 0 ? resolution : undefined };
}

// ============================================================================
// MAIN VALIDATION
// ============================================================================

/**
 * Validate AI-extracted attributes against rules-extracted attributes
 *
 * @param rulesAttrs - Attributes extracted from text (trusted)
 * @param aiAttrs - Attributes extracted from vision (to validate)
 * @returns Validation result with conflicts and recommended resolutions
 */
export function validateAIAttributes(
  rulesAttrs: ExtractedAttributes,
  aiAttrs: ExtractedAttributes
): ValidationResult {
  const allConflicts: string[] = [];
  const allResolutions: any[] = [];

  // Run all validation checks
  const checks = [
    validateSleeves(rulesAttrs, aiAttrs),
    validateNecklineSleeveCompatibility(rulesAttrs, aiAttrs),
    validateFitSilhouette(rulesAttrs, aiAttrs),
    validateMaterials(rulesAttrs, aiAttrs),
  ];

  for (const check of checks) {
    if (check.conflicts.length > 0) {
      allConflicts.push(...check.conflicts);
    }
    if (check.resolution) {
      allResolutions.push(...check.resolution);
    }
  }

  return {
    valid: allConflicts.length === 0,
    conflicts: allConflicts,
    warnings: [],
    resolution: allResolutions.length > 0 ? allResolutions : undefined,
  };
}

/**
 * Merge rules and AI attributes with validation
 *
 * @param rulesAttrs - Trusted attributes from text
 * @param aiAttrs - AI attributes (to be validated)
 * @returns Merged attributes with conflicts resolved
 */
export function mergeAttributesWithValidation(
  rulesAttrs: ExtractedAttributes,
  aiAttrs: ExtractedAttributes
): {
  merged: ExtractedAttributes;
  validation: ValidationResult;
} {
  const validation = validateAIAttributes(rulesAttrs, aiAttrs);
  const merged = { ...rulesAttrs };

  // Apply AI attributes, respecting validation resolutions
  for (const [key, value] of Object.entries(aiAttrs)) {
    // Check if this attribute should be rejected
    const shouldReject = validation.resolution?.some(
      r => r.attribute === key && r.action === 'reject_ai'
    );

    if (shouldReject) {
      // Keep rules value, reject AI
      continue;
    }

    // Only add AI value if rules don't have it
    if (!merged[key]) {
      merged[key] = value;
    }
  }

  return { merged, validation };
}

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * Example usage:
 *
 * const rulesAttrs = {
 *   sleeve_style: "long sleeve",
 *   materials: ["wool", "cashmere"]
 * };
 *
 * const aiAttrs = {
 *   sleeve_style: "cap sleeve",  // AI hallucinated
 *   materials: ["polyester"],     // AI misidentified
 *   neckline: "v-neck"           // AI filled gap - OK
 * };
 *
 * const { merged, validation } = mergeAttributesWithValidation(rulesAttrs, aiAttrs);
 *
 * // Result:
 * // merged = {
 * //   sleeve_style: "long sleeve",  // Kept rules (rejected AI)
 * //   materials: ["wool", "cashmere"], // Kept rules (rejected AI)
 * //   neckline: "v-neck"  // Added from AI (no conflict)
 * // }
 *
 * // validation.conflicts = [
 * //   "Rules say long sleeve, but AI suggests cap sleeve which can only be short/very short",
 * //   "Materials conflict: Rules state wool, cashmere but AI suggests polyester"
 * // ]
 */
