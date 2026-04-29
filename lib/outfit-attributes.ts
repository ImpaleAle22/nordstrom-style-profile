/**
 * Outfit Attributes - Canonical Taxonomies
 *
 * Defines Style Pillar, Vibe, and Occasion taxonomies for semantic outfit tagging.
 * Used for coverage analysis and gap identification in outfit inventory.
 */

// Import axis types for 4-axis system
import type { ActivityContext, Season, SocialRegister } from './axis-types';

// ============================================================================
// STYLE PILLAR (9 values)
// ============================================================================

/**
 * Style Pillar: What the look IS aesthetically - the design language and silhouette story.
 * Each outfit should have exactly ONE Style Pillar.
 */
export const STYLE_PILLARS = [
  'Romantic',
  'Bohemian',
  'Casual',
  'Classic',
  'Minimal',
  'Maximal',
  'Streetwear',
  'Athletic',
  'Utility'
] as const;

export type StylePillar = typeof STYLE_PILLARS[number];

/**
 * Style Pillar metadata with sub-terms for inference
 */
export const STYLE_PILLAR_METADATA: Record<StylePillar, {
  description: string;
  subTerms: string[];
  tiebreakers: string[];
}> = {
  'Romantic': {
    description: 'Emotionally expressive, ornamental dressing',
    subTerms: ['Effortless Romantic', 'Feminine', 'Whimsical', 'Ladylike', 'Delicate', 'Ethereal', 'Dandy'],
    tiebreakers: ['Intentionally beautiful/delicate (vs Bohemian\'s earthy/found quality)', 'Menswear: floral prints, ruffled/pleated details, soft tailoring, womenswear-inspired silhouettes']
  },
  'Bohemian': {
    description: 'Earthy, textural, unhurried',
    subTerms: ['Beachy', 'Eclectic', 'Vintage-inspired', 'Natural', 'Artisanal', 'Hippie', 'Free-spirited', 'Artistic', 'Worldly', 'Tropical'],
    tiebreakers: ['Earthy/textural/found (vs Romantic\'s intentionally beautiful)']
  },
  'Casual': {
    description: 'Relaxed, unfussy, everyday',
    subTerms: ['Pragmatic Casual', 'Sporty Casual'],
    tiebreakers: []
  },
  'Classic': {
    description: 'Enduring, investment-minded, polished',
    subTerms: ['Timeless Classic', 'Sophisticated', 'Polished', 'Dressy', 'Chic', 'Tailored', 'Menswear-inspired', 'Nautical', 'Preppy', 'Heritage'],
    tiebreakers: ['About longevity (vs Minimal\'s reduction)']
  },
  'Minimal': {
    description: 'Restrained, intentional, form-forward',
    subTerms: ['Modern Minimal', 'Sleek', 'Monochromatic', 'Understated', 'Modern', 'Architectural', 'Elegant', 'Refined'],
    tiebreakers: ['About reduction (vs Classic\'s longevity)']
  },
  'Maximal': {
    description: 'Bold, expressive, more-is-more',
    subTerms: ['Daring Maximal', 'Bold', 'Vibrant', 'Tropical', 'Glam', 'Exotic', 'Quirky'],
    tiebreakers: []
  },
  'Streetwear': {
    description: 'Urban, attitude-forward dressing rooted in street culture, youth culture, and gender-relaxed expression',
    subTerms: ['Streetwear', 'Urban', 'Edgy', 'Tomboy'],
    tiebreakers: ['Cultural/silhouette-driven (vs Maximal\'s surface/decoration-driven)', 'To do a job (Utility) vs look like someone who does (Streetwear)']
  },
  'Athletic': {
    description: 'Sport as identity and activity',
    subTerms: ['Street Sport', 'Performance', 'Club Sport', 'Athleisure'],
    tiebreakers: ['Sport identity (court/field/pool/opponent) vs Utility\'s terrain/function']
  },
  'Utility': {
    description: 'Function and terrain as design language',
    subTerms: ['Utility Workwear', 'Utility Streetwear', 'Workwear', 'Military', 'Western', 'Rugged', 'Outdoorsy', 'Safari'],
    tiebreakers: ['Terrain/function identity vs Athletic\'s sport identity']
  }
};

// ============================================================================
// VIBE (28 values)
// ============================================================================

/**
 * Vibe: How the look FEELS - the emotional register or mood it projects.
 * Vibes are orthogonal to Style Pillar (e.g., Classic can be Confident or Relaxed).
 * Outfits can have multiple vibes (1-3 typical, average 2).
 */
export const VIBES = [
  'Androgynous',
  'Approachable',
  'Artsy',
  'Bold',
  'Calm',
  'Cozy',
  'Confident',
  'Cute',
  'Dramatic',
  'Dressier',
  'Effortless',
  'Energetic',
  'Elegant',
  'Feminine',
  'Free',
  'Fresh',
  'Glam',
  'Luxe',
  'Modest',
  'Playful',
  'Polished',
  'Professional',
  'Relaxed',
  'Romantic',
  'Sexy',
  'Timeless',
  'Tomboy',
  'Understated'
] as const;

export type Vibe = typeof VIBES[number];

// ============================================================================
// OCCASION (~60 values, organized into 9 categories)
// ============================================================================

/**
 * Occasion: What situations/events the outfit is suitable for.
 * Occasions are NOT mutually exclusive - versatile pieces can serve multiple occasions.
 * At outfit level, primary occasion(s) are tagged (1-3 typical).
 */
