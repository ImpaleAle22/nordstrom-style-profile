-- Delete all existing sessions (they're for wrong personas)
DELETE FROM customer_sessions;

-- ============================================
-- CREATE SESSIONS FOR ACTUAL PERSONAS
-- ============================================

-- PERSONA 1: Aisha Patel (Casual/Romantic/Bohemian)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_aisha_001', 'Aisha Patel', 1, 'quiz', 'Completed initial style quiz - established casual romantic preferences', 42,
  NULL,
  '{"Casual": 35, "Romantic": 30, "Bohemian": 25, "Maximal": 10}'::jsonb,
  NULL, 0.38,
  '{"added": ["Casual", "Romantic", "Bohemian"], "insights": ["Loves color", "Flowing fabrics", "Mix and match"]}'::jsonb,
  8,
  NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days' + INTERVAL '12 minutes', 720),

('session_aisha_002', 'Aisha Patel', 2, 'swipe', 'Swiped on 58 lifestyle images - refined casual aesthetic', 58,
  '{"Casual": 35, "Romantic": 30, "Bohemian": 25, "Maximal": 10}'::jsonb,
  '{"Casual": 40, "Romantic": 28, "Bohemian": 22, "Maximal": 10}'::jsonb,
  0.38, 0.62,
  '{"strengthened": ["Casual"], "insights": ["Comfortable style", "Playful patterns"]}'::jsonb,
  12,
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days' + INTERVAL '10 minutes', 600);


-- PERSONA 2: Alex Chen (Minimal/Classic/Romantic)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_alex_001', 'Alex Chen', 1, 'quiz', 'Initial style quiz - minimal and classic foundation', 40,
  NULL,
  '{"Minimal": 38, "Classic": 32, "Romantic": 20, "Modern": 10}'::jsonb,
  NULL, 0.41,
  '{"added": ["Minimal", "Classic", "Romantic"], "insights": ["Clean lines", "Timeless pieces"]}'::jsonb,
  9,
  NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days' + INTERVAL '11 minutes', 660),

('session_alex_002', 'Alex Chen', 2, 'swipe', 'Swiped 52 lifestyle images - refined minimal aesthetic', 52,
  '{"Minimal": 38, "Classic": 32, "Romantic": 20, "Modern": 10}'::jsonb,
  '{"Minimal": 45, "Classic": 30, "Romantic": 18, "Modern": 7}'::jsonb,
  0.41, 0.68,
  '{"strengthened": ["Minimal"], "insights": ["Neutral palette", "Quality fabrics"]}'::jsonb,
  14,
  NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days' + INTERVAL '9 minutes', 540);


-- PERSONA 3: Derek Johnson (Athletic/Casual/Minimal)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_derek_001', 'Derek Johnson', 1, 'quiz', 'Quiz revealed athletic casual preferences', 38,
  NULL,
  '{"Athletic": 45, "Casual": 28, "Minimal": 17, "Modern": 10}'::jsonb,
  NULL, 0.39,
  '{"added": ["Athletic", "Casual", "Minimal"], "insights": ["Active lifestyle", "Performance wear"]}'::jsonb,
  10,
  NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days' + INTERVAL '10 minutes', 600),

('session_derek_002', 'Derek Johnson', 2, 'swipe', 'Swiped 48 images - athletic preferences strengthened', 48,
  '{"Athletic": 45, "Casual": 28, "Minimal": 17, "Modern": 10}'::jsonb,
  '{"Athletic": 52, "Casual": 25, "Minimal": 15, "Modern": 8}'::jsonb,
  0.39, 0.65,
  '{"strengthened": ["Athletic"], "insights": ["Technical fabrics", "Gym-to-street"]}'::jsonb,
  13,
  NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days' + INTERVAL '8 minutes', 480);


-- PERSONA 4: Elena Rodriguez (Bohemian/Maximal/Romantic)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_elena_001', 'Elena Rodriguez', 1, 'quiz', 'Style quiz revealed bohemian aesthetic with maximal elements', 45,
  NULL,
  '{"Bohemian": 38, "Maximal": 28, "Romantic": 20, "Casual": 14}'::jsonb,
  NULL, 0.40,
  '{"added": ["Bohemian", "Maximal", "Romantic"], "insights": ["Artistic flair", "Earthy tones", "Layering"]}'::jsonb,
  12,
  NOW() - INTERVAL '58 days', NOW() - INTERVAL '58 days' + INTERVAL '15 minutes', 900),

('session_elena_002', 'Elena Rodriguez', 2, 'swipe', 'Swiped 72 images - strong affinity for bohemian style', 72,
  '{"Bohemian": 38, "Maximal": 28, "Romantic": 20, "Casual": 14}'::jsonb,
  '{"Bohemian": 46, "Maximal": 26, "Romantic": 18, "Casual": 10}'::jsonb,
  0.40, 0.67,
  '{"strengthened": ["Bohemian"], "insights": ["Natural fibers", "Vintage touches"]}'::jsonb,
  20,
  NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days' + INTERVAL '14 minutes', 840);


-- PERSONA 5: James Wilson (Classic/Utility/Minimal)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_james_001', 'James Wilson', 1, 'quiz', 'Initial quiz - classic professional foundation', 40,
  NULL,
  '{"Classic": 42, "Utility": 28, "Minimal": 18, "Professional": 12}'::jsonb,
  NULL, 0.42,
  '{"added": ["Classic", "Utility", "Minimal"], "insights": ["Work appropriate", "Functional design"]}'::jsonb,
  9,
  NOW() - INTERVAL '54 days', NOW() - INTERVAL '54 days' + INTERVAL '11 minutes', 660),

('session_james_002', 'James Wilson', 2, 'swipe', 'Swiped 45 images - refined work wardrobe preferences', 45,
  '{"Classic": 42, "Utility": 28, "Minimal": 18, "Professional": 12}'::jsonb,
  '{"Classic": 48, "Utility": 26, "Minimal": 16, "Professional": 10}'::jsonb,
  0.42, 0.68,
  '{"strengthened": ["Classic"], "insights": ["Tailored fit", "Navy and gray focus"]}'::jsonb,
  14,
  NOW() - INTERVAL '36 days', NOW() - INTERVAL '36 days' + INTERVAL '9 minutes', 540);


-- PERSONA 6: Marcus Thompson (Athletic/Utility/Casual)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_marcus_001', 'Marcus Thompson', 1, 'quiz', 'Quiz established athletic utility preferences', 38,
  NULL,
  '{"Athletic": 40, "Utility": 30, "Casual": 20, "Modern": 10}'::jsonb,
  NULL, 0.38,
  '{"added": ["Athletic", "Utility", "Casual"], "insights": ["Low engagement buyer", "Function focused"]}'::jsonb,
  8,
  NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days' + INTERVAL '10 minutes', 600),

('session_marcus_002', 'Marcus Thompson', 2, 'swipe', 'Swiped 35 images - minimal engagement pattern', 35,
  '{"Athletic": 40, "Utility": 30, "Casual": 20, "Modern": 10}'::jsonb,
  '{"Athletic": 45, "Utility": 28, "Casual": 18, "Modern": 9}'::jsonb,
  0.38, 0.58,
  '{"strengthened": ["Athletic"], "insights": ["Practical choices", "Limited brand loyalty"]}'::jsonb,
  9,
  NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days' + INTERVAL '7 minutes', 420);


-- PERSONA 7: Priya Sharma (Casual/Bohemian/Romantic)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_priya_001', 'Priya Sharma', 1, 'quiz', 'Quiz showed casual bohemian style with romantic touches', 42,
  NULL,
  '{"Casual": 38, "Bohemian": 30, "Romantic": 20, "Minimal": 12}'::jsonb,
  NULL, 0.39,
  '{"added": ["Casual", "Bohemian", "Romantic"], "insights": ["Patient shopper", "Wishlist builder"]}'::jsonb,
  10,
  NOW() - INTERVAL '56 days', NOW() - INTERVAL '56 days' + INTERVAL '12 minutes', 720),

('session_priya_002', 'Priya Sharma', 2, 'swipe', 'Swiped 64 images - thoughtful decision making', 64,
  '{"Casual": 38, "Bohemian": 30, "Romantic": 20, "Minimal": 12}'::jsonb,
  '{"Casual": 44, "Bohemian": 28, "Romantic": 18, "Minimal": 10}'::jsonb,
  0.39, 0.66,
  '{"strengthened": ["Casual"], "insights": ["Saves before buying", "Price conscious"]}'::jsonb,
  18,
  NOW() - INTERVAL '41 days', NOW() - INTERVAL '41 days' + INTERVAL '13 minutes', 780);


-- PERSONA 8: Sarah Martinez (Minimal/Classic/Romantic)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_sarah_001', 'Sarah Martinez', 1, 'quiz', 'Initial quiz - minimal classic aesthetic established', 50,
  NULL,
  '{"Minimal": 42, "Classic": 28, "Romantic": 18, "Modern": 12}'::jsonb,
  NULL, 0.43,
  '{"added": ["Minimal", "Classic", "Romantic"], "insights": ["High engagement", "Loves curation"]}'::jsonb,
  12,
  NOW() - INTERVAL '62 days', NOW() - INTERVAL '62 days' + INTERVAL '14 minutes', 840),

('session_sarah_002', 'Sarah Martinez', 2, 'swipe', 'Swiped 85 images - very active user', 85,
  '{"Minimal": 42, "Classic": 28, "Romantic": 18, "Modern": 12}'::jsonb,
  '{"Minimal": 50, "Classic": 26, "Romantic": 16, "Modern": 8}'::jsonb,
  0.43, 0.72,
  '{"strengthened": ["Minimal"], "insights": ["Frequent visitor", "Profile building rapidly"]}'::jsonb,
  22,
  NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days' + INTERVAL '16 minutes', 960),

('session_sarah_003', 'Sarah Martinez', 3, 'save', 'Saved 25 outfits - strong engagement signals', 25,
  '{"Minimal": 50, "Classic": 26, "Romantic": 16, "Modern": 8}'::jsonb,
  '{"Minimal": 54, "Classic": 24, "Romantic": 15, "Modern": 7}'::jsonb,
  0.72, 0.86,
  '{"occasions_identified": ["work", "weekend", "date"], "insights": ["Building complete wardrobe"]}'::jsonb,
  18,
  NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days' + INTERVAL '12 minutes', 720);


-- PERSONA 9: Tyler Chen (Minimal/Classic/Utility)
INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_tyler_001', 'Tyler Chen', 1, 'quiz', 'Quiz revealed minimal classic style', 38,
  NULL,
  '{"Minimal": 45, "Classic": 28, "Utility": 17, "Modern": 10}'::jsonb,
  NULL, 0.40,
  '{"added": ["Minimal", "Classic", "Utility"], "insights": ["Decisive buyer", "Knows what works"]}'::jsonb,
  9,
  NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days' + INTERVAL '9 minutes', 540),

('session_tyler_002', 'Tyler Chen', 2, 'swipe', 'Swiped 42 images - consistent preferences', 42,
  '{"Minimal": 45, "Classic": 28, "Utility": 17, "Modern": 10}'::jsonb,
  '{"Minimal": 52, "Classic": 26, "Utility": 15, "Modern": 7}'::jsonb,
  0.40, 0.67,
  '{"strengthened": ["Minimal"], "insights": ["Repeat purchase behavior", "Brand loyal"]}'::jsonb,
  13,
  NOW() - INTERVAL '34 days', NOW() - INTERVAL '34 days' + INTERVAL '8 minutes', 480);


-- Verify session counts
SELECT
  cs.customer_id,
  COUNT(*) as session_count,
  MIN(session_number) as first_session,
  MAX(session_number) as last_session,
  MIN(confidence_after) as initial_confidence,
  MAX(confidence_after) as current_confidence,
  SUM(signals_added) as total_signals
FROM customer_sessions cs
GROUP BY cs.customer_id
ORDER BY cs.customer_id;
