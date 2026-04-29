/**
 * Color Extraction Utility
 *
 * Extracts color filters from search queries to enable strict color matching.
 * Uses the 66 simplified colors from the product catalog + vanity color mappings.
 *
 * Example:
 * - "Black leather jacket" → ["Black"]
 * - "Light blue denim jeans" → ["Light Blue"]
 * - "Coral blouse" → ["Orange"] (vanity mapping)
 */

// 66 simplified colors from product catalog
const SIMPLIFIED_COLORS = [
  // Neutrals
  'White', 'Black', 'Gray', 'Beige', 'Brown', 'Cream', 'Ivory', 'Taupe',

  // Blues
  'Blue', 'Navy', 'Light Blue', 'Dark Blue', 'Turquoise', 'Teal',

  // Reds/Pinks
  'Red', 'Pink', 'Light Pink', 'Dark Red', 'Burgundy', 'Wine', 'Maroon',

  // Purples
  'Purple', 'Lavender', 'Lilac', 'Plum',

  // Greens
  'Green', 'Dark Green', 'Light Green', 'Olive', 'Mint', 'Sage',

  // Yellows/Oranges
  'Yellow', 'Orange', 'Gold', 'Mustard', 'Peach',

  // Multicolor/Patterns
  'Multicolor', 'Metallic', 'Silver',

  // Special
  'Denim', 'Khaki', 'Camel', 'Charcoal',

  // Additional variations
  'Off-White', 'Bone', 'Ecru', 'Sand', 'Tan', 'Chocolate',
  'Rust', 'Terracotta', 'Coral', 'Salmon', 'Fuchsia', 'Magenta',
  'Indigo', 'Cobalt', 'Sky Blue', 'Aqua', 'Cyan',
  'Forest Green', 'Emerald', 'Lime', 'Chartreuse',
  'Mauve', 'Violet', 'Rose'
];

// Vanity color mappings (less common color names → simplified colors)
const VANITY_COLOR_MAPPINGS: Record<string, string> = {
  // Beige variations
  'ochre': 'Beige',
  'tan': 'Beige',
  'sand': 'Beige',
  'ecru': 'Cream',
  'bone': 'Cream',

  // Brown variations
  'chocolate': 'Brown',
  'mocha': 'Brown',
  'coffee': 'Brown',
  'chestnut': 'Brown',

  // Red/Pink variations
  'coral': 'Orange',
  'salmon': 'Pink',
  'rose': 'Pink',
  'blush': 'Light Pink',
  'fuchsia': 'Pink',
  'magenta': 'Pink',
  'crimson': 'Red',
  'scarlet': 'Red',

  // Orange variations
  'rust': 'Orange',
  'terracotta': 'Orange',
  // 'copper': 'Orange', // Moved to Metallic section below
  // 'bronze': 'Orange', // Moved to Metallic section below

  // Yellow variations
  'lemon': 'Yellow',
  'canary': 'Yellow',
  'honey': 'Gold',
  'amber': 'Gold',

  // Green variations
  'emerald': 'Green',
  'forest': 'Dark Green',
  'lime': 'Light Green',
  'chartreuse': 'Light Green',
  'moss': 'Olive',
  'jade': 'Green',

  // Blue variations
  'navy': 'Navy',
  'cobalt': 'Blue',
  'indigo': 'Navy',
  'sky': 'Light Blue',
  'azure': 'Light Blue',
  'aqua': 'Turquoise',
  'cyan': 'Turquoise',

  // Purple variations
  'mauve': 'Lavender',
  'violet': 'Purple',
  'amethyst': 'Purple',

  // Gray variations
  'charcoal': 'Charcoal',
  'slate': 'Gray',
  'pewter': 'Gray',
  'ash': 'Gray',

  // Metallic
  'gold': 'Gold',
  'silver': 'Silver',
  'bronze': 'Metallic',
  'copper': 'Metallic',
};

/**
 * Extract colors from a search query
 * Returns array of simplified color names that match the product catalog
 *
 * @param query - Search query (e.g., "Black leather jacket")
 * @returns Array of simplified colors (e.g., ["Black"])
 */
export function extractColorsFromQuery(query: string): string[] {
  const queryLower = query.toLowerCase();
  const detectedColors = new Set<string>();

  // Multi-word colors (check these first to avoid partial matches)
  const multiWordColors = [
    'light blue', 'dark blue', 'light pink', 'dark pink', 'dark red',
    'light green', 'dark green', 'off-white', 'sky blue', 'forest green'
  ];

  for (const multiColor of multiWordColors) {
    if (queryLower.includes(multiColor)) {
      // Convert to title case for matching with SIMPLIFIED_COLORS
      const titleCase = multiColor.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      if (SIMPLIFIED_COLORS.includes(titleCase)) {
        detectedColors.add(titleCase);
      }
    }
  }

  // Single-word colors
  for (const color of SIMPLIFIED_COLORS) {
    const colorLower = color.toLowerCase();

    // Use word boundary regex to avoid false positives
    // e.g., "black" shouldn't match "blackberry"
    const regex = new RegExp(`\\b${colorLower}\\b`, 'i');

    if (regex.test(queryLower)) {
      detectedColors.add(color);
    }
  }

  // Check vanity color mappings
  for (const [vanityColor, baseColor] of Object.entries(VANITY_COLOR_MAPPINGS)) {
    const regex = new RegExp(`\\b${vanityColor}\\b`, 'i');

    if (regex.test(queryLower)) {
      detectedColors.add(baseColor);
    }
  }

  return Array.from(detectedColors);
}

/**
 * Check if a product matches the color filter
 *
 * @param productColors - Product's simplified colors array
 * @param filterColors - Required colors from query
 * @returns True if product has at least one matching color
 */
export function matchesColorFilter(
  productColors: string[],
  filterColors: string[]
): boolean {
  if (!filterColors || filterColors.length === 0) {
    return true; // No filter = match everything
  }

  if (!productColors || productColors.length === 0) {
    return false; // No product colors = no match
  }

  // Product must have at least one of the filter colors
  return filterColors.some(filterColor =>
    productColors.includes(filterColor)
  );
}

/**
 * Get all available colors (for UI dropdowns)
 */
export function getAllColors(): string[] {
  return [...SIMPLIFIED_COLORS].sort();
}

/**
 * Get vanity color mappings (for documentation/debugging)
 */
export function getVanityColorMappings(): Record<string, string> {
  return { ...VANITY_COLOR_MAPPINGS };
}
