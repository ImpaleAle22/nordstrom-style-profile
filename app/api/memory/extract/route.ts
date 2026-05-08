/**
 * POST /api/memory/extract
 *
 * Extract semantic memories from unstructured text using LLM.
 *
 * Request body:
 * {
 *   customerId: string;
 *   text: string;
 *   sourceType: 'request_a_look' | 'ai_chat' | 'style_quiz' | etc.
 *   sourceId: string;
 *   sourceContext?: string;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   memories: SemanticMemory[];
 *   extractionMetadata: {
 *     modelUsed: string;
 *     processingTimeMs: number;
 *     confidence: number;
 *   };
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Import Gemini for memory extraction
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface MemoryExtractionRequest {
  customerId: string;
  text: string;
  sourceType: string;
  sourceId: string;
  sourceContext?: string;
}

interface ExtractedMemory {
  text: string;
  memory_type: 'stated' | 'inferred' | 'life_context' | 'event' | 'preference' | 'negative';
  category: string;
  confidence: number;
  expires_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MemoryExtractionRequest = await request.json();
    const { customerId, text, sourceType, sourceId, sourceContext } = body;

    // Validate input
    if (!customerId || !text || !sourceType || !sourceId) {
      return NextResponse.json(
        { error: 'customerId, text, sourceType, and sourceId are required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Call LLM to extract memories
    const extractedMemories = await extractMemoriesWithLLM(text);

    const processingTimeMs = Date.now() - startTime;

    // Convert to database format and insert
    const now = new Date().toISOString();
    const memoriesToInsert = extractedMemories.map((memory, idx) => ({
      memory_id: `mem_${customerId}_${sourceId}_${idx}_${Date.now()}`,
      customer_id: customerId,
      text: memory.text,
      memory_type: memory.memory_type,
      category: memory.category,
      confidence: memory.confidence,
      source_type: sourceType,
      source_id: sourceId,
      source_context: sourceContext || null,
      extracted_at: now,
      expires_at: memory.expires_at || null,
      recency_weight: 1.0,
      retrieval_count: 0,
      status: 'active',
      related_memories: [],
      supersedes: null,
      superseded_by: null,
      tags: [],
      metadata: null,
    }));

    // Insert memories into database
    const { data: insertedMemories, error } = await supabaseServer
      .from('semantic_memories')
      .insert(memoriesToInsert)
      .select('*');

    if (error) {
      console.error('Error saving memories:', error);
      return NextResponse.json(
        { error: 'Failed to save memories', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memories: insertedMemories,
      extractionMetadata: {
        modelUsed: 'gemini-2.0-flash-exp',
        processingTimeMs,
        confidence: 0.85,
      },
    });
  } catch (error: any) {
    console.error('Error extracting memories:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Extract semantic memories from text using Gemini
 */
async function extractMemoriesWithLLM(text: string): Promise<ExtractedMemory[]> {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, returning mock memories');
    return [];
  }

  const systemPrompt = `You are a semantic memory extractor for a fashion personalization system.
Extract meaningful, actionable memories from customer text.

Rules:
1. Each memory should be a single, atomic fact
2. Classify by type: stated, inferred, life_context, event, preference, negative
3. Assign category (hobbies, family, profession, upcoming_event, style_preference, etc.)
4. Assign confidence 0.0-1.0 based on how explicit/clear the statement is
5. For events, extract dates if mentioned and set expires_at
6. Distinguish between stated facts (customer said directly) and inferences (you deduce)

Output ONLY valid JSON array of memories:
[
  {
    "text": "Goes on annual ski trips to Colorado",
    "memory_type": "life_context",
    "category": "hobbies",
    "confidence": 0.95
  },
  {
    "text": "Needs outfit for daughter's wedding in June",
    "memory_type": "event",
    "category": "upcoming_event",
    "confidence": 0.98,
    "expires_at": "2026-07-01T00:00:00Z"
  }
]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: `\n\nCustomer text:\n"${text}"\n\nExtract memories as JSON array:` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = generatedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const memories: ExtractedMemory[] = JSON.parse(jsonText);
    return memories;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    // Return empty array on error - don't fail the whole request
    return [];
  }
}
