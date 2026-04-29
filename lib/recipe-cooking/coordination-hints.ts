/**
 * Coordination Hints Utilities
 *
 * Extracts styling metadata from ingredient queries/titles to help AI coordinate outfits.
 */

import type { CoordinationHints } from './types';

// Pattern matching for coordination metadata
const FIT_PATTERNS: Record<string, string[]> = {
  fitted: ['fitted', 'slim fit', 'bodycon', 'form-fitting', 'tight', 'ribbed'],
  loose: ['loose', 'oversized', 'relaxed', 'slouchy', 'baggy'],
  structured: ['structured', 'tailored', 'blazer-style'],
  drapey: ['drapey', 'flowy', 'fluid'],
};

const LENGTH_PATTERNS: Record<string, string[]> = {
  crop: ['crop', 'cropped', 'short'],
  tunic: ['tunic', 'long', 'extended', 'longline'],
  standard: ['regular', 'standard', 'hip-length'],
};

const STYLE_PATTERNS: Record<string, string[]> = {
  minimal: ['basic', 'simple', 'plain', 'essential', 'classic', 'crew neck', 't-shirt'],
  feminine: ['feminine', 'romantic', 'delicate', 'soft', 'blouse', 'ruffle', 'lace'],
  edgy: ['edgy', 'moto', 'leather', 'studded', 'rock', 'bomber'],
  boho: ['boho', 'bohemian', 'peasant', 'folk', 'crochet', 'tiered'],
  sporty: ['sporty', 'athletic', 'active', 'performance', 'nike', 'track'],
};

const NECKLINE_PATTERNS: Record<string, string[]> = {
  'v-neck': ['v-neck', 'v neck', 'vneck'],
  'crew neck': ['crew neck', 'crewneck', 'round neck'],
  'scoop neck': ['scoop', 'scoop neck'],
  'square neck': ['square neck', 'square neckline'],
  'off-shoulder': ['off shoulder', 'off-shoulder', 'bardot'],
  halter: ['halter', 'halter neck'],
  'high neck': ['high neck', 'mock neck', 'turtleneck'],
  strapless: ['strapless', 'tube'],
};

const SLEEVE_PATTERNS: Record<string, string[]> = {
  sleeveless: ['sleeveless', 'tank', 'cami'],
  'short sleeve': ['short sleeve', 'short-sleeve'],
  'long sleeve': ['long sleeve', 'long-sleeve'],
  'cap sleeve': ['cap sleeve'],
  'puff sleeve': ['puff sleeve', 'puffy sleeve'],
  'flutter sleeve': ['flutter sleeve'],
  'bell sleeve': ['bell sleeve'],
};

const SILHOUETTE_PATTERNS: Record<string, string[]> = {
  'A-line': ['a-line', 'a line', 'fit and flare'],
  bodycon: ['bodycon', 'body-con', 'fitted'],
  straight: ['straight', 'column', 'pencil'],
  flared: ['flared', 'flare', 'fit and flare'],
  'wide-leg': ['wide leg', 'wide-leg', 'palazzo'],
};

/**
 * Extract coordination hints from text (query + title) + vision enrichment
 *
 * NEW - Phase 2: Recipe Precision System
 * Prioritizes vision enrichment data over text extraction when available
 */
