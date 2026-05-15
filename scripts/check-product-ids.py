#!/usr/bin/env python3
"""Check product ID format in Supabase"""

import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Get first 5 products
response = supabase.table('products').select('product_id, title').limit(5).execute()

print("First 5 product IDs in Supabase:")
for product in response.data:
    print(f"  {product['product_id']} - {product['title'][:50]}")

# Try to find one of our IDs
test_id = "hm-kaggle-0108775015"
response = supabase.table('products').select('product_id, title').eq('product_id', test_id).execute()

print(f"\nSearching for: {test_id}")
if response.data:
    print(f"  Found: {response.data[0]['product_id']}")
else:
    print("  Not found!")

# Try without the prefix
test_id_no_prefix = "0108775015"
response = supabase.table('products').select('product_id, title').eq('product_id', test_id_no_prefix).execute()

print(f"\nSearching for: {test_id_no_prefix}")
if response.data:
    print(f"  Found: {response.data[0]['product_id']}")
else:
    print("  Not found!")
