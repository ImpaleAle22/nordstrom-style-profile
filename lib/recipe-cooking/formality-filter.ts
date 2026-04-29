/**
 * Station 2.5: Formality Filter
 * Catches obvious formality mismatches before scoring
 *
 * Kitchen pipeline:
 * [Station 2: Combination Generation]
 *     ↓
 * [Station 2.5: Formality Check] ← YOU ARE HERE
 *     Remove outfits with formality mismatches
 *     ↓
 * [Station 3: Hard Rules Validation]
 */

import type { ClipProduct, OutfitCombination } from './types';
import { matchesAnyPattern } from './formality-patterns';
import { savePatternCandidate } from '../indexeddb-storage';
import type { PatternCandidate } from '../indexeddb-storage';

/**
 * Formality Levels (1-6)
 *
 * 1 = Athletic/Sporty
 * 2 = Casual
 * 3 = Smart Casual
 * 4 = Business
 * 5 = Cocktail/Semi-Formal
 * 6 = Formal/Evening
 */
export type FormalityLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Infer formality level from product metadata
 * Uses title, type, and contextual keywords
 */
export function inferFormality(product: ClipProduct): FormalityLevel {
  const title = product.title.toLowerCase();
  const type1 = product.productType1?.toLowerCase() || '';
  const type2 = product.productType2?.toLowerCase() || '';
  const brand = product.brand.toLowerCase();

  // === FORMAL/EVENING (6) ===
  // Ball gowns, evening wear, formal dresses
  if (
    title.includes('evening') ||
    title.includes('gown') ||
    title.includes('ball') ||
    title.includes('formal wear') ||
    title.includes('mac duggal') ||
    brand.includes('mac duggal') ||
    title.includes('prom') ||
    title.includes('pageant')
  ) {
    return 6;
  }

  // === COCKTAIL/SEMI-FORMAL (5) ===
  // Cocktail dresses, party dresses, dressy heels
  if (
    title.includes('cocktail') ||
    title.includes('party dress') ||
    title.includes('bodycon dress') ||
    (title.includes('satin') && type2.includes('dress')) ||
    (title.includes('sequin') && type2.includes('dress')) ||
    title.includes('stiletto')
  ) {
    return 5;
  }

  // === BUSINESS (4) ===
  // Suits, dress pants, pencil skirts, oxfords
  if (
    title.includes('suit') ||
    title.includes('dress pants') ||
    title.includes('pencil skirt') ||
    title.includes('oxford') ||
    title.includes('dress shirt') ||
    type2.includes('suit')
  ) {
    return 4;
  }

  // === SMART CASUAL (3) ===
  // Blazers, midi dresses, chinos, loafers
  if (
    type2.includes('blazer') ||
    title.includes('blazer') ||
    title.includes('midi dress') ||
    title.includes('maxi dress') ||
    title.includes('chino') ||
    title.includes('loafer') ||
    title.includes('button-down') ||
    title.includes('button down')
  ) {
    return 3;
  }

  // === ATHLETIC/SPORTY (1) ===
  // Sneakers, joggers, hoodies, athletic wear
  if (
    type2.includes('sneaker') ||
    title.includes('sneaker') ||
    title.includes('running shoe') ||
    title.includes('jogger') ||
    title.includes('hoodie') ||
    title.includes('sweatpant') ||
    title.includes('track') ||
    title.includes('athletic')
  ) {
    return 1;
  }

  // === CASUAL (2) - Default ===
  // Jeans, t-shirts, casual dresses, flats, leather jackets
  return 2;
}

/**
 * Check if two formality levels can be worn together
 * Rule: Must be within 1 level (adjacent or same)
 * Exception: Bottoms can bridge 2 levels (enables smart casual: dress pants + sneakers + tee)
 */
export function canWearTogether(
  level1: FormalityLevel,
  level2: FormalityLevel,
  role1?: string,
  role2?: string
): boolean {
  const diff = Math.abs(level1 - level2);

  // Standard rule: within 1 level
  if (diff <= 1) return true;

  // Exception: If one item is bottoms, allow 2-level difference
  // This enables: dress pants (4) + sneakers (1) + tee (2) = smart casual ✓
  // But still blocks: evening gown (6) + sneakers (1) = ✗
  if (diff === 2) {
    const isBottoms1 = role1?.toLowerCase() === 'bottoms';
    const isBottoms2 = role2?.toLowerCase() === 'bottoms';
    return isBottoms1 || isBottoms2;
  }

  return false;
}

