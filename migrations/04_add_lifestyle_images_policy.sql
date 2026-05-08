-- Add public read access to lifestyle_images table
-- This allows the admin interface to display images
-- RUN THIS AFTER: 05_create_lifestyle_images_table.sql

-- Enable RLS
ALTER TABLE lifestyle_images ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read access for lifestyle_images" ON lifestyle_images;

CREATE POLICY "Public read access for lifestyle_images"
  ON lifestyle_images
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow service role to do everything (insert, update, delete)
DROP POLICY IF EXISTS "Service role full access for lifestyle_images" ON lifestyle_images;

CREATE POLICY "Service role full access for lifestyle_images"
  ON lifestyle_images
  FOR ALL
  TO service_role
  USING (true);
