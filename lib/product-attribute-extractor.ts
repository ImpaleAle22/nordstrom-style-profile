/**
 * Product Attribute Extractor - Rules-Based Tagging
 *
 * Extracts structured attributes from unstructured product description text.
 * Uses smart confidence scoring to know when AI verification is needed.
 *
 * Mirrors logic from scripts/extract-attributes-simple.py but in TypeScript
 * for runtime use when adding new products.
 *
 * Usage:
 *   import { extractProductAttributes } from '@/lib/product-attribute-extractor';
 *
 *   const result = extractProductAttributes("Jersey top with v-neck...");
 *   // Returns: { materials: ["jersey"], neckline: "v-neck", ... }
 */

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

const PATTERNS = {
  materials: /\b(cotton|polyester|wool|silk|linen|cashmere|leather|suede|denim|jersey|fleece|nylon|spandex|rayon|viscose|modal|acrylic|satin|chiffon|velvet|corduroy|twill|canvas|knit|woven|mesh|velour|lace|sequin|beaded|stretch|ribbed|cable[ -]?knit|bouclé|crochet|terry|sweatshirt fabric|organza|taffeta|tulle|faux leather|faux fur)\b/gi,

  fit: /\b(fitted|relaxed|oversized|loose|tight|regular fit|slim fit|comfort fit|athletic fit|tailored|snug|form-fitting|body-hugging|generous)\b/gi,

  neckline: /\b(v-neck|crew neck|scoop neck|square neck|boat neck|cowl neck|halter|off[ -]?shoulder|one[ -]?shoulder|strapless|high neck|mock neck|turtleneck|collared|keyhole|sweetheart|plunging|round neck|wide neckline|funnel neck)\b/gi,

  sleeve_style: /\b(sleeveless|short sleeve|long sleeve|cap sleeve|3\/4 sleeve|bell sleeve|puff sleeve|balloon sleeve|flutter sleeve|raglan|dolman|batwing|bishop sleeve|lantern sleeve|kimono sleeve|cold shoulder|narrow shoulder straps|wide shoulder straps|adjustable straps)\b/gi,

  silhouette: /\b(a-line|bodycon|wrap|shift|sheath|fit and flare|empire|peplum|straight|pencil|flared|wide[ -]?leg|bootcut|skinny|boyfriend|mom fit|tapered)\b/gi,

  waistline: /\b(high[ -]?waist|mid[ -]?rise|low[ -]?rise|elasticated waist|drawstring waist)\b/gi,

  details: /\b(ruffle|pleat|ruching|smocking|embroider|bead|sequin|lace trim|cutout|tie[ -]?front|button|zipper|zip|drawstring|belt|pocket|split|slit|gather|tier|asymmetric|wrap|fringe|tassel|stud|print|stripe|polka dot|floral|geometric|ribbed hem|elasticated|chest pocket|patch pocket|snap fastener|concealed|brushed inside|soft inside|lined|unlined|padded|quilted|hood|hooded|press-stud)\b/gi,
};

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate confidence score for a specific attribute match.
 *
 * Confidence factors:
 * - Base confidence by attribute type
 * - Multi-word phrases get boost (more specific)
 * - Multiple occurrences get boost (reinforcement)
 * - Ambiguous terms get penalty
 */
function calculateAttributeConfidence(
  attrName: string,
  matchText: string,
  matchCountForAttr: number,
  description: string
): number {
  // Base confidence by attribute type (0-100 scale)
  const baseConfidence: Record<string, number> = {
    materials: 95,      // Very reliable - explicit material mentions
    details: 90,        // Usually explicit (pockets, zipper, etc.)
    waistline: 90,      // Usually explicit (high-waist, drawstring)
    sleeve_style: 85,   // Usually explicit
    fit: 80,            // Can be ambiguous (fitted where? overall?)
    neckline: 75,       // Sometimes unclear without visual
    silhouette: 70,     // Often needs visual confirmation
  };

  let confidence = baseConfidence[attrName] || 80;

  // Boost for multi-word phrases (more specific = more confident)
  const wordCount = matchText.trim().split(/\s+/).length;
  if (wordCount >= 3) {
    confidence += 5;  // "elasticated drawstring waist" = very specific
  } else if (wordCount >= 2) {
    confidence += 3;  // "high waist" = fairly specific
  }

  // Boost for multiple occurrences (reinforcement)
  if (matchCountForAttr > 1) {
    confidence += Math.min(5, matchCountForAttr * 2);
  }

  // Penalty for known ambiguous terms
  const ambiguousTerms: Record<string, number> = {
    short: -10,     // short sleeve? short length?
    long: -10,      // long sleeve? long length?
    fitted: -5,     // fitted where?
    loose: -5,      // loose where?
    tight: -5,      // tight where?
  };

  for (const [term, penalty] of Object.entries(ambiguousTerms)) {
    if (matchText.toLowerCase().includes(term)) {
      confidence += penalty;
      break;
    }
  }

  // Cap at 98% (never 100% for rules) and floor at 60%
  return Math.min(98, Math.max(60, confidence));
}

