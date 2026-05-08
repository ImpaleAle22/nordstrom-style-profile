/**
 * Profile Content - EXACT copy of original HTML
 * Source: /Users/hqh4/claude/style-profile/ui/index.html lines 418-669
 */

import { CustomerProfile } from '@/lib/types';
import { getTopPillars } from '../data/pillar-config';

interface ProfileContentProps {
  profile: CustomerProfile;
  pillars: Record<string, number>;
}

export default function ProfileContent({ profile, pillars }: ProfileContentProps) {
  const topPillars = getTopPillars(pillars, 5);
  const top3Pillars = topPillars.slice(0, 3);

  return (
    <div className="customer-content view-content active" id="profileView">
      {/* Data Page Link (Top Right) */}
      <a href="#" className="data-page-link" title="View Style Data">
        <svg className="beaker-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 1.5H10.5M6.5 1.5V6L3.5 11.5C3.16667 12.1667 3.33333 13 4 13.5H12C12.6667 13 12.8333 12.1667 12.5 11.5L9.5 6V1.5M8 9.5L9.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Style Data</span>
      </a>
      {/* Editorial Hero Section */}
      <div className="editorial-hero">
        <div className="editorial-hero-text">
          <h1 className="hero-headline" id="heroHeadline">
            <span className="hero-headline-display">Your style is</span>
            <span className="hero-headline-emphasis">refined, intentional,</span>
            <span className="hero-headline-display">and built on</span>
            <span className="hero-headline-emphasis">timeless foundations.</span>
          </h1>
          <p className="hero-supporting-text" id="heroSupportingText">
            You gravitate toward pieces that feel effortless yet considered,
            with a clear point of view that balances simplicity and sophistication.
          </p>

          <div className="hero-stats-row">
            <div className="hero-stat">
              <div className="hero-stat-value">{topPillars[0]?.weight || 0}%</div>
              <div className="hero-stat-label">{topPillars[0]?.displayName || 'Classic'}</div>
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
            <div className="hero-image-card hero-image-large">
              <img src={top3Pillars[0]?.imageUrl || "https://images.pexels.com/photos/8483769/pexels-photo-8483769.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"} alt="Classic style" />
              <div className="hero-image-label">{top3Pillars[0]?.displayName.toUpperCase() || 'Classic'}</div>
            </div>
            <div className="hero-image-stack">
              <div className="hero-image-card hero-image-small">
                <img src={top3Pillars[1]?.imageUrl || "https://images.pexels.com/photos/36888252/pexels-photo-36888252.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"} alt="Romantic style" />
                <div className="hero-image-label">{top3Pillars[1]?.displayName.toUpperCase() || 'Romantic'}</div>
              </div>
              <div className="hero-image-card hero-image-small">
                <img src={top3Pillars[2]?.imageUrl || "https://images.pexels.com/photos/15758653/pexels-photo-15758653.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"} alt="Minimal style" />
                <div className="hero-image-label">{top3Pillars[2]?.displayName.toUpperCase() || 'Minimal'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Style Profile Overview (Two Column Layout) */}
      <div className="style-profile-section">
        <div className="style-profile-header">
          <h3 className="style-profile-header-title">Your Style Profile</h3>
          <div className="style-profile-header-subtitle">Top style pillars and recommendations</div>
        </div>

        <div className="style-profile-overview">
          <div className="style-profile-left">
            {/* Radar Chart */}
            <div id="styleRadarChart"></div>
          </div>
          <div className="style-profile-right">
            {/* Top Pillars List */}
            <div id="topPillarsList">
              {topPillars.map((pillar, index) => (
                <div key={pillar.name} className="pillar-item">
                  <div className="pillar-rank">{index + 1}</div>
                  <div className="pillar-info">
                    <div className="pillar-name">{pillar.displayName}</div>
                    <div className="pillar-bar">
                      <div
                        className="pillar-bar-fill"
                        style={{
                          width: `${pillar.weight}%`,
                          backgroundColor: pillar.color,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="pillar-percentage">{pillar.weight}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pillar Cards */}
      <section className="profile-section">
        <div className="profile-container">
          <h2 className="profile-section-title profile-serif">The pillars that define your style</h2>

          <div className="pillar-grid">
            {top3Pillars.map((pillar) => (
              <div key={pillar.name} className="pillar-card">
                <img src={pillar.imageUrl}
                     alt={`${pillar.displayName} style`}
                     className="pillar-card-image" />
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
                    <div className="pillar-card-strength-fill" style={{ width: `${pillar.weight}%` }}></div>
                  </div>
                  <div className="pillar-card-actions">
                    <a href="#" className="profile-btn profile-btn-primary">Shop {pillar.displayName}</a>
                    <a href="#" className="profile-btn profile-btn-secondary">See Outfits</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Style Patterns */}
      <section className="profile-section">
        <div className="profile-container">
          <h2 className="profile-section-title profile-serif">Style patterns we've noticed</h2>

          <div className="insights-grid">
            <div className="insight-card">
              <span className="insight-icon">👔</span>
              <h3 className="insight-title">Smart Casual</h3>
              <p className="insight-description">
                Most of your saved outfits are polished but relaxed
              </p>
              <div className="insight-data">73% of favorites</div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">🎨</span>
              <h3 className="insight-title">Neutral with Pops</h3>
              <p className="insight-description">
                You prefer neutral bases with colorful accents
              </p>
              <div className="insight-colors">
                <div className="color-swatch" style={{ background: '#1a1a2e' }}></div>
                <div className="color-swatch" style={{ background: '#000000' }}></div>
                <div className="color-swatch" style={{ background: '#C8B89C' }}></div>
                <div className="color-swatch" style={{ background: '#6B7280' }}></div>
              </div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">📐</span>
              <h3 className="insight-title">Tailored & Structured</h3>
              <p className="insight-description">
                You consistently choose fitted, defined shapes
              </p>
              <div className="insight-data">Top fit: Tailored</div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">💼</span>
              <h3 className="insight-title">Workwear Focused</h3>
              <p className="insight-description">
                You shop most for professional occasions
              </p>
              <div className="insight-data">18 blazers saved</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cross Links */}
      <section className="profile-section">
        <div className="profile-container">
          <h2 className="profile-section-title profile-serif">More ways to explore your style</h2>

          <div className="cross-links">
            <a href="#" className="cross-link-card">
              <span className="cross-link-icon">💾</span>
              <div className="cross-link-title">Saved Outfits</div>
              <div className="cross-link-count">47 outfits</div>
            </a>

            <a href="#" className="cross-link-card">
              <span className="cross-link-icon">❤️</span>
              <div className="cross-link-title">Favorites</div>
              <div className="cross-link-count">89 items</div>
            </a>

            <a href="#" className="cross-link-card">
              <span className="cross-link-icon">🎨</span>
              <div className="cross-link-title">Style Quiz</div>
              <div className="cross-link-count">Taken 2x</div>
            </a>

            <a href="#" className="cross-link-card">
              <span className="cross-link-icon">📦</span>
              <div className="cross-link-title">Recent Orders</div>
              <div className="cross-link-count">12 items</div>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
