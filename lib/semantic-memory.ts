/**
 * Semantic Memory System
 *
 * The "color" layer of customer understanding. Stores rich, unstructured
 * insights that don't fit into structured fields but are crucial for
 * nuanced personalization.
 *
 * Examples:
 * - "Goes on annual ski trips to Colorado"
 * - "Dislikes anything too trendy or attention-grabbing"
 * - "Works in tech, needs comfortable but polished work looks"
 * - "Has twins, values easy care and durability"
 * - "Requested outfit for beach wedding in May"
 *
 * Architecture:
 * - Separate table with vector embeddings for semantic search
 * - Memory extraction from unstructured text (RAL, chat, etc.)
 * - Memory consolidation to merge similar/duplicate memories
 * - Memory retrieval for personalization contexts
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single semantic memory
 */
export interface SemanticMemory {
  memory_id: string;
  customer_id: string;

  // Memory content
  text: string; // Human-readable memory statement
  embedding?: number[]; // Vector embedding for semantic search (optional)

  // Classification
  memory_type: MemoryType;
  category?: MemoryCategory;
  confidence: number; // 0-1 (how sure are we of this?)

  // Source tracking
  source_type: SourceType;
  source_id: string; // Interaction ID or session ID
  source_context?: string; // Additional context about where this came from

  // Temporal aspects
  extracted_at: string; // When memory was extracted
  last_confirmed_at?: string; // When this was last reinforced/confirmed
  expires_at?: string; // Optional expiration (for time-bound events)
  recency_weight: number; // 0-1 (decays over time)

  // Relationships
  related_memories?: string[]; // IDs of related memories
  supersedes?: string; // ID of memory this replaces/contradicts
  superseded_by?: string; // ID of newer memory that replaces this

  // Usage tracking
  retrieval_count: number; // How many times this has been used
  last_retrieved_at?: string;

  // Status
  status: 'active' | 'consolidated' | 'superseded' | 'expired';

