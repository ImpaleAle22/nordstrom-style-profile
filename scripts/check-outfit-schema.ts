import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env.local') });

import { supabase } from '../lib/supabase-client';

async function main() {
  const { data, error } = await supabase.from('outfits').select('*').limit(1);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log('Outfit columns:', Object.keys(data[0]));
    console.log('\nSample outfit:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

main();
