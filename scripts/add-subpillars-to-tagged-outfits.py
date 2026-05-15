#!/usr/bin/env python3
"""
Add Sub-Pillars to Already-Tagged Outfits

For the 5,181 outfits that have stylePillar but no subStyle,
extract sub-pillars using a lightweight AI prompt.

SAVES ALL AI RESULTS TO JSONL before updating database.
"""

import json
import os
import requests
import time
from datetime import datetime
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Sub-pillar definitions from outfit-attributes.ts
STYLE_PILLAR_SUBTERMS = {
    'Romantic': ['Effortless Romantic', 'Feminine', 'Whimsical', 'Ladylike', 'Delicate', 'Ethereal', 'Dandy'],
    'Bohemian': ['Beachy', 'Eclectic', 'Vintage-inspired', 'Natural', 'Artisanal', 'Hippie', 'Free-spirited', 'Artistic', 'Worldly', 'Tropical'],
    'Casual': ['Pragmatic Casual', 'Sporty Casual'],
    'Classic': ['Timeless Classic', 'Sophisticated', 'Polished', 'Dressy', 'Chic', 'Tailored', 'Menswear-inspired', 'Nautical', 'Preppy', 'Heritage'],
    'Minimal': ['Modern Minimal', 'Sleek', 'Monochromatic', 'Understated', 'Modern', 'Architectural', 'Elegant', 'Refined'],
    'Maximal': ['Daring Maximal', 'Bold', 'Vibrant', 'Tropical', 'Glam', 'Exotic', 'Quirky'],
    'Streetwear': ['Streetwear', 'Urban', 'Edgy', 'Tomboy'],
    'Athletic': ['Street Sport', 'Performance', 'Club Sport', 'Athleisure'],
    'Utility': ['Utility Workwear', 'Utility Streetwear', 'Workwear', 'Military', 'Western', 'Rugged', 'Outdoorsy', 'Safari']
}

print("🏷️  Adding Sub-Pillars to Tagged Outfits\n")

# Results file - SAVE ALL AI RESULTS HERE
results_file = 'subpillar-extraction-results.jsonl'
checkpoint_file = 'subpillar-extraction-checkpoint.json'

# Load checkpoint if exists
processed_ids = set()
if os.path.exists(checkpoint_file):
    with open(checkpoint_file, 'r') as f:
        checkpoint = json.load(f)
        processed_ids = set(checkpoint.get('processed_ids', []))
    print(f"📂 Resuming from checkpoint: {len(processed_ids)} already processed\n")

# Get outfits with stylePillar but no subStyle
print("📊 Loading outfits that need sub-pillars...")

batch_size = 1000
offset = 0
total = 42260
outfits_needing_subpillars = []

while offset < total:
    batch = supabase.table('outfits').select('*').range(offset, offset + batch_size - 1).execute()

    for outfit in batch.data:
        # Skip if already processed
        if outfit['outfit_id'] in processed_ids:
            continue

        attrs = outfit.get('attributes')
        if attrs and isinstance(attrs, dict):
            # Has stylePillar but no subStyle
            if attrs.get('stylePillar') and not attrs.get('subStyle'):
                outfits_needing_subpillars.append(outfit)

    offset += batch_size
    print(f"  Scanned {min(offset, total)}/{total}")

print(f"\n✅ Found {len(outfits_needing_subpillars)} outfits needing sub-pillars")
print(f"   ({len(processed_ids)} already processed)\n")

if len(outfits_needing_subpillars) == 0:
    print("✅ All outfits already have sub-pillars!")
    exit(0)

