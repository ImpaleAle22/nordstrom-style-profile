/**
 * Marker-to-Pillar Scoring Table
 *
 * Maps detected markers (materials, silhouettes, details, colors) to style pillars
 * with weighted contributions. Used by Pillar Station for marker-evidence classification.
 *
 * Weight categories:
 * - Materials: 0.7-1.0 (highest - most reliable indicator)
 * - Silhouettes: 0.5-0.8 (strong indicator)
 * - Details: 0.3-0.6 (moderate indicator)
 * - Colors: 0.2-0.5 (supporting indicator, lowest weight)
 *
 * Derived from spec §2.2 and 8 good examples in spec §2.2.3
 */

import type { StylePillar } from './outfit-attributes';

// ============================================================================
// TYPES
// ============================================================================

export interface Marker {
  type: 'material' | 'silhouette' | 'detail' | 'color';
  value: string; // Normalized lowercase marker name
  confidence?: number; // Optional AI confidence in marker detection
}

export interface PillarScore {
  pillar: StylePillar;
  score: number; // Weighted sum of marker contributions
  markerCount: number; // Number of markers contributing
  markers: Marker[]; // Markers that contributed
}

export type PillarScores = Record<StylePillar, PillarScore>;

export interface GateResult {
  pass: boolean;
  winner: StylePillar | null;
  confidence: number; // Derived from marker stack strength
  candidates: StylePillar[]; // For tie-breaking (within 10% of winner)
  reason: string;
}

// ============================================================================
// MARKER-TO-PILLAR SCORING TABLE
// ============================================================================

/**
 * Each marker maps to one or more (pillar, weight) pairs
 */
