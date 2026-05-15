#!/usr/bin/env python3
"""
Update Products with Validated AI Attributes

Takes the validation test results and updates the database with
accepted AI attributes (rejected conflicts are skipped)
"""

import json
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📦 Updating Products with Validated AI Attributes\n")

# Load validation results
with open('validation-test-1000-results.json', 'r') as f:
    results = json.load(f)

print(f"✅ Loaded validation results:")
print(f"   Total products: {results['total']}")
print(f"   Successfully processed: {results['processed']}")
print(f"   Conflicts detected: {results['conflicts_detected']}")
print(f"   AI accepted: {results['ai_accepted']}")
print()

# Load the full checkpoint to get all product data
checkpoint_file = 'validation-checkpoint-1000.json'
if not os.path.exists(checkpoint_file):
    print("❌ Checkpoint file not found")
    print("   Need to reconstruct from validation output...")
    exit(1)

with open(checkpoint_file, 'r') as f:
    checkpoint = json.load(f)

# Get all products from the test
print("📊 Loading products from database...")
response = supabase.table('products').select('*').limit(2000).execute()
all_products = {p['product_id']: p for p in response.data}
print(f"✅ Loaded {len(all_products)} products\n")

# Load the original test data to get AI results
# We need to re-run the AI extraction on the checkpoint products
# But actually, we don't have the AI results stored...

# Better approach: Re-parse the validation output file
print("📄 Parsing validation output file...")
validation_data = {}

with open('validation-1000-output.txt', 'r') as f:
    current_product_id = None
    current_had_conflict = False

    for line in f:
        # Match product lines like: [1/1000] hm-kaggle-0594978016: Classic Pilot sunglasses...
        if line.startswith('[') and ']' in line:
            # Extract product_id
            parts = line.split('] ', 1)
            if len(parts) > 1:
                rest = parts[1]
                product_id = rest.split(':', 1)[0].strip()
                current_product_id = product_id
                current_had_conflict = False

        # Check for conflicts
        elif '🚫 CONFLICT' in line and current_product_id:
            current_had_conflict = True
            if current_product_id not in validation_data:
                validation_data[current_product_id] = {}
            validation_data[current_product_id]['has_conflict'] = True

        # Check for gap fills
        elif '✅ Filled' in line and current_product_id:
            if not current_had_conflict:
                gaps = int(line.split('Filled ')[1].split(' gaps')[0])
                if current_product_id not in validation_data:
                    validation_data[current_product_id] = {}
                validation_data[current_product_id]['gaps_filled'] = gaps
                validation_data[current_product_id]['has_conflict'] = False

print(f"✅ Parsed {len(validation_data)} products from output\n")

# Actually, the better way is to just re-run AI extraction on products without conflicts
# But that would take another 8-10 minutes...

# Even better: Let's create a script that processes the raw output with product IDs
# and updates incrementally

print("⚠️  WARNING: This approach requires the full AI extraction data")
print("   The validation output only shows conflicts, not the full AI results")
print()
print("💡 BETTER APPROACH:")
print("   1. Re-run validation test with --update flag")
print("   2. Or save AI results during validation")
print("   3. Then update database")
print()

# Let's modify the approach: create a version that saves and uploads
print("Creating update script that saves AI data during processing...\n")

update_script = '''#!/usr/bin/env python3
"""
Update Products with AI Validation (saves and uploads)
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

# Load the validation results
with open('validation-test-1000-results.json', 'r') as f:
    results = json.load(f)

# Get list of product IDs that had conflicts
conflict_product_ids = {ex['product_id'] for ex in results['examples']}

print(f"🚫 Skipping {len(conflict_product_ids)} products with conflicts")
print()

# Load checkpoint to get processed products
with open('validation-checkpoint-1000.json', 'r') as f:
    checkpoint = json.load(f)
    processed_ids = set(checkpoint['processed_ids'])

print(f"✅ Found {len(processed_ids)} successfully processed products")
print(f"📊 Will update {len(processed_ids) - len(conflict_product_ids)} products")
print()

# Now we need to get the full product data with both rules and AI attributes
# Since we don't have AI data saved, we need to either:
# 1. Re-run AI extraction (takes time)
# 2. Load from a saved file if it exists

# For now, let's just demonstrate the update logic
print("⚠️  Note: Full implementation requires saved AI extraction data")
print("   See: validation-with-updates.py for complete version")
'''

with open('scripts/update-products-demo.py', 'w') as f:
    f.write(update_script)

print("✅ Created scripts/update-products-demo.py")
print()
print("=" * 80)
print("RECOMMENDED APPROACH")
print("=" * 80)
print()
print("Since the validation output doesn't include full AI results,")
print("we need to create an updated version that:")
print()
print("1. Saves AI results + validation decisions during processing")
print("2. Then updates database with merged attributes")
print()
print("Creating enhanced validation script...")
