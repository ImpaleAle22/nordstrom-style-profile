#!/usr/bin/env python3
"""
Test Upload Access - Validate before bulk upload

Quick test to verify:
1. Can connect to Supabase
2. Can read products
3. Can update products (write access)
"""

import json
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

# ============================================================================
# CONFIG
# ============================================================================

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_ANON_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

SUPABASE_KEY = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY

print("🧪 Testing Supabase Upload Access\n")
print(f"URL: {SUPABASE_URL}")
print(f"Key type: {'service_role' if SUPABASE_SERVICE_KEY else 'anon'}\n")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing credentials in .env.local")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================================
# TEST 1: READ ACCESS
# ============================================================================

print("TEST 1: Read Access")
try:
    response = supabase.table('products').select('product_id, title').limit(1).execute()
    if response.data and len(response.data) > 0:
        print(f"  ✅ Can read products")
        test_product_id = response.data[0]['product_id']
    else:
        print(f"  ❌ No products found")
        sys.exit(1)
except Exception as e:
    print(f"  ❌ Read failed: {e}")
    sys.exit(1)

# ============================================================================
# TEST 2: SCHEMA CHECK
# ============================================================================

print("\nTEST 2: Schema Check")
try:
    response = supabase.table('products').select(
        'product_id, materials, materials_confidence, materials_source, overall_confidence'
    ).limit(1).execute()

    if response.data:
        print(f"  ✅ Confidence columns exist")
    else:
        print(f"  ❌ Could not verify schema")
        sys.exit(1)
except Exception as e:
    if 'could not find' in str(e).lower():
        print(f"  ❌ Missing confidence columns - run migration first")
        print(f"     Execute: scripts/add-confidence-columns.sql")
    else:
        print(f"  ❌ Schema check failed: {e}")
    sys.exit(1)

# ============================================================================
# TEST 3: WRITE ACCESS
# ============================================================================

print("\nTEST 3: Write Access")

# Read first product from extracted file
INPUT_FILE = "extracted-attributes.jsonl"
if not Path(INPUT_FILE).exists():
    print(f"  ❌ {INPUT_FILE} not found")
    sys.exit(1)

with open(INPUT_FILE, 'r') as f:
    test_product = json.loads(f.readline())

test_id = test_product['product_id']

try:
    # Attempt update
    update_data = {
        'materials': test_product.get('materials', []),
        'materials_confidence': test_product.get('materials_confidence'),
        'overall_confidence': test_product.get('overall_confidence')
    }

    response = supabase.table('products').update(update_data).eq('product_id', test_id).execute()

    if response.data and len(response.data) > 0:
        print(f"  ✅ Can update products")
        print(f"     Test product: {test_id}")
    else:
        print(f"  ❌ Update returned no data - RLS blocking writes")
        print(f"     You need SUPABASE_SERVICE_ROLE_KEY in .env.local")
        print(f"     Get it from: Settings > API > service_role secret")
        sys.exit(1)

except Exception as e:
    print(f"  ❌ Update failed: {e}")
    sys.exit(1)

# ============================================================================
# SUCCESS
# ============================================================================

print("\n" + "=" * 80)
print("✅ ALL TESTS PASSED")
print("=" * 80)
print("\nYou can now run the full upload:")
print("  python3 scripts/upload-extracted-attributes.py --batch-size 100\n")
