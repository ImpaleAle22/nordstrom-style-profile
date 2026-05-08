-- ============================================================================
-- Semantic Memories Table
-- Stores rich, unstructured customer insights that don't fit structured fields
-- ============================================================================

-- Enable pgvector extension for semantic search (optional)
-- Requires pgvector to be installed on Supabase project
-- COMMENT OUT if pgvector is not available - the table will still work
-- The embedding column will just stay NULL until you're ready for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create semantic_memories table
CREATE TABLE IF NOT EXISTS semantic_memories (
  -- Identity
  memory_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,

  -- Content
  text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
                          -- Set to NULL if not using embeddings yet

  -- Classification
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'stated',
    'inferred',
    'life_context',
    'event',
    'preference',
    'negative'
  )),
  category TEXT CHECK (category IN (
    -- Life context
    'hobbies',
    'family',
    'profession',
    'location',
    'lifestyle',
    -- Events
    'upcoming_event',
    'recurring_event',
    'past_event',
    -- Preferences
    'style_preference',
    'fit_preference',
    'fabric_preference',
    'color_preference',
    'brand_preference',
    -- Negatives
    'style_aversion',
    'fabric_aversion',
    'fit_issue',
    'brand_negative',
    -- Other
    'shopping_behavior',
    'price_sensitivity',
    'sustainability',
    'other'
  )),
  confidence FLOAT NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN (
    'request_a_look',
    'ai_chat',
    'style_quiz',
    'stylist_notes',
    'customer_note',
    'inferred_behavior'
  )),
  source_id TEXT NOT NULL,
  source_context TEXT,

  -- Temporal aspects
  extracted_at TIMESTAMPTZ NOT NULL,
  last_confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  recency_weight FLOAT NOT NULL DEFAULT 1.0 CHECK (recency_weight >= 0 AND recency_weight <= 1),

  -- Relationships
  related_memories TEXT[], -- Array of memory_id values
  supersedes TEXT, -- memory_id that this replaces
  superseded_by TEXT, -- memory_id that replaces this

  -- Usage tracking
  retrieval_count INT NOT NULL DEFAULT 0,
  last_retrieved_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'consolidated',
    'superseded',
    'expired'
  )),

  -- Metadata
  tags TEXT[],
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_semantic_memories_customer_id
  ON semantic_memories(customer_id);

CREATE INDEX IF NOT EXISTS idx_semantic_memories_memory_type
  ON semantic_memories(memory_type);

CREATE INDEX IF NOT EXISTS idx_semantic_memories_category
  ON semantic_memories(category);

CREATE INDEX IF NOT EXISTS idx_semantic_memories_status
  ON semantic_memories(status);

-- Filtering and ranking
CREATE INDEX IF NOT EXISTS idx_semantic_memories_confidence
  ON semantic_memories(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_memories_recency
  ON semantic_memories(recency_weight DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_memories_retrieval_count
  ON semantic_memories(retrieval_count DESC);

-- Temporal queries
CREATE INDEX IF NOT EXISTS idx_semantic_memories_extracted_at
  ON semantic_memories(extracted_at DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_memories_expires_at
  ON semantic_memories(expires_at)
  WHERE expires_at IS NOT NULL;

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_semantic_memories_customer_status_confidence
  ON semantic_memories(customer_id, status, confidence DESC)
  WHERE status = 'active';

-- Vector similarity search (requires pgvector extension)
-- Only create this if you're using embeddings
CREATE INDEX IF NOT EXISTS idx_semantic_memories_embedding
  ON semantic_memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding IS NOT NULL;

-- ============================================================================
-- Foreign Key Constraints
-- ============================================================================

-- Link to customer_profiles table
-- Assuming customer_profiles.customer_id is the primary key
ALTER TABLE semantic_memories
  ADD CONSTRAINT fk_semantic_memories_customer
  FOREIGN KEY (customer_id)
  REFERENCES customer_profiles(customer_id)
  ON DELETE CASCADE;

-- Self-referential foreign keys for supersedes/superseded_by
ALTER TABLE semantic_memories
  ADD CONSTRAINT fk_semantic_memories_supersedes
  FOREIGN KEY (supersedes)
  REFERENCES semantic_memories(memory_id)
  ON DELETE SET NULL;

ALTER TABLE semantic_memories
  ADD CONSTRAINT fk_semantic_memories_superseded_by
  FOREIGN KEY (superseded_by)
  REFERENCES semantic_memories(memory_id)
  ON DELETE SET NULL;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_semantic_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_semantic_memories_updated_at
  BEFORE UPDATE ON semantic_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_semantic_memories_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE semantic_memories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own memories
CREATE POLICY semantic_memories_select_own
  ON semantic_memories
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = customer_id);

-- Policy: Users can insert their own memories
CREATE POLICY semantic_memories_insert_own
  ON semantic_memories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = customer_id);

-- Policy: Users can update their own memories
CREATE POLICY semantic_memories_update_own
  ON semantic_memories
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = customer_id);

-- Policy: Users can delete their own memories
CREATE POLICY semantic_memories_delete_own
  ON semantic_memories
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = customer_id);

