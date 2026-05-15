#!/usr/bin/env python3
"""
Check what's actually in the attributes field
"""

import os
import json
from collections import Counter
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📊 Checking what's in outfit attributes...\n")

# Get outfits with non-null attributes
response = supabase.table('outfits').select('*').not_.is_('attributes', 'null').limit(100).execute()

print(f"Sample of {len(response.data)} outfits with attributes:\n")

attribute_keys = Counter()

for outfit in response.data[:10]:
    print(f"Outfit: {outfit['outfit_id']}")
    attrs = outfit.get('attributes')
    if isinstance(attrs, dict):
        print(f"  Keys: {list(attrs.keys())}")
        for key in attrs.keys():
            attribute_keys[key] += 1
        print(f"  Sample: {json.dumps(attrs, indent=4)[:200]}...")
    else:
        print(f"  Type: {type(attrs)}, Value: {attrs}")
    print()

print("\nMost common attribute keys across all samples:")
for key, count in attribute_keys.most_common(20):
    print(f"  {key}: {count}")
