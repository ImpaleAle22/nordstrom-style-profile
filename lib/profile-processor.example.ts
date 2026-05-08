/**
 * Profile Processor - Usage Examples
 *
 * This file demonstrates how to use the profile processor in different scenarios.
 */

import { processProfile, getProfileSummary } from './profile-processor';
import type { InteractionData, SwipeSession } from './types';

// ============================================================================
// EXAMPLE 1: Process First-Time User (Batch Mode)
// ============================================================================

export function exampleFirstTimeUser() {
  console.log('=== EXAMPLE 1: First-Time User ===\n');

  // User just completed their first swipe session
  const swipeSessions: SwipeSession[] = [
    {
      session_id: 'swipe_001',
      customer_id: 'demo_alice',
      stack_id: 'broadcast_001',
      stack_type: 'broadcast',
      stack_recipe: 'style_discovery',
      completed_at: '2026-05-06T10:00:00Z',
      completion_type: 'full',
      card_count: 20,
      cards_viewed: 20,
      cards: [
        {
          cardId: 'lifestyle_001',
          cardType: 'lifestyle',
          verdict: 'yes',
          dwellMs: 3200,
          swipeVelocity: 'medium',
          saved: false,
          miniPdpOpened: false,
          tags: {
            pillars: ['minimal', 'classic'],
            gender: 'womenswear',
            colorFamily: 'neutral',
            formality: 6,
          },
        },
        {
          cardId: 'lifestyle_002',
          cardType: 'lifestyle',
          verdict: 'yes',
          dwellMs: 4100,
          swipeVelocity: 'slow',
          saved: true,
          miniPdpOpened: false,
          tags: {
            pillars: ['minimal'],
            gender: 'womenswear',
            colorFamily: 'black',
            formality: 7,
          },
        },
        {
          cardId: 'lifestyle_003',
          cardType: 'lifestyle',
          verdict: 'no',
          dwellMs: 1200,
          swipeVelocity: 'fast',
          saved: false,
          miniPdpOpened: false,
          tags: {
            pillars: ['maximal', 'bohemian'],
            gender: 'womenswear',
            colorFamily: 'bright',
            formality: 3,
          },
        },
        // ... more cards
      ],
      session_signals: {},
      reward_actions: null,
      meta: {},
      customer_department: 'womenswear',
      created_at: '2026-05-06T10:00:00Z',
    },
  ];

  const interactions: InteractionData = {
    swipeSessions,
  };

  // Process profile
  const result = processProfile(
    'demo_alice',
    'Alice Chen',
    interactions,
    undefined,
    { mode: 'batch' }
  );

  console.log('Profile Created:');
  console.log(getProfileSummary(result.profile));
  console.log('\nMetadata:');
  console.log(`  Processing Time: ${result.metadata.processingTimeMs}ms`);
  console.log(`  Interactions Processed: ${result.metadata.interactionCount}`);
  console.log(`  Total Signals: ${result.metadata.signalCount}`);
  console.log('\nStyle Personality:');
  console.log(`  "${result.profile.style_personality}"`);
  console.log('\nWarnings:', result.metadata.warnings);
}

// ============================================================================
// EXAMPLE 2: Incremental Update (User Returns)
// ============================================================================

