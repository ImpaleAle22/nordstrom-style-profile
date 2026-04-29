/**
 * Hard Rules Violation Tracking System
 * Collects and analyzes structural recipe failures for post-bulk-cook cleanup
 */

import type { OutfitCombination } from './types';
import type { UnifiedRecipe } from '../unified-recipe-types';

/**
 * Hard rule violation types
 */
export type ViolationType =
  | 'missing-footwear'
  | 'insufficient-slots'
  | 'excessive-slots'
  | 'missing-coverage'
  | 'invalid-coverage-mix'
  | 'tops-without-bottoms'
  | 'bottoms-without-tops'
  | 'one-piece-with-tops'
  | 'role-exceeds-max'
  | 'duplicate-product'
  | 'duplicate-accessory-type'
  | 'unknown-violation';

/**
 * Single violation record
 */
export interface HardRuleViolation {
  violationType: ViolationType;
  rule: string;           // Human-readable rule description
  details: string;        // Specific details about this violation
  affectedSlots?: string[]; // Which slots are problematic
  fixSuggestion: string;  // Actionable fix suggestion
}

/**
 * Recipe-level violation summary
 */
export interface RecipeViolationReport {
  recipeId: string;
  recipeTitle: string;
  department: string;
  slotCount: number;
  totalGenerated: number;
  totalFailed: number;

  // Violation breakdown
  violations: HardRuleViolation[];
  mostCommonViolation: ViolationType;

  // Quick fix hints
  fixPriority: 'critical' | 'high' | 'medium';
  quickFix?: string; // If there's an obvious single fix
}

/**
 * Bulk cook violation summary
 */
export interface BulkViolationSummary {
  totalRecipesFailed: number;
  totalViolations: number;

  // Violations grouped by type
  violationsByType: Map<ViolationType, {
    count: number;
    recipes: string[]; // Recipe titles
    fixSuggestion: string;
  }>;

  // Recipes grouped by fix complexity
  criticalFixes: RecipeViolationReport[]; // Single obvious fix
  complexFixes: RecipeViolationReport[];  // Multiple issues
}

/**
 * Parse validation error messages into structured violations
 */
