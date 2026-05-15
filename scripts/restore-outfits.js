#!/usr/bin/env node
/**
 * Restore Outfits from Backup
 *
 * Use this to rollback migration if something goes wrong
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function restoreOutfits() {
  console.log('🔄 Restore Outfits from Backup\n');

  // List available backups
  const backupDir = join(projectRoot, 'backups');
  if (!fs.existsSync(backupDir)) {
    console.error('❌ No backups directory found!');
    console.error('   Expected: ' + backupDir);
    process.exit(1);
  }

  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('outfits-backup-') && f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  if (backupFiles.length === 0) {
    console.error('❌ No backup files found!');
    console.error('   Run: node scripts/backup-outfits.js first');
    process.exit(1);
  }

  console.log('Available backups:\n');
  backupFiles.forEach((file, idx) => {
    const filepath = join(backupDir, file);
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const date = file.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] || 'unknown';
    console.log(`  ${idx + 1}. ${file}`);
    console.log(`     Size: ${sizeMB} MB`);
    console.log(`     Date: ${date.replace('T', ' ').replace(/-/g, ':')}`);
    console.log('');
  });

  // Use most recent backup (first in list)
  const backupFile = backupFiles[0];
  const backupPath = join(backupDir, backupFile);

  console.log(`Using most recent backup: ${backupFile}\n`);

  // Load backup
  console.log('📦 Loading backup...');
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  console.log(`✓ Loaded ${backupData.length} outfits from backup\n`);

  console.log('⚠️  This will OVERWRITE current outfit data in Supabase!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🚀 Starting restore...\n');

  // Update each outfit
  let restored = 0;
  let errors = 0;

  for (const outfit of backupData) {
    try {
      const { error } = await supabase
        .from('outfits')
        .update({
          items: outfit.items,
          // Restore other fields that might have changed
          recipe_title: outfit.recipe_title,
          quality_score: outfit.quality_score,
          alignment_score: outfit.alignment_score,
          confidence_score: outfit.confidence_score,
          pool_tier: outfit.pool_tier,
          score_breakdown: outfit.score_breakdown,
          reasoning: outfit.reasoning,
          attributes: outfit.attributes,
        })
        .eq('outfit_id', outfit.outfit_id);

      if (error) {
        console.error(`\n❌ Error restoring ${outfit.outfit_id}:`, error.message);
        errors++;
      } else {
        restored++;
        if (restored % 100 === 0) {
          process.stdout.write(`\r  Restored ${restored} / ${backupData.length} outfits...`);
        }
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${outfit.outfit_id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n\n✅ RESTORE COMPLETE`);
  console.log(`   Restored: ${restored} outfits`);
  console.log(`   Errors: ${errors}`);
  console.log('');
}

restoreOutfits().catch(console.error);
