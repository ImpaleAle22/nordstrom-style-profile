#!/usr/bin/env python3
"""
Extract Attributes from H&M Descriptions - Simple Python Version

Reads H&M data, extracts attributes from descriptions, saves to JSON.
Then use a separate script to update Supabase.

Usage:
    python3 scripts/extract-attributes-simple.py [--limit N]
"""

import json
import re
import sys
import ijson
from pathlib import Path

HM_DATA_PATH = Path("/Users/hqh4/claude/edit-engine/scripts/_hm_transformed_temp.json")
OUTPUT_FILE = "extracted-attributes.jsonl"

# Patterns
PATTERNS = {
    "materials": r'\b(cotton|polyester|wool|silk|linen|cashmere|leather|suede|denim|jersey|fleece|nylon|spandex|rayon|viscose|modal|acrylic|satin|chiffon|velvet|corduroy|twill|canvas|knit|woven|mesh|velour|lace|sequin|beaded|stretch|ribbed|cable[ -]?knit|bouclé|crochet|terry|sweatshirt fabric|organza|taffeta|tulle|faux leather|faux fur)\b',
    "fit": r'\b(fitted|relaxed|oversized|loose|tight|regular fit|slim fit|comfort fit|athletic fit|tailored|snug|form-fitting|body-hugging|generous)\b',
    "neckline": r'\b(v-neck|crew neck|scoop neck|square neck|boat neck|cowl neck|halter|off[ -]?shoulder|one[ -]?shoulder|strapless|high neck|mock neck|turtleneck|collared|keyhole|sweetheart|plunging|round neck|wide neckline|funnel neck)\b',
    "sleeve_style": r'\b(sleeveless|short sleeve|long sleeve|cap sleeve|3/4 sleeve|bell sleeve|puff sleeve|balloon sleeve|flutter sleeve|raglan|dolman|batwing|bishop sleeve|lantern sleeve|kimono sleeve|cold shoulder|narrow shoulder straps|wide shoulder straps|adjustable straps)\b',
    "silhouette": r'\b(a-line|bodycon|wrap|shift|sheath|fit and flare|empire|peplum|straight|pencil|flared|wide[ -]?leg|bootcut|skinny|boyfriend|mom fit|tapered)\b',
    "waistline": r'\b(high[ -]?waist|mid[ -]?rise|low[ -]?rise|elasticated waist|drawstring waist)\b',
    "details": r'\b(ruffle|pleat|ruching|smocking|embroider|bead|sequin|lace trim|cutout|tie[ -]?front|button|zipper|zip|drawstring|belt|pocket|split|slit|gather|tier|asymmetric|wrap|fringe|tassel|stud|print|stripe|polka dot|floral|geometric|ribbed hem|elasticated|chest pocket|patch pocket|snap fastener|concealed|brushed inside|soft inside|lined|unlined|padded|quilted|hood|hooded|press-stud)\b',
}

def calculate_attribute_confidence(attr_name, match_text, match_count_for_attr, description):
    """
    Calculate confidence score for a specific attribute match.

    Confidence factors:
    - Base confidence by attribute type
    - Multi-word phrases get boost (more specific)
    - Multiple occurrences get boost (reinforcement)
    - Ambiguous terms get penalty
    """
    # Base confidence by attribute type
    base_confidence = {
        "materials": 95,      # Very reliable - explicit material mentions
        "details": 90,        # Usually explicit (pockets, zipper, etc.)
        "waistline": 90,      # Usually explicit (high-waist, drawstring)
        "fit": 80,            # Can be ambiguous (fitted where? overall?)
        "neckline": 75,       # Sometimes unclear without visual
        "sleeve_style": 85,   # Usually explicit
        "silhouette": 70,     # Often needs visual confirmation
    }

    confidence = base_confidence.get(attr_name, 80)

    # Boost for multi-word phrases (more specific = more confident)
    word_count = len(match_text.split())
    if word_count >= 3:
        confidence += 5  # "elasticated drawstring waist" = very specific
    elif word_count >= 2:
        confidence += 3  # "high waist" = fairly specific

    # Boost for multiple occurrences (reinforcement)
    if match_count_for_attr > 1:
        confidence += min(5, match_count_for_attr * 2)

    # Penalty for known ambiguous terms
    ambiguous_terms = {
        "short": -10,     # short sleeve? short length?
        "long": -10,      # long sleeve? long length?
        "fitted": -5,     # fitted where?
        "loose": -5,      # loose where?
        "tight": -5,      # tight where?
    }

    for term, penalty in ambiguous_terms.items():
        if term in match_text.lower():
            confidence += penalty
            break

    # Cap at 98% (never 100% for rules)
    return min(98, max(60, confidence))

