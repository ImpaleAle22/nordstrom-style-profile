/**
 * Vision Analysis to Recipe Converter
 *
 * Converts AI vision analysis results into recipe slots,
 * filtering non-wearable items and mapping to valid roles.
 */

import type { OutfitRole } from './role-mappings';
import type { RecipeSlot, RecipeIngredient } from './unified-recipe-types';

interface VisionItem {
  role: string;
  title: string;
  description: string;
  color: string;
  material?: string;
  // Vision enrichment metadata (NEW - Phase 2: Recipe Precision System)
  enrichment?: {
    patterns?: string[];
    silhouette?: string;
    secondaryColors?: string[];
    garmentLength?: string;
    neckline?: string;
    sleeveStyle?: string;
    fitType?: string;
    textureType?: string;
    styleDetails?: string[];
  };
}

/**
 * Non-wearable items to filter out
 */
const NON_WEARABLE_KEYWORDS = [
  'camera', 'video camera', 'phone', 'smartphone', 'tablet',
  'laptop', 'computer', 'book', 'magazine', 'newspaper',
  'drink', 'beverage', 'coffee', 'bottle', 'cup',
  'furniture', 'chair', 'table', 'umbrella',
  'props', 'decoration', 'sign', 'poster',
  'leash', 'dog leash', 'pet', 'collar', 'dog collar', // Pet items
];

/**
 * Check if an item is actually wearable/part of an outfit
 */
function isWearable(item: VisionItem): { wearable: boolean; reason?: string } {
  const role = item.role.toLowerCase();

  // Core garment types are ALWAYS wearable (don't filter these!)
  const coreGarmentRoles = ['dress', 'dresses', 'tops', 'top', 'bottoms', 'bottom', 'shoes', 'shoe', 'outerwear', 'jacket', 'coat', 'skirt', 'pants'];
  if (coreGarmentRoles.some(r => role.includes(r))) {
    return { wearable: true }; // Core garments always pass
  }

  // Only check keywords for accessories or unknown roles
  const desc = item.description.toLowerCase();

  // Check for non-wearable keywords (use word boundaries to avoid false positives like "design" matching "sign")
  for (const keyword of NON_WEARABLE_KEYWORDS) {
    // Escape special regex characters and replace spaces with \s+ for flexible matching
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    if (regex.test(desc)) {
      return { wearable: false, reason: `Contains non-wearable keyword: "${keyword}"` };
    }
  }

  // Additional heuristic: accessories role but description suggests prop
  if (role === 'accessories' && (
    desc.includes('holding') ||
    desc.includes('carrying') ||
    (desc.includes('vintage-style') && desc.includes('camera'))
  )) {
    return { wearable: false, reason: 'Accessory description suggests prop (holding/carrying)' };
  }

  return { wearable: true };
}

/**
 * Map vision analysis role to valid outfit role
 */
function mapToOutfitRole(visionRole: string): OutfitRole | null {
  const role = visionRole.toLowerCase().trim();

  // Tops
  if (role === 'tops' || role === 'top' || role === 'shirt' || role === 'blouse') return 'tops';

  // Bottoms
  if (role === 'bottoms' || role === 'bottom' || role === 'pants' || role === 'skirt' || role === 'shorts') return 'bottoms';

  // Shoes
  if (role === 'shoes' || role === 'shoe' || role === 'footwear' || role === 'sneakers' || role === 'boots' || role === 'sandals') return 'shoes';

  // Outerwear
  if (role === 'outerwear' || role === 'jacket' || role === 'coat' || role === 'blazer' || role === 'cardigan') return 'outerwear';

  // One-piece (CRITICAL: dresses, jumpsuits)
  if (
    role === 'dress' ||
    role === 'dresses' ||
    role === 'jumpsuit' ||
    role === 'jumpsuits' ||
    role === 'romper' ||
    role === 'one-piece' ||
    role === 'one piece' ||
    role.includes('dress') // Catch "midi dress", "maxi dress", etc.
  ) {
    return 'one-piece';
  }

  // Accessories
  if (
    role === 'accessories' ||
    role === 'accessory' ||
    role === 'bag' ||
    role === 'hat' ||
    role === 'jewelry' ||
    role === 'belt' ||
    role === 'scarf'
  ) {
    return 'accessories';
  }

  return null;
}

