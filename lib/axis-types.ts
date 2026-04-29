/**
 * Axis Types - Type definitions for the 4-axis tagging system
 *
 * Defines the core types for Formality, Activity Context, Season, and Social Register.
 */

// ============================================================================
// AXIS VALUE TYPES
// ============================================================================

/**
 * Activity Context - What category of activity is this outfit appropriate for?
 */
export type ActivityContext =
  | 'casual-low-key'
  | 'social-daytime'
  | 'social-evening'
  | 'professional'
  | 'event'
  | 'active';

/**
 * Season - What seasons/weather is this outfit appropriate for?
 * (Multi-value: an outfit can work for multiple seasons)
 */
export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';

/**
 * Social Register - What social context and audience does this outfit address?
 */
export type SocialRegister =
  | 'intimate'
  | 'peer-social'
  | 'evaluative'
  | 'public-facing'
  | 'celebratory';

// ============================================================================
// AXIS VALUE WRAPPER
// ============================================================================

/**
 * AxisValue - A resolved axis value with confidence and metadata
 *
 * Generic wrapper for any axis value (formality number, activity context, etc.)
 * Includes confidence score, reasoning, and source (rules vs AI).
 */
export interface AxisValue<T> {
  value: T;
  confidence: number;       // 0–1 (used to determine if AI refinement is needed)
  reason: string;           // One-sentence explanation (used in AI prompt and debug UI)
  source: 'rules' | 'ai';   // How this value was determined
}

// ============================================================================
// RESOLVED AXES
// ============================================================================

/**
 * ResolvedAxes - All four axes with their resolved values
 *
 * Returned by the rules layer (axis-resolver.ts) and potentially refined by AI.
 * Used as input to the occasion derivation function.
 */
export interface ResolvedAxes {
  formality: AxisValue<number>;  // 1.0–6.0 continuous scale

  activityContext: AxisValue<ActivityContext> & {
    secondary?: ActivityContext;  // Optional secondary context (e.g., blazer + jeans = social-evening + professional)
  };

  season: AxisValue<Season[]>;  // Multi-value: can be appropriate for multiple seasons

  socialRegister: AxisValue<SocialRegister>;
}

// ============================================================================
// OUTFIT ATTRIBUTES (Extended Schema)
// ============================================================================

/**
 * OutfitAttributes - Complete attribute set for a tagged outfit
 *
 * Extends the existing schema with four axis fields.
 * Occasions are now DERIVED from axes, not tagged independently.
 *
 * UNCHANGED: stylePillar, subStyle, vibes (existing tagging logic preserved)
 */
export interface OutfitAttributes {
  // ===== FOUR AXES (NEW) =====
  formality: number;                           // 1.0–6.0
  activityContext: ActivityContext;
  activityContextSecondary?: ActivityContext;  // Optional
  season: Season[];                            // Multi-value
  socialRegister: SocialRegister;

  // ===== DERIVED FROM AXES (NEW - replaces direct occasion tagging) =====
  occasions: string[];  // Derived mechanically from axis values via mapping table

  // ===== EXISTING FIELDS - DO NOT CHANGE =====
  stylePillar: string;   // One of 9 style pillars (Athletic, Casual, Classic, etc.)
  subStyle: string | null;  // Optional sub-style within pillar
  vibes: string[];       // 1-N vibes (Energetic, Relaxed, Confident, etc.)

  // ===== METADATA =====
  confidence: {
    formality: number;
    activityContext: number;
    season: number;
    socialRegister: number;
    stylePillar: number;
    vibes: number;
    occasions: number;
  };

  taggedAt: string;  // ISO timestamp
  // Overall tagging mode: 'rules' (all axes rules-only), 'ai' (pure AI), 'hybrid' (mixed rules+AI)
  taggedBy: 'rules' | 'ai' | 'hybrid';

  axisTaggedBy: {
    formality: 'rules' | 'ai';
    activityContext: 'rules' | 'ai';
    season: 'rules' | 'ai';
    socialRegister: 'rules' | 'ai';
  };

  reasoning?: string;  // Optional debug/audit trail
}

// ============================================================================
// INPUT TYPE (for axis resolution)
// ============================================================================

/**
 * OutfitInput - The outfit data passed to the axis resolver
 *
 * Subset of StoredOutfit fields needed for axis resolution.
 * Phase 4: Enhanced with rich product metadata from CLIP API
 */
export interface OutfitInput {
  outfitId: string;
  recipeTitle: string;
  items: Array<{
    role: string;  // 'tops' | 'bottoms' | 'shoes' | 'accessories' | 'outerwear'
    ingredientTitle: string;
    product: {
      id: string;
      title: string;
      brand: string;
      colors: string[];
      department: string;

      // Vision scan attributes (if available - may not exist yet)
      visionScan?: {
        fabricWeight?: string;
        drape?: string;
        silhouette?: string;
      };

      // Phase 4: Rich metadata for better tagging (from Phase 2 CLIP API enhancement)
      description?: string;                  // Basic product description
      comprehensiveDescription?: string;     // Full 900+ char AI description
      stylistDescription?: string;           // Styling suggestions
      materials?: string[];                  // ["Cotton", "Polyester"]
      patterns?: string | string[];          // "striped" or ["striped", "floral"]
      silhouette?: string;                   // "A-line", "fitted", "relaxed"
      garmentLength?: string;                // "midi", "mini", "maxi"
      neckline?: string;                     // "crew", "v-neck"
      sleeveStyle?: string;                  // "short sleeve", "long sleeve"
      fitDetails?: string;                   // "relaxed fit", "slim fit"
      details?: string[];                    // ["buttons", "pockets"]
      weatherContext?: string[];             // ["warm", "layering"]
      productFeatures?: string[];            // ["breathable", "machine washable"]
      visualAttributes?: string[];           // AI-detected attributes
      visionReasoning?: string;              // AI reasoning about product

      // Product-level tags (help with axis resolution)
      occasions?: string[];                  // ["Casual", "Weekend"]
      seasons?: string[];                    // ["Spring", "Fall"]
      formalityTier?: string;                // "casual", "smart-casual", "formal"
      versatilityScore?: number;             // 1-10 rating
      trendTags?: string[];                  // ["Classic", "Minimalist"]
      lifestyleOccasions?: string[];         // More granular occasions
    };
  }>;
  scoreBreakdown: {
    occasionAlignment: number;  // 0-100 (converted to formality 1-6)
  };
}
