#!/usr/bin/env python3
"""
Test Attribute Validation on 1000 Low-Coverage Products Used in Outfits
"""

import json
import os
import requests
import time
from collections import Counter
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔍 Finding Low-Coverage Products Used in Outfits\n")

# Get products that are in outfits
print("📊 Finding products used in outfits...")
outfits_response = supabase.table('outfits').select('items').execute()
outfit_product_ids = set()

for outfit in outfits_response.data:
    if outfit.get('items'):
        for item in outfit['items']:
            if isinstance(item, dict) and 'product_id' in item:
                outfit_product_ids.add(item['product_id'])
            elif isinstance(item, str):
                outfit_product_ids.add(item)

print(f"✅ Found {len(outfit_product_ids)} unique products in outfits\n")

# Get these specific products in batches
print("📦 Loading outfit products from database...")
outfit_products = []
batch_size = 100
product_id_list = list(outfit_product_ids)

for i in range(0, len(product_id_list), batch_size):
    batch = product_id_list[i:i+batch_size]
    response = supabase.table('products').select('*').in_('product_id', batch).execute()
    outfit_products.extend(response.data)
    print(f"  Loaded batch {i//batch_size + 1}/{(len(product_id_list)-1)//batch_size + 1}")

print(f"✅ Loaded {len(outfit_products)} outfit products\n")

# Calculate coverage
def calculate_coverage(product):
    attrs = ['materials', 'fit', 'sleeve_style', 'neckline', 'silhouette',
             'waistline', 'pattern', 'details']
    return sum(1 for attr in attrs if product.get(attr) and product.get(attr) not in [None, [], ''])

for product in outfit_products:
    product['coverage_score'] = calculate_coverage(product)

# Sort by lowest coverage
products_sorted = sorted(outfit_products, key=lambda p: p['coverage_score'])
sample_size = min(1000, len(products_sorted))
low_coverage = products_sorted[:sample_size]

print(f"📉 Selected {sample_size} products with lowest coverage")
if low_coverage:
    print(f"   Range: {low_coverage[0]['coverage_score']} to {low_coverage[-1]['coverage_score']} attributes\n")

coverage_dist = Counter(p['coverage_score'] for p in low_coverage)
print("Coverage distribution:")
for score in sorted(coverage_dist.keys()):
    print(f"  {score} attributes: {coverage_dist[score]} products")
print()

# Now add validation test logic
print(f"🔍 Running validation on {sample_size} products...\n")

