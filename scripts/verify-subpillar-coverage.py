#!/usr/bin/env python3
"""
Verify Sub-Pillar Coverage

Properly count outfits with sub-pillars by handling pagination
"""

import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔍 Verifying Sub-Pillar Coverage\n")

# Count outfits with attributes in batches
batch_size = 1000
offset = 0
total_outfits = 42260

count_with_substyle = 0
count_with_attributes = 0
count_with_pillar = 0

print("📊 Scanning all outfits...\n")

while offset < total_outfits:
    batch = supabase.table('outfits').select('outfit_id, attributes').range(offset, offset + batch_size - 1).execute()

    for outfit in batch.data:
        attrs = outfit.get('attributes')
        if attrs and isinstance(attrs, dict):
            count_with_attributes += 1

            if attrs.get('stylePillar'):
                count_with_pillar += 1

            if attrs.get('subStyle'):
                count_with_substyle += 1

    offset += batch_size
    if offset % 5000 == 0:
        print(f"  Scanned {offset:,}/{total_outfits:,} outfits...")

print(f"\n{'='*80}")
print("VERIFICATION RESULTS")
print('='*80)
print(f"Total outfits: {total_outfits:,}")
print(f"Outfits with attributes: {count_with_attributes:,}")
print(f"Outfits with stylePillar: {count_with_pillar:,}")
print(f"Outfits with subStyle: {count_with_substyle:,}")
print()

if count_with_substyle > 0:
    coverage = (count_with_substyle / count_with_pillar) * 100 if count_with_pillar > 0 else 0
    print(f"✅ Sub-pillar coverage: {coverage:.1f}% of outfits with pillars")
else:
    print("⚠️  No outfits found with sub-pillars")
