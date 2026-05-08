/**
 * Style Patterns Component
 * Insights about customer's style preferences
 */

'use client';

import { getTopPillars } from '../data/pillar-config';

interface StylePatternsProps {
  pillars: Record<string, number>;
  colorAffinity?: Record<string, number>;
}

export default function StylePatterns({ pillars, colorAffinity }: StylePatternsProps) {
  const topPillars = getTopPillars(pillars, 1);
  const topPillarName = topPillars[0]?.displayName || 'Your';

  // Get top colors
  const topColors = colorAffinity
    ? Object.entries(colorAffinity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];

  // Color mappings
  const colorMap: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    navy: '#1a1a2e',
    gray: '#6B7280',
    beige: '#C8B89C',
    brown: '#8B4513',
    red: '#DC143C',
    blue: '#4169E1',
    green: '#228B22',
  };

  return (
    <section className="profile-section">
      <div className="profile-container">
        <h2 className="profile-section-title profile-serif">Style patterns we've noticed</h2>

        <div className="insights-grid">
          <div className="insight-card">
            <span className="insight-icon">👔</span>
            <h3 className="insight-title">{topPillarName} Focus</h3>
            <p className="insight-description">
              Most of your favorites lean toward {topPillarName.toLowerCase()} aesthetics
            </p>
            <div className="insight-data">{topPillars[0]?.weight}% of style</div>
          </div>

          <div className="insight-card">
            <span className="insight-icon">🎨</span>
            <h3 className="insight-title">Color Preferences</h3>
            <p className="insight-description">
              Your most-loved colors create a cohesive palette
            </p>
            {topColors.length > 0 && (
              <div className="insight-colors">
                {topColors.map(([color]) => (
                  <div
                    key={color}
                    className="color-swatch"
                    style={{
                      background: colorMap[color.toLowerCase()] || '#999',
                      border: color.toLowerCase() === 'white' ? '1px solid #ddd' : 'none',
                    }}
                  ></div>
                ))}
              </div>
            )}
          </div>

          <div className="insight-card">
            <span className="insight-icon">📐</span>
            <h3 className="insight-title">Style Consistency</h3>
            <p className="insight-description">
              Your preferences show clear patterns
            </p>
            <div className="insight-data">High confidence</div>
          </div>

          <div className="insight-card">
            <span className="insight-icon">💼</span>
            <h3 className="insight-title">Multi-Occasion</h3>
            <p className="insight-description">
              You shop for both casual and formal events
            </p>
            <div className="insight-data">Versatile wardrobe</div>
          </div>
        </div>
      </div>
    </section>
  );
}
