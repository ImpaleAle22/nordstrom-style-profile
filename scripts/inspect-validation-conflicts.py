#!/usr/bin/env python3
"""
Inspect Validation Conflicts

Shows actual product data for conflicts to understand
if AI or rules was correct
"""

import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Some conflict examples from the test
conflicts = [
    {
        'product_id': 'hm-kaggle-0917294003',
        'attribute': 'fit',
        'rules': 'oversized',
        'rules_confidence': 84,
        'ai': 'relaxed',
        'ai_confidence': 90,
    },
    {
        'product_id': 'hm-kaggle-0908927001',
        'attribute': 'fit',
        'rules': 'fitted',
        'rules_confidence': 75,
        'ai': 'relaxed',
        'ai_confidence': 95,
    },
    {
        'product_id': 'hm-kaggle-0918249001',
        'attribute': 'materials',
        'rules': ['Tencel', 'Lyocell'],
        'rules_confidence': 95,
        'ai': ['denim'],
        'ai_confidence': 90,
    },
    {
        'product_id': 'hm-kaggle-0918249001',
        'attribute': 'sleeve_style',
        'rules': 'Long Sleeve',
        'rules_confidence': 85,
        'ai': '3/4 sleeve',
        'ai_confidence': 90,
    },
    {
        'product_id': 'hm-kaggle-0920500001',
        'attribute': 'sleeve_style',
        'rules': 'cold shoulder',
        'rules_confidence': 88,
        'ai': 'short sleeve',
        'ai_confidence': 95,
    },
    {
        'product_id': 'hm-kaggle-0915567001',
        'attribute': 'materials',
        'rules': ['jersey'],
        'rules_confidence': 95,
        'ai': ['viscose'],
        'ai_confidence': 90,
    },
]

print("🔍 CONFLICT INSPECTION\n")
print("=" * 80)

for i, conflict in enumerate(conflicts, 1):
    product_id = conflict['product_id']

    # Get product data
    response = supabase.table('products').select(
        'product_id, title, image_url, '
        'materials, fit, sleeve_style, neckline'
    ).eq('product_id', product_id).execute()

    if not response.data:
        print(f"\n{i}. {product_id} - NOT FOUND")
        continue

    product = response.data[0]

    print(f"\n{i}. {product_id}")
    print("-" * 80)
    print(f"Title: {product.get('title', 'N/A')}")
    print(f"Image: {product.get('image_url', 'N/A')}")
    print()

    print(f"CONFLICT: {conflict['attribute']}")
    print(f"  Rules said: {conflict['rules']} ({conflict['rules_confidence']}% confidence)")
    print(f"  AI said:    {conflict['ai']} ({conflict['ai_confidence']}% confidence)")
    print()

    # Show what's stored in the database (from rules extraction)
    attr = conflict['attribute']
    if attr in product and product[attr]:
        print(f"  Currently in database: {product[attr]}")
        print()

    print(f"  👁️  Open image to verify which is correct: {product.get('image_url', 'N/A')}")
    print()

print("=" * 80)
print("\n📌 KEY QUESTIONS:\n")
print("1. Look at each image - which tag is visually correct?")
print("2. Are the conflicts semantic (oversized vs relaxed) or actual errors?")
print("3. Is AI seeing details rules extracted incorrectly from text?")
print("4. Which source should we trust more?")
print("\n💡 TIP: Open images in browser to visually verify which is correct")
