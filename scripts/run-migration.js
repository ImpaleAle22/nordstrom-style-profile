/**
 * Run a Supabase migration
 * Usage: node scripts/run-migration.js migrations/14_add_feedback_interaction_types.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(migrationFile) {
  try {
    // Read migration file
    const sqlPath = path.resolve(process.cwd(), migrationFile);

    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Migration file not found:', sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Running migration:', migrationFile);
    console.log('');

    // Split by statement separator and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      // Skip comments
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_string: statement });

        if (error) {
          // Try direct execution for some commands
          console.log('⚠️  RPC failed, trying direct execution...');
          const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ sql_string: statement })
          });

          if (!result.ok) {
            throw new Error(`HTTP ${result.status}: ${await result.text()}`);
          }

          successCount++;
          console.log('✓ Statement executed');
        } else {
          successCount++;
          console.log('✓ Statement executed');
        }
      } catch (err) {
        console.error('✗ Error:', err.message);
        console.error('  Statement:', statement.substring(0, 100) + '...');
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✓ Successful: ${successCount}`);
    console.log(`   ✗ Failed: ${errorCount}`);

    if (errorCount === 0) {
      console.log('');
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('');
      console.log('⚠️  Migration completed with errors. Please review and fix manually.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.js <migration-file>');
  console.error('Example: node scripts/run-migration.js migrations/14_add_feedback_interaction_types.sql');
  process.exit(1);
}

runMigration(migrationFile);