/**
 * Convert outfit role to productType1 for CLIP API filtering
 */
function roleToProductType(role: OutfitRole): string {
  const mapping: Record<OutfitRole, string> = {
    'tops': 'Tops',
    'bottoms': 'Bottoms',
    'shoes': 'Shoes',
    'accessories': 'Accessories',
    'one-piece': 'Dresses',
    'outerwear': 'Outerwear',
  };
  return mapping[role] || 'Unknown';
}

/**
 * Infer productType2 (subcategory) from item title/description
 * Uses canonical product taxonomy
 */
function inferProductType2(title: string, description: string, role: OutfitRole): string[] {
  const combined = `${title} ${description}`.toLowerCase();

  // Canonical Type2 mappings by Type1
  const type2Mappings: Record<OutfitRole, Record<string, string[]>> = {
    'tops': {
      'Blouses': ['blouse', 'button-down', 'button-up', 'button down', 'button up'],
      'T-Shirts': ['t-shirt', 'tee', 'tshirt', 'graphic tee', 'crew neck tee'],
      'Shirts': ['shirt', 'oxford', 'dress shirt', 'casual shirt'],
      'Tank Tops': ['tank', 'cami', 'camisole', 'halter'],
      'Sweaters': ['sweater', 'pullover', 'cardigan', 'knit'],
      'Hoodies': ['hoodie', 'sweatshirt'],
    },
    'bottoms': {
      'Jeans': ['jeans', 'denim'],
      'Pants': ['pants', 'trousers', 'chinos', 'slacks'],
      'Skirts': ['skirt', 'mini skirt', 'midi skirt', 'maxi skirt'],
      'Shorts': ['shorts', 'short'],
      'Leggings': ['leggings', 'tights', 'yoga pants'],
    },
    'one-piece': {
      'Dress': ['dress', 'gown', 'frock'],
      'Jumpsuits': ['jumpsuit', 'romper', 'playsuit'],
    },
    'shoes': {
      'Sneakers': ['sneakers', 'trainers', 'athletic shoes', 'running shoes'],
      'Boots': ['boots', 'booties', 'ankle boots'],
      'Heels': ['heels', 'pumps', 'stilettos', 'high heels'],
      'Sandals': ['sandals', 'slides', 'flip flops'],
      'Flats': ['flats', 'ballet flats', 'loafers'],
    },
    'outerwear': {
      'Jacket': ['jacket', 'blazer', 'sport coat', 'bomber'],
      'Coat': ['coat', 'trench', 'overcoat', 'peacoat'],
      'Cardigan': ['cardigan'],
    },
    'accessories': {
      'Bags': ['bag', 'purse', 'handbag', 'tote', 'clutch', 'crossbody', 'backpack', 'satchel'],
      'Jewelry': ['necklace', 'bracelet', 'earrings', 'ring', 'jewelry'],
      'Hats': ['hat', 'cap', 'beanie', 'fedora'],
      'Belts': ['belt', 'waist belt'],
      'Scarves': ['scarf', 'shawl', 'wrap'],
      'Hair Accessories': ['scrunchie', 'hair clip', 'headband', 'barrette'],
      'Ties': ['tie', 'necktie', 'bow tie'],
      'Sunglasses': ['sunglasses', 'shades', 'glasses'],
    },
  };

  const mappings = type2Mappings[role];
  if (!mappings) return [];

  // Find matching Type2
  for (const [type2, keywords] of Object.entries(mappings)) {
    for (const keyword of keywords) {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(combined)) {
        return [type2];
      }
    }
  }

  return [];
}

/**
 * Extract and validate material from item
 * Returns only actual materials, not product types
 */
