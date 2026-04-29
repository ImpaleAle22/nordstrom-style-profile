/**
 * Tagging Metrics Analysis
 *
 * Analyzes outfit tagging results to measure diversity and quality.
 * Used for validating improvements before running full batch.
 */

import { getAllOutfits } from './outfit-storage';
import type { StoredOutfit } from './outfit-storage';

export interface TaggingMetrics {
  totalOutfits: number;
  taggedOutfits: number;

  // Style Pillar Distribution
  stylePillarDistribution: Record<string, number>;
  stylePillarPercentages: Record<string, number>;

  // Vibe Distribution
  vibeDistribution: Record<string, number>;
  vibePercentages: Record<string, number>;

  // Occasion Distribution (top 20)
  occasionDistribution: Record<string, number>;
  occasionPercentages: Record<string, number>;
  avgOccasionsPerOutfit: number;

  // Tagging Approach
  rulesOnly: number;
  aiAssisted: number;
  hybrid: number;
  aiCallRate: number; // Percentage that triggered AI

  // Diversity Metrics
  diversityScore: {
    casualPercentage: number; // Target: ≤ 25%
    minPillarPercentage: number; // Target: ≥ 5%
    pillarsRepresented: number; // Target: 9/9
    vibesRepresented: number;
    passesThreshold: boolean;
  };
}

/**
 * Analyze tagging results for metrics
 */
export async function analyzeTaggingMetrics(sampleSize?: number): Promise<TaggingMetrics> {
  const allOutfits = await getAllOutfits();

  // Filter to tagged outfits only
  const taggedOutfits = allOutfits.filter(o => o.attributes);

  // Apply sample size if specified
  const outfitsToAnalyze = sampleSize
    ? taggedOutfits.slice(0, sampleSize)
    : taggedOutfits;

  const totalOutfits = outfitsToAnalyze.length;

  // Initialize counters
  const stylePillarCounts: Record<string, number> = {};
  const vibeCounts: Record<string, number> = {};
  const occasionCounts: Record<string, number> = {};

  let rulesOnly = 0;
  let aiAssisted = 0;
  let hybrid = 0;
  let totalOccasions = 0;

  // Count distributions
  for (const outfit of outfitsToAnalyze) {
    const attrs = outfit.attributes!;

    // Style Pillar
    if (attrs.stylePillar) {
      stylePillarCounts[attrs.stylePillar] = (stylePillarCounts[attrs.stylePillar] || 0) + 1;
    }

    // Vibes
    for (const vibe of attrs.vibes) {
      vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 1;
    }

    // Occasions
    for (const occasion of attrs.occasions) {
      occasionCounts[occasion] = (occasionCounts[occasion] || 0) + 1;
    }
    totalOccasions += attrs.occasions.length;

    // Tagging approach
    if (attrs.taggedBy === 'rules') rulesOnly++;
    else if (attrs.taggedBy === 'ai') aiAssisted++;
    else if (attrs.taggedBy === 'hybrid') hybrid++;
  }

  // Calculate percentages
  const stylePillarPercentages: Record<string, number> = {};
  for (const [pillar, count] of Object.entries(stylePillarCounts)) {
    stylePillarPercentages[pillar] = (count / totalOutfits) * 100;
  }

  const vibePercentages: Record<string, number> = {};
  for (const [vibe, count] of Object.entries(vibeCounts)) {
    vibePercentages[vibe] = (count / totalOutfits) * 100;
  }

  const occasionPercentages: Record<string, number> = {};
  for (const [occasion, count] of Object.entries(occasionCounts)) {
    occasionPercentages[occasion] = (count / totalOutfits) * 100;
  }

  // Diversity metrics
  const casualPercentage = stylePillarPercentages['Casual'] || 0;
  const minPillarPercentage = Math.min(...Object.values(stylePillarPercentages).filter(p => p > 0));
  const pillarsRepresented = Object.keys(stylePillarCounts).length;
  const vibesRepresented = Object.keys(vibeCounts).length;

  const passesThreshold =
    casualPercentage <= 25 &&
    minPillarPercentage >= 5 &&
    pillarsRepresented >= 8;

  return {
    totalOutfits,
    taggedOutfits: taggedOutfits.length,

    stylePillarDistribution: stylePillarCounts,
    stylePillarPercentages,

    vibeDistribution: vibeCounts,
    vibePercentages,

    occasionDistribution: occasionCounts,
    occasionPercentages,
    avgOccasionsPerOutfit: totalOccasions / totalOutfits,

    rulesOnly,
    aiAssisted,
    hybrid,
    aiCallRate: ((aiAssisted + hybrid) / totalOutfits) * 100,

    diversityScore: {
      casualPercentage,
      minPillarPercentage,
      pillarsRepresented,
      vibesRepresented,
      passesThreshold
    }
  };
}

