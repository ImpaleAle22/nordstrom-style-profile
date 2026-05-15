-- Migration: Add CLIP embedding and validation fields to lifestyle_images
-- Date: 2026-05-08
-- Description: Adds support for CLIP visual embeddings and pillar validation

-- Add embedding column (JSONB format for flexibility)
-- Can store 768-dimensional vector as JSON array
ALTER TABLE lifestyle_images
ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Add CLIP validation metadata
-- Stores similarity score, confidence level, and top matching pillars
ALTER TABLE lifestyle_images
ADD COLUMN IF NOT EXISTS clip_validation JSONB;

-- Create index on confidence for filtering queries
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_clip_confidence
ON lifestyle_images ((clip_validation->>'confidence'));

-- Create index on similarity for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_clip_similarity
ON lifestyle_images (((clip_validation->>'similarity')::float));

-- Add comment for documentation
COMMENT ON COLUMN lifestyle_images.embedding IS 'CLIP FashionSigLIP embedding (768D vector) stored as JSON array';
COMMENT ON COLUMN lifestyle_images.clip_validation IS 'CLIP validation data: {similarity: float, confidence: string, topPillars: array}';

-- Example query: Find high-confidence images
-- SELECT * FROM lifestyle_images
-- WHERE clip_validation->>'confidence' = 'high'
-- ORDER BY (clip_validation->>'similarity')::float DESC;

-- Example query: Find images with low confidence for review
-- SELECT image_url, style_pillar,
--        clip_validation->>'confidence' as clip_confidence,
--        clip_validation->>'similarity' as clip_similarity
-- FROM lifestyle_images
-- WHERE clip_validation->>'confidence' = 'low';


-- ====================================================================
-- ALTERNATIVE: Using pgvector for efficient similarity search
-- ====================================================================
-- Uncomment below to use pgvector instead of JSONB for embeddings
-- This enables fast vector similarity search but requires pgvector extension

-- -- Enable pgvector extension
-- CREATE EXTENSION IF NOT EXISTS vector;

-- -- Add embedding as vector type (more efficient for similarity search)
-- ALTER TABLE lifestyle_images
-- ADD COLUMN IF NOT EXISTS embedding_vector vector(768);

-- -- Create IVFFlat index for fast approximate similarity search
-- CREATE INDEX IF NOT EXISTS idx_lifestyle_images_embedding_vector
-- ON lifestyle_images
-- USING ivfflat (embedding_vector vector_cosine_ops)
-- WITH (lists = 100);

-- -- Function to find similar lifestyle images
-- CREATE OR REPLACE FUNCTION find_similar_lifestyle_images(
--   query_embedding vector(768),
--   similarity_threshold float DEFAULT 0.6,
--   limit_count int DEFAULT 20
-- )
-- RETURNS TABLE (
--   image_id text,
--   image_url text,
--   style_pillar text,
--   similarity float
-- ) AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     id::text,
--     lifestyle_images.image_url,
--     lifestyle_images.style_pillar,
--     1 - (embedding_vector <=> query_embedding) as similarity
--   FROM lifestyle_images
--   WHERE embedding_vector IS NOT NULL
--     AND 1 - (embedding_vector <=> query_embedding) >= similarity_threshold
--   ORDER BY embedding_vector <=> query_embedding
--   LIMIT limit_count;
-- END;
-- $$ LANGUAGE plpgsql;

-- Example usage with pgvector:
-- SELECT * FROM find_similar_lifestyle_images(
--   '[0.123, -0.456, ...]'::vector(768),
--   0.6,
--   10
-- );
