#!/usr/bin/env python3
"""
Retry Failed Product Uploads

Reads error log and retries failed products from extracted-attributes.jsonl
"""

import json
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

# Initialize Supabase with service role key
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔄 Retrying Failed Product Uploads\n")

# Read failed product IDs from error log
failed_ids = []
with open('upload-errors.jsonl', 'r') as f:
    for line in f:
        error = json.loads(line)
        failed_ids.append(error['product_id'])

print(f"Found {len(failed_ids)} failed products:")
for pid in failed_ids:
    print(f"  - {pid}")

# Read all extracted attributes and find failed products
failed_products = {}
with open('extracted-attributes.jsonl', 'r') as f:
    for line in f:
        product = json.loads(line)
        if product['product_id'] in failed_ids:
            failed_products[product['product_id']] = product

print(f"\nFound {len(failed_products)}/{len(failed_ids)} in extracted-attributes.jsonl")
print("\nRetrying updates...\n")

# Retry each failed product
success_count = 0
error_count = 0

for product_id, product in failed_products.items():
    try:
        # Prepare update data (remove product_id and description)
        update_data = {k: v for k, v in product.items() if k not in ['product_id', 'description']}

        # Update in Supabase
        response = supabase.table('products').update(update_data).eq('product_id', product_id).execute()

        if response.data:
            print(f"  ✅ {product_id}")
            success_count += 1
        else:
            print(f"  ❌ {product_id} - No data returned")
            error_count += 1
    except Exception as e:
        print(f"  ❌ {product_id} - {e}")
        error_count += 1

print(f"\n{'=' * 80}")
print("📊 RETRY COMPLETE")
print('=' * 80)
print(f"\nSuccess: {success_count}")
print(f"Failed: {error_count}")

if error_count == 0:
    print("\n✅ All failed products successfully uploaded!")
else:
    print(f"\n⚠️  {error_count} products still failing - may need manual investigation")
