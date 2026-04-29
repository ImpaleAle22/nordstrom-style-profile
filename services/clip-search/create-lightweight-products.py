#!/usr/bin/env python3
"""
Create lightweight products file for CLIP API deployment.

Strips down the 1.2GB products file to just the essentials:
- productId
- title
- brand
- price
- department
- productType1/2
- imageUrl (computed from images)
- embeddingFlat or embeddingOnModel
- simplifiedColors, materials (for filtering)

Output is ~100MB instead of 1.2GB.
"""

import json
import sys
from pathlib import Path

def select_best_image_url(images, r2_base_url):
    """
    Select best image and return full R2 URL.
    Priority: primary-flat-lay > any flat-lay > non-lifestyle > first
    """
    if not images:
        return None

    def get_url(img):
        # Use external URL if available
        if img.get('url'):
            return img['url']
        # Convert localImagePath to R2 URL
        if img.get('localImagePath'):
            local_path = img['localImagePath']
            # Remove 'product-images/' prefix if present
            if local_path.startswith('product-images/'):
                filename = local_path.split('/')[-1]
            else:
                filename = local_path
            return f"{r2_base_url}/product-images/{filename}"
        return None

    # Priority 1: Primary flat-lay
    for img in images:
        img_type = img.get('type', '')
        if img_type == 'primary-flat-lay' or ('flat-lay' in img_type.lower() and img.get('isPrimary')):
            url = get_url(img)
            if url:
                return url

    # Priority 2: Any flat-lay
    for img in images:
        if 'flat-lay' in img.get('type', '').lower():
            url = get_url(img)
            if url:
                return url

    # Priority 3: Non-lifestyle
    for img in images:
        if 'lifestyle' not in img.get('type', '').lower():
            url = get_url(img)
            if url:
                return url

    # Priority 4: First image
    return get_url(images[0])

def create_lightweight_products(input_path, output_path, r2_base_url):
    """Create lightweight products file with only CLIP essentials."""
    print(f"Loading products from {input_path}...")
    with open(input_path) as f:
        products = json.load(f)

    print(f"Loaded {len(products):,} products")
    print(f"R2 base URL: {r2_base_url}")

    lightweight = []
    skipped_no_embedding = 0
    skipped_no_image = 0

    for product in products:
        # Must have embedding
        embedding = product.get('embeddingFlat') or product.get('embeddingOnModel')
        if not embedding:
            skipped_no_embedding += 1
            continue

        # Compute image URL
        imageUrl = select_best_image_url(product.get('images', []), r2_base_url)
        if not imageUrl:
            skipped_no_image += 1
            continue

        # Extract only essential fields
        lightweight_product = {
            'productId': product.get('productId'),
            'title': product.get('title'),
            'brand': product.get('brand'),
            'price': product.get('price'),
            'department': product.get('department'),
            'productType1': product.get('productType1'),
            'productType2': product.get('productType2'),
            'imageUrl': imageUrl,
            'simplifiedColors': product.get('simplifiedColors', []),
            'materials': product.get('materials', []),
        }

        # Add embedding (keep the one that exists)
        if product.get('embeddingFlat'):
            lightweight_product['embeddingFlat'] = product['embeddingFlat']
        elif product.get('embeddingOnModel'):
            lightweight_product['embeddingOnModel'] = product['embeddingOnModel']

        lightweight.append(lightweight_product)

    print(f"\n✓ Created lightweight version:")
    print(f"  Kept: {len(lightweight):,} products")
    print(f"  Skipped (no embedding): {skipped_no_embedding:,}")
    print(f"  Skipped (no image): {skipped_no_image:,}")

    # Save
    print(f"\nSaving to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(lightweight, f)

    # Check file sizes
    input_size_mb = Path(input_path).stat().st_size / 1024 / 1024
    output_size_mb = Path(output_path).stat().st_size / 1024 / 1024
    print(f"\n✓ Complete!")
    print(f"  Input size: {input_size_mb:.1f} MB")
    print(f"  Output size: {output_size_mb:.1f} MB")
    print(f"  Reduction: {(1 - output_size_mb/input_size_mb) * 100:.1f}%")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python create-lightweight-products.py <R2_BASE_URL>")
        print("Example: python create-lightweight-products.py https://pub-abc123.r2.dev")
        sys.exit(1)

    r2_base_url = sys.argv[1].rstrip('/')

    input_path = Path(__file__).parent.parent.parent / "scripts" / "products-MASTER-SOURCE-OF-TRUTH.json"
    output_path = Path(__file__).parent / "products-lightweight.json"

    create_lightweight_products(input_path, output_path, r2_base_url)