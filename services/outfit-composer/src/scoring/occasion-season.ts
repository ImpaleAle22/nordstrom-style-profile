/**
 * Occasion Alignment & Season Appropriateness Scoring
 *
 * Parts 2.3 and 2.4 of OUTFIT-BUILDING-RULES.md
 */

import type { Product, CustomerSignals, Season, FabricWeight } from '../types';

// ============================================================================
// OCCASION ALIGNMENT (15% of confidence score)
// ============================================================================

const THEME_OCCASION_MAP: Record<string, string[]> = {
  'hiking': ['hiking/outdoor', 'active/sport', 'casual', 'weekend'],
  'datenight': ['date night', 'evening', 'casual', 'elevated'],
};

/**
 * Score how well products align with the occasion/theme
 */
export function scoreOccasionAlignment(
  products: Product[],
  theme: string
): number {
  if (products.length === 0) return 0;

  const targetOccasions = THEME_OCCASION_MAP[theme.toLowerCase()] || [];
  if (targetOccasions.length === 0) return 75; // neutral when theme not recognized

  let matchCount = 0;
  let totalProducts = products.length;

  for (const product of products) {
    const productOccasions = product.occasions || [];
    const hasMatch = targetOccasions.some((target) =>
      productOccasions.some((po) => po.toLowerCase().includes(target.toLowerCase()))
    );

    if (hasMatch) matchCount++;
  }

  const matchRatio = matchCount / totalProducts;

  // Score based on match ratio
  if (matchRatio >= 0.8) return 100; // 80%+ products match
  if (matchRatio >= 0.6) return 90;  // 60-79% match
  if (matchRatio >= 0.4) return 75;  // 40-59% match
  if (matchRatio >= 0.2) return 60;  // 20-39% match

  return 40; // Less than 20% match
}

// ============================================================================
// SEASON / FABRIC WEIGHT APPROPRIATENESS (15% of confidence score)
// ============================================================================

const SEASON_FABRIC_GUIDE: Record<Season, { preferred: FabricWeight[]; avoid: FabricWeight[] }> = {
  spring: { preferred: ['lightweight', 'midweight'], avoid: ['heavyweight'] },
  summer: { preferred: ['lightweight', 'sheer'], avoid: ['heavyweight'] },
  fall: { preferred: ['midweight', 'heavyweight'], avoid: ['sheer'] },
  winter: { preferred: ['heavyweight'], avoid: ['sheer', 'lightweight'] },
};

const SEASON_MATERIAL_PREFERENCE: Record<Season, { preferred: string[]; avoid: string[] }> = {
  spring: {
    preferred: ['cotton', 'linen', 'chambray', 'lightweight', 'breathable'],
    avoid: ['wool', 'fleece', 'down', 'insulated', 'heavyweight'],
  },
  summer: {
    preferred: ['linen', 'cotton', 'lightweight', 'breathable', 'sheer', 'mesh'],
    avoid: ['wool', 'fleece', 'cashmere', 'heavyweight', 'insulated'],
  },
  fall: {
    preferred: ['wool', 'cashmere', 'corduroy', 'flannel', 'denim', 'layering'],
    avoid: ['linen', 'sheer', 'very lightweight'],
  },
  winter: {
    preferred: ['wool', 'cashmere', 'fleece', 'down', 'insulated', 'heavyweight'],
    avoid: ['linen', 'sheer', 'lightweight', 'sleeveless'],
  },
};

/**
 * Infer fabric weight from product materials and features
 */
function inferFabricWeight(product: Product): FabricWeight | null {
  const materials = product.materials?.map((m) => m.toLowerCase()) || [];
  const title = product.title.toLowerCase();
  const features = product.productFeatures?.map((f) => f.toLowerCase()) || [];

  // Check for explicit weight indicators
  if (features.includes('heavyweight') || materials.includes('heavyweight')) return 'heavyweight';
  if (features.includes('lightweight') || materials.includes('lightweight')) return 'lightweight';
  if (features.includes('midweight') || materials.includes('midweight')) return 'midweight';

  // Infer from materials
  const heavyMaterials = ['wool', 'fleece', 'down', 'cashmere', 'insulated'];
  const lightMaterials = ['linen', 'mesh', 'chiffon', 'sheer'];

  if (materials.some((m) => heavyMaterials.includes(m))) return 'heavyweight';
  if (materials.some((m) => lightMaterials.includes(m))) return 'lightweight';
  if (materials.includes('cotton') || materials.includes('denim')) return 'midweight';

  // Check title for clues
  if (title.includes('puffer') || title.includes('insulated')) return 'heavyweight';
  if (title.includes('tank') || title.includes('sheer')) return 'lightweight';

  return null; // unknown
}

/**
 * Score season/fabric weight appropriateness for a single product
 */
function scoreProductSeasonFit(product: Product, season: Season): number {
  const fabricWeight = inferFabricWeight(product);
  const guide = SEASON_FABRIC_GUIDE[season];
  const materialPrefs = SEASON_MATERIAL_PREFERENCE[season];

  let score = 50; // start neutral

  // Check fabric weight
  if (fabricWeight) {
    if (guide.preferred.includes(fabricWeight)) {
      score += 30;
    } else if (guide.avoid.includes(fabricWeight)) {
      score -= 30;
    }
  }

  // Check materials
  const materials = product.materials?.map((m) => m.toLowerCase()) || [];
  const hasPreferred = materials.some((m) =>
    materialPrefs.preferred.some((pref) => m.includes(pref))
  );
  const hasAvoided = materials.some((m) =>
    materialPrefs.avoid.some((avoid) => m.includes(avoid))
  );

  if (hasPreferred) score += 20;
  if (hasAvoided) score -= 20;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Score season appropriateness across outfit (0-100)
 *
 * Also checks for outerwear presence in fall/winter
 */
export function scoreSeasonFabricWeight(
  products: Product[],
  signals: CustomerSignals
): number {
  if (products.length === 0) return 0;

  const season = signals.season === 'spring' ? 'spring' : 'fall';

  // Score each product
  const productScores = products.map((p) => scoreProductSeasonFit(p, season));
  const avgScore = productScores.reduce((sum, s) => sum + s, 0) / productScores.length;

  // Bonus: check for outerwear in fall (recommended but not required)
  if (season === 'fall') {
    const hasOuterwear = products.some((p) =>
      p.productType1 === 'Outerwear' || p.productType1 === 'Jacket/Sportcoat'
    );

    // Small bonus for having outerwear in fall
    return hasOuterwear ? Math.min(100, avgScore + 5) : avgScore;
  }

  return Math.round(avgScore);
}

/**
 * Get detailed season/occasion analysis for debugging
 */
export function analyzeSeasonOccasion(
  products: Product[],
  theme: string,
  signals: CustomerSignals
): {
  occasionScore: number;
  seasonScore: number;
  details: Array<{
    product: string;
    occasions: string[];
    materials: string[];
    seasonFit: number;
  }>;
} {
  const season = signals.season === 'spring' ? 'spring' : 'fall';

  const details = products.map((p) => ({
    product: `${p.brand} ${p.title}`,
    occasions: p.occasions || [],
    materials: p.materials || [],
    seasonFit: scoreProductSeasonFit(p, season),
  }));

  return {
    occasionScore: scoreOccasionAlignment(products, theme),
    seasonScore: scoreSeasonFabricWeight(products, signals),
    details,
  };
}
