/**
 * Outfit Deduplication Utility
 * Finds and removes duplicate outfits (same products, different IDs)
 */

import { getAllOutfits, type StoredOutfit, deleteOutfit, getOutfitCount } from './supabase-outfit-storage';

export interface DuplicateGroup {
  signature: string; // Unique product combination signature
  outfits: StoredOutfit[];
  keepOutfitId: string; // The outfit we'll keep (earliest timestamp)
  duplicateIds: string[]; // The outfits we'll delete
}

export interface DeduplicationReport {
  totalOutfits: number;
  uniqueOutfits: number;
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number;
}

/**
 * Generate a signature for an outfit based on its product IDs
 * Sorted to ensure same products = same signature regardless of order
 */
function getOutfitSignature(outfit: StoredOutfit): string {
  const productIds = outfit.items
    .filter((item) => item.product && item.product.id) // Skip items with missing products
    .map((item) => item.product.id)
    .sort()
    .join('|');

  return productIds;
}

/**
 * Find duplicate outfits
 * @param onProgress - Optional callback for progress updates (current, total, message)
 */
export async function findDuplicateOutfits(
  onProgress?: (current: number, total: number, message: string) => void
): Promise<DeduplicationReport> {
  // Get total count first
  const totalCount = await getOutfitCount();

  onProgress?.(0, totalCount, 'Starting scan...');
  console.log(`🔍 Scanning ${totalCount} outfits for duplicates...`);

  // Load ALL outfits in batches (Supabase default limit is 1000)
  const allOutfits: StoredOutfit[] = [];
  const batchSize = 1000;
  let offset = 0;
  let batchNum = 1;

  while (true) {
    onProgress?.(offset, totalCount, `Loading batch ${batchNum}...`);
    console.log(`Loading batch ${batchNum} (${offset}-${offset + batchSize})...`);

    const batch = await getAllOutfits({ offset, limit: batchSize });

    if (!batch || batch.length === 0) break;

    allOutfits.push(...batch);
    offset += batchSize;
    batchNum++;

    if (batch.length < batchSize) break; // Last batch
  }

  console.log(`✓ Loaded ${allOutfits.length} total outfits`);
  onProgress?.(allOutfits.length, totalCount, 'Analyzing for duplicates...');

  // Track outfits with missing products
  let missingProductCount = 0;

  // Group outfits by signature
  const signatureMap = new Map<string, StoredOutfit[]>();

  for (let i = 0; i < allOutfits.length; i++) {
    const outfit = allOutfits[i];

    // Check for missing products
    const missingProducts = outfit.items.filter(item => !item.product || !item.product.id);
    if (missingProducts.length > 0) {
      missingProductCount++;
      console.warn(`⚠️ Outfit ${outfit.outfitId} has ${missingProducts.length} missing product(s)`);
    }

    const signature = getOutfitSignature(outfit);

    // Skip outfits with no valid products
    if (signature === '') {
      console.warn(`⚠️ Skipping outfit ${outfit.outfitId} - all products missing`);
      continue;
    }

    if (!signatureMap.has(signature)) {
      signatureMap.set(signature, []);
    }
    signatureMap.get(signature)!.push(outfit);

    // Report progress every 1000 outfits
    if (i % 1000 === 0 && i > 0) {
      onProgress?.(i, allOutfits.length, `Analyzed ${i}/${allOutfits.length} outfits...`);
    }
  }

  if (missingProductCount > 0) {
    console.warn(`⚠️ Found ${missingProductCount} outfits with missing products (check console for details)`);
  }

  // Find groups with duplicates
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [signature, groupOutfits] of signatureMap.entries()) {
    if (groupOutfits.length > 1) {
      // Sort by generatedAt timestamp to keep the earliest one
      const sorted = groupOutfits.sort((a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
      );

      const keepOutfit = sorted[0];
      const duplicates = sorted.slice(1);

      duplicateGroups.push({
        signature,
        outfits: groupOutfits,
        keepOutfitId: keepOutfit.outfitId,
        duplicateIds: duplicates.map((d) => d.outfitId),
      });
    }
  }

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicateIds.length, 0);

  onProgress?.(allOutfits.length, totalCount, 'Scan complete!');
  console.log(`✓ Found ${totalDuplicates} duplicates in ${duplicateGroups.length} groups`);

  return {
    totalOutfits: allOutfits.length,
    uniqueOutfits: allOutfits.length - totalDuplicates,
    duplicateGroups,
    totalDuplicates,
  };
}

/**
 * Remove duplicate outfits (keeps earliest generated outfit in each group)
 * @param onProgress - Optional callback for progress updates
 */
