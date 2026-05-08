/**
 * Profile Brain
 *
 * Central intelligence that processes all customer interactions and builds
 * a comprehensive style profile.
 *
 * Architecture:
 * - Ingests interactions from multiple sources (swipes, quiz, purchases, etc.)
 * - Extracts signals from structured and unstructured data
 * - Calculates profile dimensions (pillars, colors, brands, memory)
 * - Returns complete CustomerProfile
 *
 * Works in two modes:
 * - Incremental: Process new interactions, merge with existing profile
 * - Batch: Process full interaction history (for building personas)
 */

import type { CustomerProfile } from './types';
import type { Interaction } from './interaction-types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input to the Profile Brain
 */
export interface ProfileBrainInput {
  customerId: string;
  customerName: string;
  interactions: Interaction[];
  currentProfile?: Partial<CustomerProfile>;
  options?: ProcessingOptions;
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  mode: 'incremental' | 'batch';
  preserveExisting?: boolean;
  confidenceBoost?: number;
  timestamp?: string;
}

/**
 * Output from the Profile Brain
 */
export interface ProfileBrainOutput {
  profile: CustomerProfile;
  metadata: {
    processedAt: string;
    interactionCount: number;
    signalCount: number;
    processingTimeMs: number;
    warnings: string[];
    breakdown: {
      swipes: number;
      quiz: number;
      purchases: number;
      wishlist: number;
      ral: number;
      chat: number;
      hides: number;
      views: number;
      searches: number;
      outfits: number;
    };
  };
}

// ============================================================================
// MAIN BRAIN FUNCTION
// ============================================================================

/**
 * Process interactions through the Profile Brain
 *
 * @param input - Customer ID, interactions, optional existing profile
 * @returns Complete customer profile with metadata
 */
export function processInteractions(input: ProfileBrainInput): ProfileBrainOutput {
  const startTime = Date.now();
  const warnings: string[] = [];
  const now = input.options?.timestamp || new Date().toISOString();

  // Initialize profile
  const profile = initializeProfile(
    input.customerId,
    input.customerName,
    input.currentProfile,
    input.options
  );

  // Group interactions by type
  const grouped = groupInteractionsByType(input.interactions);

  // Track breakdown
  const breakdown = {
    swipes: grouped.style_swipe.length,
    quiz: grouped.style_quiz.length,
    purchases: grouped.purchase.length,
    wishlist: grouped.wishlist_add.length,
    ral: grouped.request_a_look.length,
    chat: grouped.ai_chat.length,
    hides: grouped.product_hide.length,
    views: grouped.product_view.length + grouped.product_click.length,
    searches: grouped.search.length,
    outfits: grouped.outfit_save.length + grouped.outfit_edit.length,
  };

  let totalSignals = 0;

  // Process each interaction type
  if (grouped.style_swipe.length > 0) {
    const result = processSwipeInteractions(grouped.style_swipe, profile, input.options);
    Object.assign(profile, result.updates);
    totalSignals += result.signalCount;
    warnings.push(...result.warnings);
  }

  if (grouped.style_quiz.length > 0) {
    const result = processQuizInteractions(grouped.style_quiz, profile, input.options);
    Object.assign(profile, result.updates);
    totalSignals += result.signalCount;
    warnings.push(...result.warnings);
  }

  if (grouped.purchase.length > 0) {
    const result = processPurchaseInteractions(grouped.purchase, profile, input.options);
    Object.assign(profile, result.updates);
    totalSignals += result.signalCount;
    warnings.push(...result.warnings);
  }

  if (grouped.wishlist_add.length > 0) {
    const result = processWishlistInteractions(grouped.wishlist_add, profile, input.options);
    Object.assign(profile, result.updates);
    totalSignals += result.signalCount;
    warnings.push(...result.warnings);
  }

  if (grouped.request_a_look.length > 0) {
    const result = processRALInteractions(grouped.request_a_look, profile, input.options);
    Object.assign(profile, result.updates);
    totalSignals += result.signalCount;
    warnings.push(...result.warnings);
  }

  if (grouped.ai_chat.length > 0) {
    const result = processChatInteractions(grouped.ai_chat, profile, input.options);
    Object.assign(profile, result.updates);
    totalSignals += result.signalCount;
    warnings.push(...result.warnings);
  }

  if (grouped.product_hide.length > 0) {
    const result = processHideInteractions(grouped.product_hide, profile, input.options);
    Object.assign(profile, result.updates);
    totalSignals += result.signalCount;
    warnings.push(...result.warnings);
  }

  // Calculate final confidence score
  profile.confidence_score = calculateConfidenceScore(
    profile,
    input.interactions.length,
    totalSignals,
    breakdown
  );

  // Generate style personality if we have enough data
  if (profile.confidence_score > 0.3) {
    profile.style_personality = generateStylePersonality(profile, input.customerName);
  }

  // Update metadata
  profile.updated_at = now;
  profile.last_interaction_at = now;
  profile.sessions_processed = (input.currentProfile?.sessions_processed || 0) + input.interactions.length;
  profile.total_signals = totalSignals;

  const processingTimeMs = Date.now() - startTime;

  return {
    profile,
    metadata: {
      processedAt: now,
      interactionCount: input.interactions.length,
      signalCount: totalSignals,
      processingTimeMs,
      warnings,
      breakdown,
    },
  };
}

