-- Create customer_sessions table to track style intelligence progression
-- A "session" is a chunk of customer activity that updates the style brain

CREATE TABLE IF NOT EXISTS customer_sessions (
  session_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  session_type TEXT NOT NULL, -- 'quiz', 'swipe', 'chat', 'save', 'outfit_edit', 'product_like', 'style_feedback'

  -- Activity summary
  activity_summary TEXT, -- Human-readable description
  signals_added INTEGER NOT NULL DEFAULT 0,

  -- Style intelligence snapshots (before → after)
  pillars_before JSONB,
  pillars_after JSONB NOT NULL,
  confidence_before NUMERIC(3,2),
  confidence_after NUMERIC(3,2) NOT NULL,

  -- What changed
  changes_summary JSONB, -- { added: [...], strengthened: [...], weakened: [...] }

  -- New lifestyle images unlocked (as confidence grows, we show more images)
  lifestyle_images_unlocked TEXT[], -- Array of lifestyle_image IDs
  images_unlocked_count INTEGER DEFAULT 0,

  -- Session metadata
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  duration_seconds INTEGER,

  -- Constraints
  CONSTRAINT valid_session_type CHECK (
    session_type IN ('quiz', 'swipe', 'chat', 'save', 'outfit_edit', 'product_like', 'style_feedback')
  ),
  CONSTRAINT valid_confidence CHECK (
    confidence_before IS NULL OR (confidence_before >= 0 AND confidence_before <= 1)
  ),
  CONSTRAINT valid_confidence_after CHECK (
    confidence_after >= 0 AND confidence_after <= 1
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer_number ON customer_sessions(customer_id, session_number);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON customer_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON customer_sessions(completed_at DESC);

-- Enable RLS
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access (for demo)
DROP POLICY IF EXISTS "Public read access for sessions" ON customer_sessions;
CREATE POLICY "Public read access for sessions"
  ON customer_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can insert their own sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON customer_sessions;
CREATE POLICY "Users can create own sessions"
  ON customer_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================
-- POPULATE SAMPLE SESSION DATA FOR PERSONAS
-- ============================================

-- Helper function to generate session timestamps
-- Session 1: 60 days ago, Session 2: 45 days ago, Session 3: 30 days ago, etc.

-- ============================================
-- PERSONA 1: Sarah Chen (Minimal Maven)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

-- Session 1: Style Quiz (Initial)
('session_sarah_001', 'sarah_chen_001', 1, 'quiz', 'Completed initial style quiz - established minimalist preferences', 42,
  NULL,
  '{"Minimal": 45, "Classic": 30, "Modern": 15, "Casual": 10}'::jsonb,
  NULL, 0.35,
  '{"added": ["Minimal", "Classic", "Modern"], "insights": ["Prefers clean lines", "Neutral colors", "Timeless pieces"]}'::jsonb,
  8,
  NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days' + INTERVAL '12 minutes', 720),

-- Session 2: First Swipe Session
('session_sarah_002', 'sarah_chen_001', 2, 'swipe', 'Swiped on 50 lifestyle images - refined minimal aesthetic', 50,
  '{"Minimal": 45, "Classic": 30, "Modern": 15, "Casual": 10}'::jsonb,
  '{"Minimal": 52, "Classic": 28, "Modern": 12, "Casual": 8}'::jsonb,
  0.35, 0.58,
  '{"strengthened": ["Minimal"], "weakened": ["Modern", "Casual"], "insights": ["Strong monochrome preference", "Dislikes busy patterns"]}'::jsonb,
  12,
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days' + INTERVAL '8 minutes', 480),

-- Session 3: Product Likes
('session_sarah_003', 'sarah_chen_001', 3, 'product_like', 'Liked 28 products - confirmed brand and price preferences', 28,
  '{"Minimal": 52, "Classic": 28, "Modern": 12, "Casual": 8}'::jsonb,
  '{"Minimal": 55, "Classic": 26, "Modern": 11, "Casual": 8}'::jsonb,
  0.58, 0.72,
  '{"brands_discovered": ["Everlane", "COS", "The Row"], "price_range_established": "80-400", "insights": ["Quality over quantity"]}'::jsonb,
  15,
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '15 minutes', 900),

-- Session 4: Outfit Saves
('session_sarah_004', 'sarah_chen_001', 4, 'save', 'Saved 12 outfits to favorites - refined occasion preferences', 12,
  '{"Minimal": 55, "Classic": 26, "Modern": 11, "Casual": 8}'::jsonb,
  '{"Minimal": 58, "Classic": 25, "Modern": 10, "Casual": 7}'::jsonb,
  0.72, 0.81,
  '{"occasions_identified": ["work", "weekend", "evening"], "insights": ["Versatile wardrobe focus"]}'::jsonb,
  10,
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '6 minutes', 360),

-- Session 5: Chat Interaction
('session_sarah_005', 'sarah_chen_001', 5, 'chat', 'Chat about sustainable fashion - added semantic memory', 8,
  '{"Minimal": 58, "Classic": 25, "Modern": 10, "Casual": 7}'::jsonb,
  '{"Minimal": 60, "Classic": 24, "Modern": 10, "Casual": 6}'::jsonb,
  0.81, 0.89,
  '{"semantic_memory_added": ["Sustainable fashion values", "Tech industry professional", "Urban lifestyle"], "insights": ["Ethical sourcing important"]}'::jsonb,
  8,
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '10 minutes', 600);


-- ============================================
-- PERSONA 2: Marcus Thompson (Street Style Icon)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_marcus_001', 'marcus_thompson_002', 1, 'quiz', 'Initial style quiz - streetwear foundation established', 38,
  NULL,
  '{"Streetwear": 40, "Athletic": 25, "Casual": 20, "Modern": 15}'::jsonb,
  NULL, 0.32,
  '{"added": ["Streetwear", "Athletic", "Casual"], "insights": ["Sneaker culture", "Bold graphics", "Urban aesthetic"]}'::jsonb,
  10,
  NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days' + INTERVAL '10 minutes', 600),

('session_marcus_002', 'marcus_thompson_002', 2, 'swipe', 'Swiped through 65 lifestyle images - strong urban preferences emerged', 65,
  '{"Streetwear": 40, "Athletic": 25, "Casual": 20, "Modern": 15}'::jsonb,
  '{"Streetwear": 48, "Athletic": 22, "Casual": 18, "Modern": 12}'::jsonb,
  0.32, 0.61,
  '{"strengthened": ["Streetwear"], "insights": ["Limited edition focus", "Brand loyalty to Supreme/Off-White", "Bold colorways"]}'::jsonb,
  18,
  NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days' + INTERVAL '12 minutes', 720),

('session_marcus_003', 'marcus_thompson_002', 3, 'product_like', 'Liked 42 products - sneaker and outerwear preferences confirmed', 42,
  '{"Streetwear": 48, "Athletic": 22, "Casual": 18, "Modern": 12}'::jsonb,
  '{"Streetwear": 53, "Athletic": 20, "Casual": 17, "Modern": 10}'::jsonb,
  0.61, 0.78,
  '{"brands_discovered": ["Nike", "Stüssy", "Carhartt WIP"], "price_range": "100-600", "insights": ["Investment pieces for collection"]}'::jsonb,
  14,
  NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days' + INTERVAL '18 minutes', 1080),

('session_marcus_004', 'marcus_thompson_002', 4, 'chat', 'Discussed sneaker collection and style evolution', 12,
  '{"Streetwear": 53, "Athletic": 20, "Casual": 17, "Modern": 10}'::jsonb,
  '{"Streetwear": 56, "Athletic": 19, "Casual": 16, "Modern": 9}'::jsonb,
  0.78, 0.86,
  '{"semantic_memory_added": ["Sneakerhead", "Limited drops", "Fashion/function balance"], "insights": ["Cultural connection to streetwear"]}'::jsonb,
  12,
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '14 minutes', 840);


-- ============================================
-- PERSONA 3: Elena Rodriguez (Bohemian Dreamer)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_elena_001', 'elena_rodriguez_003', 1, 'quiz', 'Style quiz revealed bohemian aesthetic with romantic elements', 45,
  NULL,
  '{"Bohemian": 38, "Romantic": 28, "Casual": 20, "Natural": 14}'::jsonb,
  NULL, 0.38,
  '{"added": ["Bohemian", "Romantic", "Casual"], "insights": ["Flowing fabrics", "Earthy tones", "Artisanal details"]}'::jsonb,
  12,
  NOW() - INTERVAL '58 days', NOW() - INTERVAL '58 days' + INTERVAL '15 minutes', 900),

('session_elena_002', 'elena_rodriguez_003', 2, 'swipe', 'Swiped 72 images - strong affinity for natural fibers and earthy palettes', 72,
  '{"Bohemian": 38, "Romantic": 28, "Casual": 20, "Natural": 14}'::jsonb,
  '{"Bohemian": 46, "Romantic": 26, "Casual": 18, "Natural": 10}'::jsonb,
  0.38, 0.64,
  '{"strengthened": ["Bohemian"], "insights": ["Layering expert", "Texture over pattern", "Vintage influences"]}'::jsonb,
  20,
  NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days' + INTERVAL '14 minutes', 840),

('session_elena_003', 'elena_rodriguez_003', 3, 'save', 'Saved 18 outfits - festival and weekend style preferences', 18,
  '{"Bohemian": 46, "Romantic": 26, "Casual": 18, "Natural": 10}'::jsonb,
  '{"Bohemian": 50, "Romantic": 24, "Casual": 17, "Natural": 9}'::jsonb,
  0.64, 0.76,
  '{"occasions_identified": ["festival", "beach", "art gallery", "weekend"], "insights": ["Comfort-first philosophy"]}'::jsonb,
  16,
  NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '8 minutes', 480),

('session_elena_004', 'elena_rodriguez_003', 4, 'product_like', 'Liked 35 products - artisan brands and sustainable focus', 35,
  '{"Bohemian": 50, "Romantic": 24, "Casual": 17, "Natural": 9}'::jsonb,
  '{"Bohemian": 54, "Romantic": 23, "Casual": 16, "Natural": 7}'::jsonb,
  0.76, 0.85,
  '{"brands_discovered": ["Free People", "Spell", "Reformation"], "insights": ["Sustainability values", "Supporting small businesses"]}'::jsonb,
  14,
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '12 minutes', 720);


-- ============================================
-- PERSONA 4: James Park (Classic Gentleman)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_james_001', 'james_park_004', 1, 'quiz', 'Initial quiz - classic menswear foundation with professional focus', 40,
  NULL,
  '{"Classic": 42, "Professional": 28, "Timeless": 18, "Minimal": 12}'::jsonb,
  NULL, 0.40,
  '{"added": ["Classic", "Professional", "Timeless"], "insights": ["Tailored fit priority", "Investment pieces", "Heritage brands"]}'::jsonb,
  9,
  NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days' + INTERVAL '11 minutes', 660),

('session_james_002', 'james_park_004', 2, 'swipe', 'Swiped 45 images - refined suiting and smart casual preferences', 45,
  '{"Classic": 42, "Professional": 28, "Timeless": 18, "Minimal": 12}'::jsonb,
  '{"Classic": 48, "Professional": 26, "Timeless": 16, "Minimal": 10}'::jsonb,
  0.40, 0.66,
  '{"strengthened": ["Classic"], "insights": ["Navy and charcoal focus", "Quality fabrics", "Conservative patterns"]}'::jsonb,
  14,
  NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days' + INTERVAL '9 minutes', 540),

('session_james_003', 'james_park_004', 3, 'product_like', 'Liked 32 products - established suit and accessory preferences', 32,
  '{"Classic": 48, "Professional": 26, "Timeless": 16, "Minimal": 10}'::jsonb,
  '{"Classic": 52, "Professional": 24, "Timeless": 15, "Minimal": 9}'::jsonb,
  0.66, 0.79,
  '{"brands_discovered": ["Brooks Brothers", "Ralph Lauren", "Bonobos"], "price_range": "150-800", "insights": ["Quality over trends"]}'::jsonb,
  11,
  NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days' + INTERVAL '16 minutes', 960),

('session_james_004', 'james_park_004', 4, 'chat', 'Discussed work wardrobe versatility and weekend casual', 15,
  '{"Classic": 52, "Professional": 24, "Timeless": 15, "Minimal": 9}'::jsonb,
  '{"Classic": 55, "Professional": 23, "Timeless": 14, "Minimal": 8}'::jsonb,
  0.79, 0.88,
  '{"semantic_memory_added": ["Finance professional", "Client-facing role", "Weekend golfer"], "insights": ["Work-to-weekend transitions"]}'::jsonb,
  10,
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '12 minutes', 720);


-- ============================================
-- PERSONA 5: Zara Ahmed (Maximal Queen)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_zara_001', 'zara_ahmed_005', 1, 'quiz', 'Quiz revealed bold maximalist style with vibrant color preferences', 48,
  NULL,
  '{"Maximal": 45, "Bold": 25, "Dramatic": 18, "Modern": 12}'::jsonb,
  NULL, 0.36,
  '{"added": ["Maximal", "Bold", "Dramatic"], "insights": ["Color fearless", "Pattern mixing", "Statement pieces"]}'::jsonb,
  15,
  NOW() - INTERVAL '62 days', NOW() - INTERVAL '62 days' + INTERVAL '13 minutes', 780),

('session_zara_002', 'zara_ahmed_005', 2, 'swipe', 'Swiped 80 images - strong preference for vibrant prints and bold accessories', 80,
  '{"Maximal": 45, "Bold": 25, "Dramatic": 18, "Modern": 12}'::jsonb,
  '{"Maximal": 54, "Bold": 23, "Dramatic": 15, "Modern": 8}'::jsonb,
  0.36, 0.62,
  '{"strengthened": ["Maximal"], "insights": ["Jewel tones", "Metallic accents", "Layered jewelry"]}'::jsonb,
  22,
  NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days' + INTERVAL '15 minutes', 900),

('session_zara_003', 'zara_ahmed_005', 3, 'save', 'Saved 22 outfits - event and evening wear focus', 22,
  '{"Maximal": 54, "Bold": 23, "Dramatic": 15, "Modern": 8}'::jsonb,
  '{"Maximal": 58, "Bold": 21, "Dramatic": 14, "Modern": 7}'::jsonb,
  0.62, 0.75,
  '{"occasions_identified": ["evening_out", "cocktail", "party", "date_night"], "insights": ["Statement dressing"]}'::jsonb,
  18,
  NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days' + INTERVAL '10 minutes', 600),

('session_zara_004', 'zara_ahmed_005', 4, 'product_like', 'Liked 38 products - luxury and designer brand affinity', 38,
  '{"Maximal": 58, "Bold": 21, "Dramatic": 14, "Modern": 7}'::jsonb,
  '{"Maximal": 62, "Bold": 20, "Dramatic": 12, "Modern": 6}'::jsonb,
  0.75, 0.84,
  '{"brands_discovered": ["Zimmermann", "Alice + Olivia", "PatBO"], "price_range": "200-1200", "insights": ["Investment in statement pieces"]}'::jsonb,
  16,
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days' + INTERVAL '20 minutes', 1200),

('session_zara_005', 'zara_ahmed_005', 5, 'chat', 'Discussed personal brand and confidence through fashion', 10,
  '{"Maximal": 62, "Bold": 20, "Dramatic": 12, "Modern": 6}'::jsonb,
  '{"Maximal": 65, "Bold": 19, "Dramatic": 11, "Modern": 5}'::jsonb,
  0.84, 0.91,
  '{"semantic_memory_added": ["Fashion is self-expression", "Event planner", "Social butterfly"], "insights": ["Dressing for confidence"]}'::jsonb,
  12,
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '14 minutes', 840);


-- ============================================
-- PERSONA 6: David Kim (Athletic Achiever)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_david_001', 'david_kim_006', 1, 'quiz', 'Quiz established athletic lifestyle with performance focus', 36,
  NULL,
  '{"Athletic": 48, "Casual": 25, "Modern": 17, "Minimal": 10}'::jsonb,
  NULL, 0.42,
  '{"added": ["Athletic", "Casual", "Modern"], "insights": ["Performance fabrics", "Function over form", "Active lifestyle"]}'::jsonb,
  11,
  NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days' + INTERVAL '9 minutes', 540),

('session_david_002', 'david_kim_006', 2, 'swipe', 'Swiped 55 images - athleisure and technical wear preferences', 55,
  '{"Athletic": 48, "Casual": 25, "Modern": 17, "Minimal": 10}'::jsonb,
  '{"Athletic": 56, "Casual": 22, "Modern": 14, "Minimal": 8}'::jsonb,
  0.42, 0.68,
  '{"strengthened": ["Athletic"], "insights": ["Gym-to-street versatility", "Moisture-wicking fabrics", "Minimalist design"]}'::jsonb,
  16,
  NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days' + INTERVAL '11 minutes', 660),

('session_david_003', 'david_kim_006', 3, 'product_like', 'Liked 40 products - technical sportswear and sneakers', 40,
  '{"Athletic": 56, "Casual": 22, "Modern": 14, "Minimal": 8}'::jsonb,
  '{"Athletic": 62, "Casual": 20, "Modern": 12, "Minimal": 6}'::jsonb,
  0.68, 0.82,
  '{"brands_discovered": ["Lululemon", "Nike", "Rhone", "Outdoor Voices"], "price_range": "80-350", "insights": ["Quality activewear investment"]}'::jsonb,
  14,
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '14 minutes', 840),

('session_david_004', 'david_kim_006', 4, 'chat', 'Discussed marathon training and versatile wardrobe needs', 12,
  '{"Athletic": 62, "Casual": 20, "Modern": 12, "Minimal": 6}'::jsonb,
  '{"Athletic": 65, "Casual": 19, "Modern": 11, "Minimal": 5}'::jsonb,
  0.82, 0.90,
  '{"semantic_memory_added": ["Marathon runner", "Gym 5x/week", "Tech startup environment"], "insights": ["Performance-driven choices"]}'::jsonb,
  10,
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '10 minutes', 600);


-- ============================================
-- PERSONA 7: Priya Sharma (Romantic Aesthete)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_priya_001', 'priya_sharma_007', 1, 'quiz', 'Quiz revealed romantic style with feminine details', 44,
  NULL,
  '{"Romantic": 42, "Feminine": 28, "Classic": 18, "Minimal": 12}'::jsonb,
  NULL, 0.37,
  '{"added": ["Romantic", "Feminine", "Classic"], "insights": ["Soft colors", "Delicate fabrics", "Vintage inspiration"]}'::jsonb,
  13,
  NOW() - INTERVAL '56 days', NOW() - INTERVAL '56 days' + INTERVAL '12 minutes', 720),

('session_priya_002', 'priya_sharma_007', 2, 'swipe', 'Swiped 68 images - refined romantic aesthetic with lace and florals', 68,
  '{"Romantic": 42, "Feminine": 28, "Classic": 18, "Minimal": 12}'::jsonb,
  '{"Romantic": 50, "Feminine": 26, "Classic": 16, "Minimal": 8}'::jsonb,
  0.37, 0.63,
  '{"strengthened": ["Romantic"], "insights": ["Blush and pastels", "Floral prints", "Flowing silhouettes"]}'::jsonb,
  19,
  NOW() - INTERVAL '41 days', NOW() - INTERVAL '41 days' + INTERVAL '13 minutes', 780),

('session_priya_003', 'priya_sharma_007', 3, 'save', 'Saved 20 outfits - date night and special occasion focus', 20,
  '{"Romantic": 50, "Feminine": 26, "Classic": 16, "Minimal": 8}'::jsonb,
  '{"Romantic": 54, "Feminine": 24, "Classic": 15, "Minimal": 7}'::jsonb,
  0.63, 0.77,
  '{"occasions_identified": ["date_night", "brunch", "garden_party", "wedding_guest"], "insights": ["Feminine grace"]}'::jsonb,
  17,
  NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days' + INTERVAL '9 minutes', 540),

('session_priya_004', 'priya_sharma_007', 4, 'product_like', 'Liked 30 products - indie and contemporary romantic brands', 30,
  '{"Romantic": 54, "Feminine": 24, "Classic": 15, "Minimal": 7}'::jsonb,
  '{"Romantic": 58, "Feminine": 23, "Classic": 13, "Minimal": 6}'::jsonb,
  0.77, 0.87,
  '{"brands_discovered": ["Reformation", "Hill House", "Christy Dawn"], "price_range": "100-450", "insights": ["Sustainable romanticism"]}'::jsonb,
  15,
  NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '11 minutes', 660);


-- ============================================
-- PERSONA 8: Oliver Chen (Utility Expert)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_oliver_001', 'oliver_chen_008', 1, 'quiz', 'Quiz identified utilitarian aesthetic with outdoor focus', 40,
  NULL,
  '{"Utility": 44, "Casual": 26, "Outdoor": 18, "Minimal": 12}'::jsonb,
  NULL, 0.39,
  '{"added": ["Utility", "Casual", "Outdoor"], "insights": ["Functional design", "Durable fabrics", "Multi-pocket preference"]}'::jsonb,
  10,
  NOW() - INTERVAL '54 days', NOW() - INTERVAL '54 days' + INTERVAL '10 minutes', 600),

('session_oliver_002', 'oliver_chen_008', 2, 'swipe', 'Swiped 58 images - workwear and technical fabric preferences', 58,
  '{"Utility": 44, "Casual": 26, "Outdoor": 18, "Minimal": 12}'::jsonb,
  '{"Utility": 52, "Casual": 24, "Outdoor": 16, "Minimal": 8}'::jsonb,
  0.39, 0.65,
  '{"strengthened": ["Utility"], "insights": ["Cargo details", "Earth tones", "Weather-resistant"]}'::jsonb,
  17,
  NOW() - INTERVAL '39 days', NOW() - INTERVAL '39 days' + INTERVAL '12 minutes', 720),

('session_oliver_003', 'oliver_chen_008', 3, 'product_like', 'Liked 35 products - workwear brands and outdoor gear', 35,
  '{"Utility": 52, "Casual": 24, "Outdoor": 16, "Minimal": 8}'::jsonb,
  '{"Utility": 57, "Casual": 22, "Outdoor": 14, "Minimal": 7}'::jsonb,
  0.65, 0.80,
  '{"brands_discovered": ["Carhartt", "Patagonia", "Arc\'teryx"], "price_range": "90-400", "insights": ["Buy it for life mentality"]}'::jsonb,
  13,
  NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days' + INTERVAL '15 minutes', 900),

('session_oliver_004', 'oliver_chen_008', 4, 'chat', 'Discussed hiking gear and urban utility style balance', 14,
  '{"Utility": 57, "Casual": 22, "Outdoor": 14, "Minimal": 7}'::jsonb,
  '{"Utility": 60, "Casual": 21, "Outdoor": 13, "Minimal": 6}'::jsonb,
  0.80, 0.89,
  '{"semantic_memory_added": ["Weekend hiker", "Photographer", "Urban outdoorsman"], "insights": ["Function meets urban style"]}'::jsonb,
  11,
  NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days' + INTERVAL '11 minutes', 660);


-- ============================================
-- PERSONA 9: Isabella Martinez (Casual Chic)
-- ============================================

INSERT INTO customer_sessions (session_id, customer_id, session_number, session_type, activity_summary, signals_added, pillars_before, pillars_after, confidence_before, confidence_after, changes_summary, images_unlocked_count, started_at, completed_at, duration_seconds) VALUES

('session_isabella_001', 'isabella_martinez_009', 1, 'quiz', 'Quiz showed casual style with effortless aesthetic', 38,
  NULL,
  '{"Casual": 46, "Minimal": 24, "Classic": 18, "Comfortable": 12}'::jsonb,
  NULL, 0.34,
  '{"added": ["Casual", "Minimal", "Classic"], "insights": ["Effortless style", "Comfort priority", "Versatile basics"]}'::jsonb,
  9,
  NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days' + INTERVAL '8 minutes', 480),

('session_isabella_002', 'isabella_martinez_009', 2, 'swipe', 'Swiped 62 images - refined casual-chic preferences', 62,
  '{"Casual": 46, "Minimal": 24, "Classic": 18, "Comfortable": 12}'::jsonb,
  '{"Casual": 52, "Minimal": 22, "Classic": 16, "Comfortable": 10}'::jsonb,
  0.34, 0.60,
  '{"strengthened": ["Casual"], "insights": ["Denim focus", "White tee enthusiast", "Simple jewelry"]}'::jsonb,
  18,
  NOW() - INTERVAL '33 days', NOW() - INTERVAL '33 days' + INTERVAL '10 minutes', 600),

('session_isabella_003', 'isabella_martinez_009', 3, 'save', 'Saved 16 outfits - everyday and weekend wear', 16,
  '{"Casual": 52, "Minimal": 22, "Classic": 16, "Comfortable": 10}'::jsonb,
  '{"Casual": 55, "Minimal": 21, "Classic": 15, "Comfortable": 9}'::jsonb,
  0.60, 0.73,
  '{"occasions_identified": ["everyday", "weekend", "casual_friday", "errands"], "insights": ["Uniform dressing philosophy"]}'::jsonb,
  14,
  NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days' + INTERVAL '7 minutes', 420),

('session_isabella_004', 'isabella_martinez_009', 4, 'product_like', 'Liked 28 products - denim and basics brands', 28,
  '{"Casual": 55, "Minimal": 21, "Classic": 15, "Comfortable": 9}'::jsonb,
  '{"Casual": 58, "Minimal": 20, "Classic": 14, "Comfortable": 8}'::jsonb,
  0.73, 0.83,
  '{"brands_discovered": ["Madewell", "Levi\'s", "Everlane"], "price_range": "50-250", "insights": ["Quality basics investment"]}'::jsonb,
  12,
  NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days' + INTERVAL '9 minutes', 540),

('session_isabella_005', 'isabella_martinez_009', 5, 'chat', 'Discussed capsule wardrobe and minimalist approach', 10,
  '{"Casual": 58, "Minimal": 20, "Classic": 14, "Comfortable": 8}'::jsonb,
  '{"Casual": 60, "Minimal": 19, "Classic": 13, "Comfortable": 8}'::jsonb,
  0.83, 0.88,
  '{"semantic_memory_added": ["Mom of two", "Work-from-home", "Minimalist mindset"], "insights": ["Practical style choices"]}'::jsonb,
  10,
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '8 minutes', 480);


-- ============================================
-- SUMMARY STATS
-- ============================================

-- Verify session counts per persona
SELECT
  customer_id,
  COUNT(*) as session_count,
  MIN(session_number) as first_session,
  MAX(session_number) as last_session,
  MIN(confidence_after) as initial_confidence,
  MAX(confidence_after) as current_confidence,
  SUM(signals_added) as total_signals
FROM customer_sessions
GROUP BY customer_id
ORDER BY customer_id;
