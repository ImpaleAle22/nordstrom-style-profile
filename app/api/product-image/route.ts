/**
 * Product Image Proxy API
 *
 * Serves product images from the scripts directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Image path required' }, { status: 400 });
  }

  try {
    // Handle full URLs (e.g., http://localhost:5002/product-images-unified/file.jpg)
    let normalizedPath = path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        const url = new URL(path);
        normalizedPath = url.pathname.substring(1); // Remove leading /
      } catch (e) {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }
    } else {
      // Handle relative paths: remove leading slash
      normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    }

    // Security: only allow images from product-images directory
    if (!normalizedPath.startsWith('product-images/')) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 403 });
    }

    // Resolve to scripts directory
    const scriptsDir = join(process.cwd(), '..', 'scripts');
    const imagePath = join(scriptsDir, normalizedPath);

    // Read image
    const imageBuffer = await readFile(imagePath);
    const foundPath = imagePath;

    // Determine content type from extension
    const ext = foundPath.toLowerCase().split('.').pop();
    const contentType =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      'image/jpeg'; // default

    // Return image with caching headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('Error serving image:', error);
    return NextResponse.json({
      error: 'Image not found',
      path: path
    }, { status: 404 });
  }
}
