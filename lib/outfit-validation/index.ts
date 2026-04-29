/**
 * Outfit Validation Module
 *
 * Tools for maintaining outfit data quality:
 * - Misalignment scanner: Detect products that don't match their roles
 * - Product hydration: Refresh outfit product data from master source
 */

export {
  scanOutfitForMisalignment,
  scanAllOutfitsForMisalignment,
  getOutfitsToDelete,
  formatMisalignmentReport,
  type MisalignmentIssue,
  type MisalignmentReport,
} from './misalignment-scanner';

export {
  hydrateOutfit,
  hydrateOutfitsBatch,
  formatHydrationStats,
  needsHydration,
  type HydrationResult,
  type HydrationStats,
} from './product-hydration';
