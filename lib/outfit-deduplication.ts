/**
 * Outfit Deduplication Utility
 * Finds and removes duplicate outfits (same products, different IDs)
 */

import { getAllOutfits, type StoredOutfit } from './outfit-storage';
import * as IDB from './indexeddb-storage';

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
    .map((item) => item.product.id)
    .sort()
    .join('|');

  return productIds;
}

/**
 * Find duplicate outfits
 */
export async function findDuplicateOutfits(): Promise<DeduplicationReport> {
  const outfits = await getAllOutfits();

  // Group outfits by signature
  const signatureMap = new Map<string, StoredOutfit[]>();

  for (const outfit of outfits) {
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

  return {
    totalOutfits: outfits.length,
    uniqueOutfits: outfits.length - totalDuplicates,
    duplicateGroups,
    totalDuplicates,
  };
}

/**
 * Remove duplicate outfits (keeps earliest generated outfit in each group)
 */
export async function removeDuplicateOutfits(): Promise<{ removed: number; kept: number }> {
  const report = await findDuplicateOutfits();

  if (report.totalDuplicates === 0) {
    console.log('✓ No duplicate outfits found');
    return { removed: 0, kept: report.totalOutfits };
  }

  console.log(`🔍 Found ${report.totalDuplicates} duplicate outfits in ${report.duplicateGroups.length} groups`);

  let removed = 0;

  for (const group of report.duplicateGroups) {
    console.log(`  Removing ${group.duplicateIds.length} duplicates, keeping ${group.keepOutfitId}`);

    for (const duplicateId of group.duplicateIds) {
      try {
        await IDB.deleteOutfit(duplicateId);
        removed++;
      } catch (error) {
        console.error(`Failed to delete outfit ${duplicateId}:`, error);
      }
    }
  }

  console.log(`✓ Removed ${removed} duplicate outfits`);
  return { removed, kept: report.totalOutfits - removed };
}

/**
 * Find duplicates for a specific recipe
 */
export async function findDuplicatesForRecipe(recipeId: string): Promise<DeduplicationReport> {
  const allOutfits = await getAllOutfits();
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
