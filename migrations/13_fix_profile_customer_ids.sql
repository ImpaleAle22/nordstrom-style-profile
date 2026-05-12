-- Fix customer_profiles to use customer_name as customer_id
-- This matches the customer_id values in customer_sessions

-- Update profile IDs to match session IDs
UPDATE customer_profiles SET customer_id = 'Aisha Patel' WHERE customer_name = 'Aisha Patel';
UPDATE customer_profiles SET customer_id = 'Alex Chen' WHERE customer_name = 'Alex Chen';
UPDATE customer_profiles SET customer_id = 'Derek Johnson' WHERE customer_name = 'Derek Johnson';
UPDATE customer_profiles SET customer_id = 'Elena Rodriguez' WHERE customer_name = 'Elena Rodriguez';
UPDATE customer_profiles SET customer_id = 'James Wilson' WHERE customer_name = 'James Wilson';
UPDATE customer_profiles SET customer_id = 'Marcus Thompson' WHERE customer_name = 'Marcus Thompson';
UPDATE customer_profiles SET customer_id = 'Priya Sharma' WHERE customer_name = 'Priya Sharma';
UPDATE customer_profiles SET customer_id = 'Sarah Martinez' WHERE customer_name = 'Sarah Martinez';
UPDATE customer_profiles SET customer_id = 'Tyler Chen' WHERE customer_name = 'Tyler Chen';

-- Verify the fix
SELECT
  customer_id,
  customer_name,
  (SELECT COUNT(*) FROM customer_sessions cs WHERE cs.customer_id = customer_profiles.customer_id) as session_count
FROM customer_profiles
WHERE customer_name IN (
  'Aisha Patel', 'Alex Chen', 'Derek Johnson', 'Elena Rodriguez',
  'James Wilson', 'Marcus Thompson', 'Priya Sharma', 'Sarah Martinez', 'Tyler Chen'
)
ORDER BY customer_name;
