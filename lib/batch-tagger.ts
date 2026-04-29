/**
 * Client-Side Batch Tagging Utility
 *
 * Tags all outfits in IndexedDB with Style Pillar, Vibes, and Occasions.
 * Includes progress monitoring, checkpointing, and resume capability.
 *
 * CRITICAL: Implements incremental saves and progress tracking per CLAUDE.md requirements.
 */

import { getAllOutfits } from './outfit-storage';
import { updateOutfitAttributes } from './indexeddb-storage';
import { tagOutfit } from './attribute-tagger';
import type { StoredOutfit } from './outfit-storage';
import { tokenTracker } from './token-tracker';

// ============================================================================
// TYPES
// ============================================================================

export interface TaggingProgress {
  phase: 'idle' | 'tagging' | 'complete' | 'error';
  processed: number;
  total: number;
  percent: number;
  startedAt: string | null;
  lastUpdatedAt: string | null;
  estimatedTimeRemaining: string | null;
  errors: number;
  rulesOnly: number;
  aiAssisted: number;
  hybrid: number;
  currentOutfitId: string | null;
}

export interface CheckpointData {
  processed: number;
  processedIds: string[];
  timestamp: string;
}

export type ProgressCallback = (progress: TaggingProgress) => void;

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHECKPOINT_INTERVAL = 10; // Save checkpoint every 10 outfits (reduced from 100 for safety)
const STORAGE_KEY_CHECKPOINT = 'batch-tagging-checkpoint';
const STORAGE_KEY_PROGRESS = 'batch-tagging-progress';

// ============================================================================
// MAIN BATCH TAGGING FUNCTION
// ============================================================================

/**
 * Tag all outfits with attributes
 * Supports resume from checkpoint and sampling for testing
 */
export async function batchTagOutfits(
  options: {
    resume?: boolean;
    onProgress?: ProgressCallback;
    sampleSize?: number; // If set, only tag this many outfits (for testing)
    outfitIds?: string[]; // If set, only tag these specific outfits
  } = {}
): Promise<{ success: boolean; stats: TaggingProgress }> {
  const { resume = false, onProgress, sampleSize, outfitIds } = options;

  // Load or initialize progress
  let progress = loadProgress();
  if (!resume || progress.phase === 'complete') {
    progress = initializeProgress();
  }

  // Load checkpoint if resuming
  let processedIds = new Set<string>();
  if (resume) {
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      processedIds = new Set(checkpoint.processedIds);
      progress.processed = checkpoint.processed;
      console.log(`📋 Resuming from checkpoint: ${checkpoint.processed} outfits already tagged`);
    }
  }

  // Get all outfits
  let outfits = await getAllOutfits();

  // Filter by specific outfit IDs if provided
  if (outfitIds && outfitIds.length > 0) {
    const idSet = new Set(outfitIds);
    outfits = outfits.filter(o => idSet.has(o.outfitId));
    console.log(`🎯 Filtering to ${outfits.length} specific outfits`);
  }

  // Sample if requested (for testing)
  if (sampleSize && sampleSize < outfits.length) {
    outfits = outfits.slice(0, sampleSize);
    console.log(`🎲 Sampling ${sampleSize} outfits for testing`);
  }

  progress.total = outfits.length;
  progress.phase = 'tagging';
  progress.startedAt = progress.startedAt || new Date().toISOString();

  console.log(`🏷️  Starting batch tagging: ${outfits.length} outfits`);
  console.log(`📊 Mode: ${resume ? 'Resume' : 'Fresh start'}`);

  // Reset token tracker for fresh runs
  if (!resume) {
    tokenTracker.reset();
  }

  const startTime = Date.now();

  try {
    for (let i = 0; i < outfits.length; i++) {
      const outfit = outfits[i];

      // Skip if already processed
      if (processedIds.has(outfit.outfitId)) {
        continue;
      }

      progress.currentOutfitId = outfit.outfitId;

      try {
        // Tag outfit
        const attributes = await tagOutfit(outfit);

        // Update outfit in IndexedDB
        await updateOutfitAttributes(outfit.outfitId, attributes);

        // Track tagging method
        if (attributes.taggedBy === 'rules') {
          progress.rulesOnly++;
        } else if (attributes.taggedBy === 'ai') {
          progress.aiAssisted++;
        } else if (attributes.taggedBy === 'hybrid') {
          progress.hybrid++;
          // Add small delay after AI calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms = max 5 requests/sec
        }

        processedIds.add(outfit.outfitId);

      } catch (error) {
        console.error(`❌ Error tagging outfit ${outfit.outfitId}:`, error);
        progress.errors++;
      }

      // Update progress
      progress.processed = i + 1;
      progress.percent = ((i + 1) / outfits.length) * 100;
      progress.lastUpdatedAt = new Date().toISOString();

      // Calculate ETA
      const elapsed = Date.now() - startTime;
      const avgTimePerOutfit = elapsed / (i + 1);
      const remaining = (outfits.length - (i + 1)) * avgTimePerOutfit;
      progress.estimatedTimeRemaining = formatDuration(remaining);

      // Save progress to localStorage (frequent updates)
      saveProgress(progress);

      // Call progress callback and yield to browser for UI updates
      // Only update UI every 5 outfits to avoid flooding React with state updates
      const shouldUpdateUI = (i + 1) % 5 === 0 || (i + 1) === outfits.length;
      if (onProgress && shouldUpdateUI) {
        onProgress(progress);
        // Yield to browser to allow repaint
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Checkpoint every N outfits
      if ((i + 1) % CHECKPOINT_INTERVAL === 0) {
        const checkpoint: CheckpointData = {
          processed: i + 1,
          processedIds: Array.from(processedIds),
          timestamp: new Date().toISOString()
        };
        saveCheckpoint(checkpoint);
        console.log(`✓ Checkpoint: ${i + 1}/${outfits.length} outfits tagged (${progress.percent.toFixed(1)}%)`);
        console.log(`  💰 Tokens so far: ${tokenTracker.getSummaryString()}`);
      }
    }

    // Complete
    progress.phase = 'complete';
    progress.percent = 100;
    progress.currentOutfitId = null;
    progress.lastUpdatedAt = new Date().toISOString();
    progress.estimatedTimeRemaining = null;

    saveProgress(progress);
    clearCheckpoint(); // Clear checkpoint on completion

    console.log(`✅ Batch tagging complete!`);
    console.log(`   Total: ${outfits.length} outfits`);
    console.log(`   Rules-only: ${progress.rulesOnly}`);
    console.log(`   AI-assisted: ${progress.aiAssisted}`);
    console.log(`   Hybrid: ${progress.hybrid}`);
    console.log(`   Errors: ${progress.errors}`);

    // Log final token usage summary
    tokenTracker.logSummary();

    return { success: true, stats: progress };

  } catch (error) {
    console.error('❌ Fatal error in batch tagging:', error);
    progress.phase = 'error';
    progress.lastUpdatedAt = new Date().toISOString();
    saveProgress(progress);

    return { success: false, stats: progress };
  }
}

