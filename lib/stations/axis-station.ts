/**
 * Axis Station - Workstream 2 Wrapper for Four-Axis Resolution
 *
 * Wraps the existing axis-resolver.ts resolveAxes() function with:
 * - Bug fixes from Workstream 1 (already in axis-resolver/axis-signals)
 * - Enum validation pass (reject out-of-enum values → needsReview: true)
 * - Structured logging at each axis decision point
 * - Single entry point for v2 tagging pipeline
 *
 * This is the Axis Station from OUTFIT-TAGGING-V2-SPEC.md §2.1
 */

import { resolveAxes, type ResolveAxesResult } from '../axis-resolver';
import type {
  OutfitInput,
  ResolvedAxes,
  ActivityContext,
  Season,
  SocialRegister,
} from '../axis-types';

// ============================================================================
// ENUM VALIDATION SETS
// ============================================================================

const VALID_ACTIVITY_CONTEXTS: Set<ActivityContext> = new Set([
  'casual-low-key',
  'social-daytime',
  'social-evening',
  'professional',
  'event',
  'active',
]);

const VALID_SEASONS: Set<Season> = new Set([
  'spring',
  'summer',
  'fall',
  'winter',
  'all-season',
]);

const VALID_SOCIAL_REGISTERS: Set<SocialRegister> = new Set([
  'intimate',
  'peer-social',
  'evaluative',
  'public-facing',
  'celebratory',
]);

// ============================================================================
// STATION OUTPUT TYPE
// ============================================================================

export interface AxisStationResult {
  axes: ResolvedAxes;
  hasBoldSignal: boolean;
  needsReview: boolean;
  logs: AxisStationLog[];
}

export interface AxisStationLog {
  axis: 'formality' | 'activityContext' | 'season' | 'socialRegister';
  stage: 'rules' | 'validation' | 'final';
  message: string;
  value?: any;
  confidence?: number;
}

// ============================================================================
// ENUM VALIDATION HELPERS
// ============================================================================

function isValidActivityContext(value: any): value is ActivityContext {
  return typeof value === 'string' && VALID_ACTIVITY_CONTEXTS.has(value as ActivityContext);
}

function isValidSeason(value: any): value is Season {
  return typeof value === 'string' && VALID_SEASONS.has(value as Season);
}

function isValidSocialRegister(value: any): value is SocialRegister {
  return typeof value === 'string' && VALID_SOCIAL_REGISTERS.has(value as SocialRegister);
}

function validateSeasonArray(seasons: any[]): { valid: Season[]; invalid: any[] } {
  const valid: Season[] = [];
  const invalid: any[] = [];

  for (const season of seasons) {
    if (isValidSeason(season)) {
      valid.push(season);
    } else {
      invalid.push(season);
    }
  }

  return { valid, invalid };
}

// ============================================================================
// MAIN AXIS STATION FUNCTION
// ============================================================================

/**
 * Run Axis Station - Entry point for four-axis resolution
 *
 * Wraps resolveAxes() with enum validation and structured logging.
 * Returns axis values, bold signal detection, and needsReview flag.
 *
 * Per spec §4: Any axis returning an out-of-enum value gets normalized to null
 * and the outfit gets needsReview: true for manual review.
 */
