/**
 * Vector Space Visualization Component
 * Scientific representation of style profile as multi-dimensional vector space
 */

/**
 * Render the complete vector space analysis section
 */
function renderVectorSpaceSection(profile, history = []) {
  if (!profile || profile.sessionsProcessed === 0) {
    return '';
  }

  const coordinates = calculateStyleCoordinates(profile.pillars);
  const trajectory = calculateTrajectory(history);
  const hasMultiSpace = profile.attributeSpaces && Object.keys(profile.attributeSpaces).length > 0;

  return `
    <div class="vector-space-section">
      <div class="vs-header">
        <h2>Style Vector Space</h2>
        <div class="vs-subtitle">Multi-dimensional analysis of your fashion profile</div>
        ${hasMultiSpace ? renderSpaceTabs() : ''}
      </div>

      ${hasMultiSpace ? `
        <div class="space-views">
          <div id="space-pillar" class="space-view active">
            ${renderPillarSpaceView(profile, trajectory, coordinates)}
          </div>
          <div id="space-color" class="space-view">
            ${renderColorSpaceView(profile)}
          </div>
          <div id="space-fit" class="space-view">
            ${renderFitSpaceView(profile)}
          </div>
          <div id="space-harmony" class="space-view">
            ${renderHarmonySpaceView(profile)}
          </div>
        </div>
      ` : `
        ${renderPillarSpaceView(profile, trajectory, coordinates)}
      `}
    </div>
  `;
}

/**
 * Render space selector tabs
 */
function renderSpaceTabs() {
  return `
    <div class="vs-tabs">
      <button class="vs-tab active" data-space="pillar">
        <span class="tab-icon">📊</span>
        <span class="tab-label">Pillar Space</span>
        <span class="tab-dim">9D</span>
      </button>
      <button class="vs-tab" data-space="color">
        <span class="tab-icon">🎨</span>
        <span class="tab-label">Color Affinity</span>
        <span class="tab-dim">16D</span>
      </button>
      <button class="vs-tab" data-space="fit">
        <span class="tab-icon">👔</span>
        <span class="tab-label">Fit Preferences</span>
        <span class="tab-dim">7D</span>
      </button>
      <button class="vs-tab" data-space="harmony">
        <span class="tab-icon">🤝</span>
        <span class="tab-label">Outfit Harmony</span>
        <span class="tab-dim">Graph</span>
      </button>
    </div>
  `;
}

/**
 * Render pillar space view (original visualization)
 */
function renderPillarSpaceView(profile, trajectory, coordinates) {
  return `
    <div class="vs-grid">
      ${renderVectorPlot(profile, trajectory)}
      ${renderCoordinateSystem(coordinates, profile)}
      ${renderDistanceMetrics(profile)}
    </div>
    ${renderInteractionMatrix(profile)}
  `;
}

/**
 * Render the main 2D vector space plot
 */
