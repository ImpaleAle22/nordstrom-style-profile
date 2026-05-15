#!/usr/bin/env tsx
/**
 * Update persona profiles in Supabase to match journey map
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PERSONA_UPDATES = [
  {
    customer_id: 'cold_start',
    customer_name: 'Alex Chen',
    pillars: {
      minimal: 30,
      classic: 20,
      romantic: 15,
      casual: 12,
      bohemian: 10,
      utility: 8,
      athletic: 5,
      maximal: 0,
      streetwear: 0,
    },
    confidence_score: 0.42,
    sessions_processed: 12,
    total_signals: 150,
  },
  {
    customer_id: 'marcus_poweruser_swipe',
    customer_name: 'Marcus Thompson',
    pillars: {
      athletic: 35,
      utility: 30,
      casual: 20,
      minimal: 8,
      classic: 5,
      streetwear: 2,
      bohemian: 0,
      romantic: 0,
      maximal: 0,
    },
    confidence_score: 0.48,
    sessions_processed: 3,
    total_signals: 36,
  },
  {
    customer_id: 'sarah_newuser_quiz',
    customer_name: 'Sarah Martinez',
    pillars: {
      minimal: 42,
      classic: 28,
      romantic: 13,
      athletic: 11,
      casual: 3,
      utility: 3,
      bohemian: 0,
      maximal: 0,
      streetwear: 0,
    },
    confidence_score: 0.95,
    sessions_processed: 17,
    total_signals: 250,
  },
  {
    customer_id: 'tyler_extreme_minimal',
    customer_name: 'Tyler Chen',
    pillars: {
      minimal: 75,
      classic: 15,
      utility: 5,
      casual: 3,
      athletic: 2,
      bohemian: 0,
      romantic: 0,
      maximal: 0,
      streetwear: 0,
    },
    confidence_score: 0.68,
    sessions_processed: 9,
    total_signals: 95,
  },
  {
    customer_id: 'elena_maximal_creative',
    customer_name: 'Elena Rodriguez',
    pillars: {
      bohemian: 22,
      maximal: 20,
      romantic: 20,
      streetwear: 18,
      casual: 10,
      classic: 5,
      minimal: 3,
      utility: 2,
      athletic: 0,
    },
    confidence_score: 0.65,
    sessions_processed: 11,
    total_signals: 110,
  },
  {
    customer_id: 'priya_browse_casual',
    customer_name: 'Priya Sharma',
    pillars: {
      casual: 30,
      bohemian: 18,
      romantic: 17,
      maximal: 11,
      minimal: 7,
      classic: 6,
      streetwear: 5,
      athletic: 4,
      utility: 2,
    },
    confidence_score: 0.58,
    sessions_processed: 8,
    total_signals: 92,
  },
  {
    customer_id: 'derek_athletic_focused',
    customer_name: 'Derek Johnson',
    pillars: {
      athletic: 70,
      casual: 15,
      minimal: 7,
      utility: 5,
      classic: 2,
      streetwear: 1,
      bohemian: 0,
      romantic: 0,
      maximal: 0,
    },
    confidence_score: 0.67,
    sessions_processed: 9,
    total_signals: 88,
  },
  {
    customer_id: 'james_classic_purchase',
    customer_name: 'James Wilson',
    pillars: {
      classic: 40,
      utility: 20,
      minimal: 18,
      casual: 12,
      athletic: 10,
      bohemian: 0,
      romantic: 0,
      maximal: 0,
      streetwear: 0,
    },
    confidence_score: 0.63,
    sessions_processed: 7,
    total_signals: 82,
  },
  {
    customer_id: 'aisha_balanced_explorer',
    customer_name: 'Aisha Patel',
    pillars: {
      casual: 16,
      romantic: 16,
      bohemian: 13,
      classic: 12,
      maximal: 11,
      minimal: 10,
      streetwear: 10,
      athletic: 7,
      utility: 5,
    },
    confidence_score: 0.57,
    sessions_processed: 10,
    total_signals: 107,
  },
];

async function updatePersonaProfiles() {
  console.log('🔄 Updating persona profiles...\n');

  for (const persona of PERSONA_UPDATES) {
    console.log(`Updating ${persona.customer_name} (${persona.customer_id})...`);

    const { error } = await supabase
      .from('customer_profiles')
      .update({
        pillars: persona.pillars,
        confidence_score: persona.confidence_score,
        sessions_processed: persona.sessions_processed,
        total_signals: persona.total_signals,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', persona.customer_id);

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Updated`);
      console.log(`     Confidence: ${(persona.confidence_score * 100).toFixed(0)}%`);
      console.log(`     Sessions: ${persona.sessions_processed}, Signals: ${persona.total_signals}`);
      console.log(`     Top pillar: ${Object.entries(persona.pillars).sort(([,a], [,b]) => (b as number) - (a as number))[0][0]}\n`);
    }
  }

  console.log('✅ All persona profiles updated!\n');
  console.log('🔍 Verifying updates...\n');

  // Verify
  const { data: profiles } = await supabase
    .from('customer_profiles')
    .select('customer_id, customer_name, confidence_score, sessions_processed, total_signals')
    .in('customer_id', PERSONA_UPDATES.map(p => p.customer_id))
    .order('confidence_score', { ascending: false });

  if (profiles) {
    console.log('Updated Profiles:');
    console.log('─'.repeat(80));
    profiles.forEach(p => {
      console.log(`${p.customer_name.padEnd(20)} | Confidence: ${((p.confidence_score || 0) * 100).toFixed(0).padStart(3)}% | Sessions: ${p.sessions_processed} | Signals: ${p.total_signals}`);
    });
    console.log('─'.repeat(80));
  }

  console.log('\n✅ Update complete!');
}

updatePersonaProfiles().catch(console.error);
