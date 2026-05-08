/**
 * Brain Panel Component
 * Internal debug view at bottom of customer view
 */

function renderBrainPanel(profile, previousProfile = null, fullHistory = [], currentIndex = 0) {
  const container = document.getElementById('brainPanel');

  if (!profile) {
    container.innerHTML = '';
    return;
  }

  // Calculate trajectory for vector space
  const trajectory = calculateTrajectory(fullHistory);
  const coordinates = calculateStyleCoordinates(profile.pillars);

  container.innerHTML = `
    <div class="brain-view">
      <div class="brain-view-header">
        <h2>🧠 Internal Brain View</h2>
        <span class="brain-view-badge">Debug Only</span>
      </div>

      ${renderSessionHistory(fullHistory, currentIndex)}

      <!-- Vector Space Analysis Sections -->
      <div class="vector-space-exploded">
        <h2 class="brain-section-title">📊 Style Vector Space Analysis</h2>
        <div class="brain-section-subtitle">Multi-dimensional mathematical representation of fashion profile</div>

        ${renderPillarSpaceSection(profile, trajectory, coordinates)}
        ${renderColorSpaceSection(profile)}
        ${renderFitSpaceSection(profile)}
        ${renderHarmonySpaceSection(profile)}
      </div>

      <div class="brain-grid">
        ${renderSemanticMemory(profile, previousProfile)}
        ${renderDetailedBrandAffinity(profile)}
        ${renderPriceDetails(profile)}
        ${renderFitPreferences(profile)}
        ${renderNegatives(profile)}
        ${renderLifeContext(profile)}
      </div>
    </div>
  `;
}

