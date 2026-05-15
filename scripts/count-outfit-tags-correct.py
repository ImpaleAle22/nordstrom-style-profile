#!/usr/bin/env python3
"""
Count outfits with actual tag fields
"""

import os
import json
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📊 Counting outfits with tags (correct field names)...\n")

batch_size = 1000
offset = 0
total = 42260

stats = {
    'with_attributes': 0,
    'with_style_pillar': 0,
    'with_sub_pillars': 0,
    'with_vibes': 0,
    'with_occasions': 0,
    'with_formality': 0
}

while offset < total:
    batch = supabase.table('outfits').select('*').range(offset, offset + batch_size - 1).execute()
    
    for outfit in batch.data:
        attrs = outfit.get('attributes')
        if attrs and isinstance(attrs, dict):
            stats['with_attributes'] += 1
            
            if attrs.get('stylePillar'):
                stats['with_style_pillar'] += 1
            
            if attrs.get('subPillars') or attrs.get('sub_pillars') or attrs.get('subpillars'):
                stats['with_sub_pillars'] += 1
            
            if attrs.get('vibes'):
                stats['with_vibes'] += 1
            
            if attrs.get('occasions'):
                stats['with_occasions'] += 1
            
            if attrs.get('formality') is not None:
                stats['with_formality'] += 1
    
    offset += batch_size
    print(f"  Checked {min(offset, total)}/{total}")

print(f"\n✅ Results:")
print(f"Total outfits: {total}")
print(f"Outfits with attributes object: {stats['with_attributes']}")
print(f"Outfits with stylePillar: {stats['with_style_pillar']}")
print(f"Outfits with sub-pillars: {stats['with_sub_pillars']}")
print(f"Outfits with vibes: {stats['with_vibes']}")
print(f"Outfits with occasions: {stats['with_occasions']}")
print(f"Outfits with formality: {stats['with_formality']}")

# Check what stylePillar values exist
print(f"\nSample stylePillar values:")
response = supabase.table('outfits').select('*').not_.is_('attributes', 'null').limit(20).execute()
pillars_seen = set()
for outfit in response.data:
    attrs = outfit.get('attributes')
    if attrs and isinstance(attrs, dict) and attrs.get('stylePillar'):
        pillars_seen.add(attrs['stylePillar'])

for pillar in sorted(pillars_seen):
    print(f"  - {pillar}")
