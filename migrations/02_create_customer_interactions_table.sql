-- ============================================================================
-- Customer Interactions Table
-- Stores raw interaction data from all customer touchpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_interactions (
  -- Identity
  interaction_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,

  -- Classification
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'style_swipe',
    'style_quiz',
    'purchase',
    'wishlist_add',
    'request_a_look',
    'ai_chat',
    'product_hide',
    'product_view',
    'product_click',
    'search',
    'outfit_save',
    'outfit_edit'
  )),

  -- Timing
  timestamp TIMESTAMPTZ NOT NULL,

  -- Grouping (optional)
  session_id TEXT,

  -- Source tracking
  source TEXT NOT NULL CHECK (source IN (
    'web_app',
    'mobile_app',
    'in_store',
    'email_link',
    'sms_link',
    'stylist_session'
  )),

  -- Interaction-specific data (JSONB for flexibility)
  data JSONB NOT NULL,

  -- Additional metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id
  ON customer_interactions (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_interaction_type
  ON customer_interactions (interaction_type);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_timestamp
  ON customer_interactions (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_session_id
  ON customer_interactions (session_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_source
  ON customer_interactions (source);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_timestamp
  ON customer_interactions (customer_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_type
  ON customer_interactions (customer_id, interaction_type);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_session
  ON customer_interactions (session_id, timestamp);

-- ============================================================================
-- GIN Index for JSONB data queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customer_interactions_data_gin
  ON customer_interactions USING GIN (data);

-- ============================================================================
-- Foreign Key Constraints
-- ============================================================================

-- Link to customer_profiles
ALTER TABLE customer_interactions
  ADD CONSTRAINT fk_customer_interactions_customer
  FOREIGN KEY (customer_id)
  REFERENCES customer_profiles(customer_id)
  ON DELETE CASCADE;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own interactions
CREATE POLICY customer_interactions_select_own
  ON customer_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = customer_id);

-- Policy: Users can insert their own interactions
CREATE POLICY customer_interactions_insert_own
  ON customer_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = customer_id);

-- Policy: Users can update their own interactions
CREATE POLICY customer_interactions_update_own
  ON customer_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = customer_id);

-- Policy: Service role (backend) can access all interactions
CREATE POLICY customer_interactions_service_all
  ON customer_interactions
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get interaction count by type for a customer
CREATE OR REPLACE FUNCTION get_interaction_breakdown(p_customer_id TEXT)
RETURNS TABLE (
  interaction_type TEXT,
  count BIGINT,
  latest_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.interaction_type,
    COUNT(*) as count,
    MAX(i.timestamp) as latest_timestamp
  FROM customer_interactions i
  WHERE i.customer_id = p_customer_id
  GROUP BY i.interaction_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get recent interactions for a customer
CREATE OR REPLACE FUNCTION get_recent_interactions(
  p_customer_id TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  interaction_id TEXT,
  interaction_type TEXT,
  interaction_timestamp TIMESTAMPTZ,
  session_id TEXT,
  source TEXT,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.interaction_id,
    i.interaction_type,
    i.timestamp,
    i.session_id,
    i.source,
    i.data
  FROM customer_interactions i
  WHERE i.customer_id = p_customer_id
  ORDER BY i.timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get interactions by session
CREATE OR REPLACE FUNCTION get_interactions_by_session(p_session_id TEXT)
RETURNS TABLE (
  interaction_id TEXT,
  customer_id TEXT,
  interaction_type TEXT,
  interaction_timestamp TIMESTAMPTZ,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.interaction_id,
    i.customer_id,
    i.interaction_type,
    i.timestamp,
    i.data
  FROM customer_interactions i
  WHERE i.session_id = p_session_id
  ORDER BY i.timestamp;
END;
$$ LANGUAGE plpgsql;

-- Function: Get unprocessed interactions (for batch processing)
-- Assumes profile has been updated based on processed interactions
CREATE OR REPLACE FUNCTION get_unprocessed_interactions(
  p_customer_id TEXT,
  p_last_processed_at TIMESTAMPTZ
)
RETURNS TABLE (
  interaction_id TEXT,
  interaction_type TEXT,
  interaction_timestamp TIMESTAMPTZ,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.interaction_id,
    i.interaction_type,
    i.timestamp,
    i.data
  FROM customer_interactions i
  WHERE i.customer_id = p_customer_id
    AND i.timestamp > p_last_processed_at
  ORDER BY i.timestamp;
END;
$$ LANGUAGE plpgsql;

-- Function: Count total signals in interaction data
-- Useful for calculating confidence scores
CREATE OR REPLACE FUNCTION count_interaction_signals(p_interaction_id TEXT)
RETURNS INT AS $$
DECLARE
  interaction RECORD;
  signal_count INT;
BEGIN
  SELECT interaction_type, data
  INTO interaction
  FROM customer_interactions
  WHERE interaction_id = p_interaction_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  signal_count := 0;

  -- Count based on interaction type
  CASE interaction.interaction_type
    WHEN 'style_swipe' THEN
      -- Each card is a signal
      signal_count := jsonb_array_length(interaction.data->'cards');

    WHEN 'style_quiz' THEN
      -- Each question is a signal
      signal_count := jsonb_array_length(interaction.data->'questions');

    WHEN 'purchase' THEN
      -- Each item is a strong signal (count as 3x)
      signal_count := jsonb_array_length(interaction.data->'items') * 3;

    WHEN 'wishlist_add' THEN
      signal_count := 1;

    WHEN 'request_a_look' THEN
      -- Text extraction + structured fields
      signal_count := 2;

    WHEN 'ai_chat' THEN
      -- Count messages
      signal_count := jsonb_array_length(interaction.data->'messages');

    WHEN 'product_hide' THEN
      -- Strong negative signal
      signal_count := 2;

    WHEN 'product_view', 'product_click' THEN
      signal_count := 1;

    WHEN 'search' THEN
      -- Query + clicks
      signal_count := 1 + COALESCE(jsonb_array_length(interaction.data->'clicked_results'), 0);

    WHEN 'outfit_save', 'outfit_edit' THEN
      -- Each item in outfit
      signal_count := jsonb_array_length(interaction.data->'items');

    ELSE
      signal_count := 1;
  END CASE;

  RETURN signal_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Data Retention & Cleanup
-- ============================================================================

-- Function: Archive old interactions (move to archive table or delete)
CREATE OR REPLACE FUNCTION archive_old_interactions(p_days_old INT DEFAULT 365)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  -- For now, just mark as archived in metadata
  -- In production, might move to separate archive table
  UPDATE customer_interactions
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::JSONB),
    '{archived}',
    'true'::JSONB
  )
  WHERE timestamp < NOW() - (p_days_old || ' days')::INTERVAL
    AND NOT (metadata->>'archived')::BOOLEAN;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data Structures (for reference)
-- ============================================================================

/*
STYLE SWIPE DATA STRUCTURE:
{
  "stack_id": "broadcast_001",
  "stack_type": "broadcast",
  "stack_recipe": "style_discovery",
  "completion_type": "full",
  "completion_percentage": 100,
  "cards": [
    {
      "card_id": "card_001",
      "card_type": "lifestyle",
      "position": 1,
      "verdict": "yes",
      "dwell_ms": 3200,
      "saved": false,
      "mini_pdp_opened": false,
      "content_tags": {
        "pillars": ["minimal", "classic"],
        "colors": ["black", "neutral"],
        "gender": "womenswear",
        "formality": 6
      }
    }
  ]
}

STYLE QUIZ DATA STRUCTURE:
{
  "quiz_id": "onboarding_001",
  "quiz_version": "v2",
  "quiz_type": "onboarding",
  "completion_percentage": 100,
  "time_to_complete_ms": 45000,
  "questions": [
    {
      "question_id": "q1",
      "question_text": "Which style best describes you?",
      "question_type": "multiple_choice",
      "selected_options": ["minimal", "classic"],
      "time_to_answer_ms": 5000
    }
  ]
}

PURCHASE DATA STRUCTURE:
{
  "order_id": "ORD123",
  "order_date": "2026-05-06T10:00:00Z",
  "channel": "online",
  "total_amount": 245.50,
  "currency": "USD",
  "items": [
    {
      "product_id": "prod_001",
      "product_name": "Black Turtleneck",
      "brand": "Everlane",
      "category": "tops",
      "quantity": 1,
      "price": 68.00,
      "style_attributes": {
        "pillars": ["minimal", "classic"],
        "colors": ["black"]
      }
    }
  ]
}

REQUEST A LOOK DATA STRUCTURE:
{
  "request_id": "ral_001",
  "occasion": "work presentation",
  "event_date": "2026-06-15",
  "budget_range": { "min": 100, "max": 300 },
  "description": "I need outfits for work presentations in my new role...",
  "fulfilled": false
}

AI CHAT DATA STRUCTURE:
{
  "conversation_id": "chat_001",
  "total_turns": 8,
  "duration_ms": 180000,
  "messages": [
    {
      "message_id": "msg_001",
      "role": "customer",
      "content": "Show me minimal style outfits",
      "timestamp": "2026-05-06T10:00:00Z"
    }
  ],
  "extracted_signals": {
    "stated_preferences": ["loves minimal aesthetic"],
    "inferred_preferences": ["prefers comfort over formality"],
    "life_context": ["works in tech"]
  }
}
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'customer_interactions'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'customer_interactions';

-- Sample queries
-- Get interaction breakdown for a customer:
-- SELECT * FROM get_interaction_breakdown('user_123');

-- Get recent interactions:
-- SELECT * FROM get_recent_interactions('user_123', 20);

-- Count total signals:
-- SELECT SUM(count_interaction_signals(interaction_id))
-- FROM customer_interactions
-- WHERE customer_id = 'user_123';

-- ============================================================================
-- Notes
-- ============================================================================

/*
DESIGN DECISIONS:

1. JSONB for Flexibility:
   - Each interaction type has different data structure
   - JSONB allows type-specific fields without schema changes
   - GIN index enables efficient JSONB queries

2. Immutable by Design:
   - Interactions are append-only (no updates except metadata)
   - Preserves complete history for reprocessing
   - UPDATE policy exists but should rarely be used

3. Relationship to Profile:
   - Interactions are INPUT to Profile Brain
   - Profile is OUTPUT after processing
   - Profile stores last_processed_at to track progress

4. Signal Counting:
   - Different interaction types = different signal counts
   - Used for confidence score calculation
   - Purchases weighted 3x (strongest signal)

5. Session Grouping:
   - session_id groups related interactions
   - Example: All swipes in one sitting = same session_id
   - Useful for analytics and replay

6. Data Retention:
   - Keep raw interactions for reprocessing
   - Archive old data but don't delete
   - User can request full export (GDPR)
*/
