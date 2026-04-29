/**
 * Lifestyle Image Scan API
 * Single image scan endpoint
 * Note: Does NOT save to IndexedDB - client handles storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { scanLifestyleImage } from '@/lib/lifestyle-scanner';
import type { ImageSource, LifestyleImage } from '@/lib/lifestyle-image-types';

// Auto-save directory
const AUTOSAVE_DIR = join(process.cwd(), 'data', 'autosave');

// Helper: Save scan result to disk immediately
function autoSaveScan(result: LifestyleImage, sessionId: string) {
  try {
    // Ensure autosave directory exists
    if (!existsSync(AUTOSAVE_DIR)) {
      mkdirSync(AUTOSAVE_DIR, { recursive: true });
    }

    const sessionFile = join(AUTOSAVE_DIR, `scans-${sessionId}.json`);

    // Load existing scans or start new array
    let scans: LifestyleImage[] = [];
    if (existsSync(sessionFile)) {
      const existing = readFileSync(sessionFile, 'utf-8');
      scans = JSON.parse(existing);
    }

    // Add new scan
    scans.push(result);

    // Write back to disk
    writeFileSync(sessionFile, JSON.stringify(scans, null, 2));
    console.log(`✅ Auto-saved scan ${result.imageId} to ${sessionFile} (${scans.length} total)`);
  } catch (error) {
    console.error('❌ Auto-save failed:', error);
    // Don't throw - continue processing even if save fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      imageId: providedImageId,
      source,
      base64Data,
      sessionId,
    }: {
      imageUrl: string;
      imageId?: string;
      source: ImageSource;
      base64Data?: string;
      sessionId?: string;
    } = body;

    // Validate required fields
    if (!imageUrl || !source) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: imageUrl, source' },
        { status: 400 }
      );
    }

    // Generate imageId if not provided
    const imageId = providedImageId || `lifestyle_${Date.now()}_${nanoid(8)}`;

    // Scan the image
    let lifestyleImage;
    try {
      lifestyleImage = await scanLifestyleImage(imageUrl, imageId, source, base64Data);

      // AUTO-SAVE TO DISK IMMEDIATELY (prevents data loss)
      const finalSessionId = sessionId || `session-${Date.now()}`;
      autoSaveScan(lifestyleImage, finalSessionId);
    } catch (scanError) {
      const errorMessage = scanError instanceof Error ? scanError.message : 'Scan failed';
      const errorStack = scanError instanceof Error ? scanError.stack : undefined;

      console.error('========================================');
      console.error('SCAN ERROR:', errorMessage);
      console.error('Image URL:', imageUrl);
      console.error('Image ID:', imageId);
      console.error('Source:', source);
      if (errorStack) {
        console.error('Stack:', errorStack);
      }
      console.error('========================================');

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          imageId,
          errorRecord: {
            imageId,
            imageUrl,
            source,
            status: 'scan_error',
            addedAt: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: lifestyleImage,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