/**
 * Detect smart casual patterns using config-driven approach
 * Patterns are defined in formality-patterns.json and can be updated by merchandisers
 */
function isSmartCasualPattern(outfit: OutfitCombination): { matches: boolean; patternName?: string } {
  const result = matchesAnyPattern(outfit, inferFormality);
  return {
    matches: result.matches,
    patternName: result.pattern?.name
  };
}

/**
 * Check if an outfit has formality mismatches
 * Returns true if outfit is OK, false if mismatch detected
 */
export function checkOutfitFormality(outfit: OutfitCombination): {
  isValid: boolean;
  reason?: string;
  formalityLevels?: { role: string; formality: number }[];
} {
  // FIRST: Check if this matches a known smart casual pattern
  // These are intentional formality mixes that work as complete looks
  const patternCheck = isSmartCasualPattern(outfit);
  if (patternCheck.matches) {
    const items = outfit.items.map(i => `${i.role}: ${i.product.title}`).join(', ');
    console.log(`✓ Smart casual pattern "${patternCheck.patternName}" detected: ${items}`);
    return {
      isValid: true,
      reason: `Valid smart casual pattern: ${patternCheck.patternName}`
    };
  }

  // SECOND: Fall back to pairwise formality checking
  // This catches truly bad combinations (evening gown + hoodie)
  const formalityLevels = outfit.items.map(item => ({
    role: item.role,
    product: item.product.title,
    formality: inferFormality(item.product),
  }));

  // Check all pairs for compatibility
  for (let i = 0; i < formalityLevels.length; i++) {
    for (let j = i + 1; j < formalityLevels.length; j++) {
      const item1 = formalityLevels[i];
      const item2 = formalityLevels[j];

      if (!canWearTogether(item1.formality, item2.formality, item1.role, item2.role)) {
        return {
          isValid: false,
          reason: `Formality mismatch: ${item1.role} (level ${item1.formality}) + ${item2.role} (level ${item2.formality})`,
          formalityLevels: formalityLevels.map(f => ({ role: f.role, formality: f.formality })),
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Filter outfit combinations to remove formality mismatches
 * Station 2.5 in the cooking pipeline
 *
 * Phase 2: Discovery Mode - Optionally captures pattern candidates
 */
export async function filterFormalityMismatches(
  combinations: OutfitCombination[],
  options?: {
    capturePatternCandidates?: boolean;
    recipeId?: string;
    recipeTitle?: string;
  }
): Promise<{ passed: OutfitCombination[]; filtered: number; examples: string[]; candidatesCaptured?: number }> {
  const passed: OutfitCombination[] = [];
  const examples: string[] = [];
  let filtered = 0;
  let candidatesCaptured = 0;

  for (const outfit of combinations) {
    const check = checkOutfitFormality(outfit);

    if (check.isValid) {
      passed.push(outfit);
    } else {
      filtered++;
      // Collect first 3 examples for logging
      if (examples.length < 3 && check.reason) {
        examples.push(check.reason);
      }

      // Phase 2: Capture pattern candidate if enabled
      if (options?.capturePatternCandidates && options.recipeId && options.recipeTitle) {
        try {
          const candidate: PatternCandidate = {
            candidateId: `candidate_${options.recipeId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            recipeId: options.recipeId,
            recipeTitle: options.recipeTitle,
            detectedAt: new Date().toISOString(),
            rejectionReason: check.reason || 'Unknown formality mismatch',
            items: outfit.items.map(item => ({
              role: item.role,
              formality: inferFormality(item.product),
              product: {
                id: item.product.id,
                title: item.product.title,
                brand: item.product.brand,
                productType2: item.product.productType2,
              },
            })),
            reviewStatus: 'pending',
          };

          await savePatternCandidate(candidate);
          candidatesCaptured++;
        } catch (error) {
          console.warn('Failed to save pattern candidate:', error);
        }
      }
    }
  }

  return { passed, filtered, examples, candidatesCaptured };
}
