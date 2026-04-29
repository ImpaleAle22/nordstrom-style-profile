/**
 * Axis Signal Tables
 *
 * Keyword/attribute → axis value mappings for the rules layer.
 * These tables are the foundation of the rules-based tagging system.
 *
 * No functions here - only exported constant data.
 */

import type { ActivityContext, Season, SocialRegister } from './axis-types';

// ============================================================================
// FORMALITY SIGNALS
// ============================================================================

/**
 * Formality Signals - Keywords that push formality score up or down
 *
 * Base formality comes from outfit.scoreBreakdown.occasionAlignment:
 *   formality = (occasionAlignment / 100) * 5 + 1
 *
 * These keywords adjust the base score up or down.
 */
export const FORMALITY_SIGNALS = {
  // Keywords that push formality UP
  high: [
    { keywords: ['tuxedo', 'tux', 'tailcoat'], weight: 2.0 },
    { keywords: ['gown', 'ball gown', 'ballgown', 'evening gown'], weight: 1.8 },
    { keywords: ['cocktail dress'], weight: 1.5 },
    { keywords: ['blazer', 'sport coat', 'sport jacket', 'suit jacket'], weight: 1.2 },
    { keywords: ['suit', 'three-piece'], weight: 1.3 },
    { keywords: ['dress shirt', 'oxford shirt', 'button-down', 'dress blouse'], weight: 1.0 },
    { keywords: ['trousers', 'dress pants', 'slacks'], weight: 1.0 },
    { keywords: ['heels', 'pumps', 'stiletto', 'kitten heel', 'high heel'], weight: 1.0 },
    { keywords: ['loafers', 'oxfords', 'derby', 'brogues', 'dress shoes', 'monk strap'], weight: 0.8 },
    { keywords: ['midi dress', 'maxi dress', 'sheath dress'], weight: 0.6 },
    { keywords: ['pencil skirt', 'a-line skirt'], weight: 0.7 },
    { keywords: ['blouse', 'silk shirt'], weight: 0.5 },
    { keywords: ['chinos', 'khakis'], weight: 0.3 },
    { keywords: ['tie', 'bow tie', 'necktie', 'pocket square'], weight: 0.8 },
    { keywords: ['vest', 'waistcoat'], weight: 0.6 },
  ],

  // Keywords that push formality DOWN
  low: [
    { keywords: ['joggers', 'sweatpants', 'track pants'], weight: 2.0 },
    { keywords: ['hoodie', 'sweatshirt', 'pullover hoodie'], weight: 1.5 },
    { keywords: ['sneakers', 'trainers', 'tennis shoes', 'running shoes'], weight: 1.0 },
    { keywords: ['t-shirt', 'tee', 'graphic tee', 'tank top', 'cami'], weight: 1.0 },
    { keywords: ['shorts', 'athletic shorts', 'gym shorts'], weight: 0.8 },
    { keywords: ['sandals', 'flip flops', 'flip-flops', 'slides'], weight: 0.8 },
    { keywords: ['leggings', 'yoga pants'], weight: 1.2 },
    { keywords: ['cargo pants', 'cargo shorts', 'cargo'], weight: 0.5 },
    { keywords: ['jeans', 'denim'], weight: 0.3 }, // Mild - jeans span a wide range
    { keywords: ['baseball cap', 'beanie', 'snapback'], weight: 0.7 },
    { keywords: ['athletic', 'sportswear', 'activewear'], weight: 0.9 },
    { keywords: ['casual', 'relaxed'], weight: 0.2 }, // Very mild indicator
  ],
};

// ============================================================================
// ACTIVITY CONTEXT SIGNALS
// ============================================================================

/**
 * Activity Context Signals - Keywords for each of the 6 activity contexts
 *
 * Scoring:
 * - strong: any match = +2 points for this context
 * - weak: any match = +1 point (supporting signal)
 * - excludes: any match = this context is eliminated
 */