// ============================================================================
// EXTRACTION RESULT TYPES
// ============================================================================

export interface ExtractedAttribute<T> {
  value: T;
  confidence: number;
  source: 'rules-description';
}

export interface ProductAttributesExtraction {
  // Single-value attributes
  fit?: ExtractedAttribute<string>;
  neckline?: ExtractedAttribute<string>;
  sleeve_style?: ExtractedAttribute<string>;
  silhouette?: ExtractedAttribute<string>;
  waistline?: ExtractedAttribute<string>;

  // Multi-value attributes
  materials?: ExtractedAttribute<string[]>;
  details?: ExtractedAttribute<string[]>;

  // Overall metadata
  extraction_source: 'rules-description';
  extraction_method: 'hybrid-ready';
  overall_confidence: number;
  extracted_count: number;  // How many attributes were extracted
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract attributes from product description with smart confidence scoring
 *
 * @param description - Product description text
 * @returns Extracted attributes with per-attribute confidence scores, or null if no matches
 */
export function extractProductAttributes(
  description: string
): ProductAttributesExtraction | null {
  if (!description || description.length < 10) {
    return null;
  }

  const result: Partial<ProductAttributesExtraction> = {
    extraction_source: 'rules-description',
    extraction_method: 'hybrid-ready',
  };

  let extractedCount = 0;
  const confidences: number[] = [];

  // Track match counts per attribute type for reinforcement scoring
  const matchCounts: Record<string, number> = {};

  // ===== MATERIALS (multiple) =====
  const materials: string[] = [];
  const materialCounts = new Map<string, number>();

  const materialMatches = description.matchAll(PATTERNS.materials);
  for (const match of materialMatches) {
    const mat = match[0].toLowerCase();
    materialCounts.set(mat, (materialCounts.get(mat) || 0) + 1);
  }

  if (materialCounts.size > 0) {
    materials.push(...Array.from(materialCounts.keys()));
    matchCounts.materials = Array.from(materialCounts.values()).reduce((a, b) => a + b, 0);

    // Use highest individual material confidence
    const maxConfidence = Math.max(
      ...Array.from(materialCounts.entries()).map(([mat, count]) =>
        calculateAttributeConfidence('materials', mat, count, description)
      )
    );

    result.materials = {
      value: materials,
      confidence: maxConfidence,
      source: 'rules-description',
    };

    extractedCount++;
    confidences.push(maxConfidence);
  }

  // ===== SINGLE-VALUE ATTRIBUTES =====
  const singleAttributes = ['fit', 'neckline', 'sleeve_style', 'silhouette', 'waistline'] as const;

  for (const attr of singleAttributes) {
    // Reset regex lastIndex
    PATTERNS[attr].lastIndex = 0;

    // Find all matches to detect reinforcement
    const matches = Array.from(description.matchAll(PATTERNS[attr]));

    if (matches.length > 0) {
      const matchText = matches[0][0].toLowerCase();
      matchCounts[attr] = matches.length;

      const confidence = calculateAttributeConfidence(
        attr,
        matchText,
        matches.length,
        description
      );

      result[attr] = {
        value: matchText,
        confidence,
        source: 'rules-description',
      };

      extractedCount++;
      confidences.push(confidence);
    }
  }

  // ===== DETAILS (multiple) =====
  const details: string[] = [];
  const detailCounts = new Map<string, number>();

  const detailMatches = description.matchAll(PATTERNS.details);
  for (const match of detailMatches) {
    const det = match[0].toLowerCase();
    detailCounts.set(det, (detailCounts.get(det) || 0) + 1);
  }

  if (detailCounts.size > 0) {
    details.push(...Array.from(detailCounts.keys()));
    matchCounts.details = Array.from(detailCounts.values()).reduce((a, b) => a + b, 0);

    // Details confidence based on quantity and specificity
    const maxConfidence = Math.max(
      ...Array.from(detailCounts.entries()).map(([det, count]) =>
        calculateAttributeConfidence('details', det, count, description)
      )
    );

    result.details = {
      value: details,
      confidence: maxConfidence,
      source: 'rules-description',
    };

    extractedCount++;
    confidences.push(maxConfidence);
  }

  // No attributes extracted
  if (extractedCount === 0) {
    return null;
  }

  // Calculate overall confidence (average of all extracted attributes)
  result.overall_confidence = Math.round(
    confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  );
  result.extracted_count = extractedCount;

  return result as ProductAttributesExtraction;
}

// ============================================================================
// HELPER: FLATTEN FOR SUPABASE UPDATE
// ============================================================================

/**
 * Flatten extraction result into format for Supabase update
 *
 * Usage:
 *   const extracted = extractProductAttributes(description);
 *   const update = flattenForSupabaseUpdate(extracted);
 *   await supabase.from('products').update(update).eq('id', productId);
 */
export function flattenForSupabaseUpdate(
  extraction: ProductAttributesExtraction
): Record<string, any> {
  const update: Record<string, any> = {
    extraction_source: extraction.extraction_source,
    extraction_method: extraction.extraction_method,
    overall_confidence: extraction.overall_confidence,
  };

  // Add each attribute with its confidence and source
  if (extraction.materials) {
    update.materials = extraction.materials.value;
    update.materials_confidence = extraction.materials.confidence;
    update.materials_source = extraction.materials.source;
  }

  if (extraction.fit) {
    update.fit = extraction.fit.value;
    update.fit_confidence = extraction.fit.confidence;
    update.fit_source = extraction.fit.source;
  }

  if (extraction.neckline) {
    update.neckline = extraction.neckline.value;
    update.neckline_confidence = extraction.neckline.confidence;
    update.neckline_source = extraction.neckline.source;
  }

  if (extraction.sleeve_style) {
    update.sleeve_style = extraction.sleeve_style.value;
    update.sleeve_style_confidence = extraction.sleeve_style.confidence;
    update.sleeve_style_source = extraction.sleeve_style.source;
  }

  if (extraction.silhouette) {
    update.silhouette = extraction.silhouette.value;
    update.silhouette_confidence = extraction.silhouette.confidence;
    update.silhouette_source = extraction.silhouette.source;
  }

  if (extraction.waistline) {
    update.waistline = extraction.waistline.value;
    update.waistline_confidence = extraction.waistline.confidence;
    update.waistline_source = extraction.waistline.source;
  }

  if (extraction.details) {
    update.details = extraction.details.value;
    update.details_confidence = extraction.details.confidence;
    update.details_source = extraction.details.source;
  }

  return update;
}

// ============================================================================
// HELPER: IDENTIFY LOW-CONFIDENCE ATTRIBUTES FOR AI
// ============================================================================

/**
 * Identify which attributes need AI verification
 *
 * Returns list of attribute names where confidence < threshold (default 70%)
 *
 * Usage:
 *   const needsAI = identifyLowConfidenceAttributes(extracted);
 *   if (needsAI.length > 0) {
 *     // Call AI to verify these attributes
 *     const aiResult = await tagProductWithAI(product, needsAI);
 *   }
 */
export function identifyLowConfidenceAttributes(
  extraction: ProductAttributesExtraction,
  threshold: number = 70
): string[] {
  const lowConfidence: string[] = [];

  const checkAttribute = (name: string, attr?: ExtractedAttribute<any>) => {
    if (attr && attr.confidence < threshold) {
      lowConfidence.push(name);
    }
  };

  checkAttribute('materials', extraction.materials);
  checkAttribute('fit', extraction.fit);
  checkAttribute('neckline', extraction.neckline);
  checkAttribute('sleeve_style', extraction.sleeve_style);
  checkAttribute('silhouette', extraction.silhouette);
  checkAttribute('waistline', extraction.waistline);
  checkAttribute('details', extraction.details);

  return lowConfidence;
}

// ============================================================================
// HELPER: IDENTIFY MISSING ATTRIBUTES FOR AI
// ============================================================================

/**
 * Identify which common attributes are missing entirely
 *
 * Returns list of attribute names that rules didn't find
 * These may need AI to extract from image
 *
 * Usage:
 *   const missing = identifyMissingAttributes(extracted, productType);
 *   // For tops: expect neckline, sleeve_style
 *   // For bottoms: expect waistline, silhouette
 */
export function identifyMissingAttributes(
  extraction: ProductAttributesExtraction | null,
  productType?: string
): string[] {
  const missing: string[] = [];

  // Common attributes by product type
  const expectedAttributes: Record<string, string[]> = {
    tops: ['neckline', 'sleeve_style', 'fit', 'materials'],
    bottoms: ['waistline', 'silhouette', 'fit', 'materials'],
    dresses: ['neckline', 'sleeve_style', 'silhouette', 'materials'],
    outerwear: ['materials', 'fit', 'details'],
    shoes: ['materials', 'details'],
  };

  const expected = productType
    ? expectedAttributes[productType.toLowerCase()] || []
    : ['materials', 'fit', 'details']; // Default expectations

  for (const attr of expected) {
    if (!extraction || !(attr in extraction)) {
      missing.push(attr);
    }
  }

  return missing;
}
