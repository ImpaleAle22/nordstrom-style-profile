/**
 * Silhouette & Proportion Balance Scoring
 *
 * Evaluates whether outfit has balanced proportions.
 * Part 2.6 of OUTFIT-BUILDING-RULES.md
 */
import type { Product } from '../types';
type SilhouetteCategory = 'fitted' | 'relaxed' | 'oversized' | 'structured' | 'flowy' | 'unknown';
/**
 * Infer silhouette category from product
 */
export declare function inferSilhouette(product: Product): SilhouetteCategory;
/**
 * Score silhouette balance across outfit (0-100)
 */
export declare function scoreSilhouetteBalance(products: Product[]): number;
/**
 * Get detailed silhouette analysis for debugging
 */
export declare function analyzeSilhouetteBalance(products: Product[]): {
    silhouettes: Array<{
        product: string;
        category: string;
        silhouette: SilhouetteCategory;
    }>;
    balanceScore: number;
    assessment: string;
};
export {};
//# sourceMappingURL=silhouette-balance.d.ts.map