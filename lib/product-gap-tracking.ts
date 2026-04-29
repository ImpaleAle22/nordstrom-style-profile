/**
 * Product Gap Tracking Module
 *
 * Records missing products during recipe cooking and analyzes gaps
 * to identify most-needed items in the catalog.
 *
 * Phase 3: Recipe Precision System
 */

import type { ProductGap } from './indexeddb-storage';
import { recordProductGap, getAllProductGaps } from './indexeddb-storage';

/**
 * Simple hash function for browser compatibility
 * (replaces Node crypto.createHash for client-side use)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

/**
 * Generate a unique ID for a product gap based on query + filters
 * Same gap ID means same missing product
 */
export function generateGapId(
  searchQuery: string,
  role: string,
  filters?: {
    productType1?: string[];
    productType2?: string[];
    materials?: string[];
    colors?: string[];
    department?: string;
  }
): string {
  const parts = [
    searchQuery.toLowerCase().trim(),
    role,
    filters?.department || '',
    (filters?.productType1 || []).sort().join(','),
    (filters?.productType2 || []).sort().join(','),
    (filters?.materials || []).sort().join(','),
    (filters?.colors || []).sort().join(','),
  ];

  const signature = parts.join('::');

  // Create hash for consistent ID (browser-compatible)
  const hash = simpleHash(signature);

  return `gap-${hash}`;
}

/**
 * Record product gaps from a recipe cooking session
 * Called after cooking completes with ingredients that had 0 products
 */
export async function recordProductGaps(
  missingIngredients: Array<{
    title: string;
    query: string;
    role: string;
    filters?: {
      productType1?: string[];
      productType2?: string[];
      materials?: string[];
      colors?: string[];
      department?: string;
    };
  }>,
  recipeMetadata: {
    recipeId: string;
    recipeTitle: string;
    cookedAt: string;
  }
): Promise<void> {
  if (missingIngredients.length === 0) {
    return;
  }

  console.log(`\n📊 Recording ${missingIngredients.length} product gap(s)...`);

  for (const ingredient of missingIngredients) {
    const gapId = generateGapId(
      ingredient.query,
      ingredient.role,
      ingredient.filters
    );

    const gap: Omit<ProductGap, 'frequency' | 'firstSeen'> = {
      gapId,
      ingredientTitle: ingredient.title,
      searchQuery: ingredient.query,
      role: ingredient.role,
      lastSeen: recipeMetadata.cookedAt,
      recipeReferences: [{
        recipeId: recipeMetadata.recipeId,
        recipeTitle: recipeMetadata.recipeTitle,
        cookedAt: recipeMetadata.cookedAt,
      }],
      productType1: ingredient.filters?.productType1,
      productType2: ingredient.filters?.productType2,
      materials: ingredient.filters?.materials,
      colors: ingredient.filters?.colors,
      department: ingredient.filters?.department,
      status: 'active',
    };

    try {
      await recordProductGap(gap);
      console.log(`   ✓ Recorded gap: ${ingredient.title} (${ingredient.role})`);
    } catch (error) {
      console.error(`   ✗ Failed to record gap: ${ingredient.title}`, error);
    }
  }

  console.log(`✓ Product gaps recorded\n`);
}

/**
 * Category priority weights for urgency scoring
 * Higher weight = more important to have in catalog
 */
const CATEGORY_PRIORITIES: Record<string, number> = {
  // Core garments (high priority)
  'shoes': 10,
  'bottoms': 9,
  'one-piece': 9,
  'tops': 8,
  'outerwear': 7,

  // Supporting items (medium priority)
  'accessories': 5,
  'bags': 5,
  'hats': 4,

  // Default
  'default': 5,
};

/**
 * Calculate urgency score for a product gap
 * Higher score = more urgent to fill this gap
 *
 * Formula: (frequency × 10) + (recency_days × -0.5) + (category_priority × 2)
 */
