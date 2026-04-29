/**
 * Axis Resolver - Rules Layer for Four-Axis Outfit Tagging
 *
 * Assigns axis values using keyword/attribute signals from the outfit.
 * Returns confidence scores to determine whether AI refinement is needed.
 *
 * NO AI calls here - this is pure rules-based signal extraction and scoring.
 */

import type {
  ActivityContext,
  Season,
  SocialRegister,
  AxisValue,
  ResolvedAxes,
  OutfitInput,
} from './axis-types';

import {
  FORMALITY_SIGNALS,
  ACTIVITY_CONTEXT_SIGNALS,
  SEASON_SIGNALS,
  SOCIAL_REGISTER_SIGNALS,
} from './axis-signals';

// ============================================================================
// SIGNAL EXTRACTION
// ============================================================================

interface ExtractedSignals {
  allText: string;           // Combined title + ingredient titles for keyword matching
  keywords: string[];        // All keywords (lowercased, deduplicated)
  roles: string[];           // Item roles (tops, bottoms, shoes, accessories, outerwear)
  colors: string[];          // All colors from all items
  department: string;        // Gender department (from items)
  visionScan: {              // Vision scan attributes (if available)
    fabricWeight?: string[];
    drape?: string[];
    silhouette?: string[];
  };
}

/**
 * Extract all signals from outfit for axis resolution
 */
function extractSignals(outfit: OutfitInput): ExtractedSignals {
  const allText = [
    outfit.recipeTitle,
    ...outfit.items.map(item => `${item.ingredientTitle} ${item.product.title}`)
  ].join(' ').toLowerCase();

  const keywords = Array.from(new Set(allText.split(/\s+/).filter(w => w.length > 2)));

  const roles = outfit.items.map(item => item.role);

  const colors = Array.from(
    new Set(outfit.items.flatMap(item => item.product.colors.map(c => c.toLowerCase())))
  );

  const department = outfit.items[0]?.product.department || 'womens';

  // Collect vision scan attributes (may not be present yet)
  const visionScan: ExtractedSignals['visionScan'] = {
    fabricWeight: [],
    drape: [],
    silhouette: [],
  };

  for (const item of outfit.items) {
    if (item.product.visionScan) {
      if (item.product.visionScan.fabricWeight) {
        visionScan.fabricWeight!.push(item.product.visionScan.fabricWeight);
      }
      if (item.product.visionScan.drape) {
        visionScan.drape!.push(item.product.visionScan.drape);
      }
      if (item.product.visionScan.silhouette) {
        visionScan.silhouette!.push(item.product.visionScan.silhouette);
      }
    }
  }

  return { allText, keywords, roles, colors, department, visionScan };
}

// ============================================================================
// FORMALITY RESOLUTION
// ============================================================================

/**
 * Resolve formality score from outfit
 *
 * Base score comes from outfit.scoreBreakdown.occasionAlignment (0-100).
 * Adjust up/down based on formality signal keywords.
 *
 * Formula: formality = (occasionAlignment / 100) * 5 + 1
 * Adjustments: sum(high keyword weights) - sum(low keyword weights)
 */
function resolveFormality(
  outfit: OutfitInput,
  signals: ExtractedSignals
): AxisValue<number> {
  // Base formality from occasionAlignment
  const baseScore = (outfit.scoreBreakdown.occasionAlignment / 100) * 5 + 1;

  let adjustment = 0;
  let matchedSignals: string[] = [];

  // Check high formality signals
  for (const signal of FORMALITY_SIGNALS.high) {
    for (const keyword of signal.keywords) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        adjustment += signal.weight;
        matchedSignals.push(`+${keyword}`);
      }
    }
  }

  // Check low formality signals
  for (const signal of FORMALITY_SIGNALS.low) {
    for (const keyword of signal.keywords) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        adjustment -= signal.weight;
        matchedSignals.push(`-${keyword}`);
      }
    }
  }

  // Apply adjustment and clamp to 1.0-6.0
  let finalScore = Math.max(1.0, Math.min(6.0, baseScore + adjustment));

  // Confidence based on signal strength
  let confidence = 0.5; // Base confidence from occasionAlignment

  if (matchedSignals.length === 0) {
    confidence = 0.6; // Moderate confidence - only occasionAlignment
  } else if (Math.abs(adjustment) > 2.0) {
    confidence = 0.9; // Strong signals (major formality indicators)
  } else if (Math.abs(adjustment) > 1.0) {
    confidence = 0.8; // Good signals
  } else {
    confidence = 0.7; // Mild signals
  }

  // Mixed signals (both high and low) reduce confidence
  const hasHigh = matchedSignals.some(s => s.startsWith('+'));
  const hasLow = matchedSignals.some(s => s.startsWith('-'));
  if (hasHigh && hasLow) {
    confidence = Math.max(0.5, confidence - 0.2);
  }

  const reason = matchedSignals.length > 0
    ? `Base ${baseScore.toFixed(1)} from occasion score, adjusted by: ${matchedSignals.slice(0, 3).join(', ')}`
    : `Based on occasion alignment score (${outfit.scoreBreakdown.occasionAlignment}/100)`;

  return {
    value: parseFloat(finalScore.toFixed(1)),
    confidence,
    reason,
    source: 'rules',
  };
}

