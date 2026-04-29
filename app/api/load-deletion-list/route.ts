import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * API Route: Load Deletion List
 * Returns list of recipe IDs to delete for surgical update
 */
export async function GET() {
  try {
    const deletionPath = join(process.cwd(), '..', 'scripts', 'recipes-to-delete-v3.json');

    const fileContent = await readFile(deletionPath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to load deletion list:', error);
    return NextResponse.json(
      { error: 'Failed to load deletion list', message: error.message },
      { status: 500 }
    );
  }
}
