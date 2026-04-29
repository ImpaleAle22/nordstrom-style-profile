/**
 * Outfit Attribute Tagger - 4-Axis System
 *
 * NEW ARCHITECTURE:
 * 1. Four-Axis Resolution (Formality, Activity Context, Season, Social Register)
 *    - Rules layer assigns axis values with confidence scores
 *    - AI refines per-axis when confidence below threshold
 * 2. Derived Occasions (from axis combinations via mapping table)
 * 3. Style Pillar & Vibes (UNCHANGED - preserved from old system)
 *
 * Occasions are NO LONGER tagged directly - they're derived mechanically.
 */

import type { StoredOutfit } from './outfit-storage';
import type {
  OutfitAttributes,
  AttributeHints,
  StylePillar,
  Vibe,
  Occasion
} from './outfit-attributes';
import {
  STYLE_PILLARS,
  STYLE_PILLAR_METADATA,
  VIBES,
  ALL_OCCASIONS,
  isValidStylePillar,
  isValidVibe,
  isValidOccasion
} from './outfit-attributes';

// NEW: Import 4-axis system
import type { OutfitInput, ResolvedAxes } from './axis-types';
import { resolveAxes } from './axis-resolver';
import {
  refineFormality,
  refineActivityContext,
  refineSeason,
  refineSocialRegister,
} from './axis-ai-refiner';
import { deriveOccasions } from './occasion-mapping';
import { tokenTracker } from './token-tracker';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Gemini model for AI tagging (both axes and style/vibes)
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

// Per-axis confidence thresholds for AI escalation
const AXIS_CONFIDENCE_THRESHOLDS = {
  formality: 0.7,
  activityContext: 0.65,
  season: 0.7,
  socialRegister: 0.6, // Intentionally low - AI owns this axis
};

// Style/vibe confidence threshold - LOWERED to trigger AI more often
// If rules confidence < 0.65, escalate to AI for better diversity
const STYLE_VIBE_CONFIDENCE_THRESHOLD = 0.65;

// ============================================================================
// MAIN TAGGING FUNCTION (4-AXIS SYSTEM)
// ============================================================================

/**
 * Tag an outfit with 4-axis system + Style Pillar + Vibes
 *
 * NEW FLOW:
 * 1. Resolve 4 axes (rules → AI per-axis if needed)
 * 2. Derive occasions from axis combinations (deterministic)
 * 3. Tag style pillar + vibes (preserved from old system)
 */
export async function tagOutfit(outfit: StoredOutfit): Promise<OutfitAttributes> {
  // PHASE 1: Four-Axis Resolution
  const outfitInput = convertToOutfitInput(outfit);
  const { axes, hasBoldSignal } = resolveAxes(outfitInput);

  // Track which axes were refined by AI
  const axisTaggedBy = {
    formality: axes.formality.source,
    activityContext: axes.activityContext.source,
    season: axes.season.source,
    socialRegister: axes.socialRegister.source,
  };

  // PHASE 2: AI Refinement (per-axis, if confidence below threshold)
  let refinedAxes = { ...axes };

  // Refine formality if needed
  if (axes.formality.confidence < AXIS_CONFIDENCE_THRESHOLDS.formality) {
    try {
      refinedAxes.formality = await refineFormality(outfitInput, axes.formality);
      axisTaggedBy.formality = 'ai';
    } catch (error) {
      console.error('Formality AI refinement failed:', error);
    }
  }

  // Refine activity context if needed
  if (axes.activityContext.confidence < AXIS_CONFIDENCE_THRESHOLDS.activityContext) {
    try {
      refinedAxes.activityContext = await refineActivityContext(
        outfitInput,
        axes.activityContext
      );
      axisTaggedBy.activityContext = 'ai';
    } catch (error) {
      console.error('Activity context AI refinement failed:', error);
    }
  }

  // Refine season if needed
  if (axes.season.confidence < AXIS_CONFIDENCE_THRESHOLDS.season) {
    try {
      refinedAxes.season = await refineSeason(outfitInput, axes.season);
      axisTaggedBy.season = 'ai';
    } catch (error) {
      console.error('Season AI refinement failed:', error);
    }
  }

  // Refine social register if needed
  if (axes.socialRegister.confidence < AXIS_CONFIDENCE_THRESHOLDS.socialRegister) {
    try {
      refinedAxes.socialRegister = await refineSocialRegister(
        outfitInput,
        axes.socialRegister
      );
      axisTaggedBy.socialRegister = 'ai';
    } catch (error) {
      console.error('Social register AI refinement failed:', error);
    }
  }

  // PHASE 3: Derive Occasions (deterministic from axes)
  const occasions = deriveOccasions(refinedAxes, hasBoldSignal);

  // PHASE 4: Tag Style Pillar + Vibes (preserved from old system)
  const hints = generateRulesBasedHints(outfit);
  let stylePillar: string | null = null;
  let subStyle: string | null = null;
  let vibes: string[] = [];
  let styleConfidence = 0;
  let vibeConfidence = 0;
  let styleTaggedBy: 'rules' | 'ai' = 'rules';

  // Use AI for style/vibes if low confidence (old system preserved)
  if (hints.maxConfidence < STYLE_VIBE_CONFIDENCE_THRESHOLD) {
    try {
      const styleVibeTags = await getStyleVibeTags(outfit, hints);
      stylePillar = styleVibeTags.stylePillar;
      subStyle = styleVibeTags.subStyle;
      vibes = styleVibeTags.vibes;
      styleConfidence = styleVibeTags.confidence.stylePillar;
      vibeConfidence = styleVibeTags.confidence.vibes;
      styleTaggedBy = 'ai';
    } catch (error) {
      console.error('Style/vibe AI tagging failed, falling back to rules:', error);
      const fallback = hintsToStyleVibes(hints);
      stylePillar = fallback.stylePillar;
      vibes = fallback.vibes;
      styleConfidence = fallback.confidence.stylePillar;
      vibeConfidence = fallback.confidence.vibes;
    }
  } else {
    const rulesStyleVibes = hintsToStyleVibes(hints);
    stylePillar = rulesStyleVibes.stylePillar;
    vibes = rulesStyleVibes.vibes;
    styleConfidence = rulesStyleVibes.confidence.stylePillar;
    vibeConfidence = rulesStyleVibes.confidence.vibes;
  }

  // Determine overall tagging mode
  const anyAxisUsedAI = Object.values(axisTaggedBy).some(source => source === 'ai');
  const taggedBy = anyAxisUsedAI || styleTaggedBy === 'ai' ? 'hybrid' : 'rules';

  // Build reasoning string
  const reasoning = [
    `Formality: ${refinedAxes.formality.value.toFixed(1)} (${refinedAxes.formality.reason})`,
    `Activity: ${refinedAxes.activityContext.value}${refinedAxes.activityContext.secondary ? ` + ${refinedAxes.activityContext.secondary}` : ''}`,
    `Season: ${refinedAxes.season.value.join(', ')}`,
    `Social: ${refinedAxes.socialRegister.value}`,
    `Style: ${stylePillar || 'Unknown'}`,
  ].join(' | ');

  return {
    // Four axes (NEW)
    formality: refinedAxes.formality.value,
    activityContext: refinedAxes.activityContext.value,
    activityContextSecondary: refinedAxes.activityContext.secondary,
    season: refinedAxes.season.value,
    socialRegister: refinedAxes.socialRegister.value,

    // Derived occasions (NEW)
    occasions,

    // Style + vibes (UNCHANGED)
    stylePillar,
    subStyle,
    vibes,

    // Metadata
    confidence: {
      formality: refinedAxes.formality.confidence,
      activityContext: refinedAxes.activityContext.confidence,
      season: refinedAxes.season.confidence,
      socialRegister: refinedAxes.socialRegister.confidence,
      stylePillar: styleConfidence,
      vibes: vibeConfidence,
    },
    taggedAt: new Date().toISOString(),
    taggedBy,
    axisTaggedBy,
    reasoning,
  };
}

