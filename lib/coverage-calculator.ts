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

// Canonical style pillars (9 pillars)
export const PILLARS = [
  'classic',
  'minimal',
  'romantic',
  'bohemian',
  'maximal',
  'casual',
  'streetwear',
  'athletic',
  'utility'
];

// Query templates for each pillar and gender combination
// Optimized for: full-body shots, solid color backgrounds, fashion editorial style
const QUERY_TEMPLATES: Record<string, { womenswear: string[], menswear: string[] }> = {
  classic: {
    womenswear: [
      'woman full body fashion model studio solid background tailored blazer',
      'elegant woman full length portrait clean backdrop structured outfit',
      'woman fashion editorial full body timeless classic style',
      'professional woman full body studio minimal background',
      'woman fashion model full body neutral background elegant'
    ],
    menswear: [
      'man full body fashion model studio solid background tailored suit',
      'elegant man full length portrait clean backdrop structured',
      'man fashion editorial full body timeless style',
      'professional man full body studio minimal background',
      'man fashion model full body neutral background formal'
    ]
  },
  minimal: {
    womenswear: [
      'woman full body minimalist fashion studio solid background clean',
      'woman full length portrait monochrome outfit simple backdrop',
      'minimalist woman fashion editorial full body neutral',
      'woman fashion model full body modern minimal style',
      'sleek woman full body studio clean background simple'
    ],
    menswear: [
      'man full body minimalist fashion studio solid background',
      'man full length portrait monochrome outfit clean backdrop',
      'minimalist man fashion editorial full body neutral',
      'man fashion model full body modern minimal style',
      'sleek man full body studio clean background simple'
    ]
  },
  romantic: {
    womenswear: [
      'woman full body romantic fashion studio pastel background dress',
      'feminine woman full length portrait soft colors clean backdrop',
      'woman fashion editorial full body flowing dress romantic',
      'woman fashion model full body feminine style florals',
      'soft romantic woman full body studio light background'
    ],
    menswear: [
      'man full body elegant fashion studio neutral background',
      'refined man full length portrait clean backdrop tailored',
      'man fashion editorial full body soft sophisticated',
      'gentleman fashion model full body elegant style',
      'polished man full body studio neutral background'
    ]
  },
  bohemian: {
    womenswear: [
      'woman full body bohemian fashion studio warm background',
      'boho woman full length portrait earthy colors clean backdrop',
      'woman fashion editorial full body free spirit style',
      'woman fashion model full body bohemian flowing outfit',
      'bohemian woman full body studio warm earth tones'
    ],
    menswear: [
      'man full body bohemian fashion studio warm background',
      'boho man full length portrait earthy clean backdrop',
      'man fashion editorial full body relaxed bohemian',
      'man fashion model full body casual bohemian style',
      'bohemian man full body studio neutral warm background'
    ]
  },
  maximal: {
    womenswear: [
      'woman full body bold colorful fashion studio bright background',
      'woman full length portrait vibrant colors clean backdrop',
      'maximalist woman fashion editorial full body statement outfit',
      'woman fashion model full body bold patterns bright',
      'colorful woman full body studio bright solid background'
    ],
    menswear: [
      'man full body bold colorful fashion studio bright background',
      'man full length portrait vibrant colors clean backdrop',
      'maximalist man fashion editorial full body statement',
      'man fashion model full body bold patterns bright',
      'colorful man full body studio bright solid background'
    ]
  },
  casual: {
    womenswear: [
      'woman full body casual fashion studio neutral background jeans',
      'relaxed woman full length portrait clean backdrop everyday',
      'woman fashion editorial full body comfortable casual style',
      'woman fashion model full body casual outfit studio',
      'casual woman full body studio solid background simple'
    ],
    menswear: [
      'man full body casual fashion studio neutral background',
      'relaxed man full length portrait clean backdrop everyday',
      'man fashion editorial full body comfortable casual',
      'man fashion model full body casual outfit studio',
      'casual man full body studio solid background simple'
    ]
  },
  streetwear: {
    womenswear: [
      'woman full body streetwear fashion studio bold background urban',
      'urban woman full length portrait bright colors clean',
      'woman fashion editorial full body street style',
      'woman fashion model full body streetwear sneakers',
      'streetwear woman full body studio solid background urban'
    ],
    menswear: [
      'man full body streetwear fashion studio bold background',
      'urban man full length portrait bright colors clean',
      'man fashion editorial full body street style',
      'man fashion model full body streetwear sneakers',
      'streetwear man full body studio solid background urban'
    ]
  },
  athletic: {
    womenswear: [
      'woman full body athletic fashion studio clean background sporty',
      'athletic woman full length portrait solid backdrop activewear',
      'woman fashion editorial full body sporty athletic style',
      'woman fashion model full body athletic wear studio',
      'sporty woman full body studio bright solid background'
    ],
    menswear: [
      'man full body athletic fashion studio clean background',
      'athletic man full length portrait solid backdrop activewear',
      'man fashion editorial full body sporty athletic',
      'man fashion model full body athletic wear studio',
      'sporty man full body studio bright solid background'
    ]
  },
  utility: {
    womenswear: [
      'woman full body utility fashion studio neutral background functional',
      'utilitarian woman full length portrait clean backdrop workwear',
      'woman fashion editorial full body utility style cargo',
      'woman fashion model full body functional utility outfit',
      'utility woman full body studio solid neutral background'
    ],
    menswear: [
      'man full body utility fashion studio neutral background',
      'utilitarian man full length portrait clean backdrop workwear',
      'man fashion editorial full body utility style cargo',
      'man fashion model full body functional utility outfit',
      'utility man full body studio solid neutral background'
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
