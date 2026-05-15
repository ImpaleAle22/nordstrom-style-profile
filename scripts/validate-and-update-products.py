#!/usr/bin/env python3
"""
Validate and Update Products with AI Attributes

Runs AI extraction + validation on low-coverage products,
then updates the database with validated attributes
"""

import json
import os
import requests
import time
import re
from collections import Counter
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔄 Validate and Update Products with AI Attributes\n")

# Parse validated products from output file
print("📊 Parsing validation output file...")
processed_products = []
conflict_products = set()

with open('validation-1000-output.txt', 'r') as f:
    for line in f:
        # Match product lines
        match = re.match(r'\[(\d+)/\d+\] ([^:]+):', line)
        if match:
            product_id = match.group(2).strip()
            # Check next few lines for conflict or success
            continue
        
        # Track conflicts
        if '🚫 CONFLICT' in line:
            # Previous product had conflict
            if processed_products:
                conflict_products.add(processed_products[-1])
        
        # Track successes
        elif '✅ Filled' in line:
            # Previous product was successful
            continue

# Better approach: parse the output more carefully
processed_products = set()
product_status = {}  # product_id -> 'success' or 'conflict'

current_product = None
with open('validation-1000-output.txt', 'r') as f:
    for line in f:
        # Match product ID
        match = re.match(r'\[(\d+)/\d+\] ([^:]+):', line)
        if match:
            current_product = match.group(2).strip()
            processed_products.add(current_product)
            product_status[current_product] = 'success'  # Default to success
        
        # Check for conflict
        elif '🚫 CONFLICT' in line and current_product:
            product_status[current_product] = 'conflict'
        
        # Check for errors
        elif '⚠️' in line and current_product:
            product_status[current_product] = 'error'

# Filter to successful products
successful_products = {pid for pid, status in product_status.items() if status == 'success'}
conflict_products = {pid for pid, status in product_status.items() if status == 'conflict'}

print(f"✅ Found {len(successful_products)} successfully processed products")
print(f"🚫 Found {len(conflict_products)} products with conflicts")
print(f"📦 Will update {len(successful_products)} products\n")

# Load product data
print("📥 Loading product data from database...")
all_products = []
batch_size = 100
product_list = list(successful_products)

for i in range(0, len(product_list), batch_size):
    batch = product_list[i:i+batch_size]
    try:
        response = supabase.table('products').select('*').in_('product_id', batch).execute()
        all_products.extend(response.data)
        print(f"   Loaded batch {i//batch_size + 1}/{(len(product_list)-1)//batch_size + 1}")
    except Exception as e:
        print(f"   ⚠️  Batch failed: {e}")

print(f"✅ Loaded {len(all_products)} products\n")

# Define AI extraction function
def get_vision_prompt():
    return """Analyze this fashion product image and extract these attributes in JSON format:

{
  "materials": ["material1", "material2"],
  "fit": "string",
  "neckline": "string",
  "sleeve_style": "string",
  "silhouette": "string",
  "waistline": "string",
  "pattern": "string",
  "details": ["detail1", "detail2"]
}

Be specific and accurate. Return ONLY valid JSON. If you cannot determine an attribute, omit it."""

def call_gemini_vision(image_url, prompt):
    vision_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": None}}
            ]
        }],
        "generationConfig": {"temperature": 0.3}
    }

    try:
        img_response = requests.get(image_url, timeout=10)
        import base64
        img_b64 = base64.b64encode(img_response.content).decode('utf-8')
        payload["contents"][0]["parts"][1]["inline_data"]["data"] = img_b64
    except Exception as e:
        return None, f"Image download failed"

    try:
        response = requests.post(vision_url, json=payload, timeout=30)
        if response.status_code != 200:
            return None, f"API error: {response.status_code}"

        result = response.json()
        if 'candidates' not in result or len(result['candidates']) == 0:
            return None, "No candidates"

        text = result['candidates'][0]['content']['parts'][0]['text'].strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        return json.loads(text), None
    except Exception as e:
        return None, f"Failed"