function renderVectorPlot(profile, trajectory) {
  const coordinates = calculateStyleCoordinates(profile.pillars);
  const confidence = profile.confidence.overall / 5; // 0-1

  // Generate SVG visualization
  const plotSize = 400;
  const center = plotSize / 2;
  const scale = 140; // Scale factor for coordinates

  // Map 6D space to 2D using custom projection
  const projection = projectTo2D(profile.pillars);
  const x = center + (projection.x * scale);
  const y = center + (projection.y * scale);

  // Confidence radius (uncertainty)
  const confidenceRadius = (1 - confidence) * 60 + 10;

  // Trajectory points
  const trajectoryPoints = trajectory.map(point => {
    const proj = projectTo2D(point.pillars);
    return {
      x: center + (proj.x * scale),
      y: center + (proj.y * scale),
      session: point.session
    };
  });

  // Create path for trajectory
  const trajectoryPath = trajectoryPoints.length > 1
    ? trajectoryPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ')
    : '';

  // Pillar direction vectors (9 Sparked pillars)
  const pillarVectors = [
    { name: 'romantic', angle: 0, color: '#e8a5c5' },
    { name: 'bohemian', angle: 40, color: '#d4a574' },
    { name: 'casual', angle: 80, color: '#7fb3d5' },
    { name: 'classic', angle: 120, color: '#2c3e50' },
    { name: 'minimal', angle: 160, color: '#95a5a6' },
    { name: 'maximal', angle: 200, color: '#f39c12' },
    { name: 'fashionForward', angle: 240, color: '#e74c3c' },
    { name: 'athletic', angle: 280, color: '#27ae60' },
    { name: 'utility', angle: 320, color: '#8b6f47' }
  ];

  const vectorLines = pillarVectors.map(v => {
    const rad = (v.angle - 90) * Math.PI / 180;
    const endX = center + Math.cos(rad) * (scale * 1.2);
    const endY = center + Math.sin(rad) * (scale * 1.2);
    const labelX = center + Math.cos(rad) * (scale * 1.4);
    const labelY = center + Math.sin(rad) * (scale * 1.4);

    return `
      <line x1="${center}" y1="${center}" x2="${endX}" y2="${endY}"
        stroke="${v.color}" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="4,4"/>
      <text x="${labelX}" y="${labelY}"
        text-anchor="middle" dominant-baseline="middle"
        font-size="10" font-weight="500" fill="${v.color}" opacity="0.7"
        style="text-transform: uppercase; letter-spacing: 1px;">
        ${v.name}
      </text>
    `;
  }).join('');

  return `
    <div class="vs-card vs-plot-card">
      <div class="vs-card-header">
        <h3>2D Projection</h3>
        <span class="vs-badge">9D → 2D</span>
      </div>
      <div class="vs-card-content">
        <svg width="${plotSize}" height="${plotSize}" class="vector-plot">
          <!-- Background grid -->
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
            </pattern>

            <!-- Gradient for confidence region -->
            <radialGradient id="confidenceGradient">
              <stop offset="0%" stop-color="#667eea" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="#667eea" stop-opacity="0"/>
            </radialGradient>
          </defs>

          <rect width="${plotSize}" height="${plotSize}" fill="url(#grid)"/>

          <!-- Axes -->
          <line x1="0" y1="${center}" x2="${plotSize}" y2="${center}"
            stroke="#ddd" stroke-width="2"/>
          <line x1="${center}" y1="0" x2="${center}" y2="${plotSize}"
            stroke="#ddd" stroke-width="2"/>

          <!-- Pillar direction vectors -->
          ${vectorLines}

          <!-- Confidence region (uncertainty ellipse) -->
          <circle cx="${x}" cy="${y}" r="${confidenceRadius}"
            fill="url(#confidenceGradient)" stroke="#667eea" stroke-width="2" stroke-opacity="0.3"
            stroke-dasharray="5,5"/>

          <!-- Trajectory path -->
          ${trajectoryPath ? `
            <path d="${trajectoryPath}" fill="none" stroke="#9b59b6"
              stroke-width="2" stroke-opacity="0.4" stroke-dasharray="5,5"/>
            ${trajectoryPoints.slice(0, -1).map(p => `
              <circle cx="${p.x}" cy="${p.y}" r="3" fill="#9b59b6" opacity="0.5"/>
            `).join('')}
          ` : ''}

          <!-- Current position -->
          <circle cx="${x}" cy="${y}" r="8" fill="#667eea" opacity="0.8"/>
          <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#667eea" stroke-width="2"/>
        </svg>

        <div class="plot-legend">
          <div class="legend-item">
            <div class="legend-marker current"></div>
            <span>Current Position</span>
          </div>
          <div class="legend-item">
            <div class="legend-marker trajectory"></div>
            <span>Evolution Path</span>
          </div>
          <div class="legend-item">
            <div class="legend-marker confidence"></div>
            <span>Confidence Region</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render coordinate system display
 */
function renderCoordinateSystem(coordinates, profile) {
  const coords = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => {
      const normalized = (value / 100).toFixed(3);
      return `
        <div class="coord-row">
          <span class="coord-label">${name.charAt(0).toUpperCase()}${name.slice(1)}</span>
          <span class="coord-value">${normalized}</span>
          <div class="coord-bar">
            <div class="coord-bar-fill" style="width: ${value}%; background: var(--color-${name})"></div>
          </div>
        </div>
      `;
    }).join('');

  const magnitude = calculateMagnitude(profile.pillars);
  const entropy = calculateEntropy(profile.pillars);

  return `
    <div class="vs-card">
      <div class="vs-card-header">
        <h3>Style Coordinates</h3>
        <span class="vs-badge">R⁹</span>
      </div>
      <div class="vs-card-content">
        <div class="coordinates-display">
          ${coords}
        </div>

        <div class="vector-stats">
          <div class="stat-row">
            <span class="stat-label">Magnitude</span>
            <span class="stat-value">||v|| = ${magnitude.toFixed(3)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Entropy</span>
            <span class="stat-value">H = ${entropy.toFixed(3)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Dimensionality</span>
            <span class="stat-value">${countActiveDimensions(profile.pillars)} / 9</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render signal weight visualization
 */
function renderSignalWeights(profile) {
  // Calculate signal strengths
  const signals = [
    {
      type: 'Purchase',
      weight: 1.0,
      count: profile.brandAffinity.filter(b => b.sources.includes('purchase')).length,
      color: '#00a878'
    },
    {
      type: 'Swipe Like',
      weight: 0.6,
      count: profile.brandAffinity.filter(b => b.sources.includes('swipe_like')).length,
      color: '#0055ff'
    },
    {
      type: 'Browse Dwell',
      weight: 0.4,
      count: profile.brandAffinity.filter(b => b.sources.includes('dwell')).length,
      color: '#9b59b6'
    },
    {
      type: 'Chat Message',
      weight: 0.9,
      count: profile.semanticMemory.filter(m => m.source === 'chat').length,
      color: '#00a8a8'
    },
    {
      type: 'Semantic Memory',
      weight: 0.85,
      count: profile.semanticMemory.length,
      color: '#ff9900'
    }
  ];

  const signalBars = signals.map(signal => {
    const effectiveWeight = signal.weight * signal.count;
    const maxWeight = 10; // Normalize scale
    const width = Math.min((effectiveWeight / maxWeight) * 100, 100);

    return `
      <div class="signal-weight-row">
        <div class="signal-info">
          <span class="signal-type">${signal.type}</span>
          <span class="signal-count">${signal.count}× @ ${signal.weight}</span>
        </div>
        <div class="signal-bar-container">
          <div class="signal-bar" style="width: ${width}%; background: ${signal.color}"></div>
        </div>
        <span class="signal-effective">${effectiveWeight.toFixed(1)}</span>
      </div>
    `;
  }).join('');

  const totalWeight = signals.reduce((sum, s) => sum + (s.weight * s.count), 0);

  return `
    <div class="vs-card">
      <div class="vs-card-header">
        <h3>Signal Weights</h3>
        <span class="vs-badge">Σw = ${totalWeight.toFixed(1)}</span>
      </div>
      <div class="vs-card-content">
        <div class="signal-weights">
          ${signalBars}
        </div>

        <div class="weight-formula">
          <code>w_effective = Σ(interaction_type × frequency × recency_decay)</code>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render distance metrics and similarity
 */
function renderDistanceMetrics(profile) {
  // Calculate distances to archetypal style vectors
  const archetypes = {
    'Pure Minimal': { romantic: 0, bohemian: 0, casual: 0, classic: 0, minimal: 100, maximal: 0, fashionForward: 0, athletic: 0, utility: 0 },
    'Pure Classic': { romantic: 0, bohemian: 0, casual: 0, classic: 100, minimal: 0, maximal: 0, fashionForward: 0, athletic: 0, utility: 0 },
    'Balanced': { romantic: 11, bohemian: 11, casual: 11, classic: 11, minimal: 12, maximal: 11, fashionForward: 11, athletic: 11, utility: 11 }
  };

  const distances = Object.entries(archetypes).map(([name, vector]) => {
    const distance = euclideanDistance(profile.pillars, vector);
    const similarity = 1 / (1 + distance / 100); // Normalize to 0-1

    return `
      <div class="distance-row">
        <span class="distance-label">${name}</span>
        <div class="distance-visual">
          <div class="distance-bar" style="width: ${similarity * 100}%"></div>
        </div>
        <span class="distance-value">${(similarity * 100).toFixed(0)}%</span>
      </div>
    `;
  }).join('');

  return `
    <div class="vs-card">
      <div class="vs-card-header">
        <h3>Archetype Similarity</h3>
        <span class="vs-badge">Cosine Distance</span>
      </div>
      <div class="vs-card-content">
        <div class="distance-metrics">
          ${distances}
        </div>

        <div class="metric-note">
          Measures how closely your style aligns with pure archetypes
        </div>
      </div>
    </div>
  `;
}

/**
 * Render interaction contribution matrix
 */
function renderInteractionMatrix(profile) {
  if (profile.sessionsProcessed < 2) {
    return '';
  }

  // Simulate interaction contributions per pillar
  const interactions = ['Purchase', 'Swipe', 'Browse', 'Chat', 'Quiz'];
  const pillars = ['romantic', 'bohemian', 'casual', 'classic', 'minimal', 'maximal', 'fashionForward', 'athletic', 'utility'];

  // Generate contribution matrix (in real app, this would come from historical data)
  const matrix = generateContributionMatrix(profile, interactions, pillars);

  const headerCells = pillars.map(p =>
    `<th class="matrix-header">${p.slice(0, 3).toUpperCase()}</th>`
  ).join('');

  const rows = interactions.map(interaction => {
    const cells = pillars.map(pillar => {
      const value = matrix[interaction][pillar];
      const intensity = Math.abs(value) / 20; // Normalize
      const color = value > 0 ? '#00a878' : '#e11900';

      return `
        <td class="matrix-cell" style="background: ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}">
          ${value > 0 ? '+' : ''}${value}
        </td>
      `;
    }).join('');

    return `
      <tr>
        <td class="matrix-row-header">${interaction}</td>
        ${cells}
      </tr>
    `;
  }).join('');

  return `
    <div class="vs-card vs-matrix-card">
      <div class="vs-card-header">
        <h3>Interaction Contribution Matrix</h3>
        <span class="vs-badge">ΔP per interaction type</span>
      </div>
      <div class="vs-card-content">
        <div class="matrix-container">
          <table class="contribution-matrix">
            <thead>
              <tr>
                <th class="matrix-corner">Type</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>

        <div class="matrix-legend">
          <span class="matrix-legend-item">
            <span class="matrix-legend-color positive"></span>
            Positive contribution
          </span>
          <span class="matrix-legend-item">
            <span class="matrix-legend-color negative"></span>
            Negative contribution
          </span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render color affinity space view
 */
function renderColorSpaceView(profile) {
  if (!profile.attributeSpaces || !profile.attributeSpaces.color) {
    return '<div class="space-empty">No color data available</div>';
  }

  const colorSpace = profile.attributeSpaces.color;
  const sortedColors = Object.entries(colorSpace)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, value]) => value > 0.001);

  const topColors = sortedColors.slice(0, 10);
  const colorConfidence = profile.spaceConfidence?.color || 0;

  // Color hex mapping
  const colorHex = {
    'red': '#e74c3c',
    'blue': '#3498db',
    'green': '#27ae60',
    'navy': '#2c3e50',
    'black': '#2c2c2c',
    'white': '#ecf0f1',
    'gray': '#95a5a6',
    'brown': '#8b6f47',
    'tan': '#d2b48c',
    'olive': '#556b2f',
    'burgundy': '#800020',
    'charcoal': '#36454f',
    'khaki': '#c3b091',
    'beige': '#f5f5dc',
    'cream': '#fffdd0',
    'maroon': '#800000'
  };

  return `
    <div class="vs-grid">
      <div class="vs-card vs-color-card">
        <div class="vs-card-header">
          <h3>Color Affinity Spectrum</h3>
          <span class="vs-badge">${topColors.length} colors learned</span>
        </div>
        <div class="vs-card-content">
          <div class="color-spectrum">
            ${topColors.map(([color, affinity]) => `
              <div class="color-affinity-row">
                <div class="color-swatch" style="background: ${colorHex[color] || '#ccc'}"></div>
                <span class="color-name">${color}</span>
                <div class="affinity-bar-container">
                  <div class="affinity-bar-fill" style="width: ${(affinity * 100)}%; background: ${colorHex[color] || '#ccc'}"></div>
                </div>
                <span class="affinity-value">${(affinity * 100).toFixed(1)}%</span>
              </div>
            `).join('')}
          </div>

          <div class="space-confidence-meter">
            <span class="confidence-label">Space Confidence:</span>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${colorConfidence * 100}%"></div>
            </div>
            <span class="confidence-value">${(colorConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div class="vs-card">
        <div class="vs-card-header">
          <h3>Color Analysis</h3>
        </div>
        <div class="vs-card-content">
          <div class="color-insights">
            <div class="insight-row">
              <span class="insight-label">Dominant Color:</span>
              <span class="insight-value">${topColors[0] ? topColors[0][0] : 'N/A'}</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Color Diversity:</span>
              <span class="insight-value">${sortedColors.length} colors</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Neutral Preference:</span>
              <span class="insight-value">${calculateNeutralPreference(colorSpace)}%</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Earth Tones:</span>
              <span class="insight-value">${calculateEarthTonePreference(colorSpace)}%</span>
            </div>
          </div>

          <div class="metric-note" style="margin-top: 20px;">
            Color affinities learned from swipes, outfit feedback, and purchases. Higher values indicate stronger preferences.
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render fit preference space view
 */
function renderFitSpaceView(profile) {
  if (!profile.attributeSpaces || !profile.attributeSpaces.fit) {
    return '<div class="space-empty">No fit data available</div>';
  }

  const fitSpace = profile.attributeSpaces.fit;
  const sortedFits = Object.entries(fitSpace)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, value]) => value > 0.001);

  const fitConfidence = profile.spaceConfidence?.fit || 0;

  return `
    <div class="vs-grid">
      <div class="vs-card">
        <div class="vs-card-header">
          <h3>Fit Preference Distribution</h3>
          <span class="vs-badge">${sortedFits.length} fits</span>
        </div>
        <div class="vs-card-content">
          <div class="fit-distribution">
            ${sortedFits.map(([fit, value]) => `
              <div class="fit-pref-row">
                <span class="fit-label">${fit}</span>
                <div class="fit-bar-container">
                  <div class="fit-bar-fill" style="width: ${(value * 100)}%"></div>
                </div>
                <span class="fit-value">${(value * 100).toFixed(1)}%</span>
              </div>
            `).join('')}
          </div>

          <div class="space-confidence-meter">
            <span class="confidence-label">Space Confidence:</span>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${fitConfidence * 100}%"></div>
            </div>
            <span class="confidence-value">${(fitConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div class="vs-card">
        <div class="vs-card-header">
          <h3>Fit Insights</h3>
        </div>
        <div class="vs-card-content">
          <div class="fit-insights">
            <div class="insight-row">
              <span class="insight-label">Primary Fit:</span>
              <span class="insight-value">${sortedFits[0] ? sortedFits[0][0] : 'N/A'}</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Secondary Fit:</span>
              <span class="insight-value">${sortedFits[1] ? sortedFits[1][0] : 'N/A'}</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Fit Style:</span>
              <span class="insight-value">${classifyFitStyle(sortedFits)}</span>
            </div>
          </div>

          <div class="fit-description" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
            ${getFitStyleDescription(sortedFits)}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render harmony space view (outfit compatibility graph)
 */
function renderHarmonySpaceView(profile) {
  if (!profile.attributeSpaces || !profile.attributeSpaces.harmony) {
    return '<div class="space-empty">No harmony data available</div>';
  }

  const harmonySpace = profile.attributeSpaces.harmony;
  const edges = harmonySpace.edges || {};
  const nodes = harmonySpace.nodes || [];

  const sortedPairings = Object.entries(edges)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const harmonyConfidence = profile.spaceConfidence?.harmony || 0;

  return `
    <div class="vs-grid">
      <div class="vs-card vs-harmony-card">
        <div class="vs-card-header">
          <h3>Outfit Harmony Network</h3>
          <span class="vs-badge">${sortedPairings.length} pairings</span>
        </div>
        <div class="vs-card-content">
          ${sortedPairings.length > 0 ? `
            <div class="harmony-network">
              <svg width="100%" height="300" viewBox="0 0 600 300" class="harmony-graph">
                ${renderHarmonyGraph(sortedPairings, nodes)}
              </svg>
            </div>

            <div class="harmony-list">
              <h4>Top Pairings</h4>
              ${sortedPairings.map(([pairing, weight]) => {
                const [piece1, piece2] = pairing.split(':');
                return `
                  <div class="harmony-pairing">
                    <div class="pairing-pieces">
                      <span class="piece-tag">${piece1}</span>
                      <span class="pairing-arrow">↔</span>
                      <span class="piece-tag">${piece2}</span>
                    </div>
                    <div class="pairing-strength">
                      <div class="pairing-bar" style="width: ${(weight * 100)}%"></div>
                      <span class="pairing-score">${(weight * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<p class="empty-state">No outfit pairings learned yet. Approve some complete outfits to build harmony intelligence.</p>'}

          <div class="space-confidence-meter">
            <span class="confidence-label">Space Confidence:</span>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${harmonyConfidence * 100}%"></div>
            </div>
            <span class="confidence-value">${(harmonyConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div class="vs-card">
        <div class="vs-card-header">
          <h3>Harmony Insights</h3>
        </div>
        <div class="vs-card-content">
          <div class="harmony-insights">
            <div class="insight-row">
              <span class="insight-label">Total Pairings:</span>
              <span class="insight-value">${Object.keys(edges).length}</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Unique Pieces:</span>
              <span class="insight-value">${nodes.length}</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Avg. Compatibility:</span>
              <span class="insight-value">${calculateAvgCompatibility(edges)}%</span>
            </div>
          </div>

          <div class="metric-note" style="margin-top: 20px;">
            Harmony scores show how well pieces work together in outfits you've approved. Higher scores indicate stronger compatibility.
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render harmony graph visualization
 */
function renderHarmonyGraph(pairings, nodes) {
  // Simple force-directed layout simulation
  const width = 600;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 100;

  // Position nodes in a circle
  const nodePositions = {};
  const uniqueNodes = [...new Set(pairings.flatMap(([p]) => p.split(':')))];

  uniqueNodes.forEach((node, i) => {
    const angle = (i / uniqueNodes.length) * 2 * Math.PI;
    nodePositions[node] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });

  // Draw edges
  const edges = pairings.map(([pairing, weight]) => {
    const [node1, node2] = pairing.split(':');
    const pos1 = nodePositions[node1];
    const pos2 = nodePositions[node2];

    if (!pos1 || !pos2) return '';

    const opacity = Math.min(weight * 2, 1);
    const strokeWidth = 1 + weight * 3;

    return `
      <line x1="${pos1.x}" y1="${pos1.y}" x2="${pos2.x}" y2="${pos2.y}"
        stroke="#667eea" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"/>
    `;
  }).join('');

  // Draw nodes
  const nodeCircles = Object.entries(nodePositions).map(([node, pos]) => {
    return `
      <g>
        <circle cx="${pos.x}" cy="${pos.y}" r="8" fill="#667eea"/>
        <text x="${pos.x}" y="${pos.y - 15}"
          text-anchor="middle" font-size="10" fill="#333">
          ${node.split('-')[0]}
        </text>
      </g>
    `;
  }).join('');

  return edges + nodeCircles;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Project 9D pillar space to 2D using custom projection
 */
function projectTo2D(pillars) {
  // Map pillars to circular arrangement, then compute weighted center
  const pillarArray = [
    { name: 'romantic', angle: 0 },
    { name: 'bohemian', angle: 40 },
    { name: 'casual', angle: 80 },
    { name: 'classic', angle: 120 },
    { name: 'minimal', angle: 160 },
    { name: 'maximal', angle: 200 },
    { name: 'fashionForward', angle: 240 },
    { name: 'athletic', angle: 280 },
    { name: 'utility', angle: 320 }
  ];

  let x = 0;
  let y = 0;

  pillarArray.forEach(p => {
    const weight = pillars[p.name] / 100;
    const rad = (p.angle - 90) * Math.PI / 180;
    x += Math.cos(rad) * weight;
    y += Math.sin(rad) * weight;
  });

  return { x, y };
}

/**
 * Calculate style coordinates from pillars
 */
function calculateStyleCoordinates(pillars) {
  const normalized = {};
  for (const [key, value] of Object.entries(pillars)) {
    normalized[key] = (value / 100).toFixed(3);
  }
  return normalized;
}

/**
 * Calculate vector magnitude
 */
function calculateMagnitude(pillars) {
  const sumSquares = Object.values(pillars).reduce((sum, v) => sum + v * v, 0);
  return Math.sqrt(sumSquares) / 100;
}

/**
 * Calculate Shannon entropy of distribution
 */
function calculateEntropy(pillars) {
  const total = Object.values(pillars).reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;

  const entropy = Object.values(pillars).reduce((h, v) => {
    if (v === 0) return h;
    const p = v / total;
    return h - (p * Math.log2(p));
  }, 0);

  return entropy;
}

/**
 * Count active dimensions (non-zero pillars)
 */
function countActiveDimensions(pillars) {
  return Object.values(pillars).filter(v => v > 0).length;
}

/**
 * Calculate Euclidean distance between two pillar vectors
 */
function euclideanDistance(pillars1, pillars2) {
  const keys = Object.keys(pillars1);
  const sumSquares = keys.reduce((sum, key) => {
    const diff = (pillars1[key] || 0) - (pillars2[key] || 0);
    return sum + diff * diff;
  }, 0);
  return Math.sqrt(sumSquares);
}

/**
 * Calculate trajectory from history
 */
function calculateTrajectory(history) {
  return history.map((entry, idx) => ({
    session: idx + 1,
    pillars: entry.profile.pillars
  }));
}

/**
 * Generate contribution matrix (simplified simulation)
 */
function generateContributionMatrix(profile, interactions, pillars) {
  const matrix = {};

  // Simulate based on profile data
  const topPillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);

  interactions.forEach(interaction => {
    matrix[interaction] = {};
    pillars.forEach(pillar => {
      // Simulate contribution values
      let value = 0;

      if (interaction === 'Purchase' && topPillars.includes(pillar)) {
        value = Math.floor(Math.random() * 10 + 10);
      } else if (interaction === 'Swipe' && topPillars.includes(pillar)) {
        value = Math.floor(Math.random() * 6 + 3);
      } else if (interaction === 'Quiz' && profile.pillars[pillar] > 15) {
        value = Math.floor(Math.random() * 15 + 5);
      } else {
        value = Math.floor(Math.random() * 5 - 2);
      }

      matrix[interaction][pillar] = value;
    });
  });

  return matrix;
}

/**
 * Calculate neutral color preference percentage
 */
function calculateNeutralPreference(colorSpace) {
  const neutrals = ['black', 'white', 'gray', 'navy', 'charcoal', 'beige', 'cream'];
  const neutralSum = neutrals.reduce((sum, color) => sum + (colorSpace[color] || 0), 0);
  const total = Object.values(colorSpace).reduce((sum, v) => sum + v, 0);
  return total > 0 ? Math.round((neutralSum / total) * 100) : 0;
}

/**
 * Calculate earth tone preference percentage
 */
function calculateEarthTonePreference(colorSpace) {
  const earthTones = ['brown', 'tan', 'olive', 'khaki', 'beige'];
  const earthSum = earthTones.reduce((sum, color) => sum + (colorSpace[color] || 0), 0);
  const total = Object.values(colorSpace).reduce((sum, v) => sum + v, 0);
  return total > 0 ? Math.round((earthSum / total) * 100) : 0;
}

/**
 * Classify overall fit style
 */
function classifyFitStyle(sortedFits) {
  if (sortedFits.length === 0) return 'Undefined';

  const topFit = sortedFits[0][0];

  if (topFit === 'slim' || topFit === 'tailored') return 'Refined';
  if (topFit === 'regular') return 'Classic';
  if (topFit === 'relaxed' || topFit === 'oversized') return 'Comfort-first';
  if (topFit === 'athletic') return 'Performance';

  return 'Mixed';
}

/**
 * Get fit style description
 */
function getFitStyleDescription(sortedFits) {
  if (sortedFits.length === 0) {
    return 'Not enough data to determine fit preferences.';
  }

  const topFit = sortedFits[0][0];

  const descriptions = {
    'slim': 'You prefer a close, modern fit that follows your body shape. This creates a sharp, contemporary silhouette.',
    'tailored': 'You appreciate structured, fitted pieces with clean lines. Classic and refined.',
    'regular': 'You favor a traditional, comfortable fit that works across contexts. Versatile and reliable.',
    'relaxed': 'You like ease and comfort with a bit of extra room. Casual and approachable.',
    'oversized': 'You gravitate toward generous, statement-making fits. Bold and contemporary.',
    'athletic': 'You prefer performance-oriented fits with stretch and mobility. Active and functional.',
    'straight': 'You like clean, straight silhouettes without excess taper. Timeless and unfussy.'
  };

  return descriptions[topFit] || 'Your fit preferences are evolving as we learn more about your style.';
}

/**
 * Calculate average compatibility across all pairings
 */
function calculateAvgCompatibility(edges) {
  const values = Object.values(edges);
  if (values.length === 0) return 0;

  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 100);
}

/**
 * Initialize tab switching for multi-space views
 */
function initializeMultiSpaceTabs() {
  // Wait for DOM to be ready
  setTimeout(() => {
    const tabs = document.querySelectorAll('.vs-tab');
    const views = document.querySelectorAll('.space-view');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetSpace = tab.dataset.space;

        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active view
        views.forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(`space-${targetSpace}`);
        if (targetView) {
          targetView.classList.add('active');
        }
      });
    });
  }, 100);
}

// Initialize tabs when the profile panel is rendered
if (typeof window !== 'undefined') {
  window.addEventListener('profileRendered', () => {
    initializeMultiSpaceTabs();
  });
}
