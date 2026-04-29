/**
 * Recipe Cooking System - Type Definitions
 */

import type { OutfitRole } from '../role-mappings';
import type { PipelineConfig } from './kitchen-stations';

// Product from CLIP API
export interface ClipProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  imageUrl: string;
  department: string;
  gender?: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  productType4?: string;
  materials?: string[];
  colors?: string[];
  patterns?: string | string[];
  styleRegister?: string;
  occasions?: string[];
  season?: string;
  clip_score?: number;
  embedding?: number[]; // FashionSigLIP embedding for similarity checks

  // Rich metadata (Phase 1 - from expanded CLIP API response)
  description?: string;           // Full product description (H&M has great descriptions!)
  silhouette?: string;            // A-Line, Bodycon, Relaxed, etc.
  garmentLength?: string;         // Mini, Midi, Maxi, etc.
  neckline?: string;              // Crew, V-neck, Cowl, etc.
  sleeveStyle?: string;           // Sleeveless, Long Sleeve, etc.
  fitDetails?: string;            // "Open Back, Flared", etc.
  details?: string[];             // ["Cut-Out Detail", "3D Rosettes", etc.]
  weatherContext?: string[];      // ["Hot", "Cold", "Layering"]
  productFeatures?: string[];     // ["Breathable", "Machine Washable"]
  visualAttributes?: string[];    // AI-detected attributes from vision scan
  visionReasoning?: string;       // AI reasoning about the product

  // Phase 2: Stop Data Pipeline Leak - Additional rich metadata
  seasons?: string[];                    // ["Spring", "Fall"] - more granular than season
  activityContext?: string[];            // ["City Stroll", "Brunch", "Weekend"]
  comprehensiveDescription?: string;     // Full 900+ char AI-generated description
  stylistDescription?: string;           // Styling suggestions and context
  formalityTier?: string;                // "casual", "smart-casual", "business-casual", "formal"
  versatilityScore?: number;             // 1-10 rating of how versatile the item is
  lifestyleOccasions?: string[];         // More granular occasions from AI analysis
  trendTags?: string[];                  // ["Classic", "Striped", "Minimalist", "Nautical"]
  materialAttributes?: Record<string, any>; // Detailed material breakdown
  patternAttributes?: Record<string, any>;  // Pattern details (scale, type, etc.)
}

// Coordination metadata for outfit building
export interface CoordinationHints {
  fit?: 'fitted' | 'loose' | 'structured' | 'drapey';
  length?: 'crop' | 'tunic' | 'standard';
  styleIntent?: 'minimal' | 'feminine' | 'edgy' | 'boho' | 'sporty';
  neckline?: 'v-neck' | 'crew neck' | 'scoop neck' | 'square neck' | 'off-shoulder' | 'halter' | 'high neck' | 'strapless';
  sleeve?: 'sleeveless' | 'short sleeve' | 'long sleeve' | 'cap sleeve' | 'puff sleeve' | 'flutter sleeve' | 'bell sleeve';
  dominantColors?: string[];
  silhouette?: 'A-line' | 'bodycon' | 'straight' | 'flared' | 'wide-leg';
}

// Ingredient with fetched products
export interface IngredientWithProducts {
  ingredientTitle: string;
  searchQuery: string;
  role: OutfitRole;
  products: ClipProduct[];
  coordinationHints?: CoordinationHints; // Optional styling metadata for AI coordination
  // Recipe specification (what the recipe asked for) - used for alignment scoring
  productTypes?: string[];
  materials?: string[];
  brands?: string[];
  // Color filtering metadata (NEW)
  colorWarning?: string; // Warning message if color filter was relaxed due to 0 results
}

// Single outfit combination
export interface OutfitCombination {
  items: Array<{
    role: OutfitRole;
    ingredientTitle: string;
    product: ClipProduct;
  }>;
  reasoning?: string; // Optional AI reasoning
}

// Scored outfit (Two-Score System)
export interface ScoredOutfit extends OutfitCombination {
  // Two-score system
  qualityScore: number;      // How good is this outfit? (0-100)
  alignmentScore: number;    // How well does it match the recipe? (0-100)
  poolTier: 'primary' | 'secondary' | 'suppressed' | 'happy-accident';

  // Recipe linking (generative cooking)
  linkedToRecipe: boolean;   // True if alignment is high enough to link to recipe
  sourceRecipeId?: string;   // Recipe that generated this outfit (even if not linked)