function extractMaterial(materialField?: string, title?: string, description?: string): string[] {
  if (!materialField) return [];

  const material = materialField.toLowerCase().trim();

  // Canonical materials list
  const validMaterials = [
    'denim', 'cotton', 'leather', 'wool', 'silk', 'polyester', 'nylon',
    'cashmere', 'linen', 'suede', 'velvet', 'satin', 'chiffon', 'knit',
    'fleece', 'jersey', 'twill', 'canvas', 'corduroy', 'mesh', 'synthetic',
  ];

  // Check if material field contains actual material
  for (const validMat of validMaterials) {
    if (material.includes(validMat)) {
      return [validMat.charAt(0).toUpperCase() + validMat.slice(1)]; // Capitalize
    }
  }

  // If material field doesn't match canonical list, check title/description
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  const foundMaterials: string[] = [];
  for (const validMat of validMaterials) {
    const regex = new RegExp(`\\b${validMat}\\b`, 'i');
    if (regex.test(combined)) {
      foundMaterials.push(validMat.charAt(0).toUpperCase() + validMat.slice(1));
    }
  }

  return foundMaterials;
}

/**
 * Convert vision item to recipe ingredient
 * Uses canonical product taxonomy (Type1 → Type2, Materials separate)
 */
function createIngredient(item: VisionItem, role: OutfitRole): RecipeIngredient {
  // Use the AI-provided title (already clean and search-optimized)
  const title = item.title;

  // Infer productType2 (subcategory) from title/description
  const productType2 = inferProductType2(title, item.description, role);

  // Extract and validate materials (only actual materials, not product types)
  const materials = extractMaterial(item.material, title, item.description);

  // Build search query from title + metadata (include color but not material in query)
  // Material will be used as a filter, not part of the semantic search
  const searchTerms = [item.color, title]
    .filter(Boolean)
    .join(' ')
    .substring(0, 100); // Limit query length

  console.log(`   🏷️  Taxonomy: ${roleToProductType(role)} > ${productType2.join(', ') || 'N/A'} | Materials: ${materials.join(', ') || 'N/A'}`);

  // Copy enrichment data if present (NEW - Phase 2: Recipe Precision System)
  // Only include enrichment if at least one field has a value
  const hasEnrichment = item.enrichment && Object.values(item.enrichment).some(v =>
    v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  );

  return {
    ingredientTitle: title,
    searchQuery: searchTerms,
    productTypes: [roleToProductType(role)], // Type1 (Category)
    productType2: productType2.length > 0 ? productType2 : undefined, // Type2 (Subcategory)
    materials: materials.length > 0 ? materials : [], // Actual materials only
    brands: [],
    confidence: 0.85, // Vision analysis confidence
    originalQuery: item.description, // Keep full description for reference
    enrichment: hasEnrichment ? item.enrichment : undefined, // Copy enrichment metadata
  };
}

/**
 * Prioritize slots to keep within 4-6 slot limit
 */
