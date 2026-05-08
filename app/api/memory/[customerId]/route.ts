/**
 * GET /api/memory/[customerId]
 *
 * Fetch all active semantic memories for a customer.
 *
 * Query params:
 * - memoryType: Filter by memory type
 * - category: Filter by category
 * - minConfidence: Minimum confidence threshold
 * - limit: Max results
 *
 * Response:
 * {
 *   success: boolean;
 *   memories: SemanticMemory[];
 *   analytics: {
 *     totalMemories: number;
 *     averageConfidence: number;
 *     memoryTypes: Record<string, number>;
 *   };
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const { searchParams } = new URL(request.url);

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Parse query params
    const memoryType = searchParams.get('memoryType');
    const category = searchParams.get('category');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build query
    let query = supabaseServer
      .from('semantic_memories')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .gte('confidence', minConfidence)
      .order('recency_weight', { ascending: false })
      .order('confidence', { ascending: false })
      .limit(limit);

    // Apply filters
    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: memories, error } = await query;

    if (error) {
      console.error('Error fetching memories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memories', details: error.message },
        { status: 500 }
      );
    }

    // Calculate analytics
    const totalMemories = memories?.length || 0;
    const averageConfidence = totalMemories > 0
      ? memories.reduce((sum, m) => sum + m.confidence, 0) / totalMemories
      : 0;

    const memoryTypes: Record<string, number> = {};
    memories?.forEach(m => {
      memoryTypes[m.memory_type] = (memoryTypes[m.memory_type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      memories: memories || [],
      analytics: {
        totalMemories,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        memoryTypes,
      },
    });
  } catch (error: any) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