// ============================================================================
// ACTIVITY CONTEXT RESOLUTION
// ============================================================================

/**
 * Resolve activity context from outfit
 *
 * Scoring:
 * - strong match: +2 points
 * - weak match: +1 point
 * - excludes match: context eliminated
 *
 * Return primary context (highest score) + optional secondary (close second).
 */
function resolveActivityContext(
  signals: ExtractedSignals
): AxisValue<ActivityContext> & { secondary?: ActivityContext } {
  const scores: Record<ActivityContext, number> = {
    'active': 0,
    'casual-low-key': 0,
    'social-daytime': 0,
    'social-evening': 0,
    'professional': 0,
    'event': 0,
  };

  const matchedSignals: Record<ActivityContext, string[]> = {
    'active': [],
    'casual-low-key': [],
    'social-daytime': [],
    'social-evening': [],
    'professional': [],
    'event': [],
  };

  // Score each context
  for (const [context, contextSignals] of Object.entries(ACTIVITY_CONTEXT_SIGNALS)) {
    const ctx = context as ActivityContext;

    // Check for excludes first (eliminates context)
    let excluded = false;
    for (const keyword of contextSignals.excludes) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        scores[ctx] = -999; // Eliminated
        excluded = true;
        break;
      }
    }

    if (excluded) continue;

    // Check strong signals (+2 points each)
    for (const keyword of contextSignals.strong) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        scores[ctx] += 2;
        matchedSignals[ctx].push(`${keyword}(strong)`);
      }
    }

    // Check weak signals (+1 point each)
    for (const keyword of contextSignals.weak) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        scores[ctx] += 1;
        matchedSignals[ctx].push(`${keyword}(weak)`);
      }
    }
  }

  // Find top 2 contexts
  const sorted = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    // No matches - default to social-daytime (safest guess)
    return {
      value: 'social-daytime',
      confidence: 0.3,
      reason: 'No strong signals detected, defaulting to social-daytime',
      source: 'rules',
    };
  }

  const primary = sorted[0][0] as ActivityContext;
  const primaryScore = sorted[0][1];
  const secondary = sorted.length > 1 && sorted[1][1] >= 3 ? (sorted[1][0] as ActivityContext) : undefined;

  // Confidence based on score strength and separation
  let confidence = 0.5;
  if (primaryScore >= 6) {
    confidence = 0.9; // Very strong signals
  } else if (primaryScore >= 4) {
    confidence = 0.8; // Strong signals
  } else if (primaryScore >= 2) {
    confidence = 0.7; // Moderate signals
  } else {
    confidence = 0.6; // Weak signals
  }

  // Reduce confidence if secondary context is close (ambiguous)
  if (secondary && sorted[1][1] >= primaryScore - 1) {
    confidence = Math.max(0.5, confidence - 0.15);
  }

  const topSignals = matchedSignals[primary].slice(0, 3).join(', ');
  const reason = `Primary: ${primary} (${primaryScore} pts)${secondary ? `, Secondary: ${secondary}` : ''} - ${topSignals}`;

  return {
    value: primary,
    secondary,
    confidence,
    reason,
    source: 'rules',
  };
}

// ============================================================================
// SEASON RESOLUTION
// ============================================================================

/**
 * Resolve season(s) from outfit
 *
 * Priority:
 * 1. Vision scan fabricWeight (if available) - most reliable
 * 2. Keyword matching (fabric, garment, footwear, color)
 * 3. Structural signals (outerwear presence, sleeveless, layering)
 *
 * Multi-value: can assign multiple seasons if signals match.
 */
