/**
 * Rules-Based Hints Generator (Extracted from v1 + Strengthened for v2)
 *
 * Generates style pillar, vibe, and occasion hints by analyzing outfit composition
 * using keyword matching, color signals, and attribute detection.
 *
 * EXTRACTION NOTE: This was extracted from lib/attribute-tagger.ts to allow both
 * v1 and v2 to use the same strengthened rules while keeping v1 frozen.
 *
 * WORKSTREAM 4 IMPROVEMENTS:
 * - Added missing materials: technical fabric, cashmere, wool
 * - Added missing silhouettes: bodycon, fitted, a-line, tiered
 * - Added missing details: cutouts
 * - Added earth-tone color detection
 * - Added "Luxe" vibe hint
 * - Added "Dramatic" vibe hint
 * - Added garment length keywords (mini, midi, maxi)
 */

import type { StoredOutfit } from './indexeddb-storage';
import type { AttributeHints } from './outfit-attributes';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Analyze product signals for reinforcement scoring
 */
function analyzeProductSignals(productTitle: string, productDept: string, keywords: string[]): number {
  let signalCount = 0;
  const titleLower = productTitle.toLowerCase();
  const deptLower = productDept.toLowerCase();

  // Count keyword matches
  signalCount += keywords.filter(kw => titleLower.includes(kw)).length;

  // Department match adds 1 signal
  const relevantDepts = ['sportswear', 'activewear', 'workwear', 'outerwear', 'athletic apparel'];
  if (relevantDepts.some(d => deptLower.includes(d))) {
    signalCount += 1;
  }

  return signalCount;
}

/**
 * Calculate outfit confidence from match statistics
 */
function calculateOutfitConfidence(params: {
  matchCount: number;
  totalItems: number;
  keywords: string[];
  reinforcementScore: number;
  pillarType: string;
}): number {
  const { matchCount, totalItems, keywords, reinforcementScore, pillarType } = params;

  // 1. Base confidence from match percentage (0-100 scale)
  const matchPercentage = matchCount / totalItems;
  let confidence = matchPercentage * 100;

  // 2. Outfit size adjustment (larger outfits need more evidence)
  if (totalItems >= 6) {
    confidence *= 0.95;  // Slight penalty for 6+ items
  } else if (totalItems <= 3) {
    confidence *= 1.05;  // Slight boost for 3 or fewer items
  }

  // 3. Keyword strength multiplier
  const uniqueKeywords = new Set(keywords);
  const keywordStrength = Math.min(uniqueKeywords.size / 5, 3); // Cap at 3x
  confidence *= (1 + keywordStrength * 0.1);

  // 4. Reinforcement score (multiple signals per item boost confidence)
  if (reinforcementScore > 1) {
    confidence *= (1 + Math.min(reinforcementScore - 1, 1) * 0.15);
  }

  // 5. Pillar-specific adjustments
  if (pillarType === 'Streetwear' && matchPercentage >= 0.4) {
    confidence *= 1.1; // Streetwear mixing is valid at lower threshold
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence / 100));
}

// ============================================================================
// MAIN HINTS GENERATOR
// ============================================================================

