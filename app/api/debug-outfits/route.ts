/**
 * Debug API - Check outfit image URLs
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Note: This won't work server-side, but kept for reference
  // IndexedDB only works client-side
  return NextResponse.json({
    error: 'IndexedDB only available client-side. Use the debug page at /outfits/debug instead.'
  });
}
