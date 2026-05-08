-- Add missing columns to lifestyle_images table

ALTER TABLE lifestyle_images
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB;

COMMENT ON COLUMN lifestyle_images.reasoning IS 'AI reasoning for style pillar categorization';
COMMENT ON COLUMN lifestyle_images.tags IS 'Additional metadata and analysis data';
