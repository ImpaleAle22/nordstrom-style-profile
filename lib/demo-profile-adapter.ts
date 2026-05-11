/**
 * Demo Profile Adapter
 * Converts localStorage demo data to CustomerProfile format
 */

import type { CustomerProfile } from './types';

interface DemoProfileData {
  name?: string;
  gender?: 'womenswear' | 'menswear' | 'all';
  totalSwipes?: number;
  completedStacks?: number;
  quizCompleted?: boolean;
  topPillars?: Array<{ name: string; weight: number }>;
  confidence?: number;
  createdAt?: string;
  lastActivity?: string;
  brandAffinity?: Array<{
    brand: string;
    score: number;
    confidence: string;
    sources: string[];
    lastSignal: string;
  }>;
  priceRange?: {
    low: number | null;
    high: number | null;
    sweet: number | null;
    confidence: string;
  };
  colorAffinity?: Record<string, number>;
  semanticMemory?: Array<{
    id: string;
    type: 'stated' | 'inferred' | 'life_context';
    text: string;
    source: string;
    weight: number;
    timestamp: string;
  }>;
}

/**
 * Converts demo user data from localStorage to CustomerProfile format
 * Provides sensible defaults for missing fields
 */
export function convertDemoDataToCustomerProfile(
  userId: string,
  demoData: DemoProfileData
): CustomerProfile {
  // Convert topPillars array to pillars object
  const pillars = demoData.topPillars && demoData.topPillars.length > 0
    ? demoData.topPillars.reduce((acc, p) => {
        acc[p.name] = p.weight;
        return acc;
      }, {} as Record<string, number>)
    : {
        // Default balanced profile for cold start
        romantic: 11,
        bohemian: 11,
        casual: 11,
        classic: 11,
        minimal: 12,
        maximal: 11,
        fashionForward: 11,
        athletic: 11,
        utility: 11
      };

  // Calculate total swipes and sessions
  const totalSwipes = demoData.totalSwipes || 0;
  const sessionsProcessed = demoData.completedStacks || 0;

  // Generate style personality based on data
  const hasData = totalSwipes > 0 || demoData.quizCompleted;
  const topPillar = demoData.topPillars?.[0]?.name || 'unique';
  const stylePersonality = hasData
    ? `${demoData.name || 'This customer'} has a ${topPillar.toLowerCase()} aesthetic with developing preferences across multiple style dimensions. As interactions increase, the profile will reveal deeper insights into personal style.`
    : `${demoData.name || 'This customer'} is just beginning their style journey. As you interact and swipe on looks you love, your unique style profile will emerge.`;

  return {
    // Identity
    customer_id: userId,
    customer_name: demoData.name || 'Demo User',
    email: null,
    gender: demoData.gender || 'womenswear',

    // Style Intelligence
    pillars,

    // Brand Preferences
    brand_affinity: demoData.brandAffinity || [],

    // Price Preferences
    price_range: demoData.priceRange || {
      low: null,
      high: null,
      sweet: null,
      confidence: 'emerging',
    },

    // Fit & Fabric Preferences (defaults)
    fit_preferences: {
      liked: [],
      disliked: [],
    },

    fabric_preferences: {
      liked: [],
      disliked: [],
    },

    // Color Affinity
    color_affinity: demoData.colorAffinity || {},

    // Negatives
    negatives: [],

    // Semantic Memory
    semantic_memory: demoData.semanticMemory || [],

    // Life Context
    life_context: {
      hobbies: [],
      family: [],
      professional: [],
      other: [],
    },

    // Style Personality
    style_personality: stylePersonality,

    // Confidence & Status
    confidence_score: demoData.confidence || 0,
    sessions_processed: sessionsProcessed,
    total_signals: totalSwipes,

    // Timestamps
    created_at: demoData.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_interaction_at: demoData.lastActivity || null,
  };
}

/**
 * Loads demo profile from localStorage and converts to CustomerProfile
 */
export function loadDemoProfile(userId: string): CustomerProfile | null {
  if (typeof window === 'undefined') return null;

  const profileKey = `demo_profile_${userId}`;
  const storedProfile = localStorage.getItem(profileKey);

  if (!storedProfile) return null;

  try {
    const demoData = JSON.parse(storedProfile) as DemoProfileData;
    return convertDemoDataToCustomerProfile(userId, demoData);
  } catch (error) {
    console.error('Error loading demo profile:', error);
    return null;
  }
}
