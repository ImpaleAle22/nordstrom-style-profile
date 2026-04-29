/**
 * Outfit Attribute Analysis
 *
 * Coverage calculation and gap identification for outfit inventory.
 * Helps identify which Style Pillars, Vibes, and Occasions are underrepresented.
 */

import type { StoredOutfit } from './outfit-storage';
import type { StylePillar, Vibe, Occasion, OccasionCategory } from './outfit-attributes';
import {
  STYLE_PILLARS,
  VIBES,
  OCCASIONS,
  ALL_OCCASIONS,
  getOccasionCategory
} from './outfit-attributes';
import { getAllOutfits } from './outfit-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface CoverageStats {
  total: number;
  tagged: number; // Outfits with attributes
  untagged: number; // Outfits without attributes

  byStylePillar: Record<StylePillar, number>;
  byVibe: Record<Vibe, number>;
  byOccasion: Record<Occasion, number>;
  byOccasionCategory: Record<OccasionCategory, number>;

  // Top combinations (for understanding common patterns)
  topCombinations: Array<{
    stylePillar: StylePillar | null;
    vibe: Vibe | null;
    occasion: Occasion | null;
    count: number;
  }>;

  // Formality distribution
  formalityDistribution: {
    veryCasual: number; // 1-1.5
    casual: number; // 1.5-2.5
    smartCasual: number; // 2.5-3.5
    businessCasual: number; // 3.5-4.5
    businessFormal: number; // 4.5-5.5
    blackTie: number; // 5.5-6
  };
}

export interface GapReport {
  underrepresentedPillars: Array<{
    pillar: StylePillar;
    count: number;
    idealCount: number;
    gapPercent: number;
  }>;

  underrepresentedVibes: Array<{
    vibe: Vibe;
    count: number;
    idealCount: number;
    gapPercent: number;
  }>;

  underrepresentedOccasions: Array<{
    occasion: Occasion;
    count: number;
    idealCount: number;
    gapPercent: number;
    category: OccasionCategory | null;
  }>;

  recommendations: string[];
}

// ============================================================================
// COVERAGE CALCULATION
// ============================================================================

/**
 * Calculate comprehensive coverage statistics
 */
