import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface CoverageMatrix {
  pillar: string;
  women: number;
  men: number;
  total: number;
  gap: number; // target - current
  priority: 'high' | 'medium' | 'low';
}

export const PILLARS = [
  'romantic',
  'classic',
  'casual',
  'dramatic',
  'creative',
  'alluring',
  'modern',
  'natural',
  'timeless'
];

// Query templates for each pillar and gender combination
const QUERY_TEMPLATES: Record<string, { womenswear: string[], menswear: string[] }> = {
  romantic: {
    womenswear: [
      'romantic fashion woman portrait white background',
      'feminine elegant dress studio clean',
      'delicate floral outfit simple background',
      'soft pastel fashion woman minimal',
      'lace dress portrait white backdrop'
    ],
    menswear: [
      'elegant men fashion portrait clean background',
      'soft tailored men fashion minimal',
      'refined gentleman style white background'
    ]
  },
  classic: {
    womenswear: [
      'classic fashion woman portrait white background',
      'timeless elegant woman studio clean',
      'tailored blazer woman minimal background',
      'sophisticated woman fashion simple backdrop',
      'structured outfit woman white background'
    ],
    menswear: [
      'classic men suit portrait white background',
      'tailored menswear studio clean',
      'traditional suit man minimal background',
      'formal business man white backdrop',
      'structured menswear portrait simple'
    ]
  },
  casual: {
    womenswear: [
      'casual fashion woman portrait white background',
      'relaxed comfortable outfit woman studio',
      'everyday fashion woman minimal background',
      'jeans tshirt woman simple backdrop',
      'laid back style woman white background'
    ],
    menswear: [
      'casual men fashion portrait white background',
      'relaxed menswear studio clean',
      'everyday outfit man minimal background',
      'jeans shirt man simple backdrop',
      'comfortable menswear white background'
    ]
  },
  dramatic: {
    womenswear: [
      'dramatic fashion woman portrait white background',
      'bold statement outfit woman studio',
      'edgy fashion woman minimal background',
      'striking outfit woman simple backdrop',
      'avant garde fashion woman white background'
    ],
    menswear: [
      'dramatic menswear portrait white background',
      'bold fashion man studio clean',
      'edgy outfit man minimal background',
      'striking menswear simple backdrop',
      'statement fashion man white background'
    ]
  },
  creative: {
    womenswear: [
      'creative fashion woman portrait white background',
      'artistic outfit woman studio clean',
      'eclectic fashion woman minimal background',
      'unique style woman simple backdrop',
      'bohemian fashion woman white background'
    ],
    menswear: [
      'creative menswear portrait white background',
      'artistic fashion man studio clean',
      'eclectic outfit man minimal background',
      'unique menswear simple backdrop',
      'bohemian style man white background'
    ]
  },
  alluring: {
    womenswear: [
      'alluring fashion woman portrait white background',
      'elegant evening dress woman studio',
      'sophisticated cocktail outfit woman minimal',
      'glamorous fashion woman simple backdrop',
      'chic evening wear woman white background'
    ],
    menswear: [
      'alluring menswear portrait white background',
      'sophisticated evening suit man studio',
      'elegant formal wear man minimal background',
      'polished menswear simple backdrop',
      'refined evening outfit man white background'
    ]
  },
  modern: {
    womenswear: [
      'modern fashion woman portrait white background',
      'contemporary outfit woman studio clean',
      'sleek fashion woman minimal background',
      'minimalist style woman simple backdrop',
      'urban chic woman white background'
    ],
    menswear: [
      'modern menswear portrait white background',
      'contemporary fashion man studio clean',
      'sleek outfit man minimal background',
      'minimalist menswear simple backdrop',
      'urban style man white background'
    ]
  },
  natural: {
    womenswear: [
      'natural fashion woman portrait white background',
      'organic style outfit woman studio',
      'earthy fashion woman minimal background',
      'relaxed natural look woman simple backdrop',
      'sustainable fashion woman white background'
    ],
    menswear: [
      'natural menswear portrait white background',
      'organic style man studio clean',
      'earthy fashion man minimal background',
      'relaxed natural outfit man simple backdrop',
      'sustainable menswear white background'
    ]
  },
  timeless: {
    womenswear: [
      'timeless fashion woman portrait white background',
      'elegant classic outfit woman studio',
      'enduring style woman minimal background',
      'sophisticated timeless look woman simple backdrop',
      'refined fashion woman white background'
    ],
    menswear: [
      'timeless menswear portrait white background',
      'classic elegant suit man studio',
      'enduring style man minimal background',
      'sophisticated timeless outfit man simple backdrop',
      'refined menswear white background'
    ]
  }
};

/**
 * Calculate coverage statistics for each pillar by gender
 */
export async function calculateCoverage(): Promise<CoverageMatrix[]> {
  try {
    const { data: images, error } = await supabase
      .from('lifestyle_images')
      .select('style_pillar, gender, status')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching lifestyle images:', error);
      throw error;
    }

    if (!images || images.length === 0) {
      // Return empty matrix if no images exist
      return PILLARS.map(pillar => ({
        pillar,
        women: 0,
        men: 0,
        total: 0,
        gap: 40, // target: 20W + 20M = 40 per pillar
        priority: 'high' as const
      }));
    }

    const matrix = PILLARS.map(pillar => {
      const pillarImages = images.filter(img => img.style_pillar === pillar);
      const women = pillarImages.filter(img => img.gender === 'womenswear').length;
      const men = pillarImages.filter(img => img.gender === 'menswear').length;
      const total = pillarImages.length;
      const gap = 40 - total; // target: 20W + 20M = 40 per pillar

      return {
        pillar,
        women,
        men,
        total,
        gap,
        priority: gap > 30 ? 'high' as const : gap > 15 ? 'medium' as const : 'low' as const
      };
    });

    // Sort by gap (highest first)
    return matrix.sort((a, b) => b.gap - a.gap);
  } catch (error) {
    console.error('Error calculating coverage:', error);
    throw error;
  }
}

/**
 * Generate search queries to fill coverage gaps
 */
export function generateGapQueries(coverage: CoverageMatrix[]): string[] {
  const queries: string[] = [];

  coverage
    .filter(c => c.gap > 10) // Only pillars with significant gaps
    .forEach(({ pillar, women, men }) => {
      const templates = QUERY_TEMPLATES[pillar];

      if (!templates) {
        console.warn(`No query templates found for pillar: ${pillar}`);
        return;
      }

      // Add womenswear queries if under target
      if (women < 15) {
        queries.push(...templates.womenswear.slice(0, 3));
      }

      // Add menswear queries if under target
      if (men < 15) {
        queries.push(...templates.menswear.slice(0, 3));
      }
    });

  return queries;
}

/**
 * Get all query templates for a specific pillar and gender
 */
export function getQueriesForPillar(pillar: string, gender: 'womenswear' | 'menswear'): string[] {
  const templates = QUERY_TEMPLATES[pillar];
  if (!templates) return [];
  return templates[gender] || [];
}

/**
 * Get suggested queries for current coverage state
 */
export async function getSuggestedQueries(): Promise<{
  queries: string[];
  coverage: CoverageMatrix[];
}> {
  const coverage = await calculateCoverage();
  const queries = generateGapQueries(coverage);

  return {
    queries,
    coverage
  };
}
