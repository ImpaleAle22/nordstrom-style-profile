#!/usr/bin/env python3
"""Test RLS policies"""

import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print(f"Using URL: {SUPABASE_URL}")
print(f"Using key: {SUPABASE_KEY[:20]}...")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

product_id = "hm-kaggle-0108775015"

# Test 1: Can we SELECT the product?
print(f"\n1. Testing SELECT for {product_id}...")
response = supabase.table('products').select('product_id, title, materials').eq('product_id', product_id).execute()
print(f"   SELECT returned {len(response.data)} rows")
if response.data:
    print(f"   Current materials: {response.data[0].get('materials')}")

# Test 2: Can we UPDATE the product?
print(f"\n2. Testing UPDATE for {product_id}...")
try:
    response = supabase.table('products').update({
        'materials': ['jersey'],
        'materials_confidence': 95
    }).eq('product_id', product_id).execute()

    print(f"   UPDATE returned {len(response.data)} rows")
    if not response.data:
        print(f"   ❌ Empty response - likely RLS blocking update")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Check if using service role key instead
print(f"\n3. RLS Policy Issue:")
print(f"   The anon key can SELECT but not UPDATE.")
print(f"   You need to either:")
print(f"   1. Use SUPABASE_SERVICE_ROLE_KEY for admin operations")
print(f"   2. Update RLS policy to allow updates from anon key")
