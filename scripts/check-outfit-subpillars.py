#!/usr/bin/env python3
"""
Check how many outfits have sub-pillars
"""

import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📊 Checking outfit sub-pillars...\n")

# Get all outfits
response = supabase.table('outfits').select('*').execute()
outfits = response.data

print(f"Total outfits: {len(outfits)}\n")

# Check for sub-pillars
has_subpillars = 0
has_pillars = 0
has_vibes = 0
has_occasions = 0

for outfit in outfits:
    if outfit.get('sub_pillars') and outfit['sub_pillars']:
        has_subpillars += 1
    if outfit.get('pillars') and outfit['pillars']:
        has_pillars += 1
    if outfit.get('vibes') and outfit['vibes']:
        has_vibes += 1
    if outfit.get('occasions') and outfit['occasions']:
        has_occasions += 1

print(f"Outfits with sub-pillars: {has_subpillars}")
print(f"Outfits with pillars: {has_pillars}")
print(f"Outfits with vibes: {has_vibes}")
print(f"Outfits with occasions: {has_occasions}")

# Show example outfit with sub-pillars if any
if has_subpillars > 0:
    example = next((o for o in outfits if o.get('sub_pillars') and o['sub_pillars']), None)
    if example:
        print(f"\nExample outfit with sub-pillars:")
        print(f"  ID: {example.get('outfit_id')}")
        print(f"  Sub-pillars: {example.get('sub_pillars')}")
        print(f"  Pillars: {example.get('pillars')}")
else:
    print("\n❌ No outfits have sub-pillars")

# Check what columns exist
print(f"\nColumns in outfits table:")
if outfits:
    for key in outfits[0].keys():
        print(f"  - {key}")