export function runAxisStation(outfit: OutfitInput): AxisStationResult {
  const logs: AxisStationLog[] = [];
  let needsReview = false;

  // ===== STAGE 1: RUN RULES-BASED RESOLUTION =====
  const rulesResult: ResolveAxesResult = resolveAxes(outfit);
  const { axes, hasBoldSignal } = rulesResult;

  logs.push({
    axis: 'formality',
    stage: 'rules',
    message: `Rules returned formality ${axes.formality.value} (confidence: ${axes.formality.confidence.toFixed(2)})`,
    value: axes.formality.value,
    confidence: axes.formality.confidence,
  });

  logs.push({
    axis: 'activityContext',
    stage: 'rules',
    message: `Rules returned activityContext "${axes.activityContext.value}"${axes.activityContext.secondary ? ` (secondary: "${axes.activityContext.secondary}")` : ''} (confidence: ${axes.activityContext.confidence.toFixed(2)})`,
    value: axes.activityContext.value,
    confidence: axes.activityContext.confidence,
  });

  logs.push({
    axis: 'season',
    stage: 'rules',
    message: `Rules returned season [${axes.season.value.join(', ')}] (confidence: ${axes.season.confidence.toFixed(2)})`,
    value: axes.season.value,
    confidence: axes.season.confidence,
  });

  logs.push({
    axis: 'socialRegister',
    stage: 'rules',
    message: `Rules returned socialRegister "${axes.socialRegister.value}" (confidence: ${axes.socialRegister.confidence.toFixed(2)})`,
    value: axes.socialRegister.value,
    confidence: axes.socialRegister.confidence,
  });

  // ===== STAGE 2: ENUM VALIDATION =====

  // Formality: validate range 1.0-6.0
  if (typeof axes.formality.value !== 'number' || axes.formality.value < 1.0 || axes.formality.value > 6.0) {
    logs.push({
      axis: 'formality',
      stage: 'validation',
      message: `INVALID: formality ${axes.formality.value} outside range [1.0, 6.0] → setting needsReview`,
      value: axes.formality.value,
    });
    needsReview = true;
    // Clamp to valid range instead of nulling (formality is numeric, not enum)
    axes.formality.value = Math.max(1.0, Math.min(6.0, axes.formality.value));
  } else {
    logs.push({
      axis: 'formality',
      stage: 'validation',
      message: `✓ formality ${axes.formality.value} within valid range`,
    });
  }

  // Activity Context: validate enum
  if (!isValidActivityContext(axes.activityContext.value)) {
    logs.push({
      axis: 'activityContext',
      stage: 'validation',
      message: `INVALID: activityContext "${axes.activityContext.value}" not in enum → null, needsReview`,
      value: axes.activityContext.value,
    });
    needsReview = true;
    // Cast to any to bypass type error when setting to null (spec requires null for invalid values)
    (axes.activityContext.value as any) = null;
  } else {
    logs.push({
      axis: 'activityContext',
      stage: 'validation',
      message: `✓ activityContext "${axes.activityContext.value}" valid`,
    });
  }

  // Activity Context Secondary: validate if present
  if (axes.activityContext.secondary && !isValidActivityContext(axes.activityContext.secondary)) {
    logs.push({
      axis: 'activityContext',
      stage: 'validation',
      message: `INVALID: activityContext.secondary "${axes.activityContext.secondary}" not in enum → removing`,
      value: axes.activityContext.secondary,
    });
    delete axes.activityContext.secondary;
  } else if (axes.activityContext.secondary) {
    logs.push({
      axis: 'activityContext',
      stage: 'validation',
      message: `✓ activityContext.secondary "${axes.activityContext.secondary}" valid`,
    });
  }

  // Season: validate array of enums
  const seasonValidation = validateSeasonArray(axes.season.value);
  if (seasonValidation.invalid.length > 0) {
    logs.push({
      axis: 'season',
      stage: 'validation',
      message: `INVALID: season contains out-of-enum values [${seasonValidation.invalid.join(', ')}] → removing, needsReview`,
      value: seasonValidation.invalid,
    });
    needsReview = true;
    axes.season.value = seasonValidation.valid;
  }

  if (axes.season.value.length === 0) {
    logs.push({
      axis: 'season',
      stage: 'validation',
      message: `EMPTY: season array is empty after validation → null, needsReview`,
    });
    needsReview = true;
    (axes.season.value as any) = null;
  } else {
    logs.push({
      axis: 'season',
      stage: 'validation',
      message: `✓ season [${axes.season.value.join(', ')}] valid`,
    });
  }

  // Social Register: validate enum
  if (!isValidSocialRegister(axes.socialRegister.value)) {
    logs.push({
      axis: 'socialRegister',
      stage: 'validation',
      message: `INVALID: socialRegister "${axes.socialRegister.value}" not in enum → null, needsReview`,
      value: axes.socialRegister.value,
    });
    needsReview = true;
    (axes.socialRegister.value as any) = null;
  } else {
    logs.push({
      axis: 'socialRegister',
      stage: 'validation',
      message: `✓ socialRegister "${axes.socialRegister.value}" valid`,
    });
  }

  // ===== STAGE 3: FINAL SUMMARY =====
  logs.push({
    axis: 'formality',
    stage: 'final',
    message: `Final formality: ${axes.formality.value} (source: ${axes.formality.source})`,
    value: axes.formality.value,
    confidence: axes.formality.confidence,
  });

  logs.push({
    axis: 'activityContext',
    stage: 'final',
    message: `Final activityContext: ${axes.activityContext.value || 'null'}${axes.activityContext.secondary ? ` (secondary: ${axes.activityContext.secondary})` : ''} (source: ${axes.activityContext.source})`,
    value: axes.activityContext.value,
    confidence: axes.activityContext.confidence,
  });

  logs.push({
    axis: 'season',
    stage: 'final',
    message: `Final season: ${axes.season.value ? `[${axes.season.value.join(', ')}]` : 'null'} (source: ${axes.season.source})`,
    value: axes.season.value,
    confidence: axes.season.confidence,
  });

  logs.push({
    axis: 'socialRegister',
    stage: 'final',
    message: `Final socialRegister: ${axes.socialRegister.value || 'null'} (source: ${axes.socialRegister.source})`,
    value: axes.socialRegister.value,
    confidence: axes.socialRegister.confidence,
  });

  if (needsReview) {
    logs.push({
      axis: 'formality', // Arbitrary axis for summary log
      stage: 'final',
      message: '⚠️ NEEDS REVIEW: One or more axes failed validation',
    });
  }

  // ===== RETURN COMPLETE RESULT =====
  return {
    axes,
    hasBoldSignal,
    needsReview,
    logs,
  };
}
