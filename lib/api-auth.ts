/**
 * API Authentication & Rate Limiting
 *
 * Validates API keys and enforces rate limits
 */

import { NextRequest } from 'next/server';

// Master API key (set in environment)
const MASTER_API_KEY = process.env.STYLE_ENGINE_API_KEY;

// Rate limit storage (in-memory, resets on deployment)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  tier: 'none' | 'free' | 'premium';
  dailyLimit: number;
  remainingRequests: number;
}

/**
 * Validate API key from request headers
 */
export function validateApiKey(request: NextRequest): AuthResult {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  // Check if they have a valid key
  const hasValidKey = apiKey && apiKey === MASTER_API_KEY;

  // Determine tier and limits
  let tier: 'none' | 'free' | 'premium' = 'none';
  let dailyLimit = 100; // Default: 100 requests/day without key

  if (hasValidKey) {
    tier = 'premium';
    dailyLimit = 10000; // With key: 10,000 requests/day
  } else if (apiKey) {
    // They provided a key but it's invalid
    return {
      authenticated: false,
      error: 'Invalid API key',
      tier: 'none',
      dailyLimit: 0,
      remainingRequests: 0,
    };
  }

  // Check rate limit
  const clientId = apiKey || getClientId(request);
  const rateLimit = checkRateLimit(clientId, dailyLimit);

  if (!rateLimit.allowed) {
    return {
      authenticated: false,
      error: `Rate limit exceeded. Limit: ${dailyLimit} requests per day. Resets at ${new Date(rateLimit.resetAt).toISOString()}`,
      tier,
      dailyLimit,
      remainingRequests: 0,
    };
  }

  return {
    authenticated: true,
    tier,
    dailyLimit,
    remainingRequests: dailyLimit - rateLimit.count,
  };
}

/**
 * Check and update rate limit for a client
 */
function checkRateLimit(clientId: string, limit: number): { allowed: boolean; count: number; resetAt: number } {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Get or create rate limit entry
  let entry = requestCounts.get(clientId);

  if (!entry || now > entry.resetAt) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetAt: now + oneDayMs,
    };
  }

  // Increment count
  entry.count++;
  requestCounts.set(clientId, entry);

  return {
    allowed: entry.count <= limit,
    count: entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Use IP address as client ID for unauthenticated requests
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return `ip_${ip}`;
}

/**
 * Generate API response headers with rate limit info
 */
export function getRateLimitHeaders(auth: AuthResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': auth.dailyLimit.toString(),
    'X-RateLimit-Remaining': auth.remainingRequests.toString(),
    'X-RateLimit-Tier': auth.tier,
  };
}
