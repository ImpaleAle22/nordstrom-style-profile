/**
 * UNIFIED RECIPE FORMAT
 * Used by both Recipe Builder (manual) and AI Vision Scan (automated)
 */

import type { OutfitRole } from './role-mappings';

/**
 * Core Recipe Structure
 * This is the single source of truth for all recipes in the system
 */
export interface UnifiedRecipe {
  // Identity
  id: string;
  title: string;
  status: 'published' | 'draft';

  // Metadata
  department: 'Womenswear' | 'Menswear';
  slotCount: number;
  seasons: string[]; // ['Spring', 'Summer'] or [] for all season
  createdAt: string; // ISO 8601 timestamp

  // Recipe content
  slots: RecipeSlot[];

  // Source tracking
  source: 'manual' | 'ai-vision' | 'ai-lifestyle-vision';
  batchId?: string; // Links recipe to batch session (e.g., "batch-2026-04-20-001")
  updatedAt?: string; // ISO 8601 timestamp for last update

  // AI-specific metadata (only present for AI-generated recipes)
  aiMetadata?: {
    sourceProductId: string;
    sourceImageUrl: string;
    sourceProductContext: {
      title: string;
      brand: string;
      department: string;
      productType1: string;
      productType2?: string;
    };
    confidence: number;
    notes?: string;
    scannedAt: string;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    // Lifestyle image specific data (only for ai-lifestyle-vision source)
    lifestyleImageData?: {
      stylePillar: string;
      subTerm: string | null;
      vibes: string[];
      occasions: string[];
      brandAdherence: any; // TODO: type this properly
    };
  };
}

/**
 * Recipe Slot
 * Represents one item position in the outfit with its role
 */
export interface RecipeSlot {
  role: OutfitRole; // 'tops' | 'bottoms' | 'one-piece' | 'shoes' | 'outerwear' | 'accessories'
  ingredient: RecipeIngredient;
}

/**
 * Recipe Ingredient
 * The search criteria for finding products to fill a slot
 */
export interface RecipeIngredient {
  ingredientTitle: string;
  searchQuery: string;

  // Product taxonomy
  productTypes: string[];   // [PT1] - top-level category (Tops, Bottoms, Accessories, Shoes, etc.)
  productType2?: string[];  // [PT2] - subcategory (Bags, Jewelry, Sneakers, Jeans, etc.)
  materials: string[];      // Actual materials (Denim, Cotton, Leather, Wool, etc.)
  brands: string[];         // Optional brand filters

  // AI-specific (only present for AI-generated ingredients)
  confidence?: number;
  originalQuery?: string;

  // Vision enrichment metadata (NEW - Phase 2: Recipe Precision System)
  // Rich attributes from vision analysis to guide AI composition (not hard filters)
  enrichment?: {
    patterns?: string[];        // ["floral", "print", "striped"]
    silhouette?: string;         // "A-line", "fitted", "oversized", "relaxed"
    secondaryColors?: string[];  // ["white", "green"] - accent colors beyond primary
    garmentLength?: string;      // "midi", "mini", "maxi", "knee-length"
    neckline?: string;           // "v-neck", "crew", "sweetheart", "scoop"
    sleeveStyle?: string;        // "short sleeve", "long sleeve", "sleeveless", "cap sleeve"
    fitType?: string;            // "fitted", "relaxed", "oversized", "tailored"
    textureType?: string;        // "knit", "woven", "structured", "flowy"
    styleDetails?: string[];     // ["cutout", "ruffles", "buttons", "embroidered"]
  };
}

/**
 * Legacy types for backward compatibility
 */
export interface RecipeBuilderRecipe extends Omit<UnifiedRecipe, 'source' | 'aiMetadata'> {
  // Old format used RecipeBuilderIngredient instead of RecipeIngredient
  ingredients?: RecipeBuilderIngredient[]; // Old format
}

export interface RecipeBuilderIngredient {
  productTypes: string[];
  ingredientTitle: string;
  searchQuery: string;
  brands: string[];
  materials: string[];
}
