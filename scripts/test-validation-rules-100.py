#!/usr/bin/env python3
"""
Test Attribute Validation Rules on 100 Products

Tests the cross-attribute validation system by:
1. Loading products with rules-based attributes
2. Running AI vision to extract attributes
3. Applying validation rules to catch conflicts
4. Reporting statistics on conflicts and resolutions
"""

import json
import os
import requests
import time
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🧪 Testing Attribute Validation Rules on 100 Products\n")

# Get 100 random products with rules-based attributes
print("📦 Loading 100 random products with rules attributes...")
response = supabase.table('products').select(
    'product_id, title, image_url, '
    'materials, materials_confidence, '
    'fit, fit_confidence, '
    'sleeve_style, sleeve_style_confidence, '
    'neckline, neckline_confidence, '
    'silhouette, silhouette_confidence'
).not_.is_('materials', 'null').limit(500).execute()

# Shuffle and take 100
import random
products = response.data
random.shuffle(products)
sample = products[:100]

print(f"✅ Loaded {len(sample)} products\n")

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
    """Call Gemini 2.5 Flash Lite for vision analysis"""
    vision_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": None
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.3,
        }
    }

    # Download image
    try:
        img_response = requests.get(image_url, timeout=10)
        import base64
        img_b64 = base64.b64encode(img_response.content).decode('utf-8')
        payload["contents"][0]["parts"][1]["inline_data"]["data"] = img_b64
    except Exception as e:
        return None, f"Image download failed: {str(e)}"

    # Call API
    try:
        response = requests.post(vision_url, json=payload, timeout=30)

        if response.status_code != 200:
            return None, f"API error: {response.status_code}"

        result = response.json()

        if 'candidates' not in result or len(result['candidates']) == 0:
            return None, "No candidates in response"

        text = result['candidates'][0]['content']['parts'][0]['text']

        # Parse JSON from response
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        parsed = json.loads(text)
        return parsed, None

    except Exception as e:
        return None, f"Vision call failed: {str(e)}"

def apply_validation_rules(rules_attrs, ai_attrs):
    """
    Apply validation rules (Python implementation of TypeScript logic)
    Returns merged attributes and validation results
    """
    conflicts = []
    resolutions = []

    # Helper to check sleeve constraints
    sleeve_constraints = {
        'cap sleeve': ['short', 'very short'],
        'flutter sleeve': ['short', 'very short'],
        'sleeveless': ['none'],
        'puff sleeve': ['short', 'long', '3/4'],
        'bell sleeve': ['long', '3/4'],
        'bishop sleeve': ['long'],
    }

    # 1. Validate sleeve style vs length
    rules_sleeve = rules_attrs.get('sleeve_style', '').lower() if rules_attrs.get('sleeve_style') else ''
    ai_sleeve = ai_attrs.get('sleeve_style', '').lower() if ai_attrs.get('sleeve_style') else ''

    if rules_sleeve and ai_sleeve:
        ai_constraints = sleeve_constraints.get(ai_sleeve)
        if ai_constraints:
            if 'long' in rules_sleeve and 'long' not in ai_constraints:
                conflicts.append(f"Rules say '{rules_sleeve}', AI suggests '{ai_sleeve}' which can only be {'/'.join(ai_constraints)}")
                resolutions.append({
                    'attribute': 'sleeve_style',
                    'action': 'reject_ai',
                    'reason': 'AI sleeve style incompatible with stated sleeve length'
                })

    # 2. Validate neckline/sleeve compatibility
    neckline_constraints = {
        'strapless': ['long sleeve', 'short sleeve', 'cap sleeve', '3/4 sleeve'],
        'halter': ['long sleeve', 'short sleeve', 'cap sleeve'],
        'off-shoulder': ['cap sleeve', 'flutter sleeve'],
        'one-shoulder': ['long sleeve', '3/4 sleeve'],
    }

    neckline = (rules_attrs.get('neckline') or ai_attrs.get('neckline') or '').lower()
    incompatible = neckline_constraints.get(neckline, [])

    if ai_sleeve and incompatible:
        if any(inc in ai_sleeve for inc in incompatible):
            conflicts.append(f"Neckline '{neckline}' incompatible with sleeve '{ai_sleeve}'")
            resolutions.append({
                'attribute': 'sleeve_style',
                'action': 'reject_ai',
                'reason': f"{neckline} necklines cannot have {ai_sleeve}"
            })

    # 3. Validate fit vs silhouette
    fit_conflicts = [
        {'fit': 'fitted', 'incompatible': ['oversized', 'loose', 'boxy']},
        {'fit': 'oversized', 'incompatible': ['bodycon', 'fitted', 'slim']},
        {'fit': 'tight', 'incompatible': ['relaxed', 'loose', 'oversized']},
    ]

    rules_fit = (rules_attrs.get('fit') or '').lower()
    ai_silhouette = (ai_attrs.get('silhouette') or '').lower()

    if rules_fit and ai_silhouette:
        for rule in fit_conflicts:
            if rule['fit'] in rules_fit:
                if any(inc in ai_silhouette for inc in rule['incompatible']):
                    conflicts.append(f"Fit '{rules_fit}' conflicts with silhouette '{ai_silhouette}'")
                    resolutions.append({
                        'attribute': 'silhouette',
                        'action': 'reject_ai',
                        'reason': 'Fit and silhouette are incompatible'
                    })

    # 4. Validate materials
    material_conflicts = [
        {
            'rules': ['wool', 'cashmere', 'alpaca'],
            'ai_incompatible': ['polyester', 'nylon', 'spandex'],
        },
        {
            'rules': ['cotton', 'linen'],
            'ai_incompatible': ['leather', 'suede', 'faux leather'],
        },
        {
            'rules': ['silk'],
            'ai_incompatible': ['cotton', 'polyester'],
        },
        {
            'rules': ['denim'],
            'ai_incompatible': ['jersey', 'knit'],
        },
    ]

    rules_materials = [m.lower() for m in (rules_attrs.get('materials') or [])]
    ai_materials = [m.lower() for m in (ai_attrs.get('materials') or [])]

    if rules_materials and ai_materials:
        for conflict_rule in material_conflicts:
            has_explicit = any(m in rules_materials for m in conflict_rule['rules'])
            has_incompatible = any(m in ai_materials for m in conflict_rule['ai_incompatible'])

            if has_explicit and has_incompatible:
                conflicts.append(f"Materials conflict: Rules state {rules_materials}, AI suggests {ai_materials}")
                resolutions.append({
                    'attribute': 'materials',
                    'action': 'reject_ai',
                    'reason': 'Rules extracted explicit materials from text - trust text over vision'
                })
                break

    # Merge attributes respecting resolutions
    merged = dict(rules_attrs)
    rejected_attrs = {r['attribute'] for r in resolutions if r['action'] == 'reject_ai'}

    for key, value in ai_attrs.items():
        if key not in rejected_attrs and key not in merged:
            merged[key] = value

    return {
        'merged': merged,
        'conflicts': conflicts,
        'resolutions': resolutions,
        'valid': len(conflicts) == 0
    }