export const ACTIVITY_CONTEXT_SIGNALS: Record<ActivityContext, {
  strong: string[];
  weak: string[];
  excludes: string[];
}> = {
  'active': {
    strong: [
      'leggings', 'sports bra', 'athletic', 'running', 'workout', 'gym',
      'yoga', 'cycling', 'tennis', 'hiking boots', 'trail', 'performance',
      'activewear', 'sportswear', 'track', 'training', 'jogging', 'athletic shorts'
    ],
    weak: [
      'sneakers', 'shorts', 'hoodie', 'sweatshirt', 'tank top', 'moisture-wicking'
    ],
    excludes: [
      'blazer', 'heels', 'dress pants', 'gown', 'suit', 'cocktail dress',
      'dress shirt', 'oxford', 'trousers'
    ],
  },

  'casual-low-key': {
    strong: [
      'loungewear', 'pajamas', 'sleepwear', 'sweats', 'sweatpants', 'joggers',
      'slippers', 'oversized hoodie', 'cozy', 'comfy', 'relaxed fit'
    ],
    weak: [
      't-shirt', 'sweatshirt', 'leggings', 'sneakers', 'sandals', 'slides',
      'casual', 'weekend'
    ],
    excludes: [
      'blazer', 'heels', 'dress', 'trousers', 'suit', 'formal', 'dress shirt',
      'cocktail', 'gown'
    ],
  },

  'social-daytime': {
    strong: [
      'sundress', 'casual dress', 'day dress', 'midi skirt', 'floral',
      'brunch', 'daytime', 'casual', 'light'
    ],
    weak: [
      'jeans', 'sneakers', 'blouse', 'sandals', 'chinos', 'casual shirt',
      'polo', 'espadrilles', 'loafers', 'flats'
    ],
    excludes: [
      'loungewear', 'athletic', 'tuxedo', 'gown', 'evening gown', 'pajamas',
      'sweatpants', 'joggers'
    ],
  },

  'social-evening': {
    strong: [
      'going-out top', 'party dress', 'cocktail dress', 'evening', 'sequin',
      'satin', 'silk', 'velvet', 'metallic', 'statement', 'dressy'
    ],
    weak: [
      'heels', 'dark jeans', 'blazer', 'midi dress', 'dress shoes', 'clutch',
      'bold', 'elevated'
    ],
    excludes: [
      'sneakers', 'athletic', 'loungewear', 'joggers', 'sweatpants', 'gym',
      'workout', 't-shirt'
    ],
  },

  'professional': {
    strong: [
      'blazer', 'suit', 'dress pants', 'trousers', 'oxford shirt', 'dress shirt',
      'pencil skirt', 'professional', 'business', 'office', 'work', 'career'
    ],
    weak: [
      'chinos', 'loafers', 'blouse', 'button-down', 'dress shoes', 'pumps',
      'tailored', 'structured'
    ],
    excludes: [
      'sneakers', 'athletic', 'loungewear', 'shorts', 'graphic tee', 'sandals',
      'flip flops', 'joggers', 'sweatpants'
    ],
  },

  'event': {
    strong: [
      'tuxedo', 'gown', 'ballgown', 'cocktail dress', 'formal dress', 'evening gown',
      'suit', 'formal', 'black tie', 'wedding', 'party', 'celebration', 'gala'
    ],
    weak: [
      'heels', 'blazer', 'midi dress', 'dress shoes', 'statement', 'elegant',
      'embellished', 'sequin'
    ],
    excludes: [
      'sneakers', 'athletic', 'loungewear', 'jeans', 'shorts', 't-shirt',
      'casual', 'joggers'
    ],
  },
};

// ============================================================================
// SEASON SIGNALS
// ============================================================================

/**
 * Season Signals - Keywords and vision scan attributes for season detection
 *
 * Priority: Check vision scan fabricWeight/drape first (if available),
 * then fall back to keyword matching.
 */
