// Product type definitions for outfit recipe slot configuration
// These represent the types of products that can be selected for each slot

export interface ProductTypeOption {
  id: string;
  label: string;
  category: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'dresses';
}

export const productTypeOptions: ProductTypeOption[] = [
  // Tops
  { id: 'blouse', label: 'Blouse', category: 'tops' },
  { id: 't-shirt', label: 'T-Shirt', category: 'tops' },
  { id: 'tank-top', label: 'Tank Top', category: 'tops' },
  { id: 'sweater', label: 'Sweater', category: 'tops' },
  { id: 'cardigan', label: 'Cardigan', category: 'tops' },
  { id: 'button-down', label: 'Button-Down Shirt', category: 'tops' },
  { id: 'polo', label: 'Polo Shirt', category: 'tops' },

  // Bottoms
  { id: 'jeans', label: 'Jeans', category: 'bottoms' },
  { id: 'trousers', label: 'Trousers', category: 'bottoms' },
  { id: 'shorts', label: 'Shorts', category: 'bottoms' },
  { id: 'skirt', label: 'Skirt', category: 'bottoms' },
  { id: 'leggings', label: 'Leggings', category: 'bottoms' },

  // Outerwear
  { id: 'blazer', label: 'Blazer', category: 'outerwear' },
  { id: 'jacket', label: 'Jacket', category: 'outerwear' },
  { id: 'coat', label: 'Coat', category: 'outerwear' },
  { id: 'vest', label: 'Vest', category: 'outerwear' },

  // Shoes
  { id: 'sneakers', label: 'Sneakers', category: 'shoes' },
  { id: 'boots', label: 'Boots', category: 'shoes' },
  { id: 'loafers', label: 'Loafers', category: 'shoes' },
  { id: 'flats', label: 'Flats', category: 'shoes' },
  { id: 'heels', label: 'Heels', category: 'shoes' },
  { id: 'sandals', label: 'Sandals', category: 'shoes' },

  // Accessories
  { id: 'bag', label: 'Bag', category: 'accessories' },
  { id: 'jewelry', label: 'Jewelry', category: 'accessories' },
  { id: 'belt', label: 'Belt', category: 'accessories' },
  { id: 'scarf', label: 'Scarf', category: 'accessories' },
  { id: 'hat', label: 'Hat', category: 'accessories' },
  { id: 'sunglasses', label: 'Sunglasses', category: 'accessories' },

  // Dresses
  { id: 'dress', label: 'Dress', category: 'dresses' },
  { id: 'jumpsuit', label: 'Jumpsuit', category: 'dresses' },
];

export const productTypeCategories = [
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'dresses', label: 'Dresses & Jumpsuits' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'accessories', label: 'Accessories' },
] as const;

// Helper function to get product types by category
export function getProductTypesByCategory(category: string): ProductTypeOption[] {
  return productTypeOptions.filter((type) => type.category === category);
}

// Helper function to get product type label by id
export function getProductTypeLabel(id: string): string {
  const type = productTypeOptions.find((t) => t.id === id);
  return type?.label || id;
}
