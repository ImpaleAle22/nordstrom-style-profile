/**
 * Pillar→Vibes Coherence Map
 *
 * Defines which vibes are coherent with which style pillar.
 * Used by Vibes Station to constrain AI vibe selection to pillar-appropriate candidates.
 *
 * Derivation method (per spec §2.2.1):
 * 1. Seed vibes from the 8 good examples in spec §2.2.3
 * 2. Expanded to 6-10 vibes per pillar by reasoning from sub-term lists
 * 3. Validated against good examples (all assigned vibes must be in the map)
 * 4. Validated against bad examples (hallucinated vibes must NOT be in the map)
 *
 * Key validation: Casual does NOT include Romantic or Elegant
 * (these were hallucinated for the "gray sweater" bad example and must be excluded)
 */

import type { StylePillar, Vibe } from './outfit-attributes';

/**
 * Pillar-to-Vibe Coherence Map
 *
 * Each pillar maps to 6-10 coherent vibes. Vibes may appear in multiple pillars.
 * This is the candidate list passed to Vibes Station once a pillar is known.
 */
export const PILLAR_VIBE_COHERENCE: Record<StylePillar, Vibe[]> = {
  /**
   * Classic: Enduring, investment-minded, polished
   * Sub-terms: Polished, Dressy, Tailored, Menswear-inspired, Nautical, Preppy, Heritage
   */
  'Classic': [
    'Polished',      // Seed (good example 6)
    'Timeless',      // Seed (good example 6)
    'Confident',     // Seed (good example 6)
    'Professional',  // Expansion (Polished/Dressy sub-terms suggest professional contexts)
    'Elegant',       // Expansion (Dressy sub-term)
    'Dressier',      // Expansion (Dressy sub-term)
    'Understated',   // Expansion (Heritage/Preppy can be understated)
    'Modest',        // Expansion (Preppy/Heritage register)
  ],

  /**
   * Minimal: Restrained, intentional, form-forward
   * Sub-terms: Sleek, Monochromatic, Understated, Modern, Architectural, Quiet Luxury
   */
  'Minimal': [
    'Elegant',       // Seed (good example 2)
    'Understated',   // Seed (good example 2)
    'Polished',      // Seed (good example 2)
    'Calm',          // Expansion (Restrained register)
    'Confident',     // Expansion (Intentional, form-forward)
    'Modest',        // Expansion (Understated/Quiet Luxury)
    'Timeless',      // Expansion (Modern/Architectural endurance)
  ],

  /**
   * Romantic: Emotionally expressive, ornamental
   * Sub-terms: Effortless, Feminine, Whimsical, Ladylike, Delicate, Ethereal, Dandy, Cottagecore
   */
  'Romantic': [
    'Elegant',       // Seed (good example 4)
    'Fresh',         // Seed (good example 4)
    'Feminine',      // Seed (good example 4)
    'Cute',          // Expansion (Whimsical/Cottagecore)
    'Romantic',      // Expansion (the vibe matches the pillar concept)
    'Dressier',      // Expansion (Ladylike/Ethereal formality)
    'Playful',       // Expansion (Whimsical sub-term)
    'Effortless',    // Expansion (Effortless sub-term)
  ],

  /**
   * Bohemian: Earthy, textural, unhurried
   * Sub-terms: Beachy, Eclectic, Vintage-inspired, Natural, Artisanal, Hippie, Free-spirited, Artistic, Worldly, Tropical
   */
  'Bohemian': [
    'Free',          // Seed (good example 7)
    'Effortless',    // Seed (good example 7)
    'Artsy',         // Seed (good example 7)
    'Relaxed',       // Expansion (Unhurried, Natural)
    'Playful',       // Expansion (Eclectic/Whimsical quality)
    'Cozy',          // Expansion (Natural/Artisanal warmth)
    'Approachable',  // Expansion (Earthy, unhurried register)
  ],

  /**
   * Maximal: Bold, expressive, more-is-more
   * Sub-terms: Bold, Vibrant, Tropical, Glam, Quirky, Eclectic Maximal, Statement
   */
  'Maximal': [
    'Glam',          // Seed (good example 8)
    'Bold',          // Seed (good example 8)
    'Sexy',          // Seed (good example 8)
    'Dramatic',      // Expansion (Statement/Glam register)
    'Luxe',          // Expansion (Glam sub-term)
    'Confident',     // Expansion (Bold/Statement requires confidence)
    'Playful',       // Expansion (Quirky sub-term)
    'Dressier',      // Expansion (Glam often high formality)
  ],

  /**
   * Streetwear: Urban, attitude-forward, street culture
   * Sub-terms: Urban, Edgy, Skate, Hypebeast, Y2K, Techwear
   */
  'Streetwear': [
    'Bold',          // Seed (good example 5)
    'Confident',     // Seed (good example 5)
    'Relaxed',       // Seed (good example 5)
    'Energetic',     // Expansion (Skate/Y2K energy)
    'Tomboy',        // Expansion (Gender-relaxed, androgynous quality)
    'Androgynous',   // Expansion (Gender-relaxed quality)
    'Fresh',         // Expansion (Urban/contemporary)
    'Approachable',  // Expansion (Relaxed street culture)
  ],

  /**
   * Utility: Function and terrain as design language
   * Sub-terms: Workwear, Workwear Streetwear, Military, Western, Rugged, Outdoorsy, Safari
   */
  'Utility': [
    'Relaxed',       // Seed (good example 1)
    'Effortless',    // Seed (good example 1)
    'Approachable',  // Expansion (Workwear/Rugged accessibility)
    'Cozy',          // Expansion (Outdoorsy/Rugged comfort)
    'Tomboy',        // Expansion (Gender-neutral workwear)
    'Free',          // Expansion (Outdoorsy/Safari)
    'Confident',     // Expansion (Military/Rugged self-sufficiency)
  ],

  /**
   * Athletic: Sport as identity and activity
   * Sub-terms: Street Sport, Performance, Tennis Club, Athleisure, Yoga, Run Club
   */
  'Athletic': [
    'Energetic',     // Seed (good example 3)
    'Confident',     // Seed (good example 3)
    'Relaxed',       // Expansion (Athleisure/Yoga)
    'Fresh',         // Expansion (Performance/Active register)
    'Effortless',    // Expansion (Athleisure)
    'Approachable',  // Expansion (Street Sport/Run Club community)
  ],

  /**
   * Casual: Relaxed, unfussy, everyday
   * Sub-terms: Pragmatic Casual, Sporty Casual, Smart Casual, Weekend Casual
   *
   * CRITICAL: Does NOT include Romantic or Elegant
   * (these were hallucinated for gray sweater bad example and must be excluded)
   */
  'Casual': [
    'Relaxed',       // Expansion (core casual register)
    'Effortless',    // Expansion (Unfussy quality)
    'Approachable',  // Expansion (Everyday accessibility)
    'Cozy',          // Expansion (Weekend Casual)
    'Fresh',         // Expansion (Smart Casual/contemporary)
    'Playful',       // Expansion (Weekend Casual)
    'Confident',     // Expansion (Smart Casual)
    // EXCLUDED: Romantic, Elegant, Cute, Bold, Understated
    // (validated against gray-sweater bad example)
  ],
};

