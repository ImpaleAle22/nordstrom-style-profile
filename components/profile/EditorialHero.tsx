/**
 * Editorial Hero Section
 * Large serif typography + image cluster
 */

'use client';

import { getGradientForIndex } from '@/lib/gradient-placeholders';
import { getPersonaHeroText } from '@/lib/persona-hero-text';

interface EditorialHeroProps {
  topPillars: Array<[string, number]>;
  customerName: string;
  sessionsProcessed: number;
  lifestyleImages?: any[];
  gender?: string;
  totalSignals?: number;
  confidenceScore?: number;
}

export default function EditorialHero({
  topPillars,
  customerName,
  sessionsProcessed,
  lifestyleImages = [],
  gender,
  totalSignals = 0,
  confidenceScore = 0
}: EditorialHeroProps) {
  const top3 = topPillars.slice(0, 3);
  const heroText = getPersonaHeroText(customerName, topPillars, totalSignals, confidenceScore);

  // Get lifestyle image for a pillar or return gradient placeholder
  // Uses stable selection (first match) to prevent flickering
  const getImageOrGradient = (pillarName: string, index: number): { type: 'image' | 'gradient', value: string } => {
    const pillarKey = pillarName === 'fashionForward' ? 'fashion_forward' : pillarName.toLowerCase();

    let matches = lifestyleImages.filter((img: any) =>
      (img.finalPillar || img.pillar) === pillarKey
    );

    if (gender && matches.length > 0) {
      const genderMatches = matches.filter((img: any) => img.gender === gender);
      if (genderMatches.length > 0) matches = genderMatches;
    }

    if (matches.length > 0) {
      // Use stable index based on pillar name to prevent flickering
      const stableIndex = pillarName.length % matches.length;
      const imageUrl = matches[stableIndex].imageUrl || matches[stableIndex].url || matches[stableIndex].image_url;
      return { type: 'image', value: imageUrl };
    }

    // Return gradient placeholder
    return { type: 'gradient', value: getGradientForIndex(index) };
  };

  return (
    <div className="editorial-hero">
      <div className="editorial-hero-text">
        <h1 className="hero-headline" id="heroHeadline">
          <span className="hero-headline-display">{heroText.headline[0]}</span>
          <span className="hero-headline-emphasis">{heroText.headline[1]}</span>
          <span className="hero-headline-display">{heroText.headline[2]}</span>
          <span className="hero-headline-emphasis">{heroText.headline[3]}</span>
        </h1>
        <p className="hero-supporting-text">
          {heroText.supportingText}
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
          {top3[0] && (() => {
            const media = getImageOrGradient(top3[0][0], 0);
            return (
              <div className="hero-image-card hero-image-large">
                {media.type === 'image' ? (
                  <img src={media.value} alt={`${top3[0][0]} style`} />
                ) : (
                  <div style={{ background: media.value, width: '100%', height: '100%' }} />
                )}
                <div className="hero-image-label">
                  {top3[0][0].toUpperCase().replace('FASHIONFORWARD', 'FASHION FORWARD')}
                </div>
              </div>
            );
          })()}
          <div className="hero-image-stack">
            {top3[1] && (() => {
              const media = getImageOrGradient(top3[1][0], 1);
              return (
                <div className="hero-image-card hero-image-small">
                  {media.type === 'image' ? (
                    <img src={media.value} alt={`${top3[1][0]} style`} />
                  ) : (
                    <div style={{ background: media.value, width: '100%', height: '100%' }} />
                  )}
                  <div className="hero-image-label">
                    {top3[1][0].toUpperCase().replace('FASHIONFORWARD', 'FASHION FORWARD')}
                  </div>
                </div>
              );
            })()}
            {top3[2] && (() => {
              const media = getImageOrGradient(top3[2][0], 2);
              return (
                <div className="hero-image-card hero-image-small">
                  {media.type === 'image' ? (
                    <img src={media.value} alt={`${top3[2][0]} style`} />
                  ) : (
                    <div style={{ background: media.value, width: '100%', height: '100%' }} />
                  )}
                  <div className="hero-image-label">
                    {top3[2][0].toUpperCase().replace('FASHIONFORWARD', 'FASHION FORWARD')}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