  // Metadata
  tags?: string[]; // For easy filtering
  metadata?: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export type MemoryType =
  | 'stated' // Customer explicitly said this
  | 'inferred' // We deduced this from behavior
  | 'life_context' // Facts about their life
  | 'event' // Upcoming or past events
  | 'preference' // Style preferences
  | 'negative'; // Things they dislike/avoid

export type MemoryCategory =
  // Life context
  | 'hobbies'
  | 'family'
  | 'profession'
  | 'location'
  | 'lifestyle'
  // Events
  | 'upcoming_event'
  | 'recurring_event'
  | 'past_event'
  // Preferences
  | 'style_preference'
  | 'fit_preference'
  | 'fabric_preference'
  | 'color_preference'
  | 'brand_preference'
  // Negatives
  | 'style_aversion'
  | 'fabric_aversion'
  | 'fit_issue'
  | 'brand_negative'
  // Other
  | 'shopping_behavior'
  | 'price_sensitivity'
  | 'sustainability'
  | 'other';

export type SourceType =
  | 'request_a_look'
  | 'ai_chat'
  | 'style_quiz'
  | 'stylist_notes'
  | 'customer_note'
  | 'inferred_behavior';

// ============================================================================
// MEMORY EXTRACTION
// ============================================================================

/**
 * Extract semantic memories from unstructured text
 *
 * Uses LLM to parse text and extract meaningful memories with proper
 * classification and confidence scoring.
 */
export interface MemoryExtractionInput {
  customerId: string;
  text: string;
  sourceType: SourceType;
  sourceId: string;
  sourceContext?: string;
}

export interface MemoryExtractionOutput {
  memories: Omit<SemanticMemory, 'memory_id' | 'created_at' | 'updated_at'>[];
  extractionMetadata: {
    modelUsed: string;
    processingTimeMs: number;
    confidence: number;
  };
}

/**
 * Extract memories from text using LLM
 *
 * Example:
 * Input: "I need an outfit for my daughter's wedding in June. I'll be
 *         outdoors most of the day and want something elegant but not
 *         too formal. Also, I really dislike anything with sequins."
 *
 * Output: [
 *   {
 *     text: "Has a daughter getting married in June",
 *     memory_type: "life_context",
 *     category: "family",
 *     confidence: 0.95
 *   },
 *   {
 *     text: "Needs outfit for daughter's wedding (June, outdoor)",
 *     memory_type: "event",
 *     category: "upcoming_event",
 *     confidence: 0.98,
 *     expires_at: "2026-07-01" // After event date
 *   },
 *   {
 *     text: "Prefers elegant but not too formal for special occasions",
 *     memory_type: "preference",
 *     category: "style_preference",
 *     confidence: 0.85
 *   },
 *   {
 *     text: "Dislikes sequins",
 *     memory_type: "negative",
 *     category: "style_aversion",
 *     confidence: 0.95
 *   }
 * ]
 */
export async function extractMemories(
  input: MemoryExtractionInput
): Promise<MemoryExtractionOutput> {
  const startTime = Date.now();

  // TODO: Implement LLM extraction
  // This would use Claude or Gemini to parse the text and extract structured memories

  const systemPrompt = `You are a semantic memory extractor for a fashion personalization system.
Extract meaningful, actionable memories from customer text.

Rules:
1. Each memory should be a single, atomic fact
2. Classify by type and category
3. Assign confidence based on how explicit/clear the statement is
4. For events, extract dates if mentioned
5. Distinguish between stated facts and inferences

Output as JSON array of memories.`;

  const userPrompt = `Extract memories from this customer text:

"${input.text}"

Context: ${input.sourceType}`;

  // Mock extraction for now
  const memories: any[] = [];

  return {
    memories,
    extractionMetadata: {
      modelUsed: 'claude-sonnet-4',
      processingTimeMs: Date.now() - startTime,
      confidence: 0.9,
    },
  };
}

// ============================================================================
// MEMORY CONSOLIDATION
// ============================================================================

/**
 * Consolidate similar or duplicate memories
 *
 * Over time, we might extract similar memories from different sources:
 * - "Loves skiing" (from chat)
 * - "Goes skiing every winter" (from RAL)
 * - "Requested ski trip outfits" (from RAL)
 *
 * These should be consolidated into:
 * - "Regular skier, goes on annual winter ski trips" (merged, higher confidence)
 */
export interface ConsolidationResult {
  consolidated: SemanticMemory;
  superseded: string[]; // IDs of memories that were merged
  confidence: number;
}

export async function consolidateMemories(
  memories: SemanticMemory[]
): Promise<ConsolidationResult[]> {
  // TODO: Implement memory consolidation
  // This would:
  // 1. Find semantically similar memories (using embeddings)
  // 2. Use LLM to merge them into a single, comprehensive memory
  // 3. Update superseded_by pointers
  // 4. Boost confidence based on multiple confirmations

  return [];
}

// ============================================================================
// MEMORY RETRIEVAL
// ============================================================================

/**
 * Retrieve relevant memories for a personalization context
 *
 * Example contexts:
 * - "Show me outfits for a winter vacation"
 *   → Retrieves: skiing hobby, colorado trips, prefers warm layers
 *
 * - "Business casual recommendations"
 *   → Retrieves: works in tech, values comfort, dislikes stiff collars
 *
 * - "Special occasion outfit"
 *   → Retrieves: daughter's wedding in June, prefers elegant not formal
 */
export interface MemoryRetrievalInput {
  customerId: string;
  context: string; // Natural language description of context
  limit?: number; // Max memories to return
  memoryTypes?: MemoryType[]; // Filter by type
  categories?: MemoryCategory[]; // Filter by category
  minConfidence?: number; // Minimum confidence threshold
}

export interface MemoryRetrievalOutput {
  memories: SemanticMemory[];
  relevanceScores: number[]; // 0-1 relevance to context
  retrievalMetadata: {
    totalMemories: number;
    filteredMemories: number;
    retrievalTimeMs: number;
  };
}

export async function retrieveMemories(
  input: MemoryRetrievalInput
): Promise<MemoryRetrievalOutput> {
  const startTime = Date.now();

  // TODO: Implement semantic retrieval
  // This would:
  // 1. Embed the context query
  // 2. Semantic search against memory embeddings
  // 3. Re-rank by recency_weight, confidence, retrieval_count
  // 4. Apply filters (type, category, confidence)
  // 5. Return top N most relevant

  return {
    memories: [],
    relevanceScores: [],
    retrievalMetadata: {
      totalMemories: 0,
      filteredMemories: 0,
      retrievalTimeMs: Date.now() - startTime,
    },
  };
}

// ============================================================================
// TEMPORAL DECAY
// ============================================================================

/**
 * Calculate recency weight for a memory
 *
 * Memories decay over time unless reinforced:
 * - Fresh (< 30 days): 1.0
 * - Recent (30-90 days): 0.8
 * - Older (90-180 days): 0.6
 * - Old (180-365 days): 0.4
 * - Very old (> 365 days): 0.2
 *
 * But: Can be re-weighted if confirmed/used recently
 */
export function calculateRecencyWeight(memory: SemanticMemory): number {
  const now = new Date();
  const referenceDate = memory.last_confirmed_at || memory.extracted_at;
  const ageMs = now.getTime() - new Date(referenceDate).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Time-bound events don't decay until they expire
  if (memory.category === 'upcoming_event' || memory.category === 'past_event') {
    if (memory.expires_at && new Date(memory.expires_at) > now) {
      return 1.0; // Event hasn't happened yet, full weight
    } else if (memory.expires_at && new Date(memory.expires_at) < now) {
      return 0.1; // Event passed, minimal weight
    }
  }

  // Stated preferences decay slower than inferences
  const decayMultiplier = memory.memory_type === 'stated' ? 1.5 : 1.0;

  if (ageDays < 30) return 1.0;
  if (ageDays < 90) return Math.max(0.2, 0.8 / decayMultiplier);
  if (ageDays < 180) return Math.max(0.2, 0.6 / decayMultiplier);
  if (ageDays < 365) return Math.max(0.2, 0.4 / decayMultiplier);
  return Math.max(0.2, 0.2 / decayMultiplier);
}

/**
 * Refresh recency weights for all memories
 * Run this periodically (daily batch job)
 */
export function refreshRecencyWeights(memories: SemanticMemory[]): SemanticMemory[] {
  return memories.map((memory) => ({
    ...memory,
    recency_weight: calculateRecencyWeight(memory),
  }));
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Detect conflicting memories
 *
 * Example conflicts:
 * - "Loves florals" (2024-01-15) vs "Hates floral patterns" (2024-09-20)
 * - "Budget conscious" (2023-03-10) vs "Bought $2000 designer coat" (2024-12-01)
 *
 * Resolution strategy:
 * - Newer stated preferences override older ones
 * - Behavior (purchases) can contradict stated preferences
 * - Flag conflicts for review rather than auto-resolving
 */
export interface MemoryConflict {
  memory1: SemanticMemory;
  memory2: SemanticMemory;
  conflictType: 'direct_contradiction' | 'behavioral_vs_stated' | 'inconsistent';
  severity: 'low' | 'medium' | 'high';
  suggestedResolution: 'keep_newer' | 'keep_stated' | 'keep_both_with_note' | 'manual_review';
}

export function detectConflicts(memories: SemanticMemory[]): MemoryConflict[] {
  // TODO: Implement conflict detection
  // Use embeddings to find semantically opposite memories
  // Use LLM to analyze if they truly conflict
  return [];
}

// ============================================================================
// MEMORY SUMMARY FOR PROFILE
// ============================================================================

/**
 * Generate human-readable summary of all memories
 * Used in profile display or for LLM context
 */
export function generateMemorySummary(memories: SemanticMemory[]): string {
  const activeMemories = memories
    .filter((m) => m.status === 'active')
    .sort((a, b) => {
      // Sort by: confidence * recency_weight * retrieval_count
      const scoreA = a.confidence * a.recency_weight * Math.log(a.retrieval_count + 1);
      const scoreB = b.confidence * b.recency_weight * Math.log(b.retrieval_count + 1);
      return scoreB - scoreA;
    });

  if (activeMemories.length === 0) {
    return 'No semantic memories yet.';
  }

  const sections: Record<string, string[]> = {};

  activeMemories.forEach((memory) => {
    const category = memory.category || 'other';
    if (!sections[category]) {
      sections[category] = [];
    }
    sections[category].push(memory.text);
  });

  let summary = '';
  Object.entries(sections).forEach(([category, texts]) => {
    summary += `\n**${formatCategoryName(category)}:**\n`;
    texts.forEach((text) => {
      summary += `- ${text}\n`;
    });
  });

  return summary.trim();
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// MEMORY ANALYTICS
// ============================================================================

/**
 * Analytics about semantic memory usage
 */
export interface MemoryAnalytics {
  totalMemories: number;
  activeMemories: number;
  memoryTypes: Record<MemoryType, number>;
  categories: Record<MemoryCategory, number>;
  averageConfidence: number;
  averageRecencyWeight: number;
  topRetrievedMemories: SemanticMemory[];
  recentlyAddedMemories: SemanticMemory[];
  expiringSoon: SemanticMemory[]; // Events coming up
  conflicts: MemoryConflict[];
}

export function analyzeMemories(memories: SemanticMemory[]): MemoryAnalytics {
  const active = memories.filter((m) => m.status === 'active');

  const memoryTypes: Record<string, number> = {};
  const categories: Record<string, number> = {};

  memories.forEach((m) => {
    memoryTypes[m.memory_type] = (memoryTypes[m.memory_type] || 0) + 1;
    if (m.category) {
      categories[m.category] = (categories[m.category] || 0) + 1;
    }
  });

  const avgConfidence =
    active.reduce((sum, m) => sum + m.confidence, 0) / active.length || 0;
  const avgRecency =
    active.reduce((sum, m) => sum + m.recency_weight, 0) / active.length || 0;

  const topRetrieved = [...active]
    .sort((a, b) => b.retrieval_count - a.retrieval_count)
    .slice(0, 10);

  const recentlyAdded = [...active]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = active.filter(
    (m) =>
      m.expires_at &&
      new Date(m.expires_at) > now &&
      new Date(m.expires_at) < thirtyDaysFromNow
  );

  return {
    totalMemories: memories.length,
    activeMemories: active.length,
    memoryTypes: memoryTypes as any,
    categories: categories as any,
    averageConfidence: avgConfidence,
    averageRecencyWeight: avgRecency,
    topRetrievedMemories: topRetrieved,
    recentlyAddedMemories: recentlyAdded,
    expiringSoon,
    conflicts: detectConflicts(memories),
  };
}
