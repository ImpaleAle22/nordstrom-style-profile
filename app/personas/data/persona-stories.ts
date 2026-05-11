/**
 * Persona Story Definitions
 * Rich descriptions for each demo persona
 */

export interface PersonaStory {
  customer_id: string;
  archetype: string;
  tagline: string;
  description: string;
  journey: string;
  keyInsight: string;
  dataProfile: {
    confidence: string;
    sessions: number;
    signals: number;
    primaryPillars: string[];
  };
}

export const PERSONA_STORIES: Record<string, PersonaStory> = {
  'sarah_newuser_quiz': {
    customer_id: 'sarah_newuser_quiz',
    archetype: 'The Power User',
    tagline: 'Long-term engagement across all touchpoints',
    description: 'Sarah is a 4-6 month customer with 200+ swipes, 3 quizzes, 7 purchases, and 2 chat conversations. Highly engaged across every interaction type. Profile fully matured.',
    journey: 'Started balanced, crystallized over time. Uses every feature—swipes, quizzes, wishlist, purchases, chat. Profile confidence at 95%+.',
    keyInsight: 'Demonstrates mature, high-confidence profiles. Long-term engagement + diverse interactions = strongest intelligence. Minimal 42%, Classic 28%.',
    dataProfile: {
      confidence: 'Strong (95%)',
      sessions: 17,
      signals: 250,
      primaryPillars: ['Minimal', 'Classic', 'Romantic'],
    },
  },

  'marcus_poweruser_swipe': {
    customer_id: 'marcus_poweruser_swipe',
    archetype: 'The Big Spender',
    tagline: 'Low engagement, high-value purchases',
    description: 'Marcus is brand new (2-3 weeks) but already dropped $800+ across 4 orders. Minimal swipe activity—he knows what he wants and buys it. Athletic and Utility focused.',
    journey: 'Skipped exploration entirely. 2 abandoned swipe sessions, then straight to purchasing. 12 items bought, profile building from transaction data.',
    keyInsight: 'Shows purchase data builds profiles faster than swipes. Low engagement volume but highest signal quality. Transaction-driven intelligence.',
    dataProfile: {
      confidence: 'Building (48%)',
      sessions: 3,
      signals: 36,
      primaryPillars: ['Athletic', 'Utility', 'Casual'],
    },
  },

  'elena_maximal_creative': {
    customer_id: 'elena_maximal_creative',
    archetype: 'The Creative',
    tagline: 'Multi-pillar harmony',
    description: 'Elena (2-4 months) balances 4 pillars beautifully: Bohemian 22%, Maximal 20%, Romantic 20%, Fashion Forward 18%. Statement piece buyer, loves bold prints and colors.',
    journey: 'Started exploratory, settled into creative aesthetic. 10-12 sessions, 5 purchases of unique pieces. Profile shows artistic, fearless style.',
    keyInsight: 'Demonstrates multi-pillar harmony. Shows how Bohemian + Maximal + Romantic coexist. Creative customers need diverse palettes.',
    dataProfile: {
      confidence: 'Moderate (65%)',
      sessions: 11,
      signals: 110,
      primaryPillars: ['Bohemian', 'Maximal', 'Romantic'],
    },
  },

  'tyler_extreme_minimal': {
    customer_id: 'tyler_extreme_minimal',
    archetype: 'The Purist',
    tagline: 'Unwavering minimalism',
    description: 'Tyler (2-3 months) has 75% Minimal from day one—and it never changed. 80 cards swiped, 90% yes to Minimal. 5 purchases, all black/white/gray.',
    journey: '8 sessions of absolute consistency. Started at Minimal 75%, still at 75%. Knows exactly what they want, never explores outside their lane.',
    keyInsight: 'Shows extreme single-pillar dominance and profile consistency. Some customers have unwavering conviction. No evolution = clarity from start.',
    dataProfile: {
      confidence: 'Moderate (68%)',
      sessions: 9,
      signals: 95,
      primaryPillars: ['Minimal', 'Classic'],
    },
  },

  'priya_browse_casual': {
    customer_id: 'priya_browse_casual',
    archetype: 'The Browser',
    tagline: 'Saves more than she buys',
    description: 'Priya (3-4 months) has 42 wishlisted items but only 2 purchases. 7 swipe sessions, 1 quiz. Loves browsing, slow to commit. Casual 30%, Bohemian 18%.',
    journey: 'High save-to-purchase ratio. Patient consideration cycles. Builds profile through wishlist behavior + browsing patterns.',
    keyInsight: 'Shows wishlist-heavy profile building. Browse behavior = valid signal. Some customers need time to decide—profile still strengthens.',
    dataProfile: {
      confidence: 'Moderate (58%)',
      sessions: 8,
      signals: 92,
      primaryPillars: ['Casual', 'Bohemian', 'Romantic'],
    },
  },

  'derek_athletic_focused': {
    customer_id: 'derek_athletic_focused',
    archetype: 'The Specialist',
    tagline: 'Niche-focused, repeat buyer',
    description: "Derek (2-3 months) is 70% Athletic—only engages with activewear content. 7 purchases of performance gear, 15 wishlisted items (all athletic). Won't swipe outside his category.",
    journey: '8-10 sessions, only interacts with athletic stacks. Repeat purchase pattern. Category specialist who knows their lane.',
    keyInsight: 'Shows category-specific customers. 70% single pillar dominance = niche focus. Some users only care about one vertical.',
    dataProfile: {
      confidence: 'Moderate (67%)',
      sessions: 9,
      signals: 88,
      primaryPillars: ['Athletic', 'Casual', 'Minimal'],
    },
  },

  'james_classic_purchase': {
    customer_id: 'james_classic_purchase',
    archetype: 'The Professional',
    tagline: 'Building a work wardrobe',
    description: 'James (2-3 months) is Classic 40%, Utility 20%, Minimal 18%. 6 purchases of tailoring and leather goods. Higher price tolerance—buys investment pieces.',
    journey: '6-8 sessions focused on work-appropriate styles. 1 Request A Look for work event. Building professional wardrobe methodically.',
    keyInsight: 'Shows occasion-driven purchasing (workwear). Classic + Utility combo for professionals. Higher price points = quality over quantity.',
    dataProfile: {
      confidence: 'Moderate (63%)',
      sessions: 7,
      signals: 82,
      primaryPillars: ['Classic', 'Utility', 'Minimal'],
    },
  },

  'aisha_balanced_explorer': {
    customer_id: 'aisha_balanced_explorer',
    archetype: 'The Balanced Explorer',
    tagline: 'Still discovering after months',
    description: "Aisha (2-3 months) has 5-6 active pillars all in 10-16% range. Truly exploratory—no dominance emerging yet. 9 sessions, 4 diverse purchases, 2 quizzes. Still in discovery.",
    journey: "Engages with wide variety. Casual 16%, Romantic 16%, Bohemian 13%, Classic 12%, Maximal 11%. Profile hasn't crystallized—and that's okay.",
    keyInsight: 'Shows truly exploratory profiles. Some customers stay balanced even after months. Not indecisive—just genuinely eclectic taste.',
    dataProfile: {
      confidence: 'Moderate (57%)',
      sessions: 10,
      signals: 107,
      primaryPillars: ['Casual', 'Romantic', 'Bohemian'],
    },
  },

  'cold_start': {
    customer_id: 'cold_start',
    archetype: 'The Explorer',
    tagline: 'High engagement, low purchases',
    description: 'Alex is brand new (2-3 weeks) but already highly engaged. Completed 10+ swipe sessions and 2 style quizzes, but only made 1 small purchase. Building preferences through exploration.',
    journey: '120+ cards swiped, 2 quizzes completed, 18 items wishlisted. Profile rapidly crystallizing from activity alone—no purchase pressure.',
    keyInsight: 'Shows how profiles build from engagement without purchases. Swipe signals + quiz responses create clear preferences fast.',
    dataProfile: {
      confidence: 'Building (42%)',
      sessions: 12,
      signals: 150,
      primaryPillars: ['Minimal', 'Classic', 'Romantic'],
    },
  },
};

/**
 * Get persona story by customer ID
 */
export function getPersonaStory(customerId: string): PersonaStory | null {
  return PERSONA_STORIES[customerId] || null;
}

/**
 * Get all persona stories as array
 */
export function getAllPersonaStories(): PersonaStory[] {
  return Object.values(PERSONA_STORIES);
}

/**
 * Sort personas by confidence (high to low)
 */
export function sortPersonasByConfidence(stories: PersonaStory[]): PersonaStory[] {
  const confidenceOrder = {
    'Strong': 3,
    'Moderate': 2,
    'Building': 1,
    'Emerging': 0,
  };

  return [...stories].sort((a, b) => {
    const aLevel = a.dataProfile.confidence.split(' ')[0] as keyof typeof confidenceOrder;
    const bLevel = b.dataProfile.confidence.split(' ')[0] as keyof typeof confidenceOrder;
    return (confidenceOrder[bLevel] || 0) - (confidenceOrder[aLevel] || 0);
  });
}
