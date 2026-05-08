/**
 * CLIP API Configuration
 * Centralized config for CLIP service URL
 *
 * Priority:
 * 1. NEXT_PUBLIC_CLIP_API_URL (for production/Hugging Face Spaces)
 * 2. CLIP_API_URL (server-side only)
 * 3. localhost:5002 (local development)
 */

export const CLIP_API_URL =
  process.env.NEXT_PUBLIC_CLIP_API_URL ||
  process.env.CLIP_API_URL ||
  'http://localhost:5002';

/**
 * Check if CLIP API is available
 */
export async function isClipApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${CLIP_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get user-friendly CLIP status message
 */
export async function getClipStatusMessage(): Promise<string> {
  const isAvailable = await isClipApiAvailable();

  if (isAvailable) {
    return `✅ CLIP API connected: ${CLIP_API_URL}`;
  }

  if (CLIP_API_URL.includes('localhost')) {
    return `❌ CLIP API offline. Start locally with: cd services/clip-search && python app.py`;
  } else {
    return `❌ CLIP API unreachable at ${CLIP_API_URL}. Check Hugging Face Spaces deployment.`;
  }
}
