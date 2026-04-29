/**
 * Occasion Alignment & Season Appropriateness Scoring
 *
 * Parts 2.3 and 2.4 of OUTFIT-BUILDING-RULES.md
 */
import type { Product, CustomerSignals } from '../types';
/**
 * Score how well products align with the occasion/theme
 */
export declare function scoreOccasionAlignment(products: Product[], theme: string): number;
/**
 * Score season appropriateness across outfit (0-100)
 *
 * Also checks for outerwear presence in fall/winter
 */
export declare function scoreSeasonFabricWeight(products: Product[], signals: CustomerSignals): number;
/**
 * Get detailed season/occasion analysis for debugging
 */
export declare function analyzeSeasonOccasion(products: Product[], theme: string, signals: CustomerSignals): {
    occasionScore: number;
    seasonScore: number;
    details: Array<{
        product: string;
        occasions: string[];
        materials: string[];
        seasonFit: number;
    }>;
};
//# sourceMappingURL=occasion-season.d.ts.map