/**
 * Validation helper: Check if a vibe is coherent with a pillar
 */
export function isVibeCoherentWithPillar(vibe: Vibe, pillar: StylePillar): boolean {
  return PILLAR_VIBE_COHERENCE[pillar].includes(vibe);
}

/**
 * Get all vibes that are coherent with a given pillar
 */
export function getCoherentVibes(pillar: StylePillar): Vibe[] {
  return PILLAR_VIBE_COHERENCE[pillar];
}

/**
 * Validation: Get pillars where a vibe appears (for debugging/analysis)
 */
export function getPillarsForVibe(vibe: Vibe): StylePillar[] {
  const pillars: StylePillar[] = [];
  for (const [pillar, vibes] of Object.entries(PILLAR_VIBE_COHERENCE)) {
    if (vibes.includes(vibe)) {
      pillars.push(pillar as StylePillar);
    }
  }
  return pillars;
}

/**
 * Statistics: Count how many pillars each vibe appears in
 */
export function getVibeDistribution(): Record<Vibe, number> {
  const distribution: Partial<Record<Vibe, number>> = {};
  for (const vibes of Object.values(PILLAR_VIBE_COHERENCE)) {
    for (const vibe of vibes) {
      distribution[vibe] = (distribution[vibe] || 0) + 1;
    }
  }
  return distribution as Record<Vibe, number>;
}
