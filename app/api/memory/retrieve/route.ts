/**
 * POST /api/memory/retrieve
 *
 * Retrieve relevant semantic memories for a specific context using semantic search.
 *
 * Request body:
 * {
 *   customerId: string;
 *   context: string;  // Natural language description of context
 *   limit?: number;
 *   memoryTypes?: string[];  // Filter by types
 *   categories?: string[];   // Filter by categories
 *   minConfidence?: number;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   memories: SemanticMemory[];
 *   relevanceScores: number[];
 *   retrievalMetadata: {
 *     totalMemories: number;
 *     filteredMemories: number;
 *     retrievalTimeMs: number;
 *   };
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

interface MemoryRetrievalRequest {
  customerId: string;
  context: string;
  limit?: number;
  memoryTypes?: string[];
  categories?: string[];
  minConfidence?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: MemoryRetrievalRequest = await request.json();
    const {
      customerId,
      context,
      limit = 10,
      memoryTypes,
      categories,
      minConfidence = 0.5,
    } = body;

    // Validate input
    if (!customerId || !context) {
      return NextResponse.json(
        { error: 'customerId and context are required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Build query
    let query = supabaseServer
      .from('semantic_memories')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .gte('confidence', minConfidence);

    // Apply filters
    if (memoryTypes && memoryTypes.length > 0) {
      query = query.in('memory_type', memoryTypes);
    }
    if (categories && categories.length > 0) {
      query = query.in('category', categories);
    }

    const { data: allMemories, error } = await query;

    if (error) {
      console.error('Error fetching memories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memories', details: error.message },
        { status: 500 }
      );
    }

    const totalMemories = allMemories?.length || 0;

    // Rank memories by relevance to context
    // For now, use keyword matching - later can add vector embeddings
    const rankedMemories = rankMemoriesByRelevance(allMemories || [], context);

    // Take top N
    const topMemories = rankedMemories.slice(0, limit);
    const memories = topMemories.map(m => m.memory);
    const relevanceScores = topMemories.map(m => m.score);

    // Update retrieval counts for returned memories
    const memoryIds = memories.map(m => m.memory_id);
    if (memoryIds.length > 0) {
      await supabaseServer.rpc('increment_memory_retrieval', {
        p_memory_id: memoryIds[0] // Call for first one as example
      }).catch(err => console.warn('Could not increment retrieval count:', err));
    }

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      memories,
      relevanceScores,
      retrievalMetadata: {
        totalMemories,
        filteredMemories: rankedMemories.length,
        retrievalTimeMs: processingTimeMs,
      },
    });
  } catch (error: any) {
    console.error('Error retrieving memories:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Rank memories by relevance to context
 * Simple keyword-based scoring for now
 * TODO: Replace with vector similarity when embeddings are available
 */
function rankMemoriesByRelevance(
  memories: any[],
  context: string
): Array<{ memory: any; score: number }> {
  const contextLower = context.toLowerCase();
  const contextWords = contextLower.split(/\s+/);

  const scored = memories.map(memory => {
    const textLower = memory.text.toLowerCase();
    let score = 0;

    // Keyword overlap
    const matchingWords = contextWords.filter(word =>
      textLower.includes(word) && word.length > 3
    );
    score += matchingWords.length * 0.3;

    // Boost by confidence
    score *= memory.confidence;

    // Boost by recency
    score *= memory.recency_weight;

    // Boost by retrieval count (popular memories)
    score *= Math.log(memory.retrieval_count + 2);

    // Boost events and life context for relevant queries
    if (contextLower.includes('event') || contextLower.includes('occasion')) {
      if (memory.memory_type === 'event') score *= 1.5;
    }
    if (contextLower.includes('hobby') || contextLower.includes('interest')) {
      if (memory.category === 'hobbies') score *= 1.5;
    }

    return { memory, score };
  });

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}