/**
 * Convert StoredOutfit to OutfitInput for axis resolution
 * Phase 4: Now includes rich product metadata for better tagging
 */
function convertToOutfitInput(outfit: StoredOutfit): OutfitInput {
  return {
    outfitId: outfit.id,
    recipeTitle: outfit.recipeTitle,
    items: outfit.items.map(item => ({
      role: item.role,
      ingredientTitle: item.ingredientTitle,
      product: {
        id: item.product.id,
        title: item.product.title,
        brand: item.product.brand || '',
        colors: item.product.colors || [],
        department: item.product.department || 'womens',
        visionScan: item.product.visionScan,

        // Phase 4: Pass through rich metadata from CLIP API (Phase 2)
        description: item.product.description,
        comprehensiveDescription: item.product.comprehensiveDescription,
        stylistDescription: item.product.stylistDescription,
        materials: item.product.materials,
        patterns: item.product.patterns,
        silhouette: item.product.silhouette,
        garmentLength: item.product.garmentLength,
        neckline: item.product.neckline,
        sleeveStyle: item.product.sleeveStyle,
        fitDetails: item.product.fitDetails,
        details: item.product.details,
        weatherContext: item.product.weatherContext,
        productFeatures: item.product.productFeatures,
        visualAttributes: item.product.visualAttributes,
        visionReasoning: item.product.visionReasoning,

        // Product-level tags
        occasions: item.product.occasions,
        seasons: item.product.seasons,
        formalityTier: item.product.formalityTier,
        versatilityScore: item.product.versatilityScore,
        trendTags: item.product.trendTags,
        lifestyleOccasions: item.product.lifestyleOccasions,
      },
    })),
    scoreBreakdown: {
      occasionAlignment: outfit.scoreBreakdown.occasionAlignment || 50,
    },
  };
}

// ============================================================================
// RULES-BASED LAYER
// ============================================================================

/**
 * Generate rules-based hints from outfit composition
 * Fast and deterministic
 */
