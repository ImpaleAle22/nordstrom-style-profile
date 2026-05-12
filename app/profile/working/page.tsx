'use client';

/**
 * Working Profile Page - Developer Reference
 * Shows rich dummy data to test all ProfileView features
 * This is for developers to see what a fully populated profile looks like
 */

import ProfileView from '@/components/profile/ProfileView';
import ProfileStyleLoader from '@/components/profile/ProfileStyleLoader';
import OutfitRecommendationTray from '@/components/profile/OutfitRecommendationTray';
import type { CustomerProfile } from '@/lib/types';
import { SAMPLE_OUTFITS, TRENDING_OUTFITS, NEW_ARRIVALS, SEASONAL_PICKS } from '@/lib/sample-outfits';
import Link from 'next/link';

export default function WorkingProfilePage() {
  const handleOutfitClick = (outfit: any) => {
    console.log('Outfit clicked:', outfit);
    // In real implementation: navigate to outfit detail page or open modal
  };

  const handleSaveOutfit = (outfitId: string) => {
    console.log('Outfit saved:', outfitId);
    // In real implementation: save to user's favorites
  };

  // Rich dummy data with all fields populated
  const workingProfile: CustomerProfile = {
    // Identity
    customer_id: 'working_demo_001',
    customer_name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    gender: 'womenswear',

    // Style Intelligence - Top pillars sum to 100
    pillars: {
      'Minimal': 32,
      'Classic': 28,
      'Modern': 18,
      'Casual': 12,
      'Professional': 6,
      'Edgy': 4,
    },

    // Brand Affinity
    brand_affinity: [
      {
        brand: 'Everlane',
        score: 0.95,
        confidence: 'high',
        sources: ['likes', 'purchases', 'swipes'],
        lastSignal: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'Vince',
        score: 0.89,
        confidence: 'high',
        sources: ['likes', 'saves'],
        lastSignal: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'COS',
        score: 0.82,
        confidence: 'medium',
        sources: ['likes', 'swipes'],
        lastSignal: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'Madewell',
        score: 0.78,
        confidence: 'medium',
        sources: ['likes'],
        lastSignal: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        brand: 'The Row',
        score: 0.71,
        confidence: 'medium',
        sources: ['saves'],
        lastSignal: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],

    // Price Intelligence
    price_range: {
      low: 80,
      high: 400,
      sweet: 180,
      confidence: 'high',
    },

    // Fit Preferences
    fit_preferences: {
      liked: ['tailored', 'straight-leg', 'relaxed', 'oversized', 'wide-leg'],
      disliked: ['bodycon', 'ultra-cropped', 'skinny-fit'],
    },

    // Fabric Preferences
    fabric_preferences: {
      liked: ['cotton', 'linen', 'wool', 'cashmere', 'silk'],
      disliked: ['polyester', 'synthetic blends', 'acrylic'],
    },

    // Color Affinity
    color_affinity: {
      'black': 0.98,
      'white': 0.95,
      'grey': 0.92,
      'navy': 0.85,
      'beige': 0.82,
      'camel': 0.78,
      'olive': 0.68,
      'burgundy': 0.55,
      'ivory': 0.52,
    },

    // Negatives
    negatives: [
      {
        type: 'pattern',
        value: 'animal print',
        strength: 'strong',
        source: 'swipe_patterns',
        timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        type: 'color',
        value: 'neon colors',
        strength: 'strong',
        source: 'swipe_patterns',
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        type: 'style',
        value: 'overly trendy',
        strength: 'medium',
        source: 'inferred',
        timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],

    // Semantic Memory
    semantic_memory: [
      {
        id: 'mem_001',
        type: 'stated',
        text: 'Prefers sustainable and ethically made clothing',
        source: 'quiz',
        weight: 0.95,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_002',
        type: 'inferred',
        text: 'Gravitates toward timeless, investment pieces over trendy fast fashion',
        source: 'swipe_patterns',
        weight: 0.92,
        timestamp: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_003',
        type: 'inferred',
        text: 'Strong preference for neutral color palettes with black, white, and grey',
        source: 'color_analysis',
        weight: 0.89,
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_004',
        type: 'inferred',
        text: 'Values quality fabrics and well-tailored silhouettes',
        source: 'fabric_patterns',
        weight: 0.87,
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mem_005',
        type: 'life_context',
        text: 'Works in creative tech industry, hybrid office/remote setup',
        source: 'chat',
        weight: 0.82,
        timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],

    // Life Context
    life_context: {
      hobbies: ['reading', 'coffee culture', 'minimalist design', 'architecture'],
      family: ['partner', 'dog'],
      professional: ['tech industry', 'creative director', 'hybrid work'],
      other: ['urban lifestyle', 'sustainable living', 'art galleries'],
    },

    // Style Personality
    style_personality: 'A refined minimalist with classic sensibilities and modern edge. Alex gravitates toward clean lines, timeless pieces, and sophisticated neutrals. Values quality over quantity with a strong preference for sustainable, ethically made clothing. Style is versatile, working seamlessly from creative office environments to weekend brunches and evening events.',

    // Confidence & Status
    confidence_score: 0.87,
    sessions_processed: 15,
    total_signals: 284,

    // Timestamps
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    last_interaction_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return (
    <>
      {/* Dev Badge */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        background: '#000',
        color: '#fff',
        padding: '8px 16px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10000,
        borderBottomLeftRadius: '4px',
      }}>
        🔧 WORKING PAGE - Dev Reference
      </div>

      {/* Session Timeline Link */}
      <div style={{
        position: 'fixed',
        top: '50px',
        right: 0,
        zIndex: 10000,
      }}>
        <Link
          href="/profile/working/sessions"
          style={{
            display: 'block',
            background: '#3b82f6',
            color: '#fff',
            padding: '8px 16px',
            fontSize: '12px',
            fontFamily: 'monospace',
            borderBottomLeftRadius: '4px',
            textDecoration: 'none',
          }}
        >
          📊 View Session Timeline
        </Link>
      </div>

      {/* Profile Section */}
      <div className="pb-12">
        <ProfileStyleLoader>
          <ProfileView profile={workingProfile} />
        </ProfileStyleLoader>
      </div>

      {/* Outfit Recommendation Trays Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Section Header */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-2">Outfit Recommendations</h2>
            <p className="text-slate-400 text-lg">Complete looks styled just for you</p>
          </div>

          {/* Personalized Picks */}
          <OutfitRecommendationTray
            title="Curated For You"
            subtitle="Based on your minimal and classic style preferences"
            outfits={SAMPLE_OUTFITS}
            onOutfitClick={handleOutfitClick}
            onSaveOutfit={handleSaveOutfit}
          />

          {/* Trending Now */}
          <OutfitRecommendationTray
            title="Trending in Minimal"
            subtitle="What others with your style are loving"
            outfits={TRENDING_OUTFITS}
            onOutfitClick={handleOutfitClick}
            onSaveOutfit={handleSaveOutfit}
          />

          {/* New Arrivals */}
          <OutfitRecommendationTray
            title="New Arrivals"
            subtitle="Fresh pieces matching your aesthetic"
            outfits={NEW_ARRIVALS}
            onOutfitClick={handleOutfitClick}
            onSaveOutfit={handleSaveOutfit}
          />

          {/* Seasonal Picks */}
          <OutfitRecommendationTray
            title="Spring Essentials"
            subtitle="Season-perfect outfits for your style"
            outfits={SEASONAL_PICKS}
            onOutfitClick={handleOutfitClick}
            onSaveOutfit={handleSaveOutfit}
          />
        </div>
      </div>
    </>
  );
}
