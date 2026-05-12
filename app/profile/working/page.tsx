'use client';

/**
 * Working Profile Page - Developer Reference
 * Shows rich dummy data to test all ProfileView features
 * This is for developers to see what a fully populated profile looks like
 */

import { useState, useEffect } from 'react';
import ProfileView from '@/components/profile/ProfileView';
import ProfileStyleLoader from '@/components/profile/ProfileStyleLoader';
import OutfitRecommendationTray, { OutfitRecommendation } from '@/components/profile/OutfitRecommendationTray';
import type { CustomerProfile } from '@/lib/types';
import Link from 'next/link';

export default function WorkingProfilePage() {
  const [outfits, setOutfits] = useState<OutfitRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch real outfits from Supabase filtered by customer's top pillars
  useEffect(() => {
    async function fetchOutfits() {
      try {
        // Get top 3 pillars from profile
        const topPillars = Object.entries(workingProfile.pillars)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([pillar]) => pillar.toLowerCase());

        console.log('[Working Profile] Fetching outfits for pillars:', topPillars);

        // Fetch outfits from Supabase
        const response = await fetch(
          `/api/outfits?pillars=${topPillars.join(',')}&department=${workingProfile.gender}&limit=20&minConfidence=0.7`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch outfits');
        }

        const data = await response.json();
        console.log('[Working Profile] Fetched outfits:', data.count, 'of', data.total);

        // Transform Supabase outfits to OutfitRecommendation format
        const transformedOutfits: OutfitRecommendation[] = data.outfits.map((outfit: any) => {
          const items = outfit.items || [];
          const totalPrice = items.reduce((sum: number, item: any) =>
            sum + (item.product?.price || 0), 0
          );

          // Determine match score based on pillar alignment
          const outfitPillars = outfit.attributes?.pillars || outfit.pillars || [];
          const matchScore = outfit.confidence_score || 0.85;

          // Generate match reason based on pillars
          const matchingPillars = outfitPillars
            .filter((p: string) => topPillars.includes(p.toLowerCase()))
            .slice(0, 2);
          const matchReason = matchingPillars.length > 0
            ? `Matches your ${matchingPillars.join(' and ')} style`
            : 'Curated for your aesthetic';

          // Determine confidence level
          const confidence = matchScore > 0.85 ? 'high' : matchScore > 0.75 ? 'medium' : 'low';

          return {
            outfit_id: outfit.outfit_id || outfit.id,
            title: outfit.title || `${outfitPillars[0] || 'Styled'} Outfit`,
            description: outfit.description || `A complete look featuring ${items.length} carefully selected pieces`,
            match_score: matchScore,
            match_reason: matchReason,
            pillars: outfitPillars.slice(0, 3),
            occasions: outfit.attributes?.occasions || outfit.occasions || ['Versatile'],
            items: items.map((item: any) => ({
              product_id: item.product?.id || item.product_id,
              title: item.product?.title || item.title || 'Item',
              brand: item.product?.brand || 'Brand',
              price: item.product?.price || 0,
              image_url: item.product?.imageUrl || item.product?.image_url || '',
              product_type: item.product?.productType1 || item.role || 'Item',
              role: item.role
            })),
            total_price: totalPrice,
            confidence
          };
        });

        setOutfits(transformedOutfits);
      } catch (error) {
        console.error('[Working Profile] Error fetching outfits:', error);
        // Keep empty array on error
      } finally {
        setLoading(false);
      }
    }

    fetchOutfits();
  }, []);

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

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="text-white mt-4">Loading your personalized outfits...</p>
            </div>
          ) : outfits.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-lg">No outfits found matching your style.</p>
              <p className="text-slate-500 text-sm mt-2">Try generating some outfits in the admin panel.</p>
            </div>
          ) : (
            <>
              {/* Personalized Picks - Top confidence outfits */}
              {outfits.length > 0 && (
                <OutfitRecommendationTray
                  title="Curated For You"
                  subtitle="Based on your minimal and classic style preferences"
                  outfits={outfits.slice(0, 6)}
                  onOutfitClick={handleOutfitClick}
                  onSaveOutfit={handleSaveOutfit}
                />
              )}

              {/* High Confidence Matches */}
              {outfits.filter(o => o.confidence === 'high').length > 3 && (
                <OutfitRecommendationTray
                  title="Perfect Matches"
                  subtitle="High confidence recommendations for your style"
                  outfits={outfits.filter(o => o.confidence === 'high').slice(0, 5)}
                  onOutfitClick={handleOutfitClick}
                  onSaveOutfit={handleSaveOutfit}
                />
              )}

              {/* Different pillar exploration */}
              {outfits.length > 6 && (
                <OutfitRecommendationTray
                  title="More To Explore"
                  subtitle="Additional looks matching your aesthetic"
                  outfits={outfits.slice(6, 12)}
                  onOutfitClick={handleOutfitClick}
                  onSaveOutfit={handleSaveOutfit}
                />
              )}

              {/* All remaining outfits */}
              {outfits.length > 12 && (
                <OutfitRecommendationTray
                  title="Complete Your Look"
                  subtitle="Even more outfit inspiration"
                  outfits={outfits.slice(12, 20)}
                  onOutfitClick={handleOutfitClick}
                  onSaveOutfit={handleSaveOutfit}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
