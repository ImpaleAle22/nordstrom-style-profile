/**
 * Profile Panel Component
 * Customer-facing dashboard - engaging and inspirational
 */

function renderProfilePanel(profile, previousProfile = null, history = [], containerId = 'profilePanel') {
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  if (!profile) {
    container.innerHTML = renderEmptyState();
    return;
  }

  container.innerHTML = `
    <div class="profile-dashboard">
      ${renderMinimalHeader(profile)}
      ${renderInsightCards(profile)}
      ${renderDashboardGrid(profile, previousProfile)}
    </div>
  `;
}

function renderEngagingHero(profile) {
  const topPillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0);

  const primary = topPillars[0];
  const secondary = topPillars[1];

  // Get the most interesting life context
  const lifeHighlights = [];
  if (profile.lifeContext.hobbies.length > 0) {
    lifeHighlights.push(profile.lifeContext.hobbies[0]);
  }
  if (profile.lifeContext.family.length > 0) {
    lifeHighlights.push(profile.lifeContext.family[0]);
  }

  const lifeText = lifeHighlights.length > 0
    ? lifeHighlights.join(' • ')
    : 'Building your style profile';

  // Create engaging headline
  const primaryName = primary ? primary[0] : 'Emerging';
  const secondaryName = secondary ? secondary[0] : null;

  const headline = secondaryName
    ? `${capitalize(primaryName)} meets ${capitalize(secondaryName)}`
    : capitalize(primaryName);

  // Style tagline
  const taglines = {
    utility: 'Built to last, made to move',
    classic: 'Timeless elegance, modern confidence',
    minimal: 'Less is more, always',
    outdoor: 'Adventure-ready, always exploring',
    luxe: 'Quality over everything',
    streetwear: 'Bold moves, no apologies'
  };

  const tagline = primary ? taglines[primary[0]] : 'Your style is taking shape';

  return `
    <div class="engaging-hero">
      <div class="hero-background"></div>
      <div class="hero-overlay">
        <div class="hero-eyebrow">${lifeText}</div>
        <h1 class="hero-headline">${headline}</h1>
        <p class="hero-tagline">${tagline}</p>
        ${renderConfidenceBadge(profile.confidence)}
      </div>
    </div>
  `;
}

function renderConfidenceBadge(confidence) {
  const dots = '●'.repeat(confidence.overall) + '○'.repeat(5 - confidence.overall);
  return `
    <div class="confidence-inline">
      <span class="confidence-dots">${dots}</span>
      <span class="confidence-text">${confidence.label} profile</span>
    </div>
  `;
}

function renderMinimalHeader(profile) {
  const topPillar = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0)[0];

  const styleTag = topPillar ? capitalize(topPillar[0]) : 'Emerging';

  return `
  `;
}

function assessDataRichness(profile) {
  return {
    hasColors: Object.values(profile.attributeSpaces?.color || {}).some(v => v > 0.01),
    hasFits: Object.values(profile.attributeSpaces?.fit || {}).some(v => v > 0.01),
    hasBrands: profile.brandAffinity.length > 0,
    hasHarmony: Object.keys(profile.attributeSpaces?.harmony?.edges || {}).length > 0,
    hasPillars: Object.values(profile.pillars).some(v => v > 0),
    hasPrice: profile.priceRange.sweet !== null,
    hasSwipes: profile.brandAffinity.some(b => b.sources.includes('swipe_like')),
    hasPurchases: profile.brandAffinity.some(b => b.sources.includes('purchase')),
    sessionCount: profile.sessionsProcessed,
    confidence: profile.confidence.overall
  };
}

function renderInsightCards(profile) {
  const richness = assessDataRichness(profile);

  const topColor = Object.entries(profile.attributeSpaces?.color || {})
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0.01)[0];

  const topBrand = profile.brandAffinity[0];
  const harmonyCount = Object.keys(profile.attributeSpaces?.harmony?.edges || {}).length;

  const topFit = Object.entries(profile.attributeSpaces?.fit || {})
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0.01)[0];

  // Build cards based on what data we have
  const cards = [];

  // Card 1: Color (or CTA)
  if (richness.hasColors) {
    cards.push(`
      <div class="insight-card-mini">
        <div class="insight-mini-label">Top Color</div>
        <div class="insight-mini-value">${capitalize(topColor[0])}</div>
        <div class="insight-mini-detail">${(topColor[1] * 100).toFixed(0)}%</div>
      </div>
    `);
  } else {
    cards.push(`
      <div class="insight-card-mini action-card">
        <div class="action-icon">🎨</div>
        <div class="action-title">Discover Your Colors</div>
        <div class="action-subtitle">Swipe on looks</div>
      </div>
    `);
  }

  // Card 2: Fit (or CTA)
  if (richness.hasFits) {
    cards.push(`
      <div class="insight-card-mini">
        <div class="insight-mini-label">Favorite Fit</div>
        <div class="insight-mini-value">${capitalize(topFit[0])}</div>
        <div class="insight-mini-detail">${(topFit[1] * 100).toFixed(0)}%</div>
      </div>
    `);
  } else {
    cards.push(`
      <div class="insight-card-mini action-card">
        <div class="action-icon">👕</div>
        <div class="action-title">Find Your Fit</div>
        <div class="action-subtitle">Rate outfits</div>
      </div>
    `);
  }

  // Card 3: Brand (or CTA)
  if (richness.hasBrands) {
    cards.push(`
      <div class="insight-card-mini">
        <div class="insight-mini-label">Favorite Brand</div>
        <div class="insight-mini-value">${topBrand.brand}</div>
        <div class="insight-mini-detail">${Math.round(topBrand.score * 100)}% affinity</div>
      </div>
    `);
  } else {
    cards.push(`
      <div class="insight-card-mini action-card">
        <div class="action-icon">🏷️</div>
        <div class="action-title">Discover Brands</div>
        <div class="action-subtitle">Shop & browse</div>
      </div>
    `);
  }

  // Card 4: Harmony (or CTA)
  if (richness.hasHarmony) {
    cards.push(`
      <div class="insight-card-mini">
        <div class="insight-mini-label">Outfit Combos</div>
        <div class="insight-mini-value">${harmonyCount}</div>
        <div class="insight-mini-detail">proven pairings</div>
      </div>
    `);
  } else {
    cards.push(`
      <div class="insight-card-mini action-card">
        <div class="action-icon">✨</div>
        <div class="action-title">Build Outfits</div>
        <div class="action-subtitle">Rate complete looks</div>
      </div>
    `);
  }

  return `
    <div class="insight-cards">
      ${cards.join('')}
    </div>
  `;
}

