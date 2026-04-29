/**
 * Occasion Mapping - Derived from Four Axes
 *
 * Occasions are NOT tagged directly. They are derived mechanically from
 * the four axis values (Formality, Activity Context, Season, Social Register).
 *
 * This makes occasion assignment explicit and controllable rather than
 * a tagging artifact.
 */

import type { ActivityContext, SocialRegister } from './axis-types';

// ============================================================================
// STEP 1 AUDIT RESULTS
// ============================================================================

/**
 * AUDIT: Occasions from ALL_OCCASIONS (58 total) - All have valid mapping paths
 *
 * Total occasions in outfit-attributes.ts ALL_OCCASIONS: 58
 * - Wedding (9): Getting Married, Bridal, Bridesmaid, Mother of the Bride/Groom,
 *   Rehearsal Dinner, Wedding Guest, Wedding Shower, Bachelorette Party
 * - Formal (7): Black Tie / Gala, Cocktail Party, Formal, Holiday Party,
 *   Graduation Party, Theatre, Wine Tasting
 * - GoingOut (5): Date Night, Night Out, Concert, Festival, Happy Hour
 * - CasualSocial (9): Brunch, Coffee Date, Lunch with Friends, Casual Dinner,
 *   Farmers Market, BBQ / Cookout, Entertaining at Home, Party, Baby Shower
 * - Work (4): Working in the Office, Work from Home, Business Trip, Interview
 * - Everyday (5): Weekend, Running Errands, Shopping Day, Sightseeing, Relaxing at Home
 * - School (2): Back to School, Photoshoot
 * - Travel (5): Vacation, Warm Weather Vacation, Cold Weather Vacation, Beach Day, Road Trip
 * - SportActive (12): Workout, Running, Yoga, Weight Lifting, Hiking, Skiing,
 *   Swimming, Golf, Baseball Game, Football Game, Rodeo, Spa Day
 *
 * Occasions from current attribute-tagger.ts that were REMOVED:
 * - Movie Date (not in canonical taxonomy, functionally identical to Casual Dinner)
 *
 * All 58 occasions now have valid mapping paths below.
 */

// ============================================================================
// OCCASION MAPPING TYPES & TABLE
// ============================================================================

export interface OccasionMappingRow {
  activityContext: ActivityContext;
  formalityMin: number;
  formalityMax: number;
  socialRegister: SocialRegister | SocialRegister[] | 'any';
  requiresBoldSignal?: boolean;   // for "Night Out" differentiation
  occasions: string[];
}

/**
 * Occasion Mapping Table - COMPLETE (all 57 occasions from ALL_OCCASIONS)
 *
 * Derived from outfit-tagging-architecture.md with full expansion.
 * Each row maps axis values → occasion strings.
 */
