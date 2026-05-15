#!/usr/bin/env python3
"""
Upload Extracted Attributes to Supabase

Reads extracted-attributes.jsonl and updates products table in Supabase
with per-attribute confidence scores.

Features:
- Checkpoint/resume support
- Progress tracking
- Error handling
- Batch updates for performance

Usage:
    python3 scripts/upload-extracted-attributes.py [--batch-size N] [--resume]

Options:
    --batch-size N    Number of products to update per batch (default: 100)
    --resume          Resume from last checkpoint
    --dry-run         Show what would be updated without actually updating
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, List
import time

# Add parent directory to path to import from lib
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.local')

# Import Supabase
try:
    from supabase import create_client, Client
except ImportError:
    print("Installing supabase...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "supabase"])
    from supabase import create_client, Client

# ============================================================================
# CONFIGURATION
# ============================================================================

INPUT_FILE = "extracted-attributes.jsonl"
CHECKPOINT_FILE = "upload-checkpoint.json"
ERROR_LOG_FILE = "upload-errors.jsonl"

# Initialize Supabase client
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_ANON_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL:
    print("❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local")
    sys.exit(1)

# Prefer service role key for admin operations
SUPABASE_KEY = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY

if not SUPABASE_KEY:
    print("❌ Missing Supabase key in .env.local")
    print("   Need either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    sys.exit(1)

if SUPABASE_SERVICE_KEY:
    print(f"✅ Using service_role key for admin operations")
else:
    print(f"⚠️  Using anon key - may fail due to RLS policies")
    print(f"   Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full access")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================================
# CHECKPOINT MANAGEMENT
# ============================================================================

def load_checkpoint() -> Dict[str, Any]:
    """Load checkpoint if exists"""
    if Path(CHECKPOINT_FILE).exists():
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {
        'processed': 0,
        'updated': 0,
        'skipped': 0,
        'errors': 0,
        'last_product_id': None,
        'timestamp': None,
    }

def save_checkpoint(checkpoint: Dict[str, Any]):
    """Save checkpoint"""
    checkpoint['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f, indent=2)

def log_error(product_id: str, error: str):
    """Log error to file"""
    with open(ERROR_LOG_FILE, 'a') as f:
        f.write(json.dumps({
            'product_id': product_id,
            'error': str(error),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        }) + '\n')

# ============================================================================
# SUPABASE UPDATE
# ============================================================================

def flatten_extraction_for_update(extraction: Dict[str, Any]) -> Dict[str, Any]:
    """
    Flatten extraction result into Supabase update format

    Input: {
        "materials": ["jersey", "cotton"],
        "materials_confidence": 95,
        "materials_source": "rules-description",
        ...
    }

    Output: Same format but ready for Supabase update
    """
    update = {}

    # Copy all fields except product_id and description
    for key, value in extraction.items():
        if key not in ['product_id', 'description']:
            update[key] = value

    return update

def update_product_batch(products: List[Dict[str, Any]]) -> tuple[int, int]:
    """
    Update a batch of products in Supabase

    Returns: (success_count, error_count)
    """
    success = 0
    errors = 0

    for product in products:
        product_id = product.get('product_id')
        if not product_id:
            errors += 1
            continue

        try:
            # Flatten extraction data
            update_data = flatten_extraction_for_update(product)

            # Update in Supabase
            response = supabase.table('products').update(update_data).eq('product_id', product_id).execute()

            # Check if update was successful
            if response.data:
                success += 1
            else:
                errors += 1
                error_msg = "No data returned from update - likely RLS policy blocking writes. Use service_role key instead of anon key."
                log_error(product_id, error_msg)

        except Exception as e:
            errors += 1
            log_error(product_id, str(e))

    return success, errors

# ============================================================================
# MAIN UPLOAD LOGIC
# ============================================================================

def upload_attributes(batch_size: int = 100, resume: bool = False, dry_run: bool = False):
    """Upload extracted attributes to Supabase"""

    print(f"\n🚀 Uploading Extracted Attributes to Supabase")
    print(f"   Mode: {'🧪 DRY RUN' if dry_run else '✅ LIVE UPDATE'}")
    print(f"   Batch size: {batch_size}")
    print(f"   Input: {INPUT_FILE}\n")

    # Check input file exists
    if not Path(INPUT_FILE).exists():
        print(f"❌ Input file not found: {INPUT_FILE}")
        sys.exit(1)

    # Load checkpoint
    checkpoint = load_checkpoint() if resume else {
        'processed': 0,
        'updated': 0,
        'skipped': 0,
        'errors': 0,
        'last_product_id': None,
        'timestamp': None,
    }

    if resume and checkpoint['processed'] > 0:
        print(f"📂 Resuming from checkpoint:")
        print(f"   Previously processed: {checkpoint['processed']}")
        print(f"   Last product: {checkpoint['last_product_id']}")
        print(f"   Timestamp: {checkpoint['timestamp']}\n")

    # Read and process file
    batch = []
    skip_until = checkpoint['last_product_id'] if resume else None
    should_skip = skip_until is not None
    first_batch = True

    start_time = time.time()

    with open(INPUT_FILE, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                product = json.loads(line.strip())
                product_id = product.get('product_id')

                # Skip until we reach the checkpoint
                if should_skip:
                    if product_id == skip_until:
                        should_skip = False
                    continue

                # Add to batch
                batch.append(product)

                # Process batch when full
                if len(batch) >= batch_size:
                    if not dry_run:
                        success, errors = update_product_batch(batch)
                        checkpoint['updated'] += success
                        checkpoint['errors'] += errors

                        # FAIL FAST: If first batch has 100% errors, abort immediately
                        if first_batch and success == 0 and errors == batch_size:
                            print(f"\n❌ ABORT: First batch had 100% errors ({errors}/{batch_size})")
                            print(f"   Check {ERROR_LOG_FILE} for details.")
                            print(f"   Common issue: Using anon key instead of service_role key")
                            print(f"   Fix the issue before retrying.")
                            sys.exit(1)

                        first_batch = False
                    else:
                        checkpoint['updated'] += len(batch)

                    checkpoint['processed'] += len(batch)
                    checkpoint['last_product_id'] = batch[-1]['product_id']

                    # Save checkpoint
                    if not dry_run:
                        save_checkpoint(checkpoint)

                    # Progress update
                    elapsed = time.time() - start_time
                    rate = checkpoint['processed'] / elapsed if elapsed > 0 else 0
                    print(f"   Processed {checkpoint['processed']:,} | "
                          f"Updated {checkpoint['updated']:,} | "
                          f"Errors {checkpoint['errors']} | "
                          f"Rate: {rate:.1f}/s")

                    batch = []

            except json.JSONDecodeError as e:
                print(f"   ⚠️  Line {line_num}: Invalid JSON - {e}")
                checkpoint['errors'] += 1
                continue

    # Process remaining batch
    if batch:
        if not dry_run:
            success, errors = update_product_batch(batch)
            checkpoint['updated'] += success
            checkpoint['errors'] += errors
        else:
            checkpoint['updated'] += len(batch)

        checkpoint['processed'] += len(batch)
        checkpoint['last_product_id'] = batch[-1]['product_id']

        if not dry_run:
            save_checkpoint(checkpoint)

    # Final report
    elapsed = time.time() - start_time
    print(f"\n{'=' * 80}")
    print("📊 UPLOAD COMPLETE")
    print('=' * 80 + '\n')

    print(f"Total processed: {checkpoint['processed']:,}")
    print(f"Successfully updated: {checkpoint['updated']:,}")
    print(f"Errors: {checkpoint['errors']}")

    if checkpoint['errors'] > 0:
        print(f"\n⚠️  See {ERROR_LOG_FILE} for error details")

    print(f"\nTime elapsed: {elapsed:.1f}s")
    print(f"Average rate: {checkpoint['processed']/elapsed:.1f} products/second")

    if dry_run:
        print("\n🧪 DRY RUN - No database changes made")
        print("   Remove --dry-run flag to perform actual updates")
    else:
        print("\n✅ Database updated successfully!")
        print(f"   Checkpoint saved to: {CHECKPOINT_FILE}")

    print()

# ============================================================================
# HELPER: VERIFY SAMPLE UPDATES
# ============================================================================

def verify_sample_updates(sample_size: int = 5):
    """Verify a few products were updated correctly"""

    print(f"\n🔍 Verifying sample updates (checking {sample_size} products)...\n")

    # Read first N products from input file
    products = []
    with open(INPUT_FILE, 'r') as f:
        for i, line in enumerate(f):
            if i >= sample_size:
                break
            products.append(json.loads(line))

    # Check each in Supabase
    for product in products:
        product_id = product['product_id']

        try:
            response = supabase.table('products').select('product_id, materials, materials_confidence, fit, fit_confidence, neckline, neckline_confidence').eq('product_id', product_id).execute()

            if response.data and len(response.data) > 0:
                db_product = response.data[0]
                print(f"✅ {product_id}")

                # Check materials
                if 'materials' in product:
                    expected = product['materials']
                    actual = db_product.get('materials')
                    match = "✓" if actual == expected else "✗"
                    print(f"   {match} materials: {actual} (confidence: {db_product.get('materials_confidence')})")

                # Check fit
                if 'fit' in product:
                    expected = product['fit']
                    actual = db_product.get('fit')
                    match = "✓" if actual == expected else "✗"
                    print(f"   {match} fit: {actual} (confidence: {db_product.get('fit_confidence')})")

                print()
            else:
                print(f"❌ {product_id} - Not found in database")

        except Exception as e:
            print(f"❌ {product_id} - Error: {e}")

# ============================================================================
# CLI ENTRY POINT
# ============================================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Upload extracted attributes to Supabase')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for updates')
    parser.add_argument('--resume', action='store_true', help='Resume from last checkpoint')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be updated without updating')
    parser.add_argument('--verify', action='store_true', help='Verify sample updates after upload')

    args = parser.parse_args()

    # Run upload
    upload_attributes(
        batch_size=args.batch_size,
        resume=args.resume,
        dry_run=args.dry_run
    )

    # Verify if requested
    if args.verify and not args.dry_run:
        verify_sample_updates()

if __name__ == '__main__':
    main()
