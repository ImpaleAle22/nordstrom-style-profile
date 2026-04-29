/**
 * Type definitions for Outfit Composer Service
 */
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
export type SlotRole = 'tops' | 'bottoms' | 'one-piece' | 'shoes' | 'outerwear' | 'accessories';
export type StyleRegister = 'athletic' | 'casual' | 'smart-casual' | 'business-casual' | 'elevated' | 'formal';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type FabricWeight = 'lightweight' | 'midweight' | 'heavyweight' | 'sheer';
export interface CustomerSignals {
    gender: 'womens' | 'mens' | 'all';
    season: 'spring' | 'fall';
    dog_owner?: boolean;
    location_type?: string;
    style_profile?: string;
    price_sensitivity?: 'low' | 'medium' | 'high';
}
export interface OutfitItem {
    role: SlotRole;
    product: Product;
}
export interface ComposedOutfit {
    outfitId: string;
    recipeId: string;
    items: OutfitItem[];
    qualityScore: number;
    alignmentScore: number;
    poolTier: 'primary' | 'secondary' | 'suppressed' | 'happy-accident';
    qualityBreakdown: OutfitQualityBreakdown;
    alignmentBreakdown: RecipeAlignmentBreakdown;
    confidenceScore?: number;
    scoreBreakdown?: OutfitScoreBreakdown;
    aiReasoning?: string;
}
/**
 * Outfit Quality Score Components
 * Measures how good the outfit is, independent of recipe
 */
export interface OutfitQualityBreakdown {
    colorHarmony: number;
    styleCoherence: number;
    silhouetteBalance: number;
    generalFashionability: number;
}
/**
 * Recipe Alignment Score Components
 * Measures how well the outfit matches what the recipe asked for
 */
export interface RecipeAlignmentBreakdown {
    ingredientFidelity: number;
    queryRelevance: number;
    seasonMatching: number;
    brandMatching: number;
}
/** @deprecated Use OutfitQualityBreakdown instead */
export interface OutfitScoreBreakdown {
    styleRegisterCoherence: number;
    colorHarmony: number;
    silhouetteBalance: number;
    occasionAlignment: number;
    seasonFabricWeight: number;
}
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
export declare const DEFAULT_QUALITY_WEIGHTS: QualityWeights;
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
export declare const DEFAULT_ALIGNMENT_WEIGHTS: AlignmentWeights;
/**
 * Score thresholds for classification
 */
export declare const SCORE_THRESHOLDS: {
    readonly quality: {
        readonly high: 70;
        readonly medium: 50;
    };
    readonly alignment: {
        readonly high: 70;
        readonly medium: 55;
    };
};
/**
 * Context for outfit display
 */
export type OutfitContext = 'recipe-page' | 'discovery';
/** @deprecated Use QualityWeights instead */
export interface ScoringWeights {
    styleRegisterCoherence: number;
    colorHarmony: number;
    silhouetteBalance: number;
    occasionAlignment: number;
    seasonFabricWeight: number;
}
/** @deprecated Use DEFAULT_QUALITY_WEIGHTS instead */
export declare const DEFAULT_SCORING_WEIGHTS: ScoringWeights;
/** @deprecated Use SCORE_THRESHOLDS instead */
export declare const CONFIDENCE_THRESHOLDS: {
    readonly primary: 75;
    readonly secondary: 50;
    readonly suppress: 0;
};
//# sourceMappingURL=types.d.ts.map