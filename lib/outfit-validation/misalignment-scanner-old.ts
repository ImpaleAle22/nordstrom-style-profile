/**
 * Misalignment Scanner
 *
 * Scans all outfits for products that are severely misaligned with their roles.
 * Examples:
 * - Swim shorts in bottoms role (expecting pants/trousers)
 * - Lipstick in tops role
 * - Sneakers in bags role
 *
 * Uses embedded product metadata (productType2/3) to detect mismatches.
 */

import type { StoredOutfit } from '../outfit-storage';

// Role → Valid ProductType2 mappings
// Based on actual taxonomy in products-MASTER-SOURCE-OF-TRUTH.json
const VALID_PRODUCT_TYPES_BY_ROLE: Record<string, string[]> = {
  // Clothing roles
  'tops': [
    'T-Shirts',
    'T-Shirts/Tanks',
    'T-Shirts & Tanks',
    'Tank Tops',
    'Shirts',
    'Blouses',
    'Blouses/Shirts',
    'Polo Shirts',
    'Sweaters',
    'Hoodies',
    'Sweatshirts/Hoodies',
    'Bodysuits',
    'Vests',
    'Cardigans', // Can be layering tops
    'Tops', // Generic
  ],
  'bottoms': [
    'Pants',
    'Shorts',
    'Skirts',
    'Leggings',
    'Skorts',
    'Outdoor Pants',
    'Bottoms', // Generic
  ],
  'one-piece': [
    'Dress',
    'Jumpsuits',
    'Overalls',
    'Gown',
    'One-Piece',
  ],
  'outerwear': [
    'Jackets',
    'Coats',
    'Blazer',
    'Blazers',
    'Vests',
    'Cardigans',
    'Ponchos',
    'Wraps',
    'Outerwear', // Generic
  ],
  'shoes': [
    'Sneakers',
    'Boots',
    'Sandals',
    'Heels',
    'Flats',
    'Loafers',
    'Slippers',
    'Mules',
    'Slip-Ons',
    'Oxfords',
    'Wedges',
    'Shoes', // Generic
  ],
  'bags': [
    'Bags',
    'Backpacks',
    'Wallets',
  ],
  'accessories': [
    'Accessories',
    'Bags', // Bags can be accessories
    'Backpacks', // Can be accessories
    'Belts',
    'Scarves',
    'Hats',
    'Sunglasses',
    'Eyewear',
    'Jewelry',
    'Watches',
    'Hair Accessories',
    'Gloves',
    'Socks',
    'Ties',
    'Tights',
    'Bracelets',
    'Necklaces',
    'Earrings',
    'Rings',
    'Umbrellas',
  ],
  'hats': [
    'Hats',
  ],
};

// ProductType2 values that should NEVER appear in clothing roles
const ALWAYS_INVALID_TYPES = [
  'Makeup',
  'Skincare',
  'Fragrance',
  'Home Decor',
  'Bedding',
  'Bath',
  'Kitchen',
  'Electronics',
];

