#!/usr/bin/env python3
"""
Analyze Confidence Patterns - Fixed to count VALUES not TYPES

Check relationship between:
- Total number of VALUES extracted vs confidence
- Count materials array, details array, etc. as individual values
"""

import json
from collections import defaultdict

print("🔍 Analyzing Confidence Patterns (Counting VALUES)\n")

# Track stats
coverage_buckets = {
    '1-3 values': {'count': 0, 'avg_confidence': [], 'examples': []},
    '4-6 values': {'count': 0, 'avg_confidence': [], 'examples': []},
    '7-10 values': {'count': 0, 'avg_confidence': [], 'examples': []},
    '11-15 values': {'count': 0, 'avg_confidence': [], 'examples': []},
    '16+ values': {'count': 0, 'avg_confidence': [], 'examples': []},
}

# Array fields that contain multiple values
array_fields = ['materials', 'details']

with open('extracted-attributes.jsonl', 'r') as f:
    for line in f:
        product = json.loads(line)

        # Count TOTAL values across all attributes
        total_values = 0

        # Count array fields
        for field in array_fields:
            if field in product and isinstance(product[field], list):
                total_values += len(product[field])

        # Count single-value fields
        single_fields = ['fit', 'neckline', 'sleeve_style', 'silhouette', 'waistline']
        for field in single_fields:
            if field in product:
                total_values += 1

        # Get overall confidence
        overall_confidence = product.get('overall_confidence', 0)

        # Categorize by coverage
        if total_values <= 3:
            bucket = '1-3 values'
        elif total_values <= 6:
            bucket = '4-6 values'
        elif total_values <= 10:
            bucket = '7-10 values'
        elif total_values <= 15:
            bucket = '11-15 values'
        else:
            bucket = '16+ values'

        coverage_buckets[bucket]['count'] += 1
        coverage_buckets[bucket]['avg_confidence'].append(overall_confidence)

        # Save examples
        if len(coverage_buckets[bucket]['examples']) < 3:
            coverage_buckets[bucket]['examples'].append({
                'id': product['product_id'],
                'values': total_values,
                'confidence': overall_confidence,
                'materials': product.get('materials', []),
                'details': product.get('details', [])
            })

# Print results
print("=" * 80)
print("TOTAL VALUES vs CONFIDENCE ANALYSIS")
print("=" * 80 + "\n")

for bucket, stats in coverage_buckets.items():
    if stats['count'] > 0:
        avg_conf = sum(stats['avg_confidence']) / len(stats['avg_confidence'])

        print(f"{bucket}:")
        print(f"  Products: {stats['count']:,}")
        print(f"  Average overall confidence: {avg_conf:.1f}%")

        if stats['examples']:
            print(f"  Examples:")
            for ex in stats['examples']:
                print(f"    - {ex['id']}: {ex['values']} values, {ex['confidence']}% confidence")
                if ex['materials']:
                    print(f"      Materials: {', '.join(ex['materials'][:5])}")
                if ex['details']:
                    print(f"      Details: {', '.join(ex['details'][:5])}")
        print()

print("=" * 80)
print("RICHEST PRODUCTS (Most Values)")
print("=" * 80 + "\n")

# Find top 10 richest products
all_products = []
with open('extracted-attributes.jsonl', 'r') as f:
    for line in f:
        product = json.loads(line)
        total_values = 0

        for field in array_fields:
            if field in product and isinstance(product[field], list):
                total_values += len(product[field])

        single_fields = ['fit', 'neckline', 'sleeve_style', 'silhouette', 'waistline']
        for field in single_fields:
            if field in product:
                total_values += 1

        all_products.append({
            'id': product['product_id'],
            'values': total_values,
            'confidence': product.get('overall_confidence', 0),
            'materials': product.get('materials', []),
            'details': product.get('details', []),
            'fit': product.get('fit'),
            'neckline': product.get('neckline'),
        })

# Sort by values
all_products.sort(key=lambda x: x['values'], reverse=True)

for i, prod in enumerate(all_products[:10], 1):
    print(f"{i}. {prod['id']}: {prod['values']} values ({prod['confidence']}% confidence)")
    if prod['materials']:
        print(f"   Materials ({len(prod['materials'])}): {', '.join(prod['materials'][:8])}")
    if prod['details']:
        print(f"   Details ({len(prod['details'])}): {', '.join(prod['details'][:8])}")
    if prod['fit']:
        print(f"   Fit: {prod['fit']}")
    if prod['neckline']:
        print(f"   Neckline: {prod['neckline']}")
    print()
