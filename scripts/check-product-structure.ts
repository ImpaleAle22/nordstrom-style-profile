import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env.local') });

import { supabase } from '../lib/supabase-client';

async function main() {
  // Get one product that appears in outfits
  const { data: outfitData } = await supabase.from('outfits').select('items').limit(1);

  if (!outfitData || outfitData.length === 0) {
    console.error('No outfits found');
    return;
  }

  const firstProductId = outfitData[0].items[0].product_id;
  console.log(`Looking up product: ${firstProductId}\n`);

  const { data, error } = await supabase.from('products').select('*').eq('product_id', firstProductId);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log('Product structure:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('Product not found');
  }
}

main();