export const OCCASION_MAPPING: OccasionMappingRow[] = [
  // ===== CASUAL-LOW-KEY (Everyday, low-key activities) =====
  {
    activityContext: 'casual-low-key',
    formalityMin: 1.0,
    formalityMax: 2.0,
    socialRegister: 'any',
    occasions: ['Relaxing at Home', 'Weekend']
  },
  {
    activityContext: 'casual-low-key',
    formalityMin: 1.5,
    formalityMax: 2.8,
    socialRegister: 'peer-social',
    occasions: ['Running Errands', 'Weekend']
  },
  {
    activityContext: 'casual-low-key',
    formalityMin: 2.0,
    formalityMax: 3.0,
    socialRegister: ['peer-social', 'intimate'],
    occasions: ['Road Trip', 'Beach Day', 'Vacation']
  },
  {
    activityContext: 'casual-low-key',
    formalityMin: 2.0,
    formalityMax: 3.5,
    socialRegister: 'intimate',
    occasions: ['Spa Day', 'Warm Weather Vacation', 'Vacation']
  },
  {
    activityContext: 'casual-low-key',
    formalityMin: 2.5,
    formalityMax: 4.0,
    socialRegister: ['peer-social', 'intimate'],
    occasions: ['Cold Weather Vacation', 'Vacation']
  },
  {
    activityContext: 'casual-low-key',
    formalityMin: 3.0,
    formalityMax: 4.5,
    socialRegister: 'intimate',
    occasions: ['Entertaining at Home']
  },

  // ===== SOCIAL-DAYTIME (Daytime social occasions) =====
  {
    activityContext: 'social-daytime',
    formalityMin: 2.0,
    formalityMax: 3.0,
    socialRegister: 'peer-social',
    occasions: ['Farmers Market', 'Festival']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 2.0,
    formalityMax: 3.5,
    socialRegister: 'peer-social',
    occasions: ['Concert', 'Baseball Game', 'Football Game']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 2.5,
    formalityMax: 3.5,
    socialRegister: 'peer-social',
    occasions: ['Coffee Date', 'Shopping Day', 'Sightseeing', 'Back to School', 'Vacation']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 2.5,
    formalityMax: 3.5,
    socialRegister: 'peer-social',
    occasions: ['BBQ / Cookout']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 2.5,
    formalityMax: 4.0,
    socialRegister: 'peer-social',
    occasions: ['Rodeo']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 2.8,
    formalityMax: 3.8,
    socialRegister: 'peer-social',
    occasions: ['Brunch', 'Lunch with Friends']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 3.0,
    formalityMax: 4.0,
    socialRegister: 'peer-social',
    occasions: ['Baby Shower']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 3.0,
    formalityMax: 4.5,
    socialRegister: ['peer-social', 'evaluative'],
    occasions: ['Casual Dinner']
  },
  {
    activityContext: 'social-daytime',
    formalityMin: 3.0,
    formalityMax: 5.0,
    socialRegister: 'evaluative',
    occasions: ['Photoshoot']
  },

  // ===== SOCIAL-EVENING (Evening social occasions) =====
  {
    activityContext: 'social-evening',
    formalityMin: 3.5,
    formalityMax: 4.5,
    socialRegister: 'peer-social',
    occasions: ['Casual Dinner', 'Happy Hour']
  },
  {
    activityContext: 'social-evening',
    formalityMin: 3.5,
    formalityMax: 5.0,
    socialRegister: 'peer-social',
    occasions: ['Bachelorette Party']
  },
  {
    activityContext: 'social-evening',
    formalityMin: 3.5,
    formalityMax: 4.5,
    socialRegister: ['peer-social', 'evaluative'],
    occasions: ['Wine Tasting']
  },
  {
    activityContext: 'social-evening',
    formalityMin: 4.0,
    formalityMax: 5.0,
    socialRegister: ['evaluative', 'celebratory'],
    occasions: ['Rehearsal Dinner']
  },
  {
    activityContext: 'social-evening',
    formalityMin: 4.0,
    formalityMax: 5.5,
    socialRegister: ['peer-social', 'intimate'],
    occasions: ['Date Night']
  },
  {
    activityContext: 'social-evening',
    formalityMin: 4.0,
    formalityMax: 5.5,
    socialRegister: ['peer-social', 'evaluative'],
    occasions: ['Theatre']
  },
  {
    activityContext: 'social-evening',
    formalityMin: 4.0,
    formalityMax: 5.5,
    socialRegister: 'peer-social',
    requiresBoldSignal: true,
    occasions: ['Night Out']
  },

  // ===== PROFESSIONAL (Work contexts) =====
  {
    activityContext: 'professional',
    formalityMin: 2.0,
    formalityMax: 4.0,
    socialRegister: 'public-facing',
    occasions: ['Work from Home']
  },
  {
    activityContext: 'professional',
    formalityMin: 3.0,
    formalityMax: 4.5,
    socialRegister: 'peer-social',
    occasions: ['Golf']  // Business golf
  },
  {
    activityContext: 'professional',
    formalityMin: 3.5,
    formalityMax: 5.0,
    socialRegister: 'public-facing',
    occasions: ['Working in the Office', 'Business Trip']
  },
  {
    activityContext: 'professional',
    formalityMin: 4.5,
    formalityMax: 5.5,
    socialRegister: 'evaluative',
    occasions: ['Interview', 'Working in the Office']
  },

  // ===== EVENT (Structured events with dress codes) =====
  {
    activityContext: 'event',
    formalityMin: 3.5,
    formalityMax: 4.5,
    socialRegister: 'celebratory',
    occasions: ['Wedding Shower', 'Graduation Party']
  },
  {
    activityContext: 'event',
    formalityMin: 4.0,
    formalityMax: 5.0,
    socialRegister: 'celebratory',
    occasions: ['Party', 'Holiday Party']
  },
  {
    activityContext: 'event',
    formalityMin: 4.5,
    formalityMax: 5.3,
    socialRegister: 'celebratory',
    occasions: ['Party', 'Cocktail Party']
  },
  {
    activityContext: 'event',
    formalityMin: 5.0,
    formalityMax: 5.5,
    socialRegister: 'celebratory',
    occasions: ['Cocktail Party', 'Wedding Guest', 'Formal']
  },
  {
    activityContext: 'event',
    formalityMin: 5.0,
    formalityMax: 5.5,
    socialRegister: 'celebratory',
    occasions: ['Bridesmaid', 'Mother of the Bride', 'Mother of the Groom']
  },
  {
    activityContext: 'event',
    formalityMin: 5.5,
    formalityMax: 6.0,
    socialRegister: 'celebratory',
    occasions: ['Black Tie / Gala', 'Getting Married', 'Bridal']
  },

  // ===== ACTIVE (Physical activity, sports) =====
  {
    activityContext: 'active',
    formalityMin: 1.0,
    formalityMax: 2.5,
    socialRegister: 'any',
    occasions: ['Workout', 'Running', 'Yoga', 'Weight Lifting', 'Swimming']
  },
  {
    activityContext: 'active',
    formalityMin: 2.0,
    formalityMax: 3.5,
    socialRegister: 'peer-social',
    occasions: ['Hiking']
  },
  {
    activityContext: 'active',
    formalityMin: 2.5,
    formalityMax: 4.0,
    socialRegister: 'peer-social',
    occasions: ['Skiing']
  },
];

