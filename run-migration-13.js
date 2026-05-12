/**
 * Run migration 13 to fix profile customer_ids
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env vars from .env.local
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔄 Running migration 13: Fix profile customer_ids\n');

  const updates = [
    { name: 'Aisha Patel' },
    { name: 'Alex Chen' },
    { name: 'Derek Johnson' },
    { name: 'Elena Rodriguez' },
    { name: 'James Wilson' },
    { name: 'Marcus Thompson' },
    { name: 'Priya Sharma' },
    { name: 'Sarah Martinez' },
    { name: 'Tyler Chen' }
  ];

  for (const persona of updates) {
    const { error } = await supabase
      .from('customer_profiles')
      .update({ customer_id: persona.name })
      .eq('customer_name', persona.name);

    if (error) {
      console.error(`❌ Error updating ${persona.name}:`, error);
    } else {
      console.log(`✅ Updated ${persona.name}`);
    }
  }

  console.log('\n🔍 Verifying fix...\n');

  const { data: profiles, error: verifyError } = await supabase
    .from('customer_profiles')
    .select('customer_id, customer_name')
    .in('customer_name', updates.map(u => u.name))
    .order('customer_name');

  if (verifyError) {
    console.error('❌ Verification error:', verifyError);
    return;
  }

  console.log('Updated profiles:');
  for (const profile of profiles) {
    const { data: sessions } = await supabase
      .from('customer_sessions')
      .select('session_id')
      .eq('customer_id', profile.customer_id);

    console.log(`  ${profile.customer_name}: customer_id="${profile.customer_id}" | ${sessions?.length || 0} sessions`);
  }

  console.log('\n✅ Migration complete!');
}

runMigration();
