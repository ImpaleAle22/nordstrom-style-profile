#!/usr/bin/env python3
"""
Detailed check of outfit data
"""

import os
import json
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

response = supabase.table('outfits').select('*').limit(10).execute()
outfits = response.data

print(f"Checking {len(outfits)} outfits\n")

for outfit in outfits:
    print(f"Outfit ID: {outfit['outfit_id']}")
    attrs = outfit.get('attributes')
    print(f"  attributes field exists: {attrs is not None}")
    print(f"  attributes value: {attrs}")
    print(f"  attributes type: {type(attrs)}")
    
    # Check if it's truthy
    if attrs:
        print(f"  ✅ Has attributes")
        if isinstance(attrs, dict):
            print(f"  Keys: {list(attrs.keys())}")
    else:
        print(f"  ❌ No attributes (falsy)")
    print()
