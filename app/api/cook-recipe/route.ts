/**
 * API Route: Cook Recipe
 * Handles recipe cooking requests from the control panel
 *
 * Features:
 * - Automatic post-cook triage
 * - Auto-retry with Discovery Mode for formality issues
 * - Self-healing recipe loop
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookRecipe } from '../../../lib/recipe-cooking';
import { performAutoTriage } from '../../../lib/recipe-cooking/auto-triage';
import { runAutoApprovalWorkflow } from '../../../lib/recipe-cooking/pattern-auto-approve';
import { runSelfHealingWorkflow } from '../../../lib/recipe-cooking/self-healing-loop';
import type { UnifiedRecipe } from '../../../lib/unified-recipe-types';
import type { CookingOptions } from '../../../lib/recipe-cooking/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipe, options, autoFixAttempts = 0 } = body as {
      recipe: UnifiedRecipe;
      options: CookingOptions;
      autoFixAttempts?: number;
    };

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe required' }, { status: 400 });
    }

    console.log('=== API: Starting cook for recipe:', recipe.title);
    console.log('Recipe slots:', recipe.slots?.length);
    console.log('Options:', options);
    console.log('Auto-fix attempts:', autoFixAttempts);

    // Cook the recipe
    const result = await cookRecipe(recipe, options);

    console.log('=== API: Cook completed successfully');

    // Phase 1: Auto-Triage - Analyze result and determine if retry needed
    const { shouldRetry, retryOptions, triage } = await performAutoTriage(
      recipe,
      result,
      options,
      autoFixAttempts
    );

    // If auto-retry is triggered, re-cook with Discovery Mode
    if (shouldRetry && retryOptions) {
      console.log('\n🔄 AUTO-RETRY: Re-cooking with Discovery Mode...\n');

      // Recursive call with retry options and incremented attempt counter
      const retryResult = await cookRecipe(recipe, retryOptions);

      console.log('=== API: Auto-retry completed successfully');

      // Phase 2: Auto-Approval - Run pattern analysis after Discovery Mode
      let autoApprovalResult;
      try {
        autoApprovalResult = await runAutoApprovalWorkflow();
      } catch (error) {
        console.error('Auto-approval workflow error:', error);
        // Don't fail the cook if auto-approval fails
        autoApprovalResult = { analyzed: 0, suggested: 0, approved: 0, patterns: [] };
      }

      // Phase 3: Self-Healing - Re-cook failed recipes if patterns were approved
      let selfHealingResult;
      try {
        if (autoApprovalResult.approved > 0) {
          selfHealingResult = await runSelfHealingWorkflow(autoApprovalResult.patterns);
        } else {
          selfHealingResult = {
            totalRecipesTracked: 0,
            recipesAutoFixed: 0,
            recipesStillFailing: 0,
            patternsLearned: 0,
            successRate: 0,
          };
        }
      } catch (error) {
        console.error('Self-healing workflow error:', error);
        // Don't fail the cook if self-healing fails
        selfHealingResult = {
          totalRecipesTracked: 0,
          recipesAutoFixed: 0,
          recipesStillFailing: 0,
          patternsLearned: autoApprovalResult.approved,
          successRate: 0,
        };
      }

      // Return retry result with metadata
      return NextResponse.json({
        ...retryResult,
        autoRetried: true,
        originalResult: {
          stats: result.stats,
          triage: triage,
        },
        retriedWithDiscoveryMode: true,
        autoApproval: {
          ran: true,
          analyzed: autoApprovalResult.analyzed,
          suggested: autoApprovalResult.suggested,
          approved: autoApprovalResult.approved,
          newPatterns: autoApprovalResult.patterns.map(p => ({
            name: p.name,
            description: p.description,
            exampleCount: p.exampleCount,
            coherence: Math.round(p.coherenceScore * 100),
          })),
        },
        selfHealing: {
          ran: autoApprovalResult.approved > 0,
          recipesTracked: selfHealingResult.totalRecipesTracked,
          recipesAutoFixed: selfHealingResult.recipesAutoFixed,
          recipesStillFailing: selfHealingResult.recipesStillFailing,
          patternsLearned: selfHealingResult.patternsLearned,
          successRate: Math.round(selfHealingResult.successRate * 100),
        },
      });
    }

    // No retry needed - check if Discovery Mode was used manually
    if (options.discoveryMode) {
      console.log('\n🔬 Discovery Mode was enabled - running auto-approval...');
      try {
        const autoApprovalResult = await runAutoApprovalWorkflow();

        // Phase 3: Self-Healing - Re-cook failed recipes if patterns were approved
        let selfHealingResult;
        try {
          if (autoApprovalResult.approved > 0) {
            selfHealingResult = await runSelfHealingWorkflow(autoApprovalResult.patterns);
          } else {
            selfHealingResult = {
              totalRecipesTracked: 0,
              recipesAutoFixed: 0,
              recipesStillFailing: 0,
              patternsLearned: 0,
              successRate: 0,
            };
          }
        } catch (error) {
          console.error('Self-healing workflow error:', error);
          selfHealingResult = {
            totalRecipesTracked: 0,
            recipesAutoFixed: 0,
            recipesStillFailing: 0,
            patternsLearned: autoApprovalResult.approved,
            successRate: 0,
          };
        }

        return NextResponse.json({
          ...result,
          triage: {
            status: triage.status,
            diagnostics: triage.diagnostics,
            needsAutoFix: triage.needsAutoFix,
            recommendedAction: triage.recommendedAction,
          },
          autoApproval: {
            ran: true,
            analyzed: autoApprovalResult.analyzed,
            suggested: autoApprovalResult.suggested,
            approved: autoApprovalResult.approved,
            newPatterns: autoApprovalResult.patterns.map(p => ({
              name: p.name,
              description: p.description,
              exampleCount: p.exampleCount,
              coherence: Math.round(p.coherenceScore * 100),
            })),
          },
          selfHealing: {
            ran: autoApprovalResult.approved > 0,
            recipesTracked: selfHealingResult.totalRecipesTracked,
            recipesAutoFixed: selfHealingResult.recipesAutoFixed,
            recipesStillFailing: selfHealingResult.recipesStillFailing,
            patternsLearned: selfHealingResult.patternsLearned,
            successRate: Math.round(selfHealingResult.successRate * 100),
          },
        });
      } catch (error) {
        console.error('Auto-approval workflow error:', error);
        // Continue with normal response
      }
    }

    // No retry needed - return original result with triage info
    return NextResponse.json({
      ...result,
      triage: {
        status: triage.status,
        diagnostics: triage.diagnostics,
        needsAutoFix: triage.needsAutoFix,
        recommendedAction: triage.recommendedAction,
      },
    });
  } catch (error: any) {
    console.error('=== API: Cook recipe error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to cook recipe' },
      { status: 500 }
    );
  }
}