function renderDashboardGrid(profile, previousProfile) {
  const richness = assessDataRichness(profile);
  const cards = [];

  // Always show pillars if we have any data
  if (richness.hasPillars) {
    cards.push(renderPillarsCard(profile));
    // Add sub-pillar insights if we have enough data
    if (richness.confidence >= 2) {
      cards.push(renderSubPillarCard(profile));
    }
  } else {
    cards.push(renderActionCard('Take Style Quiz', 'Answer a few questions to establish your style foundation', '📋', 'quiz'));
  }

  // Show colors if we have them
  if (richness.hasColors) {
    cards.push(renderColorsCard(profile));
  } else if (cards.length < 6) {
    cards.push(renderActionCard('Swipe Style Looks', 'Browse curated outfits to discover your color preferences', '🎨', 'swipe'));
  }

  // Show brands if we have them
  if (richness.hasBrands) {
    cards.push(renderBrandsCard(profile));
  } else if (cards.length < 6) {
    cards.push(renderActionCard('Explore Brands', 'Shop to discover which brands resonate with you', '🏷️', 'shop'));
  }

  // Show harmony if we have it
  if (richness.hasHarmony) {
    cards.push(renderHarmonyCard(profile));
  } else if (cards.length < 6) {
    cards.push(renderActionCard('Rate Outfits', 'Thumbs up complete looks to build styling intelligence', '👍', 'outfits'));
  }

  // Show fit if we have it
  if (richness.hasFits) {
    cards.push(renderFitCard(profile));
  } else if (cards.length < 6) {
    cards.push(renderActionCard('Try On & Review', 'Share feedback on items to refine fit preferences', '👔', 'feedback'));
  }

  // Show price if we have it
  if (richness.hasPrice) {
    cards.push(renderPriceCard(profile));
  } else if (cards.length < 6 && richness.confidence >= 2) {
    cards.push(renderActionCard('Make a Purchase', 'Buy items to establish your price preferences', '💳', 'purchase'));
  }

  // If we still need more cards and have low confidence, suggest more activities
  while (cards.length < 6 && richness.confidence < 3) {
    if (!richness.hasSwipes) {
      cards.push(renderActionCard('Browse Looks', 'Swipe through curated styles to train your profile', '❤️', 'browse'));
      break;
    } else {
      cards.push(renderActionCard('Chat with Stylist', 'Tell us about your lifestyle and style goals', '💬', 'chat'));
      break;
    }
  }

  return `
    <div class="dashboard-grid">
      ${cards.join('')}
    </div>
  `;
}

function renderActionCard(title, description, icon, actionType) {
  return `
    <div class="grid-card action-card-large" data-action="${actionType}">
      <div class="action-card-icon">${icon}</div>
      <h3 class="action-card-title">${title}</h3>
      <p class="action-card-description">${description}</p>
      <button class="action-card-button">Get Started →</button>
    </div>
  `;
}

