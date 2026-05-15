#!/usr/bin/env python3
"""
Test AI Validation on 100 Random Products

Compare rules-based extraction vs AI vision to measure:
- Agreement rate
- Where AI finds errors
- Where AI fills gaps
"""

import json
import os
import random
import time
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client
import requests
import base64

# Config
SAMPLE_SIZE = 100
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print(f"🧪 Testing AI Validation on {SAMPLE_SIZE} Random Products\n", flush=True)

# Select 100 random products that have rules-based attributes
print("Loading products with rules-based attributes...")
response = supabase.table('products').select(
    'product_id, image_url, materials, materials_confidence, fit, fit_confidence, '
    'neckline, neckline_confidence, sleeve_style, sleeve_style_confidence, '
    'details, details_confidence, overall_confidence'
).not_.is_('materials', 'null').limit(1000).execute()

products = response.data
random.shuffle(products)
sample = products[:SAMPLE_SIZE]

print(f"Selected {len(sample)} products\n")

# AI Vision prompt
def get_vision_prompt():
    return """Analyze this fashion product image and extract these attributes in JSON format:

{
  "materials": ["material1", "material2"],  // visible fabrics (e.g., "cotton", "denim", "leather")
  "fit": "string",  // overall fit (e.g., "fitted", "relaxed", "oversized", "loose")
  "neckline": "string",  // neckline style (e.g., "v-neck", "crew neck", "round neck")
  "sleeve_style": "string",  // sleeve type (e.g., "short sleeve", "long sleeve", "sleeveless", "3/4 sleeve")
  "details": ["detail1", "detail2"],  // visible features (e.g., "pockets", "buttons", "zipper", "ribbed")
  "confidence": 0.0-1.0  // your overall confidence
}

Return ONLY valid JSON. If you cannot determine an attribute, omit it."""

# Test each product
results = {
    'total': 0,
    'agreements': 0,
    'disagreements': 0,
    'ai_filled_gaps': 0,
    'conflicts': [],
}

print("Running AI vision analysis...\n")

for i, product in enumerate(sample, 1):
    print(f"[{i}/{SAMPLE_SIZE}] {product['product_id']}...", end=' ')

    try:
        # Download image
        img_response = requests.get(product['image_url'], timeout=10)
        if img_response.status_code != 200:
            print("❌ Image download failed")
            continue

        img_base64 = base64.b64encode(img_response.content).decode('utf-8')

        # Call Gemini Vision (using 2.5 Flash Lite)
        vision_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={GEMINI_API_KEY}"

        vision_response = requests.post(
            vision_url,
            json={
                'contents': [{
                    'parts': [
                        {'text': get_vision_prompt()},
                        {'inline_data': {'mime_type': 'image/jpeg', 'data': img_base64}}
                    ]
                }],
                'generationConfig': {'temperature': 0.3}
            },
            timeout=30
        )

        if vision_response.status_code != 200:
            print(f"❌ Vision API failed ({vision_response.status_code})")
            continue

        # Parse AI result
        text = vision_response.json()['candidates'][0]['content']['parts'][0]['text']
        # Strip markdown if present
        if '```' in text:
            text = text.split('```json')[1].split('```')[0] if '```json' in text else text.split('```')[1].split('```')[0]

        ai_result = json.loads(text.strip())

        # Compare results
        has_conflict = False

        # Check materials
        if 'materials' in ai_result and product.get('materials'):
            rules_materials = set(m.lower() for m in product['materials'])
            ai_materials = set(m.lower() for m in ai_result['materials'])

            if not rules_materials.intersection(ai_materials):  # No overlap
                has_conflict = True
                results['conflicts'].append({
                    'product_id': product['product_id'],
                    'attribute': 'materials',
                    'rules': product['materials'],
                    'rules_confidence': product.get('materials_confidence'),
                    'ai': ai_result['materials'],
                    'ai_confidence': int(ai_result.get('confidence', 0) * 100)
                })

        # Check fit
        if 'fit' in ai_result and product.get('fit'):
            if ai_result['fit'].lower() != product['fit'].lower():
                has_conflict = True
                results['conflicts'].append({
                    'product_id': product['product_id'],
                    'attribute': 'fit',
                    'rules': product['fit'],
                    'rules_confidence': product.get('fit_confidence'),
                    'ai': ai_result['fit'],
                    'ai_confidence': int(ai_result.get('confidence', 0) * 100)
                })

        # Check neckline
        if 'neckline' in ai_result and product.get('neckline'):
            if ai_result['neckline'].lower() != product['neckline'].lower():
                has_conflict = True
                results['conflicts'].append({
                    'product_id': product['product_id'],
                    'attribute': 'neckline',
                    'rules': product['neckline'],
                    'rules_confidence': product.get('neckline_confidence'),
                    'ai': ai_result['neckline'],
                    'ai_confidence': int(ai_result.get('confidence', 0) * 100)
                })

        # Check sleeve_style
        if 'sleeve_style' in ai_result and product.get('sleeve_style'):
            if ai_result['sleeve_style'].lower() != product['sleeve_style'].lower():
                has_conflict = True
                results['conflicts'].append({
                    'product_id': product['product_id'],
                    'attribute': 'sleeve_style',
                    'rules': product['sleeve_style'],
                    'rules_confidence': product.get('sleeve_style_confidence'),
                    'ai': ai_result['sleeve_style'],
                    'ai_confidence': int(ai_result.get('confidence', 0) * 100)
                })

        # Count gap filling (AI found something rules didn't)
        gap_filled = False
        if 'fit' in ai_result and not product.get('fit'):
            gap_filled = True
        if 'neckline' in ai_result and not product.get('neckline'):
            gap_filled = True
        if 'sleeve_style' in ai_result and not product.get('sleeve_style'):
            gap_filled = True

        if gap_filled:
            results['ai_filled_gaps'] += 1

        results['total'] += 1

        if has_conflict:
            results['disagreements'] += 1
            print("⚠️  Conflict detected")
        else:
            results['agreements'] += 1
            print("✅ Agreement")

        # Rate limit
        time.sleep(0.5)

    except Exception as e:
        print(f"❌ Error: {e}")
        continue

# Print results
print("\n" + "=" * 80)
print("📊 TEST RESULTS")
print("=" * 80 + "\n")

print(f"Products analyzed: {results['total']}")

if results['total'] > 0:
    print(f"Agreements: {results['agreements']} ({(results['agreements']/results['total']*100):.1f}%)")
    print(f"Disagreements: {results['disagreements']} ({(results['disagreements']/results['total']*100):.1f}%)")
    print(f"AI filled gaps: {results['ai_filled_gaps']}")
else:
    print("❌ No products successfully analyzed")

print(f"\n{'=' * 80}")
print(f"CONFLICTS DETECTED ({len(results['conflicts'])})")
print('=' * 80 + '\n')

for conflict in results['conflicts'][:20]:  # Show first 20
    print(f"{conflict['product_id']} - {conflict['attribute']}:")
    print(f"  Rules: {conflict['rules']} (confidence: {conflict.get('rules_confidence', 'N/A')}%)")
    print(f"  AI: {conflict['ai']} (confidence: {conflict.get('ai_confidence', 'N/A')}%)")
    print()

print(f"\nEstimated cost for 100 products: ${results['total'] * 0.00131:.2f}")
print(f"Projected cost for all 43,820 products: ${43820 * 0.00131:.2f}")