export function exampleIncrementalUpdate() {
  console.log('\n\n=== EXAMPLE 2: Incremental Update ===\n');

  // Existing profile from previous session
  const existingProfile = {
    customer_id: 'demo_alice',
    customer_name: 'Alice Chen',
    email: null,
    gender: 'womenswear' as const,
    pillars: {
      minimal: 45,
      classic: 35,
      casual: 20,
    },
    brand_affinity: [],
    price_range: { low: null, high: null, sweet: null, confidence: 'none' as const },
    fit_preferences: { liked: [], disliked: [] },
    fabric_preferences: { liked: [], disliked: [] },
    color_affinity: { neutral: 80, black: 100, white: 60 },
    negatives: [],
    semantic_memory: [],
    life_context: { hobbies: [], family: [], professional: [], other: [] },
    style_personality: 'Alice\'s style leans Minimal and Classic...',
    confidence_score: 0.35,
    sessions_processed: 1,
    total_signals: 20,
    created_at: '2026-05-06T10:00:00Z',
    updated_at: '2026-05-06T10:00:00Z',
    last_interaction_at: '2026-05-06T10:00:00Z',
  };

  // New swipe session - user comes back and does another stack
  const newSession: SwipeSession = {
    session_id: 'swipe_002',
    customer_id: 'demo_alice',
    stack_id: 'deepening_001',
    stack_type: 'deepening',
    stack_recipe: 'minimal_deepdive',
    completed_at: '2026-05-06T15:00:00Z',
    completion_type: 'full',
    card_count: 15,
    cards_viewed: 15,
    cards: [
      {
        cardId: 'outfit_001',
        cardType: 'outfit',
        verdict: 'yes',
        dwellMs: 5200,
        swipeVelocity: 'slow',
        saved: true,
        miniPdpOpened: true,
        tags: {
          pillars: ['minimal', 'utility'],
          gender: 'womenswear',
          colorFamily: 'olive',
          formality: 5,
        },
      },
      // ... more cards
    ],
    session_signals: {},
    reward_actions: null,
    meta: {},
    customer_department: 'womenswear',
    created_at: '2026-05-06T15:00:00Z',
  };

  const interactions: InteractionData = {
    swipeSessions: [newSession],
  };

  // Process incrementally
  const result = processProfile(
    'demo_alice',
    'Alice Chen',
    interactions,
    existingProfile,
    { mode: 'incremental', preserveExisting: true }
  );

  console.log('Profile Updated:');
  console.log(getProfileSummary(result.profile));
  console.log('\nPillar Changes:');
  console.log('  Before:', existingProfile.pillars);
  console.log('  After:', result.profile.pillars);
  console.log('\nConfidence:');
  console.log(`  Before: ${(existingProfile.confidence_score * 100).toFixed(0)}%`);
  console.log(`  After: ${(result.profile.confidence_score * 100).toFixed(0)}%`);
}

// ============================================================================
// EXAMPLE 3: Batch Process Persona (Pre-built Demo)
// ============================================================================

export function exampleBatchPersona() {
  console.log('\n\n=== EXAMPLE 3: Batch Process Persona ===\n');

  // Persona with rich interaction history (pre-built for demo)
  const personaSessions: SwipeSession[] = [
    // Session 1: Style discovery
    createMockSession('session_01', 'minimal', 15),
    // Session 2: Deepening minimal
    createMockSession('session_02', 'minimal', 12),
    // Session 3: Classic exploration
    createMockSession('session_03', 'classic', 10),
    // Session 4: Casual weekend
    createMockSession('session_04', 'casual', 8),
  ];

  const interactions: InteractionData = {
    swipeSessions: personaSessions,
  };

  // Process all at once
  const result = processProfile(
    'persona_minimal_maya',
    'Maya Kim',
    interactions,
    undefined,
    { mode: 'batch' }
  );

  console.log('Persona Profile Created:');
  console.log(getProfileSummary(result.profile));
  console.log('\nPillars:', result.profile.pillars);
  console.log('\nColor Affinity:', result.profile.color_affinity);
  console.log('\nNegatives:', result.profile.negatives);
  console.log('\nStyle Personality:');
  console.log(`  "${result.profile.style_personality}"`);
  console.log('\nProcessing Stats:');
  console.log(`  Sessions: ${result.metadata.interactionCount}`);
  console.log(`  Signals: ${result.metadata.signalCount}`);
  console.log(`  Time: ${result.metadata.processingTimeMs}ms`);
}

// ============================================================================
// HELPER: Create Mock Session
// ============================================================================

function createMockSession(
  sessionId: string,
  dominantPillar: string,
  cardCount: number
): SwipeSession {
  const cards = Array.from({ length: cardCount }, (_, i) => ({
    cardId: `card_${sessionId}_${i}`,
    cardType: 'lifestyle' as const,
    verdict: (i % 3 === 0 ? 'no' : 'yes') as 'yes' | 'no',
    dwellMs: Math.floor(Math.random() * 4000) + 1000,
    swipeVelocity: 'medium' as const,
    saved: i % 5 === 0,
    miniPdpOpened: false,
    tags: {
      pillars: [dominantPillar, ['classic', 'casual', 'utility'][i % 3]],
      gender: 'womenswear',
      colorFamily: ['neutral', 'black', 'navy', 'olive'][i % 4],
      formality: 5 + (i % 3),
    },
  }));

  return {
    session_id: sessionId,
    customer_id: 'persona_mock',
    stack_id: 'stack_mock',
    stack_type: 'broadcast',
    stack_recipe: 'style_discovery',
    completed_at: new Date().toISOString(),
    completion_type: 'full',
    card_count: cardCount,
    cards_viewed: cardCount,
    cards,
    session_signals: {},
    reward_actions: null,
    meta: {},
    customer_department: 'womenswear',
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

if (require.main === module) {
  exampleFirstTimeUser();
  exampleIncrementalUpdate();
  exampleBatchPersona();
}