function renderPillarsCard(profile) {
  const pillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0)
    .slice(0, 9);

  const pillarColors = {
    romantic: '#e8a5c5',
    bohemian: '#d4a574',
    casual: '#7fb3d5',
    classic: '#2c3e50',
    minimal: '#95a5a6',
    maximal: '#f39c12',
    fashionForward: '#e74c3c',
    athletic: '#27ae60',
    utility: '#8b6f47'
  };

  return `
    <div class="grid-card">
      <h3 class="grid-card-title">Style Pillars</h3>
      <div class="grid-card-content">
        ${pillars.map(([name, value]) => `
          <div class="pillar-row-mini">
            <span class="pillar-name-mini">${formatPillarName(name)}</span>
            <div class="pillar-bar-tiny">
              <div class="pillar-fill-tiny" style="width: ${value}%; background: ${pillarColors[name]}"></div>
            </div>
            <span class="pillar-value-mini">${value}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function formatPillarName(name) {
  // Handle camelCase pillar names
  const formatted = name.replace(/([A-Z])/g, ' $1').trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function renderSubPillarCard(profile) {
  const subPillars = deriveSubPillars(profile);

  return `
    <div class="grid-card sub-pillar-card">
      <h3 class="grid-card-title">Style Nuances</h3>
      <div class="grid-card-content">
        <div class="sub-pillar-intro">Based on your preferences, we see:</div>
        ${subPillars.map(tag => `
          <div class="sub-pillar-tag">
            <span class="sub-pillar-name">${tag.name}</span>
            <span class="sub-pillar-confidence">${Math.round(tag.confidence * 100)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function deriveSubPillars(profile) {
  const tags = [];
  const pillars = profile.pillars;
  const colors = profile.attributeSpaces?.color || {};
  const fits = profile.attributeSpaces?.fit || {};
  const patterns = profile.attributeSpaces?.pattern || {};

  // Get dominant pillar
  const topPillar = Object.entries(pillars)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 5)[0];

  if (!topPillar) return tags;

  const [pillarName, pillarValue] = topPillar;
  const confidence = pillarValue / 100;

  // Derive sub-pillars based on 9 Sparked pillar definitions + attribute combinations
  if (pillarName === 'romantic') {
    if (fits.relaxed > 0.03) {
      tags.push({ name: 'Effortless Romantic', confidence: confidence * 0.9 });
    }
    if (patterns.floral > 0.03 || patterns.texture > 0.05) {
      tags.push({ name: 'Feminine', confidence: confidence * 0.85 });
    }
    if (colors.white > 0.05 || colors.cream > 0.05) {
      tags.push({ name: 'Delicate', confidence: confidence * 0.8 });
    }
  }

  if (pillarName === 'bohemian') {
    if (colors.olive > 0.03 || colors.brown > 0.03) {
      tags.push({ name: 'Earthy', confidence: confidence * 0.9 });
    }
    if (patterns.texture > 0.05) {
      tags.push({ name: 'Artisanal', confidence: confidence * 0.85 });
    }
    tags.push({ name: 'Free-spirited', confidence: confidence * 0.8 });
  }

  if (pillarName === 'casual') {
    if (fits.relaxed > 0.05) {
      tags.push({ name: 'Pragmatic Casual', confidence: confidence * 0.9 });
    }
    if (patterns.solid > 0.08) {
      tags.push({ name: 'Effortless', confidence: confidence * 0.85 });
    }
    tags.push({ name: 'Laid-back', confidence: confidence * 0.75 });
  }

  if (pillarName === 'classic') {
    if (fits.tailored > 0.05) {
      tags.push({ name: 'Timeless Classic', confidence: confidence * 0.9 });
    }
    if (colors.navy > 0.05 || colors.black > 0.05) {
      tags.push({ name: 'Polished', confidence: confidence * 0.85 });
    }
    tags.push({ name: 'Sophisticated', confidence: confidence * 0.8 });
  }

  if (pillarName === 'minimal') {
    if (fits.tailored > 0.05 && (colors.black > 0.05 || colors.white > 0.05)) {
      tags.push({ name: 'Modern Minimal', confidence: confidence * 0.9 });
    }
    if (patterns.solid > 0.08) {
      tags.push({ name: 'Clean-lined', confidence: confidence * 0.85 });
    }
    if (colors.gray > 0.05) {
      tags.push({ name: 'Understated', confidence: confidence * 0.8 });
    }
  }

  if (pillarName === 'maximal') {
    if (patterns.print > 0.05 || patterns.geometric > 0.05 || patterns.floral > 0.05) {
      tags.push({ name: 'Daring Maximal', confidence: confidence * 0.9 });
    }
    tags.push({ name: 'Bold', confidence: confidence * 0.85 });
    tags.push({ name: 'Vibrant', confidence: confidence * 0.8 });
  }

  if (pillarName === 'fashionForward') {
    if (colors.black > 0.08) {
      tags.push({ name: 'Edgy', confidence: confidence * 0.9 });
    }
    tags.push({ name: 'Streetwear', confidence: confidence * 0.85 });
    tags.push({ name: 'Urban', confidence: confidence * 0.8 });
  }

  if (pillarName === 'athletic') {
    tags.push({ name: 'Athleisure', confidence: confidence * 0.9 });
    if (fits.athletic > 0.05) {
      tags.push({ name: 'Performance', confidence: confidence * 0.85 });
    }
    tags.push({ name: 'Sportswear', confidence: confidence * 0.8 });
  }

  if (pillarName === 'utility') {
    if (colors.olive > 0.05 || colors.khaki > 0.05) {
      tags.push({ name: 'Utility Workwear', confidence: confidence * 0.9 });
    }
    if (colors.brown > 0.05) {
      tags.push({ name: 'Rugged', confidence: confidence * 0.85 });
    }
    tags.push({ name: 'Outdoorsy', confidence: confidence * 0.8 });
  }

  // Return top 3-4 tags
  return tags
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);
}

function renderColorsCard(profile) {
  const colors = Object.entries(profile.attributeSpaces?.color || {})
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0.01)
    .slice(0, 5);

  const colorHex = {
    'red': '#e74c3c', 'blue': '#3498db', 'navy': '#2c3e50', 'black': '#2c2c2c',
    'white': '#ecf0f1', 'gray': '#95a5a6', 'brown': '#8b6f47', 'tan': '#d2b48c',
    'olive': '#556b2f', 'burgundy': '#800020', 'khaki': '#c3b091', 'charcoal': '#36454f',
    'green': '#27ae60', 'beige': '#f5f5dc', 'cream': '#fffdd0', 'maroon': '#800000', 'camel': '#c19a6b'
  };

  return `
    <div class="grid-card">
      <h3 class="grid-card-title">Color Palette</h3>
      <div class="grid-card-content">
        ${colors.map(([color, value]) => `
          <div class="color-row-mini">
            <div class="color-dot-mini" style="background: ${colorHex[color] || '#ccc'}"></div>
            <span class="color-name-mini">${capitalize(color)}</span>
            <span class="color-value-mini">${(value * 100).toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderBrandsCard(profile) {
  const brands = profile.brandAffinity.slice(0, 5);

  return `
    <div class="grid-card">
      <h3 class="grid-card-title">Top Brands</h3>
      <div class="grid-card-content">
        ${brands.map(brand => `
          <div class="brand-row-mini">
            <span class="brand-name-mini">${brand.brand}</span>
            <span class="brand-score-mini">${Math.round(brand.score * 100)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderHarmonyCard(profile) {
  const pairings = Object.entries(profile.attributeSpaces?.harmony?.edges || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return `
    <div class="grid-card">
      <h3 class="grid-card-title">Outfit Pairings</h3>
      <div class="grid-card-content">
        ${pairings.map(([pairing, score]) => {
          const [p1, p2] = pairing.split(':');
          return `
            <div class="harmony-row-mini">
              <span class="harmony-text-mini">${p1.split('-')[0]} + ${p2.split('-')[0]}</span>
              <span class="harmony-score-mini">${(score * 100).toFixed(0)}%</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderFitCard(profile) {
  const fits = Object.entries(profile.attributeSpaces?.fit || {})
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0.01)
    .slice(0, 5);

  return `
    <div class="grid-card">
      <h3 class="grid-card-title">Fit Preferences</h3>
      <div class="grid-card-content">
        ${fits.map(([fit, value]) => `
          <div class="fit-row-mini">
            <span class="fit-name-mini">${capitalize(fit)}</span>
            <div class="fit-bar-tiny">
              <div class="fit-fill-tiny" style="width: ${(value * 100)}%"></div>
            </div>
            <span class="fit-value-mini">${(value * 100).toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPriceCard(profile) {
  return `
    <div class="grid-card">
      <h3 class="grid-card-title">Price Range</h3>
      <div class="grid-card-content">
        <div class="price-stat-mini">
          <span class="price-label-mini">Sweet Spot</span>
          <span class="price-value-mini">$${profile.priceRange.sweet}</span>
        </div>
        <div class="price-stat-mini">
          <span class="price-label-mini">Range</span>
          <span class="price-value-mini">$${profile.priceRange.low} - $${profile.priceRange.high}</span>
        </div>
      </div>
    </div>
  `;
}

function renderPersonalHighlights(profile) {
  const highlights = [];

  // Extract the most interesting semantic memories
  const statedMemories = profile.semanticMemory
    .filter(m => m.type === 'stated' && m.weight >= 0.9)
    .slice(0, 1);

  const inferredMemories = profile.semanticMemory
    .filter(m => m.type === 'inferred' && m.weight >= 0.8)
    .slice(0, 1);

  const lifeMemories = profile.semanticMemory
    .filter(m => m.type === 'life_context' && m.weight >= 0.85)
    .slice(0, 1);

  // Add stated memories (direct quotes)
  statedMemories.forEach(mem => {
    highlights.push({
      icon: '💬',
      label: 'You said',
      text: mem.text,
      type: 'stated'
    });
  });

  // Add key life context
  lifeMemories.forEach(mem => {
    highlights.push({
      icon: '🏠',
      label: 'Your life',
      text: mem.text,
      type: 'life_context'
    });
  });

  // Add inferred insights
  inferredMemories.forEach(mem => {
    highlights.push({
      icon: '✨',
      label: 'We noticed',
      text: mem.text,
      type: 'inferred'
    });
  });

  // Add top brand if strong affinity
  const topBrand = profile.brandAffinity[0];
  if (topBrand && topBrand.score >= 0.35) {
    highlights.push({
      icon: '🏷️',
      label: 'Go-to brand',
      text: `${topBrand.brand} is your most-shopped brand`,
      type: 'brand'
    });
  }

  // Add price insight if available
  if (profile.priceRange.sweet) {
    const priceInsight = getPriceInsight(profile.priceRange);
    highlights.push({
      icon: '💰',
      label: 'Your sweet spot',
      text: priceInsight,
      type: 'price'
    });
  }

  // Add fit preference if clear
  if (profile.fitPreferences.liked.length > 0) {
    highlights.push({
      icon: '👕',
      label: 'Perfect fit',
      text: `You prefer ${profile.fitPreferences.liked.join(', ')} fits`,
      type: 'fit'
    });
  }

  // Add top color preference
  const topColor = Object.entries(profile.attributeSpaces?.color || {})
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0.05)[0];

  if (topColor) {
    highlights.push({
      icon: '🎨',
      label: 'Color signature',
      text: `${capitalize(topColor[0])} shows up in ${(topColor[1] * 100).toFixed(0)}% of your preferences`,
      type: 'color'
    });
  }

  // Add harmony insight
  const harmonyCount = Object.keys(profile.attributeSpaces?.harmony?.edges || {}).length;
  if (harmonyCount > 0) {
    highlights.push({
      icon: '✨',
      label: 'Styling intelligence',
      text: `You've built ${harmonyCount} proven outfit combinations`,
      type: 'harmony'
    });
  }

  // If no highlights, show encouraging message
  if (highlights.length === 0) {
    return `
      <div class="personal-highlights">
        <div class="highlights-header">
          <h2>Your Style Story</h2>
          <p class="highlights-subtitle">Start shopping and chatting to build your unique profile</p>
        </div>
      </div>
    `;
  }

  // Take top 4-5 most interesting highlights
  const topHighlights = highlights.slice(0, 5);

  const cards = topHighlights.map(h => `
    <div class="highlight-card ${h.type}">
      <div class="highlight-icon">${h.icon}</div>
      <div class="highlight-content">
        <div class="highlight-label">${h.label}</div>
        <div class="highlight-text">${h.text}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="personal-highlights">
      <div class="highlights-header">
        <h2>What Makes Your Style Unique</h2>
        <p class="highlights-subtitle">The details that define your look</p>
      </div>
      <div class="highlights-grid">
        ${cards}
      </div>
    </div>
  `;
}

function getPriceInsight(priceRange) {
  const sweet = priceRange.sweet;
  if (sweet < 75) return `Quality finds around $${sweet} — smart value`;
  if (sweet < 150) return `Investing around $${sweet} — balanced quality`;
  return `Premium pieces around $${sweet} — elevated quality`;
}

function renderPersonalHighlights(profile) {
  const highlights = [];

  // Extract the most interesting semantic memories
  const statedMemories = profile.semanticMemory
    .filter(m => m.type === 'stated' && m.weight >= 0.9)
    .slice(0, 1);

  const inferredMemories = profile.semanticMemory
    .filter(m => m.type === 'inferred' && m.weight >= 0.8)
    .slice(0, 1);

  const lifeMemories = profile.semanticMemory
    .filter(m => m.type === 'life_context' && m.weight >= 0.85)
    .slice(0, 1);

  // Add stated memories (direct quotes)
  statedMemories.forEach(mem => {
    highlights.push({
      icon: '💬',
      label: 'You said',
      text: mem.text,
      type: 'stated'
    });
  });

  // Add key life context
  lifeMemories.forEach(mem => {
    highlights.push({
      icon: '🏠',
      label: 'Your life',
      text: mem.text,
      type: 'life_context'
    });
  });

  // Add inferred insights
  inferredMemories.forEach(mem => {
    highlights.push({
      icon: '✨',
      label: 'We noticed',
      text: mem.text,
      type: 'inferred'
    });
  });

  // Add top brand if strong affinity
  const topBrand = profile.brandAffinity[0];
  if (topBrand && topBrand.score >= 0.35) {
    highlights.push({
      icon: '🏷️',
      label: 'Go-to brand',
      text: `${topBrand.brand} is your most-shopped brand`,
      type: 'brand'
    });
  }

  // Add price insight if available
  if (profile.priceRange.sweet) {
    const priceInsight = getPriceInsight(profile.priceRange);
    highlights.push({
      icon: '💰',
      label: 'Your sweet spot',
      text: priceInsight,
      type: 'price'
    });
  }

  // Add fit preference if clear
  if (profile.fitPreferences.liked.length > 0) {
    highlights.push({
      icon: '👕',
      label: 'Perfect fit',
      text: `You prefer ${profile.fitPreferences.liked.join(', ')} fits`,
      type: 'fit'
    });
  }

  // If no highlights, show encouraging message
  if (highlights.length === 0) {
    return `
      <div class="personal-highlights">
        <div class="highlights-header">
          <h2>Your Style Story</h2>
          <p class="highlights-subtitle">Start shopping and chatting to build your unique profile</p>
        </div>
      </div>
    `;
  }

  // Take top 4-5 most interesting highlights
  const topHighlights = highlights.slice(0, 5);

  const cards = topHighlights.map(h => `
    <div class="highlight-card ${h.type}">
      <div class="highlight-icon">${h.icon}</div>
      <div class="highlight-content">
        <div class="highlight-label">${h.label}</div>
        <div class="highlight-text">${h.text}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="personal-highlights">
      <div class="highlights-header">
        <h2>What Makes Your Style Unique</h2>
        <p class="highlights-subtitle">The details that define your look</p>
      </div>
      <div class="highlights-grid">
        ${cards}
      </div>
    </div>
  `;
}

function getPriceInsight(priceRange) {
  const sweet = priceRange.sweet;
  if (sweet < 75) return `Quality finds around $${sweet} — smart value`;
  if (sweet < 150) return `Investing around $${sweet} — balanced quality`;
  return `Premium pieces around $${sweet} — elevated quality`;
}

function renderPillarsSection(profile, previousProfile) {
  const pillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, value]) => value > 0);

  if (pillars.length === 0) {
    return `
      <div class="dashboard-section">
        <div class="section-header">
          <div class="section-title">
            <span class="section-title-icon">🎨</span>
            <span>Your Style DNA</span>
          </div>
        </div>
        <div class="section-content">
          <div class="empty-state">
            <div class="empty-state-icon">🎯</div>
            <div class="empty-state-text">Take the style quiz to discover your style DNA</div>
          </div>
        </div>
      </div>
    `;
  }

  // Get top 3 pillars for hero cards
  const topPillars = pillars.slice(0, 3);

  // Pillar descriptions
  const pillarDescriptions = {
    utility: 'Bold, Daring, Creative',
    classic: 'Elegant, Tailored, Structure',
    minimal: 'Clean, Simple, Intentional',
    outdoor: 'Adventure-Ready, Technical',
    luxe: 'Refined, Elevated, Premium',
    streetwear: 'Modern, Expressive, Bold'
  };

  // Hero cards with fashion photos
  const heroCards = topPillars.map(([name, value]) => {
    const previousValue = previousProfile?.pillars?.[name] || 0;
    const delta = value - previousValue;
    const deltaDisplay = delta !== 0 ? `<span class="hero-delta ${delta > 0 ? 'positive' : 'negative'}">${delta > 0 ? '+' : ''}${delta}%</span>` : '';

    return `
      <div class="style-hero-card ${name}">
        <div class="style-hero-images">
          <div class="style-hero-img"></div>
          <div class="style-hero-img"></div>
          <div class="style-hero-img"></div>
        </div>
        <div class="style-hero-content">
          <div class="style-hero-header">
            <h3>${capitalize(name)}</h3>
            <div class="circular-progress">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="#e5e5e5" stroke-width="4"/>
                <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="4"
                  stroke-dasharray="${value * 1.57} 157"
                  stroke-dashoffset="39.25"
                  transform="rotate(-90 30 30)"
                  class="progress-circle ${name}"/>
                <text x="30" y="35" text-anchor="middle" font-size="14" font-weight="500">${value}%</text>
              </svg>
              ${deltaDisplay}
            </div>
          </div>
          <p class="style-hero-description">${pillarDescriptions[name]}</p>
          <button class="explore-btn">Explore ${capitalize(name)}</button>
        </div>
      </div>
    `;
  }).join('');

  // All pillars chart view
  const allPillarsChart = pillars.map(([name, value]) => {
    return `
      <div class="pillar-chart-item">
        <div class="pillar-chart-label">
          <span class="pillar-chart-name">${capitalize(name)}</span>
          <span class="pillar-chart-value">${value}%</span>
        </div>
        <div class="pillar-chart-bar">
          <div class="pillar-chart-fill ${name}" style="width: ${value}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dashboard-section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-title-icon">🎨</span>
          <span>Your Style Breakdown</span>
        </div>
        <div class="section-badge">${pillars.length} styles identified</div>
      </div>
      <div class="section-content">
        <div class="style-hero-grid">
          ${heroCards}
        </div>

        <div class="style-chart-section">
          <h4 class="chart-title">All Style Pillars</h4>
          <div class="pillar-chart">
            ${allPillarsChart}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBrandsSection(profile) {
  if (profile.brandAffinity.length === 0) {
    return `
      <div class="dashboard-section">
        <div class="section-header">
          <div class="section-title">
            <span class="section-title-icon">🏷️</span>
            <span>Your Brands</span>
          </div>
        </div>
        <div class="section-content">
          <div class="empty-state">
            <div class="empty-state-icon">🛍️</div>
            <div class="empty-state-text">Shop and browse to discover your favorite brands</div>
          </div>
        </div>
      </div>
    `;
  }

  const brands = profile.brandAffinity.slice(0, 8).map(brand => {
    const score = Math.round(brand.score * 100);
    const strongClass = brand.score >= 0.3 ? 'strong' : '';
    const initials = brand.brand.split(' ').map(w => w[0]).join('').slice(0, 2);

    return `
      <div class="brand-card ${strongClass}">
        <div class="brand-logo">${initials}</div>
        <div class="brand-name">${brand.brand}</div>
        <div class="brand-score">${score}% affinity</div>
      </div>
    `;
  }).join('');

  return `
    <div class="dashboard-section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-title-icon">🏷️</span>
          <span>Your Brands</span>
        </div>
        <div class="section-badge">${profile.brandAffinity.length} brands tracked</div>
      </div>
      <div class="section-content">
        <div class="brand-grid">
          ${brands}
        </div>
      </div>
    </div>
  `;
}

function renderRecommendations(profile) {
  const recommendations = [];

  // Low confidence - suggest quiz
  if (profile.confidence.overall < 2) {
    recommendations.push({
      icon: '📋',
      title: 'Take the Style Quiz',
      description: 'Help us learn your preferences faster with a 2-minute quiz'
    });
  }

  // No purchases
  const hasPurchases = profile.brandAffinity.some(b => b.sources.includes('purchase'));
  if (!hasPurchases) {
    recommendations.push({
      icon: '🛍️',
      title: 'Make Your First Purchase',
      description: 'Your purchase history helps us understand your true preferences'
    });
  }

  // Few memories
  if (profile.semanticMemory.length < 5) {
    recommendations.push({
      icon: '💬',
      title: 'Chat with a Stylist',
      description: 'Tell us about your lifestyle and style goals in a quick conversation'
    });
  }

  // No RAL
  const hasRAL = profile.semanticMemory.some(m => m.source === 'ral');
  if (!hasRAL && profile.confidence.overall >= 2) {
    recommendations.push({
      icon: '✨',
      title: 'Request a Look',
      description: 'Get personalized outfit recommendations for an upcoming occasion'
    });
  }

  // Few swipes
  const hasSwipes = profile.brandAffinity.some(b => b.sources.includes('swipe_like'));
  if (!hasSwipes) {
    recommendations.push({
      icon: '❤️',
      title: 'Browse Style Looks',
      description: 'Swipe through curated looks to train your style profile'
    });
  }

  if (recommendations.length === 0) {
    return '';
  }

  const cards = recommendations.slice(0, 3).map(rec => `
    <div class="recommendation-card">
      <div class="recommendation-icon">${rec.icon}</div>
      <div class="recommendation-content">
        <div class="recommendation-title">${rec.title}</div>
        <div class="recommendation-description">${rec.description}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="dashboard-section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-title-icon">💡</span>
          <span>Improve Your Profile</span>
        </div>
      </div>
      <div class="section-content">
        <div class="recommendations">
          ${cards}
        </div>
      </div>
    </div>
  `;
}

function renderTechnicalStats(profile) {
  // Calculate activity metrics
  const quizzesTaken = profile.sessionsProcessed > 0 ? 1 : 0; // Simplified
  const swipeStacks = profile.brandAffinity.filter(b =>
    b.sources.includes('swipe_like')
  ).length;
  const outfitsLiked = profile.brandAffinity.reduce((sum, b) => {
    return sum + (b.sources.includes('swipe_like') ? 1 : 0);
  }, 0);
  const purchases = profile.brandAffinity.filter(b =>
    b.sources.includes('purchase')
  ).length;

  return `
    <div class="dashboard-section technical-stats-section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-title-icon">📊</span>
          <span>Your Activity</span>
        </div>
      </div>
      <div class="section-content">
        <div class="tech-stats-grid">
          <div class="tech-stat">
            <div class="tech-stat-value">${quizzesTaken}</div>
            <div class="tech-stat-label">Quizzes Taken</div>
          </div>
          <div class="tech-stat">
            <div class="tech-stat-value">${profile.sessionsProcessed}</div>
            <div class="tech-stat-label">Sessions Tracked</div>
          </div>
          <div class="tech-stat">
            <div class="tech-stat-value">${outfitsLiked}</div>
            <div class="tech-stat-label">Outfits Liked</div>
          </div>
          <div class="tech-stat">
            <div class="tech-stat-value">${purchases}</div>
            <div class="tech-stat-label">Purchases</div>
          </div>
          <div class="tech-stat">
            <div class="tech-stat-value">${profile.priceRange.sweet ? '$' + profile.priceRange.sweet : '—'}</div>
            <div class="tech-stat-label">Avg Purchase</div>
          </div>
          <div class="tech-stat">
            <div class="tech-stat-value">${profile.semanticMemory.length}</div>
            <div class="tech-stat-label">Style Insights</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="profile-dashboard">
      <div class="empty-state" style="padding: 100px 20px;">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-text" style="font-size: 18px; margin-bottom: 12px;">
          No profile data yet
        </div>
        <div style="font-size: 14px; color: #767676;">
          Run <code>node index.js apply session_01</code> to start building a profile
        </div>
      </div>
    </div>
  `;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render cold start profile (0 data, new customer)
 */
function renderColdStartProfile() {
  const container = document.getElementById('profilePanel');

  container.innerHTML = `
    <div class="cold-start-container">
      <div class="cold-start-hero">
        <h1 class="cold-start-headline">Welcome to Your Personal Style Profile</h1>
        <p class="cold-start-subheadline">Let's build something amazing together. In just a few minutes, we'll create a personalized style profile that gets smarter with every interaction.</p>
      </div>

      <div class="cold-start-steps">
        <div class="cold-start-card primary">
          <div class="step-number">1</div>
          <div class="step-icon">📋</div>
          <h3 class="step-title">Take Your Style Quiz</h3>
          <p class="step-description">Answer 5 quick questions to establish your style foundation. This gives us your core aesthetic and helps us understand what you're drawn to.</p>
          <div class="step-time">⏱ 2 minutes</div>
          <button class="step-cta">Start Quiz →</button>
        </div>

        <div class="cold-start-card secondary">
          <div class="step-number">2</div>
          <div class="step-icon">❤️</div>
          <h3 class="step-title">Swipe on Looks</h3>
          <p class="step-description">Browse curated outfits and swipe right on what you love. This trains your profile on colors, fits, and styling details.</p>
          <div class="step-time">⏱ 5 minutes</div>
          <button class="step-cta secondary-cta">Browse Looks →</button>
        </div>

        <div class="cold-start-card secondary">
          <div class="step-number">3</div>
          <div class="step-icon">🛍️</div>
          <h3 class="step-title">Shop & Discover</h3>
          <p class="step-description">Browse and shop items you love. Each interaction—from browsing to purchasing—makes your profile smarter and more personalized.</p>
          <div class="step-time">⏱ When you're ready</div>
          <button class="step-cta secondary-cta">Start Shopping →</button>
        </div>
      </div>

      <div class="cold-start-benefits">
        <h3 class="benefits-title">What You'll Get</h3>
        <div class="benefits-grid">
          <div class="benefit-item">
            <div class="benefit-icon">🎯</div>
            <div class="benefit-text">Personalized product recommendations</div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">✨</div>
            <div class="benefit-text">Custom outfit suggestions</div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">🎨</div>
            <div class="benefit-text">Your unique color palette</div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">🏷️</div>
            <div class="benefit-text">Favorite brand discovery</div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">💬</div>
            <div class="benefit-text">Smarter stylist conversations</div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">🚀</div>
            <div class="benefit-text">Faster, better shopping</div>
          </div>
        </div>
      </div>

      <div class="cold-start-footer">
        <p class="footer-privacy">🔒 Your style profile is private and secure. We'll never share your data without your permission.</p>
      </div>
    </div>
  `;
}

// ========== MULTI-SPACE VISUALIZATIONS ==========

function renderMultiSpaceSection(profile) {
  const hasMultiSpace = profile.attributeSpaces && Object.keys(profile.attributeSpaces).length > 0;
  
  if (!hasMultiSpace) {
    return '';
  }

  const colorSpace = profile.attributeSpaces.color;
  const fitSpace = profile.attributeSpaces.fit;
  const harmonySpace = profile.attributeSpaces.harmony;

  const hasColorData = Object.values(colorSpace).some(v => v > 0.01);
  const hasFitData = Object.values(fitSpace).some(v => v > 0.01);
  const hasHarmonyData = Object.keys(harmonySpace.edges || {}).length > 0;

  if (!hasColorData && !hasFitData && !hasHarmonyData) {
    return '';
  }

  return `
    <div class="dashboard-section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-title-icon">🎨</span>
          <span>Style Details</span>
        </div>
        <div class="section-badge">Multi-space analysis</div>
      </div>
      <div class="section-content">
        <div class="multispace-grid">
          ${hasColorData ? renderColorAffinityCard(colorSpace) : ''}
          ${hasHarmonyData ? renderHarmonyCard(harmonySpace) : ''}
          ${hasFitData ? renderFitPreferencesCard(fitSpace) : ''}
        </div>
      </div>
    </div>
  `;
}

function renderColorAffinityCard(colorSpace) {
  const topColors = Object.entries(colorSpace)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0.01)
    .slice(0, 6);

  const colorHex = {
    'red': '#e74c3c', 'blue': '#3498db', 'navy': '#2c3e50', 'black': '#2c2c2c',
    'white': '#ecf0f1', 'gray': '#95a5a6', 'brown': '#8b6f47', 'tan': '#d2b48c',
    'olive': '#556b2f', 'burgundy': '#800020', 'khaki': '#c3b091', 'charcoal': '#36454f',
    'green': '#27ae60', 'beige': '#f5f5dc', 'cream': '#fffdd0', 'maroon': '#800000'
  };

  return `
    <div class="multispace-card">
      <h4 class="multispace-card-title">Color Preferences</h4>
      <div class="color-grid-compact">
        ${topColors.map(([color, value]) => `
          <div class="color-item-compact">
            <div class="color-swatch-compact" style="background: ${colorHex[color] || '#ccc'}"></div>
            <div class="color-name-small">${capitalize(color)}</div>
            <div class="color-value-small">${(value * 100).toFixed(0)}%</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderHarmonyCard(harmonySpace) {
  const pairings = Object.entries(harmonySpace.edges || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return `
    <div class="multispace-card">
      <h4 class="multispace-card-title">Outfit Pairings</h4>
      <div class="harmony-list-compact">
        ${pairings.map(([pairing, score]) => {
          const [p1, p2] = pairing.split(':');
          return `
            <div class="harmony-pairing-compact">
              <div class="pairing-text">
                <span class="pairing-piece">${p1.split('-')[0]}</span> + 
                <span class="pairing-piece">${p2.split('-')[0]}</span>
              </div>
              <div class="pairing-score">${(score * 100).toFixed(0)}%</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderFitPreferencesCard(fitSpace) {
  const fits = Object.entries(fitSpace)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0.01)
    .slice(0, 4);

  return `
    <div class="multispace-card">
      <h4 class="multispace-card-title">Fit Preferences</h4>
      <div class="fit-list-compact">
        ${fits.map(([fit, value]) => `
          <div class="fit-item-compact">
            <span class="fit-name-small">${capitalize(fit)}</span>
            <div class="fit-bar-small">
              <div class="fit-fill-small" style="width: ${(value * 100)}%"></div>
            </div>
            <span class="fit-value-small">${(value * 100).toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