// ============================================================================
// GROUP INTERACTIONS BY TYPE
// ============================================================================

function groupInteractionsByType(interactions: Interaction[]) {
  const groups: Record<string, any[]> = {
    style_swipe: [],
    style_quiz: [],
    purchase: [],
    wishlist_add: [],
    request_a_look: [],
    ai_chat: [],
    product_hide: [],
    product_view: [],
    product_click: [],
    search: [],
    outfit_save: [],
    outfit_edit: [],
  };

  interactions.forEach((interaction) => {
    const type = interaction.interaction_type;
    if (groups[type]) {
      groups[type].push(interaction);
    }
  });

  return groups;
}

// ============================================================================
// INITIALIZE PROFILE
// ============================================================================

function initializeProfile(
  customerId: string,
  customerName: string,
  currentProfile?: Partial<CustomerProfile>,
  options?: ProcessingOptions
): CustomerProfile {
  const now = new Date().toISOString();

  const defaultProfile: CustomerProfile = {
    customer_id: customerId,
    customer_name: customerName,
    email: null,
    gender: 'all',
    pillars: {},
    brand_affinity: [],
    price_range: { low: null, high: null, sweet: null, confidence: 'none' },
    fit_preferences: { liked: [], disliked: [] },
    fabric_preferences: { liked: [], disliked: [] },
    color_affinity: {},
    negatives: [],
    semantic_memory: [],
    life_context: { hobbies: [], family: [], professional: [], other: [] },
    style_personality: null,
    confidence_score: 0,
    sessions_processed: 0,
    total_signals: 0,
    created_at: currentProfile?.created_at || now,
    updated_at: now,
    last_interaction_at: null,
  };

  if (options?.preserveExisting && currentProfile) {
    return {
      ...defaultProfile,
      ...currentProfile,
      customer_id: customerId,
      customer_name: customerName,
    } as CustomerProfile;
  }

  return defaultProfile;
}

// ============================================================================
// PROCESSING RESULT TYPE
// ============================================================================

interface ProcessingResult {
  updates: Partial<CustomerProfile>;
  signalCount: number;
  warnings: string[];
}

// ============================================================================
// 1. PROCESS SWIPE INTERACTIONS
// ============================================================================

function processSwipeInteractions(
  interactions: any[],
  currentProfile: CustomerProfile,
  options?: ProcessingOptions
): ProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  // Aggregate all cards across all swipe sessions
  const allCards: any[] = [];

  interactions.forEach((interaction) => {
    interaction.data.cards.forEach((card: any) => {
      signalCount++;
      allCards.push({
        verdict: card.verdict,
        tags: card.content_tags,
        productIds: card.product_ids,
        outfitId: card.outfit_id,
        saved: card.saved,
        dwellMs: card.dwell_ms,
      });
    });
  });

  const likedCards = allCards.filter((c) => c.verdict === 'yes');
  const dislikedCards = allCards.filter((c) => c.verdict === 'no');

  if (likedCards.length === 0) {
    warnings.push('No liked cards in swipe interactions');
  }

  // Calculate pillars
  const pillars = calculatePillars(
    likedCards.map((c) => c.tags.pillars).flat().filter(Boolean),
    currentProfile.pillars,
    options
  );

  // Calculate colors
  const color_affinity = calculateColorAffinity(
    likedCards.map((c) => c.tags.colors).flat().filter(Boolean),
    currentProfile.color_affinity,
    options
  );

  // Extract negatives
  const negatives = extractNegativesFromDislikes(
    dislikedCards,
    currentProfile.negatives,
    options
  );

  // Infer gender
  const gender = inferGender(
    likedCards.map((c) => c.tags.gender).filter(Boolean),
    currentProfile.gender
  );

  return {
    updates: { pillars, color_affinity, negatives, gender },
    signalCount,
    warnings,
  };
}