def extract_attributes(description):
    """Extract attributes from description with per-attribute confidence scores."""
    if not description or len(description) < 10:
        return None

    extracted = {}
    has_any_match = False

    # Track match counts per attribute type for reinforcement scoring
    match_counts = {}

    # Materials (multiple)
    materials = []
    material_matches = list(re.finditer(PATTERNS["materials"], description, re.IGNORECASE))
    if material_matches:
        # Track unique materials with their match counts
        material_counts = {}
        for match in material_matches:
            mat = match.group(0).lower()
            material_counts[mat] = material_counts.get(mat, 0) + 1

        # Calculate confidence for materials as a group
        materials = list(material_counts.keys())
        match_counts["materials"] = len(material_matches)

        # Use highest individual material confidence
        max_confidence = max(
            calculate_attribute_confidence(
                "materials",
                mat,
                material_counts[mat],
                description
            ) for mat in materials
        )

        extracted["materials"] = materials
        extracted["materials_confidence"] = max_confidence
        extracted["materials_source"] = "rules-description"
        has_any_match = True

    # Single-value attributes
    for attr in ["fit", "neckline", "sleeve_style", "silhouette", "waistline"]:
        # Find all matches to detect reinforcement
        matches = list(re.finditer(PATTERNS[attr], description, re.IGNORECASE))
        if matches:
            match_text = matches[0].group(0).lower()  # Use first match
            match_counts[attr] = len(matches)

            confidence = calculate_attribute_confidence(
                attr,
                match_text,
                len(matches),
                description
            )

            extracted[attr] = match_text
            extracted[f"{attr}_confidence"] = confidence
            extracted[f"{attr}_source"] = "rules-description"
            has_any_match = True

    # Details (multiple)
    detail_matches = list(re.finditer(PATTERNS["details"], description, re.IGNORECASE))
    if detail_matches:
        details = []
        detail_counts = {}
        for match in detail_matches:
            det = match.group(0).lower()
            detail_counts[det] = detail_counts.get(det, 0) + 1

        details = list(detail_counts.keys())
        match_counts["details"] = len(detail_matches)

        # Details confidence based on quantity and specificity
        max_confidence = max(
            calculate_attribute_confidence(
                "details",
                det,
                detail_counts[det],
                description
            ) for det in details
        )

        extracted["details"] = details
        extracted["details_confidence"] = max_confidence
        extracted["details_source"] = "rules-description"
        has_any_match = True

    if not has_any_match:
        return None

    # Overall metadata
    extracted["extraction_source"] = "rules-description"
    extracted["extraction_method"] = "hybrid-ready"  # Ready for AI supplementation

    # Calculate overall confidence (average of all extracted attributes)
    confidences = [v for k, v in extracted.items() if k.endswith("_confidence")]
    extracted["overall_confidence"] = int(sum(confidences) / len(confidences)) if confidences else 0

    return extracted

def process(limit=None):
    """Process all products and extract attributes."""
    print(f"\n🚀 Extracting attributes from H&M descriptions...")
    print(f"Limit: {limit if limit else 'ALL'} products\n")

    stats = {
        "total": 0,
        "with_descriptions": 0,
        "extracted": 0,
    }

    samples = []

    with open(HM_DATA_PATH, 'rb') as f, open(OUTPUT_FILE, 'w') as out:
        products = ijson.items(f, 'item')

        for product in products:
            stats["total"] += 1

            if limit and stats["total"] > limit:
                break

            desc = product.get('description', '')
            if not desc or len(desc) < 10:
                continue

            stats["with_descriptions"] += 1

            # Extract
            attrs = extract_attributes(desc)
            if not attrs:
                continue

            stats["extracted"] += 1

            # Save result
            result = {
                "product_id": product.get("productId"),
                "description": desc,
                **attrs
            }

            out.write(json.dumps(result) + '\n')

            # Sample
            if len(samples) < 10:
                samples.append(result)

            if stats["total"] % 1000 == 0:
                print(f"   Processed {stats['total']} ({stats['extracted']} extracted)...")

    # Report
    print(f"\n✓ Processed {stats['total']} products")
    print(f"  With descriptions: {stats['with_descriptions']}")
    print(f"  Extracted: {stats['extracted']} ({(stats['extracted']/stats['with_descriptions'])*100:.1f}%)")
    print(f"\n💾 Saved to: {OUTPUT_FILE}\n")

    print("📝 Sample Extractions:\n")
    for i, s in enumerate(samples, 1):
        print(f"{i}. {s['product_id']}")
        print(f"   \"{s['description'][:100]}...\"")
        for key in ["materials", "fit", "neckline", "sleeve_style", "silhouette", "waistline", "details"]:
            if key in s:
                val = s[key]
                conf_key = f"{key}_confidence"
                conf = s.get(conf_key, "?")
                if isinstance(val, list):
                    print(f"   • {key}: {', '.join(val[:5])} (confidence: {conf}%)")
                else:
                    print(f"   • {key}: {val} (confidence: {conf}%)")
        print(f"   • overall: {s.get('overall_confidence', '?')}%\n")

    print("\nNext step: Update Supabase with extracted attributes")
    print(f"Run: python3 scripts/upload-extracted-attributes.py\n")

if __name__ == "__main__":
    # Install ijson if needed
    try:
        import ijson
    except ImportError:
        print("Installing ijson...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "ijson"])
        import ijson

    limit_arg = None
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        limit_arg = int(sys.argv[idx + 1])

    process(limit_arg)
