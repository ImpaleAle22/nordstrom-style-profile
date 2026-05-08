/**
 * Style Pillar Configuration
 * Images, descriptions, and tags for each pillar
 */

export interface PillarConfig {
  name: string;
  displayName: string;
  description: string;
  tags: string[];
  imageUrl: string;
  color: string;
}

export const PILLAR_CONFIGS: Record<string, PillarConfig> = {
  classic: {
    name: 'classic',
    displayName: 'Classic',
    description: 'Timeless, polished pieces that transcend seasons',
    tags: ['Tailored', 'Sophisticated', 'Timeless'],
    imageUrl: 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=800&q=80',
    color: '#1a1a2e',
  },
  romantic: {
    name: 'romantic',
    displayName: 'Romantic',
    description: 'Soft, feminine details with flowing silhouettes',
    tags: ['Delicate', 'Feminine', 'Flowing'],
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
    color: '#ffc2d1',
  },
  minimal: {
    name: 'minimal',
    displayName: 'Minimal',
    description: 'Clean lines and understated elegance',
    tags: ['Understated', 'Sleek', 'Modern'],
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    color: '#000000',
  },
  edgy: {
    name: 'edgy',
    displayName: 'Edgy',
    description: 'Bold statements with unexpected elements',
    tags: ['Bold', 'Unexpected', 'Statement'],
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
    color: '#333333',
  },
  bohemian: {
    name: 'bohemian',
    displayName: 'Bohemian',
    description: 'Free-spirited and artistic with eclectic flair',
    tags: ['Artistic', 'Free-spirited', 'Eclectic'],
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    color: '#c19a6b',
  },
  sporty: {
    name: 'sporty',
    displayName: 'Sporty',
    description: 'Athletic-inspired comfort meets style',
    tags: ['Athletic', 'Comfortable', 'Active'],
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    color: '#4a90e2',
  },
  casual: {
    name: 'casual',
    displayName: 'Casual',
    description: 'Comfortable, effortless everyday wear',
    tags: ['Relaxed', 'Versatile', 'Easy'],
    imageUrl: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=800&q=80',
    color: '#3498db',
  },
  athletic: {
    name: 'athletic',
    displayName: 'Athletic',
    description: 'Performance-driven activewear and sportswear',
    tags: ['Functional', 'Active', 'Performance'],
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    color: '#2ecc71',
  },
  utility: {
    name: 'utility',
    displayName: 'Utility',
    description: 'Practical pieces with functional details',
    tags: ['Functional', 'Structured', 'Practical'],
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80',
    color: '#95a5a6',
  },
  maximal: {
    name: 'maximal',
    displayName: 'Maximal',
    description: 'Bold statements with vibrant patterns',
    tags: ['Bold', 'Statement', 'Vibrant'],
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    color: '#e74c3c',
  },
  fashionForward: {
    name: 'fashionForward',
    displayName: 'Fashion Forward',
    description: 'Trend-led, contemporary edge',
    tags: ['Trendy', 'Contemporary', 'Editorial'],
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
    color: '#9b59b6',
  },
};

export function getPillarConfig(pillarName: string): PillarConfig {
  const normalized = pillarName.toLowerCase();
  return PILLAR_CONFIGS[normalized] || {
    name: normalized,
    displayName: pillarName,
    description: 'Unique style expression',
    tags: ['Distinctive'],
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
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