export const OCCASIONS = {
  Wedding: [
    'Getting Married',
    'Bridal',
    'Bridesmaid',
    'Mother of the Bride',
    'Mother of the Groom',
    'Rehearsal Dinner',
    'Wedding Guest',
    'Wedding Shower',
    'Bachelorette Party'
  ],
  Formal: [
    'Black Tie / Gala',
    'Cocktail Party',
    'Formal',
    'Holiday Party',
    'Graduation Party',
    'Theatre',
    'Wine Tasting'
  ],
  GoingOut: [
    'Date Night',
    'Night Out',
    'Concert',
    'Festival',
    'Happy Hour'
  ],
  CasualSocial: [
    'Brunch',
    'Coffee Date',
    'Lunch with Friends',
    'Casual Dinner',
    'Farmers Market',
    'BBQ / Cookout',
    'Entertaining at Home',
    'Party',
    'Baby Shower'
  ],
  Work: [
    'Working in the Office',
    'Work from Home',
    'Business Trip',
    'Interview'
  ],
  Everyday: [
    'Weekend',
    'Running Errands',
    'Shopping Day',
    'Sightseeing',
    'Relaxing at Home'
  ],
  School: [
    'Back to School',
    'Photoshoot'
  ],
  Travel: [
    'Vacation',
    'Warm Weather Vacation',
    'Cold Weather Vacation',
    'Beach Day',
    'Road Trip'
  ],
  SportActive: [
    'Workout',
    'Running',
    'Yoga',
    'Weight Lifting',
    'Hiking',
    'Skiing',
    'Swimming',
    'Golf',
    'Baseball Game',
    'Football Game',
    'Rodeo',
    'Spa Day'
  ]
} as const;

export type OccasionCategory = keyof typeof OCCASIONS;
export type Occasion = typeof OCCASIONS[OccasionCategory][number];

// Flatten all occasions for easy access
export const ALL_OCCASIONS: Occasion[] = Object.values(OCCASIONS).flat();

// ============================================================================
// OUTFIT ATTRIBUTES INTERFACE (4-AXIS SYSTEM)
// ============================================================================

/**
 * Complete attribute set for an outfit (4-AXIS SYSTEM)
 *
 * NEW ARCHITECTURE:
 * - Four axes (formality, activityContext, season, socialRegister) are assigned by rules + AI
 * - Occasions are DERIVED from axis combinations (not tagged directly)
 * - Style Pillar and Vibes are tagged separately (preserved from old system)
 */
export interface OutfitAttributes {
  // ===== FOUR AXES (NEW) =====
  formality: number; // 1.0-6.0 (1=loungewear, 6=black tie)
  activityContext: ActivityContext; // Primary context
  activityContextSecondary?: ActivityContext; // Optional secondary context
  season: Season[]; // Multi-value (can work for multiple seasons)
  socialRegister: SocialRegister; // Social context

  // ===== DERIVED FROM AXES (NEW) =====
  occasions: Occasion[]; // Derived mechanically from axis values via mapping table

  // ===== EXISTING FIELDS (UNCHANGED) =====
  stylePillar: StylePillar | null;
  subStyle: string | null; // Optional sub-style within pillar
  vibes: Vibe[];

  // ===== METADATA =====
  confidence: {
    formality: number;
    activityContext: number;
    season: number;
    socialRegister: number;
    stylePillar: number;
    vibes: number;
  };

  taggedAt: string; // ISO timestamp
  taggedBy: 'rules' | 'hybrid'; // Overall tagging mode

  axisTaggedBy: {
    formality: 'rules' | 'ai';
    activityContext: 'rules' | 'ai';
    season: 'rules' | 'ai';
    socialRegister: 'rules' | 'ai';
  };

  reasoning?: string; // Debug/audit trail
}

/**
 * Rules-based hints generated before AI tagging
 * Used to inform AI or provide high-confidence tags without AI call
 */
export interface AttributeHints {
  stylePillarHints: Array<{ pillar: StylePillar; confidence: number; reason: string }>;
  vibeHints: Array<{ vibe: Vibe; confidence: number; reason: string }>;
  occasionHints: Array<{ occasion: Occasion; confidence: number; reason: string }>;
  formality: number;
  maxConfidence: number; // Highest confidence across all hints
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get occasion category for a given occasion
 */
export function getOccasionCategory(occasion: Occasion): OccasionCategory | null {
  for (const [category, occasions] of Object.entries(OCCASIONS)) {
    if (occasions.includes(occasion as any)) {
      return category as OccasionCategory;
    }
  }
  return null;
}

/**
 * Validate Style Pillar value
 */
export function isValidStylePillar(value: string): value is StylePillar {
  return STYLE_PILLARS.includes(value as StylePillar);
}

/**
 * Validate Vibe value
 */
export function isValidVibe(value: string): value is Vibe {
  return VIBES.includes(value as Vibe);
}

/**
 * Validate Occasion value
 */
export function isValidOccasion(value: string): value is Occasion {
  return ALL_OCCASIONS.includes(value as Occasion);
}

/**
 * Get formality description for score
 */
export function getFormalityDescription(score: number): string {
  if (score <= 1.5) return 'Very Casual';
  if (score <= 2.5) return 'Casual';
  if (score <= 3.5) return 'Smart Casual';
  if (score <= 4.5) return 'Business Casual';
  if (score <= 5.5) return 'Business Formal';
  return 'Black Tie / Gala';
}