export function extractCoordinationHints(
  searchQuery: string,
  ingredientTitle: string,
  role: string,
  enrichment?: {
    patterns?: string[];
    silhouette?: string;
    secondaryColors?: string[];
    garmentLength?: string;
    neckline?: string;
    sleeveStyle?: string;
    fitType?: string;
    textureType?: string;
    styleDetails?: string[];
  }
): CoordinationHints {
  const combined = `${searchQuery} ${ingredientTitle}`.toLowerCase();
  const hints: CoordinationHints = {};

  // Priority 1: Use vision enrichment if available (more accurate than text matching)
  if (enrichment) {
    // Map enrichment fitType to CoordinationHints fit
    if (enrichment.fitType) {
      const fitMapping: Record<string, string> = {
        'fitted': 'fitted',
        'relaxed': 'loose',
        'oversized': 'loose',
        'tailored': 'structured',
        'flowy': 'drapey',
      };
      hints.fit = fitMapping[enrichment.fitType.toLowerCase()] as any;
    }

    // Map enrichment silhouette
    if (enrichment.silhouette) {
      hints.silhouette = enrichment.silhouette.toLowerCase() as any;
    }

    // Map enrichment neckline
    if (enrichment.neckline) {
      hints.neckline = enrichment.neckline.toLowerCase() as any;
    }

    // Map enrichment sleeve style
    if (enrichment.sleeveStyle) {
      hints.sleeve = enrichment.sleeveStyle.toLowerCase() as any;
    }

    // Use secondary colors as dominant colors
    if (enrichment.secondaryColors && enrichment.secondaryColors.length > 0) {
      hints.dominantColors = enrichment.secondaryColors.map(c => c.toLowerCase());
    }
  }

  // Priority 2: Text-based extraction for missing fields

  // Extract fit (if not from enrichment)
  if (!hints.fit) {
    for (const [fit, patterns] of Object.entries(FIT_PATTERNS)) {
      if (patterns.some(p => combined.includes(p))) {
        hints.fit = fit as any;
        break;
      }
    }
  }

  // Extract length (tops only)
  if (role === 'tops') {
    for (const [length, patterns] of Object.entries(LENGTH_PATTERNS)) {
      if (patterns.some(p => combined.includes(p))) {
        hints.length = length as any;
        break;
      }
    }
  }

  // Extract style intent
  for (const [style, patterns] of Object.entries(STYLE_PATTERNS)) {
    if (patterns.some(p => combined.includes(p))) {
      hints.styleIntent = style as any;
      break;
    }
  }

  // Extract neckline (tops only) - if not from enrichment
  if (!hints.neckline && role === 'tops') {
    for (const [neckline, patterns] of Object.entries(NECKLINE_PATTERNS)) {
      if (patterns.some(p => combined.includes(p))) {
        hints.neckline = neckline as any;
        break;
      }
    }
  }

  // Extract sleeve (tops/outerwear) - if not from enrichment
  if (!hints.sleeve && (role === 'tops' || role === 'outerwear')) {
    for (const [sleeve, patterns] of Object.entries(SLEEVE_PATTERNS)) {
      if (patterns.some(p => combined.includes(p))) {
        hints.sleeve = sleeve as any;
        break;
      }
    }
  }

  // Extract silhouette (bottoms/one-piece) - if not from enrichment
  if (!hints.silhouette && (role === 'bottoms' || role === 'one-piece')) {
    for (const [silhouette, patterns] of Object.entries(SILHOUETTE_PATTERNS)) {
      if (patterns.some(p => combined.includes(p))) {
        hints.silhouette = silhouette as any;
        break;
      }
    }
  }

  // Extract dominant colors (basic color words) - if not from enrichment
  if (!hints.dominantColors) {
    const colorWords = [
      'black', 'white', 'ivory', 'cream', 'beige', 'tan', 'brown',
      'navy', 'blue', 'red', 'pink', 'burgundy', 'purple',
      'green', 'olive', 'yellow', 'orange', 'grey', 'gray',
    ];
    const foundColors = colorWords.filter(color => combined.includes(color));
    if (foundColors.length > 0) {
      hints.dominantColors = foundColors;
    }
  }

  return hints;
}

/**
 * Format coordination hints for Gemini prompt
 */
export function formatHintsForPrompt(hints: CoordinationHints): string {
  const parts: string[] = [];

  if (hints.fit) parts.push(`${hints.fit} fit`);
  if (hints.length) parts.push(`${hints.length} length`);
  if (hints.silhouette) parts.push(`${hints.silhouette} silhouette`);
  if (hints.styleIntent) parts.push(`${hints.styleIntent} style`);
  if (hints.neckline) parts.push(`${hints.neckline}`);
  if (hints.sleeve) parts.push(`${hints.sleeve}`);
  if (hints.dominantColors && hints.dominantColors.length > 0) {
    parts.push(`colors: ${hints.dominantColors.join(', ')}`);
  }

  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

/**
 * Get coordination rules for tops+bottoms pairing
 */
export function getTopBottomRules(
  topHints?: CoordinationHints,
  bottomHints?: CoordinationHints
): string {
  const rules: string[] = [];

  // Silhouette balance
  if (topHints?.fit === 'fitted' && bottomHints?.fit === 'loose') {
    rules.push('✓ Good silhouette balance: fitted top + loose bottom');
  } else if (topHints?.fit === 'loose' && bottomHints?.fit === 'fitted') {
    rules.push('✓ Good silhouette balance: loose top + fitted bottom');
  } else if (topHints?.fit === bottomHints?.fit && topHints?.fit !== 'structured') {
    rules.push('⚠ Warning: both pieces have same fit - avoid');
  }

  // Length coordination
  if (topHints?.length === 'crop' && bottomHints?.silhouette !== 'A-line') {
    rules.push('→ Cropped top requires high-waist bottom');
  }
  if (topHints?.length === 'tunic') {
    rules.push('→ Long top requires slim/fitted bottom (avoid bulk)');
  }

  // Style coherence
  if (topHints?.styleIntent && bottomHints?.styleIntent) {
    const styleDistance = getStyleDistance(topHints.styleIntent, bottomHints.styleIntent);
    if (styleDistance > 2) {
      rules.push(`⚠ Style clash: ${topHints.styleIntent} + ${bottomHints.styleIntent}`);
    }
  }

  return rules.join('\n  ');
}

/**
 * Calculate style distance (0 = same, higher = more different)
 */
function getStyleDistance(style1: string, style2: string): number {
  const styleOrder = ['sporty', 'minimal', 'boho', 'feminine', 'edgy'];
  const idx1 = styleOrder.indexOf(style1);
  const idx2 = styleOrder.indexOf(style2);
  if (idx1 === -1 || idx2 === -1) return 0;
  return Math.abs(idx1 - idx2);
}
