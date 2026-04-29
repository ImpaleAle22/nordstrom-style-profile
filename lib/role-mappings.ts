/**
 * Maps Product Type 1 (PT1) categories to Outfit Roles
 * Used by Outfit Composer to validate outfit structure
 */

export type OutfitRole = 'tops' | 'bottoms' | 'one-piece' | 'shoes' | 'outerwear' | 'accessories';

const PT1_TO_ROLE_MAP: Record<string, OutfitRole> = {
  // Tops
  'Tops': 'tops',

  // Bottoms
  'Bottoms': 'bottoms',

  // One-piece garments
  'Dresses': 'one-piece',
  'Jumpsuits/Coveralls': 'one-piece',

  // Footwear
  'Shoes': 'shoes',

  // Outerwear
  'Outerwear': 'outerwear',
  'Jacket/Sportcoat': 'outerwear',

  // Accessories
  'Bags': 'accessories',
  'Belts & Braces': 'accessories',
  'Eyewear': 'accessories',
  'Gloves/Mittens': 'accessories',
  'Headwear': 'accessories',
  'Hosiery': 'accessories',
  'Jewelry': 'accessories',
  'Neckwear': 'accessories',
  'Scarves/Wraps/Ponchos': 'accessories',
  'Small Leather Goods': 'accessories',

  // Special cases (default to accessories)
  'Suits/Sets/Wardrobers': 'accessories', // Can be one-piece or separates
  'Swimwear': 'accessories', // Context-specific
};

/**
 * Get outfit role for a given PT1 category
 */
export function getRoleFromPT1(pt1Category: string): OutfitRole {
  return PT1_TO_ROLE_MAP[pt1Category] || 'accessories';
}

/**
 * Get human-readable label for a role
 */
export function getRoleLabel(role: OutfitRole): string {
  const labels: Record<OutfitRole, string> = {
    'tops': 'Top',
    'bottoms': 'Bottom',
    'one-piece': 'One-Piece',
    'shoes': 'Shoes',
    'outerwear': 'Outerwear',
    'accessories': 'Accessory',
  };
  return labels[role];
}