/**
 * Get current tagging progress (for monitoring from UI)
 */
export function getTaggingProgress(): TaggingProgress {
  return loadProgress();
}

/**
 * Check if tagging is in progress
 */
export function isTaggingInProgress(): boolean {
  const progress = loadProgress();
  return progress.phase === 'tagging';
}

/**
 * Reset tagging progress (start fresh)
 */
export function resetTaggingProgress(): void {
  clearProgress();
  clearCheckpoint();
  console.log('🔄 Tagging progress reset');
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

function initializeProgress(): TaggingProgress {
  return {
    phase: 'idle',
    processed: 0,
    total: 0,
    percent: 0,
    startedAt: null,
    lastUpdatedAt: null,
    estimatedTimeRemaining: null,
    errors: 0,
    rulesOnly: 0,
    aiAssisted: 0,
    hybrid: 0,
    currentOutfitId: null
  };
}

function loadProgress(): TaggingProgress {
  if (typeof window === 'undefined') return initializeProgress();

  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load progress:', error);
  }

  return initializeProgress();
}

function saveProgress(progress: TaggingProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

function clearProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_PROGRESS);
}

function loadCheckpoint(): CheckpointData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY_CHECKPOINT);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load checkpoint:', error);
  }

  return null;
}

function saveCheckpoint(checkpoint: CheckpointData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_CHECKPOINT, JSON.stringify(checkpoint));
  } catch (error) {
    console.error('Failed to save checkpoint:', error);
  }
}

function clearCheckpoint(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_CHECKPOINT);
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Estimate total time based on sample tagging
 * Useful for providing user with upfront time estimate
 */
export async function estimateTaggingTime(sampleSize: number = 10): Promise<{
  estimatedTotalTime: string;
  avgTimePerOutfit: number;
  totalOutfits: number;
}> {
  const outfits = await getAllOutfits();
  const sample = outfits.slice(0, Math.min(sampleSize, outfits.length));

  const startTime = Date.now();

  for (const outfit of sample) {
    try {
      await tagOutfit(outfit);
    } catch (error) {
      console.warn('Error in sample tagging:', error);
    }
  }

  const elapsed = Date.now() - startTime;
  const avgTimePerOutfit = elapsed / sample.length;
  const estimatedTotalTime = avgTimePerOutfit * outfits.length;

  return {
    estimatedTotalTime: formatDuration(estimatedTotalTime),
    avgTimePerOutfit,
    totalOutfits: outfits.length
  };
}

/**
 * Clear all outfit attributes (for re-tagging after fixes)
 * Useful when you've fixed bugs and want to re-tag from scratch
 */
export async function clearAllAttributes(): Promise<number> {
  const outfits = await getAllOutfits();
  let cleared = 0;

  console.log(`🧹 Clearing attributes from ${outfits.length} outfits...`);

  for (const outfit of outfits) {
    if (outfit.attributes) {
      await updateOutfitAttributes(outfit.outfitId, undefined as any);
      cleared++;
    }
  }

  console.log(`✅ Cleared attributes from ${cleared} outfits`);
  return cleared;
}
