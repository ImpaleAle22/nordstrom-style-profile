/**
 * Batches API
 *
 * GET /api/batches - Get all batches
 * POST /api/batches - Create new batch
 * DELETE /api/batches?batchId=0001 - Delete batch
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BATCHES_FILE = path.join(process.cwd(), 'data', 'batches.json');

interface BatchData {
  nextBatchNumber: number;
  batches: {
    [key: string]: {
      type: 'recipes' | 'outfits' | 'products';
      ids: string[];
      count: number;
      label: string;
      createdAt: string;
    };
  };
}

function readBatches(): BatchData {
  if (!fs.existsSync(BATCHES_FILE)) {
    return { nextBatchNumber: 1, batches: {} };
  }

  const content = fs.readFileSync(BATCHES_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeBatches(data: BatchData): void {
  const dir = path.dirname(BATCHES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BATCHES_FILE, JSON.stringify(data, null, 2));
}

// GET - Read all batches
export async function GET() {
  try {
    const data = readBatches();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading batches:', error);
    return NextResponse.json(
      { error: 'Failed to read batches' },
      { status: 500 }
    );
  }
}

// POST - Create new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ids, label } = body;

    if (!type || !ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'Missing required fields: type, ids' },
        { status: 400 }
      );
    }

    const data = readBatches();

    // Generate batch ID
    const batchId = String(data.nextBatchNumber).padStart(4, '0');

    // Create batch
    data.batches[batchId] = {
      type,
      ids,
      count: ids.length,
      label: label || '',
      createdAt: new Date().toISOString(),
    };

    // Increment counter
    data.nextBatchNumber += 1;

    // Save
    writeBatches(data);

    return NextResponse.json({
      success: true,
      batchId,
      batch: data.batches[batchId],
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}

// DELETE - Delete batch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Missing batchId parameter' },
        { status: 400 }
      );
    }

    const data = readBatches();

    if (!data.batches[batchId]) {
      return NextResponse.json(
        { error: `Batch ${batchId} not found` },
        { status: 404 }
      );
    }

    delete data.batches[batchId];
    writeBatches(data);

    return NextResponse.json({
      success: true,
      message: `Batch ${batchId} deleted`,
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