export function parseValidationError(errorMessage: string): HardRuleViolation | null {
  // Pattern matching for each rule type

  // Rule 1.1: Slot count
  if (errorMessage.includes('require at least 4 slots')) {
    const match = errorMessage.match(/You have (\d+)/);
    const currentCount = match ? match[1] : 'unknown';

    // Note: This might be a generation issue (Gemini not selecting from all ingredient pools)
    // rather than a recipe structure issue. Check the recipe structure first.
    return {
      violationType: 'insufficient-slots',
      rule: 'Rule 1.1: Minimum 4 slots required',
      details: `Generated outfits have only ${currentCount} items (need 4-6)`,
      fixSuggestion: `Check recipe structure: Does it have ${currentCount} or fewer ingredient slots? If it has MORE slots but generated outfits have fewer items, this is a generation issue - try re-cooking. Otherwise, add ${4 - parseInt(currentCount)} more ingredient slots.`,
      fixPriority: 'high' as const,
    };
  }

  if (errorMessage.includes('allow at most 6 slots')) {
    const match = errorMessage.match(/You have (\d+)/);
    const currentCount = match ? match[1] : 'unknown';
    return {
      violationType: 'excessive-slots',
      rule: 'Rule 1.1: Maximum 6 slots allowed',
      details: `Recipe has ${currentCount} slots (max 6)`,
      fixSuggestion: `Remove ${parseInt(currentCount) - 6} slot(s). Consolidate or remove less essential accessories.`,
      fixPriority: 'high' as const,
    };
  }

  // Rule 1.2: Footwear
  if (errorMessage.includes('footwear slot') && errorMessage.includes('required')) {
    return {
      violationType: 'missing-footwear',
      rule: 'Rule 1.2: Footwear required',
      details: 'No shoes slot found',
      affectedSlots: ['shoes'],
      fixSuggestion: 'Add a shoes slot. Every outfit needs footwear.',
      fixPriority: 'critical' as const,
    };
  }

  // Rule 1.3: Coverage - one-piece + tops
  if (errorMessage.includes('one-piece slot cannot coexist with a tops slot')) {
    return {
      violationType: 'one-piece-with-tops',
      rule: 'Rule 1.3: One-piece + tops invalid',
      details: 'Cannot wear a shirt under a dress',
      affectedSlots: ['one-piece', 'tops'],
      fixSuggestion: 'Remove the tops slot OR replace one-piece with tops + bottoms.',
      fixPriority: 'critical' as const,
    };
  }

  // Rule 1.3: Coverage - missing garments
  if (errorMessage.includes('must include garment coverage')) {
    return {
      violationType: 'missing-coverage',
      rule: 'Rule 1.3: Garment coverage required',
      details: 'No tops, bottoms, or one-piece found',
      fixSuggestion: 'Add either (tops + bottoms) OR a one-piece slot (dress/jumpsuit).',
      fixPriority: 'critical' as const,
    };
  }

  // Rule 1.3: Coverage - tops without bottoms
  if (errorMessage.includes('tops slot requires a matching bottoms slot')) {
    return {
      violationType: 'tops-without-bottoms',
      rule: 'Rule 1.3: Tops need matching bottoms',
      details: 'Has tops but no bottoms',
      affectedSlots: ['bottoms'],
      fixSuggestion: 'Add a bottoms slot (pants, skirt, shorts) OR replace tops with a one-piece.',
      fixPriority: 'critical' as const,
    };
  }

  // Rule 1.3: Coverage - bottoms without tops
  if (errorMessage.includes('bottoms slot requires a matching tops slot')) {
    return {
      violationType: 'bottoms-without-tops',
      rule: 'Rule 1.3: Bottoms need matching tops',
      details: 'Has bottoms but no tops',
      affectedSlots: ['tops'],
      fixSuggestion: 'Add a tops slot (shirt, blouse, sweater) OR replace bottoms with a one-piece.',
      fixPriority: 'critical' as const,
    };
  }

  // Rule 1.4: Role max exceeded
  if (errorMessage.includes('appears more than') || errorMessage.includes('Only one')) {
    return {
      violationType: 'role-exceeds-max',
      rule: 'Rule 1.4: Role max occurrences exceeded',
      details: errorMessage,
      fixSuggestion: 'Remove duplicate slots of the same role. Check role constraints.',
      fixPriority: 'high' as const,
    };
  }

  // Rule 1.6: Duplicate products
  if (errorMessage.includes('Duplicate product detected')) {
    const match = errorMessage.match(/"([^"]+)"/);
    const productName = match ? match[1] : 'unknown';
    return {
      violationType: 'duplicate-product',
      rule: 'Rule 1.6: No duplicate products',
      details: `Same product used twice: ${productName}`,
      fixSuggestion: 'This is a generation issue. The AI selected the same product for multiple slots. Re-cook the recipe.',
      fixPriority: 'medium' as const,
    };
  }

  // Rule 1.7: Duplicate accessory types
  if (errorMessage.includes('Duplicate accessory type')) {
    const match = errorMessage.match(/"([^"]+)"/);
    const accessoryType = match ? match[1] : 'unknown';
    return {
      violationType: 'duplicate-accessory-type',
      rule: 'Rule 1.7: Accessory diversification',
      details: `Multiple ${accessoryType} items`,
      fixSuggestion: 'This is a generation issue. Re-cook or adjust ingredient queries to provide diverse accessory options.',
      fixPriority: 'medium' as const,
    };
  }

  return null;
}

/**
 * Analyze hard rule failures from pipeline results
 */
