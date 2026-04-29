/**
 * Self-Healing Recipe Loop (Phase 3)
 * Automatically re-cooks recipes after patterns are learned
 *
 * Workflow:
 * 1. Track recipes that failed due to formality issues
 * 2. After pattern auto-approval, identify affected recipes
 * 3. Batch re-cook those recipes with new patterns
 * 4. Update recipe status with "auto-fixed" metadata
 * 5. Report success metrics
 */

import type { UnifiedRecipe } from '../unified-recipe-types';
import type { CookingOptions, CookingResult } from './types';
import { cookRecipe } from './index';
import type { PatternSuggestion } from './pattern-auto-approve';

/**
 * Failed Recipe Tracking
 * Stores recipes that failed due to formality issues for later retry
 */
export interface FailedRecipeRecord {
  recipeId: string;
  recipeTitle: string;
  recipe: UnifiedRecipe;
  failedAt: string;
  failureReason: 'formality-bottleneck' | 'low-yield-formality';
  formalityFiltered: number;
  totalGenerated: number;
  originalOptions: CookingOptions;

  // Retry tracking
  retryAttempts: number;
  lastRetryAt?: string;
  autoFixedAt?: string;
  autoFixSuccessful?: boolean;

  // Pattern matching
  affectedByPatterns?: string[]; // Pattern IDs that might fix this recipe
}

/**
 * Auto-Fix Metrics
 */
export interface AutoFixMetrics {
  totalRecipesTracked: number;
  recipesAutoFixed: number;
  recipesStillFailing: number;
  patternsLearned: number;
  successRate: number; // 0-1
}

// In-memory storage for failed recipes (Phase 3 MVP)
// TODO: Move to IndexedDB for persistence
const failedRecipesQueue: Map<string, FailedRecipeRecord> = new Map();

/**
 * Track a recipe that failed due to formality issues
 */
export function trackFailedRecipe(
  recipe: UnifiedRecipe,
  result: CookingResult,
  failureReason: 'formality-bottleneck' | 'low-yield-formality',
  originalOptions: CookingOptions
): void {
  const record: FailedRecipeRecord = {
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    recipe,
    failedAt: new Date().toISOString(),
    failureReason,
    formalityFiltered: result.stats.formalityFiltered,
    totalGenerated: result.stats.totalGenerated,
    originalOptions,
    retryAttempts: 0,
  };

  failedRecipesQueue.set(recipe.id, record);

  console.log(`📝 Tracked failed recipe: "${recipe.title}" (${failureReason})`);
  console.log(`   Queue size: ${failedRecipesQueue.size} recipes waiting for auto-fix`);
}

/**
 * Get all failed recipes waiting for auto-fix
 */
export function getFailedRecipesQueue(): FailedRecipeRecord[] {
  return Array.from(failedRecipesQueue.values());
}

/**
 * Clear a recipe from the failed queue
 */
export function clearFailedRecipe(recipeId: string): void {
  failedRecipesQueue.delete(recipeId);
}

/**
 * Determine if a pattern might fix a failed recipe
 * Simple heuristic: if pattern has same roles as recipe's failed combinations
 */
function patternMightFixRecipe(
  pattern: PatternSuggestion,
  failedRecipe: FailedRecipeRecord
): boolean {
  // For MVP, assume any new pattern might help
  // TODO: Smarter matching based on pattern rules vs recipe ingredients
  return true;
}

/**
 * Re-cook a single failed recipe with new patterns
 */
async function recookFailedRecipe(
  record: FailedRecipeRecord
): Promise<{ success: boolean; result: CookingResult }> {
  console.log(`\n🔄 Re-cooking failed recipe: "${record.recipeTitle}"`);
  console.log(`   Original failure: ${record.failureReason}`);
  console.log(`   Formality filtered: ${record.formalityFiltered}/${record.totalGenerated}`);

  try {
    // Re-cook with original options (patterns now loaded from formality-patterns.json)
    const result = await cookRecipe(record.recipe, record.originalOptions);

    // Check if auto-fix succeeded
    const success = result.stats.linkedCount >= 10;

    if (success) {
      console.log(`   ✅ AUTO-FIX SUCCESS: ${result.stats.linkedCount} outfits linked`);

      // Update record
      record.autoFixedAt = new Date().toISOString();
      record.autoFixSuccessful = true;
      record.lastRetryAt = new Date().toISOString();
      record.retryAttempts++;

      // Remove from queue
      clearFailedRecipe(record.recipeId);
    } else {
      console.log(`   ⚠️  AUTO-FIX PARTIAL: ${result.stats.linkedCount} outfits (below 10 threshold)`);

      // Keep in queue, increment attempts
      record.lastRetryAt = new Date().toISOString();
      record.retryAttempts++;
    }

    return { success, result };
  } catch (error) {
    console.error(`   ❌ AUTO-FIX FAILED: ${error}`);

    record.lastRetryAt = new Date().toISOString();
    record.retryAttempts++;

    throw error;
  }
}

