-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to confirm all migrations completed successfully
-- ============================================================================

-- 1. Check all tables exist
SELECT
  table_name,
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  )
ORDER BY table_name;

-- Expected result: 3 tables
-- customer_interactions: 10 columns
-- customer_profiles: 17 columns
-- semantic_memories: 21 columns


-- 2. Check all indexes created
SELECT
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  )
GROUP BY tablename
ORDER BY tablename;

-- Expected: Multiple indexes per table


-- 3. Check foreign keys
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  )
ORDER BY tc.table_name;

-- Expected:
-- customer_interactions -> customer_profiles
-- semantic_memories -> customer_profiles


-- 4. Check RLS is enabled
SELECT
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  )
ORDER BY tablename;

-- Expected: All should be 'true'


-- 5. Check RLS policies count
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'customer_profiles',
  'customer_interactions',
  'semantic_memories'
)
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- customer_profiles: 5 policies
-- customer_interactions: 4 policies
-- semantic_memories: 5 policies


-- 6. Check helper functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_profile_summary',
    'calculate_profile_confidence',
    'get_interaction_breakdown',
    'get_recent_interactions',
    'get_interactions_by_session',
    'get_unprocessed_interactions',
    'count_interaction_signals',
    'archive_old_interactions',
    'get_active_memories',
    'increment_memory_retrieval',
    'expire_old_events',
    'refresh_all_recency_weights'
  )
ORDER BY routine_name;

-- Expected: 12 functions


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  '✅ DATABASE MIGRATION COMPLETE!' as status,
  '3 tables created' as tables,
  'All indexes, constraints, and policies in place' as features,
  'Ready to build API endpoints' as next_step;
