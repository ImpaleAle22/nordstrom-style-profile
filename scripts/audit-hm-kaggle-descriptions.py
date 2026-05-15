#!/usr/bin/env python3
"""
H&M Kaggle Description Audit

Analyzes H&M Kaggle product descriptions to identify extractable attributes.
Shows what can be moved from unstructured text to structured data fields.

Usage:
    python3 scripts/audit-hm-kaggle-descriptions.py [sample-size]

Sample size defaults to 500 products.
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# Path to H&M transformed data
HM_DATA_PATH = Path("/Users/hqh4/claude/edit-engine/scripts/_hm_transformed_temp.json")

# Attribute extraction patterns
PATTERNS = {
    "materials": [
        r'\b(cotton|polyester|wool|silk|linen|cashmere|leather|suede|denim|jersey|fleece|nylon|spandex|rayon|viscose|modal|acrylic|satin|chiffon|velvet|corduroy|twill|canvas|knit|woven|mesh|velour|lace|sequin|beaded|metallic|faux leather|faux fur|organic cotton|recycled polyester|stretch|ribbed|cable[ -]?knit|bouclé|crochet|pointelle|terry|fleece|sweatshirt fabric)\b',
    ],
    "fits": [
        r'\b(fitted|relaxed|oversized|loose|tight|regular fit|slim fit|loose fit|comfort fit|athletic fit|tailored|snug|form-fitting|body-hugging|generous fit)\b',
    ],
    "lengths": [
        r'\b(cropped|mini|short|above[ -]knee|knee[ -]length|midi|maxi|ankle[ -]length|floor[ -]length|calf[ -]length|hip[ -]length|thigh[ -]high|tunic|longline|long)\b',
    ],
    "necklines": [
        r'\b(v-neck|crew neck|scoop neck|square neck|boat neck|cowl neck|halter|off[ -]?shoulder|one[ -]?shoulder|strapless|high neck|mock neck|turtleneck|collared|keyhole|sweetheart|plunging|round neck|stand[ -]up collar|funnel neck)\b',
    ],
    "sleeves": [
        r'\b(sleeveless|short sleeve|long sleeve|cap sleeve|3\/4 sleeve|bell sleeve|puff sleeve|balloon sleeve|flutter sleeve|raglan|dolman|batwing|bishop sleeve|lantern sleeve|kimono sleeve|cold shoulder|narrow shoulder straps|wide shoulder straps|adjustable straps)\b',
    ],
    "details": [
        r'\b(ruffles?|pleats?|ruching|smocking|embroidered|beaded|sequined|lace|cutout|tie[ -]?front|button[ -]?down|buttons?|zipper|drawstring|belted|pockets?|split|slit|gathered|tiered|asymmetric|wrap|fringe|tassels|studs|printed|striped|polka dot|floral|geometric|ribbed hems?|elasticated|side pockets?|back pocket|chest pocket|patch pockets?|snap fasteners?|concealed|brushed inside|soft inside|lined|unlined|padded|quilted|hood|hooded)\b',
    ],
    "silhouettes": [
        r'\b(a-line|bodycon|wrap|shift|sheath|fit and flare|empire|peplum|straight|pencil|flared|wide[ -]?leg|bootcut|skinny|boyfriend|mom fit|tapered|high[ -]waisted|mid[ -]waisted|low[ -]waisted)\b',
    ],
    "closures": [
        r'\b(zip|zipper|button|snap|hook|clasp|tie|lace[ -]?up|pull[ -]?on|elasticated|drawstring|buckle|velcro|magnetic)\b',
    ],
    "occasions": [
        r'\b(casual|formal|work|office|business|evening|party|cocktail|date|weekend|vacation|lounge|athletic|workout|gym|yoga|running|outdoor|everyday|special occasion)\b',
    ],
}

def extract_attributes(description):
    """Extract all matching attributes from description text."""
    found = defaultdict(set)
    desc_lower = description.lower()

    for category, patterns in PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, desc_lower, re.IGNORECASE)
            for match in matches:
                found[category].add(match.strip())

    return dict(found)

def analyze_descriptions(sample_size=500):
    """Analyze a sample of H&M descriptions."""
    print(f"\n🔍 Analyzing up to {sample_size} H&M product descriptions...")
    print(f"📂 Reading from: {HM_DATA_PATH}\n")

    if not HM_DATA_PATH.exists():
        print(f"❌ File not found: {HM_DATA_PATH}")
        sys.exit(1)

    # Collect results
    descriptions = []
    all_patterns = defaultdict(lambda: defaultdict(int))
    extractable_counts = defaultdict(int)

    # Read file in chunks
    seen_descriptions = set()

    with open(HM_DATA_PATH, 'r') as f:
        buffer = ""
        processed = 0

        while processed < sample_size:
            chunk = f.read(10_000_000)  # 10MB chunks
            if not chunk:
                break

            buffer += chunk

            # Find description fields
            idx = 0
            while processed < sample_size:
                desc_idx = buffer.find('"description":"', idx)
                if desc_idx == -1 or desc_idx > len(buffer) - 1000:
                    break

                # Extract description value
                desc_start = desc_idx + 15
                desc_end = buffer.find('"', desc_start)

                if desc_end == -1:
                    break

                desc = buffer[desc_start:desc_end]
                desc = desc.replace('\\n', ' ').replace('\\/', '/')

                if desc and len(desc) > 15 and desc not in seen_descriptions:
                    seen_descriptions.add(desc)

                    # Extract attributes
                    attrs = extract_attributes(desc)

                    # Track patterns
                    for category, values in attrs.items():
                        extractable_counts[category] += 1
                        for value in values:
                            all_patterns[category][value] += 1

                    # Save sample
                    if len(descriptions) < 20:  # Keep top 20 for display
                        descriptions.append({
                            "text": desc[:200],
                            "attributes": attrs,
                        })

                    processed += 1

                    if processed % 100 == 0:
                        print(f"   Processed {processed}/{sample_size} descriptions...")

                idx = desc_end + 1

            # Clear processed buffer
            if idx > 0:
                buffer = buffer[idx:]

    total = processed
    print(f"\n✓ Analyzed {total} unique descriptions\n")

    # Print results
    print("=" * 80)
    print("📊 ATTRIBUTE EXTRACTION REPORT")
    print("=" * 80 + "\n")

    print("🔧 Extractability by Category:")
    print(f"   (% of products where patterns found at least one match)\n")

    categories = sorted(extractable_counts.items(), key=lambda x: x[1], reverse=True)
    for category, count in categories:
        percentage = (count / total) * 100
        bar = '█' * int(percentage / 2)
        print(f"   {category.ljust(15)} {bar} {percentage:.1f}% ({count}/{total})")

    print("\n\n🏷️  Most Common Patterns per Category:\n")

    for category in sorted(all_patterns.keys()):
        patterns = all_patterns[category]
        top_5 = sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:5]

        if top_5:
            print(f"   {category.upper()}:")
            for pattern, count in top_5:
                print(f"      • {pattern}: {count} products ({(count/total)*100:.1f}%)")
            print()

    print("=" * 80)
    print("📝 SAMPLE EXTRACTIONS\n")

    for i, sample in enumerate(descriptions[:10], 1):
        print(f"{i}. \"{sample['text']}\"")
        if sample['attributes']:
            attrs_str = ", ".join([f"{k}: {', '.join(v)}" for k, v in sample['attributes'].items()])
            print(f"   → {attrs_str}")
        else:
            print("   → (no patterns matched)")
        print()

    # Recommendations
    print("=" * 80)
    print("💡 RECOMMENDATIONS\n")

    if total == 0:
        print("❌ No descriptions found in file!")
        print("Check file format and description field name.")
        return

    if len(extractable_counts) == 0:
        print("⚠️  No patterns matched!")
        print("Descriptions may be too short or use different terminology.")
        return

    avg_extractability = sum(count for count in extractable_counts.values()) / len(extractable_counts) / total * 100

    print(f"Average extractability: {avg_extractability:.1f}%")
    print(f"Total unique descriptions: {total}")
    print()

    if avg_extractability >= 50:
        print("✅ STRONG RULES POTENTIAL")
        print()
        print("H&M descriptions contain rich extractable data! Recommended approach:")
        print()
        print("1. Build rules layer for high-coverage attributes:")
        for cat, count in categories[:3]:
            print(f"   • {cat}: {(count/total)*100:.1f}% coverage")
        print()
        print("2. Extract to structured fields:")
        print("   • materials → materials[] array")
        print("   • fits → fit field")
        print("   • sleeves → sleeve_style field")
        print("   • necklines → neckline field")
        print("   • details → details[] array")
        print()
        print("3. Use AI vision to verify/supplement rules")
        print("   • Pass description + image to AI")
        print("   • AI confirms rules or adds missing attributes")
        print("   • Track confidence: rules (90%), AI verification (95%)")
        print()
        print("4. Keep original description as backup")
        print("   • Don't delete unstructured text")
        print("   • Useful for search and AI context")
    else:
        print("🟡 MODERATE RULES POTENTIAL")
        print()
        print("Descriptions have some extractable data but may need AI-first approach.")
        print("Consider hybrid: rules for explicit matches, AI for everything else.")

    print("\n" + "=" * 80 + "\n")

if __name__ == "__main__":
    sample_size = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    analyze_descriptions(sample_size)
