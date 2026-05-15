/**
 * Attribute Tagger v2 - Main Entry Point
 *
 * Implements the four-station tagging pipeline from OUTFIT-TAGGING-V2-SPEC.md:
 * 1. Axis Station → formality, activityContext, season, socialRegister
 * 2. Pillar Station → stylePillar, subStyle (with AI second-pass escalation)
 * 3. Vibes Station → vibes (gated by pillar)
 * 4. Occasion Station → occasions (deterministic from axes)
 *
 * Supports three modes:
 * - commit: Write to Supabase (clears attributes first, writes on success)
 * - dry-run: Write to local tagging-v2-dryrun-results.json
 * - selective-commit: Commit if outfit ID in list, dry-run otherwise
 */

import { runAxisStation } from './stations/axis-station';
import { runPillarStation } from './stations/pillar-station';
import { runVibesStation } from './stations/vibes-station';
import { runOccasionStation } from './stations/occasion-station';
import { PILLAR_VIBE_COHERENCE } from './pillar-vibe-coherence';
import { STYLE_PILLAR_METADATA } from './outfit-attributes';
import type { OutfitInput } from './axis-types';
import type { StylePillar, Vibe, OutfitAttributes } from './outfit-attributes';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface TagOutfitV2Options {
  mode: 'commit' | 'dry-run' | 'selective-commit';
  outfitIds?: string[]; // For selective-commit mode
}

export interface TagOutfitV2Result {
  outfitId: string;
  success: boolean;
  attributes: Partial<OutfitAttributes> | null;
  error?: string;
  mode: 'commit' | 'dry-run';
}

