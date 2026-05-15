#!/usr/bin/env python3
"""
Show sample of outfits with attributes
"""

import os
import json
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Get outfits with attributes
response = supabase.table('outfits').select('*').execute()
outfits_with_attrs = [o for o in response.data if o.get('attributes')]

print(f"Found {len(outfits_with_attrs)} outfits with attributes\n")

for outfit in outfits_with_attrs[:5]:
    print(f"Outfit ID: {outfit['outfit_id']}")
    print(f"Attributes: {json.dumps(outfit['attributes'], indent=2)}")
    print()