export interface MisalignmentIssue {
  severity: 'critical' | 'high' | 'medium';
  type: 'wrong-category' | 'wrong-type' | 'missing-type' | 'swimwear-in-bottoms';
  role: string;
  expectedTypes: string[];
  actualType: string;
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
 * Check if a product type is valid for a given role
 */
function isValidProductTypeForRole(role: string, productType2?: string): boolean {
  if (!productType2) return true; // Can't validate without type info

  const validTypes = VALID_PRODUCT_TYPES_BY_ROLE[role];
  if (!validTypes) return true; // Unknown role, can't validate

  return validTypes.includes(productType2);
}

/**
 * Check if a product type should never appear in outfits
 */
function isAlwaysInvalidType(productType2?: string): boolean {
  if (!productType2) return false;
  return ALWAYS_INVALID_TYPES.includes(productType2);
}

/**
 * Scan a single outfit for misalignment issues
 */
export function scanOutfitForMisalignment(outfit: StoredOutfit): MisalignmentReport {
  const issues: MisalignmentIssue[] = [];

  for (const item of outfit.items) {
    const { role, product } = item;
    const productType2 = product.productType2;

    // Issue 1: Always-invalid types (makeup, home goods, etc.)
    if (isAlwaysInvalidType(productType2)) {
      issues.push({
        severity: 'critical',
        type: 'wrong-category',
        role,
        expectedTypes: VALID_PRODUCT_TYPES_BY_ROLE[role] || [],
        actualType: productType2 || 'unknown',
        productId: product.id,
        productTitle: product.title,
        explanation: `${productType2} should never appear in outfits`,
      });
      continue;
    }

    // Issue 2: Swimwear in bottoms role (specific case user reported)
    if (role === 'bottoms' && productType2?.toLowerCase().includes('swim')) {
      issues.push({
        severity: 'critical',
        type: 'swimwear-in-bottoms',
        role,
        expectedTypes: ['Pants', 'Jeans', 'Shorts', 'Skirts', 'Leggings'],
        actualType: productType2,
        productId: product.id,
        productTitle: product.title,
        explanation: `Swimwear should not appear in bottoms role for regular outfits`,
      });
      continue;
    }

    // Issue 3: Wrong product type for role
    if (!isValidProductTypeForRole(role, productType2)) {
      const validTypes = VALID_PRODUCT_TYPES_BY_ROLE[role] || [];
      issues.push({
        severity: 'high',
        type: 'wrong-type',
        role,
        expectedTypes: validTypes,
        actualType: productType2 || 'unknown',
        productId: product.id,
        productTitle: product.title,
        explanation: `Expected one of [${validTypes.join(', ')}] but got ${productType2}`,
      });
    }

    // Issue 4: Missing productType2 (can't validate)
    if (!productType2 && role !== 'accessories') {
      issues.push({
        severity: 'medium',
        type: 'missing-type',
        role,
        expectedTypes: VALID_PRODUCT_TYPES_BY_ROLE[role] || [],
        actualType: 'unknown',
        productId: product.id,
        productTitle: product.title,
        explanation: `Product missing productType2 - cannot validate alignment`,
      });
    }
  }

  // Determine overall severity
  let overallSeverity: 'critical' | 'high' | 'medium' | 'clean' = 'clean';
  if (issues.some(i => i.severity === 'critical')) {
    overallSeverity = 'critical';
  } else if (issues.some(i => i.severity === 'high')) {
    overallSeverity = 'high';
  } else if (issues.some(i => i.severity === 'medium')) {
    overallSeverity = 'medium';
  }

  // Recommend deletion for critical issues
  const shouldDelete = overallSeverity === 'critical';

  return {
    outfitId: outfit.outfitId,
    recipeTitle: outfit.recipeTitle,
    generatedAt: outfit.generatedAt,
    issues,
    severity: overallSeverity,
    shouldDelete,
  };
}

/**
 * Scan all outfits for misalignment issues
 * Processes in batches to avoid blocking UI thread
 */
export async function scanAllOutfitsForMisalignment(
  outfits: StoredOutfit[],
  options?: {
    onProgress?: (current: number, total: number) => void;
    batchSize?: number;
  }
): Promise<{
  total: number;
  clean: number;
  withIssues: number;
  critical: number;
  high: number;
  medium: number;
  reports: MisalignmentReport[];
}> {
  const { onProgress, batchSize = 100 } = options || {};
  const reports: MisalignmentReport[] = [];

  // Process in batches to avoid blocking UI thread
  for (let i = 0; i < outfits.length; i += batchSize) {
    const batch = outfits.slice(i, i + batchSize);

    // Process batch synchronously (fast - no API calls)
    const batchReports = batch.map(scanOutfitForMisalignment);
    reports.push(...batchReports);

    // Update progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, outfits.length), outfits.length);
    }

    // Yield to UI thread between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const stats = {
    total: reports.length,
    clean: reports.filter(r => r.severity === 'clean').length,
    withIssues: reports.filter(r => r.severity !== 'clean').length,
    critical: reports.filter(r => r.severity === 'critical').length,
    high: reports.filter(r => r.severity === 'high').length,
    medium: reports.filter(r => r.severity === 'medium').length,
    reports: reports.filter(r => r.severity !== 'clean'), // Only return problematic outfits
  };

  return stats;
}

/**
 * Get outfits recommended for deletion (critical issues only)
 */
export function getOutfitsToDelete(reports: MisalignmentReport[]): string[] {
  return reports
    .filter(r => r.shouldDelete)
    .map(r => r.outfitId);
}

/**
 * Generate human-readable report
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
    lines.push(`     Expected: ${issue.expectedTypes.join(', ')}`);
    lines.push(`     Actual: ${issue.actualType}`);
    lines.push(`     Reason: ${issue.explanation}`);
    lines.push('');
  });

  return lines.join('\n');
}
