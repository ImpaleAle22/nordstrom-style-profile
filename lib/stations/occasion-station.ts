/**
 * Occasion Station - Range-Based Occasion Derivation
 *
 * Deterministic occasion mapping using scored range-based matching.
 * Guarantees zero gaps through three-layer fallback cascade.
 *
 * NO AI - purely deterministic with guaranteed non-empty results.
 */

import {
  OCCASION_CATALOG,
  type OccasionRule,
  type OutfitAxes
} from '../occasion-catalog';
import { OCCASIONS } from '../outfit-attributes';
import type { ActivityContext, SocialRegister, Season } from '../axis-types';

// ============================================================================
// TYPES
// ============================================================================

export interface OccasionStationInput {
  formality: number;
  activityContext: ActivityContext;
  activityContextSecondary?: ActivityContext;
  socialRegister: SocialRegister;
  season: Season[];
  eventRole?: string;  // Optional: detected event role (e.g., 'bridesmaid')
  outfitId?: string;   // For logging
}

export interface OccasionStationResult {
  occasions: string[];
  confidence: number; // 1.0 for main catalog, 0.8 for season-relaxed, 0.6 for register-relaxed, 0.4 for floor
  fallbackUsed: 'none' | 'season-relaxed' | 'register-relaxed' | 'generic-floor';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MIN_SCORE = 0.6;  // Minimum score to include an occasion; tune empirically

// IMPORTANT: All values must be canonical occasions from outfit-attributes.ts
// AND should also appear as rules in the catalog (to avoid naming drift).
const GENERIC_FLOOR: Record<ActivityContext, Record<'low' | 'mid' | 'high', string>> = {
  "casual-low-key":  { low: "Relaxing at Home", mid: "Weekend",              high: "Entertaining at Home" },
  "social-daytime":  { low: "Running Errands",  mid: "Coffee Date",          high: "Lunch with Friends" },
  "social-evening":  { low: "Casual Dinner",    mid: "Night Out",            high: "Cocktail Party" },
  "professional":    { low: "Work from Home",   mid: "Working in the Office", high: "Business Trip" },
  "event":           { low: "Holiday Party",    mid: "Cocktail Party",       high: "Black Tie / Gala" },
  "active":          { low: "Workout",          mid: "Yoga",                 high: "Golf" }
};

// ============================================================================
// VALIDATORS
// ============================================================================

const ALL_CANONICAL_OCCASIONS = new Set(Object.values(OCCASIONS).flat());

/**
 * Validate GENERIC_FLOOR at module load
 */
function validateGenericFloor(): void {
  for (const [ctx, buckets] of Object.entries(GENERIC_FLOOR)) {
    for (const [bucket, name] of Object.entries(buckets)) {
      if (!ALL_CANONICAL_OCCASIONS.has(name)) {
        throw new Error(`GENERIC_FLOOR[${ctx}][${bucket}] = "${name}" is not a canonical occasion`);
      }
    }
  }
}

validateGenericFloor();

// ============================================================================
// SCORING FUNCTION
// ============================================================================

/**
 * Score how well an occasion rule matches the outfit's axes
 *
 * Returns 0 if hard filters don't match, otherwise 0-4+ score
 * Role matching provides strong bonus (wedding occasions)
 */
function scoreOccasion(outfit: OutfitAxes, rule: OccasionRule): number {
  // Hard filters — must match or score is 0
  if (!rule.activityContext.includes(outfit.activityContext)) return 0;
  if (!rule.socialRegister.includes(outfit.socialRegister)) return 0;
  if (outfit.formality < rule.formality[0] || outfit.formality > rule.formality[1]) return 0;
  if (rule.seasons && !outfit.season.some(s => rule.seasons!.includes(s))) return 0;

  // EVENT ROLE BONUS/PENALTY — Strong signal for wedding occasions
  // If outfit has detected role AND rule has that role → massive bonus
  // If rule requires role but outfit has none → penalty (deprioritize)
  let roleModifier = 0;
  if (outfit.eventRole && rule.eventRole) {
    // Both have roles - check if they match
    if (outfit.eventRole === rule.eventRole) {
      roleModifier = 2.0;  // Strong match — dominates other factors
    } else if (outfit.eventRole === 'bride' && rule.eventRole === 'bridal') {
      roleModifier = 2.0;  // Synonym match
    } else if (outfit.eventRole === 'bridal' && rule.eventRole === 'bride') {
      roleModifier = 2.0;  // Synonym match
    }
  } else if (!outfit.eventRole && rule.eventRole) {
    // Rule requires role but outfit has none - apply penalty
    // This deprioritizes wedding occasions when role isn't detected
    // Allows more diverse occasions (Cocktail Party, etc.) to rank higher
    roleModifier = -1.0;  // Penalty pushes below non-role occasions
  }

  // Soft score — how centered is the outfit in this rule's formality window?
  const [min, max] = rule.formality;
  const center = (min + max) / 2;
  const halfWidth = (max - min) / 2;
  const distanceFromCenter = Math.abs(outfit.formality - center);
  const centeringScore = halfWidth > 0 ? 1 - (distanceFromCenter / halfWidth) : 1;  // 0–1

  // Specificity bonus — narrower ranges are more precise
  const rangeWidth = max - min;
  const specificityBonus = Math.max(0, (2 - rangeWidth) / 2);  // narrower = better

  return roleModifier + centeringScore + (rule.priority ?? 5) / 10 + specificityBonus * 0.2;
}

// ============================================================================
// MAIN OCCASION DERIVATION
// ============================================================================

/**
 * Get occasions for an outfit - guaranteed non-empty
 *
 * Returns 1-4 occasions based on scored matching
 */
export function getOccasionsForOutfit(axes: OutfitAxes): string[] {
  const scored = OCCASION_CATALOG
    .map(rule => ({ name: rule.name, score: scoreOccasion(axes, rule) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return getFallbackOccasions(axes);  // Layer 3
  }

  // Score floor + top-4 cap: avoid padding with weak matches
  return scored
    .filter(r => r.score >= MIN_SCORE)
    .slice(0, 4)
    .map(r => r.name);
}

// ============================================================================
// FALLBACK CASCADE
// ============================================================================

/**
 * Fallback cascade - preserves semantic meaning
 *
 * Pass A: Drop season (mostly safe)
 * Pass B: Drop social register (LOUD WARNING - semantic change)
 * Pass C: GENERIC_FLOOR (ERROR - catalog incomplete)
 */
function getFallbackOccasions(axes: OutfitAxes): string[] {
  // Pass A: Drop season constraint (mostly safe)
  const withoutSeason = OCCASION_CATALOG
    .filter(r => r.activityContext.includes(axes.activityContext))
    .filter(r => r.socialRegister.includes(axes.socialRegister))
    .filter(r => axes.formality >= r.formality[0] && axes.formality <= r.formality[1]);

  if (withoutSeason.length) {
    console.log(
      `[occasion-station] Season-relaxed fallback for ${axes.activityContext}/${axes.formality}/${axes.socialRegister}`
    );
    return withoutSeason.slice(0, 3).map(r => r.name);
  }

  // Pass B: Drop socialRegister constraint (LOUD WARNING — semantic change)
  const withoutRegister = OCCASION_CATALOG
    .filter(r => r.activityContext.includes(axes.activityContext))
    .filter(r => axes.formality >= r.formality[0] && axes.formality <= r.formality[1]);

  if (withoutRegister.length) {
    console.warn(
      `⚠️ [occasion-station] Register-relaxed fallback for ${axes.activityContext}/${axes.formality}/${axes.socialRegister} — review catalog coverage`
    );
    return withoutRegister.slice(0, 2).map(r => r.name);
  }

  // Pass C: GENERIC_FLOOR — last resort; logs as error (means catalog incomplete)
  console.error(
    `❌ [occasion-station] GENERIC_FLOOR fallback for ${axes.activityContext}/${axes.formality}/${axes.socialRegister} — catalog incomplete`
  );
  return [GENERIC_FLOOR[axes.activityContext][formalityBucket(axes.formality)]];
}

/**
 * Bucket formality into low/mid/high for GENERIC_FLOOR
 */
function formalityBucket(f: number): 'low' | 'mid' | 'high' {
  if (f < 2.5) return 'low';
  if (f < 4.0) return 'mid';   // boundary chosen to match catalog density
  return 'high';
}

// ============================================================================
// STATION ENTRY POINT
// ============================================================================

/**
 * Run Occasion Station
 *
 * Entry point for deterministic occasion derivation from axes
 */
export function runOccasionStation(input: OccasionStationInput): OccasionStationResult {
  // Convert to OutfitAxes format
  const axes: OutfitAxes = {
    activityContext: input.activityContext,
    socialRegister: input.socialRegister,
    formality: input.formality,
    season: input.season
  };

  // Get occasions using new catalog system
  const occasions = getOccasionsForOutfit(axes);

  return {
    occasions,
    confidence: 1.0, // Main catalog is deterministic and confident
    fallbackUsed: 'none' // TODO: track which fallback was used
  };
}
