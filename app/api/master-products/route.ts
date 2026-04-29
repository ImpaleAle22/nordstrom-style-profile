/**
 * API Route: Master Products
 *
 * Serves the master products JSON file for hydration
 * Streams the file to avoid memory limits
 */

import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Path to master products file
    const masterFilePath = path.join(
      process.cwd(),
      '..',
      'scripts',
      'products-MASTER-SOURCE-OF-TRUTH.json'
    );

    // Check if file exists
    if (!fs.existsSync(masterFilePath)) {
      return new Response(
        JSON.stringify({ error: 'Master products file not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get file stats
    const stats = fs.statSync(masterFilePath);
    console.log(`📦 Serving master products file (${Math.round(stats.size / 1024 / 1024)}MB)`);

    // Stream the file directly (avoids memory limits)
    const fileStream = fs.createReadStream(masterFilePath);

    // Convert Node stream to Web stream
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk);
        });
        fileStream.on('end', () => {
          controller.close();
        });
        fileStream.on('error', (error: Error) => {
          controller.error(error);
        });
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': stats.size.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error loading master products:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to load master products', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
