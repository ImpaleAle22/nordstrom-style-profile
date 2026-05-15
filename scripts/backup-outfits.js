#!/usr/bin/env node
/**
 * Backup All Outfits from Supabase
 *
 * Creates JSON backup before migration
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

async function backupOutfits() {
  console.log('📦 Starting outfit backup...\n');

  // Get count first
  const { count } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  console.log(`Total outfits to backup: ${count}\n`);

  // Fetch all outfits (paginate if needed)
  let allOutfits = [];
  const pageSize = 1000;
  let page = 0;

  while (true) {
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('generated_at', { ascending: false });

    if (error) {
      console.error('Error fetching outfits:', error);
      process.exit(1);
    }

    if (!outfits || outfits.length === 0) break;

    allOutfits = allOutfits.concat(outfits);
    page++;
    console.log(`  Fetched ${allOutfits.length} / ${count} outfits...`);

    if (outfits.length < pageSize) break;
  }

  console.log(`\n✓ Fetched all ${allOutfits.length} outfits`);

  // Create backup directory if it doesn't exist
  const backupDir = join(projectRoot, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Save to JSON file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `outfits-backup-${timestamp}.json`;
  const filepath = join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(allOutfits, null, 2));

  const fileSizeMB = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ BACKUP COMPLETE`);
  console.log(`   File: ${filepath}`);
  console.log(`   Size: ${fileSizeMB} MB`);
  console.log(`   Outfits: ${allOutfits.length}`);
  console.log('');
  console.log('💾 This backup can be used to restore data if migration fails.');
  console.log('');
}

backupOutfits().catch(console.error);