export function analyzeHardRuleFailures(
  recipe: UnifiedRecipe,
  pipelineResults: Array<{
    station: string;
    passed: number;
    filtered: number;
    examples: string[];
  }>,
  stats: {
    totalGenerated: number;
    totalScored: number;
  }
): RecipeViolationReport | null {
  const hardRulesStation = pipelineResults.find(s => s.station === 'Hard Rules Validation');

  if (!hardRulesStation || hardRulesStation.filtered === 0) {
    return null; // No hard rule violations
  }

  // Parse violations from examples and deduplicate by type
  const violationsByType = new Map<ViolationType, HardRuleViolation>();
  const violationCounts = new Map<ViolationType, number>();

  hardRulesStation.examples.forEach(example => {
    // Extract error message (format: "Outfit N: error message")
    const errorMatch = example.match(/Outfit \d+: (.+)/);
    if (errorMatch) {
      const errorMessage = errorMatch[1];
      const violation = parseValidationError(errorMessage);

      if (violation) {
        // Count occurrences
        violationCounts.set(
          violation.violationType,
          (violationCounts.get(violation.violationType) || 0) + 1
        );

        // Keep only one instance per type (deduplicate)
        if (!violationsByType.has(violation.violationType)) {
          violationsByType.set(violation.violationType, violation);
        }
      } else {
        // Unknown violation - create a catch-all entry
        const unknownType: ViolationType = 'unknown-violation';

        violationCounts.set(
          unknownType,
          (violationCounts.get(unknownType) || 0) + 1
        );

        if (!violationsByType.has(unknownType)) {
          violationsByType.set(unknownType, {
            violationType: unknownType,
            rule: 'Unknown Validation Error',
            details: `Unrecognized error pattern: "${errorMessage}"`,
            fixSuggestion: 'This error pattern is not yet recognized by the diagnostics system. Check the raw error message and update hard-rules-diagnostics.ts to parse it.',
            fixPriority: 'high' as const,
          });
        }
      }
    }
  });

  // Convert map to array (deduplicated violations) and add occurrence counts
  const violations = Array.from(violationsByType.values()).map(violation => {
    const count = violationCounts.get(violation.violationType) || 1;
    if (count > 1) {
      // Add count to details if it occurred multiple times
      return {
        ...violation,
        details: `${violation.details} (${count} outfits affected)`,
      };
    }
    return violation;
  });

  // Find most common violation
  let mostCommonViolation: ViolationType = 'missing-footwear';
  let maxCount = 0;
  violationCounts.forEach((count, type) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonViolation = type;
    }
  });

  // Determine fix priority
  const hasCriticalViolations = violations.some(v => v.fixPriority === 'critical');
  const fixPriority: 'critical' | 'high' | 'medium' =
    hasCriticalViolations ? 'critical' :
    violations.length > 2 ? 'high' : 'medium';

  // Generate quick fix if there's a single dominant issue
  let quickFix: string | undefined;
  if (violations.length === 1) {
    quickFix = violations[0].fixSuggestion;
  } else if (violations.length > 0 && maxCount >= hardRulesStation.filtered * 0.8) {
    // If 80%+ of failures are the same issue
    const dominantViolation = violations.find(v => v.violationType === mostCommonViolation);
    quickFix = dominantViolation?.fixSuggestion;
  }

  return {
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    department: recipe.department,
    slotCount: recipe.slots?.length || 0,
    totalGenerated: stats.totalGenerated,
    totalFailed: hardRulesStation.filtered,
    violations,
    mostCommonViolation,
    fixPriority,
    quickFix,
  };
}

/**
 * Generate bulk cook violation summary
 */
export function generateBulkViolationSummary(
  reports: RecipeViolationReport[]
): BulkViolationSummary {
  const violationsByType = new Map<ViolationType, {
    count: number;
    recipes: string[];
    fixSuggestion: string;
  }>();

  let totalViolations = 0;

  reports.forEach(report => {
    report.violations.forEach(violation => {
      totalViolations++;

      const existing = violationsByType.get(violation.violationType);
      if (existing) {
        existing.count++;
        if (!existing.recipes.includes(report.recipeTitle)) {
          existing.recipes.push(report.recipeTitle);
        }
      } else {
        violationsByType.set(violation.violationType, {
          count: 1,
          recipes: [report.recipeTitle],
          fixSuggestion: violation.fixSuggestion,
        });
      }
    });
  });

  // Separate critical vs complex fixes
  const criticalFixes = reports.filter(r => r.fixPriority === 'critical' && r.quickFix);
  const complexFixes = reports.filter(r => !r.quickFix || r.violations.length > 2);

  return {
    totalRecipesFailed: reports.length,
    totalViolations,
    violationsByType,
    criticalFixes,
    complexFixes,
  };
}

/**
 * Get violation type display name
 */
export function getViolationDisplayName(type: ViolationType): string {
  const names: Record<ViolationType, string> = {
    'missing-footwear': 'Missing Footwear',
    'insufficient-slots': 'Too Few Slots',
    'excessive-slots': 'Too Many Slots',
    'missing-coverage': 'Missing Coverage',
    'invalid-coverage-mix': 'Invalid Coverage Mix',
    'tops-without-bottoms': 'Tops Without Bottoms',
    'bottoms-without-tops': 'Bottoms Without Tops',
    'one-piece-with-tops': 'One-Piece + Tops',
    'role-exceeds-max': 'Role Limit Exceeded',
    'duplicate-product': 'Duplicate Product',
    'duplicate-accessory-type': 'Duplicate Accessory Type',
    'unknown-violation': '⚠️ Unknown Violation Pattern',
  };
  return names[type] || type;
}

/**
 * Get violation icon/severity
 */
export function getViolationSeverity(type: ViolationType): 'error' | 'warning' {
  const critical: ViolationType[] = [
    'missing-footwear',
    'insufficient-slots',
    'missing-coverage',
    'tops-without-bottoms',
    'bottoms-without-tops',
    'one-piece-with-tops',
    'unknown-violation',
  ];
  return critical.includes(type) ? 'error' : 'warning';
}
