/**
 * Outfit Template System
 *
 * Validates and guides outfit assembly with 66 predefined templates.
 * Ensures combinations make sense (e.g., no dress + pants).
 */

export type SlotRole =
  | 'Base Top'
  | 'Layer'
  | 'Outerwear'
  | 'Bottom'
  | 'One-Piece'
  | 'Footwear'
  | 'Bag'
  | 'Jewelry'
  | 'Belt'
  | 'Headwear'
  | 'Hosiery'
  | 'Eyewear'
  | 'Neckwear';

export interface OutfitTemplate {
  id: string;
  slots: SlotRole[];
  group: string;
  tags?: string[];
}

/**
 * Product Type → Slot Role mapping
 */
export const PRODUCT_TYPE_TO_ROLE: Record<string, SlotRole> = {
  // Base Tops
  'Tank/Cami/Shell': 'Base Top',
  'T-shirt/Tee': 'Base Top',
  'Blouse/Top': 'Base Top',
  'Sweater': 'Base Top',
  'Polo': 'Base Top',
  'Dress-shirt': 'Base Top',
  'Sportshirt': 'Base Top',
  'Tunic': 'Base Top',

  // Layers
  'Blazer': 'Layer',
  'Jacket': 'Layer',
  'Sportcoat': 'Layer',
  'Cardigan': 'Layer',
  'Vest': 'Layer',
  'Shirtjacket': 'Layer',

  // Outerwear
  '3/4 or Long Coat': 'Outerwear',
  'Anorak/Parka': 'Outerwear',
  'Raincoat': 'Outerwear',
  'Short Jacket/Coat': 'Outerwear',

  // Bottoms
  'Pant': 'Bottom',
  'Skirt': 'Bottom',
  'Short': 'Bottom',
  'Skort': 'Bottom',
  'Stirrup/Legging': 'Bottom',

  // One-Pieces
  'Dress': 'One-Piece',
  'Gown': 'One-Piece',
  'Jumpsuit/Romper': 'One-Piece',
  'Coverall': 'One-Piece',

  // Footwear
  'Boots': 'Footwear',
  'Sneaker': 'Footwear',
  'Loafers': 'Footwear',
  'Sandals/Slides': 'Footwear',
  'Flats': 'Footwear',
  'Pumps': 'Footwear',
  'Mule': 'Footwear',
  'Oxfords': 'Footwear',
  'Athletic': 'Footwear',

  // Accessories
  'Tote': 'Bag',
  'Crossbody': 'Bag',
  'Clutch': 'Bag',
  'Backpack': 'Bag',
  'Messenger Bag': 'Bag',
  'Briefcase': 'Bag',
  'Waist Bag': 'Bag',

  'Necklace': 'Jewelry',
  'Earring': 'Jewelry',
  'Bracelet': 'Jewelry',
  'Watch': 'Jewelry',
  'Ring': 'Jewelry',

  'Belts': 'Belt',
  'Hat': 'Headwear',
  'Cap': 'Headwear',
  'Visor': 'Headwear',
  'Socks': 'Hosiery',
  'Sunglasses': 'Eyewear',
  'Goggles': 'Eyewear',
  'Long Ties': 'Neckwear',
  'Bow Ties': 'Neckwear',
  'Scarves': 'Neckwear',
  'Wraps': 'Neckwear',
};

/**
 * All 66 outfit templates
 */