function prioritizeSlots(slots: RecipeSlot[]): { kept: RecipeSlot[]; deprioritized: RecipeSlot[] } {
  const MAX_SLOTS = 6;

  if (slots.length <= MAX_SLOTS) {
    return { kept: slots, deprioritized: [] };
  }

  // Priority order (higher = more important)
  const rolePriority: Record<OutfitRole, number> = {
    'shoes': 100,        // Always required
    'bottoms': 90,       // Core garment
    'one-piece': 90,     // Core garment (alternative to tops+bottoms)
    'tops': 80,          // Core garment (layering is intentional)
    'outerwear': 70,     // Important layer
    'accessories': 30,   // Optional (lowered from 50)
  };

  // Count items per role
  const roleCounts: Record<string, number> = {};
  slots.forEach(slot => {
    roleCounts[slot.role] = (roleCounts[slot.role] || 0) + 1;
  });

  // Sort by priority
  const scored = slots.map((slot, index) => {
    const count = slots.slice(0, index).filter(s => s.role === slot.role).length;

    let score = rolePriority[slot.role];

    // Only penalize duplicate accessories (not core garments)
    // Core garments: Multiple tops = layering (intentional)
    // Accessories: Multiple accessories = optional extras
    if (slot.role === 'accessories' && count > 0) {
      // Heavy penalty for 2nd+ accessories
      score -= count * 25;
    } else if ((slot.role === 'tops' || slot.role === 'outerwear') && count > 0) {
      // Light penalty for layering (but still keep it over accessories)
      score -= count * 10;
    }

    return { slot, score, index };
  });

  // Sort by score descending (tie-break by original order)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  // Keep top 6, deprioritize rest
  const kept = scored.slice(0, MAX_SLOTS).map(s => s.slot);
  const deprioritized = scored.slice(MAX_SLOTS).map(s => s.slot);

  deprioritized.forEach(slot => {
    console.log(`📉 Deprioritized (too many slots): ${slot.ingredient.ingredientTitle} (${slot.role})`);
  });

  return { kept, deprioritized };
}

/**
 * Convert suggested items from AI to recipe slots
 */
function createSuggestedSlots(suggestedItems: VisionItem[]): RecipeSlot[] {
  const slots: RecipeSlot[] = [];

  for (const item of suggestedItems) {
    const role = mapToOutfitRole(item.role);
    if (!role) continue;

    const slot: RecipeSlot = {
      role,
      ingredient: {
        ...createIngredient(item, role), // Pass role for productType inference
        confidence: 0.6, // Mark as AI-suggested (lower than detected 0.85)
      },
    };

    slots.push(slot);
  }

  return slots;
}

/**
 * Generate recipe variations from slots
 * Creates different styling options by swapping accessories or adding suggested items
 */
