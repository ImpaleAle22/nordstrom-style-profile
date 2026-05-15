#!/usr/bin/env python3
"""Test a single product update"""

import json
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read first product from extracted file
with open('extracted-attributes.jsonl', 'r') as f:
    product = json.loads(f.readline())

print(f"Testing update for: {product['product_id']}")
print(f"Attributes to update:")
for key, value in product.items():
    if key not in ['product_id', 'description']:
        print(f"  {key}: {value}")

# Prepare update data (remove product_id and description)
update_data = {k: v for k, v in product.items() if k not in ['product_id', 'description']}

print(f"\nExecuting update...")
try:
    response = supabase.table('products').update(update_data).eq('product_id', product['product_id']).execute()

    print(f"Response data: {response.data}")
    print(f"Response count: {len(response.data) if response.data else 0}")

    if response.data:
        print("\n✅ Update successful!")
    else:
        print("\n❌ No data returned (but no error)")

except Exception as e:
    print(f"\n❌ Error: {e}")
