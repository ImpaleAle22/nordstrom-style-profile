/**
 * Product Type Mappings
 * Maps PT1 categories to their available PT2 subcategories
 */

export const PT1_TO_PT2_MAP: Record<string, string[]> = {
  Bags: [
    'All Bags',
    'Backpack',
    'Briefcase',
    'Clutch',
    'Computer Bag/Case',
    'Diaper Bag',
    'Crossbody',
    'Gym Bag',
    'Luggage/Bag Accessory',
    'Messenger Bag',
    'Tote',
    'Waist Bag',
  ],

  'Belts & Braces': [
    'Belts',
  ],

  Bottoms: [
    'All Bottoms',
    'Pant',
    'Short',
    'Skirt',
    'Skort',
    'Stirrup/Legging',
  ],

  Dresses: [
    'All Dresses',
    'Dress',
    'Gown',
    'Jumper',
  ],

  Eyewear: [
    'Eyewear Accessories',
    'Goggles',
    'Reading Glasses',
    'Sunglasses',
  ],

  'Gloves/Mittens': [
    'Gloves',
    'Mittens',
  ],

  Headwear: [
    'Cap',
    'Earmuffs',
    'Hat',
    'Helmet',
    'Visor',
  ],

  Hosiery: [
    'Socks',
  ],

  'Jacket/Sportcoat': [
    'Blazer',
    'Bolero',
    'Jacket',
    'Sportcoat',
    'Vest',
  ],

  Jewelry: [
    'Bracelet',
    'Cufflink',
    'Earring',
    'Necklace',
    'Ring',
    'Tie Clip',
    'Watch',
  ],

  'Jumpsuits/Coveralls': [
    'Coverall',
    'Jumpsuit/Romper',
    'Onesie',
    'Overall/Shortall',
  ],

  Neckwear: [
    'Bow Ties',
    'Long Ties',
    'Pocket Squares',
    'Tie',
  ],

  Outerwear: [
    '3/4 or Long Coat',
    'Anorak/Parka',
    'Blazer',
    'Jacket/Coat',
    'Poncho/Cape',
    'Raincoat',
    'Short Jacket/Coat',
    'Snowpant',
    'Snowsuit',
    'Vest',
  ],

  'Scarves/Wraps/Ponchos': [
    'Bandana',
    'Poncho/Cape',
    'Scarves',
    'Wraps',
  ],

  Shoes: [
    'Aquatic',
    'Athletic',
    'Boots',
    'Clogs',
    'Flats',
    'Galoshes/Overshoes',
    'Loafers',
    'Mule',
    'Oxfords',
    'Pumps',
    'Sandals/Slides',
    'Slip On',
    'Slippers',
    'Sneaker',
  ],

  Sleepwear: [
    'Bottom',
    'Nightgown',
    'Pajama Bottom',
    'Pajama Set',
    'Pajama Top',
    'Robe',
    'Set',
    'Sleeper',
    'Top',
  ],

  'Small Leather Goods': [
    'Wallets',
  ],

  'Suits/Sets/Wardrobers': [
    'Pant Set',
    'Skirt Set',
    'Sweatsuit/Warm-ups',
    'Tailored Suit',
    'Tuxedo',
  ],

  Swimwear: [
    'Accessories',
    'Cover-up',
    'Pareo/Sarong',
    'Swim Bottom',
    'Swim Top',
    'Swim Trunk',
    'Swimsuit (complete)',
  ],

  Tops: [
    'Blouse/Top',
    'Dress-shirt',
    'Polo',
    'Shirt',
    'Shirtjacket',
    'Sports Jersey',
    'Sportshirt',
    'Sweater',
    'Sweatshirt',
    'Sweatshirt/Hoody/Zipfront',
    'T-shirt/Tee',
    'Tank/Cami/Shell',
    'Tunic',
  ],

  'Underwear/Lingerie': [
    'Camisole',
  ],
};

/**
 * Get PT2 options for a given PT1 category
 */
export function getPT2Options(pt1Category: string): string[] {
  return PT1_TO_PT2_MAP[pt1Category] || [];
}
