/**
 * Generate persona-specific hero text based on style profile
 */

interface HeroText {
  headline: string[];
  supportingText: string;
}

export function getPersonaHeroText(
  customerName: string,
  topPillars: Array<[string, number]>,
  totalSignals: number,
  confidenceScore: number
): HeroText {
  const firstName = customerName.split(' ')[0];
  const topPillar = topPillars[0]?.[0] || 'classic';
  const secondPillar = topPillars[1]?.[0] || 'minimal';
  const topPercentage = topPillars[0]?.[1] || 0;

  // Persona-specific hero text based on their dominant pillars and activity
  const heroTexts: Record<string, HeroText> = {
    'Aisha Patel': {
      headline: [
        'Your style is',
        'playful, colorful,',
        'and effortlessly',
        'creative.'
      ],
      supportingText: `With ${topPercentage}% casual influence, you blend comfort with personality through flowing silhouettes and unexpected pattern combinations.`
    },
    'Alex Chen': {
      headline: [
        'Your style is',
        'clean, refined,',
        'and built on',
        'timeless foundations.'
      ],
      supportingText: `Strong minimal aesthetic (${topPercentage}%) paired with classic sensibility—you gravitate toward pieces that feel effortless yet considered.`
    },
    'Derek Johnson': {
      headline: [
        'Your style is',
        'active, streamlined,',
        'and performance-',
        'driven.'
      ],
      supportingText: `Athletic wear dominates your wardrobe (${topPercentage}%). You value function, technical fabrics, and seamless transitions from gym to street.`
    },
    'Elena Rodriguez': {
      headline: [
        'Your style is',
        'bold, artistic,',
        'and unapologetically',
        'expressive.'
      ],
      supportingText: `Bohemian spirit meets maximalist energy—you layer textures, embrace earthy tones, and treat fashion as personal storytelling.`
    },
    'James Wilson': {
      headline: [
        'Your style is',
        'polished, structured,',
        'and work-',
        'ready.'
      ],
      supportingText: `Classic tailoring defines your wardrobe (${topPercentage}%). You prioritize quality fabrics, timeless cuts, and versatile pieces that command respect.`
    },
    'Marcus Thompson': {
      headline: [
        'Your style is',
        'functional, no-fuss,',
        'and built for',
        'real life.'
      ],
      supportingText: `${totalSignals} signals show a practical approach—athletic basics with utility touches. You buy what works and stick with it.`
    },
    'Priya Sharma': {
      headline: [
        'Your style is',
        'thoughtful, layered,',
        'and always',
        'evolving.'
      ],
      supportingText: `You take time to build the perfect wardrobe. ${totalSignals} interactions reveal a patient, considered approach to discovering what truly resonates.`
    },
    'Sarah Martinez': {
      headline: [
        'Your style is',
        'sophisticated, intentional,',
        'and beautifully',
        'curated.'
      ],
      supportingText: `${confidenceScore ? `${Math.round(confidenceScore * 100)}% confidence` : 'Strong minimal foundation'} with ${totalSignals} signals—your profile reflects deep engagement and clear taste.`
    },
    'Tyler Chen': {
      headline: [
        'Your style is',
        'efficient, decisive,',
        'and backed by',
        'proven choices.'
      ],
      supportingText: `${topPercentage}% minimal influence shows in your wardrobe. You know what works, build a solid foundation, and stay loyal to quality brands.`
    }
  };

  // Return persona-specific text or generate generic based on pillars
  return heroTexts[customerName] || {
    headline: [
      'Your style is',
      `${topPillar}, ${secondPillar},`,
      'and uniquely',
      'yours.'
    ],
    supportingText: `With ${topPercentage}% ${topPillar} influence and ${totalSignals} style signals, your profile is taking shape.`
  };
}
