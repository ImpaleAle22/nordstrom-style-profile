#!/usr/bin/env tsx
/**
 * Query all personas from Supabase
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { supabase } from '../lib/supabase-client';

async function queryPersonas() {
  console.log('🔍 Querying customer profiles...\n');

  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('customer_profiles')
    .select('customer_id, customer_name, gender, pillars, confidence_score, sessions_processed, total_signals, last_interaction_at, created_at')
    .order('confidence_score', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profiles:\n`);
  console.log('─'.repeat(100));

  for (const profile of profiles) {
    console.log(`\n👤 ${profile.customer_name} (${profile.customer_id})`);
    console.log(`   Gender: ${profile.gender}`);
    console.log(`   Confidence: ${(profile.confidence_score * 100).toFixed(1)}%`);
    console.log(`   Sessions: ${profile.sessions_processed} | Signals: ${profile.total_signals}`);
    console.log(`   Last Active: ${profile.last_interaction_at || 'Never'}`);

    // Show top 3 pillars
    const sortedPillars = Object.entries(profile.pillars || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3);

    if (sortedPillars.length > 0) {
      console.log(`   Top Pillars: ${sortedPillars.map(([name, score]) => `${name} (${score})`).join(', ')}`);
    }
  }

  console.log('\n' + '─'.repeat(100));

  // Now get interaction breakdown for each
  console.log('\n\n🔍 Querying interaction patterns...\n');
  console.log('─'.repeat(100));

  for (const profile of profiles) {
    const { data: interactions, error: intError } = await supabase
      .from('customer_interactions')
      .select('interaction_type, timestamp')
      .eq('customer_id', profile.customer_id);

    if (intError) {
      console.log(`\n❌ ${profile.customer_name}: Error querying interactions`);
      continue;
    }

    if (!interactions || interactions.length === 0) {
      console.log(`\n📭 ${profile.customer_name}: No interactions found`);
      continue;
    }

    // Group by type
    const typeCounts: Record<string, number> = {};
    for (const int of interactions) {
      typeCounts[int.interaction_type] = (typeCounts[int.interaction_type] || 0) + 1;
    }

    console.log(`\n📊 ${profile.customer_name}:`);
    console.log(`   Total Interactions: ${interactions.length}`);
    Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
  }

  console.log('\n' + '─'.repeat(100));
  console.log('\n✅ Query complete\n');
}

queryPersonas().catch(console.error);
