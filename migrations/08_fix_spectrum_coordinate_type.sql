-- Fix spectrum_coordinate column to accept decimals
-- The data has values like 0.2, 2.3, etc but column is INTEGER

ALTER TABLE lifestyle_images
ALTER COLUMN spectrum_coordinate TYPE DECIMAL(3,1);