function resolveSeason(signals: ExtractedSignals): AxisValue<Season[]> {
  const seasonScores: Record<Season, number> = {
    'spring': 0,
    'summer': 0,
    'fall': 0,
    'winter': 0,
    'all-season': 0,
  };

  const matchedSignals: Record<Season, string[]> = {
    'spring': [],
    'summer': [],
    'fall': [],
    'winter': [],
    'all-season': [],
  };

  let confidence = 0.5;

  // PRIORITY 1: Vision scan fabricWeight (if available)
  if (signals.visionScan.fabricWeight && signals.visionScan.fabricWeight.length > 0) {
    for (const fabricWeight of signals.visionScan.fabricWeight) {
      const normalized = fabricWeight.toLowerCase();
      for (const [season, seasonSignals] of Object.entries(SEASON_SIGNALS)) {
        if (seasonSignals.fabricWeightValues?.some(v => normalized.includes(v))) {
          seasonScores[season as Season] += 3; // Strong signal from vision scan
          matchedSignals[season as Season].push(`fabricWeight:${fabricWeight}`);
        }
      }
    }
    confidence = 0.9; // Vision scan is highly reliable
  }

  // PRIORITY 2: Keyword matching (fabric, garment, footwear, color)
  for (const [season, seasonSignals] of Object.entries(SEASON_SIGNALS)) {
    const s = season as Season;

    // Fabric keywords (+2 each)
    for (const keyword of seasonSignals.fabricKeywords) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        seasonScores[s] += 2;
        matchedSignals[s].push(`fabric:${keyword}`);
      }
    }

    // Garment keywords (+2 each)
    for (const keyword of seasonSignals.garmentKeywords) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        seasonScores[s] += 2;
        matchedSignals[s].push(`garment:${keyword}`);
      }
    }

    // Footwear keywords (+1 each)
    for (const keyword of seasonSignals.footwearKeywords) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        seasonScores[s] += 1;
        matchedSignals[s].push(`footwear:${keyword}`);
      }
    }

    // Color keywords (+1 each)
    for (const keyword of seasonSignals.colorKeywords) {
      if (signals.colors.some(c => c.includes(keyword.toLowerCase()))) {
        seasonScores[s] += 1;
        matchedSignals[s].push(`color:${keyword}`);
      }
    }
  }

  // PRIORITY 3: Structural signals
  const hasOuterwear = signals.roles.includes('outerwear');
  if (hasOuterwear) {
    seasonScores.fall += 2;
    seasonScores.winter += 2;
    matchedSignals.fall.push('structure:outerwear');
    matchedSignals.winter.push('structure:outerwear');
  }

  const hasSleeveless = signals.allText.includes('sleeveless') ||
                        signals.allText.includes('tank') ||
                        signals.allText.includes('cami');
  if (hasSleeveless) {
    seasonScores.summer += 2;
    matchedSignals.summer.push('structure:sleeveless');
  }

  const hasOpenFootwear = signals.allText.includes('sandals') ||
                          signals.allText.includes('flip flops') ||
                          signals.allText.includes('slides');
  if (hasOpenFootwear) {
    seasonScores.summer += 2;
    matchedSignals.summer.push('structure:open-footwear');
  }

  // Determine season(s)
  const threshold = 3; // Minimum score to include season
  const seasons = Object.entries(seasonScores)
    .filter(([_, score]) => score >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([season, _]) => season as Season);

  // If no seasons match, fall back to all-season
  if (seasons.length === 0) {
    return {
      value: ['all-season'],
      confidence: 0.4,
      reason: 'No strong seasonal signals, defaulting to all-season',
      source: 'rules',
    };
  }

  // Confidence based on signal strength
  const topScore = seasonScores[seasons[0]];
  if (topScore >= 8) {
    confidence = 0.95; // Very strong signals
  } else if (topScore >= 6) {
    confidence = 0.85; // Strong signals
  } else if (topScore >= 4) {
    confidence = 0.75; // Moderate signals
  } else {
    confidence = 0.65; // Weak signals
  }

  const topSignals = seasons
    .map(s => `${s}:${matchedSignals[s].slice(0, 2).join(',')}`)
    .join(' | ');

  const reason = `Detected: ${seasons.join(', ')} - ${topSignals}`;

  return {
    value: seasons,
    confidence,
    reason,
    source: 'rules',
  };
}

// ============================================================================
// SOCIAL REGISTER RESOLUTION
// ============================================================================