function generateRecipeVariations(
  allSlots: RecipeSlot[],
  baseName: string,
  suggestedSlots: RecipeSlot[] = []
): Array<{
  name: string;
  slots: RecipeSlot[];
  description: string;
  needsCompletion?: boolean;
}> {
  const MAX_SLOTS = 6;
  const MIN_SLOTS = 4;
  const MAX_VARIATIONS = 3;

  // Separate core items from accessories
  const coreSlots = allSlots.filter(s => s.role !== 'accessories');
  const accessories = allSlots.filter(s => s.role === 'accessories');

  // CRITICAL: Auto-add missing hard requirements from suggestions
  let remainingSuggestions = [...suggestedSlots];

  // Check for missing shoes (hard requirement)
  const hasShoes = allSlots.some(slot => slot.role === 'shoes');
  if (!hasShoes && remainingSuggestions.length > 0) {
    const suggestedShoes = remainingSuggestions.find(s => s.role === 'shoes');
    if (suggestedShoes) {
      console.log(`⚠️  Missing shoes - adding AI suggestion: ${suggestedShoes.ingredient.ingredientTitle}`);
      allSlots.push(suggestedShoes);
      remainingSuggestions = remainingSuggestions.filter(s => s.role !== 'shoes');
    }
  }

  // Check for missing tops (hard requirement if no one-piece)
  const hasTops = allSlots.some(slot => slot.role === 'tops');
  const hasOnePiece = allSlots.some(slot => slot.role === 'one-piece');
  if (!hasTops && !hasOnePiece && remainingSuggestions.length > 0) {
    const suggestedTop = remainingSuggestions.find(s => s.role === 'tops');
    if (suggestedTop) {
      console.log(`⚠️  Missing top - adding AI suggestion: ${suggestedTop.ingredient.ingredientTitle}`);
      allSlots.push(suggestedTop);
      remainingSuggestions = remainingSuggestions.filter(s => s.role !== 'tops');
    }
  }

  // Check for missing bottoms (hard requirement if no one-piece)
  const hasBottoms = allSlots.some(slot => slot.role === 'bottoms');
  if (!hasBottoms && !hasOnePiece && remainingSuggestions.length > 0) {
    const suggestedBottoms = remainingSuggestions.find(s => s.role === 'bottoms');
    if (suggestedBottoms) {
      console.log(`⚠️  Missing bottoms - adding AI suggestion: ${suggestedBottoms.ingredient.ingredientTitle}`);
      allSlots.push(suggestedBottoms);
      remainingSuggestions = remainingSuggestions.filter(s => s.role !== 'bottoms');
    }
  }

  // Check if outfit is under minimum and we have remaining suggestions
  if (allSlots.length < MIN_SLOTS && remainingSuggestions.length > 0) {
    const variations: Array<{
      name: string;
      slots: RecipeSlot[];
      description: string;
      needsCompletion?: boolean;
    }> = [];

    // Suggestions are already handled (shoes added above if needed)
    // Just use remaining suggestions for filling to 4/5/6 items
    const orderedSuggestions = remainingSuggestions;

    // Create 4, 5, and 6-item variations using suggested items
    const itemCounts = [4, 5, 6].filter(count => count <= allSlots.length + orderedSuggestions.length);

    itemCounts.forEach((count, index) => {
      const slotsNeeded = count - allSlots.length;
      const slotsToAdd = orderedSuggestions.slice(0, slotsNeeded);

      variations.push({
        name: index === 0 ? baseName : `${baseName} (${count} items)`,
        slots: [...allSlots, ...slotsToAdd],
        description: index === 0
          ? `${count}-item outfit with AI-suggested additions`
          : `Styled with ${slotsNeeded} additional item${slotsNeeded > 1 ? 's' : ''}`,
        needsCompletion: true,
      });
    });

    return variations;
  }

  // If everything fits in one recipe, return single variation
  if (allSlots.length <= MAX_SLOTS) {
    return [{
      name: baseName,
      slots: allSlots,
      description: 'Complete outfit as photographed',
    }];
  }

  const variations: Array<{
    name: string;
    slots: RecipeSlot[];
    description: string;
  }> = [];

  // Variation 1: Primary recipe with first accessories
  const slotsAvailable = MAX_SLOTS - coreSlots.length;
  const primaryAccessories = accessories.slice(0, slotsAvailable);
  variations.push({
    name: baseName,
    slots: [...coreSlots, ...primaryAccessories],
    description: 'Primary styling with essential accessories',
  });

  // Variation 2+: Alternative stylings with different accessories
  if (accessories.length > slotsAvailable) {
    const remainingAccessories = accessories.slice(slotsAvailable);

    // Create variations by swapping accessories
    for (let i = 0; i < Math.min(remainingAccessories.length, MAX_VARIATIONS - 1); i++) {
      const altAccessories = [
        ...primaryAccessories.slice(0, -1), // Remove last primary accessory
        remainingAccessories[i], // Add alternative accessory
      ];

      const variantNum = i + 2;
      variations.push({
        name: `${baseName} (Variation ${variantNum})`,
        slots: [...coreSlots, ...altAccessories],
        description: `Alternative styling with ${remainingAccessories[i].ingredient.ingredientTitle.toLowerCase()}`,
      });
    }

    // Simplified variation (fewer accessories)
    if (accessories.length >= 2 && variations.length < MAX_VARIATIONS) {
      variations.push({
        name: `${baseName} (Simplified)`,
        slots: [...coreSlots, ...(accessories.slice(0, 1))],
        description: 'Simplified styling with fewer accessories',
      });
    }
  }

  return variations;
}

/**
 * Convert vision analysis results to recipe slots
 */
