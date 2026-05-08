/**
 * Pillar Cards Component
 * Beautiful image cards for each style pillar
 */

'use client';

import { getTopPillars } from '../data/pillar-config';

interface PillarCardsProps {
  pillars: Record<string, number>;
  count?: number;
}

export default function PillarCards({ pillars, count = 3 }: PillarCardsProps) {
  const topPillars = getTopPillars(pillars, count);

  return (
    <section className="profile-section">
      <div className="profile-container">
        <h2 className="profile-section-title profile-serif">The pillars that define your style</h2>

        <div className="pillar-grid">
          {topPillars.map((pillar) => (
            <div key={pillar.name} className="pillar-card">
              <img
                src={pillar.imageUrl}
                alt={`${pillar.displayName} style`}
                className="pillar-card-image"
              />
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
          ))}
        </div>
      </div>
    </section>
  );
}