export function generateRulesBasedHints(outfit: StoredOutfit): AttributeHints {
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

  // Extract all colors once for multiple checks
  const allColors = outfit.items.flatMap(item => item.product.colors || []);

  // ===== STYLE PILLAR HINTS =====

  // Athletic: All items have sport/active keywords
  // WORKSTREAM 4: Added technical fabric keywords
  const athleticKeywords = ['athletic', 'sport', 'gym', 'running', 'yoga', 'workout', 'sweat', 'jogger', 'track', 'tennis', 'bra', 'legging', 'tight', 'seamless', 'performance', 'technical', 'tech fabric', 'mesh', 'synthetic', 'moisture-wicking'];
  const athleticMatches: string[] = [];
  let athleticSignalTotal = 0;
  const athleticCount = productTypes.filter(p => {
    const matchedKeywords = athleticKeywords.filter(kw => p.title.includes(kw));
    const deptMatch = ['sportswear', 'activewear', 'athletic apparel'].includes(p.department);

    if (matchedKeywords.length > 0 || deptMatch) {
      athleticMatches.push(...matchedKeywords);
      athleticSignalTotal += analyzeProductSignals(p.title, p.department, athleticKeywords);
      return true;
    }
    return false;
  }).length;

  if (athleticCount >= outfit.items.length * 0.5) {
    const confidence = calculateOutfitConfidence({
      matchCount: athleticCount,
      totalItems: outfit.items.length,
      keywords: athleticMatches,
      reinforcementScore: athleticCount > 0 ? athleticSignalTotal / athleticCount : 1,
      pillarType: 'Athletic',
    });

    hints.stylePillarHints.push({
      pillar: 'Athletic',
      confidence,
      reason: `${athleticCount}/${outfit.items.length} items have athletic keywords (${Math.round(confidence * 100)}% confidence)`
    });
  }

  // Utility: Workwear, military, outdoor keywords
  const utilityKeywords = ['cargo', 'utility', 'work', 'military', 'tactical', 'hiking', 'outdoor', 'field', 'safari', 'parachute', 'gorpcore'];
  const utilityMatches: string[] = [];
  let utilitySignalTotal = 0;
  const utilityCount = productTypes.filter(p => {
    const matchedKeywords = utilityKeywords.filter(kw => p.title.includes(kw));
    const deptMatch = ['workwear', 'outerwear', 'utility wear'].includes(p.department);

    if (matchedKeywords.length > 0 || deptMatch) {
      utilityMatches.push(...matchedKeywords);
      utilitySignalTotal += analyzeProductSignals(p.title, p.department, utilityKeywords);
      return true;
    }
    return false;
  }).length;

  if (utilityCount >= outfit.items.length * 0.5) {
    const confidence = calculateOutfitConfidence({
      matchCount: utilityCount,
      totalItems: outfit.items.length,
      keywords: utilityMatches,
      reinforcementScore: utilityCount > 0 ? utilitySignalTotal / utilityCount : 1,
      pillarType: 'Utility',
    });

    hints.stylePillarHints.push({
      pillar: 'Utility',
      confidence,
      reason: `${utilityCount}/${outfit.items.length} items have utility keywords (${Math.round(confidence * 100)}% confidence)`
    });
  }

  // Minimal: Sleek, monochromatic, modern keywords
  // WORKSTREAM 4: Added fitted silhouette
  const minimalKeywords = ['minimal', 'sleek', 'modern', 'clean', 'simple', 'monochrome', 'basic', 'essential', 'sculptural', 'architectural', 'fitted', 'tailored fit', 'slim fit'];
  const minimalMatches: string[] = [];
  let minimalSignalTotal = 0;
  const minimalCount = productTypes.filter(p => {
    const matchedKeywords = minimalKeywords.filter(kw => p.title.includes(kw));
    if (matchedKeywords.length > 0) {
      minimalMatches.push(...matchedKeywords);
      minimalSignalTotal += analyzeProductSignals(p.title, p.department, minimalKeywords);
      return true;
    }
    return false;
  }).length;

  if (minimalCount >= outfit.items.length * 0.5) {
    const confidence = calculateOutfitConfidence({
      matchCount: minimalCount,
      totalItems: outfit.items.length,
      keywords: minimalMatches,
      reinforcementScore: minimalCount > 0 ? minimalSignalTotal / minimalCount : 1,
      pillarType: 'Minimal',
    });

    hints.stylePillarHints.push({
      pillar: 'Minimal',
      confidence,
      reason: `${minimalCount}/${outfit.items.length} items have minimal keywords (${Math.round(confidence * 100)}% confidence)`
    });
  }

  // Classic: Tailored, polished, timeless keywords
  // WORKSTREAM 4: Added cashmere, wool, tweed, flannel
  const classicKeywords = ['blazer', 'tailored', 'classic', 'trench', 'oxford', 'loafer', 'pump', 'suit', 'vest', 'crisp', 'button-down', 'polo shirt', 'chinos', 'brogues', 'derby', 'peacoat', 'trench coat', 'cashmere', 'wool', 'tweed', 'flannel'];
  const classicMatches: string[] = [];
  let classicSignalTotal = 0;
  const classicCount = productTypes.filter(p => {
    const matchedKeywords = classicKeywords.filter(kw => p.title.includes(kw));
    if (matchedKeywords.length > 0) {
      classicMatches.push(...matchedKeywords);
      classicSignalTotal += analyzeProductSignals(p.title, p.department, classicKeywords);
      return true;
    }
    return false;
  }).length;

  if (classicCount >= outfit.items.length * 0.5) {
    const confidence = calculateOutfitConfidence({
      matchCount: classicCount,
      totalItems: outfit.items.length,
      keywords: classicMatches,
      reinforcementScore: classicCount > 0 ? classicSignalTotal / classicCount : 1,
      pillarType: 'Classic',
    });

    hints.stylePillarHints.push({
      pillar: 'Classic',
      confidence,
      reason: `${classicCount}/${outfit.items.length} items have classic keywords (${Math.round(confidence * 100)}% confidence)`
    });
  }

  // Romantic: Feminine, delicate, soft keywords
  // WORKSTREAM 4: Added bodycon, fitted, a-line, tiered, mini, midi, maxi
  const romanticKeywords = ['romantic', 'feminine', 'lace', 'floral', 'ruffle', 'delicate', 'soft', 'flowing', 'chiffon', 'silk', 'satin', 'bow', 'puff sleeve', 'frill', 'bodycon', 'fitted dress', 'a-line', 'tiered', 'mini dress', 'midi dress', 'maxi dress', 'fit and flare'];
  const romanticMatches: string[] = [];
  let romanticSignalTotal = 0;
  const romanticCount = productTypes.filter(p => {
    const matchedKeywords = romanticKeywords.filter(kw => p.title.includes(kw));
    if (matchedKeywords.length > 0) {
      romanticMatches.push(...matchedKeywords);
      romanticSignalTotal += analyzeProductSignals(p.title, p.department, romanticKeywords);
      return true;
    }
    return false;
  }).length;

  if (romanticCount >= outfit.items.length * 0.5) {
    const confidence = calculateOutfitConfidence({
      matchCount: romanticCount,
      totalItems: outfit.items.length,
      keywords: romanticMatches,
      reinforcementScore: romanticCount > 0 ? romanticSignalTotal / romanticCount : 1,
      pillarType: 'Romantic',
    });

    hints.stylePillarHints.push({
      pillar: 'Romantic',
      confidence,
      reason: `${romanticCount}/${outfit.items.length} items have romantic keywords (${Math.round(confidence * 100)}% confidence)`
    });
  }

  // Bohemian: Earthy, textural, vintage keywords
  // WORKSTREAM 4: Added tiered, maxi for length detection
  const bohemianKeywords = ['boho', 'bohemian', 'vintage', 'crochet', 'embroidered', 'fringe', 'tie-dye', 'paisley', 'ikat', 'tribal', 'ethnic', 'suede', 'velvet', 'velour', 'kimono', 'maxi dress', 'maxi skirt', 'peasant', 'tiered skirt', 'tiered dress'];
  const bohemianMatches: string[] = [];
  let bohemianSignalTotal = 0;
  const bohemianCount = productTypes.filter(p => {
    const matchedKeywords = bohemianKeywords.filter(kw => p.title.includes(kw));
    if (matchedKeywords.length > 0) {
      bohemianMatches.push(...matchedKeywords);
      bohemianSignalTotal += analyzeProductSignals(p.title, p.department, bohemianKeywords);
      return true;
    }
    return false;
  }).length;

  if (bohemianCount >= outfit.items.length * 0.5) {
    const confidence = calculateOutfitConfidence({
      matchCount: bohemianCount,
      totalItems: outfit.items.length,
      keywords: bohemianMatches,
      reinforcementScore: bohemianCount > 0 ? bohemianSignalTotal / bohemianCount : 1,
      pillarType: 'Bohemian',
    });

    hints.stylePillarHints.push({
      pillar: 'Bohemian',
      confidence,
      reason: `${bohemianCount}/${outfit.items.length} items have bohemian keywords (${Math.round(confidence * 100)}% confidence)`
    });
  }

  // Streetwear: Trend-aware, urban, edgy, directional
  // WORKSTREAM 4: Added cutout, exposed zipper, asymmetric
  const streetwearKeywords = ['street', 'urban', 'edgy', 'oversized', 'crop', 'graphic', 'logo', 'distressed', 'ripped', 'chain', 'platform', 'chunky', 'dad', 'mom', 'baggy', 'wide leg', 'cropped', 'cut-off', 'utility jacket', 'bomber jacket', 'varsity jacket', 'racer jacket', 'anorak', 'puffer jacket', 'track jacket', 'windbreaker', 'cargo pants', 'parachute pants', 'chelsea boot', 'chukka boot', 'loafer', 'sneaker', 'platform shoe', 'chunky sneaker', 'dad sneaker', 'combat boot', 'moto jacket', 'biker jacket', 'cutout', 'cut out', 'exposed zipper', 'asymmetric'];
  const streetwearMatches: string[] = [];
  let streetwearSignalTotal = 0;
  const streetwearCount = productTypes.filter(p => {
    const matchedKeywords = streetwearKeywords.filter(kw => p.title.includes(kw));
    if (matchedKeywords.length > 0) {
      streetwearMatches.push(...matchedKeywords);
      streetwearSignalTotal += analyzeProductSignals(p.title, p.department, streetwearKeywords);
      return true;
    }
    return false;
  }).length;

  if (streetwearCount >= outfit.items.length * 0.4) {
    // Lower threshold (40%) since streetwear mixing is common
    const confidence = calculateOutfitConfidence({
      matchCount: streetwearCount,
      totalItems: outfit.items.length,
      keywords: streetwearMatches,
      reinforcementScore: streetwearCount > 0 ? streetwearSignalTotal / streetwearCount : 1,
      pillarType: 'Streetwear',
    });

    hints.stylePillarHints.push({
      pillar: 'Streetwear',
      confidence,
      reason: `${streetwearCount}/${outfit.items.length} items have streetwear keywords (${Math.round(confidence * 100)}% confidence)`
    });
  }

  // Maximal: Bold, statement pieces, high visual impact, bright/contrasting colors
  // WORKSTREAM 4: Added cutout variations
  const maximalKeywords = ['statement', 'bold', 'tropical', 'glam', 'sequin', 'metallic', 'dramatic', 'embellished', 'bright', 'neon', 'vibrant', 'leopard', 'animal print', 'print', 'pattern', 'multi-color', 'color block', 'graphic', 'bold print', 'statement piece', 'oversized print', 'bold pattern', 'cutout', 'cut-out'];
  const maximalMatches: string[] = [];
  let maximalSignalTotal = 0;
  const maximalCount = productTypes.filter(p => {
    const matchedKeywords = maximalKeywords.filter(kw => p.title.includes(kw));
    if (matchedKeywords.length > 0) {
      maximalMatches.push(...matchedKeywords);
      maximalSignalTotal += analyzeProductSignals(p.title, p.department, maximalKeywords);
      return true;
    }
    return false;
  }).length;

  // Check for bright/contrasting colors as signal for Maximal
  const maximalBrightColors = ['red', 'orange', 'yellow', 'pink', 'purple', 'green', 'blue', 'multi', 'print', 'pattern', 'hot pink', 'electric blue', 'royal blue', 'emerald green', 'fuchsia', 'cobalt blue', 'vibrant', 'bold'];
  const maximalBrightColorCount = allColors.filter(color =>
    maximalBrightColors.some(bright => color.toLowerCase().includes(bright))
  ).length;

  if (maximalCount >= outfit.items.length * 0.5) {
    // Use reinforcement from keywords + color signals
    const colorSignalBonus = maximalBrightColorCount >= 2 ? 0.5 : 0;
    const confidence = calculateOutfitConfidence({
      matchCount: maximalCount,
      totalItems: outfit.items.length,
      keywords: maximalMatches,
      reinforcementScore: (maximalCount > 0 ? maximalSignalTotal / maximalCount : 1) + colorSignalBonus,
      pillarType: 'Maximal',
    });

    hints.stylePillarHints.push({
      pillar: 'Maximal',
      confidence,
      reason: `${maximalCount}/${outfit.items.length} items have bold keywords + ${maximalBrightColorCount} bright colors (${Math.round(confidence * 100)}% confidence)`
    });
  } else if (maximalBrightColorCount >= 3) {
    // Bright/contrasting colors can indicate Maximal even without keywords (but lower confidence)
    const confidence = Math.min(0.60, 0.45 + (maximalBrightColorCount * 0.05));
    hints.stylePillarHints.push({
      pillar: 'Maximal',
      confidence,
      reason: `${maximalBrightColorCount} bright/contrasting colors suggest bold aesthetic (${Math.round(confidence * 100)}% confidence - needs visual confirmation)`
    });
  }

  // WORKSTREAM 4: Earth-tone color detection (boosts Bohemian/Utility)
  const earthTones = ['brown', 'tan', 'olive', 'khaki', 'camel', 'rust', 'terracotta', 'sand', 'mushroom', 'taupe', 'cognac', 'chestnut'];
  const earthToneCount = allColors.filter(color =>
    earthTones.some(et => color.toLowerCase().includes(et))
  ).length;

  if (earthToneCount >= 2) {
    // Boost Bohemian confidence if already detected
    const bohemianHint = hints.stylePillarHints.find(h => h.pillar === 'Bohemian');
    if (bohemianHint) {
      bohemianHint.confidence = Math.min(0.95, bohemianHint.confidence + 0.15);
      bohemianHint.reason += ' + earth-tone palette';
    }

    // Also boost Utility confidence if present
    const utilityHint = hints.stylePillarHints.find(h => h.pillar === 'Utility');
    if (utilityHint) {
      utilityHint.confidence = Math.min(0.95, utilityHint.confidence + 0.10);
      utilityHint.reason += ' + earth-tone palette';
    }
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

  // WORKSTREAM 4: Luxe vibe hint (luxury materials)
  const luxeMaterials = ['cashmere', 'silk', 'satin', 'velvet', 'wool'];
  const luxeCount = productTypes.filter(p =>
    luxeMaterials.some(mat => p.title.includes(mat))
  ).length;
  if (luxeCount >= 1) {
    hints.vibeHints.push({
      vibe: 'Luxe',
      confidence: luxeCount >= 2 ? 0.75 : 0.65,
      reason: `Luxury materials detected (${luxeCount} items with cashmere/silk/velvet/satin)`
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

  // WORKSTREAM 4: Dramatic vibe hint (bodycon, cutouts, bold silhouettes)
  const dramaticSilhouettes = ['bodycon', 'cutout', 'cut-out', 'plunging', 'backless', 'high slit', 'thigh slit', 'deep v', 'off-shoulder'];
  const dramaticCount = productTypes.filter(p =>
    dramaticSilhouettes.some(sil => p.title.includes(sil))
  ).length;
  if (dramaticCount >= 1) {
    hints.vibeHints.push({
      vibe: 'Dramatic',
      confidence: 0.70,
      reason: `Dramatic silhouettes/details detected (${dramaticCount} items)`
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
      occasion: 'Date Night',
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