/**
 * Self-healing workflow: Re-cook failed recipes after pattern approval
 * Called after auto-approval successfully adds new patterns
 */
export async function runSelfHealingWorkflow(
  approvedPatterns: PatternSuggestion[]
): Promise<AutoFixMetrics> {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 SELF-HEALING WORKFLOW');
  console.log('='.repeat(60));

  if (approvedPatterns.length === 0) {
    console.log('No patterns were approved - skipping self-healing');
    console.log('='.repeat(60) + '\n');
    return {
      totalRecipesTracked: failedRecipesQueue.size,
      recipesAutoFixed: 0,
      recipesStillFailing: failedRecipesQueue.size,
      patternsLearned: 0,
      successRate: 0,
    };
  }

  const failedRecipes = getFailedRecipesQueue();

  console.log(`\nSystem learned ${approvedPatterns.length} new patterns:`);
  approvedPatterns.forEach(p => {
    console.log(`  • ${p.name} (${p.exampleCount} examples, ${Math.round(p.coherenceScore * 100)}% coherence)`);
  });

  console.log(`\n${failedRecipes.length} recipes in queue waiting for auto-fix`);

  if (failedRecipes.length === 0) {
    console.log('\n✅ No recipes to auto-fix');
    console.log('='.repeat(60) + '\n');
    return {
      totalRecipesTracked: 0,
      recipesAutoFixed: 0,
      recipesStillFailing: 0,
      patternsLearned: approvedPatterns.length,
      successRate: 1.0,
    };
  }

  // Identify recipes that might be fixed by these patterns
  const recipesToRetry = failedRecipes.filter(record => {
    // Don't retry if already tried 3+ times
    if (record.retryAttempts >= 3) {
      console.log(`   ⏭️  Skipping "${record.recipeTitle}" (already tried ${record.retryAttempts} times)`);
      return false;
    }

    return approvedPatterns.some(pattern => patternMightFixRecipe(pattern, record));
  });

  console.log(`\n🔄 Re-cooking ${recipesToRetry.length} affected recipes...\n`);

  let successCount = 0;
  let failureCount = 0;

  // Re-cook each recipe sequentially
  for (const record of recipesToRetry) {
    try {
      const { success } = await recookFailedRecipe(record);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      failureCount++;
    }
  }

  const successRate = recipesToRetry.length > 0 ? successCount / recipesToRetry.length : 0;

  console.log('\n' + '='.repeat(60));
  console.log('✅ SELF-HEALING COMPLETE');
  console.log('='.repeat(60));
  console.log(`Patterns learned: ${approvedPatterns.length}`);
  console.log(`Recipes re-cooked: ${recipesToRetry.length}`);
  console.log(`Auto-fixed: ${successCount} (${Math.round(successRate * 100)}% success rate)`);
  console.log(`Still failing: ${failureCount}`);
  console.log(`Queue remaining: ${failedRecipesQueue.size} recipes`);
  console.log('='.repeat(60) + '\n');

  return {
    totalRecipesTracked: failedRecipes.length,
    recipesAutoFixed: successCount,
    recipesStillFailing: failedRecipesQueue.size,
    patternsLearned: approvedPatterns.length,
    successRate,
  };
}

/**
 * Get auto-fix metrics for reporting
 */
export function getAutoFixMetrics(): AutoFixMetrics {
  const records = getFailedRecipesQueue();
  const fixed = records.filter(r => r.autoFixSuccessful).length;
  const remaining = records.filter(r => !r.autoFixSuccessful).length;

  return {
    totalRecipesTracked: records.length,
    recipesAutoFixed: fixed,
    recipesStillFailing: remaining,
    patternsLearned: 0, // Set by caller
    successRate: records.length > 0 ? fixed / records.length : 0,
  };
}

/**
 * Clear all failed recipes from queue (for testing/debugging)
 */
export function clearAllFailedRecipes(): void {
  const count = failedRecipesQueue.size;
  failedRecipesQueue.clear();
  console.log(`🗑️  Cleared ${count} recipes from failed queue`);
}