  // Detailed breakdowns
  qualityBreakdown: {
    colorHarmony: number;
    styleCoherence: number;
    silhouetteBalance: number;
    generalFashionability: number;
  };
  alignmentBreakdown: {
    ingredientFidelity: number;
    queryRelevance: number;
    seasonMatching: number;
    brandMatching: number;
  };

  // Legacy support
  confidenceScore?: number;
  scoreBreakdown?: {
    styleRegisterCoherence: number;
    colorHarmony: number;
    silhouetteBalance: number;
    occasionAlignment: number;
    seasonFabricWeight: number;
  };
}

// Cooking options
export interface CookingOptions {
  strategy?: 'random-sampling' | 'gemini-flash-lite' | 'gemini-flash' | 'claude-sonnet';
  targetCount?: number; // How many outfits to generate (default: 30, generative: 200)
  productsPerIngredient?: number; // How many products to fetch per ingredient (default: 20)
  minQuality?: number; // Minimum quality score to save outfit (default: 50)
  minAlignment?: number; // Minimum alignment score to link outfit to recipe (default: 80)
  generative?: boolean; // Generative mode: generate many, link selectively (default: false)
  saveToSanity?: boolean; // Whether to save to Sanity (default: false for testing)
  pipeline?: PipelineConfig; // Kitchen pipeline configuration (default: DEFAULT_PIPELINE)
  discoveryMode?: boolean; // Phase 2: Enable pattern candidate capture (default: false)
}

// Cooking result
export interface CookingResult {
  recipeId: string;
  recipeTitle: string;
  strategy: string;
  generativeMode: boolean;  // Whether this was cooked in generative mode

  // Outfits linked to recipe (high alignment)
  linkedOutfits: ScoredOutfit[];

  // Outfits not linked to recipe (high quality, low alignment - recipe seeds)
  unlinkedOutfits: ScoredOutfit[];

  // All outfits for backward compatibility
  outfits: ScoredOutfit[];

  stats: {
    totalGenerated: number;
    formalityFiltered: number;  // Filtered by formality mismatch (Station 2.5)
    similarityFiltered: number; // Filtered by similarity clash (Station 2.6)
    totalScored: number;
    totalSaved: number;        // Total high-quality outfits saved
    totalLinked: number;        // Outfits linked to recipe
    totalUnlinked: number;      // Outfits saved but not linked (recipe seeds)
    primary: number;
    secondary: number;
    suppressed: number;
    happyAccidents: number;     // High quality but low alignment
    linkedCount: number;        // Alias for totalLinked (for triage)
  };
  pipelineResults?: Array<{
    station: string;
    passed: number;
    filtered: number;
    examples: string[];
    metrics?: Record<string, any>;
  }>;
  errors?: string[];
  cookedAt: string;

  // Ingredient health (for diagnostics)
  ingredientHealth?: {
    totalIngredients: number;
    availableIngredients: number;
    missingIngredients: Array<{
      title: string;
      query: string;
      role: string;
    }>;
  };

  // Auto-triage metadata (Phase 1: Auto-trigger Discovery Mode)
  triage?: {
    status: 'success' | 'low-yield' | 'zero-saved' | 'formality-bottleneck' | 'failed';
    diagnostics: string[];
    needsAutoFix: boolean;
    recommendedAction?: 'retry-with-discovery' | 'retry-with-conservative' | 'manual-review' | 'none';
  };

  // Auto-retry metadata (if auto-retry was triggered)
  autoRetried?: boolean;
  retriedWithDiscoveryMode?: boolean;
  originalResult?: {
    stats: CookingResult['stats'];
    triage: CookingResult['triage'];
  };

  // Failure diagnostics (when no combinations generated)
  diagnostics?: {
    reason: 'zero_combinations_generated' | 'all_filtered' | 'strategy_failed';
    productPools?: Array<{
      ingredient: string;
      productCount: number;
      role: string;
    }>;
    suggestion?: string;
  };
}

// Combination Strategy Interface
export interface CombinationStrategy {
  name: string;
  generate(
    ingredients: IngredientWithProducts[],
    targetCount: number,
    recipeContext: {
      title: string;
      department: string;
      season?: string;
      theme?: string;
    }
  ): Promise<OutfitCombination[]>;
}
