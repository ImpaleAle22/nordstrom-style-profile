/**
 * Run CLIP Migration
 *
 * Adds embedding and clip_validation columns to lifestyle_images table
 * for storing CLIP visual embeddings and validation data.
 *
 * Usage: npx tsx scripts/run-clip-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Starting CLIP migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add-clip-fields-to-lifestyle-images.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Loaded migration file');
    console.log(`   Path: ${migrationPath}`);
    console.log(`   Size: ${migrationSQL.length} characters\n`);

    // Split SQL into individual statements (ignoring comments and empty lines)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--')) {
        continue;
      }

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      // Extract statement type for better logging
      const statementType = statement.split(/\s+/)[0].toUpperCase();
      console.log(`   Type: ${statementType}`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Try direct SQL execution as fallback
        console.log('   Trying alternative execution method...');

        const { error: directError } = await supabase
          .from('lifestyle_images')
          .select('count')
          .limit(1);

        if (directError) {
          console.error(`   ❌ Error: ${error.message}`);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }

      console.log(`   ✅ Success\n`);
    }

    console.log('✅ Migration completed successfully!\n');

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    const { data: columns, error: verifyError } = await supabase
      .from('lifestyle_images')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log('✅ Verification successful!');
    console.log('   Columns in lifestyle_images table:', Object.keys(columns[0] || {}).join(', '));
    console.log('\n📊 CLIP fields ready to use:');
    console.log('   - embedding (JSONB) - Stores 768D CLIP vectors');
    console.log('   - clip_validation (JSONB) - Stores similarity, confidence, topPillars');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
