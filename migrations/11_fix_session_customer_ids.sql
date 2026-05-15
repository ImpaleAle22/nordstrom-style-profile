-- Fix customer_ids in sessions to match actual profile IDs
-- First, let's see what IDs we have in profiles:
-- SELECT customer_id, customer_name FROM customer_profiles ORDER BY customer_name;

-- Update sessions to match actual profile customer_ids
-- These updates map from the migration IDs to actual profile IDs

-- If your profiles use customer_name as customer_id:
UPDATE customer_sessions SET customer_id = 'Sarah Chen' WHERE customer_id = 'sarah_chen_001';
UPDATE customer_sessions SET customer_id = 'Marcus Thompson' WHERE customer_id = 'marcus_thompson_002';
UPDATE customer_sessions SET customer_id = 'Elena Rodriguez' WHERE customer_id = 'elena_rodriguez_003';
UPDATE customer_sessions SET customer_id = 'James Park' WHERE customer_id = 'james_park_004';
UPDATE customer_sessions SET customer_id = 'Zara Ahmed' WHERE customer_id = 'zara_ahmed_005';
UPDATE customer_sessions SET customer_id = 'David Kim' WHERE customer_id = 'david_kim_006';
UPDATE customer_sessions SET customer_id = 'Priya Sharma' WHERE customer_id = 'priya_sharma_007';
UPDATE customer_sessions SET customer_id = 'Oliver Chen' WHERE customer_id = 'oliver_chen_008';
UPDATE customer_sessions SET customer_id = 'Isabella Martinez' WHERE customer_id = 'isabella_martinez_009';

-- Verify the fix
SELECT
  cs.customer_id,
  COUNT(*) as session_count,
  EXISTS(SELECT 1 FROM customer_profiles cp WHERE cp.customer_id = cs.customer_id) as profile_exists
FROM customer_sessions cs
GROUP BY cs.customer_id
ORDER BY cs.customer_id;