export const OUTFIT_TEMPLATES: OutfitTemplate[] = [
  // GROUP 1 — Top + Bottom
  { id: 'T-01', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag'], group: 'Top + Bottom' },
  { id: 'T-02', slots: ['Base Top', 'Bottom', 'Footwear', 'Jewelry'], group: 'Top + Bottom' },
  { id: 'T-03', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Jewelry'], group: 'Top + Bottom' },
  { id: 'T-04', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Belt'], group: 'Top + Bottom' },
  { id: 'T-05', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Headwear'], group: 'Top + Bottom' },
  { id: 'T-06', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Eyewear'], group: 'Top + Bottom' },
  { id: 'T-07', slots: ['Base Top', 'Bottom', 'Footwear', 'Belt', 'Jewelry'], group: 'Top + Bottom' },
  { id: 'T-08', slots: ['Base Top', 'Bottom', 'Footwear', 'Hosiery', 'Bag'], group: 'Top + Bottom' },
  { id: 'T-09', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Jewelry', 'Belt'], group: 'Top + Bottom' },
  { id: 'T-10', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Jewelry', 'Eyewear'], group: 'Top + Bottom' },
  { id: 'T-11', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Jewelry', 'Headwear'], group: 'Top + Bottom' },
  { id: 'T-12', slots: ['Base Top', 'Bottom', 'Footwear', 'Hosiery', 'Bag', 'Jewelry'], group: 'Top + Bottom' },

  // GROUP 2 — Top + Layer + Bottom
  { id: 'T-13', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Bag'], group: 'Top + Layer + Bottom' },
  { id: 'T-14', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Jewelry'], group: 'Top + Layer + Bottom' },
  { id: 'T-15', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Bag', 'Jewelry'], group: 'Top + Layer + Bottom' },
  { id: 'T-16', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Bag', 'Belt'], group: 'Top + Layer + Bottom' },
  { id: 'T-17', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Bag', 'Headwear'], group: 'Top + Layer + Bottom' },
  { id: 'T-18', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Bag', 'Eyewear'], group: 'Top + Layer + Bottom' },
  { id: 'T-19', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Belt', 'Jewelry'], group: 'Top + Layer + Bottom' },
  { id: 'T-20', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Hosiery', 'Bag'], group: 'Top + Layer + Bottom' },
  { id: 'T-21', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Neckwear', 'Bag'], group: 'Top + Layer + Bottom' },

  // GROUP 3 — Top + Outerwear + Bottom
  { id: 'T-22', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Bag'], group: 'Top + Outerwear + Bottom' },
  { id: 'T-23', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Bag', 'Jewelry'], group: 'Top + Outerwear + Bottom' },
  { id: 'T-24', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Bag', 'Headwear'], group: 'Top + Outerwear + Bottom' },
  { id: 'T-25', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Hosiery', 'Bag'], group: 'Top + Outerwear + Bottom' },
  { id: 'T-26', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Neckwear', 'Bag'], group: 'Top + Outerwear + Bottom' },

  // GROUP 4 — Top + Layer + Outerwear + Bottom
  { id: 'T-27', slots: ['Base Top', 'Layer', 'Outerwear', 'Bottom', 'Footwear', 'Bag'], group: 'Top + Layer + Outerwear + Bottom' },
  { id: 'T-28', slots: ['Base Top', 'Layer', 'Outerwear', 'Bottom', 'Footwear', 'Headwear'], group: 'Top + Layer + Outerwear + Bottom' },
  { id: 'T-29', slots: ['Base Top', 'Layer', 'Outerwear', 'Bottom', 'Footwear', 'Hosiery'], group: 'Top + Layer + Outerwear + Bottom' },
  { id: 'T-30', slots: ['Base Top', 'Layer', 'Outerwear', 'Bottom', 'Footwear', 'Neckwear'], group: 'Top + Layer + Outerwear + Bottom' },

  // GROUP 5 — One-Piece, No Layer
  { id: 'T-31', slots: ['One-Piece', 'Footwear', 'Bag', 'Jewelry'], group: 'One-Piece' },
  { id: 'T-32', slots: ['One-Piece', 'Footwear', 'Jewelry', 'Belt'], group: 'One-Piece' },
  { id: 'T-33', slots: ['One-Piece', 'Footwear', 'Bag', 'Belt'], group: 'One-Piece' },
  { id: 'T-34', slots: ['One-Piece', 'Footwear', 'Bag', 'Jewelry', 'Belt'], group: 'One-Piece' },
  { id: 'T-35', slots: ['One-Piece', 'Footwear', 'Bag', 'Jewelry', 'Eyewear'], group: 'One-Piece' },
  { id: 'T-36', slots: ['One-Piece', 'Footwear', 'Bag', 'Jewelry', 'Headwear'], group: 'One-Piece' },
  { id: 'T-37', slots: ['One-Piece', 'Footwear', 'Bag', 'Jewelry', 'Hosiery'], group: 'One-Piece' },
  { id: 'T-38', slots: ['One-Piece', 'Footwear', 'Bag', 'Jewelry', 'Belt', 'Eyewear'], group: 'One-Piece' },
  { id: 'T-39', slots: ['One-Piece', 'Footwear', 'Bag', 'Jewelry', 'Belt', 'Headwear'], group: 'One-Piece' },

  // GROUP 6 — One-Piece + Layer
  { id: 'T-40', slots: ['One-Piece', 'Layer', 'Footwear', 'Bag'], group: 'One-Piece + Layer' },
  { id: 'T-41', slots: ['One-Piece', 'Layer', 'Footwear', 'Jewelry'], group: 'One-Piece + Layer' },
  { id: 'T-42', slots: ['One-Piece', 'Layer', 'Footwear', 'Bag', 'Jewelry'], group: 'One-Piece + Layer' },
  { id: 'T-43', slots: ['One-Piece', 'Layer', 'Footwear', 'Bag', 'Belt'], group: 'One-Piece + Layer' },
  { id: 'T-44', slots: ['One-Piece', 'Layer', 'Footwear', 'Bag', 'Jewelry', 'Belt'], group: 'One-Piece + Layer' },
  { id: 'T-45', slots: ['One-Piece', 'Layer', 'Footwear', 'Bag', 'Jewelry', 'Eyewear'], group: 'One-Piece + Layer' },

  // GROUP 7 — One-Piece + Outerwear
  { id: 'T-46', slots: ['One-Piece', 'Outerwear', 'Footwear', 'Bag'], group: 'One-Piece + Outerwear' },
  { id: 'T-47', slots: ['One-Piece', 'Outerwear', 'Footwear', 'Bag', 'Jewelry'], group: 'One-Piece + Outerwear' },
  { id: 'T-48', slots: ['One-Piece', 'Outerwear', 'Footwear', 'Bag', 'Jewelry', 'Headwear'], group: 'One-Piece + Outerwear' },

  // GROUP 8 — Menswear
  { id: 'T-49', slots: ['Base Top', 'Bottom', 'Footwear', 'Belt'], group: 'Menswear', tags: ['mens'] },
  { id: 'T-50', slots: ['Base Top', 'Bottom', 'Footwear', 'Belt', 'Jewelry'], group: 'Menswear', tags: ['mens'] },
  { id: 'T-51', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Neckwear'], group: 'Menswear', tags: ['mens'] },
  { id: 'T-52', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Belt', 'Jewelry'], group: 'Menswear', tags: ['mens'] },
  { id: 'T-53', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Neckwear', 'Jewelry'], group: 'Menswear', tags: ['mens'] },
  { id: 'T-54', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Neckwear', 'Bag'], group: 'Menswear', tags: ['mens'] },
  { id: 'T-55', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Belt'], group: 'Menswear', tags: ['mens'] },
  { id: 'T-56', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Belt', 'Bag'], group: 'Menswear', tags: ['mens'] },

  // GROUP 9 — Active / Outdoor
  { id: 'T-57', slots: ['Base Top', 'Bottom', 'Footwear', 'Hosiery'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-58', slots: ['Base Top', 'Bottom', 'Footwear', 'Headwear'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-59', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Hosiery'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-60', slots: ['Base Top', 'Bottom', 'Footwear', 'Bag', 'Headwear'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-61', slots: ['Base Top', 'Bottom', 'Footwear', 'Hosiery', 'Headwear'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-62', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Headwear'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-63', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Hosiery'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-64', slots: ['Base Top', 'Layer', 'Bottom', 'Footwear', 'Headwear', 'Hosiery'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-65', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Headwear'], group: 'Active / Outdoor', tags: ['active'] },
  { id: 'T-66', slots: ['Base Top', 'Outerwear', 'Bottom', 'Footwear', 'Bag', 'Headwear'], group: 'Active / Outdoor', tags: ['active'] },
];

/**
 * Get slot role for a product type
 */
export function getSlotRole(productType: string): SlotRole | null {
  return PRODUCT_TYPE_TO_ROLE[productType] || null;
}

/**
 * Find templates that match the current outfit configuration
 */
export function findMatchingTemplates(
  filledSlots: (string | null)[],
  slotCount: number
): OutfitTemplate[] {
  // Convert product types to roles
  const roles = filledSlots.map(pt => pt ? getSlotRole(pt) : null);

  // Filter templates by slot count
  const templatesWithMatchingSize = OUTFIT_TEMPLATES.filter(t => t.slots.length === slotCount);

  // Find templates where all filled roles match
  return templatesWithMatchingSize.filter(template => {
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      if (role && template.slots[i] !== role) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Get allowed slot roles for next empty slot based on current state
 */
export function getAllowedRolesForSlot(
  filledSlots: (string | null)[],
  targetSlotIndex: number,
  slotCount: number
): SlotRole[] {
  // Convert filled product types to roles
  const filledRoles = filledSlots.map(pt => pt ? getSlotRole(pt) : null);

  // If this slot is already filled, return its current role
  if (filledRoles[targetSlotIndex]) {
    return [filledRoles[targetSlotIndex]!];
  }

  // Find all templates that match the slot count
  const templates = OUTFIT_TEMPLATES.filter(t => t.slots.length === slotCount);

  // Find templates where all currently filled slots match
  const compatibleTemplates = templates.filter(template => {
    for (let i = 0; i < filledRoles.length; i++) {
      const role = filledRoles[i];
      if (role && template.slots[i] !== role) {
        return false;
      }
    }
    return true;
  });

  // If no compatible templates, allow all roles (shouldn't happen)
  if (compatibleTemplates.length === 0) {
    return Object.values(PRODUCT_TYPE_TO_ROLE).filter((value, index, self) => self.indexOf(value) === index) as SlotRole[];
  }

  // Get unique roles that are possible for target slot across all compatible templates
  const allowedRoles = new Set<SlotRole>();
  compatibleTemplates.forEach(template => {
    allowedRoles.add(template.slots[targetSlotIndex]);
  });

  return Array.from(allowedRoles);
}

/**
 * Get product types allowed for a specific slot
 */
export function getAllowedProductTypesForSlot(
  filledSlots: (string | null)[],
  targetSlotIndex: number,
  slotCount: number
): string[] {
  const allowedRoles = getAllowedRolesForSlot(filledSlots, targetSlotIndex, slotCount);

  // Convert roles back to product types
  const productTypes: string[] = [];
  Object.entries(PRODUCT_TYPE_TO_ROLE).forEach(([productType, role]) => {
    if (allowedRoles.includes(role)) {
      productTypes.push(productType);
    }
  });

  return productTypes;
}

/**
 * Validate if an outfit matches any template
 */
export function validateOutfit(filledSlots: (string | null)[]): {
  isValid: boolean;
  matchingTemplates: OutfitTemplate[];
  errors: string[];
} {
  const errors: string[] = [];

  // Check if all slots are filled
  const hasEmpty = filledSlots.some(slot => !slot);
  if (hasEmpty) {
    errors.push('All slots must be filled');
  }

  // Convert to roles
  const roles = filledSlots.map(pt => pt ? getSlotRole(pt) : null);

  // Check for invalid combinations
  const hasOnePiece = roles.includes('One-Piece');
  const hasBaseTop = roles.includes('Base Top');
  const hasBottom = roles.includes('Bottom');

  if (hasOnePiece && (hasBaseTop || hasBottom)) {
    errors.push('Cannot have both One-Piece and Base Top/Bottom');
  }

  if (!roles.includes('Footwear')) {
    errors.push('Footwear is required');
  }

  // Find matching templates
  const matchingTemplates = findMatchingTemplates(filledSlots, filledSlots.length);

  if (matchingTemplates.length === 0 && !hasEmpty) {
    errors.push('This combination does not match any valid outfit template');
  }

  return {
    isValid: matchingTemplates.length > 0 && errors.length === 0,
    matchingTemplates,
    errors,
  };
}