export function calculateUrgencyScore(gap: ProductGap): number {
  // Frequency component (most important)
  const frequencyScore = gap.frequency * 10;

  // Recency component (penalize old gaps)
  const lastSeenDate = new Date(gap.lastSeen);
  const daysSinceLastSeen = (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = daysSinceLastSeen * -0.5;

  // Category priority component
  const categoryPriority = CATEGORY_PRIORITIES[gap.role] || CATEGORY_PRIORITIES['default'];
  const categoryScore = categoryPriority * 2;

  const totalScore = frequencyScore + recencyScore + categoryScore;

  return Math.max(0, totalScore); // Never negative
}

/**
 * Analyze product gaps and return ranked list
 * Used by the dashboard to show most-urgent gaps
 */
export interface GapAnalysis {
  gap: ProductGap;
  urgencyScore: number;
  rank: number;
}

export async function analyzeGaps(
  options?: {
    status?: 'active' | 'resolved' | 'ignored';
    role?: string;
    limit?: number;
    sortBy?: 'urgency' | 'frequency' | 'recent';
  }
): Promise<GapAnalysis[]> {
  // Get all gaps
  let gaps = await getAllProductGaps();

  // Filter by status
  if (options?.status) {
    gaps = gaps.filter(g => g.status === options.status);
  }

  // Filter by role
  if (options?.role) {
    gaps = gaps.filter(g => g.role === options.role);
  }

  // Calculate urgency scores
  const analyzed = gaps.map(gap => ({
    gap,
    urgencyScore: calculateUrgencyScore(gap),
    rank: 0, // Will be set after sorting
  }));

  // Sort by selected criteria
  const sortBy = options?.sortBy || 'urgency';

  if (sortBy === 'urgency') {
    analyzed.sort((a, b) => b.urgencyScore - a.urgencyScore);
  } else if (sortBy === 'frequency') {
    analyzed.sort((a, b) => b.gap.frequency - a.gap.frequency);
  } else if (sortBy === 'recent') {
    analyzed.sort((a, b) => new Date(b.gap.lastSeen).getTime() - new Date(a.gap.lastSeen).getTime());
  }

  // Assign ranks
  analyzed.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Apply limit
  if (options?.limit) {
    return analyzed.slice(0, options.limit);
  }

  return analyzed;
}

/**
 * Export gaps to CSV format for sourcing team
 */
export function exportGapsToCSV(gaps: GapAnalysis[]): string {
  const headers = [
    'Rank',
    'Product Need',
    'Search Query',
    'Role',
    'Frequency',
    'Last Seen',
    'Urgency Score',
    'Department',
    'Product Types',
    'Materials',
    'Colors',
    'Recipe Count',
    'Status',
    'Notes',
  ];

  const rows = gaps.map(({ gap, urgencyScore, rank }) => [
    rank,
    gap.ingredientTitle,
    gap.searchQuery,
    gap.role,
    gap.frequency,
    new Date(gap.lastSeen).toLocaleDateString(),
    urgencyScore.toFixed(1),
    gap.department || '',
    [...(gap.productType1 || []), ...(gap.productType2 || [])].join('; '),
    (gap.materials || []).join('; '),
    (gap.colors || []).join('; '),
    gap.recipeReferences.length,
    gap.status,
    gap.notes || '',
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Get summary statistics for product gaps
 */
export interface GapStatistics {
  totalGaps: number;
  activeGaps: number;
  resolvedGaps: number;
  ignoredGaps: number;
  totalRecipes: number;
  byRole: Record<string, number>;
  topGaps: GapAnalysis[];
}

export async function getGapStatistics(): Promise<GapStatistics> {
  const allGaps = await getAllProductGaps();

  const stats: GapStatistics = {
    totalGaps: allGaps.length,
    activeGaps: allGaps.filter(g => g.status === 'active').length,
    resolvedGaps: allGaps.filter(g => g.status === 'resolved').length,
    ignoredGaps: allGaps.filter(g => g.status === 'ignored').length,
    totalRecipes: new Set(allGaps.flatMap(g => g.recipeReferences.map(r => r.recipeId))).size,
    byRole: {},
    topGaps: [],
  };

  // Count by role
  for (const gap of allGaps) {
    if (gap.status === 'active') {
      stats.byRole[gap.role] = (stats.byRole[gap.role] || 0) + 1;
    }
  }

  // Get top 10 gaps
  stats.topGaps = await analyzeGaps({ status: 'active', limit: 10 });

  return stats;
}