function renderSessionHistory(fullHistory, currentIndex) {
  if (fullHistory.length === 0) {
    return `
      <div class="session-history-section">
        <h3>Session History</h3>
        <div class="history-note">No history available</div>
      </div>
    `;
  }

  const rows = fullHistory.map((snapshot, index) => {
    const profile = snapshot.profile;
    const date = new Date(snapshot.timestamp).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const sessionNum = index + 1;
    const isCurrent = index === currentIndex;
    const rowClass = isCurrent ? 'current-row' : '';

    // Handle different pillar formats (old 6 pillars vs new 9 pillars)
    const pillars = profile.pillars;
    const utility = pillars.utility || 0;
    const classic = pillars.classic || 0;
    const minimal = pillars.minimal || 0;
    const outdoor = pillars.outdoor || pillars.athletic || 0; // Map athletic to outdoor
    const luxe = pillars.luxe || pillars.romantic || 0; // Map romantic to luxe
    const streetwear = pillars.streetwear || pillars.fashionForward || 0; // Map fashFwd to streetwear

    // Handle missing confidence data
    const confidenceLabel = profile.confidence?.label || '—';

    return `
      <tr class="${rowClass}">
        <td>${isCurrent ? '<strong>Session ' + sessionNum + '</strong>' : 'Session ' + sessionNum}</td>
        <td>${date}</td>
        <td>${utility}%</td>
        <td>${classic}%</td>
        <td>${minimal}%</td>
        <td>${outdoor}%</td>
        <td>${luxe}%</td>
        <td>${streetwear}%</td>
        <td>${confidenceLabel}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="session-history-section">
      <h3>Session History - Pillar Evolution</h3>
      <div class="history-table-wrapper">
        <table class="history-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Date</th>
              <th>Utility</th>
              <th>Classic</th>
              <th>Minimal</th>
              <th>Outdoor</th>
              <th>Luxe</th>
              <th>Streetwear</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="history-note">
          Yellow highlighted row shows current session. Track how style pillars evolved across ${fullHistory.length} sessions.
        </div>
      </div>
    </div>
  `;
}

function renderSemanticMemory(profile, previousProfile) {
  if (profile.semanticMemory.length === 0) {
    return `
      <div class="brain-card">
        <h3>Semantic Memory (0)</h3>
        <div class="empty-state">No memories yet</div>
      </div>
    `;
  }

  const previousMemoryIds = new Set(
    (previousProfile?.semanticMemory || []).map(m => m.id)
  );

  const memories = profile.semanticMemory.slice(0, 6).map(mem => {
    const isNew = !previousMemoryIds.has(mem.id);
    const newClass = isNew ? 'new' : '';
    const typeLabel = mem.type.replace('_', ' ');

    return `
      <div class="memory-item ${mem.type} ${newClass}">
        <div class="memory-header">
          <span>${typeLabel}</span>
          <span>weight: ${mem.weight.toFixed(2)}</span>
        </div>
        <div>${mem.text}</div>
      </div>
    `;
  }).join('');

  const remaining = profile.semanticMemory.length - 6;
  const remainingText = remaining > 0
    ? `<div style="text-align: center; padding: 12px; color: #767676; font-size: 12px;">+ ${remaining} more</div>`
    : '';

  return `
    <div class="brain-card">
      <h3>Semantic Memory (${profile.semanticMemory.length})</h3>
      <div class="memory-list">
        ${memories}
        ${remainingText}
      </div>
    </div>
  `;
}

function renderDetailedBrandAffinity(profile) {
  if (profile.brandAffinity.length === 0) {
    return `
      <div class="brain-card">
        <h3>Brand Affinity Scores</h3>
        <div class="empty-state">No brands yet</div>
      </div>
    `;
  }

  const brands = profile.brandAffinity.slice(0, 8).map(brand => {
    const score = (brand.score * 100).toFixed(0);
    const sources = brand.sources.join(', ');

    return `
      <div style="padding: 12px 0; border-bottom: 1px solid #eeeeee;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-weight: 500;">${brand.brand}</span>
          <span style="font-weight: 500;">${score}%</span>
        </div>
        <div style="font-size: 11px; color: #767676;">
          ${sources} • ${brand.confidence}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="brain-card">
      <h3>Brand Affinity Scores</h3>
      <div>
        ${brands}
      </div>
    </div>
  `;
}

function renderPriceDetails(profile) {
  const { low, high, sweet, confidence } = profile.priceRange;

  if (!low) {
    return `
      <div class="brain-card">
        <h3>Price Analysis</h3>
        <div class="empty-state">No purchase data yet</div>
      </div>
    `;
  }

  return `
    <div class="brain-card">
      <h3>Price Analysis</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <div style="font-size: 11px; color: #767676; margin-bottom: 4px;">LOW</div>
          <div style="font-size: 24px; font-weight: 500;">$${low}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #767676; margin-bottom: 4px;">SWEET SPOT</div>
          <div style="font-size: 24px; font-weight: 500;">$${sweet}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #767676; margin-bottom: 4px;">HIGH</div>
          <div style="font-size: 24px; font-weight: 500;">$${high}</div>
        </div>
        <div style="padding: 8px; background: #f9f9f9; border-radius: 4px; font-size: 12px;">
          Confidence: <strong>${confidence}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderFitPreferences(profile) {
  const { liked, disliked } = profile.fitPreferences;

  if (liked.length === 0 && disliked.length === 0) {
    return `
      <div class="brain-card">
        <h3>Fit Preferences</h3>
        <div class="empty-state">No fit signals yet</div>
      </div>
    `;
  }

  const likedTags = liked.map(fit =>
    `<span style="padding: 4px 10px; background: #e8f5e9; border-radius: 12px; font-size: 12px;">${fit}</span>`
  ).join(' ');

  const dislikedTags = disliked.map(fit =>
    `<span style="padding: 4px 10px; background: #ffebee; border-radius: 12px; font-size: 12px;">${fit}</span>`
  ).join(' ');

  return `
    <div class="brain-card">
      <h3>Fit Preferences</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <div style="font-size: 11px; color: #767676; margin-bottom: 8px;">LIKED</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${likedTags || '<span style="color: #767676; font-size: 12px;">None yet</span>'}
          </div>
        </div>
        <div>
          <div style="font-size: 11px; color: #767676; margin-bottom: 8px;">DISLIKED</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${dislikedTags || '<span style="color: #767676; font-size: 12px;">None yet</span>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderNegatives(profile) {
  if (profile.negatives.length === 0) {
    return `
      <div class="brain-card">
        <h3>Negatives</h3>
        <div class="empty-state">No negatives flagged</div>
      </div>
    `;
  }

  const tags = profile.negatives.map(neg => {
    const bgColor = neg.strength === 'strong' ? '#ffebee' : '#f5f5f5';
    return `
      <span style="padding: 6px 12px; background: ${bgColor}; border-radius: 12px; font-size: 12px;">
        ${neg.value} <span style="color: #767676;">(${neg.strength})</span>
      </span>
    `;
  }).join(' ');

  return `
    <div class="brain-card">
      <h3>Negatives (${profile.negatives.length})</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${tags}
      </div>
    </div>
  `;
}

function renderLifeContext(profile) {
  const { hobbies, family, professional, other } = profile.lifeContext;
  const total = hobbies.length + family.length + professional.length + other.length;

  if (total === 0) {
    return `
      <div class="brain-card">
        <h3>Life Context</h3>
        <div class="empty-state">No life context yet</div>
      </div>
    `;
  }

  const sections = [];

  if (hobbies.length > 0) {
    sections.push(`
      <div>
        <div style="font-size: 11px; color: #767676; margin-bottom: 6px;">HOBBIES</div>
        <div style="font-size: 14px;">${hobbies.join(', ')}</div>
      </div>
    `);
  }

  if (family.length > 0) {
    sections.push(`
      <div>
        <div style="font-size: 11px; color: #767676; margin-bottom: 6px;">FAMILY</div>
        <div style="font-size: 14px;">${family.join(', ')}</div>
      </div>
    `);
  }

  if (professional.length > 0) {
    sections.push(`
      <div>
        <div style="font-size: 11px; color: #767676; margin-bottom: 6px;">PROFESSIONAL</div>
        <div style="font-size: 14px;">${professional.join(', ')}</div>
      </div>
    `);
  }

  return `
    <div class="brain-card">
      <h3>Life Context</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${sections.join('')}
      </div>
    </div>
  `;
}

/**
 * Render Pillar Space section (standalone, no tabs)
 */
function renderPillarSpaceSection(profile, trajectory, coordinates) {
  return `
    <div class="vector-space-standalone-section">
      <div class="vs-section-header">
        <h3>📊 Pillar Space (9D)</h3>
        <span class="vs-section-badge">9-Dimensional Style Vector</span>
      </div>
      ${renderPillarSpaceView(profile, trajectory, coordinates)}

      <div class="vs-section-header" style="margin-top: 32px;">
        <h3>⚖️ Signal Weights</h3>
        <span class="vs-section-badge">Interaction Frequency Analysis</span>
      </div>
      ${renderSignalWeights(profile)}
    </div>
  `;
}

/**
 * Render Color Affinity Space section (standalone, no tabs)
 */
function renderColorSpaceSection(profile) {
  if (!profile.attributeSpaces || !profile.attributeSpaces.color) {
    return '';
  }

  return `
    <div class="vector-space-standalone-section">
      <div class="vs-section-header">
        <h3>🎨 Color Affinity Space (16D)</h3>
        <span class="vs-section-badge">16-Dimensional Color Preferences</span>
      </div>
      ${renderColorSpaceView(profile)}
    </div>
  `;
}

/**
 * Render Fit Preferences Space section (standalone, no tabs)
 */
function renderFitSpaceSection(profile) {
  if (!profile.attributeSpaces || !profile.attributeSpaces.fit) {
    return '';
  }

  return `
    <div class="vector-space-standalone-section">
      <div class="vs-section-header">
        <h3>👔 Fit Preferences Space (7D)</h3>
        <span class="vs-section-badge">7-Dimensional Fit Vector</span>
      </div>
      ${renderFitSpaceView(profile)}
    </div>
  `;
}

/**
 * Render Outfit Harmony Space section (standalone, no tabs)
 */
function renderHarmonySpaceSection(profile) {
  if (!profile.attributeSpaces || !profile.attributeSpaces.harmony) {
    return '';
  }

  return `
    <div class="vector-space-standalone-section">
      <div class="vs-section-header">
        <h3>🤝 Outfit Harmony Space (Graph)</h3>
        <span class="vs-section-badge">Style Compatibility Network</span>
      </div>
      ${renderHarmonySpaceView(profile)}
    </div>
  `;
}
