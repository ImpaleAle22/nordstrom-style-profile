-- Fix formality_level column to accept decimals
-- The data has values like 3.5, 6.5 but column is INTEGER

ALTER TABLE lifestyle_images
ALTER COLUMN formality_level TYPE DECIMAL(3,1);

-- Update the constraint
ALTER TABLE lifestyle_images
DROP CONSTRAINT IF EXISTS valid_formality;

ALTER TABLE lifestyle_images
ADD CONSTRAINT valid_formality CHECK (formality_level >= 0 AND formality_level <= 10);
