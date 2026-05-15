/**
 * Run CLIP Migration
 *
 * Adds embedding and clip_validation columns to lifestyle_images table
 * for storing CLIP visual embeddings and validation data.
 *
 * Usage: node scripts/run-clip-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting CLIP migration...\n');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  try {
    // Check if table exists
    console.log('1️⃣ Checking lifestyle_images table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('lifestyle_images')
      .select('id')
      .limit(1);

    if (tableError) {
      throw new Error(`Table check failed: ${tableError.message}`);
    }

    console.log('   ✅ Table exists\n');

    // Since we can't run ALTER TABLE directly via Supabase client,
    // we'll use the SQL editor approach or provide manual instructions
    console.log('⚠️  Note: Column additions require SQL editor access\n');
    console.log('📋 Please run the following SQL in Supabase SQL Editor:\n');
    console.log('   Dashboard → SQL Editor → New Query\n');
    console.log('═'.repeat(60));
    console.log(`
-- Add CLIP embedding column (JSONB format)
ALTER TABLE lifestyle_images
ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Add CLIP validation metadata
ALTER TABLE lifestyle_images
ADD COLUMN IF NOT EXISTS clip_validation JSONB;

-- Create index on confidence for filtering
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_clip_confidence
ON lifestyle_images ((clip_validation->>'confidence'));

-- Create index on similarity for sorting
CREATE INDEX IF NOT EXISTS idx_lifestyle_images_clip_similarity
ON lifestyle_images (((clip_validation->>'similarity')::float));

-- Add comments
COMMENT ON COLUMN lifestyle_images.embedding IS 'CLIP FashionSigLIP embedding (768D vector) stored as JSON array';
COMMENT ON COLUMN lifestyle_images.clip_validation IS 'CLIP validation data: {similarity: float, confidence: string, topPillars: array}';
`);
    console.log('═'.repeat(60));
    console.log('\n✅ Copy and paste the SQL above into Supabase SQL Editor');
    console.log('   URL: https://supabase.com/dashboard/project/slsrksnenvagilmdwxka/sql\n');

    // Alternative: Try to test if columns already exist
    console.log('🔍 Checking if columns already exist...');
    const { data: testData, error: testError } = await supabase
      .from('lifestyle_images')
      .select('embedding, clip_validation')
      .limit(1);

    if (!testError) {
      console.log('   ✅ Columns already exist! Migration not needed.\n');
      console.log('📊 CLIP fields ready to use:');
      console.log('   - embedding (JSONB) - Stores 768D CLIP vectors');
      console.log('   - clip_validation (JSONB) - Stores similarity, confidence, topPillars\n');
    } else {
      console.log(`   ❌ Columns don't exist yet: ${testError.message}`);
      console.log('   👆 Run the SQL above to add them\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration();
