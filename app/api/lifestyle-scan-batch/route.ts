/**
 * Lifestyle Image Batch Scan API
 * Batch processing with streaming NDJSON response
 * Note: Does NOT save to IndexedDB - client handles storage
 */

import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { scanLifestyleImage } from '@/lib/lifestyle-scanner';
import type { ImageSource } from '@/lib/lifestyle-image-types';

interface BatchImageInput {
  imageUrl: string;
  imageId?: string;
  source: ImageSource;
}

interface BatchRequest {
  images: BatchImageInput[];
  batchSize?: number;
  delayMs?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json();
    // Default 5-second delay for rate limiting (production-hardened)
    const { images, batchSize = 20, delayMs = 5000 } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid images array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a readable stream for NDJSON response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let processedCount = 0;

        // Process images in batches
        for (let i = 0; i < images.length; i += batchSize) {
          const batch = images.slice(i, i + batchSize);

          // Process batch in parallel
          await Promise.all(
            batch.map(async (imageInput) => {
              const imageId = imageInput.imageId || `lifestyle_${Date.now()}_${nanoid(8)}`;

              try {
                // Scan the image
                const lifestyleImage = await scanLifestyleImage(
                  imageInput.imageUrl,
                  imageId,
                  imageInput.source
                );

                // Send success result with full image data
                const result = {
                  imageId,
                  status: 'complete' as const,
                  pillar: lifestyleImage.outfitAnalysis.stylePillar,
                  qualityScore: lifestyleImage.displaySuitability.qualityScore,
                  image: lifestyleImage,
                };
                controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'));
              } catch (scanError) {
                console.error(`Scan error for ${imageId}:`, scanError);

                // Send error result with error record
                const result = {
                  imageId,
                  status: 'error' as const,
                  error: scanError instanceof Error ? scanError.message : 'Scan failed',
                  errorRecord: {
                    imageId,
                    imageUrl: imageInput.imageUrl,
                    source: imageInput.source,
                    status: 'scan_error' as const,
                    addedAt: new Date().toISOString(),
                  },
                };
                controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'));
              }

              processedCount++;
            })
          );

          // Delay between batches (except after last batch)
          if (i + batchSize < images.length) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        // Close the stream
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Batch API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
