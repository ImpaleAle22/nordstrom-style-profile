-- ============================================
-- Add public read access to lifestyle_images
-- ============================================

-- Lifestyle Images: Allow anonymous read access for active images
DROP POLICY IF EXISTS "Public read access for active lifestyle images" ON lifestyle_images;

CREATE POLICY "Public read access for active lifestyle images"
  ON lifestyle_images
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Verify the policy was created
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd as "Command"
FROM pg_policies
WHERE tablename = 'lifestyle_images'
ORDER BY policyname;
