/**
 * Pillar Normalization
 * Ensures only canonical style pillars are used
 */

// Canonical style pillars (9 pillars)
export const CANONICAL_PILLARS = [
  'classic',
  'minimal',
  'romantic',
  'bohemian',
  'maximal',
  'casual',
  'streetwear',
  'athletic',
  'utility',
] as const;

export type CanonicalPillar = typeof CANONICAL_PILLARS[number];

// Mapping of non-canonical names to canonical pillars
const PILLAR_ALIASES: Record<string, CanonicalPillar> = {
  // Common aliases
  'minimalist': 'minimal',
  'modern': 'minimal',
  'contemporary': 'minimal',
  'sleek': 'minimal',

  'edgy': 'streetwear',
  'urban': 'streetwear',
  'street': 'streetwear',

  'sporty': 'athletic',
  'sport': 'athletic',
  'active': 'athletic',

  'boho': 'bohemian',
  'bohemian-chic': 'bohemian',

  'maximalist': 'maximal',
  'bold': 'maximal',

  'timeless': 'classic',
  'traditional': 'classic',
  'preppy': 'classic',

  'relaxed': 'casual',
  'everyday': 'casual',

  'feminine': 'romantic',
  'soft': 'romantic',

  'functional': 'utility',
  'workwear': 'utility',
  'practical': 'utility',

  // Fashion Forward was never a real pillar - map to closest
  'fashionforward': 'streetwear',
  'fashion-forward': 'streetwear',
  'fashion_forward': 'streetwear',
  'trendy': 'streetwear',
};

/**
 * Normalize a pillar name to canonical form
 * Returns null if the pillar cannot be mapped
 */
export function normalizePillarName(pillarName: string): CanonicalPillar | null {
  const normalized = pillarName.toLowerCase().trim();

  // Check if already canonical
  if (CANONICAL_PILLARS.includes(normalized as CanonicalPillar)) {
    return normalized as CanonicalPillar;
  }

  // Check aliases
  if (normalized in PILLAR_ALIASES) {
    return PILLAR_ALIASES[normalized];
  }

  // Cannot map
  console.warn(`⚠️ Non-canonical pillar name: "${pillarName}" - skipping`);
  return null;
}

/**
 * Normalize a pillars object to only include canonical pillars
 * Merges weights if multiple non-canonical names map to the same canonical pillar
 */
export function normalizePillars(pillars: Record<string, number>): Record<CanonicalPillar, number> {
  const normalized: Partial<Record<CanonicalPillar, number>> = {};

  for (const [pillarName, weight] of Object.entries(pillars)) {
    const canonical = normalizePillarName(pillarName);

    if (canonical) {
      // If this canonical pillar already has a weight, add to it
      normalized[canonical] = (normalized[canonical] || 0) + weight;
    }
  }

  return normalized as Record<CanonicalPillar, number>;
}

/**
 * Validate that a pillars object only contains canonical pillars
 * Returns warnings for any non-canonical pillars found
 */
export function validatePillars(pillars: Record<string, number>): {
  isValid: boolean;
  warnings: string[];
  normalized: Record<CanonicalPillar, number>;
} {
  const warnings: string[] = [];
  const normalized = normalizePillars(pillars);

  for (const pillarName of Object.keys(pillars)) {
    const canonical = normalizePillarName(pillarName);
    if (!canonical) {
      warnings.push(`Non-canonical pillar "${pillarName}" cannot be mapped - data may be incorrect`);
    } else if (canonical !== pillarName.toLowerCase()) {
      warnings.push(`Pillar "${pillarName}" mapped to canonical "${canonical}"`);
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    normalized,
  };
}

/**
 * Check if a string is a canonical pillar name
 */
export function isCanonicalPillar(pillarName: string): pillarName is CanonicalPillar {
  return CANONICAL_PILLARS.includes(pillarName.toLowerCase() as CanonicalPillar);
}