/**
 * Resolve social register from outfit
 *
 * This is the HARDEST axis for rules - low confidence ceiling by design.
 * Most outfits will escalate to AI.
 *
 * Uses keyword matching + formality range constraints.
 */
function resolveSocialRegister(
  formalityScore: number,
  signals: ExtractedSignals
): AxisValue<SocialRegister> {
  const scores: Record<SocialRegister, number> = {
    'intimate': 0,
    'peer-social': 0,
    'evaluative': 0,
    'public-facing': 0,
    'celebratory': 0,
  };

  const matchedSignals: Record<SocialRegister, string[]> = {
    'intimate': [],
    'peer-social': [],
    'evaluative': [],
    'public-facing': [],
    'celebratory': [],
  };

  // Score each register
  for (const [register, registerSignals] of Object.entries(SOCIAL_REGISTER_SIGNALS)) {
    const reg = register as SocialRegister;

    // Check formality range (if specified)
    if (registerSignals.formality) {
      const { min, max } = registerSignals.formality;
      if ((min && formalityScore < min) || (max && formalityScore > max)) {
        scores[reg] = -999; // Eliminated by formality
        continue;
      }
    }

    // Check strong signals (+2 each)
    for (const keyword of registerSignals.strong) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        scores[reg] += 2;
        matchedSignals[reg].push(`${keyword}(strong)`);
      }
    }

    // Check weak signals (+1 each)
    for (const keyword of registerSignals.weak) {
      if (signals.allText.includes(keyword.toLowerCase())) {
        scores[reg] += 1;
        matchedSignals[reg].push(`${keyword}(weak)`);
      }
    }
  }

  // Find top register
  const sorted = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    // No matches - default to peer-social (most common)
    return {
      value: 'peer-social',
      confidence: 0.3,
      reason: 'No strong social register signals, defaulting to peer-social',
      source: 'rules',
    };
  }

  const register = sorted[0][0] as SocialRegister;
  const score = sorted[0][1];

  // Confidence ceiling is intentionally LOW for this axis
  // Most outfits should escalate to AI (threshold: 0.6)
  let confidence = 0.4;
  if (score >= 6) {
    confidence = 0.65; // Strong signals (rare)
  } else if (score >= 4) {
    confidence = 0.55; // Moderate signals
  } else if (score >= 2) {
    confidence = 0.45; // Weak signals
  }

  const topSignals = matchedSignals[register].slice(0, 3).join(', ');
  const reason = `${register} (${score} pts, formality=${formalityScore.toFixed(1)}) - ${topSignals || 'formality range'}`;

  return {
    value: register,
    confidence,
    reason,
    source: 'rules',
  };
}

// ============================================================================
// BOLD SIGNAL DETECTION
// ============================================================================

/**
 * Detect whether outfit has bold/statement styling
 *
 * Used for occasion derivation (e.g., Night Out requires bold signal).
 */
function detectBoldSignal(signals: ExtractedSignals): boolean {
  const boldKeywords = [
    'sequin', 'metallic', 'bold', 'statement', 'embellished',
    'satin', 'velvet', 'leather', 'going-out', 'party',
  ];

  for (const keyword of boldKeywords) {
    if (signals.allText.includes(keyword)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// MAIN EXPORT - RESOLVE ALL AXES
// ============================================================================

export interface ResolveAxesResult {
  axes: ResolvedAxes;
  hasBoldSignal: boolean;
}

/**
 * Main entry point - resolve all four axes from outfit using rules
 *
 * Returns axis values with confidence scores.
 * Confidence scores determine whether AI refinement is needed.
 *
 * Thresholds for AI escalation (per axis):
 * - Formality: < 0.7
 * - Activity Context: < 0.65
 * - Season: < 0.7
 * - Social Register: < 0.6 (intentionally low - AI owns this axis)
 */
export function resolveAxes(outfit: OutfitInput): ResolveAxesResult {
  // Extract all signals from outfit
  const signals = extractSignals(outfit);

  // Resolve each axis
  const formality = resolveFormality(outfit, signals);
  const activityContext = resolveActivityContext(signals);
  const season = resolveSeason(signals);
  const socialRegister = resolveSocialRegister(formality.value, signals);

  // Detect bold signal for occasion derivation
  const hasBoldSignal = detectBoldSignal(signals);

  return {
    axes: {
      formality,
      activityContext,
      season,
      socialRegister,
    },
    hasBoldSignal,
  };
}
