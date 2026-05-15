/**
 * Dummy Data Generator
 * Helper functions to generate rich CustomerProfile objects for testing
 */

import type { CustomerProfile } from './types';

/**
 * Generates a fully populated CustomerProfile with realistic dummy data
 * Useful for testing ProfileView with all features
 */
export function generateDummyProfile(overrides?: Partial<CustomerProfile>): CustomerProfile {
  const now = Date.now();
  const customerId = overrides?.customer_id || `dummy_${Math.random().toString(36).substr(2, 9)}`;
  const customerName = overrides?.customer_name || 'Taylor Morgan';

  return {
    // Identity
    customer_id: customerId,
    customer_name: customerName,
    email: null,
    gender: 'womenswear',

    // Style Intelligence
    pillars: {
      'Minimal': 30,
      'Classic': 25,
      'Modern': 20,
      'Casual': 15,
      'Professional': 10,
    },

    // Brand Affinity
    brand_affinity: [
      {
        brand: 'Everlane',
        score: 0.92,
        confidence: 'high',
        sources: ['likes', 'purchases'],
        lastSignal: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'Vince',
        score: 0.85,
        confidence: 'high',
        sources: ['likes'],
        lastSignal: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],

    // Price Intelligence
    price_range: {
      low: 75,
      high: 350,
      sweet: 150,
      confidence: 'high',
    },

    // Preferences
    fit_preferences: {
      liked: ['tailored', 'straight-leg', 'relaxed'],
      disliked: ['bodycon', 'ultra-cropped'],
    },

    fabric_preferences: {
      liked: ['cotton', 'linen', 'wool'],
      disliked: ['polyester', 'synthetic'],
    },

    color_affinity: {
      'black': 0.95,
      'white': 0.90,
      'grey': 0.85,
      'navy': 0.80,
      'beige': 0.75,
    },

    // Negatives
    negatives: [],

    // Semantic Memory
    semantic_memory: [
      {
        id: 'mem_001',
        type: 'inferred',
        text: 'Prefers timeless, investment pieces over trendy fast fashion',
        source: 'swipe_patterns',
        weight: 0.92,
        timestamp: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],

    // Life Context
    life_context: {
      hobbies: [],
      family: [],
      professional: ['tech industry', 'hybrid work'],
      other: [],
    },

    // Style Personality
    style_personality: `${customerName} has a refined minimalist aesthetic with classic sensibilities. Prefers clean lines, timeless pieces, and sophisticated neutrals.`,

    // Confidence & Status
    confidence_score: 0.80,
    sessions_processed: 10,
    total_signals: 150,

    // Timestamps
    created_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    last_interaction_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),

    // Apply any overrides
    ...overrides,
  };
}

/**
 * Generates a cold start profile (minimal data)
 */
export function generateColdStartProfile(name: string): CustomerProfile {
  return generateDummyProfile({
    customer_name: name,
    confidence_score: 0.15,
    sessions_processed: 0,
    total_signals: 0,
    pillars: {
      romantic: 11,
      bohemian: 11,
      casual: 11,
      classic: 11,
      minimal: 12,
      maximal: 11,
      fashionForward: 11,
      athletic: 11,
      utility: 11,
    },
    brand_affinity: [],
    semantic_memory: [],
    style_personality: `${name} is just beginning their style journey. The profile will build as interactions increase.`,
  });
}

/**
 * Generates a highly confident profile (lots of data)
 */
export function generateConfidentProfile(name: string): CustomerProfile {
  return generateDummyProfile({
    customer_name: name,
    confidence_score: 0.95,
    sessions_processed: 25,
    total_signals: 450,
    brand_affinity: [
      {
        brand: 'Everlane',
        score: 0.98,
        confidence: 'high',
        sources: ['likes', 'purchases', 'swipes'],
        lastSignal: new Date().toISOString(),
      },
      {
        brand: 'Vince',
        score: 0.92,
        confidence: 'high',
        sources: ['likes', 'saves', 'purchases'],
        lastSignal: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'COS',
        score: 0.87,
        confidence: 'high',
        sources: ['likes', 'swipes'],
        lastSignal: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    semantic_memory: [
      {
        id: 'mem_001',
        type: 'stated',
        text: 'Strongly prefers sustainable and ethically made clothing',
        source: 'quiz',
        weight: 0.98,
        timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_002',
        type: 'inferred',
        text: 'Gravitates toward timeless, investment pieces',
        source: 'swipe_patterns',
        weight: 0.95,
        timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_003',
        type: 'inferred',
        text: 'Strong preference for neutral color palettes',
        source: 'color_analysis',
        weight: 0.93,
        timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  });
}
