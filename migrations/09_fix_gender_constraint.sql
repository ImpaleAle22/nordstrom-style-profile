-- Fix gender constraint to allow 'unisex'
-- The data includes unisex images but constraint only allowed womenswear/menswear

ALTER TABLE lifestyle_images
DROP CONSTRAINT IF EXISTS valid_gender;

ALTER TABLE lifestyle_images
ADD CONSTRAINT valid_gender CHECK (gender IN ('womenswear', 'menswear', 'unisex'));
