-- Add Smart Confidence Scoring Columns to Products Table
-- Run this in Supabase SQL Editor before uploading extracted attributes

-- Add extraction metadata columns
ALTER TABLE products
ADD COLUMN IF NOT EXISTS extraction_source TEXT,
ADD COLUMN IF NOT EXISTS extraction_method TEXT,
ADD COLUMN IF NOT EXISTS overall_confidence INTEGER;

-- Add per-attribute confidence and source columns
ALTER TABLE products
ADD COLUMN IF NOT EXISTS materials_confidence INTEGER,
ADD COLUMN IF NOT EXISTS materials_source TEXT,
ADD COLUMN IF NOT EXISTS fit_confidence INTEGER,
ADD COLUMN IF NOT EXISTS fit_source TEXT,
ADD COLUMN IF NOT EXISTS neckline_confidence INTEGER,
ADD COLUMN IF NOT EXISTS neckline_source TEXT,
ADD COLUMN IF NOT EXISTS sleeve_style_confidence INTEGER,
ADD COLUMN IF NOT EXISTS sleeve_style_source TEXT,
ADD COLUMN IF NOT EXISTS silhouette_confidence INTEGER,
ADD COLUMN IF NOT EXISTS silhouette_source TEXT,
ADD COLUMN IF NOT EXISTS waistline_confidence INTEGER,
ADD COLUMN IF NOT EXISTS waistline_source TEXT,
ADD COLUMN IF NOT EXISTS details_confidence INTEGER,
ADD COLUMN IF NOT EXISTS details_source TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.extraction_source IS 'Source of attribute extraction: rules-description, ai-vision, etc.';
COMMENT ON COLUMN products.extraction_method IS 'Extraction method: hybrid-ready, rules-only, ai-only';
COMMENT ON COLUMN products.overall_confidence IS 'Overall confidence score (0-100) for all extracted attributes';

-- Create index on overall_confidence for filtering low-confidence products
CREATE INDEX IF NOT EXISTS idx_products_overall_confidence ON products(overall_confidence);

-- Create index on extraction_source for querying by source
CREATE INDEX IF NOT EXISTS idx_products_extraction_source ON products(extraction_source);

SELECT 'Migration complete! New columns added to products table.' AS status;