export function visionToRecipeSlots(
  items: VisionItem[],
  recipeName: string = 'Untitled Recipe',
  suggestedItems: VisionItem[] = []
): {
  variations: Array<{
    name: string;
    slots: RecipeSlot[];
    description: string;
  }>;
  filtered: VisionItem[];
} {
  const filtered: VisionItem[] = [];
  const allSlots: RecipeSlot[] = [];

  for (const item of items) {
    console.log(`\n📋 Processing item: "${item.description}"`);
    console.log(`   Role from API: "${item.role}"`);

    // Filter non-wearable items
    const wearableCheck = isWearable(item);
    if (!wearableCheck.wearable) {
      filtered.push(item);
      console.log(`   ❌ FILTERED: ${wearableCheck.reason}`);
      continue;
    }

    // Map to valid outfit role
    const role = mapToOutfitRole(item.role);
    if (!role) {
      filtered.push(item);
      console.log(`   ❌ FILTERED: Unknown role "${item.role}" (couldn't map to valid outfit role)`);
      continue;
    }

    console.log(`   ✅ Mapped to: ${role}`);

    // Create recipe slot
    const slot: RecipeSlot = {
      role,
      ingredient: createIngredient(item, role), // Pass role for productType inference
    };

    allSlots.push(slot);
  }

  // Process suggested items from AI
  const suggestedSlots = createSuggestedSlots(suggestedItems);

  if (suggestedSlots.length > 0) {
    console.log(`\n💡 AI suggested ${suggestedSlots.length} additional item(s):`);
    suggestedSlots.forEach(slot => {
      console.log(`   • ${slot.ingredient.ingredientTitle} (${slot.role})`);
    });
  }

  // Generate recipe variations
  const variations = generateRecipeVariations(allSlots, recipeName, suggestedSlots);

  console.log(`\n📋 Generated ${variations.length} recipe variation(s)`);
  variations.forEach((v, i) => {
    console.log(`   ${i + 1}. "${v.name}" - ${v.slots.length} slots - ${v.description}`);
  });

  return { variations, filtered };
}

/**
 * Validate recipe structure (outfit building rules)
 */
export function validateRecipeStructure(slots: RecipeSlot[]): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Count slots by role
  const roleCounts: Record<string, number> = {};
  for (const slot of slots) {
    roleCounts[slot.role] = (roleCounts[slot.role] || 0) + 1;
  }

  // Hard rules validation
  if (slots.length < 4) {
    errors.push(`Too few items: ${slots.length} (minimum 4 required)`);
  }

  if (slots.length > 6) {
    warnings.push(`Many items: ${slots.length} (typical range: 4-6)`);
  }

  if (!roleCounts['shoes']) {
    errors.push('Missing shoes (required)');
  }

  if (!roleCounts['tops'] && !roleCounts['one-piece']) {
    errors.push('Missing tops or dress (at least one required)');
  }

  if (!roleCounts['bottoms'] && !roleCounts['one-piece']) {
    errors.push('Missing bottoms or dress (at least one required)');
  }

  // Soft rules / warnings
  if (roleCounts['tops'] > 2) {
    warnings.push(`Many tops: ${roleCounts['tops']} (typical: 1-2 for layering)`);
  }

  if (roleCounts['accessories'] > 3) {
    warnings.push(`Many accessories: ${roleCounts['accessories']} (typical: 1-3)`);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Phase 3: Product Availability Validation
 * Check if products exist in catalog for each recipe ingredient
 */
export interface ProductAvailabilityResult {
  isValid: boolean;
  unavailableSlots: Array<{
    role: OutfitRole;
    ingredientTitle: string;
    searchQuery: string;
    productCount: number;
    suggestion?: string;
  }>;
  totalSlots: number;
  availableSlots: number;
  suggestions?: string;
}

/**
 * Validate that products exist in catalog for recipe ingredients
 * @param slots Recipe slots to validate
 * @param clipApiUrl CLIP API base URL (default: http://localhost:5002)
 * @returns Validation result with availability info
 */
export async function validateProductAvailability(
  slots: RecipeSlot[],
  clipApiUrl: string = 'http://localhost:5002'
): Promise<ProductAvailabilityResult> {
  const unavailableSlots: ProductAvailabilityResult['unavailableSlots'] = [];
  let availableCount = 0;

  console.log(`\n🔍 Validating product availability for ${slots.length} slots...`);

  for (const slot of slots) {
    const ingredient = slot.ingredient;
    if (!ingredient) continue;

    // Build search query (same logic as recipe cooking)
    const searchQuery = ingredient.searchQuery;

    try {
      // Query CLIP API with search query
      const url = `${clipApiUrl}/search?q=${encodeURIComponent(searchQuery)}&limit=5`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`   ❌ API error for "${ingredient.ingredientTitle}": ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const results = data.results || [];

      // Check if there are good matches (similarity score > 0.3 is reasonable)
      // FashionSigLIP scores range from -1 to 1, with 0.3+ being decent matches
      const MIN_SIMILARITY_THRESHOLD = 0.3;
      const goodMatches = results.filter((r: any) => r.score >= MIN_SIMILARITY_THRESHOLD);
      const productCount = goodMatches.length;

      const topScore = results.length > 0 ? results[0].score.toFixed(3) : 'N/A';
      console.log(`   ${productCount > 0 ? '✅' : '❌'} "${ingredient.ingredientTitle}": ${productCount} good matches (top score: ${topScore})`);

      if (productCount === 0) {
        // Generate suggestion for more generic query
        const suggestion = generateAvailabilitySuggestion(ingredient);

        unavailableSlots.push({
          role: slot.role,
          ingredientTitle: ingredient.ingredientTitle,
          searchQuery: searchQuery,
          productCount: productCount,
          suggestion,
        });
      } else {
        availableCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error checking availability for "${ingredient.ingredientTitle}":`, error);
    }
  }

  const isValid = unavailableSlots.length === 0;

  // Generate overall suggestions if there are unavailable items
  let overallSuggestions: string | undefined;
  if (!isValid) {
    overallSuggestions = generateOverallSuggestions(unavailableSlots);
  }

  console.log(`\n📊 Validation Results:`);
  console.log(`   Available: ${availableCount}/${slots.length}`);
  console.log(`   Unavailable: ${unavailableSlots.length}`);

  return {
    isValid,
    unavailableSlots,
    totalSlots: slots.length,
    availableSlots: availableCount,
    suggestions: overallSuggestions,
  };
}

