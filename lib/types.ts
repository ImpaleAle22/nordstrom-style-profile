/**
 * Type definitions for customer-facing app
 * Matches Supabase schema from style-profile migrations
 */

export interface CustomerProfile {
  customer_id: string;
  customer_name: string;
  email: string | null;
  gender: 'womenswear' | 'menswear' | 'all';

  // Style pillars (sum to 100)
  pillars: {
    [key: string]: number; // e.g., { minimal: 42, classic: 28, romantic: 13, ... }
  };

  // Brand affinity
  brand_affinity: Array<{
    brand: string;
    score: number;
    confidence: string;
    sources: string[];
    lastSignal: string;
  }>;

  // Price intelligence
  price_range: {
    low: number | null;
    high: number | null;
    sweet: number | null;
    confidence: string;
  };

  // Preferences
  fit_preferences: {
    liked: string[];
    disliked: string[];
  };

  fabric_preferences: {
    liked: string[];
    disliked: string[];
  };

  color_affinity: {
    [color: string]: number;
  };

  // Negatives
  negatives: Array<{
    type: string;
    value: string;
    strength: string;
    source: string;
    timestamp: string;
  }>;

  // Semantic memory
  semantic_memory: Array<{
    id: string;
    type: 'stated' | 'inferred' | 'life_context';
    text: string;
    source: string;
    weight: number;
    timestamp: string;
  }>;

  // Life context
  life_context: {
    hobbies: string[];
    family: string[];
    professional: string[];
    other: string[];
  };

  // Style personality
  style_personality: string | null;

  // Confidence & status
  confidence_score: number;
  sessions_processed: number;
  total_signals: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
}

export interface LifestyleImage {
  id: string;
  image_url: string;
  source: string;

  // Outfit analysis
  style_pillar: string;
  sub_term: string | null;
  spectrum_coordinate: number | null;
  pillar_confidence: number | null;

  // Vibes & occasions
  vibes: string[];
  occasions: string[];

  // Context
  formality_level: number | null;
  season: string[];
  gender: 'womenswear' | 'menswear';

  // Complete outfit details
  is_complete_outfit: boolean;
  visible_item_count: number | null;

  // Brand adherence
  brand_adherence_score: number | null;
  is_art_directed: boolean;
  image_tone: string | null;

  // Metadata
  tagged_at: string | null;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface SwipeStack {
  stack_id: string;
  title: string;
  description: string | null;

  // Classification
  stack_type: 'broadcast' | 'diagnostic' | 'deepening' | 'editorial';
  recipe_type: string;

  // Targeting
  target_gender: 'womenswear' | 'menswear';
  target_profile: string;
  min_swipes_required: number;

  // Card configuration
  card_count: number;
  card_type_mix: object;

  // Content strategy
  pillar_distribution: object | null;
  color_diversity: string | null;
  formality_spread: string | null;

  // Sequencing rules
  sequencing_rules: object | null;

  // Cards
  cards: SwipeCard[];

  // Signal capture config
  signal_config: object;

  // Status & metadata
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SwipeCard {
  cardType: 'lifestyle' | 'item' | 'outfit';
  cardId: string;
  imageId: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: string;
  tags: {
    pillars: string[];
    gender: string;
    subDimension: string | null;
    occasion: string | null;
    formality: number | null;
    colorFamily: string | null;
    category: string | null;
  };
  brandAdherenceScore: number;
  displayData: {
    title: string;
    backgroundColor: string;
    stackTitle: string;
  };
  position: number;
}

export interface SwipeSession {
  session_id: string;
  customer_id: string;
  stack_id: string;

  // Stack context
  stack_type: string;
  stack_recipe: string;

  // Completion status
  completed_at: string;
  completion_type: 'full' | 'abandoned';
  card_count: number;
  cards_viewed: number;

  // Cards (interaction data)
  cards: Array<{
    cardId: string;
    cardType: string;
    verdict: 'yes' | 'no';
    dwellMs: number;
    swipeVelocity: 'slow' | 'medium' | 'fast';
    saved: boolean;
    miniPdpOpened: boolean;
    tags: object;
  }>;

  // Session-level signals
  session_signals: object;

  // Reward actions
  reward_actions: object | null;

  // Metadata
  meta: object;

  // Customer department
  customer_department: string | null;

  // Timestamps
  created_at: string;
}

// ============================================================================
// ADMIN/RECIPE BUILDER TYPES
// ============================================================================

export interface Product {
  _id: string;
  title: string;
  brand: string;
  price: number;
  productId: string;
  primaryImageUrl?: string;
  department: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  productType4?: string;
  materials?: string[];
  dominantColors?: string[];
  simplifiedColors?: string[];
  vanityColor?: string;
  patterns?: string[];
  occasions?: string[];
  seasons?: string[];
  weatherContext?: string[];
  activityContext?: string[];
  silhouette?: string;
  sleeveStyle?: string;
  neckline?: string;
  heelStyle?: string;
  isOutfitEligible?: boolean;
}

export interface IngredientSet {
  _id: string;
  setId: string;
  displayTitle: string;
  query: string;
  theme?: string;
  department: string;
  productType1?: string;
  productType2?: string;
  brands?: string[];
  tags?: string[];
  season?: string;
  signal?: string;
  products: Product[];
  usedInRecipes?: number;
  basedOn?: string; // Reference to parent ingredient set (for variants)
}
