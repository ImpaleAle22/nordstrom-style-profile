/**
 * Cross Links Component
 * Links to related features
 */

'use client';

interface CrossLinksProps {
  customerId: string;
}

export default function CrossLinks({ customerId }: CrossLinksProps) {
  return (
    <section className="profile-section">
      <div className="profile-container">
        <h2 className="profile-section-title profile-serif">More ways to explore your style</h2>

        <div className="cross-links">
          <a href={`/swipe/${customerId}`} className="cross-link-card">
            <span className="cross-link-icon">👗</span>
            <div className="cross-link-title">Style Swipes</div>
            <div className="cross-link-count">Discover looks</div>
          </a>

          <a href="#" className="cross-link-card">
            <span className="cross-link-icon">❤️</span>
            <div className="cross-link-title">Favorites</div>
            <div className="cross-link-count">Saved items</div>
          </a>

          <a href="#" className="cross-link-card">
            <span className="cross-link-icon">🎨</span>
            <div className="cross-link-title">Style Quiz</div>
            <div className="cross-link-count">Refine profile</div>
          </a>

          <a href="#" className="cross-link-card">
            <span className="cross-link-icon">📦</span>
            <div className="cross-link-title">Recent Orders</div>
            <div className="cross-link-count">View purchases</div>
          </a>
        </div>
      </div>
    </section>
  );
}
