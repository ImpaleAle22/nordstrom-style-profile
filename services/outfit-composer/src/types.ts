/**
 * Type definitions for Outfit Composer Service
 */

// ============================================================================
// SANITY SCHEMA TYPES (mirrors sanity/schemas)
// ============================================================================

export interface Product {
  _id: string;
  title: string;
  brand: string;
  price: number;
  productId: string;
  primaryImageUrl?: string;
  department: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  productType4?: string;
  materials?: string[];
  dominantColors?: string[];
  simplifiedColors?: string[];
  vanityColor?: string;
  patterns?: string[];
  occasions?: string[];
  seasons?: string[];
  weatherContext?: string[];
  activityContext?: string[];
  silhouette?: string;
  sleeveStyle?: string;
  neckline?: string;
  heelStyle?: string;
  isOutfitEligible?: boolean;
}

export interface IngredientSet {
  _id: string;
  setId: string;
  displayTitle: string;
  query: string;
  theme: string;
  department: string;
  productType1?: string;
  productType2?: string;
  brands?: string[];
  tags?: string[];
  season?: string;
  signal?: string;
  products: Product[];
}

export interface OutfitSlot {
  role: SlotRole;
  ingredientSet?: IngredientSet;
  conditional?: string;
}

export interface OutfitRecipe {
  _id: string;
  recipeId: string;
  title: string;
  theme: string;
  department: string;
  season?: string;
  color?: string;
  slots: OutfitSlot[];
}

// ============================================================================
// OUTFIT BUILDING TYPES
// ============================================================================

export type SlotRole = 'tops' | 'bottoms' | 'one-piece' | 'shoes' | 'outerwear' | 'accessories';

export type StyleRegister =
  | 'athletic'
  | 'casual'
  | 'smart-casual'
  | 'business-casual'
  | 'elevated'
  | 'formal';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type FabricWeight = 'lightweight' | 'midweight' | 'heavyweight' | 'sheer';

// ============================================================================
// CUSTOMER SIGNALS
// ============================================================================

export interface CustomerSignals {
  gender: 'womens' | 'mens' | 'all';
  season: 'spring' | 'fall';
  dog_owner?: boolean;
  location_type?: string;
  style_profile?: string;
  price_sensitivity?: 'low' | 'medium' | 'high';
}

// ============================================================================
// OUTFIT COMPOSITION
// ============================================================================

export interface OutfitItem {
  role: SlotRole;
  product: Product;
}

export interface ComposedOutfit {
  outfitId: string;
  recipeId: string;
  items: OutfitItem[];
  // Two-score system
  qualityScore: number;              // How good is this outfit? (0-100)
  alignmentScore: number;            // How well does it match the recipe? (0-100)
  poolTier: 'primary' | 'secondary' | 'suppressed' | 'happy-accident';
  // Detailed breakdowns
  qualityBreakdown: OutfitQualityBreakdown;
  alignmentBreakdown: RecipeAlignmentBreakdown;
  // Legacy support
  confidenceScore?: number;          // @deprecated Use qualityScore
  scoreBreakdown?: OutfitScoreBreakdown; // @deprecated Use qualityBreakdown
  aiReasoning?: string;
}

/**
 * Outfit Quality Score Components
 * Measures how good the outfit is, independent of recipe
 */
export interface OutfitQualityBreakdown {
  colorHarmony: number;          // Do colors work together? (0-100)
  styleCoherence: number;        // Compatible style registers? (0-100)
  silhouetteBalance: number;     // Well-proportioned? (0-100)
  generalFashionability: number; // Overall styling quality (0-100)
}

/**
 * Recipe Alignment Score Components
 * Measures how well the outfit matches what the recipe asked for
 */
export interface RecipeAlignmentBreakdown {
  ingredientFidelity: number;  // Did we get the materials/styles specified? (0-100)
  queryRelevance: number;      // How well do products match search queries? (0-100)
  seasonMatching: number;      // Right season for recipe? (0-100)
  brandMatching: number;       // Did we hit specified brands? (0-100)
}

/** @deprecated Use OutfitQualityBreakdown instead */
export interface OutfitScoreBreakdown {
  styleRegisterCoherence: number;
  colorHarmony: number;
  silhouetteBalance: number;
  occasionAlignment: number;
  seasonFabricWeight: number;
}

// ============================================================================
// COMPOSITION REQUEST/RESPONSE
// ============================================================================

export interface ComposeRequest {
  recipeId: string;
  customerSignals: CustomerSignals;
  maxOutfits?: number;
  minConfidence?: number;
}

export interface ComposeResponse {
  success: boolean;
  outfits: ComposedOutfit[];
  metadata: {
    recipeTitle: string;
    totalCombinationsEvaluated: number;
    processingTimeMs: number;
  };
  error?: string;
}

// ============================================================================
// SCORING CONFIGURATION (Two-Score System)
// ============================================================================

/**
 * Outfit Quality Weights
 * How good is the outfit, independent of recipe?
 */
export interface QualityWeights {
  colorHarmony: number;
  styleCoherence: number;
  silhouetteBalance: number;
  generalFashionability: number;
}

export const DEFAULT_QUALITY_WEIGHTS: QualityWeights = {
  colorHarmony: 0.35,
  styleCoherence: 0.30,
  silhouetteBalance: 0.25,
  generalFashionability: 0.10,
};

/**
 * Recipe Alignment Weights
 * How well does the outfit match what the recipe asked for?
 */
export interface AlignmentWeights {
  ingredientFidelity: number;
  queryRelevance: number;
  seasonMatching: number;
  brandMatching: number;
}

export const DEFAULT_ALIGNMENT_WEIGHTS: AlignmentWeights = {
  ingredientFidelity: 0.00,  // DISABLED: Only 48% of products have materials (unreliable)
  queryRelevance: 1.00,      // PRIMARY: Do products match search queries? (CLIP semantic similarity)
  seasonMatching: 0.00,      // Season is emergent from outfit, not prescribed
  brandMatching: 0.00,       // Brands are suggestions, not requirements
};

/**
 * Score thresholds for classification
 */
export const SCORE_THRESHOLDS = {
  quality: {
    high: 70,
    medium: 50,
  },
  alignment: {
    high: 11,  // Calibrated for image embeddings: 85% of max observed CLIP score (0.126)
    medium: 9,  // Calibrated for image embeddings: 70% of max observed CLIP score
  },
} as const;

/**
 * Context for outfit display
 */
export type OutfitContext = 'recipe-page' | 'discovery';

// ============================================================================
// LEGACY SCORING CONFIGURATION
// ============================================================================

/** @deprecated Use QualityWeights instead */
export interface ScoringWeights {
  styleRegisterCoherence: number;
  colorHarmony: number;
  silhouetteBalance: number;
  occasionAlignment: number;
  seasonFabricWeight: number;
}

/** @deprecated Use DEFAULT_QUALITY_WEIGHTS instead */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  styleRegisterCoherence: 0.25,
  colorHarmony: 0.25,
  silhouetteBalance: 0.20,
  occasionAlignment: 0.15,
  seasonFabricWeight: 0.15,
};

/** @deprecated Use SCORE_THRESHOLDS instead */
export const CONFIDENCE_THRESHOLDS = {
  primary: 75,
  secondary: 50,
  suppress: 0,
} as const;
