/**
 * Occasion Catalog - Range-Based Occasion Mapping
 *
 * Replaces exact-match lookup with scored range-based matching.
 * Guarantees zero gaps through fallback cascade.
 *
 * All occasion names must match the canonical OCCASIONS export from outfit-attributes.ts
 */

import type { ActivityContext, Season, SocialRegister } from './axis-types';
import { OCCASIONS } from './outfit-attributes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * OutfitAxes - Simplified axis values for occasion matching
 */
export interface OutfitAxes {
  activityContext: ActivityContext;
  socialRegister: SocialRegister;
  formality: number;        // 1.0–6.0 continuous
  season: Season[];         // outfit can span multiple seasons
  eventRole?: string;       // Optional: detected event role (e.g., 'bridesmaid', 'wedding-guest')
}

/**
 * OccasionRule - Defines when an occasion is appropriate
 */
export interface OccasionRule {
  name: string;                          // Must match a canonical occasion exactly
  formality: [number, number];           // [min, max] inclusive (1.0–6.0 scale)
  activityContext: ActivityContext[];    // Which contexts this lives in
  socialRegister: SocialRegister[];      // Which registers
  seasons?: Season[];                    // Optional; omit = all seasons
  priority?: number;                     // 0–10, used to break ties
  eventRole?: string;                    // Optional: event role tag (for wedding occasions)
}

// ============================================================================
// OCCASION CATALOG
// ============================================================================