def get_vision_prompt():
    return """Analyze this fashion product image and extract these attributes in JSON format:

{
  "materials": ["material1", "material2"],
  "fit": "string",
  "neckline": "string",
  "sleeve_style": "string",
  "silhouette": "string"
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
        return None, f"Image download failed: {str(e)}"
    
    try:
        response = requests.post(vision_url, json=payload, timeout=30)
        if response.status_code != 200:
            return None, f"API error: {response.status_code}"
        
        result = response.json()
        if 'candidates' not in result or len(result['candidates']) == 0:
            return None, "No candidates in response"
        
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
        return None, f"Vision call failed: {str(e)}"

def apply_validation_rules(rules_attrs, ai_attrs):
    conflicts = []
    resolutions = []
    
    sleeve_constraints = {
        'cap sleeve': ['short', 'very short'],
        'flutter sleeve': ['short', 'very short'],
        'sleeveless': ['none'],
        'puff sleeve': ['short', 'long', '3/4'],
        'bell sleeve': ['long', '3/4'],
        'bishop sleeve': ['long'],
    }
    
    # Validate sleeves
    rules_sleeve = rules_attrs.get('sleeve_style', '').lower() if rules_attrs.get('sleeve_style') else ''
    ai_sleeve = ai_attrs.get('sleeve_style', '').lower() if ai_attrs.get('sleeve_style') else ''
    
    if rules_sleeve and ai_sleeve:
        ai_constraints = sleeve_constraints.get(ai_sleeve)
        if ai_constraints and 'long' in rules_sleeve and 'long' not in ai_constraints:
            conflicts.append(f"Sleeve conflict: rules '{rules_sleeve}', AI '{ai_sleeve}'")
            resolutions.append({'attribute': 'sleeve_style', 'action': 'reject_ai'})
    
    # Validate materials
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
                conflicts.append(f"Materials conflict: rules {rules_materials}, AI {ai_materials}")
                resolutions.append({'attribute': 'materials', 'action': 'reject_ai'})
                break
    
    # Merge
    merged = dict(rules_attrs)
    rejected_attrs = {r['attribute'] for r in resolutions if r['action'] == 'reject_ai'}
    
    for key, value in ai_attrs.items():
        if key not in rejected_attrs and key not in merged:
            merged[key] = value
    
    return {'merged': merged, 'conflicts': conflicts, 'resolutions': resolutions, 'valid': len(conflicts) == 0}

# Process products with checkpointing
results = {'total': len(low_coverage), 'processed': 0, 'conflicts_detected': 0,
          'ai_rejected': 0, 'ai_accepted': 0, 'gap_fills': 0, 'examples': []}

prompt = get_vision_prompt()
checkpoint_file = 'validation-checkpoint-1000.json'
processed_ids = set()

if os.path.exists(checkpoint_file):
    with open(checkpoint_file, 'r') as f:
        checkpoint_data = json.load(f)
        processed_ids = set(checkpoint_data.get('processed_ids', []))
        results = checkpoint_data.get('results', results)
    print(f"📂 Resuming from checkpoint: {len(processed_ids)} already processed\n")

for i, product in enumerate(low_coverage, 1):
    if product['product_id'] in processed_ids:
        continue
    
    print(f"[{i}/{sample_size}] {product['product_id']}: {product['title'][:50]}...")
    
    rules_attrs = {k: product[k] for k in ['materials', 'fit', 'sleeve_style', 'neckline', 'silhouette']
                  if product.get(k) and product.get(k) not in [None, [], '']}
    
    ai_attrs, error = call_gemini_vision(product['image_url'], prompt)
    
    if error:
        print(f"  ⚠️  {error}")
        processed_ids.add(product['product_id'])
        time.sleep(0.5)
        continue
    
    results['processed'] += 1
    processed_ids.add(product['product_id'])
    
    validation = apply_validation_rules(rules_attrs, ai_attrs)
    gaps_filled = sum(1 for key in ai_attrs if key not in rules_attrs)
    results['gap_fills'] += gaps_filled
    
    if validation['conflicts']:
        results['conflicts_detected'] += 1
        results['ai_rejected'] += len(validation['resolutions'])
        print(f"  🚫 CONFLICT: {validation['conflicts'][0]}")
        if len(results['examples']) < 20:
            results['examples'].append({
                'product_id': product['product_id'], 'title': product['title'],
                'rules': rules_attrs, 'ai': ai_attrs, 'conflicts': validation['conflicts']
            })
    else:
        results['ai_accepted'] += gaps_filled
        if gaps_filled > 0:
            print(f"  ✅ Filled {gaps_filled} gaps")
    
    if i % 50 == 0:
        with open(checkpoint_file, 'w') as f:
            json.dump({'processed_ids': list(processed_ids), 'results': results}, f, indent=2)
        print(f"  💾 Checkpoint saved")
    
    time.sleep(0.5)

print("\n" + "=" * 80)
print("RESULTS - LOW-COVERAGE OUTFIT PRODUCTS")
print("=" * 80)
print(f"Total: {results['total']}")
print(f"Processed: {results['processed']}")
print(f"Conflicts: {results['conflicts_detected']} ({results['conflicts_detected']/max(results['processed'],1)*100:.1f}%)")
print(f"AI rejected: {results['ai_rejected']}")
print(f"AI accepted: {results['ai_accepted']}")
print(f"Gap fills: {results['gap_fills']}")
print(f"Avg gaps/product: {results['gap_fills']/max(results['processed'],1):.1f}")

with open('validation-test-1000-results.json', 'w') as f:
    json.dump(results, f, indent=2)

if os.path.exists(checkpoint_file):
    os.remove(checkpoint_file)

print("\n✅ Saved to validation-test-1000-results.json")
