/**
 * Pillar Cards Component
 * Beautiful image cards for each style pillar
 */

'use client';

import { getTopPillars } from '@/app/personas/data/pillar-config';
import { getGradientForIndex } from '@/lib/gradient-placeholders';

interface PillarCardsProps {
  pillars: Record<string, number>;
  count?: number;
  lifestyleImages?: any[];
  gender?: string;
}

export default function PillarCards({ pillars, count = 3, lifestyleImages = [], gender }: PillarCardsProps) {
  const topPillars = getTopPillars(pillars, count);

  // Get lifestyle image for a pillar or return gradient placeholder
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
      const random = Math.floor(Math.random() * matches.length);
      const imageUrl = matches[random].imageUrl || matches[random].url || matches[random].image_url;
      return { type: 'image', value: imageUrl };
    }

    // Return gradient placeholder
    return { type: 'gradient', value: getGradientForIndex(index) };
  };

  return (
    <section className="profile-section">
      <div className="profile-container">
        <h2 className="profile-section-title profile-serif">The pillars that define your style</h2>

        <div className="pillar-grid">
          {topPillars.map((pillar, index) => {
            const media = getImageOrGradient(pillar.name, index);
            return (
              <div key={pillar.name} className="pillar-card">
                {media.type === 'image' ? (
                  <img
                    src={media.value}
                    alt={`${pillar.displayName} style`}
                    className="pillar-card-image"
                  />
                ) : (
                  <div
                    className="pillar-card-image"
                    style={{ background: media.value }}
                  />
                )}
              <div className="pillar-card-content">
                <div className="pillar-card-header">
                  <div className="pillar-card-name">● {pillar.displayName}</div>
                  <div className="pillar-card-percentage">{pillar.weight}%</div>
                </div>
                <p className="pillar-card-description">
                  {pillar.description}
                </p>
                <div className="pillar-card-tags">
                  {pillar.tags.map((tag) => (
                    <span key={tag} className="pillar-tag">{tag}</span>
                  ))}
                </div>
                <div className="pillar-card-strength">
                  <div
                    className="pillar-card-strength-fill"
                    style={{ width: `${pillar.weight}%` }}
                  ></div>
                </div>
                <div className="pillar-card-actions">
                  <a href="#" className="profile-btn profile-btn-primary">
                    Shop {pillar.displayName}
                  </a>
                  <a href="#" className="profile-btn profile-btn-secondary">
                    See Outfits
                  </a>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