// ============================================================================
// OCCASION DERIVATION FUNCTION
// ============================================================================

/**
 * Derive occasions from resolved axes
 *
 * This is a pure function - no AI calls, fully deterministic.
 * It walks the mapping table and collects all matching occasions.
 *
 * @param axes - Resolved axis values
 * @param hasBoldSignal - Whether outfit has bold/statement styling
 * @returns Array of occasion strings
 */
export function deriveOccasions(
  axes: {
    formality: { value: number };
    activityContext: { value: ActivityContext; secondary?: ActivityContext };
    socialRegister: { value: SocialRegister };
  },
  hasBoldSignal: boolean = false
): string[] {
  const occasions = new Set<string>();
  const contexts = [axes.activityContext.value];
  if (axes.activityContext.secondary) {
    contexts.push(axes.activityContext.secondary);
  }

  for (const context of contexts) {
    for (const row of OCCASION_MAPPING) {
      // Check if activity context matches
      if (row.activityContext !== context) continue;

      // Check if formality is in range
      if (axes.formality.value < row.formalityMin || axes.formality.value > row.formalityMax) {
        continue;
      }

      // Check if bold signal is required and present
      if (row.requiresBoldSignal && !hasBoldSignal) continue;

      // Check if social register matches
      const registerMatch =
        row.socialRegister === 'any' ||
        row.socialRegister === axes.socialRegister.value ||
        (Array.isArray(row.socialRegister) && row.socialRegister.includes(axes.socialRegister.value));

      if (registerMatch) {
        row.occasions.forEach(o => occasions.add(o));
      }
    }
  }

  // Apply formality gate filter (remove occasions inconsistent with formality)
  const filteredOccasions = applyFormalityGate(Array.from(occasions), axes.formality.value);

  return filteredOccasions;
}

// ============================================================================
// FORMALITY GATE FILTER
// ============================================================================

/**
 * Formality gate thresholds for each occasion
 * Derived from OCCASION_MAPPING table - defines acceptable formality range
 */
