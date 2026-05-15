#!/usr/bin/env python3
"""
Check outfit attributes structure
"""

import os
import json
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📊 Checking outfit attributes structure...\n")

# Get sample outfits
response = supabase.table('outfits').select('*').limit(5).execute()
outfits = response.data

print(f"Checking {len(outfits)} sample outfits\n")

for outfit in outfits:
    print(f"Outfit ID: {outfit.get('outfit_id')}")
    
    if outfit.get('attributes'):
        attrs = outfit['attributes']
        print(f"  Attributes type: {type(attrs)}")
        if isinstance(attrs, dict):
            print(f"  Keys: {list(attrs.keys())}")
            if 'sub_pillars' in attrs:
                print(f"  Sub-pillars: {attrs['sub_pillars']}")
            if 'pillars' in attrs:
                print(f"  Pillars: {attrs['pillars']}")
        else:
            print(f"  Attributes: {attrs}")
    else:
        print("  No attributes")
    print()

# Count outfits with attributes
response = supabase.table('outfits').select('*').execute()
all_outfits = response.data

has_attrs = sum(1 for o in all_outfits if o.get('attributes'))
has_subpillars_in_attrs = 0

for outfit in all_outfits:
    if outfit.get('attributes') and isinstance(outfit['attributes'], dict):
        if outfit['attributes'].get('sub_pillars'):
            has_subpillars_in_attrs += 1

print(f"Total outfits: {len(all_outfits)}")
print(f"Outfits with attributes: {has_attrs}")
print(f"Outfits with sub-pillars in attributes: {has_subpillars_in_attrs}")