/**
 * Format metrics as a readable report
 */
export function formatMetricsReport(metrics: TaggingMetrics): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('OUTFIT TAGGING METRICS REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push(`Total Outfits Analyzed: ${metrics.totalOutfits.toLocaleString()}`);
  lines.push('');

  // Style Pillar Distribution
  lines.push('STYLE PILLAR DISTRIBUTION:');
  lines.push('-'.repeat(60));
  const sortedPillars = Object.entries(metrics.stylePillarPercentages)
    .sort((a, b) => b[1] - a[1]);
  for (const [pillar, pct] of sortedPillars) {
    const count = metrics.stylePillarDistribution[pillar];
    lines.push(`  ${pillar.padEnd(20)} ${count.toString().padStart(5)} (${pct.toFixed(1)}%)`);
  }
  lines.push('');

  // Diversity Check
  lines.push('DIVERSITY CHECK:');
  lines.push('-'.repeat(60));
  lines.push(`  Casual Percentage:       ${metrics.diversityScore.casualPercentage.toFixed(1)}% ${metrics.diversityScore.casualPercentage <= 25 ? '✓ (≤25%)' : '✗ (>25%)'}`);
  lines.push(`  Min Pillar Percentage:   ${metrics.diversityScore.minPillarPercentage.toFixed(1)}% ${metrics.diversityScore.minPillarPercentage >= 5 ? '✓ (≥5%)' : '✗ (<5%)'}`);
  lines.push(`  Pillars Represented:     ${metrics.diversityScore.pillarsRepresented}/9 ${metrics.diversityScore.pillarsRepresented >= 8 ? '✓' : '✗'}`);
  lines.push(`  Vibes Represented:       ${metrics.diversityScore.vibesRepresented}`);
  lines.push('');
  lines.push(`  Overall: ${metrics.diversityScore.passesThreshold ? '✓ PASSES' : '✗ FAILS'}`);
  lines.push('');

  // AI Call Rate
  lines.push('TAGGING APPROACH:');
  lines.push('-'.repeat(60));
  lines.push(`  Rules Only:     ${metrics.rulesOnly.toString().padStart(5)} (${((metrics.rulesOnly / metrics.totalOutfits) * 100).toFixed(1)}%)`);
  lines.push(`  AI Assisted:    ${metrics.aiAssisted.toString().padStart(5)} (${((metrics.aiAssisted / metrics.totalOutfits) * 100).toFixed(1)}%)`);
  lines.push(`  Hybrid:         ${metrics.hybrid.toString().padStart(5)} (${((metrics.hybrid / metrics.totalOutfits) * 100).toFixed(1)}%)`);
  lines.push(`  AI Call Rate:   ${metrics.aiCallRate.toFixed(1)}%`);
  lines.push('');

  // Top Occasions
  lines.push('TOP 20 OCCASIONS:');
  lines.push('-'.repeat(60));
  const sortedOccasions = Object.entries(metrics.occasionPercentages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  for (const [occasion, pct] of sortedOccasions) {
    const count = metrics.occasionDistribution[occasion];
    lines.push(`  ${occasion.padEnd(30)} ${count.toString().padStart(5)} (${pct.toFixed(1)}%)`);
  }
  lines.push('');
  lines.push(`  Avg Occasions/Outfit:    ${metrics.avgOccasionsPerOutfit.toFixed(1)}`);
  lines.push('');

  // Top Vibes
  lines.push('TOP 15 VIBES:');
  lines.push('-'.repeat(60));
  const sortedVibes = Object.entries(metrics.vibePercentages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [vibe, pct] of sortedVibes) {
    const count = metrics.vibeDistribution[vibe];
    lines.push(`  ${vibe.padEnd(20)} ${count.toString().padStart(5)} (${pct.toFixed(1)}%)`);
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
