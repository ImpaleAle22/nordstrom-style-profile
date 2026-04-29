/**
 * Sanity Client for Outfit Composer
 *
 * Fetches recipes, ingredient sets, and products from Sanity CMS.
 */
import type { OutfitRecipe } from './types';
declare const client: import("@sanity/client").SanityClient;
/**
 * Fetch outfit recipe by ID with full ingredient sets and products
 */
export declare function fetchOutfitRecipe(recipeId: string): Promise<OutfitRecipe | null>;
/**
 * Fetch all outfit recipes (for batch processing)
 */
export declare function fetchAllRecipes(): Promise<OutfitRecipe[]>;
/**
 * Save composed outfit back to recipe (adds to sampleOutfits array)
 */
export declare function saveComposedOutfit(recipeId: string, outfitId: string, items: Array<{
    role: string;
    productId: string;
}>, confidenceScore: number, aiReasoning?: string): Promise<void>;
export default client;
//# sourceMappingURL=sanity-client.d.ts.map