export const OCCASION_CATALOG: OccasionRule[] = [
  // ========== EVERYDAY / CASUAL-LOW-KEY ==========
  {
    name: "Relaxing at Home",
    formality: [1.0, 2.0],
    activityContext: ["casual-low-key"],
    socialRegister: ["intimate"],
    priority: 7
  },
  {
    name: "Running Errands",
    formality: [1.0, 2.5],
    activityContext: ["casual-low-key"],
    socialRegister: ["intimate", "peer-social"],
    priority: 8
  },
  {
    name: "Weekend",
    formality: [1.0, 3.0],
    activityContext: ["casual-low-key", "social-daytime"],
    socialRegister: ["intimate", "peer-social"],
    priority: 9
  },

  // ========== SOCIAL-DAYTIME / PEER-SOCIAL (COVERS GAPS: 1.0, 1.8) ==========
  {
    name: "Coffee Date",
    formality: [1.0, 2.5],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social", "intimate"],
    priority: 9
  },
  {
    name: "Farmers Market",
    formality: [1.0, 2.5],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social"],
    priority: 7
  },
  {
    name: "Brunch",
    formality: [1.5, 3.5],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social", "intimate"],
    priority: 9
  },
  {
    name: "Lunch with Friends",
    formality: [2.0, 4.0],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social", "intimate"],
    priority: 8
  },
  {
    name: "Shopping Day",
    formality: [2.0, 4.0],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 6
  },
  {
    name: "Sightseeing",
    formality: [2.0, 4.0],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social", "intimate", "public-facing"],
    priority: 6
  },
  {
    name: "BBQ / Cookout",
    formality: [1.5, 3.0],
    activityContext: ["social-daytime"],
    socialRegister: ["peer-social", "intimate"],
    priority: 7
  },
  {
    name: "Baby Shower",
    formality: [2.5, 4.5],
    activityContext: ["social-daytime", "event"],
    socialRegister: ["peer-social", "celebratory"],
    priority: 6
  },

  // ========== SOCIAL-EVENING / PEER-SOCIAL (COVERS GAP: 3.1) ==========
  {
    name: "Casual Dinner",
    formality: [2.5, 4.0],
    activityContext: ["social-evening"],
    socialRegister: ["peer-social", "intimate"],
    priority: 9
  },
  {
    name: "Happy Hour",
    formality: [2.5, 4.0],
    activityContext: ["social-evening"],
    socialRegister: ["peer-social"],
    priority: 9
  },
  {
    name: "Date Night",
    formality: [3.5, 5.5],
    activityContext: ["social-evening"],
    socialRegister: ["intimate"],
    priority: 9
  },
  {
    name: "Night Out",
    formality: [3.0, 5.0],
    activityContext: ["social-evening"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 8
  },
  {
    name: "Concert",
    formality: [2.0, 4.5],
    activityContext: ["social-evening"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 7
  },
  {
    name: "Festival",
    formality: [1.5, 3.5],
    activityContext: ["social-evening", "social-daytime"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 6
  },
  {
    name: "Party",
    formality: [2.0, 4.5],
    activityContext: ["social-evening", "event"],
    socialRegister: ["peer-social", "celebratory", "public-facing"],
    priority: 7
  },
  {
    name: "Entertaining at Home",
    formality: [2.5, 5.5],
    activityContext: ["casual-low-key", "social-evening"],
    socialRegister: ["intimate", "peer-social"],
    priority: 6
  },

  // ========== PROFESSIONAL ==========
  {
    name: "Work from Home",
    formality: [1.5, 3.5],
    activityContext: ["professional"],
    socialRegister: ["evaluative", "intimate"],
    priority: 8
  },
  {
    name: "Working in the Office",
    formality: [3.0, 5.0],
    activityContext: ["professional"],
    socialRegister: ["evaluative", "public-facing"],
    priority: 9
  },
  {
    name: "Business Trip",
    formality: [3.5, 5.5],
    activityContext: ["professional"],
    socialRegister: ["evaluative", "public-facing"],
    priority: 7
  },
  {
    name: "Interview",
    formality: [4.0, 6.0],
    activityContext: ["professional"],
    socialRegister: ["evaluative"],
    priority: 9
  },

  // ========== EVENT / FORMAL / CELEBRATORY ==========
  {
    name: "Cocktail Party",
    formality: [4.5, 6.0],
    activityContext: ["event"],
    socialRegister: ["celebratory", "public-facing"],
    priority: 9
  },
  {
    name: "Holiday Party",
    formality: [4.0, 6.0],
    activityContext: ["event", "social-evening"],
    socialRegister: ["celebratory", "peer-social"],
    priority: 8
  },
  {
    name: "Formal",
    formality: [5.0, 6.0],
    activityContext: ["event"],
    socialRegister: ["celebratory", "evaluative", "public-facing"],
    priority: 8
  },
  {
    name: "Black Tie / Gala",
    formality: [5.5, 6.0],
    activityContext: ["event"],
    socialRegister: ["celebratory", "public-facing"],
    priority: 9
  },
  {
    name: "Theatre",
    formality: [4.0, 5.5],
    activityContext: ["event", "social-evening"],
    socialRegister: ["public-facing", "celebratory"],
    priority: 6
  },
  {
    name: "Wine Tasting",
    formality: [3.5, 5.0],
    activityContext: ["event", "social-evening"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 6
  },
  {
    name: "Graduation Party",
    formality: [3.5, 5.5],
    activityContext: ["event"],
    socialRegister: ["celebratory", "peer-social"],
    priority: 7
  },

  // ========== WEDDING CATEGORY (Role-Based Matching) ==========
  // Wedding occasions are event roles that can span wide formality ranges
  // Role detection provides specificity (bridesmaid dress for garden or black-tie wedding)
  {
    name: "Wedding Guest",
    formality: [3.5, 6.0],  // Garden wedding → Black tie
    activityContext: ["event"],
    socialRegister: ["celebratory"],
    eventRole: "wedding-guest",
    priority: 9
  },
  {
    name: "Bridal",
    formality: [4.0, 6.0],  // Wide range for different wedding styles
    activityContext: ["event"],
    socialRegister: ["celebratory"],
    eventRole: "bridal",
    priority: 10  // Highest priority when role detected
  },
  {
    name: "Bridesmaid",
    formality: [3.5, 6.0],  // Garden wedding → Black tie
    activityContext: ["event"],
    socialRegister: ["celebratory"],
    eventRole: "bridesmaid",
    priority: 9
  },
  {
    name: "Getting Married",
    formality: [4.0, 6.0],  // Wide range for different wedding styles
    activityContext: ["event"],
    socialRegister: ["celebratory"],
    eventRole: "bride",  // Can also match "groom"
    priority: 10  // Highest priority when role detected
  },
  {
    name: "Mother of the Bride",
    formality: [4.0, 6.0],  // Accommodate different wedding formality levels
    activityContext: ["event"],
    socialRegister: ["celebratory"],
    eventRole: "mother-of-bride",
    priority: 9
  },
  {
    name: "Mother of the Groom",
    formality: [4.0, 6.0],  // Accommodate different wedding formality levels
    activityContext: ["event"],
    socialRegister: ["celebratory"],
    eventRole: "mother-of-groom",
    priority: 9
  },
  {
    name: "Rehearsal Dinner",
    formality: [4.0, 5.5],
    activityContext: ["event", "social-evening"],
    socialRegister: ["celebratory", "intimate"],
    priority: 7
  },
  {
    name: "Wedding Shower",
    formality: [3.5, 5.0],
    activityContext: ["event", "social-daytime"],
    socialRegister: ["celebratory", "peer-social"],
    priority: 6
  },
  {
    name: "Bachelorette Party",
    formality: [3.0, 5.0],
    activityContext: ["event", "social-evening"],
    socialRegister: ["celebratory", "intimate", "peer-social"],
    priority: 6
  },

  // ========== TRAVEL ==========
  {
    name: "Vacation",
    formality: [1.5, 4.0],
    activityContext: ["casual-low-key", "social-daytime"],
    socialRegister: ["intimate", "peer-social"],
    priority: 7
  },
  {
    name: "Warm Weather Vacation",
    formality: [1.0, 3.0],
    activityContext: ["casual-low-key", "social-daytime"],
    socialRegister: ["intimate", "peer-social"],
    seasons: ["spring", "summer"],
    priority: 7
  },
  {
    name: "Cold Weather Vacation",
    formality: [2.0, 4.0],
    activityContext: ["casual-low-key", "social-daytime"],
    socialRegister: ["intimate", "peer-social"],
    seasons: ["fall", "winter"],
    priority: 7
  },
  {
    name: "Beach Day",
    formality: [1.0, 2.5],
    activityContext: ["casual-low-key", "active"],
    socialRegister: ["intimate", "peer-social"],
    seasons: ["spring", "summer"],
    priority: 8
  },
  {
    name: "Road Trip",
    formality: [1.0, 3.0],
    activityContext: ["casual-low-key"],
    socialRegister: ["intimate", "peer-social"],
    priority: 6
  },

  // ========== SCHOOL ==========
  {
    name: "Back to School",
    formality: [2.0, 4.0],
    activityContext: ["casual-low-key", "professional"],
    socialRegister: ["peer-social", "evaluative"],
    priority: 6
  },
  {
    name: "Photoshoot",
    formality: [2.5, 5.5],
    activityContext: ["event"],
    socialRegister: ["public-facing", "celebratory"],
    priority: 5
  },

  // ========== SPORT / ACTIVE ==========
  {
    name: "Workout",
    formality: [1.0, 2.0],
    activityContext: ["active"],
    socialRegister: ["intimate", "peer-social"],
    priority: 9
  },
  {
    name: "Running",
    formality: [1.0, 2.0],
    activityContext: ["active"],
    socialRegister: ["intimate", "peer-social"],
    priority: 8
  },
  {
    name: "Yoga",
    formality: [1.0, 2.5],
    activityContext: ["active"],
    socialRegister: ["intimate", "peer-social"],
    priority: 8
  },
  {
    name: "Weight Lifting",
    formality: [1.0, 2.0],
    activityContext: ["active"],
    socialRegister: ["intimate", "peer-social"],
    priority: 7
  },
  {
    name: "Hiking",
    formality: [1.0, 2.5],
    activityContext: ["active"],
    socialRegister: ["intimate", "peer-social"],
    priority: 8
  },
  {
    name: "Skiing",
    formality: [1.5, 3.0],
    activityContext: ["active"],
    socialRegister: ["intimate", "peer-social"],
    seasons: ["winter"],
    priority: 7
  },
  {
    name: "Swimming",
    formality: [1.0, 2.0],
    activityContext: ["active"],
    socialRegister: ["intimate", "peer-social"],
    seasons: ["spring", "summer"],
    priority: 7
  },
  {
    name: "Golf",
    formality: [2.5, 4.5],
    activityContext: ["active"],
    socialRegister: ["peer-social", "evaluative", "public-facing"],
    priority: 7
  },
  {
    name: "Baseball Game",
    formality: [1.5, 3.5],
    activityContext: ["active", "social-evening"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 6
  },
  {
    name: "Football Game",
    formality: [1.5, 3.5],
    activityContext: ["active", "social-evening"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 6
  },
  {
    name: "Rodeo",
    formality: [2.0, 4.0],
    activityContext: ["active", "event"],
    socialRegister: ["peer-social", "public-facing"],
    priority: 5
  },
  {
    name: "Spa Day",
    formality: [2.0, 4.0],
    activityContext: ["casual-low-key"],
    socialRegister: ["intimate", "peer-social"],
    priority: 6
  }
];

// ============================================================================
// VALIDATORS
// ============================================================================

const ALL_CANONICAL_OCCASIONS = new Set(Object.values(OCCASIONS).flat());

/**
 * Validate catalog at module load - catches typos immediately
 */
function validateCatalog(): void {
  for (const rule of OCCASION_CATALOG) {
    if (!ALL_CANONICAL_OCCASIONS.has(rule.name)) {
      throw new Error(`Catalog rule "${rule.name}" is not in canonical OCCASIONS`);
    }
  }
}

validateCatalog();
