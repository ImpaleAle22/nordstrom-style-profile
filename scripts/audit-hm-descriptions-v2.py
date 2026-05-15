#!/usr/bin/env python3
"""
H&M Kaggle Description Audit - V2

Analyzes H&M Kaggle product descriptions using ijson for streaming.
Shows what attributes can be extracted from unstructured text into structured fields.

Usage:
    python3 scripts/audit-hm-descriptions-v2.py [sample-size]
"""

import re
import sys
import ijson
from collections import defaultdict
from pathlib import Path

HM_DATA_PATH = Path("/Users/hqh4/claude/edit-engine/scripts/_hm_transformed_temp.json")

# Attribute patterns
PATTERNS = {
    "materials": r'\b(cotton|polyester|wool|silk|linen|cashmere|leather|suede|denim|jersey|fleece|nylon|spandex|rayon|viscose|modal|acrylic|satin|chiffon|velvet|corduroy|twill|canvas|knit|woven|mesh|velour|lace|sequin|beaded|stretch|ribbed|cable[ -]?knit|bouclé|crochet|terry|sweatshirt fabric|organza|taffeta|tulle|faux leather|faux fur)\b',
    "fits": r'\b(fitted|relaxed|oversized|loose|tight|regular fit|slim fit|comfort fit|athletic fit|tailored|snug|form-fitting|body-hugging|generous)\b',
    "lengths": r'\b(cropped|mini|short|above[ -]knee|knee[ -]length|midi|maxi|ankle[ -]length|floor[ -]length|calf[ -]length|hip[ -]length|tunic|longline|long)\b',
    "necklines": r'\b(v-neck|crew neck|scoop neck|square neck|boat neck|cowl neck|halter|off[ -]?shoulder|one[ -]?shoulder|strapless|high neck|mock neck|turtleneck|collared|keyhole|sweetheart|plunging|round neck|wide neckline|funnel neck)\b',
    "sleeves": r'\b(sleeveless|short sleeve|long sleeve|cap sleeve|3\/4 sleeve|bell sleeve|puff sleeve|balloon sleeve|flutter sleeve|raglan|dolman|batwing|bishop sleeve|lantern sleeve|kimono sleeve|cold shoulder|narrow shoulder straps|wide shoulder straps|adjustable straps)\b',
    "details": r'\b(ruffle|pleat|ruching|smocking|embroider|bead|sequin|lace trim|cutout|tie[ -]?front|button|zipper|zip|drawstring|belt|pocket|split|slit|gather|tier|asymmetric|wrap|fringe|tassel|stud|print|stripe|polka dot|floral|geometric|ribbed hem|elasticated|chest pocket|patch pocket|snap fastener|concealed|brushed inside|soft inside|lined|unlined|padded|quilted|hood|hooded|press-stud)\b',
    "silhouettes": r'\b(a-line|bodycon|wrap|shift|sheath|fit and flare|empire|peplum|straight|pencil|flared|wide[ -]?leg|bootcut|skinny|boyfriend|mom fit|tapered)\b',
    "waist": r'\b(high[ -]?waist|mid[ -]?rise|low[ -]?rise|elasticated waist|drawstring waist)\b',
}

def extract_attributes(description):
    """Extract attributes from description text."""
    if not description:
        return {}

    found = defaultdict(set)
    desc_lower = description.lower()

    for category, pattern in PATTERNS.items():
        matches = re.findall(pattern, desc_lower, re.IGNORECASE)
        for match in matches:
            found[category].add(match.strip())

    return dict(found)

def analyze(sample_size=500):
    """Analyze H&M descriptions using streaming JSON parser."""
    print(f"\n🔍 Analyzing H&M product descriptions (target: {sample_size})...")
    print(f"📂 Reading: {HM_DATA_PATH}\n")

    if not HM_DATA_PATH.exists():
        print(f"❌ File not found!")
        sys.exit(1)

    descriptions = []
    all_patterns = defaultdict(lambda: defaultdict(int))
    extractable_counts = defaultdict(int)
    processed = 0

    with open(HM_DATA_PATH, 'rb') as f:
        # Stream parse JSON array
        products = ijson.items(f, 'item')

        for product in products:
            if processed >= sample_size:
                break

            desc = product.get('description', '')
            if not desc or len(desc) < 15:
                continue

            # Extract attributes
            attrs = extract_attributes(desc)

            # Track patterns
            for category, values in attrs.items():
                extractable_counts[category] += 1
                for value in values:
                    all_patterns[category][value] += 1

            # Save samples
            if len(descriptions) < 15:
                descriptions.append({"text": desc, "attributes": attrs})

            processed += 1
            if processed % 100 == 0:
                print(f"   Processed {processed}...")

    total = processed
    print(f"\n✓ Analyzed {total} descriptions\n")

    # Report
    print("=" * 80)
    print("📊 H&M KAGGLE DESCRIPTION AUDIT")
    print("=" * 80 + "\n")

    if total == 0:
        print("❌ No valid descriptions found!\n")
        return

    print("🔧 Extractability by Category:\n")
    categories = sorted(extractable_counts.items(), key=lambda x: x[1], reverse=True)

    for category, count in categories:
        pct = (count / total) * 100
        bar = '█' * int(pct / 2)
        print(f"   {category.ljust(12)} {bar} {pct:5.1f}% ({count}/{total})")

    print("\n\n🏷️  Top Patterns per Category:\n")
    for category in sorted(all_patterns.keys()):
        patterns = all_patterns[category]
        top_5 = sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:5]

        if top_5:
            print(f"   {category.upper()}:")
            for pattern, count in top_5:
                print(f"      • {pattern}: {count} ({(count/total)*100:.1f}%)")
            print()

    print("=" * 80)
    print("📝 SAMPLE EXTRACTIONS\n")

    for i, s in enumerate(descriptions[:10], 1):
        print(f"{i}. \"{s['text'][:150]}...\"" if len(s['text']) > 150 else f"{i}. \"{s['text']}\"")
        if s['attributes']:
            for cat, vals in s['attributes'].items():
                print(f"   • {cat}: {', '.join(sorted(vals))}")
        else:
            print("   (no patterns matched)")
        print()

    # Recommendations
    print("=" * 80)
    print("💡 AUDIT SUMMARY\n")

    if len(extractable_counts) == 0:
        print("⚠️  No patterns matched - check regex patterns\n")
        return

    avg_extract = sum(extractable_counts.values()) / len(extractable_counts) / total * 100
    print(f"Average extractability: {avg_extract:.1f}%")
    print(f"Total descriptions analyzed: {total}\n")

    if avg_extract >= 60:
        print("✅ STRONG RULES POTENTIAL")
        print("\nH&M descriptions contain rich extractable attributes!\n")
        print("Recommended hybrid approach:")
        print("1. Rules extract from descriptions (materials, fits, details)")
        print("2. AI vision supplements from images (when confidence < 70%)")
        print("3. Move extracted data to structured fields (materials[], fit, etc.)")
        print("4. Keep description as backup for search/context")
    elif avg_extract >= 40:
        print("🟡 MODERATE RULES POTENTIAL")
        print("\nSome attributes extractable but AI may be needed for full coverage.")
    else:
        print("🔴 LOW RULES POTENTIAL")
        print("\nDescriptions lack enough detail - AI-first approach may be better.")

    print("\n" + "=" * 80 + "\n")

if __name__ == "__main__":
    # Install ijson if needed
    try:
        import ijson
    except ImportError:
        print("Installing ijson...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "ijson"])
        import ijson

    sample_size = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    analyze(sample_size)