export interface DryRunResult {
  runId: string; // ISO timestamp
  results: Array<{
    outfitId: string;
    currentAttributes: Partial<OutfitAttributes> | null;
    proposedAttributes: Partial<OutfitAttributes> | null;
    diff: {
      stylePillarChanged: boolean;
      subStyleChanged: boolean;
      vibesChanged: boolean;
      occasionsChanged: boolean;
      needsReview: boolean;
    };
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIDENCE_THRESHOLD = 0.60; // Below this, trigger AI second-pass (lowered from 0.65 to catch borderline cases)
const DRYRUN_FILE_PATH = path.join(process.cwd(), 'tagging-v2-dryrun-results.json');

// ============================================================================
// POST-PROCESSING VALIDATION (Spec §2.5)
// ============================================================================

/**
 * Validate and normalize final attributes before writing
 *
 * Per spec §2.5:
 * 1. Vibe-pillar coherence
 * 2. Sub-term canonicalness
 * 3. Axis enum check (done in Axis Station)
 * 4. Confidence floor (triggers needsReview)
 */
function validateAttributes(
  stylePillar: StylePillar | null,
  subStyle: string | null,
  vibes: Vibe[],
  confidence: { stylePillar: number; vibes: number }
): {
  stylePillar: StylePillar | null;
  subStyle: string | null;
  vibes: Vibe[];
  needsReview: boolean;
  reviewReason?: string;
} {
  let needsReview = false;
  let reviewReason: string | undefined;

  // Rule 1: Vibe-pillar coherence
  console.log(`[POST-PROCESSING] Before validation - pillar: ${stylePillar}, vibes:`, vibes);

  if (stylePillar) {
    const coherentVibes = PILLAR_VIBE_COHERENCE[stylePillar];
    console.log(`[POST-PROCESSING] Coherent vibes for ${stylePillar}:`, coherentVibes);

    const validVibes = vibes.filter(v => coherentVibes.includes(v));

    if (validVibes.length < vibes.length) {
      const invalidVibes = vibes.filter(v => !coherentVibes.includes(v));
      console.warn(`[POST-PROCESSING] Out-of-list vibes detected: ${invalidVibes.join(', ')}`);
      vibes = validVibes;
    }

    console.log(`[POST-PROCESSING] After validation - vibes:`, vibes);
  }

  // Rule 2: Sub-term canonicalness
  if (stylePillar && subStyle) {
    const canonicalSubTerms = STYLE_PILLAR_METADATA[stylePillar].subTerms;
    if (!canonicalSubTerms.includes(subStyle)) {
      console.warn(`Non-canonical sub-term: ${subStyle} for ${stylePillar}`);
      subStyle = null;
    }
  }

  // Rule 3: Confidence floor (triggers needsReview)
  if (stylePillar && confidence.stylePillar < CONFIDENCE_THRESHOLD) {
    needsReview = true;
    reviewReason = 'pillar_confidence_below_threshold';
    stylePillar = null;
    subStyle = null;
    vibes = [];
  }

  // Rule 4: Null pillar triggers needsReview
  if (!stylePillar) {
    needsReview = true;
    if (!reviewReason) {
      reviewReason = 'pillar_assignment_failed';
    }
  }

  return { stylePillar, subStyle, vibes, needsReview, reviewReason };
}

// ============================================================================
// MAIN TAGGING PIPELINE
// ============================================================================

/**
 * Tag outfit through v2 four-station pipeline
 *
 * Runs all stations, applies post-processing validation, returns attributes
 */
export async function tagOutfitV2(
  outfit: OutfitInput,
  currentAttributes: Partial<OutfitAttributes> | null,
  options: TagOutfitV2Options
): Promise<TagOutfitV2Result> {
  const actualMode =
    options.mode === 'selective-commit'
      ? options.outfitIds?.includes(outfit.outfitId)
        ? 'commit'
        : 'dry-run'
      : options.mode;

  try {
    // ===== STATION 1: AXIS STATION =====
    const axisResult = runAxisStation(outfit);

    if (axisResult.needsReview) {
      // Axis resolution failed validation
      return {
        outfitId: outfit.outfitId,
        success: false,
        attributes: {
          taggerVersion: 'v2',
          needsReview: true,
          reviewReason: 'axis_resolution_failure',
          taggedAt: new Date().toISOString(),
          taggedBy: 'hybrid',
        } as Partial<OutfitAttributes>,
        mode: actualMode,
      };
    }

    const { axes, hasBoldSignal } = axisResult;

    // ===== STATION 2: PILLAR STATION (with AI second-pass) =====
    let pillarResult = await runPillarStation(outfit, { tier: 'primary' });

    // AI second-pass if confidence < threshold
    if (pillarResult.confidence < CONFIDENCE_THRESHOLD && !pillarResult.needsReview) {
      console.log(`Pillar confidence ${pillarResult.confidence.toFixed(3)} < ${CONFIDENCE_THRESHOLD}, trying secondary tier...`);
      pillarResult = await runPillarStation(outfit, { tier: 'secondary' });

      if (pillarResult.confidence < CONFIDENCE_THRESHOLD) {
        console.warn(`Secondary tier still below threshold: ${pillarResult.confidence.toFixed(3)}`);
        pillarResult.needsReview = true;
        pillarResult.reviewReason = 'pillar_confidence_below_threshold_after_secondary';
      }
    }

    // ===== STATION 3: VIBES STATION =====
    let vibesResult = { vibes: [] as Vibe[], confidence: 0, reasoning: '', defaulted: false, retriedForOutOfList: false };

    if (pillarResult.stylePillar && !pillarResult.needsReview) {
      vibesResult = await runVibesStation(outfit, pillarResult.stylePillar);
    } else {
      // Skip vibes if pillar is null
      console.log('Skipping Vibes Station (pillar is null)');
    }

    // ===== STATION 4: OCCASION STATION =====
    const occasionResult = runOccasionStation({
      formality: axes.formality.value,
      activityContext: axes.activityContext.value,
      activityContextSecondary: axes.activityContext.secondary,
      socialRegister: axes.socialRegister.value,
      season: axes.season.value,
      eventRole: axisResult.eventRole,  // Pass event role for wedding occasions
      outfitId: outfit.outfitId,
    });

    // ===== POST-PROCESSING VALIDATION =====
    const validated = validateAttributes(
      pillarResult.stylePillar,
      pillarResult.subStyle,
      vibesResult.vibes,
      {
        stylePillar: pillarResult.confidence,
        vibes: vibesResult.confidence,
      }
    );

    // ===== ASSEMBLE v2 ATTRIBUTES BLOCK =====
    const attributes: Partial<OutfitAttributes> = {
      // Four axes
      formality: axes.formality.value,
      activityContext: axes.activityContext.value,
      activityContextSecondary: axes.activityContext.secondary,
      season: axes.season.value,
      socialRegister: axes.socialRegister.value,

      // Occasions (deterministic from axes)
      occasions: occasionResult.occasions,

      // Style pillar + sub-term
      stylePillar: validated.stylePillar,
      subStyle: validated.subStyle,

      // Vibes (gated by pillar)
      vibes: validated.vibes,

      // Confidence scores
      confidence: {
        formality: axes.formality.confidence,
        activityContext: axes.activityContext.confidence,
        season: axes.season.confidence,
        socialRegister: axes.socialRegister.confidence,
        stylePillar: pillarResult.confidence,
        vibes: vibesResult.confidence,
        occasions: occasionResult.confidence,
      },

      // Metadata
      taggerVersion: 'v2',
      taggedAt: new Date().toISOString(),
      taggedBy: 'hybrid',

      // Axis tagging sources
      axisTaggedBy: {
        formality: axes.formality.source,
        activityContext: axes.activityContext.source,
        season: axes.season.source,
        socialRegister: axes.socialRegister.source,
      },

      // needsReview flag
      needsReview: validated.needsReview,
      reviewReason: validated.reviewReason,
    };

    // ===== MODE HANDLING =====
    if (actualMode === 'commit') {
      // TODO: Write to Supabase (via storage helper or direct update)
      // For now, just log
      console.log(`[COMMIT MODE] Would write to Supabase for outfit ${outfit.outfitId}`);
    } else {
      // Dry-run mode: append to local JSON file
      appendToDryRunFile(outfit.outfitId, currentAttributes, attributes);
    }

    console.log(`[TAGGER V2] Final attributes being returned:`, {
      pillar: attributes.stylePillar,
      subStyle: attributes.subStyle,
      vibes: attributes.vibes,
      needsReview: attributes.needsReview,
      reviewReason: attributes.reviewReason,
    });

    return {
      outfitId: outfit.outfitId,
      success: true,
      attributes,
      mode: actualMode,
    };
  } catch (error) {
    console.error(`Error tagging outfit ${outfit.outfitId}:`, error);
    return {
      outfitId: outfit.outfitId,
      success: false,
      attributes: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      mode: actualMode,
    };
  }
}

// ============================================================================
// DRY-RUN FILE HANDLING
// ============================================================================

/**
 * Append result to dry-run file
 *
 * File structure per spec §5:
 * {
 *   runId: "ISO timestamp",
 *   results: [ { outfitId, currentAttributes, proposedAttributes, diff }, ... ]
 * }
 */
function appendToDryRunFile(
  outfitId: string,
  currentAttributes: Partial<OutfitAttributes> | null,
  proposedAttributes: Partial<OutfitAttributes>
): void {
  try {
    let runs: DryRunResult[] = [];

    // Read existing runs if file exists
    if (fs.existsSync(DRYRUN_FILE_PATH)) {
      const content = fs.readFileSync(DRYRUN_FILE_PATH, 'utf-8');
      runs = JSON.parse(content);
    }

    // Get or create current run (by timestamp - group results from same batch)
    const now = new Date().toISOString();
    const currentRunId = now.split(':')[0] + ':00:00Z'; // Round to hour for grouping

    let currentRun = runs.find(r => r.runId === currentRunId);
    if (!currentRun) {
      currentRun = { runId: currentRunId, results: [] };
      runs.push(currentRun);
    }

    // Calculate diff
    const diff = {
      stylePillarChanged: currentAttributes?.stylePillar !== proposedAttributes.stylePillar,
      subStyleChanged: currentAttributes?.subStyle !== proposedAttributes.subStyle,
      vibesChanged: JSON.stringify(currentAttributes?.vibes || []) !== JSON.stringify(proposedAttributes.vibes || []),
      occasionsChanged: JSON.stringify(currentAttributes?.occasions || []) !== JSON.stringify(proposedAttributes.occasions || []),
      needsReview: proposedAttributes.needsReview || false,
    };

    // Append result to current run
    currentRun.results.push({
      outfitId,
      currentAttributes,
      proposedAttributes,
      diff,
    });

    // Write back
    fs.writeFileSync(DRYRUN_FILE_PATH, JSON.stringify(runs, null, 2));
  } catch (error) {
    console.error('Error appending to dry-run file:', error);
  }
}

/**
 * Get all dry-run results (for admin UI)
 */
export function getDryRunResults(): DryRunResult[] {
  try {
    if (fs.existsSync(DRYRUN_FILE_PATH)) {
      const content = fs.readFileSync(DRYRUN_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading dry-run results:', error);
  }
  return [];
}

/**
 * Get latest dry-run (for admin UI diff inspector)
 */
export function getLatestDryRun(): DryRunResult | null {
  const runs = getDryRunResults();
  return runs.length > 0 ? runs[runs.length - 1] : null;
}

/**
 * Clear all dry-run results (for admin maintenance)
 */
export function clearDryRunResults(): void {
  try {
    if (fs.existsSync(DRYRUN_FILE_PATH)) {
      fs.unlinkSync(DRYRUN_FILE_PATH);
      console.log('Dry-run results cleared');
    }
  } catch (error) {
    console.error('Error clearing dry-run results:', error);
  }
}