const MARKER_SCORING_TABLE: Record<string, Array<{ pillar: StylePillar; weight: number }>> = {
  // =========================
  // MATERIALS (0.7-1.0)
  // =========================

  // Athletic materials
  'technical fabric': [{ pillar: 'Athletic', weight: 1.0 }],
  'performance': [{ pillar: 'Athletic', weight: 0.9 }],
  'mesh': [{ pillar: 'Athletic', weight: 0.8 }],
  'synthetic': [{ pillar: 'Athletic', weight: 0.7 }],
  'moisture-wicking': [{ pillar: 'Athletic', weight: 0.9 }],
  'polyester': [{ pillar: 'Athletic', weight: 0.7 }, { pillar: 'Casual', weight: 0.3 }],
  'spandex': [{ pillar: 'Athletic', weight: 0.8 }],
  'nylon': [{ pillar: 'Athletic', weight: 0.7 }],
  'elastane': [{ pillar: 'Athletic', weight: 0.7 }],
  'jersey': [{ pillar: 'Athletic', weight: 0.5 }, { pillar: 'Casual', weight: 0.4 }],

  // Classic materials
  'wool': [{ pillar: 'Classic', weight: 0.9 }, { pillar: 'Utility', weight: 0.3 }],
  'cashmere': [{ pillar: 'Classic', weight: 1.0 }],
  'tweed': [{ pillar: 'Classic', weight: 0.9 }],
  'flannel': [{ pillar: 'Classic', weight: 0.7 }],
  'leather': [
    { pillar: 'Classic', weight: 0.6 },
    { pillar: 'Streetwear', weight: 0.7 },
    { pillar: 'Bohemian', weight: 0.5 },
    { pillar: 'Utility', weight: 0.4 }
  ],

  // Romantic materials
  'silk': [{ pillar: 'Romantic', weight: 0.9 }, { pillar: 'Minimal', weight: 0.4 }],
  'satin': [{ pillar: 'Romantic', weight: 0.9 }, { pillar: 'Maximal', weight: 0.5 }],
  'chiffon': [{ pillar: 'Romantic', weight: 0.9 }],
  'lace': [{ pillar: 'Romantic', weight: 1.0 }],

  // Bohemian materials
  'cotton': [
    { pillar: 'Bohemian', weight: 0.6 },
    { pillar: 'Casual', weight: 0.5 },
    { pillar: 'Classic', weight: 0.3 }
  ],
  'suede': [{ pillar: 'Bohemian', weight: 0.8 }, { pillar: 'Utility', weight: 0.5 }],
  'velvet': [{ pillar: 'Bohemian', weight: 0.7 }, { pillar: 'Romantic', weight: 0.6 }],
  'crochet': [{ pillar: 'Bohemian', weight: 0.9 }],

  // Maximal materials
  'sequin': [{ pillar: 'Maximal', weight: 1.0 }],
  'sequins': [{ pillar: 'Maximal', weight: 1.0 }],
  'metallic': [{ pillar: 'Maximal', weight: 0.9 }, { pillar: 'Streetwear', weight: 0.4 }],

  // Utility materials
  'canvas': [{ pillar: 'Utility', weight: 0.8 }, { pillar: 'Casual', weight: 0.4 }],
  'denim': [
    { pillar: 'Casual', weight: 0.7 },
    { pillar: 'Streetwear', weight: 0.6 },
    { pillar: 'Classic', weight: 0.4 }
  ],

  // =========================
  // SILHOUETTES (0.5-0.8)
  // =========================

  // Classic silhouettes
  'structured': [{ pillar: 'Classic', weight: 0.8 }, { pillar: 'Minimal', weight: 0.5 }],
  'tailored': [{ pillar: 'Classic', weight: 0.9 }],
  'fitted': [{ pillar: 'Classic', weight: 0.6 }, { pillar: 'Minimal', weight: 0.7 }],
  'straight-leg': [{ pillar: 'Classic', weight: 0.6 }],
  'pointed-toe': [{ pillar: 'Classic', weight: 0.5 }],

  // Minimal silhouettes
  'wide-leg': [{ pillar: 'Minimal', weight: 0.7 }, { pillar: 'Streetwear', weight: 0.5 }],
  'sleek': [{ pillar: 'Minimal', weight: 0.8 }],
  'slim fit': [{ pillar: 'Minimal', weight: 0.6 }],

  // Romantic silhouettes
  'bodycon': [{ pillar: 'Romantic', weight: 0.7 }, { pillar: 'Maximal', weight: 0.6 }],
  'a-line': [{ pillar: 'Romantic', weight: 0.7 }, { pillar: 'Classic', weight: 0.4 }],
  'tiered': [{ pillar: 'Romantic', weight: 0.7 }, { pillar: 'Bohemian', weight: 0.8 }],
  'fit and flare': [{ pillar: 'Romantic', weight: 0.7 }],
  'midi': [{ pillar: 'Romantic', weight: 0.5 }, { pillar: 'Bohemian', weight: 0.5 }],
  'maxi': [{ pillar: 'Bohemian', weight: 0.8 }, { pillar: 'Romantic', weight: 0.5 }],
  'mini': [{ pillar: 'Maximal', weight: 0.5 }, { pillar: 'Romantic', weight: 0.4 }],
  'strappy': [{ pillar: 'Romantic', weight: 0.6 }, { pillar: 'Maximal', weight: 0.5 }],

  // Streetwear silhouettes
  'oversized': [{ pillar: 'Streetwear', weight: 0.8 }, { pillar: 'Casual', weight: 0.5 }],
  'cropped': [{ pillar: 'Streetwear', weight: 0.6 }],
  'baggy': [{ pillar: 'Streetwear', weight: 0.7 }],
  'chunky': [{ pillar: 'Streetwear', weight: 0.7 }],
  'platform': [{ pillar: 'Streetwear', weight: 0.7 }, { pillar: 'Maximal', weight: 0.5 }],

  // Bohemian silhouettes
  'flowy': [{ pillar: 'Bohemian', weight: 0.7 }, { pillar: 'Romantic', weight: 0.5 }],
  'draped': [{ pillar: 'Bohemian', weight: 0.6 }],

  // Maximal silhouettes
  'statement': [{ pillar: 'Maximal', weight: 0.8 }],
  'dramatic': [{ pillar: 'Maximal', weight: 0.7 }],

  // =========================
  // DETAILS (0.3-0.6)
  // =========================

  // Classic details
  'button-down': [{ pillar: 'Classic', weight: 0.5 }],
  'blazer': [{ pillar: 'Classic', weight: 0.6 }],
  'oxford': [{ pillar: 'Classic', weight: 0.6 }],
  'loafer': [{ pillar: 'Classic', weight: 0.5 }],
  'pump': [{ pillar: 'Classic', weight: 0.5 }],

  // Romantic details
  'floral': [{ pillar: 'Romantic', weight: 0.6 }, { pillar: 'Bohemian', weight: 0.5 }],
  'ruffle': [{ pillar: 'Romantic', weight: 0.7 }],
  'bow': [{ pillar: 'Romantic', weight: 0.6 }],
  'pearl': [{ pillar: 'Romantic', weight: 0.5 }, { pillar: 'Classic', weight: 0.4 }],
  'delicate': [{ pillar: 'Romantic', weight: 0.5 }],
  'puff sleeve': [{ pillar: 'Romantic', weight: 0.6 }],

  // Bohemian details
  'fringe': [{ pillar: 'Bohemian', weight: 0.7 }],
  'embroidered': [{ pillar: 'Bohemian', weight: 0.6 }],
  'layered': [{ pillar: 'Bohemian', weight: 0.5 }],
  'block heel': [{ pillar: 'Bohemian', weight: 0.4 }, { pillar: 'Casual', weight: 0.3 }],

  // Maximal details
  'sequined': [{ pillar: 'Maximal', weight: 0.7 }],
  'embellished': [{ pillar: 'Maximal', weight: 0.6 }, { pillar: 'Bohemian', weight: 0.4 }],
  'chandelier': [{ pillar: 'Maximal', weight: 0.6 }],
  'stiletto': [{ pillar: 'Maximal', weight: 0.5 }],
  'cutout': [{ pillar: 'Maximal', weight: 0.6 }, { pillar: 'Streetwear', weight: 0.5 }],

  // Streetwear details
  'graphic': [{ pillar: 'Streetwear', weight: 0.7 }],
  'distressed': [{ pillar: 'Streetwear', weight: 0.7 }],
  'chain': [{ pillar: 'Streetwear', weight: 0.6 }],
  'high-top': [{ pillar: 'Streetwear', weight: 0.6 }],
  'logo': [{ pillar: 'Streetwear', weight: 0.5 }],

  // Utility details
  'cargo': [{ pillar: 'Utility', weight: 0.8 }],
  'cargo pockets': [{ pillar: 'Utility', weight: 0.8 }],
  'work boot': [{ pillar: 'Utility', weight: 0.7 }],
  'belt': [{ pillar: 'Utility', weight: 0.3 }, { pillar: 'Classic', weight: 0.3 }],

  // Athletic details
  'tank': [{ pillar: 'Athletic', weight: 0.6 }, { pillar: 'Casual', weight: 0.4 }],
  'shorts': [{ pillar: 'Athletic', weight: 0.5 }, { pillar: 'Casual', weight: 0.4 }],
  'running shoes': [{ pillar: 'Athletic', weight: 0.8 }],
  'running': [{ pillar: 'Athletic', weight: 0.7 }],
  'athletic': [{ pillar: 'Athletic', weight: 0.8 }],
  'training': [{ pillar: 'Athletic', weight: 0.7 }],
  'workout': [{ pillar: 'Athletic', weight: 0.7 }],
  'sports': [{ pillar: 'Athletic', weight: 0.6 }],
  'sports watch': [{ pillar: 'Athletic', weight: 0.6 }],
  'sneakers': [{ pillar: 'Athletic', weight: 0.5 }, { pillar: 'Streetwear', weight: 0.5 }, { pillar: 'Casual', weight: 0.4 }],
  'joggers': [{ pillar: 'Athletic', weight: 0.6 }, { pillar: 'Casual', weight: 0.4 }],
  'leggings': [{ pillar: 'Athletic', weight: 0.7 }, { pillar: 'Casual', weight: 0.3 }],
  'bike': [{ pillar: 'Athletic', weight: 0.6 }, { pillar: 'Casual', weight: 0.3 }],
  'track': [{ pillar: 'Athletic', weight: 0.7 }],
  'gym': [{ pillar: 'Athletic', weight: 0.7 }],

  // Casual details (common in titles)
  'sweatshirt': [{ pillar: 'Casual', weight: 0.6 }, { pillar: 'Athletic', weight: 0.5 }],
  'hoodie': [{ pillar: 'Casual', weight: 0.6 }, { pillar: 'Streetwear', weight: 0.5 }],
  't-shirt': [{ pillar: 'Casual', weight: 0.5 }],
  'tee': [{ pillar: 'Casual', weight: 0.5 }],
  'zip-up': [{ pillar: 'Casual', weight: 0.5 }, { pillar: 'Athletic', weight: 0.4 }],

  // =========================
  // COLORS (0.2-0.5)
  // =========================

  // Minimal colors
  'black': [{ pillar: 'Minimal', weight: 0.4 }, { pillar: 'Classic', weight: 0.3 }],
  'white': [{ pillar: 'Minimal', weight: 0.3 }, { pillar: 'Casual', weight: 0.3 }],
  'monochrome': [{ pillar: 'Minimal', weight: 0.5 }],
  'neutral': [{ pillar: 'Minimal', weight: 0.4 }, { pillar: 'Classic', weight: 0.4 }],

  // Classic colors
  'camel': [{ pillar: 'Classic', weight: 0.5 }],
  'cream': [{ pillar: 'Classic', weight: 0.4 }, { pillar: 'Romantic', weight: 0.3 }],
  'navy': [{ pillar: 'Classic', weight: 0.4 }],
  'dark wash': [{ pillar: 'Classic', weight: 0.3 }],

  // Bohemian colors (earth tones)
  'rust': [{ pillar: 'Bohemian', weight: 0.5 }],
  'brown': [{ pillar: 'Bohemian', weight: 0.4 }, { pillar: 'Utility', weight: 0.3 }],
  'tan': [{ pillar: 'Bohemian', weight: 0.4 }, { pillar: 'Utility', weight: 0.3 }],
  'olive': [{ pillar: 'Bohemian', weight: 0.4 }, { pillar: 'Utility', weight: 0.4 }],
  'earth tones': [{ pillar: 'Bohemian', weight: 0.5 }],
  'warm': [{ pillar: 'Bohemian', weight: 0.3 }],

  // Maximal colors
  'emerald': [{ pillar: 'Maximal', weight: 0.5 }],
  'gold': [{ pillar: 'Maximal', weight: 0.4 }, { pillar: 'Bohemian', weight: 0.3 }],
  'vibrant': [{ pillar: 'Maximal', weight: 0.5 }],
  'bright': [{ pillar: 'Maximal', weight: 0.4 }],
  'saturated': [{ pillar: 'Maximal', weight: 0.4 }],

  // Romantic colors
  'pink': [{ pillar: 'Romantic', weight: 0.4 }],
  'blush': [{ pillar: 'Romantic', weight: 0.4 }],
  'lavender': [{ pillar: 'Romantic', weight: 0.4 }],
  'soft': [{ pillar: 'Romantic', weight: 0.3 }],
  'pastel': [{ pillar: 'Romantic', weight: 0.4 }],
  'nude': [{ pillar: 'Romantic', weight: 0.3 }],
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Score markers against pillar table
 *
 * Returns weighted sum per pillar with marker counts
 */
export function scoreMarkers(markers: Marker[]): PillarScores {
  // Initialize scores for all pillars
  const scores: PillarScores = {
    'Athletic': { pillar: 'Athletic', score: 0, markerCount: 0, markers: [] },
    'Bohemian': { pillar: 'Bohemian', score: 0, markerCount: 0, markers: [] },
    'Casual': { pillar: 'Casual', score: 0, markerCount: 0, markers: [] },
    'Classic': { pillar: 'Classic', score: 0, markerCount: 0, markers: [] },
    'Maximal': { pillar: 'Maximal', score: 0, markerCount: 0, markers: [] },
    'Minimal': { pillar: 'Minimal', score: 0, markerCount: 0, markers: [] },
    'Romantic': { pillar: 'Romantic', score: 0, markerCount: 0, markers: [] },
    'Streetwear': { pillar: 'Streetwear', score: 0, markerCount: 0, markers: [] },
    'Utility': { pillar: 'Utility', score: 0, markerCount: 0, markers: [] },
  };

  // Score each marker
  for (const marker of markers) {
    const normalizedValue = marker.value.toLowerCase().trim();
    const scoringEntries = MARKER_SCORING_TABLE[normalizedValue];

    if (!scoringEntries) {
      // Marker not in table - skip
      continue;
    }

    // Apply marker confidence multiplier if provided
    const confidenceMultiplier = marker.confidence !== undefined ? marker.confidence : 1.0;

    // Add weighted contribution to each pillar
    for (const { pillar, weight } of scoringEntries) {
      const adjustedWeight = weight * confidenceMultiplier;
      scores[pillar].score += adjustedWeight;
      scores[pillar].markerCount++;
      scores[pillar].markers.push(marker);
    }
  }

  return scores;
}

/**
 * Apply threshold gate to pillar scores
 *
 * Rules from spec §2.2:
 * - Pillar needs ≥3 markers to qualify
 * - If multiple qualify, highest score wins
 * - If tie within 10% of top score, return candidates for AI tie-break
 * - Confidence based on marker stack strength (score + count)
 */
export function applyThresholdGate(scores: PillarScores): GateResult {
  // Filter pillars with ≥3 markers
  const qualified = Object.values(scores).filter(s => s.markerCount >= 3);

  if (qualified.length === 0) {
    // No pillar qualifies
    return {
      pass: false,
      winner: null,
      confidence: 0,
      candidates: [],
      reason: 'No pillar accumulated ≥3 markers'
    };
  }

  // Sort by score descending
  qualified.sort((a, b) => b.score - a.score);

  const topScore = qualified[0].score;
  const winner = qualified[0].pillar;

  // Find candidates within 10% of top score
  const candidates = qualified
    .filter(s => s.score >= topScore * 0.9)
    .map(s => s.pillar);

  // Calculate confidence based on marker stack strength
  // Formula: base confidence from score, bonus from marker count, penalty for ties
  let confidence = Math.min(0.95, 0.5 + (topScore * 0.15)); // Score contribution
  confidence += Math.min(0.2, qualified[0].markerCount * 0.03); // Marker count bonus

  if (candidates.length > 1) {
    // Tie - reduce confidence
    confidence *= 0.85;
  }

  // Clamp to [0.3, 0.95]
  confidence = Math.max(0.3, Math.min(0.95, confidence));

  return {
    pass: true,
    winner,
    confidence,
    candidates,
    reason: candidates.length > 1
      ? `Top ${candidates.length} pillars within 10% (tie-break needed)`
      : `${winner} qualified with ${qualified[0].markerCount} markers, score ${topScore.toFixed(2)}`
  };
}

/**
 * Get all markers in scoring table (for testing/validation)
 */
export function getAllMarkers(): string[] {
  return Object.keys(MARKER_SCORING_TABLE).sort();
}

/**
 * Get pillar mappings for a specific marker (for debugging)
 */
export function getMarkerMappings(marker: string): Array<{ pillar: StylePillar; weight: number }> | null {
  const normalized = marker.toLowerCase().trim();
  return MARKER_SCORING_TABLE[normalized] || null;
}
