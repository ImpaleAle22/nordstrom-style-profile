/**
 * Outfit Composer Service - Main Entry Point
 *
 * Exports all public APIs for external consumption.
 */
export * from './types';
export * from './composer';
export * from './scoring';
export { fetchOutfitRecipe, saveComposedOutfit } from './sanity-client';
export { generateOutfits } from './claude-api';
//# sourceMappingURL=index.d.ts.map