export async function removeDuplicateOutfits(
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ removed: number; kept: number }> {
  const report = await findDuplicateOutfits(onProgress);

  if (report.totalDuplicates === 0) {
    console.log('✓ No duplicate outfits found');
    return { removed: 0, kept: report.totalOutfits };
  }

  console.log(`🔍 Found ${report.totalDuplicates} duplicate outfits in ${report.duplicateGroups.length} groups`);

  let removed = 0;
  const totalToRemove = report.totalDuplicates;

  for (const group of report.duplicateGroups) {
    console.log(`  Removing ${group.duplicateIds.length} duplicates, keeping ${group.keepOutfitId}`);

    for (const duplicateId of group.duplicateIds) {
      try {
        await deleteOutfit(duplicateId);
        removed++;
        onProgress?.(removed, totalToRemove, `Removing duplicates (${removed}/${totalToRemove})...`);
      } catch (error) {
        console.error(`Failed to delete outfit ${duplicateId}:`, error);
      }
    }
  }

  console.log(`✓ Removed ${removed} duplicate outfits`);
  onProgress?.(removed, totalToRemove, 'Cleanup complete!');
  return { removed, kept: report.totalOutfits - removed };
}

/**
 * Find duplicates for a specific recipe
 * @param onProgress - Optional callback for progress updates
 */
export async function findDuplicatesForRecipe(
  recipeId: string,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<DeduplicationReport> {
  // Get total count first
  const totalCount = await getOutfitCount();

  onProgress?.(0, totalCount, 'Loading all outfits...');

  // Load ALL outfits in batches
  const allOutfits: StoredOutfit[] = [];
  const batchSize = 1000;
  let offset = 0;
  let batchNum = 1;

  while (true) {
    onProgress?.(offset, totalCount, `Loading batch ${batchNum}...`);
    const batch = await getAllOutfits({ offset, limit: batchSize });
    if (!batch || batch.length === 0) break;
    allOutfits.push(...batch);
    offset += batchSize;
    batchNum++;
    if (batch.length < batchSize) break;
  }

  onProgress?.(allOutfits.length, totalCount, 'Filtering recipe outfits...');
  const recipeOutfits = allOutfits.filter((o) => o.recipeId === recipeId);

  // Group by signature
  const signatureMap = new Map<string, StoredOutfit[]>();

  for (const outfit of recipeOutfits) {
    const signature = getOutfitSignature(outfit);
    if (!signatureMap.has(signature)) {
      signatureMap.set(signature, []);
    }
    signatureMap.get(signature)!.push(outfit);
  }

  // Find groups with duplicates
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [signature, groupOutfits] of signatureMap.entries()) {
    if (groupOutfits.length > 1) {
      const sorted = groupOutfits.sort((a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
      );

      const keepOutfit = sorted[0];
      const duplicates = sorted.slice(1);

      duplicateGroups.push({
        signature,
        outfits: groupOutfits,
        keepOutfitId: keepOutfit.outfitId,
        duplicateIds: duplicates.map((d) => d.outfitId),
      });
    }
  }

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicateIds.length, 0);

  return {
    totalOutfits: recipeOutfits.length,
    uniqueOutfits: recipeOutfits.length - totalDuplicates,
    duplicateGroups,
    totalDuplicates,
  };
}

/**
 * Generate human-readable report
 */
export function generateDeduplicationReportText(report: DeduplicationReport): string {
  let text = '═══════════════════════════════════════════\n';
  text += '   OUTFIT DEDUPLICATION REPORT\n';
  text += '═══════════════════════════════════════════\n\n';

  text += `Total Outfits: ${report.totalOutfits}\n`;
  text += `Unique Outfits: ${report.uniqueOutfits}\n`;
  text += `Duplicate Outfits: ${report.totalDuplicates}\n`;
  text += `Duplicate Groups: ${report.duplicateGroups.length}\n\n`;

  if (report.totalDuplicates === 0) {
    text += '✓ No duplicate outfits found!\n';
    return text;
  }

  text += '═══════════════════════════════════════════\n';
  text += '   DUPLICATE GROUPS\n';
  text += '═══════════════════════════════════════════\n\n';

  for (const group of report.duplicateGroups) {
    const firstOutfit = group.outfits[0];
    text += `\n📋 ${firstOutfit.recipeTitle}\n`;
    text += `   Products: ${group.outfits[0].items.map((i) => i.product.title).join(', ')}\n`;
    text += `   Found: ${group.outfits.length} times\n`;
    text += `   Keep: ${group.keepOutfitId}\n`;
    text += `   Remove: ${group.duplicateIds.join(', ')}\n`;
    text += '   ───────────────────────────────────────\n';
  }

  return text;
}
