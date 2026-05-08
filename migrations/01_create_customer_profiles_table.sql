-- ============================================================================
-- Customer Profiles Table
-- Stores processed profile data (output from Profile Brain)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_profiles (
  -- Identity
  customer_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT,
  gender TEXT CHECK (gender IN ('womenswear', 'menswear', 'all')) DEFAULT 'all',

  -- Style Pillars (percentages, should sum to ~100)
  pillars JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Brand Affinity
  brand_affinity JSONB DEFAULT '[]'::JSONB,
  -- Structure: [{ brand, score, confidence, sources, lastSignal }]

  -- Price Intelligence
  price_range JSONB DEFAULT '{"low": null, "high": null, "sweet": null, "confidence": "none"}'::JSONB,
  -- Structure: { low, high, sweet, confidence }

  -- Preferences
  fit_preferences JSONB DEFAULT '{"liked": [], "disliked": []}'::JSONB,
  -- Structure: { liked: [], disliked: [] }

  fabric_preferences JSONB DEFAULT '{"liked": [], "disliked": []}'::JSONB,
  -- Structure: { liked: [], disliked: [] }

  color_affinity JSONB DEFAULT '{}'::JSONB,
  -- Structure: { black: 100, navy: 85, ... }

  -- Negatives (strong dislikes)
  negatives JSONB DEFAULT '[]'::JSONB,
  -- Structure: [{ type, value, strength, source, timestamp }]

  -- Semantic Memory (legacy field - moved to separate table)
  -- Kept for backward compatibility but should use semantic_memories table
  semantic_memory JSONB DEFAULT '[]'::JSONB,

  -- Life Context
  life_context JSONB DEFAULT '{"hobbies": [], "family": [], "professional": [], "other": []}'::JSONB,
  -- Structure: { hobbies, family, professional, other }

  -- Style Personality (generated narrative)
  style_personality TEXT,

  -- Confidence & Metadata
  confidence_score FLOAT DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sessions_processed INT DEFAULT 0,
  total_signals INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_confidence
  ON customer_profiles (confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_updated
  ON customer_profiles (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_gender
  ON customer_profiles (gender);

-- ============================================================================
-- Indexes for JSONB Queries
-- ============================================================================

-- GIN indexes for JSONB columns (for efficient querying)
CREATE INDEX IF NOT EXISTS idx_customer_profiles_pillars_gin
  ON customer_profiles USING GIN (pillars);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_color_affinity_gin
  ON customer_profiles USING GIN (color_affinity);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_brand_affinity_gin
  ON customer_profiles USING GIN (brand_affinity);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_profiles_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY customer_profiles_select_own
  ON customer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = customer_id);

-- Policy: Users can insert their own profile
CREATE POLICY customer_profiles_insert_own
  ON customer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = customer_id);

-- Policy: Users can update their own profile
CREATE POLICY customer_profiles_update_own
  ON customer_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = customer_id);

-- Policy: Public read access for demo personas
-- Demo personas have customer_id starting with 'persona_'
CREATE POLICY customer_profiles_select_demo
  ON customer_profiles
  FOR SELECT
  TO anon, authenticated
  USING (customer_id LIKE 'persona_%');

-- Policy: Service role (backend) can access all profiles
CREATE POLICY customer_profiles_service_all
  ON customer_profiles
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get profile summary
CREATE OR REPLACE FUNCTION get_profile_summary(p_customer_id TEXT)
RETURNS TABLE (
  customer_id TEXT,
  customer_name TEXT,
  top_pillars JSONB,
  confidence_score FLOAT,
  sessions_processed INT,
  last_interaction_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.customer_id,
    cp.customer_name,
    jsonb_build_object(
      'pillars', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(cp.pillars) AS p(key, value)
        ORDER BY (value::text)::numeric DESC
        LIMIT 3
      )
    ) as top_pillars,
    cp.confidence_score,
    cp.sessions_processed,
    cp.last_interaction_at
  FROM customer_profiles cp
  WHERE cp.customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update profile confidence based on signals
CREATE OR REPLACE FUNCTION calculate_profile_confidence(
  p_sessions_processed INT,
  p_total_signals INT,
  p_pillar_count INT
)
RETURNS FLOAT AS $$
DECLARE
  base_score FLOAT;
  pillar_bonus FLOAT;
  session_bonus FLOAT;
  final_score FLOAT;
BEGIN
  -- Base score from signals (max 50%)
  base_score := LEAST(p_total_signals::FLOAT / 100.0, 0.5);

  -- Pillar diversity bonus (max 20%)
  pillar_bonus := 0;
  IF p_pillar_count >= 3 THEN pillar_bonus := pillar_bonus + 0.1; END IF;
  IF p_pillar_count >= 5 THEN pillar_bonus := pillar_bonus + 0.1; END IF;

  -- Session volume bonus (max 10%)
  session_bonus := 0;
  IF p_sessions_processed > 5 THEN session_bonus := session_bonus + 0.05; END IF;
  IF p_sessions_processed > 10 THEN session_bonus := session_bonus + 0.05; END IF;

  final_score := base_score + pillar_bonus + session_bonus;

  RETURN LEAST(final_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (Demo Personas)
-- ============================================================================

-- Uncomment to insert sample demo personas
/*
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
) VALUES
(
  'persona_minimal_maya',
  'Maya Kim',
  'womenswear',
  '{"minimal": 45, "classic": 35, "casual": 20}'::JSONB,
  '{"black": 100, "neutral": 90, "navy": 75, "white": 85}'::JSONB,
  'Maya''s style leans Minimal and Classic, with a strong affinity for black and neutral tones. This profile is well-established with strong, consistent signals.',
  0.85,
  12,
  245
),
(
  'persona_romantic_rose',
  'Rose Chen',
  'womenswear',
  '{"romantic": 50, "bohemian": 30, "maximal": 20}'::JSONB,
  '{"pink": 95, "floral": 90, "cream": 80, "rose": 100}'::JSONB,
  'Rose''s style leans Romantic and Bohemian, with a strong affinity for pink and floral tones. This profile is well-established with strong, consistent signals.',
  0.88,
  15,
  298
);
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'customer_profiles'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'customer_profiles';

-- Check RLS policies
-- SELECT policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'customer_profiles';

-- ============================================================================
-- Notes
-- ============================================================================

/*
STRUCTURE NOTES:

1. JSONB Fields:
   - pillars: { minimal: 45, classic: 35, ... }
   - brand_affinity: [{ brand: "Everlane", score: 8, ... }]
   - price_range: { low: 50, high: 200, sweet: 120, confidence: "high" }
   - fit_preferences: { liked: ["loose", "relaxed"], disliked: ["tight"] }
   - color_affinity: { black: 100, navy: 85, ... }
   - negatives: [{ type: "pillar", value: "maximal", strength: "strong", ... }]
   - life_context: { hobbies: ["skiing"], family: ["twins"], ... }

2. Confidence Score Calculation:
   - Base: signal count / 100 (max 0.5)
   - Pillar diversity: +0.1 if 3+ pillars, +0.1 if 5+ pillars
   - Session volume: +0.05 if 5+ sessions, +0.05 if 10+ sessions
   - Max: 1.0

3. Demo Personas:
   - customer_id starts with 'persona_'
   - Publicly readable via RLS policy
   - Used for demo/presentation mode

4. Semantic Memory:
   - Legacy field kept for backward compatibility
   - New memories should use semantic_memories table
   - This field may be deprecated in future
*/
