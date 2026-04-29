/**
 * Smart Casual Pattern Definitions
 * Config-driven approach for recognizing valid formality mixing
 */

import type { OutfitCombination, ClipProduct } from './types';
import patternConfig from './formality-patterns.json';

/**
 * Pattern rule for a specific role
 */
export interface PatternRule {
  required?: boolean;           // Must have this role
  minFormality?: number;        // Minimum formality level (1-6)
  maxFormality?: number;        // Maximum formality level (1-6)
  keywords?: string[];          // Keywords that must appear in title
  productTypes?: string[];      // Product types that match
}

/**
 * Complete pattern definition
 */
export interface SmartCasualPattern {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: {
    [role: string]: PatternRule;  // e.g., "bottoms", "tops", "shoes", "anyItem"
  };
}

/**
 * Load enabled patterns from config
 */
export function getEnabledPatterns(): SmartCasualPattern[] {
  return (patternConfig.patterns as SmartCasualPattern[])
    .filter(p => p.enabled);
}

/**
 * Check if an item matches a pattern rule
 */
function itemMatchesRule(product: ClipProduct, rule: PatternRule, formality: number): boolean {
  // Check formality range
  if (rule.minFormality !== undefined && formality < rule.minFormality) {
    return false;
  }
  if (rule.maxFormality !== undefined && formality > rule.maxFormality) {
    return false;
  }

  // Check keywords
  if (rule.keywords && rule.keywords.length > 0) {
    const title = product.title.toLowerCase();
    const type2 = product.productType2?.toLowerCase() || '';

    const hasKeyword = rule.keywords.some(keyword =>
      title.includes(keyword.toLowerCase()) || type2.includes(keyword.toLowerCase())
    );

    if (!hasKeyword) {
      return false;
    }
  }

  // Check product types
  if (rule.productTypes && rule.productTypes.length > 0) {
    const type2 = product.productType2?.toLowerCase() || '';
    const hasType = rule.productTypes.some(type =>
      type2.includes(type.toLowerCase())
    );

    if (!hasType) {
      return false;
    }
  }

  return true;
}

/**
 * Check if outfit matches a specific pattern
 */
export function outfitMatchesPattern(
  outfit: OutfitCombination,
  pattern: SmartCasualPattern,
  inferFormality: (product: ClipProduct) => number
): boolean {
  const rules = pattern.rules;

  // Check each rule
  for (const [ruleRole, rule] of Object.entries(rules)) {
    // Handle "anyItem" rules - must match at least one item in the outfit
    if (ruleRole === 'anyItem' || ruleRole === 'anyItem2') {
      const hasMatch = outfit.items.some(item => {
        const formality = inferFormality(item.product);
        return itemMatchesRule(item.product, rule, formality);
      });

      if (!hasMatch) {
        return false; // Required anyItem not found
      }
      continue;
    }

    // Handle specific role rules
    const matchingItems = outfit.items.filter(item => item.role === ruleRole);

    // Check if required
    if (rule.required && matchingItems.length === 0) {
      return false; // Required role missing
    }

    // If rule has constraints, at least one matching item must satisfy them
    if (matchingItems.length > 0) {
      const hasMatch = matchingItems.some(item => {
        const formality = inferFormality(item.product);
        return itemMatchesRule(item.product, rule, formality);
      });

      if (!hasMatch) {
        return false; // No items in this role match the rule
      }
    }
  }

  return true; // All rules satisfied
}

/**
 * Check if outfit matches any enabled pattern
 */
export function matchesAnyPattern(
  outfit: OutfitCombination,
  inferFormality: (product: ClipProduct) => number
): { matches: boolean; pattern?: SmartCasualPattern } {
  const patterns = getEnabledPatterns();

  for (const pattern of patterns) {
    if (outfitMatchesPattern(outfit, pattern, inferFormality)) {
      return { matches: true, pattern };
    }
  }

  return { matches: false };
}
