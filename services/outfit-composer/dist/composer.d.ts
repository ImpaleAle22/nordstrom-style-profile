/**
 * Main Outfit Composer API
 *
 * Orchestrates the complete outfit composition pipeline:
 * 1. Fetch recipe from Sanity
 * 2. Generate combinations with Claude
 * 3. Validate hard rules
 * 4. Score soft rules
 * 5. Filter by confidence threshold
 * 6. Return ranked outfits
 */
import type { ComposeRequest, ComposeResponse } from './types';
/**
 * Main compose function
 */
export declare function composeOutfits(request: ComposeRequest): Promise<ComposeResponse>;
//# sourceMappingURL=composer.d.ts.map