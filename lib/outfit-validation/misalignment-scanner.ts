/**
 * Misalignment Scanner V2
 *
 * Simplified scanner that checks productType1 (main category) instead of productType2 (subcategories).
 * Focuses on MAJOR misalignments only:
 * - Shoes in tops role
 * - Makeup in clothing roles
 * - Swimwear in non-swimwear outfits
 *
 * Much fewer false positives than the subcategory-based scanner.
 */

import type { StoredOutfit } from '../outfit-storage';

// Role → Valid ProductType1 mappings (main categories only)
// Based on actual values in products-MASTER-SOURCE-OF-TRUTH.json
const VALID_PRODUCT_TYPE1_BY_ROLE: Record<string, string[]> = {
  'tops': ['Tops', 'Outerwear'], // Outerwear can layer as tops
  'bottoms': ['Bottoms'],
  'one-piece': ['Dresses', 'Jumpsuits/Coveralls'],
  'outerwear': ['Outerwear', 'Scarves/Wraps/Ponchos'], // Wraps can be outerwear
  'shoes': ['Shoes'],
  'bags': ['Bags', 'Accessories'], // Bags can be accessories
  'accessories': ['Accessories', 'Bags', 'Jewelry', 'Neckwear', 'Scarves/Wraps/Ponchos'], // Flexible
  'hats': ['Accessories'],
};

// ProductType1 values that should NEVER appear in ANY outfit role
const ALWAYS_INVALID_TYPE1 = [
  'Beauty_and_personal_care',
  'Clothing mist',
  'Home',
  'Dog Wear',
  'Dog wear',
  'Giftbox',
  'Marker pen',
  'Mobile case',
  'Side table',
  'Sewing kit',
  'Stain remover spray',
  'Washing bag',
  'Waterbottle',
  'Wireless earphone case',
  'Wood balls',
  'Zipper head',
  'Recreation',
];

// ProductType2 values that indicate swimwear
const SWIMWEAR_TYPE2 = [
  'Bikini',
  'Swim Bottoms',
  'Swim Sets',
  'Swimwear',
  'Cover-Ups',
];

export interface MisalignmentIssue {
  severity: 'critical' | 'high' | 'medium';
  type: 'wrong-category' | 'always-invalid' | 'swimwear';
  role: string;
  expectedCategories: string[];
  actualCategory: string;
  actualType2?: string;
  productId: string;
  productTitle: string;
  explanation: string;
}

export interface MisalignmentReport {
  outfitId: string;
  recipeTitle: string;
  generatedAt: string;
  issues: MisalignmentIssue[];
  severity: 'critical' | 'high' | 'medium' | 'clean';
  shouldDelete: boolean;
}

/**
 * Check if product is valid for role (using productType1)
 */
function isValidForRole(
  role: string,
  productType1?: string,
  productType2?: string
): MisalignmentIssue | null {
  // Check for always-invalid categories
  if (productType1 && ALWAYS_INVALID_TYPE1.includes(productType1)) {
    return {
      severity: 'critical',
      type: 'always-invalid',
      role,
      expectedCategories: ['Apparel', 'Accessories'],
      actualCategory: productType1,
      actualType2: productType2,
      productId: '',
      productTitle: '',
      explanation: `${productType1} products should never be in outfits`,
    };
  }

  // Check for swimwear in non-swimwear roles
  if (productType2 && SWIMWEAR_TYPE2.includes(productType2)) {
    if (role !== 'swimwear' && role !== 'one-piece') {
      return {
        severity: 'high',
        type: 'swimwear',
        role,
        expectedCategories: ['Regular apparel'],
        actualCategory: productType1 || 'Unknown',
        actualType2: productType2,
        productId: '',
        productTitle: '',
        explanation: `Swimwear (${productType2}) should not be in ${role} role`,
      };
    }
  }

  // Check main category alignment
  if (!productType1) return null; // Can't validate without category

  const validCategories = VALID_PRODUCT_TYPE1_BY_ROLE[role];
  if (!validCategories) return null; // Unknown role

  if (!validCategories.includes(productType1)) {
    return {
      severity: 'high',
      type: 'wrong-category',
      role,
      expectedCategories: validCategories,
      actualCategory: productType1,
      actualType2: productType2,
      productId: '',
      productTitle: '',
      explanation: `${productType1} should not be in ${role} role`,
    };
  }

  return null;
}