function generateRulesBasedHints(outfit: StoredOutfit): AttributeHints {
  // Normalize formality from 0-100 scale to 1-6 scale
  const rawFormality = outfit.scoreBreakdown.occasionAlignment || 50;
  const normalizedFormality = Math.max(1, Math.min(6, (rawFormality / 100) * 5 + 1));

  const hints: AttributeHints = {
    stylePillarHints: [],
    vibeHints: [],
    occasionHints: [],
    formality: Math.round(normalizedFormality * 10) / 10,
    maxConfidence: 0
  };

  // Extract product types and metadata
  const productTypes = outfit.items.map(item => {
    const title = item.product.title.toLowerCase();
    const department = item.product.department.toLowerCase();
    return { title, department, role: item.role };
  });

  // ===== STYLE PILLAR HINTS =====

  // Athletic: All items have sport/active keywords
  const athleticKeywords = ['athletic', 'sport', 'gym', 'running', 'yoga', 'workout', 'sweat', 'jogger', 'track', 'tennis', 'bra', 'legging', 'tight', 'seamless', 'performance'];
  const athleticCount = productTypes.filter(p =>
    athleticKeywords.some(kw => p.title.includes(kw)) ||
    // Add specific athletic departments
    ['sportswear', 'activewear', 'athletic apparel'].includes(p.department)
  ).length;
  if (athleticCount === outfit.items.length) {
    hints.stylePillarHints.push({
      pillar: 'Athletic',
      confidence: 0.9,
      reason: 'All items have athletic/sport keywords or department'
    });
  } else if (athleticCount >= outfit.items.length * 0.75) {
    hints.stylePillarHints.push({
      pillar: 'Athletic',
      confidence: 0.7,
      reason: 'Most items have athletic/sport keywords or department'
    });
  }

  // Utility: Workwear, military, outdoor keywords
  const utilityKeywords = ['cargo', 'utility', 'work', 'military', 'tactical', 'hiking', 'outdoor', 'field', 'safari', 'parachute', 'gorpcore'];
  const utilityCount = productTypes.filter(p =>
    utilityKeywords.some(kw => p.title.includes(kw)) ||
    // Add specific utility departments
    ['workwear', 'outerwear', 'utility wear'].includes(p.department)
  ).length;
  if (utilityCount >= outfit.items.length * 0.5) {
    hints.stylePillarHints.push({
      pillar: 'Utility',
      confidence: 0.75,
      reason: 'Multiple items have utility/workwear keywords or department'
    });
  }

  // Minimal: Sleek, monochromatic, modern keywords
  const minimalKeywords = ['minimal', 'sleek', 'modern', 'clean', 'simple', 'monochrome', 'basic', 'essential', 'sculptural', 'architectural'];
  const minimalCount = productTypes.filter(p =>
    minimalKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (minimalCount >= outfit.items.length * 0.5) {
    hints.stylePillarHints.push({
      pillar: 'Minimal',
      confidence: 0.65,
      reason: 'Multiple items have minimal/modern keywords'
    });
  }

  // Classic: Tailored, polished, timeless keywords
  const classicKeywords = ['blazer', 'tailored', 'classic', 'trench', 'oxford', 'loafer', 'pump', 'suit', 'vest', 'crisp', 'button-down', 'polo shirt', 'chinos', 'brogues', 'derby', 'peacoat', 'trench coat'];
  const classicCount = productTypes.filter(p =>
    classicKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (classicCount >= outfit.items.length * 0.5) {
    hints.stylePillarHints.push({
      pillar: 'Classic',
      confidence: 0.7,
      reason: 'Multiple items have classic/tailored keywords'
    });
  }

  // Romantic: Feminine, delicate, soft keywords
  const romanticKeywords = ['romantic', 'feminine', 'lace', 'floral', 'ruffle', 'delicate', 'soft', 'flowing', 'chiffon', 'silk', 'satin', 'bow', 'puff sleeve', 'frill'];
  const romanticCount = productTypes.filter(p =>
    romanticKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (romanticCount >= outfit.items.length * 0.5) {
    hints.stylePillarHints.push({
      pillar: 'Romantic',
      confidence: 0.7,
      reason: 'Multiple items have romantic/feminine keywords'
    });
  }

  // Bohemian: Earthy, textural, vintage keywords
  const bohemianKeywords = ['boho', 'bohemian', 'vintage', 'crochet', 'embroidered', 'fringe', 'tie-dye', 'paisley', 'ikat', 'tribal', 'ethnic', 'suede', 'velvet', 'velour', 'kimono', 'maxi dress', 'peasant'];
  const bohemianCount = productTypes.filter(p =>
    bohemianKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (bohemianCount >= outfit.items.length * 0.5) {
    hints.stylePillarHints.push({
      pillar: 'Bohemian',
      confidence: 0.7,
      reason: 'Multiple items have bohemian/vintage keywords'
    });
  }

  // Streetwear: Trend-aware, urban, edgy, directional
  const streetwearKeywords = ['street', 'urban', 'edgy', 'oversized', 'crop', 'graphic', 'logo', 'distressed', 'ripped', 'chain', 'platform', 'chunky', 'dad', 'mom', 'baggy', 'wide leg', 'oversized', 'cropped', 'cut-off', 'utility jacket', 'bomber jacket', 'varsity jacket', 'racer jacket', 'anorak', 'puffer jacket', 'track jacket', 'windbreaker', 'cargo pants', 'parachute pants', 'chelsea boot', 'chukka boot', 'loafer', 'sneaker', 'platform shoe', 'chunky sneaker', 'dad sneaker', 'combat boot', 'moto jacket', 'biker jacket'];
  const streetwearCount = productTypes.filter(p =>
    streetwearKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (streetwearCount >= outfit.items.length * 0.4) {
    // Lower threshold (40%) since streetwear mixing is common
    hints.stylePillarHints.push({
      pillar: 'Streetwear',
      confidence: 0.65,
      reason: 'Multiple items have streetwear/trend-forward keywords'
    });
  }

  // Extract all colors once for multiple checks below
  const allColors = outfit.items.flatMap(item => item.product.colors || []);

  // Maximal: Bold, statement pieces, high visual impact, bright/contrasting colors
  const maximalKeywords = ['statement', 'bold', 'tropical', 'glam', 'sequin', 'metallic', 'dramatic', 'embellished', 'bright', 'neon', 'vibrant', 'leopard', 'animal print', 'print', 'pattern', 'multi-color', 'color block', 'graphic', 'bold print', 'statement piece', 'oversized print', 'bold pattern'];
  const maximalCount = productTypes.filter(p =>
    maximalKeywords.some(kw => p.title.includes(kw))
  ).length;

  // Check for bright/contrasting colors as signal for Maximal
  const maximalBrightColors = ['red', 'orange', 'yellow', 'pink', 'purple', 'green', 'blue', 'multi', 'print', 'pattern', 'hot pink', 'electric blue', 'royal blue', 'emerald green', 'fuchsia', 'cobalt blue', 'vibrant', 'bold'];
  const maximalBrightColorCount = allColors.filter(color =>
    maximalBrightColors.some(bright => color.toLowerCase().includes(bright))
  ).length;

  if (maximalCount >= outfit.items.length * 0.5) {
    hints.stylePillarHints.push({
      pillar: 'Maximal',
      confidence: 0.7,
      reason: 'Multiple items have bold/statement keywords'
    });
  } else if (maximalBrightColorCount >= 3) {
    // Bright/contrasting colors can indicate Maximal even without keywords
    hints.stylePillarHints.push({
      pillar: 'Maximal',
      confidence: 0.55,
      reason: 'Multiple bright/contrasting colors suggest bold aesthetic'
    });
  }

  // Casual: Fallback only if NO other pillar detected
  // LOWERED confidence from 0.5 → 0.3 to trigger AI more often
  // AI should look at actual product details, not just accept "Casual" default
  if (hints.stylePillarHints.length === 0) {
    hints.stylePillarHints.push({
      pillar: 'Casual',
      confidence: 0.3,
      reason: 'No strong rules signal - AI should analyze actual products (NOT just default to Casual)'
    });
  }

  // ===== VIBE HINTS =====

  // Energetic: Athletic items OR combination of multiple signals
  // LOWERED THRESHOLD: Athletic wear is often energetic
  const energeticReasons: string[] = [];
  let signalCount = 0;

  // Signal 1: Athletic items (lowered threshold - any athletic presence)
  const hasAthletic = athleticCount > 0;
  const energeticAthleticKeywords = ['running', 'gym', 'workout', 'sport', 'performance', 'training', 'bra', 'tight', 'legging'];
  const hasEnergeticAthletic = productTypes.some(p =>
    energeticAthleticKeywords.some(kw => p.title.includes(kw))
  );
  if (hasAthletic && hasEnergeticAthletic) {
    signalCount++;
    energeticReasons.push('athletic/sport items');
  }

  // Signal 2: Bright/vibrant colors
  // Only truly vibrant, saturated colors - NOT pastels or light variants
  const energeticBrightColors = ['red', 'orange', 'yellow', 'hot pink', 'neon', 'electric blue', 'bright blue', 'vibrant', 'turquoise', 'royal blue', 'emerald green', 'fuchsia', 'cobalt blue'];
  const brightColorMatches = allColors.filter(color =>
    energeticBrightColors.some(bright => color.toLowerCase().includes(bright))
  );
  const hasBrightColors = brightColorMatches.length >= 2; // Require 2+ bright colors for signal
  if (hasBrightColors) {
    signalCount++;
    energeticReasons.push('bright colors');
  }

  // Signal 3: Maximal style indicators
  const hasMaximalStyle = maximalCount > 0;
  if (hasMaximalStyle) {
    signalCount++;
    energeticReasons.push('bold/maximal style');
  }

  // Signal 4: High-contrast combinations (4+ distinct colors)
  const uniqueColors = new Set(allColors.map(c => c.toLowerCase()));
  const hasHighContrast = uniqueColors.size >= 4;
  if (hasHighContrast) {
    signalCount++;
    energeticReasons.push('high-contrast colors');
  }

  // IMPROVED TAGGING LOGIC:
  // - Athletic alone with energetic keywords: medium-high confidence (0.7)
  // - 2+ signals: medium confidence (0.65)
  // - 3+ signals: high confidence (0.8)
  let energeticConfidence = 0;
  if (hasAthletic && hasEnergeticAthletic) {
    energeticConfidence = 0.7; // Raised from 0.65
  }
  if (signalCount >= 2 && energeticConfidence < 0.65) {
    energeticConfidence = 0.65;
  }
  if (signalCount >= 3) {
    energeticConfidence = 0.8;
  }

  if (energeticConfidence > 0) {
    hints.vibeHints.push({
      vibe: 'Energetic',
      confidence: energeticConfidence,
      reason: `Energetic vibe from ${energeticReasons.join(', ')}`
    });
  }

  // Relaxed/Cozy: Loungewear, casual items
  const relaxedKeywords = ['lounge', 'cozy', 'comfort', 'relaxed', 'casual', 'sweat', 'hoodie', 'jogger', 'sweatpants', 'sweatshirt', 'loungewear', 'track pants'];
  const relaxedCount = productTypes.filter(p =>
    relaxedKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (relaxedCount > 0) {
    hints.vibeHints.push({
      vibe: 'Relaxed',
      confidence: 0.75,
      reason: 'Loungewear/casual items suggest relaxed vibe'
    });
    if (relaxedKeywords.some(kw => productTypes.some(p => p.title.includes(kw) && ['cozy', 'comfort'].includes(kw)))) {
      hints.vibeHints.push({
        vibe: 'Cozy',
        confidence: 0.75,
        reason: 'Cozy/comfort items'
      });
    }
  }

  // Effortless: Common in casual outfits with simple, everyday pieces
  const effortlessKeywords = ['tank', 'tee', 't-shirt', 'jeans', 'denim', 'sneaker', 'loafer', 'sandal', 'slip-on', 'shorts', 'chinos', 'crewneck', 'basic'];
  const effortlessCount = productTypes.filter(p =>
    effortlessKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (effortlessCount >= 2 && hints.formality <= 3) {
    hints.vibeHints.push({
      vibe: 'Effortless',
      confidence: 0.7,
      reason: 'Simple, everyday pieces suggest effortless vibe'
    });
  }

  // Approachable: Casual, comfortable items
  if (hints.formality <= 2.5 && effortlessCount >= 2) {
    hints.vibeHints.push({
      vibe: 'Approachable',
      confidence: 0.65,
      reason: 'Casual, comfortable items suggest approachable vibe'
    });
  }

  // Professional/Polished: Business items (MOVED BEFORE CONFIDENT - used by Confident logic)
  const professionalKeywords = ['blazer', 'suit', 'dress shirt', 'oxford', 'trouser', 'pump', 'tailored', 'business', 'work', 'professional', 'smart'];
  const professionalCount = productTypes.filter(p =>
    professionalKeywords.some(kw => p.title.includes(kw))
  ).length;
  if (professionalCount >= 2) {
    hints.vibeHints.push({
      vibe: 'Professional',
      confidence: 0.8,
      reason: 'Business/tailored items suggest professional vibe'
    });
    hints.vibeHints.push({
      vibe: 'Polished',
      confidence: 0.75,
      reason: 'Tailored items suggest polished vibe'
    });
  }

  // Confident: Requires MULTIPLE signals - not just any bold item
  const confidentKeywords = ['bold', 'statement', 'power', 'strong', 'leather', 'biker', 'jacket', 'boot', 'structured', 'moto', 'chunky', 'platform', 'edgy', 'combat boot', 'moto jacket', 'biker jacket'];
  const confidentCount = productTypes.filter(p =>
    confidentKeywords.some(kw => p.title.includes(kw))
  ).length;
  let confidentSignals = 0;
  if (confidentCount >= 2) confidentSignals++; // Multiple bold items
  if (hints.formality >= 4.5) confidentSignals++; // High formality
  if (professionalCount >= 2) confidentSignals++; // Professional styling
  if (maximalCount >= 1) confidentSignals++; // Any maximal item

  if (confidentSignals >= 2) {
    hints.vibeHints.push({
      vibe: 'Confident',
      confidence: 0.7,
      reason: 'Multiple confidence signals (bold items + formality/professional/maximal)'
    });
  }

  // Elegant: Formal items + refined colors
  const elegantColors = ['black', 'navy', 'champagne', 'gold', 'silver', 'ivory', 'pearl', 'burgundy', 'emerald', 'royal blue', 'deep red', 'midnight blue'];
  const hasElegantColors = allColors.some(color =>
    elegantColors.some(ec => color.toLowerCase().includes(ec))
  );
  if (hints.formality >= 5 || (hints.formality >= 4.5 && hasElegantColors)) {
    hints.vibeHints.push({
      vibe: 'Elegant',
      confidence: hints.formality >= 5 ? 0.75 : 0.6,
      reason: hints.formality >= 5 ? 'High formality suggests elegant vibe' : 'Refined colors with elevated formality'
    });
  }

  // Romantic: Soft colors + feminine details
  const romanticColors = ['pink', 'rose', 'blush', 'lavender', 'peach', 'cream', 'soft', 'pale', 'lilac', 'mint green', 'baby blue'];
  const hasRomanticColors = allColors.some(color =>
    romanticColors.some(rc => color.toLowerCase().includes(rc))
  );
  if (romanticCount > 0 || (hasRomanticColors && hints.formality >= 3)) {
    hints.vibeHints.push({
      vibe: 'Romantic',
      confidence: romanticCount > 0 ? 0.7 : 0.5,
      reason: romanticCount > 0 ? 'Feminine/delicate items' : 'Soft romantic colors with elevated styling'
    });
  }

  // Bold: Saturated colors OR statement pieces
  const boldColors = ['red', 'cobalt', 'electric', 'fuchsia', 'emerald', 'royal', 'bright', 'vivid', 'orange', 'yellow', 'pink', 'purple', 'green', 'blue', 'multi', 'print', 'pattern', 'hot pink', 'electric blue', 'royal blue', 'emerald green', 'fuchsia', 'cobalt blue'];
  const hasBoldColors = allColors.some(color =>
    boldColors.some(bc => color.toLowerCase().includes(bc))
  );
  if (maximalCount >= 2 || hasBoldColors) {
    hints.vibeHints.push({
      vibe: 'Bold',
      confidence: maximalCount >= 2 ? 0.7 : 0.55,
      reason: maximalCount >= 2 ? 'Multiple statement pieces' : 'Bold saturated colors'
    });
  }

  // Understated: Neutral palette + minimal styling
  const neutralColors = ['beige', 'taupe', 'grey', 'gray', 'oat', 'sand', 'camel', 'khaki', 'cream', 'ivory', 'white', 'black', 'charcoal', 'navy'];
  const neutralColorCount = allColors.filter(color =>
    neutralColors.some(nc => color.toLowerCase().includes(nc))
  ).length;
  if (neutralColorCount >= 2 || (minimalCount > 0 && uniqueColors.size <= 2)) {
    hints.vibeHints.push({
      vibe: 'Understated',
      confidence: uniqueColors.size <= 2 ? 0.65 : 0.5,
      reason: uniqueColors.size <= 2 ? 'Minimal color palette' : 'Neutral color scheme'
    });
  }

  // Fresh: Light colors, casual summer items
  const freshKeywords = ['linen', 'cotton', 'light', 'summer', 'sandal', 'espadrille', 'breeze', 'airy', 'breathable'];
  const freshCount = productTypes.filter(p =>
    freshKeywords.some(kw => p.title.includes(kw))
  ).length;
  const lightColors = ['white', 'light blue', 'light pink', 'beige', 'off white', 'light beige', 'light grey', 'light yellow', 'light orange', 'light turquoise', 'pale yellow', 'pale blue', 'pale pink', 'ivory', 'cream'];
  const lightColorMatches = allColors.filter(color =>
    lightColors.some(light => color.toLowerCase().includes(light))
  );
  if (freshCount >= 2 || lightColorMatches.length >= 2) {
    hints.vibeHints.push({
      vibe: 'Fresh',
      confidence: 0.65,
      reason: 'Light colors or summer items suggest fresh vibe'
    });
  }

  // Playful: Bright colors + casual items OR graphic/printed items
  const playfulKeywords = ['graphic', 'print', 'printed', 'pattern', 'stripe', 'dot', 'embroidery', 'patch', 'novelty', 'quirky', 'fun', 'playful', 'cartoon', 'character'];
  const playfulCount = productTypes.filter(p =>
    playfulKeywords.some(kw => p.title.includes(kw))
  ).length;
  if ((hasBrightColors && effortlessCount >= 2) || playfulCount >= 1) {
    hints.vibeHints.push({
      vibe: 'Playful',
      confidence: 0.6,
      reason: playfulCount >= 1 ? 'Graphic/printed items suggest playful vibe' : 'Bright colors with casual items'
    });
  }

  // Cute: Feminine details, soft colors, delicate items
  const cuteKeywords = ['bow', 'ruffle', 'floral', 'heart', 'sweet', 'delicate', 'mini', 'crop', 'frill', 'puff sleeve', 'embroidery', 'lace'];
  const cuteCount = productTypes.filter(p =>
    cuteKeywords.some(kw => p.title.includes(kw))
  ).length;
  const softColors = ['pink', 'light pink', 'light purple', 'light blue', 'white', 'off white', 'peach', 'lavender', 'mint green', 'baby blue'];
  const softColorMatches = allColors.filter(color =>
    softColors.some(soft => color.toLowerCase().includes(soft))
  );
  if (cuteCount >= 1 || (softColorMatches.length >= 2 && hints.formality <= 3)) {
    hints.vibeHints.push({
      vibe: 'Cute',
      confidence: 0.6,
      reason: cuteCount >= 1 ? 'Feminine/delicate details' : 'Soft colors with casual items'
    });
  }

  // ===== OCCASION HINTS (TIGHTENED RANGES FOR DIVERSITY) =====

  // Workout: Athletic items
  if (athleticCount === outfit.items.length) {
    hints.occasionHints.push({
      occasion: 'Workout',
      confidence: 0.9,
      reason: 'All items are athletic/sportswear'
    });
  }

  // Work: Professional items (TIGHTER: 4-5.5 formality)
  if (professionalCount >= 2 && hints.formality >= 4 && hints.formality <= 5.5) {
    hints.occasionHints.push({
      occasion: 'Working in the Office',
      confidence: 0.8,
      reason: 'Professional items with business formality'
    });
  }

  // Interview: High formality professional (SPECIFIC: 4.5-5.5)
  if (professionalCount >= 2 && hints.formality >= 4.5) {
    hints.occasionHints.push({
      occasion: 'Interview',
      confidence: 0.75,
      reason: 'Highly formal professional setting'
    });
  }

  // Weekend: Very casual only (TIGHTENED: 1-2.5) + requires effortless items
  if (hints.formality <= 2.5 && effortlessCount >= 2) {
    hints.occasionHints.push({
      occasion: 'Weekend',
      confidence: 0.75,
      reason: 'Very casual loungewear/everyday items'
    });
  }

  // Running Errands: Very casual comfort (TIGHTENED: 1.5-2.8)
  if (hints.formality >= 1.5 && hints.formality <= 2.8) {
    hints.occasionHints.push({
      occasion: 'Running Errands',
      confidence: 0.6,
      reason: 'Comfortable casual formality'
    });
  }

  // Shopping Day: Put-together casual (TIGHTENED: 2.5-3.3) + requires not loungewear
  if (hints.formality >= 2.5 && hints.formality <= 3.3 && relaxedCount === 0) {
    hints.occasionHints.push({
      occasion: 'Shopping Day',
      confidence: 0.55,
      reason: 'Comfortable but intentionally styled'
    });
  }

  // Coffee Date: Casual social (TIGHTENED: 2.5-3.5) + requires effortless items
  if (hints.formality >= 2.5 && hints.formality <= 3.5 && effortlessCount >= 1) {
    hints.occasionHints.push({
      occasion: 'Coffee Date',
      confidence: 0.6,
      reason: 'Casual social setting'
    });
  }

  // Lunch with Friends: Similar to coffee date (TIGHTENED: 2.8-3.8)
  if (hints.formality >= 2.8 && hints.formality <= 3.8 && effortlessCount >= 1) {
    hints.occasionHints.push({
      occasion: 'Lunch with Friends',
      confidence: 0.55,
      reason: 'Relaxed social formality'
    });
  }

  // Brunch: Smart casual (TIGHTENED: 3-4)
  if (hints.formality >= 3 && hints.formality <= 4) {
    hints.occasionHints.push({
      occasion: 'Brunch',
      confidence: 0.5,
      reason: 'Smart casual daytime social'
    });
  }

  // Casual Dinner: Evening smart casual (TIGHTENED: 3.5-4.5) + no loungewear
  if (hints.formality >= 3.5 && hints.formality <= 4.5 && relaxedCount === 0) {
    hints.occasionHints.push({
      occasion: 'Casual Dinner',
      confidence: 0.5,
      reason: 'Smart casual evening'
    });
  }

  // Movie Date: Comfortable evening (TIGHTENED: 3-4)
  if (hints.formality >= 3 && hints.formality <= 4 && relaxedCount === 0) {
    hints.occasionHints.push({
      occasion: 'Movie Date',
      confidence: 0.45,
      reason: 'Comfortable yet stylish evening'
    });
  }

  // Date Night: Elevated evening (TIGHTENED: 4-5.5) + requires dressy items OR rich colors
  const dressyKeywords = ['dress', 'heel', 'cocktail', 'dressy', 'blazer', 'elegant', 'skirt', 'gown', 'evening', 'party', 'formal', 'chic'];
  const dressyCount = productTypes.filter(p =>
    dressyKeywords.some(kw => p.title.includes(kw))
  ).length;
  const eveningColors = ['black', 'navy', 'burgundy', 'emerald', 'sapphire', 'wine', 'dark', 'midnight', 'deep red', 'charcoal', 'forest green'];
  const hasEveningColors = allColors.some(color =>
    eveningColors.some(ec => color.toLowerCase().includes(ec))
  );

  if (hints.formality >= 4 && hints.formality <= 5.5 && (dressyCount > 0 || hasEveningColors)) {
    hints.occasionHints.push({
      occasion: 'Date Night',
      confidence: dressyCount > 0 ? 0.65 : 0.5,
      reason: dressyCount > 0 ? 'Dressy items for romantic evening' : 'Evening colors with elevated formality'
    });
  }

  // Night Out: Fun elevated evening (TIGHTENED: 4-5.5) + requires maximal OR bold items
  if (hints.formality >= 4 && hints.formality <= 5.5 && (maximalCount > 0 || confidentCount > 0)) {
    hints.occasionHints.push({
      occasion: 'Night Out',
      confidence: 0.55,
      reason: 'Bold styling for social evening'
    });
  }

  // Party: Social celebration (TIGHTENED: 4.5-5.3)
  if (hints.formality >= 4.5 && hints.formality < 5.3) {
    hints.occasionHints.push({
      occasion: 'Party',
      confidence: 0.6,
      reason: 'Elevated formality for celebrations'
    });
  }

  // Cocktail Party: Semi-formal (SPECIFIC: 5-5.5)
  if (hints.formality >= 5 && hints.formality <= 5.5) {
    hints.occasionHints.push({
      occasion: 'Cocktail Party',
      confidence: 0.55,
      reason: 'Semi-formal event'
    });
  }

  // Black Tie / Gala: Very formal (SPECIFIC: 5.5+)
  if (hints.formality >= 5.5) {
    hints.occasionHints.push({
      occasion: 'Black Tie / Gala',
      confidence: 0.8,
      reason: 'Formal occasion formality'
    });
  }

  // FALLBACK RULES: Only for truly edge cases - REMOVED most fallback logic
  // Better to let AI decide than force generic tags
  if (hints.occasionHints.length === 0) {
    // Log warning - outfit should have matched SOMETHING above
    console.warn(`⚠️  Outfit has NO occasion hints (formality: ${hints.formality.toFixed(2)}). AI will decide.`);

    // Only provide minimal fallback for very extreme cases
    if (hints.formality < 1.3) {
      hints.occasionHints.push({
        occasion: 'Relaxing at Home',
        confidence: 0.3,
        reason: 'Extremely casual (likely loungewear)'
      });
    } else if (hints.formality > 5.7) {
      hints.occasionHints.push({
        occasion: 'Black Tie / Gala',
        confidence: 0.4,
        reason: 'Extremely high formality'
      });
    }
    // For everything else: NO fallback - let AI decide from scratch
  }

  // Calculate max confidence
  hints.maxConfidence = Math.max(
    ...hints.stylePillarHints.map(h => h.confidence),
    ...hints.vibeHints.map(h => h.confidence),
    ...hints.occasionHints.map(h => h.confidence),
    0
  );

  return hints;
}

/**
 * Convert hints to Style Pillar + Vibes (rules-only path)
 * NOTE: Occasions are NO LONGER derived here - they come from axis mapping
 */
function hintsToStyleVibes(hints: AttributeHints): {
  stylePillar: string | null;
  subStyle: string | null;
  vibes: string[];
  confidence: { stylePillar: number; vibes: number };
} {
  // Pick top Style Pillar
  const topStylePillar = hints.stylePillarHints.sort((a, b) => b.confidence - a.confidence)[0];

  // Pick top vibes (keep ALL above threshold)
  const topVibes = hints.vibeHints
    .sort((a, b) => b.confidence - a.confidence)
    .filter(v => v.confidence >= 0.5);

  return {
    stylePillar: topStylePillar?.pillar || null,
    subStyle: null, // Rules don't determine sub-styles (too nuanced)
    vibes: topVibes.map(v => v.vibe),
    confidence: {
      stylePillar: topStylePillar?.confidence || 0,
      vibes: topVibes.length > 0 ? topVibes[0].confidence : 0,
    },
  };
}

// ============================================================================
// AI LAYER (Style Pillar + Vibes ONLY - Occasions now derived from axes)
// ============================================================================

/**
 * Get AI-based Style Pillar + Vibe tags using Gemini (with retry logic)
 * NOTE: Occasions are NO LONGER tagged by AI - they're derived from axes
 */
async function getStyleVibeTags(
  outfit: StoredOutfit,
  hints: AttributeHints
): Promise<{
  stylePillar: string | null;
  subStyle: string | null;
  vibes: string[];
  confidence: { stylePillar: number; vibes: number };
}> {
  const prompt = buildStyleVibePrompt(outfit, hints);
  const maxRetries = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Use server-side proxy to avoid SSL issues in browser
      const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          prompt: prompt,
          generationConfig: {
            temperature: 0.7, // INCREASED for more diversity, less bias toward common answers
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 600, // Increased for rich product metadata prompt
          },
        }),
      });

      if (!response.ok) {
        // Check if it's a rate limit or server error
        if (response.status === 429 || response.status === 503 || response.status === 500) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 16000);
          console.log(
            `⏳ Rate limited (${response.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          continue;
        }
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      // Log and track token usage
      const usage = data.usageMetadata;
      if (usage) {
        tokenTracker.record(usage.promptTokenCount, usage.candidatesTokenCount);
        console.log(`🔢 style/vibes: ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out = ${usage.totalTokenCount} | Running: ${tokenTracker.getSummaryString()}`);
      }

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return parseStyleVibeResponse(text, hints);
    } catch (error: any) {
      lastError = error;

      // If it's a network error, retry
      if (
        attempt < maxRetries - 1 &&
        (error.message.includes('fetch') || error.message.includes('network'))
      ) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 16000);
        console.log(`⏳ Network error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // If it's the last attempt or non-retryable error, throw
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Build Style + Vibe tagging prompt for AI
 * NOTE: Occasions are NO LONGER tagged here - they're derived from axes
 */
function buildStyleVibePrompt(outfit: StoredOutfit, hints: AttributeHints): string {
  // FULLY ENHANCED: Include ALL available product metadata
  const itemsText = outfit.items
    .map(item => {
      const p = item.product;
      const parts: string[] = [
        `${item.role.toUpperCase()}: "${item.ingredientTitle}"`,
        `Brand: ${p.brand}`,
        `Title: ${p.title.slice(0, 50)}`,
      ];

      // Colors
      if (p.colors && p.colors.length > 0) {
        parts.push(`Colors: ${p.colors.join(', ')}`);
      }

      // Materials
      if (p.materials && p.materials.length > 0) {
        parts.push(`Materials: ${p.materials.join(', ')}`);
      }

      // Style details
      const styleDetails: string[] = [];
      if (p.silhouette) styleDetails.push(p.silhouette);
      if (p.garmentLength) styleDetails.push(p.garmentLength);
      if (p.neckline) styleDetails.push(p.neckline);
      if (p.sleeveStyle) styleDetails.push(p.sleeveStyle);
      if (styleDetails.length > 0) {
        parts.push(`Style: ${styleDetails.join(', ')}`);
      }

      // Patterns
      if (p.patterns) {
        const patternStr = Array.isArray(p.patterns) ? p.patterns.join(', ') : p.patterns;
        if (patternStr) parts.push(`Pattern: ${patternStr}`);
      }

      // Details/features
      if (p.details && p.details.length > 0) {
        parts.push(`Details: ${p.details.slice(0, 3).join(', ')}`);
      }

      // Visual attributes from AI vision scan
      if (p.visualAttributes && p.visualAttributes.length > 0) {
        parts.push(`Visual: ${p.visualAttributes.slice(0, 3).join(', ')}`);
      }

      // Phase 2: Comprehensive AI-generated description (rich metadata)
      if (p.comprehensiveDescription && p.comprehensiveDescription.length > 20) {
        const cleanDesc = p.comprehensiveDescription
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 150);
        parts.push(`AI Description: "${cleanDesc}"`);
      } else if (p.description && p.description.length > 10) {
        // Fallback to basic description
        const cleanDesc = p.description
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100);
        if (cleanDesc.length > 10) {
          parts.push(`Desc: "${cleanDesc}"`);
        }
      }

      // Phase 2: Vision reasoning (AI's visual analysis)
      if (p.visionReasoning && p.visionReasoning.length > 20) {
        const reasoning = p.visionReasoning
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120);
        parts.push(`Vision Analysis: "${reasoning}"`);
      }

      // Phase 2: Product-level formality tier
      if (p.formalityTier) {
        parts.push(`Formality: ${p.formalityTier}`);
      }

      // Phase 2: Trend tags (style hints)
      if (p.trendTags && p.trendTags.length > 0) {
        parts.push(`Style Tags: ${p.trendTags.slice(0, 4).join(', ')}`);
      }

      return parts.join(' | ');
    })
    .join('\n\n');

  // Include ALL pillar hints (not just top 1) but mark confidence
  const pillarHintsText = hints.stylePillarHints.length > 0
    ? hints.stylePillarHints.map(h => `${h.pillar} (${(h.confidence * 100).toFixed(0)}%)`).join(', ')
    : 'None detected (low confidence)';

  const vibeHintsText = hints.vibeHints.length > 0
    ? hints.vibeHints.map(h => `${h.vibe} (${(h.confidence * 100).toFixed(0)}%)`).join(', ')
    : 'None';

  return `Tag this outfit with Style Pillar + Vibes based on ACTUAL product details:

OUTFIT ITEMS (FULL PRODUCT METADATA):
${itemsText}

RULES HINTS (starting point - YOU decide based on actual products above):
- Style Pillars: ${pillarHintsText}
- Vibes: ${vibeHintsText}
- Formality: ${hints.formality.toFixed(1)}/6.0

CRITICAL INSTRUCTIONS - READ THE PRODUCT DATA:
- You have FULL product details: materials, silhouette, patterns, AI descriptions, vision analysis, formality tier, style tags
- Look at EVERYTHING: materials (satin, leather, denim), silhouette (bodycon, A-line), patterns (leopard, solid), details (cutout, ruched)
- READ the AI Description and Vision Analysis fields - these contain rich styling insights
- USE the Formality tier as a guide (casual, smart-casual, formal)
- USE the Style Tags as hints (Classic, Minimalist, Bohemian, etc.)
- Materials matter: Satin/sequins → Maximal or Romantic, Denim/distressed → Casual or Streetwear, Leather → Streetwear or Classic
- Silhouette matters: Bodycon/fitted → Streetwear or Minimal, Relaxed/oversized → Casual or Bohemian, Structured → Classic
- Details matter: Cutouts/chains/graphics → Streetwear or Maximal, Ruffles/lace → Romantic, Tailored → Classic
- DON'T default to Casual just because you see jeans - look at how they're styled (distressed + graphic tee = Streetwear, plain tee = Casual)
- DON'T default to Classic just because it's polished - look for actual blazers/tailoring/loafers
- LEVERAGE the comprehensive metadata - it's there to help you make better style decisions

ASSIGN:
1. Style Pillar (ONE from: ${STYLE_PILLARS.join(', ')})
2. Sub-Style (optional - pick from these canonical sub-terms):
   - Romantic: ${STYLE_PILLAR_METADATA['Romantic'].subTerms.join(', ')}
   - Bohemian: ${STYLE_PILLAR_METADATA['Bohemian'].subTerms.join(', ')}
   - Casual: ${STYLE_PILLAR_METADATA['Casual'].subTerms.join(', ')}
   - Classic: ${STYLE_PILLAR_METADATA['Classic'].subTerms.join(', ')}
   - Minimal: ${STYLE_PILLAR_METADATA['Minimal'].subTerms.join(', ')}
   - Maximal: ${STYLE_PILLAR_METADATA['Maximal'].subTerms.join(', ')}
   - Streetwear: ${STYLE_PILLAR_METADATA['Streetwear'].subTerms.join(', ')}
   - Athletic: ${STYLE_PILLAR_METADATA['Athletic'].subTerms.join(', ')}
   - Utility: ${STYLE_PILLAR_METADATA['Utility'].subTerms.join(', ')}
3. Vibes (1-5 from: ${VIBES.join(', ')})
4. Confidence scores (0-1)
5. Brief reasoning

Respond ONLY with JSON (no markdown):
{
  "stylePillar": "Streetwear",
  "subStyle": "Streetwear",
  "vibes": ["Edgy", "Bold", "Urban"],
  "confidence": {
    "stylePillar": 0.85,
    "vibes": 0.80
  },
  "reasoning": "Streetwear brands with graphic details and bold styling."
}`;
}

/**
 * Find which pillar a sub-style belongs to
 */
function findPillarForSubStyle(subStyle: string): StylePillar | null {
  for (const [pillar, meta] of Object.entries(STYLE_PILLAR_METADATA)) {
    if (meta.subTerms.includes(subStyle)) {
      return pillar as StylePillar;
    }
  }
  return null;
}

/**
 * Parse AI response into Style Pillar + Vibes
 */
function parseStyleVibeResponse(
  text: string,
  hints: AttributeHints
): {
  stylePillar: string | null;
  subStyle: string | null;
  vibes: string[];
  confidence: { stylePillar: number; vibes: number };
} {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate and sanitize
    let stylePillar = isValidStylePillar(parsed.stylePillar) ? parsed.stylePillar : null;
    let subStyle: string | null = null;

    // Validate sub-style and auto-correct pillar if mismatch
    if (parsed.subStyle && typeof parsed.subStyle === 'string') {
      // Check if sub-style belongs to the assigned pillar
      if (stylePillar) {
        const validSubStyles = STYLE_PILLAR_METADATA[stylePillar]?.subTerms || [];
        if (validSubStyles.includes(parsed.subStyle)) {
          // Perfect match
          subStyle = parsed.subStyle;
        } else {
          // Sub-style doesn't match pillar - find correct pillar
          const correctPillar = findPillarForSubStyle(parsed.subStyle);
          if (correctPillar) {
            console.log(`🔧 Auto-correcting pillar: "${stylePillar}" → "${correctPillar}" (based on sub-style: "${parsed.subStyle}")`);
            stylePillar = correctPillar;
            subStyle = parsed.subStyle;
          }
          // If no match found anywhere, discard sub-style
        }
      } else {
        // No pillar assigned - try to infer from sub-style
        const inferredPillar = findPillarForSubStyle(parsed.subStyle);
        if (inferredPillar) {
          console.log(`🔧 Inferred pillar "${inferredPillar}" from sub-style "${parsed.subStyle}"`);
          stylePillar = inferredPillar;
          subStyle = parsed.subStyle;
        }
      }
    }

    const vibes = Array.isArray(parsed.vibes) ? parsed.vibes.filter(isValidVibe).slice(0, 5) : [];

    return {
      stylePillar,
      subStyle,
      vibes,
      confidence: {
        stylePillar: parsed.confidence?.stylePillar || 0.7,
        vibes: parsed.confidence?.vibes || 0.7,
      },
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    // Fallback to rules
    return hintsToStyleVibes(hints);
  }
}
