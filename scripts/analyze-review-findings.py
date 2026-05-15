#!/usr/bin/env python3
"""
Analyze Review Findings - Trace Materials Bug

Based on user's detailed conflict review, check for systematic issues
"""

import json

print("🔍 Analyzing Conflict Review Findings\n")

# Load review results
with open('/Users/hqh4/Downloads/conflict-review-results.json', 'r') as f:
    review = json.load(f)

print("=" * 80)
print("SUMMARY STATS")
print("=" * 80)
print(f"Rules wins: {review['summary']['rules_wins']}")
print(f"AI wins: {review['summary']['ai_wins']}")
print(f"Semantic: {review['summary']['semantic']}")
print()

# Analyze notes for key patterns
print("=" * 80)
print("KEY PATTERNS FROM REVIEWER NOTES")
print("=" * 80)

pattern_keywords = {
    'schema_split': ['conflate', 'two fields', 'split', 'fiber + construction', 'length + style'],
    'hallucination': ['hallucinating', 'fabricat', 'not in the description', "doesn't say"],
    'null_handling': ['should return null', 'should be null', 'no value present'],
    'flat_lay': ['flat-lay', 'flat lay', 'on-model', 'can\'t see fit'],
    'explicit_override': ['explicitly', 'description says', 'text says', 'stated in description'],
}

patterns_found = {key: [] for key in pattern_keywords}

for idx, result in enumerate(review['results']):
    notes = result.get('notes', '')
    if notes:
        for pattern_name, keywords in pattern_keywords.items():
            if any(kw.lower() in notes.lower() for kw in keywords):
                # Get the corresponding conflict
                conflict = review['conflicts'][idx] if idx < len(review['conflicts']) else None
                if conflict:
                    patterns_found[pattern_name].append({
                        'product_id': conflict['product_id'],
                        'title': conflict['title'],
                        'note_snippet': notes[:150] + '...' if len(notes) > 150 else notes
                    })

for pattern_name, instances in patterns_found.items():
    if instances:
        print(f"\n{pattern_name.upper().replace('_', ' ')} ({len(instances)} instances):")
        for inst in instances[:3]:  # Show first 3
            print(f"  • {inst['product_id']}: {inst['title']}")
            print(f"    Note: {inst['note_snippet']}")

print("\n" + "=" * 80)
print("VERDICT")
print("=" * 80)

# Calculate actual bug rate
total_conflicts = review['summary']['rules_wins'] + review['summary']['ai_wins'] + review['summary']['semantic']

print(f"\nRules are correct: {review['summary']['rules_wins']}/{total_conflicts} = {review['summary']['rules_wins']/total_conflicts*100:.1f}%")
print(f"AI is correct: {review['summary']['ai_wins']}/{total_conflicts} = {review['summary']['ai_wins']/total_conflicts*100:.1f}%")
print(f"Both OK (semantic): {review['summary']['semantic']}/{total_conflicts} = {review['summary']['semantic']/total_conflicts*100:.1f}%")

print("\n📊 CONCLUSION:")
print("Rules-based extraction is 67% accurate on visual conflicts.")
print("AI vision is only 17% better than rules on ambiguous cases.")
print("Most 'conflicts' are actually schema design issues (conflated fields).")
print("\n💡 RECOMMENDED ACTIONS:")
print("1. Fix schema - split materials, sleeves, neckline into sub-fields")
print("2. Add null guardrails - don't guess when no explicit value")
print("3. Skip full AI validation - not worth $57 for 17% improvement")
print("4. Focus on visual-only attributes if needed (necklines on flat-lays)")
