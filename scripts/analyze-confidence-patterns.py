#!/usr/bin/env python3
"""
Analyze Confidence Patterns

Check relationship between:
- Number of attributes extracted vs confidence scores
- Coverage (sparse vs rich descriptions) vs confidence
"""

import json
from collections import defaultdict

print("🔍 Analyzing Confidence Patterns\n")

# Track stats
coverage_buckets = {
    '1-2 attributes': {'count': 0, 'low_confidence': 0, 'avg_confidence': []},
    '3-4 attributes': {'count': 0, 'low_confidence': 0, 'avg_confidence': []},
    '5-6 attributes': {'count': 0, 'low_confidence': 0, 'avg_confidence': []},
    '7+ attributes': {'count': 0, 'low_confidence': 0, 'avg_confidence': []},
}

attribute_confidence_map = defaultdict(list)
low_confidence_count = 0
high_confidence_count = 0

# All possible attribute types
attribute_types = ['materials', 'fit', 'neckline', 'sleeve_style', 'silhouette', 'waistline', 'details']

with open('extracted-attributes.jsonl', 'r') as f:
    for line in f:
        product = json.loads(line)

        # Count how many attributes were extracted
        extracted_attrs = []
        has_low_confidence = False
        confidences = []

        for attr in attribute_types:
            if attr in product:
                extracted_attrs.append(attr)
                conf_key = f"{attr}_confidence"
                if conf_key in product:
                    confidence = product[conf_key]
                    confidences.append(confidence)
                    attribute_confidence_map[attr].append(confidence)

                    if confidence < 70:
                        has_low_confidence = True

        attr_count = len(extracted_attrs)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        # Categorize by coverage
        if attr_count <= 2:
            bucket = '1-2 attributes'
        elif attr_count <= 4:
            bucket = '3-4 attributes'
        elif attr_count <= 6:
            bucket = '5-6 attributes'
        else:
            bucket = '7+ attributes'

        coverage_buckets[bucket]['count'] += 1
        coverage_buckets[bucket]['avg_confidence'].append(avg_confidence)

        if has_low_confidence:
            coverage_buckets[bucket]['low_confidence'] += 1
            low_confidence_count += 1
        else:
            high_confidence_count += 1

# Print results
print("=" * 80)
print("COVERAGE vs CONFIDENCE ANALYSIS")
print("=" * 80 + "\n")

for bucket, stats in coverage_buckets.items():
    if stats['count'] > 0:
        avg_conf = sum(stats['avg_confidence']) / len(stats['avg_confidence'])
        low_conf_pct = (stats['low_confidence'] / stats['count']) * 100

        print(f"{bucket}:")
        print(f"  Products: {stats['count']:,}")
        print(f"  Has low confidence (<70%): {stats['low_confidence']:,} ({low_conf_pct:.1f}%)")
        print(f"  Average overall confidence: {avg_conf:.1f}%")
        print()

print("=" * 80)
print("PER-ATTRIBUTE CONFIDENCE")
print("=" * 80 + "\n")

for attr in attribute_types:
    if attr in attribute_confidence_map:
        confidences = attribute_confidence_map[attr]
        avg = sum(confidences) / len(confidences)
        low = sum(1 for c in confidences if c < 70)
        low_pct = (low / len(confidences)) * 100

        print(f"{attr}:")
        print(f"  Extracted in: {len(confidences):,} products")
        print(f"  Average confidence: {avg:.1f}%")
        print(f"  Low confidence (<70%): {low:,} ({low_pct:.1f}%)")
        print()

print("=" * 80)
print("SUMMARY")
print("=" * 80 + "\n")

total_products = low_confidence_count + high_confidence_count
print(f"Total products analyzed: {total_products:,}")
print(f"Products with ANY low-confidence attribute: {low_confidence_count:,} ({(low_confidence_count/total_products)*100:.1f}%)")
print(f"Products with ALL high-confidence: {high_confidence_count:,} ({(high_confidence_count/total_products)*100:.1f}%)")