// ============================================================================
// 2. PROCESS QUIZ INTERACTIONS
// ============================================================================

function processQuizInteractions(
  interactions: any[],
  currentProfile: CustomerProfile,
  options?: ProcessingOptions
): ProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  const pillarPreferences: string[] = [];
  const colorPreferences: string[] = [];
  const textInputs: string[] = [];

  interactions.forEach((interaction) => {
    interaction.data.questions.forEach((q: any) => {
      signalCount++;

      // Image selections
      if (q.selected_images) {
        q.selected_images.forEach((img: any) => {
          if (img.tags.pillars) pillarPreferences.push(...img.tags.pillars);
          if (img.tags.colors) colorPreferences.push(...img.tags.colors);
        });
      }

      // Multiple choice pillars
      if (q.selected_options) {
        pillarPreferences.push(...q.selected_options);
      }

      // Text inputs (add to memory)
      if (q.text_response) {
        textInputs.push(q.text_response);
      }
    });
  });

  // Quiz responses are STATED preferences - high confidence
  const pillars = calculatePillars(pillarPreferences, currentProfile.pillars, options);
  const color_affinity = calculateColorAffinity(colorPreferences, currentProfile.color_affinity, options);

  // Add text responses to semantic memory
  const semantic_memory = [...currentProfile.semantic_memory];
  textInputs.forEach((text) => {
    semantic_memory.push({
      id: `quiz_${Date.now()}_${Math.random()}`,
      type: 'stated',
      text,
      source: 'style_quiz',
      weight: 1.0, // High weight for stated preferences
      timestamp: new Date().toISOString(),
    });
  });

  return {
    updates: { pillars, color_affinity, semantic_memory },
    signalCount,
    warnings,
  };
}

// ============================================================================
// 3. PROCESS PURCHASE INTERACTIONS
// ============================================================================

function processPurchaseInteractions(
  interactions: any[],
  currentProfile: CustomerProfile,
  options?: ProcessingOptions
): ProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  const purchasedPillars: string[] = [];
  const purchasedColors: string[] = [];
  const brands: Map<string, number> = new Map();
  const prices: number[] = [];

  interactions.forEach((interaction) => {
    interaction.data.items.forEach((item: any) => {
      signalCount++;

      if (item.style_attributes?.pillars) {
        purchasedPillars.push(...item.style_attributes.pillars);
      }
      if (item.style_attributes?.colors) {
        purchasedColors.push(...item.style_attributes.colors);
      }

      // Brand affinity
      brands.set(item.brand, (brands.get(item.brand) || 0) + 1);

      // Price tracking
      prices.push(item.price);

      // Returns are negative signals
      if (item.returned) {
        // TODO: Add to negatives
      }
    });
  });

  // Purchases are STRONG signals (3x weight)
  const pillars = calculatePillars(
    purchasedPillars,
    currentProfile.pillars,
    { ...options, weight: 3 }
  );

  const color_affinity = calculateColorAffinity(
    purchasedColors,
    currentProfile.color_affinity,
    { ...options, weight: 3 }
  );

  // Calculate brand affinity
  const brand_affinity = Array.from(brands.entries()).map(([brand, count]) => ({
    brand,
    score: count,
    confidence: count > 3 ? 'high' : count > 1 ? 'medium' : 'low',
    sources: ['purchase'],
    lastSignal: new Date().toISOString(),
  }));

  // Calculate price range
  const price_range = {
    low: Math.min(...prices),
    high: Math.max(...prices),
    sweet: prices.reduce((a, b) => a + b, 0) / prices.length,
    confidence: prices.length > 5 ? 'high' : prices.length > 2 ? 'medium' : 'low',
  };

  return {
    updates: { pillars, color_affinity, brand_affinity, price_range },
    signalCount,
    warnings,
  };
}

// ============================================================================
// 4. PROCESS WISHLIST INTERACTIONS
// ============================================================================

