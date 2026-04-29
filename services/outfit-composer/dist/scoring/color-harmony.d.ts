/**
 * Color Harmony Scoring
 *
 * Evaluates color compatibility across outfit items.
 * Part 2.2 of OUTFIT-BUILDING-RULES.md
 */
import type { Product } from '../types';
/**
 * Check if a color is neutral
 */
export declare function isNeutral(color: string): boolean;
/**
 * Extract primary color from product
 */
export declare function getPrimaryColor(product: Product): string | null;
/**
 * Get all colors from product
 */
export declare function getAllColors(product: Product): string[];
/**
 * Score color harmony across outfit items (0-100)
 *
 * Models (from OUTFIT-BUILDING-RULES.md):
 * - Monochromatic: 100
 * - Tonal neutral (all neutrals): 95
 * - Neutral anchor (neutrals + 1-2 accents): 90
 * - Analogous/complementary (advanced analysis): 80
 * - Mixed but not clashing: 60
 * - Unknown/insufficient data: 50
 * - Clashing: 20
 */
export declare function scoreColorHarmony(products: Product[]): number;
/**
 * Get detailed color harmony analysis for debugging
 */
export declare function analyzeColorHarmony(products: Product[]): {
    colors: Array<{
        product: string;
        colors: string[];
    }>;
    harmonyScore: number;
    harmonyModel: string;
    assessment: string;
};
//# sourceMappingURL=color-harmony.d.ts.map