-- ============================================================================
-- MASTER MIGRATION SCRIPT
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================================

-- IMPORTANT: Run these migrations in order!
-- Each migration depends on the previous one.

-- ============================================================================
-- MIGRATION 01: Customer Profiles Table
-- ============================================================================

\echo 'Running Migration 01: Customer Profiles Table...'

-- Run: 01_create_customer_profiles_table.sql
-- (Copy and paste the contents of that file here, or run separately)

\echo 'Migration 01 complete.'

-- ============================================================================
-- MIGRATION 02: Customer Interactions Table
-- ============================================================================

\echo 'Running Migration 02: Customer Interactions Table...'

-- Run: 02_create_customer_interactions_table.sql
-- (Copy and paste the contents of that file here, or run separately)

\echo 'Migration 02 complete.'

-- ============================================================================
-- MIGRATION 03: Semantic Memories Table
-- ============================================================================

\echo 'Running Migration 03: Semantic Memories Table...'

-- Run: 03_create_semantic_memories_table.sql
-- (Copy and paste the contents of that file here, or run separately)

\echo 'Migration 03 complete.'

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo 'Verifying all tables exist...'

SELECT
  table_name,
  (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE columns.table_name = tables.table_name
  ) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  )
ORDER BY table_name;

\echo 'Checking foreign key constraints...'

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  )
ORDER BY tc.table_name, tc.constraint_name;

\echo 'Checking RLS policies...'

SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN (
  'customer_profiles',
  'customer_interactions',
  'semantic_memories'
)
ORDER BY tablename, policyname;

\echo ''
\echo '========================================'
\echo 'ALL MIGRATIONS COMPLETE!'
\echo '========================================'
\echo ''
\echo 'Tables created:'
\echo '  1. customer_profiles'
\echo '  2. customer_interactions'
\echo '  3. semantic_memories'
\echo ''
\echo 'Next steps:'
\echo '  1. Review verification queries above'
\echo '  2. Create API endpoints'
\echo '  3. Test with sample data'
\echo ''

-- ============================================================================
-- OPTIONAL: Insert Sample Demo Persona
-- ============================================================================

-- Uncomment to insert a sample demo persona for testing
/*
\echo 'Inserting sample demo persona...'

INSERT INTO customer_profiles (
  customer_id,
  customer_name,
  gender,
  pillars,
  color_affinity,
  style_personality,
  confidence_score,
  sessions_processed,
  total_signals
) VALUES (
  'persona_minimal_maya',
  'Maya Kim',
  'womenswear',
  '{"minimal": 45, "classic": 35, "casual": 20}'::JSONB,
  '{"black": 100, "neutral": 90, "navy": 75, "white": 85}'::JSONB,
  'Maya''s style leans Minimal and Classic, with a strong affinity for black and neutral tones. This profile is well-established with strong, consistent signals.',
  0.85,
  12,
  245
);

-- Sample interaction
INSERT INTO customer_interactions (
  interaction_id,
  customer_id,
  interaction_type,
  timestamp,
  source,
  data
) VALUES (
  'swipe_maya_001',
  'persona_minimal_maya',
  'style_swipe',
  NOW(),
  'web_app',
  '{
    "stack_id": "broadcast_001",
    "stack_type": "broadcast",
    "cards": [
      {
        "card_id": "card_001",
        "verdict": "yes",
        "dwell_ms": 3200,
        "content_tags": {
          "pillars": ["minimal", "classic"],
          "colors": ["black"]
        }
      }
    ]
  }'::JSONB
);

-- Sample memory
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
) VALUES (
  'mem_maya_001',
  'persona_minimal_maya',
  'Goes on annual ski trips to Colorado',
  'life_context',
  'hobbies',
  0.95,
  'request_a_look',
  'ral_maya_001',
  NOW()
);

\echo 'Sample data inserted. Test profile at /profile/persona_minimal_maya'
*/
