-- ============================================================================
-- COPY THIS ENTIRE BLOCK INTO SUPABASE SQL EDITOR AND CLICK "RUN"
-- ============================================================================

-- Step 1: Drop old constraint
ALTER TABLE customer_interactions DROP CONSTRAINT IF EXISTS customer_interactions_interaction_type_check;

-- Step 2: Add new constraint with feedback types
ALTER TABLE customer_interactions ADD CONSTRAINT customer_interactions_interaction_type_check CHECK (interaction_type IN (
  'style_swipe', 'style_quiz', 'purchase', 'wishlist_add', 'request_a_look', 'ai_chat',
  'product_hide', 'product_view', 'product_click', 'search', 'outfit_save', 'outfit_edit',
  'outfit_heart', 'outfit_unheart', 'outfit_thumbs_up', 'outfit_thumbs_down', 'outfit_view', 'outfit_share',
  'product_heart', 'product_unheart', 'product_thumbs_up', 'product_thumbs_down', 'product_share'
));

-- Step 3: Test it works
INSERT INTO customer_interactions (
  interaction_id, customer_id, interaction_type, timestamp, source, data
) VALUES (
  'int_test_phase1_' || extract(epoch from now())::text,
  'test_user',
  'outfit_heart',
  NOW(),
  'web_app',
  '{"outfit_id": "test_123", "context": "test"}'::jsonb
);

-- Step 4: Verify
SELECT 'Migration successful! New interaction types are working.' as status;
