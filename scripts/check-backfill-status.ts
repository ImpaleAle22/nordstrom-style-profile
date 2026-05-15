/**
 * Quick check: How many outfits have taggerVersion: "v1" now?
 */
import { supabase } from '../lib/supabase-client';

async function check() {
  // Get all outfits with attributes (paginated)
  const allData: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('outfits')
      .select('outfit_id, attributes')
      .not('attributes', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  const withV1 = allData.filter(r => r.attributes?.taggerVersion === 'v1').length;
  const total = allData.length;

  console.log(`\nBackfill Status:`);
  console.log(`  Total outfits with attributes: ${total}`);
  console.log(`  With taggerVersion='v1': ${withV1}`);
  console.log(`  Progress: ${((withV1 / total) * 100).toFixed(1)}%`);
}

check();
