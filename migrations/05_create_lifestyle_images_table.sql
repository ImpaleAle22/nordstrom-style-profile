-- Lifestyle Images Table
-- Stores tagged lifestyle fashion photography from Pexels/Unsplash
-- Used for Style Swipes, Style Profile visuals, and contextual examples

CREATE TABLE IF NOT EXISTS lifestyle_images (
  -- Identity
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  source TEXT, -- 'stock-pexels', 'stock-unsplash'

  -- Outfit Analysis (from Recipe Builder tagging)
  style_pillar TEXT NOT NULL, -- 'romantic', 'minimal', 'classic', etc.
  sub_term TEXT, -- 'Feminine', 'Modern Minimal', etc.
  spectrum_coordinate INTEGER, -- 1-10 position on style spectrum
  pillar_confidence DECIMAL(3,2), -- 0.00-1.00

  -- Vibes & Occasions
  vibes TEXT[] DEFAULT '{}', -- ['Romantic', 'Dreamy', 'Delicate']
  occasions TEXT[] DEFAULT '{}', -- ['Date Night', 'Brunch', 'Vacation']

  -- Context Attributes
  formality_level INTEGER, -- 0-10 scale
  season TEXT[] DEFAULT '{}', -- ['spring', 'summer', 'fall', 'winter', 'all-season']
  gender TEXT NOT NULL, -- 'womenswear', 'menswear'

  -- Complete Outfit Details
  is_complete_outfit BOOLEAN DEFAULT false,
  visible_item_count INTEGER,

  -- Brand Adherence
  brand_adherence_score INTEGER, -- 0-100
  is_art_directed BOOLEAN DEFAULT false,
  image_tone TEXT, -- 'aspirational', 'lifestyle', 'editorial'

  -- Metadata
  reasoning TEXT, -- AI reasoning for categorization
  tags JSONB, -- Additional metadata and analysis
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'rejected'

  CONSTRAINT valid_formality CHECK (formality_level >= 0 AND formality_level <= 10),
  CONSTRAINT valid_brand_score CHECK (brand_adherence_score >= 0 AND brand_adherence_score <= 100),
  CONSTRAINT valid_gender CHECK (gender IN ('womenswear', 'menswear')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'rejected'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_pillar ON lifestyle_images(style_pillar);
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_gender ON lifestyle_images(gender);
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_status ON lifestyle_images(status);
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_brand_score ON lifestyle_images(brand_adherence_score);
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_vibes ON lifestyle_images USING GIN(vibes);
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_occasions ON lifestyle_images USING GIN(occasions);
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_season ON lifestyle_images USING GIN(season);

-- Full-text search on sub_term
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_subterm ON lifestyle_images USING GIN(to_tsvector('english', COALESCE(sub_term, '')));

COMMENT ON TABLE lifestyle_images IS 'Tagged lifestyle fashion photography for Style Swipes and visual examples';
COMMENT ON COLUMN lifestyle_images.spectrum_coordinate IS 'Position on 1-10 style spectrum within pillar';
COMMENT ON COLUMN lifestyle_images.brand_adherence_score IS 'How well image matches Nordstrom brand guidelines (0-100)';
