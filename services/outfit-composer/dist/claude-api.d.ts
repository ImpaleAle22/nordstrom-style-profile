/**
 * Claude API Integration for Outfit Generation
 *
 * Uses Claude to intelligently select product combinations from ingredient sets.
 */
import type { OutfitRecipe, CustomerSignals, OutfitItem } from './types';
/**
 * Generate outfit combinations using Claude
 */
export declare function generateOutfits(recipe: OutfitRecipe, signals: CustomerSignals, maxOutfits?: number): Promise<Array<{
    items: OutfitItem[];
    reasoning: string;
}>>;
//# sourceMappingURL=claude-api.d.ts.map