export async function calculateCoverage(): Promise<CoverageStats> {
  const outfits = await getAllOutfits();

  // Initialize stats
  const stats: CoverageStats = {
    total: outfits.length,
    tagged: 0,
    untagged: 0,
    byStylePillar: {} as Record<StylePillar, number>,
    byVibe: {} as Record<Vibe, number>,
    byOccasion: {} as Record<Occasion, number>,
    byOccasionCategory: {} as Record<OccasionCategory, number>,
    topCombinations: [],
    formalityDistribution: {
      veryCasual: 0,
      casual: 0,
      smartCasual: 0,
      businessCasual: 0,
      businessFormal: 0,
      blackTie: 0
    }
  };

  // Initialize all pillars/vibes/occasions to 0
  STYLE_PILLARS.forEach(p => stats.byStylePillar[p] = 0);
  VIBES.forEach(v => stats.byVibe[v] = 0);
  ALL_OCCASIONS.forEach(o => stats.byOccasion[o] = 0);
  Object.keys(OCCASIONS).forEach(c => stats.byOccasionCategory[c as OccasionCategory] = 0);

  // Track combinations for pattern analysis
  const combinationMap = new Map<string, number>();

  // Aggregate counts
  for (const outfit of outfits) {
    if (!outfit.attributes) {
      stats.untagged++;
      continue;
    }

    stats.tagged++;

    // Style Pillar
    if (outfit.attributes.stylePillar) {
      stats.byStylePillar[outfit.attributes.stylePillar]++;
    }

    // Vibes (multi-valued)
    for (const vibe of outfit.attributes.vibes) {
      if (VIBES.includes(vibe as Vibe)) {
        stats.byVibe[vibe as Vibe]++;
      }
    }

    // Occasions (multi-valued)
    for (const occasion of outfit.attributes.occasions) {
      if (ALL_OCCASIONS.includes(occasion as Occasion)) {
        stats.byOccasion[occasion as Occasion]++;

        // Also count by category
        const category = getOccasionCategory(occasion as Occasion);
        if (category) {
          stats.byOccasionCategory[category]++;
        }
      }
    }

    // Formality distribution
    const formality = outfit.attributes.formality;
    if (formality <= 1.5) stats.formalityDistribution.veryCasual++;
    else if (formality <= 2.5) stats.formalityDistribution.casual++;
    else if (formality <= 3.5) stats.formalityDistribution.smartCasual++;
    else if (formality <= 4.5) stats.formalityDistribution.businessCasual++;
    else if (formality <= 5.5) stats.formalityDistribution.businessFormal++;
    else stats.formalityDistribution.blackTie++;

    // Track combinations (for pattern analysis)
    const primaryVibe = outfit.attributes.vibes[0] || null;
    const primaryOccasion = outfit.attributes.occasions[0] || null;
    const comboKey = `${outfit.attributes.stylePillar || 'null'}|${primaryVibe}|${primaryOccasion}`;
    combinationMap.set(comboKey, (combinationMap.get(comboKey) || 0) + 1);
  }

  // Extract top combinations
  stats.topCombinations = Array.from(combinationMap.entries())
    .map(([key, count]) => {
      const [pillar, vibe, occasion] = key.split('|');
      return {
        stylePillar: pillar === 'null' ? null : (pillar as StylePillar),
        vibe: vibe === 'null' ? null : (vibe as Vibe),
        occasion: occasion === 'null' ? null : (occasion as Occasion),
        count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 combinations

  return stats;
}

// ============================================================================
// GAP IDENTIFICATION
// ============================================================================

/**
 * Identify coverage gaps in the outfit inventory
 */
export function identifyGaps(
  stats: CoverageStats,
  options: {
    pillarThreshold?: number; // Percent of ideal (default: 0.5 = 50%)
    vibeThreshold?: number;
    occasionThreshold?: number;
  } = {}
): GapReport {
  const {
    pillarThreshold = 0.5,
    vibeThreshold = 0.3,
    occasionThreshold = 0.3
  } = options;

  const report: GapReport = {
    underrepresentedPillars: [],
    underrepresentedVibes: [],
    underrepresentedOccasions: [],
    recommendations: []
  };

  // === STYLE PILLAR GAPS ===
  // Ideal: Uniform distribution across 9 pillars
  const idealPerPillar = stats.tagged / STYLE_PILLARS.length;

  for (const pillar of STYLE_PILLARS) {
    const count = stats.byStylePillar[pillar];
    const gapPercent = ((idealPerPillar - count) / idealPerPillar) * 100;

    if (count < idealPerPillar * pillarThreshold) {
      report.underrepresentedPillars.push({
        pillar,
        count,
        idealCount: Math.round(idealPerPillar),
        gapPercent: Math.round(gapPercent)
      });
    }
  }

  // Sort by gap (worst first)
  report.underrepresentedPillars.sort((a, b) => b.gapPercent - a.gapPercent);

  // === VIBE GAPS ===
  // Ideal: Some vibes more common than others, but all should have representation
  const idealPerVibe = stats.tagged / VIBES.length;

  for (const vibe of VIBES) {
    const count = stats.byVibe[vibe];
    const gapPercent = ((idealPerVibe - count) / idealPerVibe) * 100;

    if (count < idealPerVibe * vibeThreshold) {
      report.underrepresentedVibes.push({
        vibe,
        count,
        idealCount: Math.round(idealPerVibe),
        gapPercent: Math.round(gapPercent)
      });
    }
  }

  report.underrepresentedVibes.sort((a, b) => b.gapPercent - a.gapPercent);

  // === OCCASION GAPS ===
  // Ideal: Varies by occasion type (everyday more common than formal)
  // Use weighted ideal based on occasion category
  const occasionWeights: Record<OccasionCategory, number> = {
    Everyday: 3.0, // Most common
    CasualSocial: 2.5,
    Work: 2.0,
    GoingOut: 1.5,
    SportActive: 1.5,
    Travel: 1.0,
    Formal: 0.8,
    Wedding: 0.5,
    School: 0.5 // Least common
  };

  const totalWeight = Object.values(occasionWeights).reduce((sum, w) => sum + w, 0);

  for (const occasion of ALL_OCCASIONS) {
    const category = getOccasionCategory(occasion);
    const weight = category ? occasionWeights[category] : 1.0;
    const idealCount = (stats.tagged * weight) / totalWeight;

    const count = stats.byOccasion[occasion];
    const gapPercent = ((idealCount - count) / idealCount) * 100;

    if (count < idealCount * occasionThreshold) {
      report.underrepresentedOccasions.push({
        occasion,
        count,
        idealCount: Math.round(idealCount),
        gapPercent: Math.round(gapPercent),
        category
      });
    }
  }

  report.underrepresentedOccasions.sort((a, b) => b.gapPercent - a.gapPercent);

  // === GENERATE RECOMMENDATIONS ===
  report.recommendations = generateRecommendations(report, stats);

  return report;
}

/**
 * Generate actionable recommendations from gap analysis
 */
function generateRecommendations(gap: GapReport, stats: CoverageStats): string[] {
  const recommendations: string[] = [];

  // Top 3 pillar gaps
  if (gap.underrepresentedPillars.length > 0) {
    const top3 = gap.underrepresentedPillars.slice(0, 3);
    recommendations.push(
      `**Style Pillar Priority**: Create recipes for ${top3.map(p => p.pillar).join(', ')} (${top3[0].gapPercent}% under ideal)`
    );
  }

  // Vibe gaps
  if (gap.underrepresentedVibes.length > 0) {
    const top3 = gap.underrepresentedVibes.slice(0, 3);
    recommendations.push(
      `**Vibe Diversity**: Underrepresented vibes include ${top3.map(v => v.vibe).join(', ')}`
    );
  }

  // Occasion gaps by category
  const occasionsByCategory = gap.underrepresentedOccasions.reduce((acc, o) => {
    if (o.category) {
      if (!acc[o.category]) acc[o.category] = [];
      acc[o.category].push(o.occasion);
    }
    return acc;
  }, {} as Record<OccasionCategory, Occasion[]>);

  if (Object.keys(occasionsByCategory).length > 0) {
    const topCategory = Object.entries(occasionsByCategory)[0];
    recommendations.push(
      `**Occasion Gaps**: ${topCategory[0]} category needs coverage (${topCategory[1].slice(0, 3).join(', ')})`
    );
  }

  // Formality balance
  const formalityTotal = Object.values(stats.formalityDistribution).reduce((sum, n) => sum + n, 0);
  const casualPercent = ((stats.formalityDistribution.veryCasual + stats.formalityDistribution.casual) / formalityTotal) * 100;
  const formalPercent = ((stats.formalityDistribution.businessFormal + stats.formalityDistribution.blackTie) / formalityTotal) * 100;

  if (casualPercent > 70) {
    recommendations.push(
      `**Formality Imbalance**: ${casualPercent.toFixed(0)}% casual outfits. Consider more business and formal recipes.`
    );
  } else if (formalPercent > 40) {
    recommendations.push(
      `**Formality Imbalance**: ${formalPercent.toFixed(0)}% formal outfits. Consider more casual and everyday recipes.`
    );
  }

  return recommendations;
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Export coverage report as CSV
 */
export function exportCoverageToCSV(stats: CoverageStats): string {
  let csv = 'Category,Item,Count,Percentage\n';

  // Style Pillars
  STYLE_PILLARS.forEach(pillar => {
    const count = stats.byStylePillar[pillar];
    const percent = ((count / stats.tagged) * 100).toFixed(1);
    csv += `Style Pillar,${pillar},${count},${percent}%\n`;
  });

  // Vibes
  VIBES.forEach(vibe => {
    const count = stats.byVibe[vibe];
    const percent = ((count / stats.tagged) * 100).toFixed(1);
    csv += `Vibe,${vibe},${count},${percent}%\n`;
  });

  // Occasions
  ALL_OCCASIONS.forEach(occasion => {
    const count = stats.byOccasion[occasion];
    const percent = ((count / stats.tagged) * 100).toFixed(1);
    const category = getOccasionCategory(occasion);
    csv += `Occasion (${category}),${occasion},${count},${percent}%\n`;
  });

  return csv;
}

/**
 * Export gap report as JSON
 */
export function exportGapReportToJSON(gap: GapReport): string {
  return JSON.stringify(gap, null, 2);
}
