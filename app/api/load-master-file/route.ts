import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const file = searchParams.get('file');

  if (!file || !['outfits', 'recipes'].includes(file)) {
    return NextResponse.json(
      { error: 'Invalid file parameter. Must be "outfits" or "recipes"' },
      { status: 400 }
    );
  }

  try {
    // Path to scripts folder (one level up from recipe-builder)
    const scriptsDir = path.join(process.cwd(), '..', 'scripts');
    const fileName = file === 'outfits' ? 'outfits-MASTER.json' : 'recipes-MASTER.json';
    const filePath = path.join(scriptsDir, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found: ${fileName}` },
        { status: 404 }
      );
    }

    // Read file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error loading MASTER file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load MASTER file' },
      { status: 500 }
    );
  }
}
