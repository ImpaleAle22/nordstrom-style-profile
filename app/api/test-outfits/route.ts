/**
 * Test API to check outfit count in IndexedDB
 * (Server-side - uses different approach)
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'IndexedDB is client-side only. This endpoint cannot access it.',
    instructions: 'Open http://localhost:3001/test-outfits in a browser to test.',
    note: 'The ranking demo requires a real browser with IndexedDB support.',
  });
}
