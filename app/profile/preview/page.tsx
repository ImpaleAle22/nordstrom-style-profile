'use client';

/**
 * Profile Preview - Static Demo with Real Profile UI
 * Uses the actual ProfileView component with dummy data
 */

import ProfileView from '@/components/profile/ProfileView';
import ProfileStyleLoader from '@/components/profile/ProfileStyleLoader';
import type { CustomerProfile } from '@/lib/types';

export default function ProfilePreviewPage() {
  // Static dummy profile data - realistic active user
  const dummyProfile: CustomerProfile = {
    customer_id: 'preview_demo',
    customer_name: 'Taylor Chen',
    email: null,
    gender: 'womenswear',
    sessions_processed: 12,
    total_signals: 247,
    confidence_score: 0.84,

    pillars: {
      'Minimalist': 28,
      'Classic': 24,
      'Modern': 18,
      'Casual': 12,
      'Professional': 9,
      'Edgy': 5,
      'Romantic': 3,
      'Bohemian': 1,
    },

    brand_affinity: [
      {
        brand: 'Everlane',
        score: 0.92,
        confidence: 'high',
        sources: ['likes', 'purchases'],
        lastSignal: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'Vince',
        score: 0.85,
        confidence: 'high',
        sources: ['likes', 'saves'],
        lastSignal: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'COS',
        score: 0.78,
        confidence: 'medium',
        sources: ['likes'],
        lastSignal: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],

    price_range: {
      low: 75,
      high: 350,
      sweet: 150,
      confidence: 'high',
    },

    fit_preferences: {
      liked: ['tailored', 'straight-leg', 'relaxed', 'oversized'],
      disliked: ['bodycon', 'ultra-cropped'],
    },

    fabric_preferences: {
      liked: ['cotton', 'linen', 'wool', 'cashmere'],
      disliked: ['polyester', 'synthetic blends'],
    },

    color_affinity: {
      'black': 0.95,
      'white': 0.90,
      'grey': 0.88,
      'navy': 0.82,
      'beige': 0.78,
      'olive': 0.65,
      'burgundy': 0.52,
    },

    negatives: [],

    semantic_memory: [
      {
        id: 'mem_001',
        type: 'inferred',
        text: 'Prefers timeless, investment pieces over trendy fast fashion',
        source: 'swipe_patterns',
        weight: 0.92,
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_002',
        type: 'inferred',
        text: 'Gravitates toward neutral color palettes with black, white, and grey',
        source: 'color_analysis',
        weight: 0.89,
        timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_003',
        type: 'inferred',
        text: 'Values quality fabrics and tailored silhouettes',
        source: 'fabric_patterns',
        weight: 0.85,
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_004',
        type: 'inferred',
        text: 'Comfortable in smart casual to business casual settings',
        source: 'occasion_analysis',
        weight: 0.78,
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],

    life_context: {
      hobbies: ['reading', 'coffee culture', 'design'],
      family: [],
      professional: ['tech industry', 'hybrid work'],
      other: ['urban lifestyle'],
    },

    style_personality: 'A refined minimalist with classic sensibilities. Prefers clean lines, timeless pieces, and sophisticated neutrals. Values quality over quantity and gravitates toward versatile wardrobe staples that work seamlessly from office to weekend.',

    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    last_interaction_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return (
    <ProfileStyleLoader>
      <ProfileView profile={dummyProfile} />
    </ProfileStyleLoader>
  );
}
