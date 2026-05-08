/**
 * Profile Processor
 *
 * Core engine that transforms interaction data into customer profile data.
 * Works both incrementally (on-the-fly) and in batch mode (pre-processing personas).
 *
 * Architecture:
 * - Takes raw interaction data (swipes, quiz, chat, etc.)
 * - Calculates all profile dimensions (pillars, colors, brands, etc.)
 * - Returns complete CustomerProfile object
 * - Deterministic and testable
 */

import type { CustomerProfile, SwipeSession } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interaction data that can be processed into a profile
 */
export interface InteractionData {
  swipeSessions?: SwipeSession[];
  quizResponses?: any[]; // TODO: Define quiz type
  chatTranscripts?: any[]; // TODO: Define chat type
  ralForms?: any[]; // TODO: Define RAL type
  purchases?: any[]; // TODO: Define purchase type
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  mode: 'incremental' | 'batch';
  preserveExisting?: boolean; // Keep existing data when processing incrementally
  confidenceBoost?: number; // Manual confidence adjustment
  timestamp?: string; // Override timestamp
}

/**
 * Processing result with metadata
 */
export interface ProcessingResult {
  profile: CustomerProfile;
  metadata: {
    processedAt: string;
    interactionCount: number;
    signalCount: number;
    processingTimeMs: number;
    warnings: string[];
  };
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * Process interaction data into a customer profile
 *
 * @param customerId - Customer identifier
 * @param customerName - Customer name
 * @param interactions - All interaction data to process
 * @param currentProfile - Existing profile (for incremental updates)
 * @param options - Processing options
 * @returns Complete customer profile with metadata
 */
export function processProfile(
  customerId: string,
  customerName: string,
  interactions: InteractionData,
  currentProfile?: Partial<CustomerProfile>,
  options: ProcessingOptions = { mode: 'batch' }
): ProcessingResult {
  const startTime = Date.now();
  const warnings: string[] = [];
  const now = options.timestamp || new Date().toISOString();

  // Count total interactions
  const interactionCount = (
    (interactions.swipeSessions?.length || 0) +
    (interactions.quizResponses?.length || 0) +
    (interactions.chatTranscripts?.length || 0)
  );

  if (interactionCount === 0) {
    warnings.push('No interactions to process - returning minimal profile');
  }

  // Initialize or merge with existing profile
  const profile: CustomerProfile = initializeProfile(
    customerId,
    customerName,
    currentProfile,
    options
  );

  // Process each interaction type
  let totalSignals = 0;

  if (interactions.swipeSessions && interactions.swipeSessions.length > 0) {
    const swipeResult = processSwipeSessions(
      interactions.swipeSessions,
      profile,
      options
    );
    Object.assign(profile, swipeResult.updates);
    totalSignals += swipeResult.signalCount;
    warnings.push(...swipeResult.warnings);
  }

  // TODO: Process other interaction types
  // if (interactions.quizResponses) { ... }
  // if (interactions.chatTranscripts) { ... }

  // Calculate final confidence score
  profile.confidence_score = calculateConfidenceScore(
    profile,
    interactionCount,
    totalSignals
  );

  // Generate style personality if we have enough data
  if (profile.confidence_score > 0.3) {
    profile.style_personality = generateStylePersonality(profile, customerName);
  }

  // Update timestamps
  profile.updated_at = now;
  profile.last_interaction_at = now;
  profile.sessions_processed = (currentProfile?.sessions_processed || 0) + interactionCount;
  profile.total_signals = totalSignals;

  const processingTimeMs = Date.now() - startTime;

  return {
    profile,
    metadata: {
      processedAt: now,
      interactionCount,
      signalCount: totalSignals,
      processingTimeMs,
      warnings,
    },
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeProfile(
  customerId: string,
  customerName: string,
  currentProfile?: Partial<CustomerProfile>,
  options?: ProcessingOptions
): CustomerProfile {
  const now = new Date().toISOString();

  // Start with defaults
  const defaultProfile: CustomerProfile = {
    customer_id: customerId,
    customer_name: customerName,
    email: null,
    gender: 'all',
    pillars: {},
    brand_affinity: [],
    price_range: {
      low: null,
      high: null,
      sweet: null,
      confidence: 'none',
    },
    fit_preferences: {
      liked: [],
      disliked: [],
    },
    fabric_preferences: {
      liked: [],
      disliked: [],
    },
    color_affinity: {},
    negatives: [],
    semantic_memory: [],
    life_context: {
      hobbies: [],
      family: [],
      professional: [],
      other: [],
    },
    style_personality: null,
    confidence_score: 0,
    sessions_processed: 0,
    total_signals: 0,
    created_at: currentProfile?.created_at || now,
    updated_at: now,
    last_interaction_at: null,
  };

  // Merge with existing if in incremental mode
  if (options?.preserveExisting && currentProfile) {
    return {
      ...defaultProfile,
      ...currentProfile,
      customer_id: customerId, // Never override these
      customer_name: customerName,
    } as CustomerProfile;
  }

  return defaultProfile;
}

// ============================================================================
// SWIPE SESSION PROCESSING
// ============================================================================

interface SwipeProcessingResult {
  updates: Partial<CustomerProfile>;
  signalCount: number;
  warnings: string[];
}

function processSwipeSessions(
  sessions: SwipeSession[],
  currentProfile: CustomerProfile,
  options: ProcessingOptions
): SwipeProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  // Aggregate all liked cards across sessions
  const likedCards: any[] = [];
  const dislikedCards: any[] = [];

  sessions.forEach((session) => {
    session.cards.forEach((card) => {
      signalCount++; // Every card interaction is a signal
      if (card.verdict === 'yes') {
        likedCards.push(card);
      } else {
        dislikedCards.push(card);
      }
    });
  });

  if (likedCards.length === 0) {
    warnings.push('No liked cards found - pillars will be empty');
  }

  // Calculate pillars from liked cards
  const pillars = calculatePillarsFromCards(likedCards, currentProfile.pillars, options);

  // Calculate color affinity
  const color_affinity = calculateColorAffinity(likedCards, currentProfile.color_affinity, options);

  // Extract negatives from disliked cards
  const negatives = extractNegatives(dislikedCards, currentProfile.negatives, options);

  // Update gender if determinable
  const gender = inferGender(likedCards, currentProfile.gender);

  return {
    updates: {
      pillars,
      color_affinity,
      negatives,
      gender,
    },
    signalCount,
    warnings,
  };
}

// ============================================================================
// PILLAR CALCULATION
// ============================================================================

function calculatePillarsFromCards(
  likedCards: any[],
  existingPillars: Record<string, number>,
  options: ProcessingOptions
): Record<string, number> {
  // Count pillar occurrences from card tags
  const pillarCounts: Record<string, number> = options.preserveExisting
    ? { ...existingPillars }
    : {};

  likedCards.forEach((card) => {
    const pillars = card.tags?.pillars || [];
    pillars.forEach((pillar: string) => {
      const normalized = normalizePillarName(pillar);
      pillarCounts[normalized] = (pillarCounts[normalized] || 0) + 1;
    });
  });

  // Convert to percentages
  const totalCount = Object.values(pillarCounts).reduce((sum, count) => sum + count, 0);

  if (totalCount === 0) {
    return {};
  }

  // Sort and take top pillars, then normalize to percentages
  const sorted = Object.entries(pillarCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 9); // Keep all 9 pillars for radar chart

  const percentages: Record<string, number> = {};
  sorted.forEach(([pillar, count]) => {
    percentages[pillar] = Math.round((count / totalCount) * 100);
  });

  // Ensure percentages sum to 100 (adjust largest if needed)
  const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
  if (sum !== 100 && sorted.length > 0) {
    const [largestPillar] = sorted[0];
    percentages[largestPillar] += (100 - sum);
  }

  return percentages;
}

function normalizePillarName(pillar: string): string {
  const normalized = pillar.toLowerCase().trim();

  // Map common variations
  const mappings: Record<string, string> = {
    'fashion_forward': 'fashionForward',
    'fashion-forward': 'fashionForward',
    'streetwear': 'streetwear',
  };

  return mappings[normalized] || normalized;
}

// ============================================================================
// COLOR AFFINITY
// ============================================================================

function calculateColorAffinity(
  likedCards: any[],
  existingAffinity: Record<string, number>,
  options: ProcessingOptions
): Record<string, number> {
  const colorCounts: Record<string, number> = options.preserveExisting
    ? { ...existingAffinity }
    : {};

  likedCards.forEach((card) => {
    const color = card.tags?.colorFamily;
    if (color) {
      const normalized = color.toLowerCase();
      colorCounts[normalized] = (colorCounts[normalized] || 0) + 1;
    }
  });

  // Convert to scores (0-100 based on frequency)
  const maxCount = Math.max(...Object.values(colorCounts), 1);
  const scores: Record<string, number> = {};

  Object.entries(colorCounts).forEach(([color, count]) => {
    scores[color] = Math.round((count / maxCount) * 100);
  });

  return scores;
}

// ============================================================================
// NEGATIVES EXTRACTION
// ============================================================================

function extractNegatives(
  dislikedCards: any[],
  existingNegatives: CustomerProfile['negatives'],
  options: ProcessingOptions
): CustomerProfile['negatives'] {
  const negatives = options.preserveExisting ? [...existingNegatives] : [];
  const now = new Date().toISOString();

  // Extract strong patterns from dislikes
  const pillarDislikes: Record<string, number> = {};
  const colorDislikes: Record<string, number> = {};

  dislikedCards.forEach((card) => {
    // Track disliked pillars
    (card.tags?.pillars || []).forEach((pillar: string) => {
      pillarDislikes[pillar] = (pillarDislikes[pillar] || 0) + 1;
    });

    // Track disliked colors
    if (card.tags?.colorFamily) {
      colorDislikes[card.tags.colorFamily] = (colorDislikes[card.tags.colorFamily] || 0) + 1;
    }
  });

  // Add strong negatives (>30% of dislikes)
  const threshold = dislikedCards.length * 0.3;

  Object.entries(pillarDislikes).forEach(([pillar, count]) => {
    if (count >= threshold) {
      negatives.push({
        type: 'pillar',
        value: pillar,
        strength: count > threshold * 1.5 ? 'strong' : 'moderate',
        source: 'swipe_sessions',
        timestamp: now,
      });
    }
  });

  Object.entries(colorDislikes).forEach(([color, count]) => {
    if (count >= threshold) {
      negatives.push({
        type: 'color',
        value: color,
        strength: count > threshold * 1.5 ? 'strong' : 'moderate',
        source: 'swipe_sessions',
        timestamp: now,
      });
    }
  });

  return negatives;
}

// ============================================================================
// GENDER INFERENCE
// ============================================================================

function inferGender(
  likedCards: any[],
  currentGender: 'womenswear' | 'menswear' | 'all'
): 'womenswear' | 'menswear' | 'all' {
  const genderCounts = { womenswear: 0, menswear: 0 };

  likedCards.forEach((card) => {
    const gender = card.tags?.gender;
    if (gender === 'womenswear' || gender === 'womens') {
      genderCounts.womenswear++;
    } else if (gender === 'menswear' || gender === 'mens') {
      genderCounts.menswear++;
    }
  });

  // Need >80% consistency to set gender
  const total = genderCounts.womenswear + genderCounts.menswear;
  if (total === 0) return currentGender;

  const womensPercent = genderCounts.womenswear / total;
  const mensPercent = genderCounts.menswear / total;

  if (womensPercent > 0.8) return 'womenswear';
  if (mensPercent > 0.8) return 'menswear';

  return 'all';
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateConfidenceScore(
  profile: CustomerProfile,
  interactionCount: number,
  signalCount: number
): number {
  // Base score from signal count
  let score = Math.min(signalCount / 100, 0.7); // Max 70% from signals

  // Boost from pillar diversity
  const pillarCount = Object.keys(profile.pillars).length;
  if (pillarCount >= 3) score += 0.1;
  if (pillarCount >= 5) score += 0.1;

  // Boost from multiple interaction types
  if (interactionCount > 5) score += 0.05;
  if (interactionCount > 10) score += 0.05;

  return Math.min(score, 1.0);
}

// ============================================================================
// STYLE PERSONALITY GENERATION
// ============================================================================

function generateStylePersonality(
  profile: CustomerProfile,
  customerName: string
): string {
  const firstName = customerName.split(' ')[0];

  // Get top 3 pillars
  const topPillars = Object.entries(profile.pillars)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => formatPillarName(name));

  if (topPillars.length === 0) {
    return `${firstName} is building their style profile. As more interactions are captured, a unique style personality will emerge.`;
  }

  // Get top color if available
  const topColor = Object.entries(profile.color_affinity)
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  // Build narrative
  const pillarDesc = topPillars.length === 1
    ? topPillars[0]
    : topPillars.length === 2
    ? `${topPillars[0]} and ${topPillars[1]}`
    : `${topPillars[0]}, ${topPillars[1]}, and ${topPillars[2]}`;

  let narrative = `${firstName}'s style leans ${pillarDesc}`;

  if (topColor) {
    narrative += `, with a strong affinity for ${topColor} tones`;
  }

  narrative += `. `;

  // Add confidence qualifier
  if (profile.confidence_score < 0.5) {
    narrative += `This profile is still developing and will become more refined with additional interactions.`;
  } else if (profile.confidence_score < 0.8) {
    narrative += `The profile shows clear preferences with room to learn more nuances.`;
  } else {
    narrative += `This profile is well-established with strong, consistent signals.`;
  }

  return narrative;
}

function formatPillarName(pillar: string): string {
  if (pillar === 'fashionForward') return 'Fashion Forward';
  return pillar.charAt(0).toUpperCase() + pillar.slice(1);
}

// ============================================================================
// HELPER: Get Profile Summary
// ============================================================================

/**
 * Get a human-readable summary of a profile
 * Useful for debugging and logging
 */
export function getProfileSummary(profile: CustomerProfile): string {
  const topPillars = Object.entries(profile.pillars)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, weight]) => `${name}: ${weight}%`)
    .join(', ');

  return [
    `Customer: ${profile.customer_name}`,
    `Confidence: ${(profile.confidence_score * 100).toFixed(0)}%`,
    `Sessions: ${profile.sessions_processed}`,
    `Signals: ${profile.total_signals}`,
    `Top Pillars: ${topPillars || 'none'}`,
    `Colors: ${Object.keys(profile.color_affinity).length}`,
    `Negatives: ${profile.negatives.length}`,
  ].join(' | ');
}
