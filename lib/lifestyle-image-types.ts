/**
 * Lifestyle Image Scanning Types
 * System 3: Gestalt aesthetic analysis for customer-facing style features
 */

export type ImageSource =
  | 'stock-pexels'
  | 'stock-unsplash'
  | 'product-lifestyle'
  | 'nordstrom-asset';

export type StylePillar =
  | 'Classic' | 'Minimal' | 'Romantic' | 'Bohemian' | 'Maximal'
  | 'Streetwear' | 'Utility' | 'Athletic' | 'Casual';

export type Gender = 'womenswear' | 'menswear' | 'unisex';

export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';

export type DisqualifyingReason =
  | 'no_person_visible'
  | 'explicit_or_inappropriate'
  | 'non_fashion_content'
  | 'image_too_small_or_corrupt'
  | 'incomplete_outfit'
  | 'low_pillar_confidence'
  | 'cluttered_composition'
  | 'non_retail_aesthetic';

export type ScanStatus = 'pending' | 'scanning' | 'complete' | 'scan_error';

export interface OutfitAnalysis {
  stylePillar: StylePillar;
  subTerm: string | null;
  spectrumCoordinate: number;   // 0.0–8.8, one decimal place
  pillarConfidence: number;     // 0.0–1.0
  vibes: string[];              // 1–3 from canonical list
  occasions: string[];          // 1–4 from canonical list
  formalityLevel: number;       // 1.0–10.0
  season: Season[];
  gender: Gender;
  isCompleteOutfit: boolean;
  visibleItemCount: number;
  reasoning: string;
}

export interface DisplaySuitability {
  styleProfileReady: boolean;
  styleQuizReady: boolean;
  styleSwipeReady: boolean;
  qualityScore: number;         // 0.0–1.0
  disqualifyingReasons: DisqualifyingReason[];
}

export type BackgroundType = 'studio-clean' | 'color-flood' | 'lifestyle-controlled' | 'lifestyle-chaotic' | 'product-only';
export type ImageTone = 'warm' | 'neutral' | 'cool' | 'mixed';

export interface BrandAdherence {
  score: number;                // 0-100 (Nordstrom brand alignment ranking signal)
  reasoning: string;            // 2-3 sentences explaining score using brand language
  hasHumanSubject: boolean;
  backgroundType: BackgroundType;
  imageTone: ImageTone;
  isArtDirected: boolean;       // Key filter: deliberate visual decisions
}

export interface LifestyleImage {
  imageId: string;
  source: ImageSource;
  imageUrl: string;
  outfitAnalysis: OutfitAnalysis;
  displaySuitability: DisplaySuitability;
  brandAdherence: BrandAdherence;
  recipeGenerationCandidate: boolean;
  taggedAt: string;             // ISO 8601 UTC
  status: ScanStatus;
  _legacyTag?: Record<string, unknown>; // archived from old marker-count format
}

// Partial type for images not yet scanned
export interface LifestyleImageRecord extends Partial<LifestyleImage> {
  imageId: string;
  imageUrl: string;
  source: ImageSource;
  status: ScanStatus;
  addedAt: string;
}

// Stats for dashboard/library
export interface LifestyleImageStats {
  total: number;
  byPillar: Record<string, number>;
  byStatus: Record<string, number>;
  styleProfileReady: number;
  styleQuizReady: number;
  styleSwipeReady: number;
}

// Pillar metadata for UI display
export interface PillarMetadata {
  name: StylePillar;
  color: string;
  anchorValue: number;
}

export const PILLAR_METADATA: PillarMetadata[] = [
  { name: 'Classic', color: '#2C5F2D', anchorValue: 0.0 },
  { name: 'Minimal', color: '#4A4A4A', anchorValue: 1.0 },
  { name: 'Romantic', color: '#D4A5A5', anchorValue: 2.0 },
  { name: 'Bohemian', color: '#B8860B', anchorValue: 3.0 },
  { name: 'Maximal', color: '#FF6B6B', anchorValue: 4.0 },
  { name: 'Streetwear', color: '#1A1A1A', anchorValue: 5.0 },
  { name: 'Utility', color: '#556B2F', anchorValue: 6.0 },
  { name: 'Athletic', color: '#4169E1', anchorValue: 7.0 },
  { name: 'Casual', color: '#8B7355', anchorValue: 8.0 },
];

export const CANONICAL_VIBES = [
  'Fresh', 'Bold', 'Confident', 'Understated', 'Playful', 'Dreamy',
  'Edgy', 'Polished', 'Relaxed', 'Effortless', 'Romantic', 'Dramatic',
  'Earthy', 'Vibrant', 'Mysterious', 'Minimal', 'Luxe', 'Sporty',
  'Intellectual', 'Whimsical', 'Nostalgic', 'Coastal', 'Maximalist',
  'Urban', 'Wanderlust', 'Artsy', 'Sophisticated', 'Timeless'
];

export const CANONICAL_OCCASIONS = [
  'Everyday Casual', 'Brunch', 'Date Night', 'Girls Night Out', 'Casual Dinner',
  'Work From Home', 'Office Casual', 'Business Professional', 'Business Meeting',
  'Wedding Guest', 'Cocktail Party', 'Black Tie', 'Graduation', 'Baby Shower',
  'Beach', 'Pool', 'Vacation', 'Resort', 'Festival', 'Concert', 'Farmers Market',
  'Hiking', 'Running', 'Gym', 'Yoga', 'Golf', 'Tennis', 'Ski', 'Snowboard',
  'Travel', 'City Exploring', 'Weekend Errands', 'School', 'Night Out'
];