function processWishlistInteractions(
  interactions: any[],
  currentProfile: CustomerProfile,
  options?: ProcessingOptions
): ProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  const savedPillars: string[] = [];
  const savedColors: string[] = [];

  interactions.forEach((interaction) => {
    signalCount++;
    const attrs = interaction.data.style_attributes;
    if (attrs?.pillars) savedPillars.push(...attrs.pillars);
    if (attrs?.colors) savedColors.push(...attrs.colors);
  });

  // Saves are medium-strength signals (1.5x weight)
  const pillars = calculatePillars(savedPillars, currentProfile.pillars, { ...options, weight: 1.5 });
  const color_affinity = calculateColorAffinity(savedColors, currentProfile.color_affinity, { ...options, weight: 1.5 });

  return {
    updates: { pillars, color_affinity },
    signalCount,
    warnings,
  };
}

// ============================================================================
// 5. PROCESS REQUEST A LOOK (RAL) INTERACTIONS
// ============================================================================

function processRALInteractions(
  interactions: any[],
  currentProfile: CustomerProfile,
  options?: ProcessingOptions
): ProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  const semantic_memory = [...currentProfile.semantic_memory];

  interactions.forEach((interaction) => {
    signalCount++;

    // Description text goes into memory as STATED preference
    if (interaction.data.description) {
      semantic_memory.push({
        id: `ral_${interaction.interaction_id}`,
        type: 'stated',
        text: interaction.data.description,
        source: 'request_a_look',
        weight: 1.0,
        timestamp: interaction.timestamp,
      });
    }

    // Occasion tracking
    if (interaction.data.occasion) {
      semantic_memory.push({
        id: `ral_occasion_${interaction.interaction_id}`,
        type: 'life_context',
        text: `Needs outfits for: ${interaction.data.occasion}`,
        source: 'request_a_look',
        weight: 0.8,
        timestamp: interaction.timestamp,
      });
    }

    // Feedback on recommendations
    if (interaction.data.feedback) {
      // Liked items are positive signals
      // Disliked items are negative signals
      // TODO: Process these
    }
  });

  return {
    updates: { semantic_memory },
    signalCount,
    warnings,
  };
}

// ============================================================================
// 6. PROCESS AI CHAT INTERACTIONS
// ============================================================================

function processChatInteractions(
  interactions: any[],
  currentProfile: CustomerProfile,
  options?: ProcessingOptions
): ProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  const semantic_memory = [...currentProfile.semantic_memory];
  const life_context = { ...currentProfile.life_context };

  interactions.forEach((interaction) => {
    signalCount += interaction.data.messages.length;

    // Use extracted signals if available
    const signals = interaction.data.extracted_signals;

    if (signals?.stated_preferences) {
      signals.stated_preferences.forEach((pref: string) => {
        semantic_memory.push({
          id: `chat_stated_${Date.now()}_${Math.random()}`,
          type: 'stated',
          text: pref,
          source: 'ai_chat',
          weight: 1.0,
          timestamp: interaction.timestamp,
        });
      });
    }

    if (signals?.inferred_preferences) {
      signals.inferred_preferences.forEach((pref: string) => {
        semantic_memory.push({
          id: `chat_inferred_${Date.now()}_${Math.random()}`,
          type: 'inferred',
          text: pref,
          source: 'ai_chat',
          weight: 0.7,
          timestamp: interaction.timestamp,
        });
      });
    }

    if (signals?.life_context) {
      signals.life_context.forEach((context: string) => {
        semantic_memory.push({
          id: `chat_context_${Date.now()}_${Math.random()}`,
          type: 'life_context',
          text: context,
          source: 'ai_chat',
          weight: 0.9,
          timestamp: interaction.timestamp,
        });
        // TODO: Parse and categorize into life_context structure
      });
    }
  });

  return {
    updates: { semantic_memory, life_context },
    signalCount,
    warnings,
  };
}

// ============================================================================
// 7. PROCESS HIDE INTERACTIONS (Negative Signals)
// ============================================================================

