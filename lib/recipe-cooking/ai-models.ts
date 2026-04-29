/**
 * AI Model Constants
 *
 * SINGLE SOURCE OF TRUTH for model IDs.
 * Import these constants instead of hardcoding model names.
 *
 * Verified: April 11, 2026
 */

// ============================================================================
// GOOGLE GEMINI MODELS (v1beta API)
// ============================================================================

/**
 * Gemini 2.5 Flash Lite - Fast, cheap, good quality
 * ✅ VERIFIED WORKING (April 11, 2026)
 */
export const GEMINI_FLASH_LITE = 'gemini-2.5-flash-lite';

/**
 * Gemini 1.5 Flash - DOES NOT WORK
 * ❌ NOT AVAILABLE in v1beta API
 */
export const GEMINI_FLASH = 'gemini-1.5-flash';

/**
 * Gemini 1.5 Pro - DOES NOT WORK
 * ❌ NOT AVAILABLE in v1beta API
 */
export const GEMINI_PRO = 'gemini-1.5-pro';

/**
 * Default Gemini model for outfit generation
 * ✅ VERIFIED WORKING
 */
export const DEFAULT_GEMINI_MODEL = GEMINI_FLASH_LITE;

// ============================================================================
// ANTHROPIC CLAUDE MODELS (future)
// ============================================================================

/**
 * Claude Opus 4 - Highest quality (when implemented)
 */
export const CLAUDE_OPUS = 'claude-opus-4';

/**
 * Claude Sonnet 4 - Balanced (when implemented)
 */
export const CLAUDE_SONNET = 'claude-sonnet-4';

/**
 * Claude Haiku 4 - Fast and cheap (when implemented)
 */
export const CLAUDE_HAIKU = 'claude-haiku-4';

// ============================================================================
// MODEL METADATA
// ============================================================================

export const MODEL_INFO = {
  [GEMINI_FLASH_LITE]: {
    provider: 'Google',
    cost: {
      input: 0.075, // per 1M tokens
      output: 0.30,
    },
    speed: 'fast',
    quality: 'good',
    verified: true,
  },
  [GEMINI_FLASH]: {
    provider: 'Google',
    cost: {
      input: 0.075,
      output: 0.30,
    },
    speed: 'fast',
    quality: 'good',
    verified: false, // NOT AVAILABLE
  },
  [GEMINI_PRO]: {
    provider: 'Google',
    cost: {
      input: 0.35,
      output: 1.40,
    },
    speed: 'medium',
    quality: 'excellent',
    verified: false, // NOT AVAILABLE
  },
} as const;

/**
 * Get model display name
 */
export function getModelDisplayName(modelId: string): string {
  const names: Record<string, string> = {
    [GEMINI_FLASH]: 'Gemini 1.5 Flash',
    [GEMINI_PRO]: 'Gemini 1.5 Pro',
    [CLAUDE_OPUS]: 'Claude Opus 4',
    [CLAUDE_SONNET]: 'Claude Sonnet 4',
    [CLAUDE_HAIKU]: 'Claude Haiku 4',
  };
  return names[modelId] || modelId;
}