def apply_validation_rules(rules_attrs, ai_attrs):
    """Apply validation rules and return merged attributes"""
    conflicts = []

    # Material validation
    material_conflicts = [
        {'rules': ['wool', 'cashmere', 'alpaca'], 'ai_incompatible': ['polyester', 'nylon', 'spandex']},
        {'rules': ['cotton', 'linen'], 'ai_incompatible': ['leather', 'suede', 'faux leather']},
        {'rules': ['silk'], 'ai_incompatible': ['cotton', 'polyester']},
        {'rules': ['denim'], 'ai_incompatible': ['jersey', 'knit']},
    ]

    rules_materials = [m.lower() for m in (rules_attrs.get('materials') or [])]
    ai_materials = [m.lower() for m in (ai_attrs.get('materials') or [])]

    if rules_materials and ai_materials:
        for conflict_rule in material_conflicts:
            has_explicit = any(m in rules_materials for m in conflict_rule['rules'])
            has_incompatible = any(m in ai_materials for m in conflict_rule['ai_incompatible'])
            if has_explicit and has_incompatible:
                conflicts.append('materials')
                break

    # Merge attributes - reject conflicting ones
    merged = dict(rules_attrs)

    for key, value in ai_attrs.items():
        if key not in conflicts and key not in merged:
            merged[key] = value

    return merged, len(conflicts) == 0

# Process and update products
print("🔄 Processing and updating products...\n")

stats = {
    'attempted': 0,
    'updated': 0,
    'skipped_conflict': 0,
    'skipped_error': 0,
    'attributes_added': 0
}

update_batch = []
prompt = get_vision_prompt()

for i, product in enumerate(all_products, 1):
    product_id = product['product_id']

    print(f"[{i}/{len(all_products)}] {product_id}: {product['title'][:50]}...")

    stats['attempted'] += 1

    # Extract rules attributes
    rules_attrs = {}
    for attr in ['materials', 'fit', 'sleeve_style', 'neckline', 'silhouette', 'waistline', 'pattern', 'details']:
        if product.get(attr) and product.get(attr) not in [None, [], '']:
            rules_attrs[attr] = product[attr]

    # Get AI attributes
    ai_attrs, error = call_gemini_vision(product['image_url'], prompt)

    if error:
        print(f"  ⚠️  {error}")
        stats['skipped_error'] += 1
        time.sleep(0.5)
        continue

    # Apply validation
    merged, valid = apply_validation_rules(rules_attrs, ai_attrs)

    if not valid:
        print(f"  🚫 Validation conflict - skipping")
        stats['skipped_conflict'] += 1
        time.sleep(0.5)
        continue

    # Count new attributes
    new_attrs = sum(1 for key in ai_attrs if key not in rules_attrs)
    stats['attributes_added'] += new_attrs

    # Prepare update
    update_data = {'product_id': product_id}

    for attr in ['materials', 'fit', 'sleeve_style', 'neckline', 'silhouette', 'waistline', 'pattern', 'details']:
        if attr in merged:
            update_data[attr] = merged[attr]

    update_batch.append(update_data)
    print(f"  ✅ Added {new_attrs} attributes")

    # Update database in batches of 50
    if len(update_batch) >= 50:
        print(f"\n  💾 Updating batch of {len(update_batch)} products...")
        for update in update_batch:
            try:
                supabase.table('products').update(update).eq('product_id', update['product_id']).execute()
                stats['updated'] += 1
            except Exception as e:
                print(f"     ❌ Failed: {e}")

        print(f"  ✅ Batch updated ({stats['updated']} total)\n")
        update_batch = []

    time.sleep(0.5)  # Rate limiting

# Update remaining batch
if update_batch:
    print(f"\n💾 Updating final batch of {len(update_batch)} products...")
    for update in update_batch:
        try:
            supabase.table('products').update(update).eq('product_id', update['product_id']).execute()
            stats['updated'] += 1
        except Exception as e:
            print(f"   ❌ Failed: {e}")

    print(f"✅ Final batch updated\n")

print("\n" + "=" * 80)
print("UPDATE COMPLETE")
print("=" * 80)
print(f"Attempted: {stats['attempted']}")
print(f"Successfully updated: {stats['updated']}")
print(f"Skipped (conflicts): {stats['skipped_conflict']}")
print(f"Skipped (errors): {stats['skipped_error']}")
print(f"Total attributes added: {stats['attributes_added']}")
print(f"Avg attributes per product: {stats['attributes_added']/max(stats['updated'],1):.1f}")