function processHideInteractions(
  interactions: any[],
  currentProfile: CustomerProfile,
  options?: ProcessingOptions
): ProcessingResult {
  const warnings: string[] = [];
  let signalCount = 0;

  const negatives = [...currentProfile.negatives];

  interactions.forEach((interaction) => {
    signalCount++;

    const attrs = interaction.data.product_attributes;

    // Strong negative signal - they explicitly hid this
    if (attrs?.pillars) {
      attrs.pillars.forEach((pillar: string) => {
        negatives.push({
          type: 'pillar',
          value: pillar,
          strength: 'strong',
          source: 'product_hide',
          timestamp: interaction.timestamp,
        });
      });
    }

    if (attrs?.category) {
      negatives.push({
        type: 'category',
        value: attrs.category,
        strength: 'moderate',
        source: 'product_hide',
        timestamp: interaction.timestamp,
      });
    }

    if (interaction.data.brand) {
      negatives.push({
        type: 'brand',
        value: interaction.data.brand,
        strength: 'moderate',
        source: 'product_hide',
        timestamp: interaction.timestamp,
      });
    }
  });

  return {
    updates: { negatives },
    signalCount,
    warnings,
  };
}

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

function calculatePillars(
  pillarList: string[],
  existing: Record<string, number>,
  options?: any
): Record<string, number> {
  const weight = options?.weight || 1;
  const counts: Record<string, number> = options?.preserveExisting ? { ...existing } : {};

  pillarList.forEach((pillar) => {
    const normalized = pillar.toLowerCase().replace(/[_-]/g, '');
    counts[normalized] = (counts[normalized] || 0) + weight;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return {};

  const percentages: Record<string, number> = {};
  Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 9)
    .forEach(([pillar, count]) => {
      percentages[pillar] = Math.round((count / total) * 100);
    });

  return percentages;
}

function calculateColorAffinity(
  colorList: string[],
  existing: Record<string, number>,
  options?: any
): Record<string, number> {
  const weight = options?.weight || 1;
  const counts: Record<string, number> = options?.preserveExisting ? { ...existing } : {};

  colorList.forEach((color) => {
    const normalized = color.toLowerCase();
    counts[normalized] = (counts[normalized] || 0) + weight;
  });

  const maxCount = Math.max(...Object.values(counts), 1);
  const scores: Record<string, number> = {};

  Object.entries(counts).forEach(([color, count]) => {
    scores[color] = Math.round((count / maxCount) * 100);
  });

  return scores;
}

function extractNegativesFromDislikes(
  dislikedCards: any[],
  existing: any[],
  options?: any
): any[] {
  const negatives = options?.preserveExisting ? [...existing] : [];
  const threshold = Math.max(dislikedCards.length * 0.3, 3);

  const pillarCounts: Record<string, number> = {};
  dislikedCards.forEach((card) => {
    (card.tags.pillars || []).forEach((p: string) => {
      pillarCounts[p] = (pillarCounts[p] || 0) + 1;
    });
  });

  Object.entries(pillarCounts).forEach(([pillar, count]) => {
    if (count >= threshold) {
      negatives.push({
        type: 'pillar',
        value: pillar,
        strength: 'strong',
        source: 'style_swipe',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return negatives;
}

function inferGender(
  genderList: string[],
  current: 'womenswear' | 'menswear' | 'all'
): 'womenswear' | 'menswear' | 'all' {
  const counts = { womenswear: 0, menswear: 0 };
  genderList.forEach((g) => {
    if (g === 'womenswear' || g === 'womens') counts.womenswear++;
    if (g === 'menswear' || g === 'mens') counts.menswear++;
  });

  const total = counts.womenswear + counts.menswear;
  if (total === 0) return current;

  if (counts.womenswear / total > 0.8) return 'womenswear';
  if (counts.menswear / total > 0.8) return 'menswear';
  return 'all';
}

function calculateConfidenceScore(
  profile: CustomerProfile,
  interactionCount: number,
  signalCount: number,
  breakdown: any
): number {
  let score = Math.min(signalCount / 100, 0.5);

  // Pillar diversity
  const pillarCount = Object.keys(profile.pillars).length;
  if (pillarCount >= 3) score += 0.1;
  if (pillarCount >= 5) score += 0.1;

  // Interaction diversity
  const types = Object.values(breakdown).filter((v) => v > 0).length;
  score += types * 0.05;

  // Volume
  if (interactionCount > 5) score += 0.1;
  if (interactionCount > 10) score += 0.1;

  return Math.min(score, 1.0);
}

function generateStylePersonality(profile: CustomerProfile, name: string): string {
  const firstName = name.split(' ')[0];
  const topPillars = Object.entries(profile.pillars)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([n]) => n);

  if (topPillars.length === 0) {
    return `${firstName} is building their style profile.`;
  }

  return `${firstName}'s style leans ${topPillars.join(', ')}.`;
}

// ============================================================================
// HELPER: Get Profile Summary
// ============================================================================

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
  ].join(' | ');
}