/**
 * Generate suggestion for making ingredient more generic
 */
function generateAvailabilitySuggestion(ingredient: RecipeIngredient): string {
  const title = ingredient.ingredientTitle;
  const query = ingredient.searchQuery;

  // Common patterns to simplify
  const suggestions: string[] = [];

  // Remove specific brand mentions if present
  const brandKeywords = ['gucci', 'prada', 'versace', 'chanel', 'dior', 'balenciaga', 'givenchy'];
  for (const brand of brandKeywords) {
    if (title.toLowerCase().includes(brand) || query.toLowerCase().includes(brand)) {
      suggestions.push(`Try removing brand name ("${brand}")`);
      break;
    }
  }

  // Suggest removing very specific descriptors
  if (title.split(' ').length > 4) {
    suggestions.push('Try using fewer descriptive words (keep only essential attributes)');
  }

  // If no specific suggestions, provide general guidance
  if (suggestions.length === 0) {
    suggestions.push('Try using more generic terms (e.g., "floral midi dress" instead of "floral print A-line midi dress")');
  }

  return suggestions[0];
}

/**
 * Generate overall suggestions for fixing unavailable items
 */
function generateOverallSuggestions(unavailableSlots: ProductAvailabilityResult['unavailableSlots']): string {
  if (unavailableSlots.length === 0) return '';

  const suggestions: string[] = [];

  // Check if many items are unavailable
  if (unavailableSlots.length > 2) {
    suggestions.push('Multiple items unavailable - consider making descriptions more generic');
  }

  // Check for common issues
  const hasZeroProducts = unavailableSlots.every(s => s.productCount === 0);
  if (hasZeroProducts) {
    suggestions.push('Try simplifying ingredient descriptions to match available products');
  }

  return suggestions.join('. ') + '. You can still cook this recipe to see what AI generates.';
}
