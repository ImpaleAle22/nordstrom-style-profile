/**
 * Editorial Hero Section
 * Large serif typography + image cluster
 */

'use client';

interface EditorialHeroProps {
  topPillars: Array<[string, number]>;
  customerName: string;
  sessionsProcessed: number;
  lifestyleImages?: any[];
  gender?: string;
}

export default function EditorialHero({
  topPillars,
  customerName,
  sessionsProcessed,
  lifestyleImages = [],
  gender
}: EditorialHeroProps) {
  const top3 = topPillars.slice(0, 3);

  // Get lifestyle image for a pillar
  const getImageForPillar = (pillarName: string) => {
    const pillarKey = pillarName === 'fashionForward' ? 'fashion_forward' : pillarName.toLowerCase();

    let matches = lifestyleImages.filter((img: any) =>
      (img.finalPillar || img.pillar) === pillarKey
    );

    if (gender && matches.length > 0) {
      const genderMatches = matches.filter((img: any) => img.gender === gender);
      if (genderMatches.length > 0) matches = genderMatches;
    }

    if (matches.length > 0) {
      const random = Math.floor(Math.random() * matches.length);
      return matches[random].imageUrl || matches[random].url || matches[random].image_url;
    }

    // Fallback images
    const fallbacks: Record<string, string> = {
      classic: 'https://images.pexels.com/photos/8483769/pexels-photo-8483769.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      romantic: 'https://images.pexels.com/photos/36888252/pexels-photo-36888252.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      minimal: 'https://images.pexels.com/photos/15758653/pexels-photo-15758653.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      casual: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=800',
      athletic: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
      utility: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
      bohemian: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
      maximal: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
      fashionForward: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800'
    };

    return fallbacks[pillarName] || fallbacks.classic;
  };

  return (
    <div className="editorial-hero">
      <div className="editorial-hero-text">
        <h1 className="hero-headline" id="heroHeadline">
          <span className="hero-headline-display">Your style is</span>
          <span className="hero-headline-emphasis">refined, intentional,</span>
          <span className="hero-headline-display">and built on</span>
          <span className="hero-headline-emphasis">timeless foundations.</span>
        </h1>
        <p className="hero-supporting-text">
          You gravitate toward pieces that feel effortless yet considered,
          with a clear point of view that balances simplicity and sophistication.
        </p>

        <div className="hero-stats-row">
          <div className="hero-stat">
            <div className="hero-stat-value">{topPillars[0]?.[1] || 0}%</div>
            <div className="hero-stat-label">
              {topPillars[0]?.[0].charAt(0).toUpperCase() + topPillars[0]?.[0].slice(1) || 'Classic'}
            </div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">47</div>
            <div className="hero-stat-label">Saved Outfits</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">{topPillars.length}</div>
            <div className="hero-stat-label">Style Pillars</div>
          </div>
        </div>
      </div>

      <div className="editorial-hero-image">
        <div className="hero-image-cluster">
          {top3[0] && (
            <div className="hero-image-card hero-image-large">
              <img
                src={getImageForPillar(top3[0][0])}
                alt={`${top3[0][0]} style`}
              />
              <div className="hero-image-label">
                {top3[0][0].toUpperCase().replace('FASHIONFORWARD', 'FASHION FORWARD')}
              </div>
            </div>
          )}
          <div className="hero-image-stack">
            {top3[1] && (
              <div className="hero-image-card hero-image-small">
                <img
                  src={getImageForPillar(top3[1][0])}
                  alt={`${top3[1][0]} style`}
                />
                <div className="hero-image-label">
                  {top3[1][0].toUpperCase().replace('FASHIONFORWARD', 'FASHION FORWARD')}
                </div>
              </div>
            )}
            {top3[2] && (
              <div className="hero-image-card hero-image-small">
                <img
                  src={getImageForPillar(top3[2][0])}
                  alt={`${top3[2][0]} style`}
                />
                <div className="hero-image-label">
                  {top3[2][0].toUpperCase().replace('FASHIONFORWARD', 'FASHION FORWARD')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
