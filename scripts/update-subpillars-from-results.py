#!/usr/bin/env python3
"""
Update Database with Extracted Sub-Pillars

Reads saved AI extraction results and updates the outfits table.
This is separate from extraction so we never waste AI calls.
"""

import json
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("💾 Updating Database with Sub-Pillars\n")

# Load results
results_file = 'subpillar-extraction-results.jsonl'

if not os.path.exists(results_file):
    print(f"❌ Results file not found: {results_file}")
    print("   Run the extraction script first:")
    print("   python3 scripts/add-subpillars-to-tagged-outfits.py")
    exit(1)

print(f"📂 Loading results from {results_file}...")

results = []
with open(results_file, 'r') as f:
    for line in f:
        result = json.loads(line)
        if result.get('output'):  # Only successful extractions
            results.append(result)

print(f"✅ Loaded {len(results)} successful extractions\n")

if len(results) == 0:
    print("❌ No successful extractions to update")
    exit(0)

# Update database in batches
print("🔄 Updating outfits...\n")

stats = {
    'updated': 0,
    'failed': 0,
    'total': len(results)
}

batch_updates = []

for i, result in enumerate(results, 1):
    outfit_id = result['outfit_id']
    sub_style = result['output']['subStyle']
    confidence = result['output'].get('confidence', 0.0)

    print(f"[{i}/{stats['total']}] {outfit_id}: {sub_style}")

    try:
        # Get current attributes
        response = supabase.table('outfits').select('attributes').eq('outfit_id', outfit_id).execute()

        if not response.data:
            print(f"  ⚠️  Outfit not found")
            stats['failed'] += 1
            continue

        # Update attributes with subStyle
        current_attrs = response.data[0]['attributes'] or {}
        current_attrs['subStyle'] = sub_style

        # Also update confidence if it exists
        if 'confidence' in current_attrs and isinstance(current_attrs['confidence'], dict):
            current_attrs['confidence']['subStyle'] = confidence

        # Update database
        supabase.table('outfits').update({
            'attributes': current_attrs
        }).eq('outfit_id', outfit_id).execute()

        stats['updated'] += 1

        if i % 50 == 0:
            print(f"  💾 Progress: {stats['updated']}/{stats['total']} updated")

    except Exception as e:
        print(f"  ❌ Failed: {e}")
        stats['failed'] += 1

print("\n" + "=" * 80)
print("UPDATE COMPLETE")
print("=" * 80)
print(f"Total: {stats['total']}")
print(f"Successfully updated: {stats['updated']}")
print(f"Failed: {stats['failed']}")
print()

# Verify
print("🔍 Verifying update...")
response = supabase.table('outfits').select('*').not_.is_('attributes', 'null').execute()

count_with_substyle = 0
for outfit in response.data:
    attrs = outfit.get('attributes')
    if attrs and isinstance(attrs, dict) and attrs.get('subStyle'):
        count_with_substyle += 1

print(f"✅ Outfits with sub-pillars in database: {count_with_substyle}")