/**
 * Scan outfits for misalignment issues
 */
export async function scanForMisalignment(
  outfits: StoredOutfit[],
  options: {
    onProgress?: (current: number, total: number) => void;
    batchSize?: number;
  } = {}
): Promise<{
  reports: MisalignmentReport[];
  summary: {
    totalOutfits: number;
    cleanOutfits: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
  };
}> {
  const { onProgress, batchSize = 100 } = options;

  const reports: MisalignmentReport[] = [];
  let cleanCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;

  console.log(`🔍 Scanning ${outfits.length} outfits for misalignment...`);

  for (let i = 0; i < outfits.length; i += batchSize) {
    const batch = outfits.slice(i, i + batchSize);

    for (const outfit of batch) {
      const issues: MisalignmentIssue[] = [];

      // Check each item in outfit
      for (const item of outfit.items) {
        const issue = isValidForRole(
          item.role,
          item.product.productType1,
          item.product.productType2
        );

        if (issue) {
          issue.productId = item.product.id;
          issue.productTitle = item.product.title;
          issues.push(issue);
        }
      }

      // Determine overall severity
      let severity: 'critical' | 'high' | 'medium' | 'clean' = 'clean';
      let shouldDelete = false;

      if (issues.some(i => i.severity === 'critical')) {
        severity = 'critical';
        shouldDelete = true;
        criticalCount++;
      } else if (issues.some(i => i.severity === 'high')) {
        severity = 'high';
        highCount++;
      } else if (issues.some(i => i.severity === 'medium')) {
        severity = 'medium';
        mediumCount++;
      } else {
        cleanCount++;
      }

      if (issues.length > 0 || severity !== 'clean') {
        reports.push({
          outfitId: outfit.outfitId,
          recipeTitle: outfit.recipeTitle || 'Untitled',
          generatedAt: outfit.generatedAt,
          issues,
          severity,
          shouldDelete,
        });
      }
    }

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, outfits.length), outfits.length);
    }

    // Yield to UI thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  console.log(`✅ Scan complete!`);
  console.log(`   Clean: ${cleanCount}`);
  console.log(`   Issues: ${reports.length} (${criticalCount} critical, ${highCount} high, ${mediumCount} medium)`);

  return {
    reports,
    summary: {
      totalOutfits: outfits.length,
      cleanOutfits: cleanCount,
      criticalIssues: criticalCount,
      highIssues: highCount,
      mediumIssues: mediumCount,
    },
  };
}

/**
 * Count missing product types
 */
export async function countMissingTypes(outfits: StoredOutfit[]): Promise<{
  missingType1: number;
  missingType2: number;
}> {
  let missingType1 = 0;
  let missingType2 = 0;

  outfits.forEach(outfit => {
    outfit.items.forEach(item => {
      if (!item.product.productType1) missingType1++;
      if (!item.product.productType2) missingType2++;
    });
  });

  return { missingType1, missingType2 };
}

/**
 * Get outfit IDs that should be deleted (critical issues only)
 */
export function getOutfitsToDelete(reports: MisalignmentReport[]): string[] {
  return reports
    .filter(report => report.shouldDelete)
    .map(report => report.outfitId);
}

/**
 * Format misalignment report for display
 */
export function formatMisalignmentReport(report: MisalignmentReport): string {
  const lines: string[] = [];

  lines.push(`Outfit: ${report.recipeTitle}`);
  lines.push(`ID: ${report.outfitId}`);
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`);
  lines.push(`Severity: ${report.severity.toUpperCase()}`);
  lines.push(`Recommendation: ${report.shouldDelete ? '❌ DELETE' : '⚠️  REVIEW'}`);
  lines.push('');
  lines.push('Issues:');

  report.issues.forEach((issue, idx) => {
    lines.push(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`);
    lines.push(`     Role: ${issue.role}`);
    lines.push(`     Product: ${issue.productTitle} (${issue.productId})`);
    lines.push(`     Expected: ${issue.expectedCategories.join(', ')}`);
    lines.push(`     Actual: ${issue.actualCategory}${issue.actualType2 ? ` (${issue.actualType2})` : ''}`);
    lines.push(`     Reason: ${issue.explanation}`);
    lines.push('');
  });

  return lines.join('\n');
}

// Backwards compatibility - old function name
export const scanAllOutfitsForMisalignment = scanForMisalignment;