const OCCASION_FORMALITY_GATES: Record<string, { min: number; max: number }> = {
  // Very Casual (1.0-2.5)
  'Relaxing at Home': { min: 1.0, max: 2.5 },
  'Weekend': { min: 1.0, max: 3.0 },
  'Running Errands': { min: 1.5, max: 3.0 },
  'Workout': { min: 1.0, max: 2.5 },
  'Running': { min: 1.0, max: 2.5 },
  'Yoga': { min: 1.0, max: 2.5 },
  'Weight Lifting': { min: 1.0, max: 2.5 },
  'Swimming': { min: 1.0, max: 2.5 },

  // Casual (2.0-3.5)
  'Road Trip': { min: 2.0, max: 3.5 },
  'Beach Day': { min: 2.0, max: 3.5 },
  'Vacation': { min: 2.0, max: 4.5 },
  'Warm Weather Vacation': { min: 2.0, max: 3.5 },
  'Cold Weather Vacation': { min: 2.5, max: 4.0 },
  'Farmers Market': { min: 2.0, max: 3.5 },
  'Festival': { min: 2.0, max: 3.5 },
  'Concert': { min: 2.0, max: 4.0 },
  'Baseball Game': { min: 2.0, max: 3.5 },
  'Football Game': { min: 2.0, max: 3.5 },
  'Hiking': { min: 2.0, max: 3.5 },
  'Skiing': { min: 2.5, max: 4.0 },

  // Smart Casual (2.5-4.0)
  'Coffee Date': { min: 2.5, max: 4.0 },
  'Shopping Day': { min: 2.5, max: 4.0 },
  'Sightseeing': { min: 2.5, max: 4.0 },
  'Back to School': { min: 2.5, max: 4.0 },
  'BBQ / Cookout': { min: 2.5, max: 4.0 },
  'Rodeo': { min: 2.5, max: 4.5 },
  'Brunch': { min: 2.8, max: 4.5 },
  'Lunch with Friends': { min: 2.8, max: 4.5 },
  'Baby Shower': { min: 3.0, max: 4.5 },
  'Spa Day': { min: 2.0, max: 4.0 },
  'Entertaining at Home': { min: 3.0, max: 4.5 },

  // Elevated Casual / Business Casual (3.0-5.0)
  'Casual Dinner': { min: 3.0, max: 5.0 },
  'Happy Hour': { min: 3.5, max: 5.0 },
  'Work from Home': { min: 2.0, max: 4.5 },
  'Working in the Office': { min: 3.5, max: 5.5 },
  'Business Trip': { min: 3.5, max: 5.5 },
  'Golf': { min: 3.0, max: 4.5 },
  'Photoshoot': { min: 3.0, max: 5.5 },

  // Dressy / Semi-Formal (4.0-5.5)
  'Date Night': { min: 4.0, max: 5.5 },
  'Night Out': { min: 4.0, max: 5.5 },
  'Bachelorette Party': { min: 3.5, max: 5.5 },
  'Wine Tasting': { min: 3.5, max: 5.0 },
  'Rehearsal Dinner': { min: 4.0, max: 5.5 },
  'Theatre': { min: 4.0, max: 5.5 },
  'Party': { min: 4.0, max: 5.5 },
  'Holiday Party': { min: 4.0, max: 5.5 },
  'Cocktail Party': { min: 4.5, max: 5.5 },
  'Wedding Shower': { min: 3.5, max: 5.0 },
  'Graduation Party': { min: 3.5, max: 5.0 },
  'Interview': { min: 4.5, max: 5.5 },

  // Formal (5.0-6.0)
  'Wedding Guest': { min: 5.0, max: 5.5 },
  'Formal': { min: 5.0, max: 5.5 },
  'Bridesmaid': { min: 5.0, max: 5.5 },
  'Mother of the Bride': { min: 5.0, max: 5.5 },
  'Mother of the Groom': { min: 5.0, max: 5.5 },
  'Black Tie / Gala': { min: 5.5, max: 6.0 },
  'Getting Married': { min: 5.5, max: 6.0 },
  'Bridal': { min: 5.5, max: 6.0 },
};

/**
 * Apply formality gate filter
 *
 * Removes occasions that are inconsistent with the outfit's formality level.
 * This prevents absurd tags like "Golf" on athleisure or "Black Tie" on jeans.
 *
 * @param occasions - Occasions derived from axis combinations
 * @param formality - Outfit formality score (1.0-6.0)
 * @returns Filtered occasions
 */
function applyFormalityGate(occasions: string[], formality: number): string[] {
  return occasions.filter(occasion => {
    const gate = OCCASION_FORMALITY_GATES[occasion];

    // If no gate defined, allow by default (should not happen)
    if (!gate) {
      console.warn(`⚠️  No formality gate defined for occasion: ${occasion}`);
      return true;
    }

    // Check if formality is within acceptable range
    const isValid = formality >= gate.min && formality <= gate.max;

    // Log removals for debugging
    if (!isValid) {
      console.log(`🚫 Formality gate: Removed "${occasion}" (formality ${formality.toFixed(2)} outside range ${gate.min}-${gate.max})`);
    }

    return isValid;
  });
}
