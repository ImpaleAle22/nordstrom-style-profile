#!/usr/bin/env tsx
/**
 * Check lifestyle images in Supabase
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('🔍 Checking Supabase connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? 'SET' : 'MISSING');
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkImages() {
  console.log('📊 Querying lifestyle_images table...\n');

  // Try to get count
  const { count: totalCount, error: countError } = await supabase
    .from('lifestyle_images')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error getting count:', countError.message);
    console.error('   Details:', countError);
    return;
  }

  console.log(`✅ Total images in table: ${totalCount}\n`);

  // Try to get active images
  const { data: activeImages, error: activeError, count: activeCount } = await supabase
    .from('lifestyle_images')
    .select('*', { count: 'exact' })
    .eq('status', 'active');

  if (activeError) {
    console.error('❌ Error getting active images:', activeError.message);
    console.error('   Details:', activeError);
    return;
  }

  console.log(`✅ Active images: ${activeCount}`);
  console.log(`   Returned rows: ${activeImages?.length || 0}\n`);

  // Show sample image
  if (activeImages && activeImages.length > 0) {
    const sample = activeImages[0];
    console.log('📷 Sample image:');
    console.log('   ID:', sample.id);
    console.log('   URL:', sample.image_url);
    console.log('   Pillar:', sample.style_pillar);
    console.log('   Gender:', sample.gender);
    console.log('   Status:', sample.status);
  }

  // Check RLS
  console.log('\n🔒 Checking RLS policies...');
  const { data: policies, error: rlsError } = await supabase.rpc('pg_policies') as any;

  if (rlsError) {
    console.log('   Could not check RLS policies (expected if function not available)');
  }
}

checkImages().catch(console.error);
