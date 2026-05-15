#!/usr/bin/env python3
"""
Get actual outfit count and check for attributes
"""

import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📊 Getting ACTUAL outfit count...\n")

# Get count without limit
response = supabase.table('outfits').select('*', count='exact').execute()

print(f"Total outfits in database: {response.count}\n")

# Now check for attributes in batches
print("Checking for attributes in batches...")

batch_size = 1000
offset = 0
total_with_attrs = 0
total_with_pillars = 0
total_with_subpillars = 0

while offset < response.count:
    batch = supabase.table('outfits').select('*').range(offset, offset + batch_size - 1).execute()
    
    for outfit in batch.data:
        attrs = outfit.get('attributes')
        if attrs:
            total_with_attrs += 1
            if isinstance(attrs, dict):
                if attrs.get('pillars'):
                    total_with_pillars += 1
                if attrs.get('sub_pillars') or attrs.get('sub-pillars'):
                    total_with_subpillars += 1
    
    print(f"  Checked {min(offset + batch_size, response.count)}/{response.count}")
    offset += batch_size

print(f"\n✅ Results:")
print(f"Total outfits: {response.count}")
print(f"Outfits with attributes: {total_with_attrs}")
print(f"Outfits with pillars: {total_with_pillars}")
print(f"Outfits with sub-pillars: {total_with_subpillars}")