-- Policy: Service role (backend) can access all memories
CREATE POLICY semantic_memories_service_all
  ON semantic_memories
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get active memories for a customer
CREATE OR REPLACE FUNCTION get_active_memories(p_customer_id TEXT)
RETURNS TABLE (
  memory_id TEXT,
  text TEXT,
  memory_type TEXT,
  category TEXT,
  confidence FLOAT,
  recency_weight FLOAT,
  retrieval_count INT,
  extracted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.memory_id,
    m.text,
    m.memory_type,
    m.category,
    m.confidence,
    m.recency_weight,
    m.retrieval_count,
    m.extracted_at,
    m.expires_at
  FROM semantic_memories m
  WHERE m.customer_id = p_customer_id
    AND m.status = 'active'
  ORDER BY
    (m.confidence * m.recency_weight * LOG(m.retrieval_count + 1)) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment retrieval count
CREATE OR REPLACE FUNCTION increment_memory_retrieval(p_memory_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE semantic_memories
  SET
    retrieval_count = retrieval_count + 1,
    last_retrieved_at = NOW()
  WHERE memory_id = p_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark memory as expired
CREATE OR REPLACE FUNCTION expire_old_events()
RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE semantic_memories
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Update recency weights for all active memories
CREATE OR REPLACE FUNCTION refresh_all_recency_weights()
RETURNS INT AS $$
DECLARE
  affected_count INT;
  memory RECORD;
  new_weight FLOAT;
  reference_date TIMESTAMPTZ;
  age_days INT;
  decay_multiplier FLOAT;
BEGIN
  affected_count := 0;

  FOR memory IN
    SELECT memory_id, memory_type, category, extracted_at, last_confirmed_at, expires_at
    FROM semantic_memories
    WHERE status = 'active'
  LOOP
    -- Determine reference date
    reference_date := COALESCE(memory.last_confirmed_at, memory.extracted_at);
    age_days := EXTRACT(EPOCH FROM (NOW() - reference_date)) / 86400;

    -- Events don't decay until expired
    IF memory.category IN ('upcoming_event', 'past_event') THEN
      IF memory.expires_at IS NOT NULL AND memory.expires_at > NOW() THEN
        new_weight := 1.0;
      ELSIF memory.expires_at IS NOT NULL AND memory.expires_at < NOW() THEN
        new_weight := 0.1;
      ELSE
        new_weight := 1.0;
      END IF;
    ELSE
      -- Stated preferences decay slower
      decay_multiplier := CASE WHEN memory.memory_type = 'stated' THEN 1.5 ELSE 1.0 END;

      -- Calculate weight based on age
      IF age_days < 30 THEN
        new_weight := 1.0;
      ELSIF age_days < 90 THEN
        new_weight := GREATEST(0.2, 0.8 / decay_multiplier);
      ELSIF age_days < 180 THEN
        new_weight := GREATEST(0.2, 0.6 / decay_multiplier);
      ELSIF age_days < 365 THEN
        new_weight := GREATEST(0.2, 0.4 / decay_multiplier);
      ELSE
        new_weight := GREATEST(0.2, 0.2 / decay_multiplier);
      END IF;
    END IF;

    -- Update if changed
    UPDATE semantic_memories
    SET recency_weight = new_weight
    WHERE memory_id = memory.memory_id
      AND recency_weight != new_weight;

    IF FOUND THEN
      affected_count := affected_count + 1;
    END IF;
  END LOOP;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Uncomment to insert sample memories for testing
/*
INSERT INTO semantic_memories (
  memory_id,
  customer_id,
  text,
  memory_type,
  category,
  confidence,
  source_type,
  source_id,
  extracted_at
) VALUES
(
  'mem_001',
  'persona_minimal_maya',
  'Goes on annual ski trips to Colorado',
  'life_context',
  'hobbies',
  0.95,
  'request_a_look',
  'ral_001',
  NOW()
),
(
  'mem_002',
  'persona_minimal_maya',
  'Works in tech, values comfort over formality',
  'life_context',
  'profession',
  0.90,
  'ai_chat',
  'chat_001',
  NOW()
),
(
  'mem_003',
  'persona_minimal_maya',
  'Dislikes anything too trendy or attention-grabbing',
  'negative',
  'style_aversion',
  0.92,
  'style_quiz',
  'quiz_001',
  NOW()
);
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'semantic_memories'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'semantic_memories';

-- Check RLS policies
-- SELECT policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'semantic_memories';

-- ============================================================================
-- Notes
-- ============================================================================

/*
DEPLOYMENT STEPS:

1. Run this migration in Supabase SQL Editor
2. Verify customer_profiles table exists first
3. If not using vector embeddings yet, the embedding column can stay NULL
4. To enable embeddings later:
   - Install pgvector extension
   - Populate embedding column with vectors
   - Index will automatically work

MAINTENANCE:

Run these periodically (via cron or Supabase Functions):

-- Daily: Expire old events
SELECT expire_old_events();

-- Daily: Refresh recency weights
SELECT refresh_all_recency_weights();

-- Weekly: Manual consolidation (via API)

MONITORING:

-- Memory count per customer
SELECT customer_id, COUNT(*) as memory_count
FROM semantic_memories
WHERE status = 'active'
GROUP BY customer_id
ORDER BY memory_count DESC;

-- Average confidence by type
SELECT memory_type, AVG(confidence)::NUMERIC(3,2) as avg_confidence
FROM semantic_memories
WHERE status = 'active'
GROUP BY memory_type;

-- Memories expiring soon
SELECT customer_id, text, expires_at
FROM semantic_memories
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at > NOW()
  AND expires_at < NOW() + INTERVAL '30 days'
ORDER BY expires_at;
*/
