-- ============================================================================
-- Add Feedback Interaction Types
-- Adds outfit/product feedback types for popularity ranking system
-- ============================================================================

-- Drop existing constraint
ALTER TABLE customer_interactions
DROP CONSTRAINT IF EXISTS customer_interactions_interaction_type_check;

-- Add new constraint with feedback types
ALTER TABLE customer_interactions
ADD CONSTRAINT customer_interactions_interaction_type_check
CHECK (interaction_type IN (
  -- Existing types
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
  'outfit_edit',

  -- NEW: Outfit feedback types
  'outfit_heart',
  'outfit_unheart',
  'outfit_thumbs_up',
  'outfit_thumbs_down',
  'outfit_view',
  'outfit_share',

  -- NEW: Product feedback types
  'product_heart',
  'product_unheart',
  'product_thumbs_up',
  'product_thumbs_down',
  'product_share'
));

-- ============================================================================
-- Helper Function: Record Outfit Interaction
-- ============================================================================

CREATE OR REPLACE FUNCTION record_outfit_interaction(
  p_customer_id TEXT,
  p_outfit_id TEXT,
  p_interaction_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'web_app',
  p_context TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_interaction_id TEXT;
BEGIN
  -- Generate interaction ID
  v_interaction_id := 'int_' || p_interaction_type || '_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || substr(md5(random()::text), 1, 8);

  -- Insert interaction
  INSERT INTO customer_interactions (
    interaction_id,
    customer_id,
    interaction_type,
    timestamp,
    session_id,
    source,
    data
  ) VALUES (
    v_interaction_id,
    p_customer_id,
    p_interaction_type,
    NOW(),
    p_session_id,
    p_source,
    jsonb_build_object(
      'outfit_id', p_outfit_id,
      'context', COALESCE(p_context, 'unknown')
    )
  );

  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Function: Record Product Interaction
-- ============================================================================

CREATE OR REPLACE FUNCTION record_product_interaction(
  p_customer_id TEXT,
  p_product_id TEXT,
  p_interaction_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'web_app',
  p_context TEXT DEFAULT NULL,
  p_outfit_id TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_interaction_id TEXT;
  v_data JSONB;
BEGIN
  -- Generate interaction ID
  v_interaction_id := 'int_' || p_interaction_type || '_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || substr(md5(random()::text), 1, 8);

  -- Build data object
  v_data := jsonb_build_object(
    'product_id', p_product_id,
    'context', COALESCE(p_context, 'unknown')
  );

  -- Add outfit_id if viewing product within an outfit
  IF p_outfit_id IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('outfit_id', p_outfit_id);
  END IF;

  -- Insert interaction
  INSERT INTO customer_interactions (
    interaction_id,
    customer_id,
    interaction_type,
    timestamp,
    session_id,
    source,
    data
  ) VALUES (
    v_interaction_id,
    p_customer_id,
    p_interaction_type,
    NOW(),
    p_session_id,
    p_source,
    v_data
  );

  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Function: Get Outfit Interaction Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_outfit_interaction_summary(p_outfit_id TEXT)
RETURNS TABLE (
  hearts BIGINT,
  thumbs_up BIGINT,
  thumbs_down BIGINT,
  saves BIGINT,
  views BIGINT,
  shares BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE interaction_type = 'outfit_heart') as hearts,
    COUNT(*) FILTER (WHERE interaction_type = 'outfit_thumbs_up') as thumbs_up,
    COUNT(*) FILTER (WHERE interaction_type = 'outfit_thumbs_down') as thumbs_down,
    COUNT(*) FILTER (WHERE interaction_type = 'outfit_save') as saves,
    COUNT(*) FILTER (WHERE interaction_type = 'outfit_view') as views,
    COUNT(*) FILTER (WHERE interaction_type = 'outfit_share') as shares,
    COUNT(DISTINCT customer_id) as unique_users
  FROM customer_interactions
  WHERE data->>'outfit_id' = p_outfit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Function: Get User's Outfit Interactions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_outfit_interactions(
  p_customer_id TEXT,
  p_outfit_id TEXT
)
RETURNS TABLE (
  has_hearted BOOLEAN,
  has_thumbs_up BOOLEAN,
  has_thumbs_down BOOLEAN,
  has_saved BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(
      SELECT 1 FROM customer_interactions
      WHERE customer_id = p_customer_id
        AND data->>'outfit_id' = p_outfit_id
        AND interaction_type = 'outfit_heart'
    ) as has_hearted,
    EXISTS(
      SELECT 1 FROM customer_interactions
      WHERE customer_id = p_customer_id
        AND data->>'outfit_id' = p_outfit_id
        AND interaction_type = 'outfit_thumbs_up'
    ) as has_thumbs_up,
    EXISTS(
      SELECT 1 FROM customer_interactions
      WHERE customer_id = p_customer_id
        AND data->>'outfit_id' = p_outfit_id
        AND interaction_type = 'outfit_thumbs_down'
    ) as has_thumbs_down,
    EXISTS(
      SELECT 1 FROM customer_interactions
      WHERE customer_id = p_customer_id
        AND data->>'outfit_id' = p_outfit_id
        AND interaction_type = 'outfit_save'
    ) as has_saved;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Indexes for New Query Patterns
-- ============================================================================

-- Index for outfit_id lookups in JSONB data
CREATE INDEX IF NOT EXISTS idx_customer_interactions_outfit_id
  ON customer_interactions USING GIN ((data->'outfit_id'));

-- Index for product_id lookups in JSONB data
CREATE INDEX IF NOT EXISTS idx_customer_interactions_product_id
  ON customer_interactions USING GIN ((data->'product_id'));

-- Composite index for user + outfit queries
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_outfit
  ON customer_interactions (customer_id, ((data->>'outfit_id')));

-- ============================================================================
-- Verification
-- ============================================================================

-- Test the new constraint
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'customer_interactions_interaction_type_check';

-- Test helper functions
-- SELECT record_outfit_interaction('test_user', 'outfit_123', 'outfit_heart');
-- SELECT * FROM get_outfit_interaction_summary('outfit_123');
-- SELECT * FROM get_user_outfit_interactions('test_user', 'outfit_123');
