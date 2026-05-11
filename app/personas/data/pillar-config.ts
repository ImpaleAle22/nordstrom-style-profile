/**
 * Style Pillar Configuration
 * Images, descriptions, and tags for each pillar
 */

export interface PillarConfig {
  name: string;
  displayName: string;
  description: string;
  tags: string[];
  color: string;
}

// NOTE: Only canonical pillars should be configured here
// "edgy", "sporty", "fashionForward" are NOT canonical pillars
// They are mapped to canonical pillars via pillar-normalization.ts

export const PILLAR_CONFIGS: Record<string, PillarConfig> = {
  classic: {
    name: 'classic',
    displayName: 'Classic',
    description: 'Timeless, polished pieces that transcend seasons',
    tags: ['Tailored', 'Sophisticated', 'Timeless'],
    color: '#1a1a2e',
  },
  romantic: {
    name: 'romantic',
    displayName: 'Romantic',
    description: 'Soft, feminine details with flowing silhouettes',
    tags: ['Delicate', 'Feminine', 'Flowing'],
    color: '#ffc2d1',
  },
  minimal: {
    name: 'minimal',
    displayName: 'Minimal',
    description: 'Clean lines and understated elegance',
    tags: ['Understated', 'Sleek', 'Modern'],
    color: '#000000',
  },
  bohemian: {
    name: 'bohemian',
    displayName: 'Bohemian',
    description: 'Free-spirited and artistic with eclectic flair',
    tags: ['Artistic', 'Free-spirited', 'Eclectic'],
    color: '#c19a6b',
  },
  casual: {
    name: 'casual',
    displayName: 'Casual',
    description: 'Comfortable, effortless everyday wear',
    tags: ['Relaxed', 'Versatile', 'Easy'],
    color: '#8B7355',
  },
  athletic: {
    name: 'athletic',
    displayName: 'Athletic',
    description: 'Performance-driven activewear and sportswear',
    tags: ['Functional', 'Active', 'Performance'],
    color: '#2ecc71',
  },
  utility: {
    name: 'utility',
    displayName: 'Utility',
    description: 'Practical pieces with functional details',
    tags: ['Functional', 'Structured', 'Practical'],
    color: '#95a5a6',
  },
  maximal: {
    name: 'maximal',
    displayName: 'Maximal',
    description: 'Bold statements with vibrant patterns',
    tags: ['Bold', 'Statement', 'Vibrant'],
    color: '#e74c3c',
  },
  streetwear: {
    name: 'streetwear',
    displayName: 'Streetwear',
    description: 'Urban, culturally-coded, attitude-driven style',
    tags: ['Urban', 'Edgy', 'Contemporary'],
    color: '#1A1A1A',
  },
};

export function getPillarConfig(pillarName: string): PillarConfig {
  const normalized = pillarName.toLowerCase();
  return PILLAR_CONFIGS[normalized] || {
    name: normalized,
    displayName: pillarName,
    description: 'Unique style expression',
    tags: ['Distinctive'],
    color: '#666666',
  };
}

export function getTopPillars(pillars: Record<string, number>, count: number = 3) {
  return Object.entries(pillars)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, count)
    .map(([name, weight]) => ({
      ...getPillarConfig(name),
      weight: weight as number,
    }));
}