export const SEASON_SIGNALS: Record<Season, {
  fabricKeywords: string[];
  garmentKeywords: string[];
  footwearKeywords: string[];
  colorKeywords: string[];
  fabricWeightValues?: string[]; // Vision scan field mapping
}> = {
  'summer': {
    fabricKeywords: [
      'linen', 'cotton', 'chambray', 'seersucker', 'eyelet', 'gauze',
      'voile', 'lightweight', 'breathable', 'airy'
    ],
    garmentKeywords: [
      'tank', 'cami', 'sleeveless', 'shorts', 'mini dress', 'sundress',
      'crop top', 'short sleeve', 'halter', 'strapless', 'off-shoulder'
    ],
    footwearKeywords: [
      'sandals', 'flip flops', 'slides', 'espadrilles', 'open-toe',
      'canvas sneakers'
    ],
    colorKeywords: [
      'white', 'cream', 'yellow', 'coral', 'turquoise', 'bright',
      'pastel', 'light'
    ],
    fabricWeightValues: ['lightweight', 'very lightweight'],
  },

  'winter': {
    fabricKeywords: [
      'wool', 'cashmere', 'fleece', 'sherpa', 'quilted', 'down', 'insulated',
      'faux fur', 'corduroy', 'velvet', 'knit', 'cable knit', 'heavy knit',
      'flannel', 'tweed', 'mohair'
    ],
    garmentKeywords: [
      'coat', 'puffer', 'parka', 'turtleneck', 'sweater', 'cardigan',
      'thermal', 'scarf', 'gloves', 'beanie', 'long sleeve', 'turtleneck',
      'overcoat', 'peacoat', 'trench coat'
    ],
    footwearKeywords: [
      'boots', 'snow boots', 'ugg', 'lined', 'ankle boots', 'knee-high boots',
      'combat boots', 'winter boots', 'insulated'
    ],
    colorKeywords: [
      'burgundy', 'forest green', 'camel', 'charcoal', 'navy', 'black',
      'dark', 'deep', 'rich'
    ],
    fabricWeightValues: ['heavyweight', 'very heavyweight'],
  },

  'spring': {
    fabricKeywords: [
      'cotton', 'light knit', 'linen blend', 'rayon', 'jersey', 'chambray',
      'denim', 'poplin'
    ],
    garmentKeywords: [
      'light jacket', 'trench', 'windbreaker', 'floral', 'midi skirt',
      'blazer', 'transitional', 'layering', 'cardigan', 'long sleeve',
      'cropped jacket'
    ],
    footwearKeywords: [
      'loafers', 'sneakers', 'mules', 'low boots', 'ankle boots',
      'flats', 'slip-ons'
    ],
    colorKeywords: [
      'blush', 'lavender', 'mint', 'sage', 'floral', 'pastel',
      'light pink', 'baby blue', 'soft'
    ],
    fabricWeightValues: ['lightweight', 'medium weight'],
  },

  'fall': {
    fabricKeywords: [
      'wool blend', 'knit', 'suede', 'leather', 'denim', 'flannel',
      'tweed', 'corduroy', 'ponte', 'jersey', 'cable knit'
    ],
    garmentKeywords: [
      'sweater', 'cardigan', 'jacket', 'vest', 'long sleeve', 'layer',
      'layered', 'blazer', 'coat', 'hoodie'
    ],
    footwearKeywords: [
      'ankle boots', 'chelsea boots', 'knee-high boots', 'loafers',
      'boots', 'booties', 'oxfords'
    ],
    colorKeywords: [
      'rust', 'burnt orange', 'olive', 'camel', 'brown', 'plaid',
      'mustard', 'burgundy', 'earth tones', 'warm'
    ],
    fabricWeightValues: ['medium weight', 'medium-heavy'],
  },

  'all-season': {
    fabricKeywords: [
      'jersey', 'ponte', 'crepe', 'silk blend', 'modal', 'rayon blend',
      'polyester blend'
    ],
    garmentKeywords: [
      'classic', 'neutral', 'simple', 'basic', 'timeless', 'versatile',
      'layering piece'
    ],
    footwearKeywords: [
      'sneakers', 'loafers', 'flats', 'low boots'
    ],
    colorKeywords: [
      'black', 'navy', 'grey', 'gray', 'white', 'nude', 'beige', 'neutral'
    ],
    fabricWeightValues: ['medium weight'],
  },
};

/**
 * Additional season signals from outfit structure
 * (checked separately in rules layer):
 *
 * - Outerwear slot present → strong fall/winter signal
 * - Open footwear present (sandals/slides) → strong summer signal
 * - Sleeveless items → summer signal
 * - Heavy layering (3+ layers) → fall/winter signal
 */

// ============================================================================
// SOCIAL REGISTER SIGNALS
// ============================================================================

/**
 * Social Register Signals - Keywords + formality ranges for each register
 *
 * Social register is the HARDEST axis for rules - low confidence ceiling.
 * Most outfits will escalate to AI for this axis.
 */
export const SOCIAL_REGISTER_SIGNALS: Record<SocialRegister, {
  strong: string[];
  weak: string[];
  formality?: { min?: number; max?: number };
}> = {
  'intimate': {
    strong: [
      'loungewear', 'pajamas', 'robe', 'cozy', 'oversized', 'relaxed',
      'comfortable', 'casual', 'at-home'
    ],
    weak: [
      'soft', 'easy', 'effortless', 'weekend'
    ],
    formality: { max: 3.0 },
  },

  'peer-social': {
    strong: [
      'jeans', 'casual dress', 'sundress', 'going-out', 'date', 'brunch',
      'coffee', 'casual', 'social', 'friends'
    ],
    weak: [
      'blouse', 'sneakers', 'midi skirt', 'casual shirt', 'relaxed'
    ],
    formality: { min: 2.0, max: 4.5 },
  },

  'evaluative': {
    strong: [
      'interview', 'formal', 'suit', 'professional', 'polished',
      'first date', 'meeting', 'important'
    ],
    weak: [
      'blazer', 'dress shirt', 'trousers', 'heels', 'dress shoes',
      'tailored', 'structured', 'dressy'
    ],
    formality: { min: 4.0 },
  },

  'public-facing': {
    strong: [
      'blazer', 'suit', 'dress pants', 'oxford', 'business', 'office',
      'work', 'professional', 'career', 'corporate'
    ],
    weak: [
      'chinos', 'loafers', 'blouse', 'button-down', 'dress shirt',
      'pencil skirt', 'work-appropriate'
    ],
    formality: { min: 3.5, max: 5.5 },
  },

  'celebratory': {
    strong: [
      'gown', 'tuxedo', 'cocktail dress', 'sequin', 'formal dress',
      'evening gown', 'wedding', 'party', 'celebration', 'gala',
      'black tie', 'formal event'
    ],
    weak: [
      'heels', 'midi dress', 'satin', 'elegant', 'dressy', 'festive',
      'statement', 'embellished'
    ],
    formality: { min: 4.5 },
  },
};