# Process products
results = {
    'total': len(sample),
    'processed': 0,
    'conflicts_detected': 0,
    'ai_rejected': 0,
    'ai_accepted': 0,
    'gap_fills': 0,
    'examples': []
}

prompt = get_vision_prompt()

print("🔍 Processing products...\n")

for i, product in enumerate(sample, 1):
    print(f"[{i}/{len(sample)}] {product['product_id']}: {product['title'][:50]}...")

    # Extract rules attributes
    rules_attrs = {}
    if product.get('materials'):
        rules_attrs['materials'] = product['materials']
    if product.get('fit'):
        rules_attrs['fit'] = product['fit']
    if product.get('sleeve_style'):
        rules_attrs['sleeve_style'] = product['sleeve_style']
    if product.get('neckline'):
        rules_attrs['neckline'] = product['neckline']
    if product.get('silhouette'):
        rules_attrs['silhouette'] = product['silhouette']

    # Get AI attributes
    ai_attrs, error = call_gemini_vision(product['image_url'], prompt)

    if error:
        print(f"  ⚠️  Vision failed: {error}")
        time.sleep(0.5)
        continue

    results['processed'] += 1

    # Apply validation
    validation = apply_validation_rules(rules_attrs, ai_attrs)

    # Count gap fills (AI added attributes not in rules)
    gaps_filled = sum(1 for key in ai_attrs if key not in rules_attrs)
    results['gap_fills'] += gaps_filled

    if validation['conflicts']:
        results['conflicts_detected'] += 1
        results['ai_rejected'] += len(validation['resolutions'])

        print(f"  🚫 CONFLICT DETECTED:")
        for conflict in validation['conflicts']:
            print(f"     {conflict}")

        # Save example
        if len(results['examples']) < 10:
            results['examples'].append({
                'product_id': product['product_id'],
                'title': product['title'],
                'rules': rules_attrs,
                'ai': ai_attrs,
                'conflicts': validation['conflicts'],
                'resolutions': validation['resolutions']
            })
    else:
        results['ai_accepted'] += gaps_filled
        if gaps_filled > 0:
            print(f"  ✅ AI filled {gaps_filled} gaps (no conflicts)")

    time.sleep(0.5)  # Rate limiting

print("\n" + "=" * 80)
print("VALIDATION TEST RESULTS")
print("=" * 80)
print(f"Total products: {results['total']}")
print(f"Successfully processed: {results['processed']}")
print(f"Conflicts detected: {results['conflicts_detected']} ({results['conflicts_detected']/results['processed']*100:.1f}%)")
print(f"AI attributes rejected: {results['ai_rejected']}")
print(f"AI attributes accepted: {results['ai_accepted']}")
print(f"Total gap fills: {results['gap_fills']}")

print("\n" + "=" * 80)
print("EXAMPLE CONFLICTS")
print("=" * 80)

for example in results['examples']:
    print(f"\n{example['product_id']}: {example['title']}")
    print(f"Rules: {example['rules']}")
    print(f"AI: {example['ai']}")
    print("Conflicts:")
    for conflict in example['conflicts']:
        print(f"  - {conflict}")

# Save results
with open('validation-test-results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\n✅ Results saved to validation-test-results.json")