def call_gemini_for_subpillar(outfit_id: str, style_pillar: str, items: list, vibes: list, formality: float) -> tuple:
    """Call Gemini with lightweight sub-pillar extraction prompt"""

    # Build simple item summary
    item_summary = []
    for item in items[:6]:  # Limit to 6 items for brevity
        if isinstance(item, dict):
            product = item.get('product', {})
            title = product.get('title', 'Unknown')
            role = item.get('role', 'item')
            item_summary.append(f"{role}: {title[:50]}")

    items_text = "\n".join(item_summary)
    vibes_text = ", ".join(vibes) if vibes else "None"

    # Get valid sub-terms for this pillar
    valid_subterms = STYLE_PILLAR_SUBTERMS.get(style_pillar, [])
    if not valid_subterms:
        return None, "No sub-terms defined for this pillar"

    prompt = f"""This outfit has been tagged as "{style_pillar}".

OUTFIT ITEMS:
{items_text}

EXISTING TAGS:
- Style Pillar: {style_pillar}
- Vibes: {vibes_text}
- Formality: {formality:.1f}/6.0

Choose the BEST sub-style from these options for {style_pillar}:
{', '.join(valid_subterms)}

Consider:
- The specific items in the outfit
- The vibes (emotional register)
- The formality level
- Which sub-style best captures the nuance

Respond ONLY with JSON (no markdown):
{{
  "subStyle": "Effortless Romantic",
  "confidence": 0.85,
  "reasoning": "Flowing fabrics and delicate details suggest effortless romantic over structured ladylike"
}}"""

    vision_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 200
        }
    }

    try:
        response = requests.post(vision_url, json=payload, timeout=30)

        if response.status_code != 200:
            return None, f"API error: {response.status_code}"

        result = response.json()

        if 'candidates' not in result or len(result['candidates']) == 0:
            return None, "No candidates in response"

        text = result['candidates'][0]['content']['parts'][0]['text'].strip()

        # Parse JSON
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        parsed = json.loads(text)

        # Validate sub-style is in valid list
        sub_style = parsed.get('subStyle')
        if sub_style and sub_style in valid_subterms:
            return parsed, None
        else:
            return None, f"Invalid sub-style: {sub_style}"

    except Exception as e:
        return None, f"Failed: {str(e)}"

# Process outfits
print("🔄 Extracting sub-pillars...\n")

stats = {
    'attempted': 0,
    'success': 0,
    'failed': 0,
    'total': len(outfits_needing_subpillars)
}

for i, outfit in enumerate(outfits_needing_subpillars, 1):
    outfit_id = outfit['outfit_id']

    # Skip if already processed
    if outfit_id in processed_ids:
        continue

    attrs = outfit['attributes']
    style_pillar = attrs['stylePillar']
    vibes = attrs.get('vibes', [])
    formality = attrs.get('formality', 3.0)
    items = outfit.get('items', [])

    print(f"[{i}/{stats['total']}] {outfit_id}")
    print(f"  Pillar: {style_pillar}")

    stats['attempted'] += 1

    # Call AI
    result, error = call_gemini_for_subpillar(outfit_id, style_pillar, items, vibes, formality)

    if error:
        print(f"  ❌ {error}")
        stats['failed'] += 1

        # Save failure to results file
        with open(results_file, 'a') as f:
            f.write(json.dumps({
                'outfit_id': outfit_id,
                'input': {
                    'style_pillar': style_pillar,
                    'vibes': vibes,
                    'formality': formality
                },
                'output': None,
                'error': error,
                'timestamp': datetime.now().isoformat()
            }) + '\n')
            f.flush()

        processed_ids.add(outfit_id)
        time.sleep(0.5)
        continue

    # Success!
    sub_style = result['subStyle']
    confidence = result.get('confidence', 0.0)
    reasoning = result.get('reasoning', '')

    print(f"  ✅ {sub_style} ({confidence:.0%})")
    stats['success'] += 1

    # SAVE TO RESULTS FILE IMMEDIATELY
    with open(results_file, 'a') as f:
        f.write(json.dumps({
            'outfit_id': outfit_id,
            'input': {
                'style_pillar': style_pillar,
                'vibes': vibes,
                'formality': formality
            },
            'output': {
                'subStyle': sub_style,
                'confidence': confidence,
                'reasoning': reasoning
            },
            'timestamp': datetime.now().isoformat()
        }) + '\n')
        f.flush()

    processed_ids.add(outfit_id)

    # Save checkpoint every 50
    if i % 50 == 0:
        with open(checkpoint_file, 'w') as f:
            json.dump({
                'processed_ids': list(processed_ids),
                'stats': stats
            }, f, indent=2)
        print(f"  💾 Checkpoint saved ({stats['success']} successful)")

    time.sleep(0.5)  # Rate limiting

# Final checkpoint
with open(checkpoint_file, 'w') as f:
    json.dump({
        'processed_ids': list(processed_ids),
        'stats': stats
    }, f, indent=2)

print("\n" + "=" * 80)
print("EXTRACTION COMPLETE")
print("=" * 80)
print(f"Total: {stats['total']}")
print(f"Attempted: {stats['attempted']}")
print(f"Successful: {stats['success']}")
print(f"Failed: {stats['failed']}")
print()
print(f"✅ All results saved to: {results_file}")
print(f"📊 Checkpoint saved to: {checkpoint_file}")
print()
print("=" * 80)
print("NEXT STEP: Update Database")
print("=" * 80)
print("Run the update script to apply these sub-pillars to the database:")
print(f"  python3 scripts/update-subpillars-from-results.py")
