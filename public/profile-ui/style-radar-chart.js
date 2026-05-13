/**
 * Style Radar Chart - Nordstrom Brand Aesthetic
 *
 * Clean radar/spider chart showing style profile dimensions.
 * Uses Nordstrom's official Primary UI colors with dimensional gradients and motion.
 */

// Nordstrom Brand Color Palette (Expanded)
const RADAR_COLORS = {
  // Primary UI Colors
  background: '#FAF9F5',      // UI - Gray 10 (Site Background)
  white: '#FFFFFF',           // White
  border: '#EDECEB',          // UI - Gray 20 (Softer border)
  outline: '#B4B1A9',         // UI - Gray 60 (UI Outlines)

  // Text Colors
  textPrimary: '#0C0C0C',     // Black
  textSecondary: '#0C0C0D',   // UI - Gray 100 (Secondary Text)
  textTertiary: '#8E8A82',    // UI - Gray 80 (Sub/Disabled Text)

  // Accent Colors - Expanded Palette
  camelMain: '#BEA771',       // Camel 50
  camelLight: '#E5D4A9',      // Camel 25
  camelDark: '#614E27',       // Camel 100

  // Nordstrom Blue (cool, sophisticated)
  blueMain: '#4A90B8',        // Blue accent
  blueLight: '#7DB1D1',       // Blue 50
  blueDark: '#2B5A78',        // Blue dark

  // Nordstrom Pink (warm, inviting)
  pinkMain: '#D4A5A5',        // Pink accent
  pinkLight: '#E8C9C9',       // Pink light

  // Additional dimensional colors
  lavender: '#C8B5D6',        // Lavender for depth
  peach: '#E8C9A9',           // Peach/yellow tones
  coral: '#E5ADA5',           // Coral for warmth
};

// Pillar positions in radar chart (clockwise from top)
// Order: Classic · Minimal · Romantic · Bohemian · Maximal · Streetwear · Utility · Athletic · Casual
const RADAR_PILLARS = [
  { key: 'classic', label: 'Classic', angle: 0 },
  { key: 'minimal', label: 'Minimal', angle: 40 },
  { key: 'romantic', label: 'Romantic', angle: 80 },
  { key: 'bohemian', label: 'Bohemian', angle: 120 },
  { key: 'maximal', label: 'Maximal', angle: 160 },
  { key: 'streetwear', label: 'Streetwear', angle: 200 },
  { key: 'utility', label: 'Utility', angle: 240 },
  { key: 'athletic', label: 'Athletic', angle: 280 },
  { key: 'casual', label: 'Casual', angle: 320 },
];

/**
 * Render radar chart visualization
 */
function renderStyleRadarChart(containerId, config) {
  const {
    profileBefore,
    profileAfter,
    showBeforeProfile = false, // Option to show "before" as ghost outline
    animateDuration = 1000,
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Radar chart container not found:', containerId);
    return;
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Canvas sizing - square aspect ratio for radar
  const containerWidth = container.clientWidth;
  const size = Math.min(containerWidth, 500); // Max 500px for compact display
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  // Clear container and add canvas
  container.innerHTML = '';
  container.appendChild(canvas);

  // Chart dimensions
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size * 0.35; // Leave room for labels
  const numRings = 5; // Concentric circles for scale

  // Calculate dynamic scale (max score rounded up to nearest 5%)
  const allScores = [...Object.values(profileBefore), ...Object.values(profileAfter)];
  const maxScore = Math.max(...allScores);
  const chartMax = Math.ceil(maxScore / 5) * 5; // Round up to nearest 5%

  // Current scores (will animate)
  let currentScores = { ...profileBefore };
  let animationProgress = 0;
  let animationStartTime = null;
  let wiggleTime = 0; // For continuous dot wiggle animation

  /**
   * Draw background grid (concentric circles + radial lines)
   */
  function drawGrid() {
    ctx.strokeStyle = '#C8C5BE'; // Mid-tone warm gray
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.38; // Lighter for subtlety

    // Concentric circles
    for (let i = 1; i <= numRings; i++) {
      const radius = (maxRadius / numRings) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radial lines from center to each pillar
    RADAR_PILLARS.forEach(pillar => {
      const angleRad = (pillar.angle - 90) * Math.PI / 180; // -90 to start from top
      const x = centerX + Math.cos(angleRad) * maxRadius;
      const y = centerY + Math.sin(angleRad) * maxRadius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }

  /**
   * Draw scale labels (0 to chartMax on one axis)
   */
  function drawScaleLabels() {
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = RADAR_COLORS.textTertiary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.6;

    // Draw percentage labels along the top axis
    for (let i = 1; i <= numRings; i++) {
      const radius = (maxRadius / numRings) * i;
      const percent = (chartMax / numRings) * i;
      const angleRad = (0 - 90) * Math.PI / 180; // Top axis
      const x = centerX + Math.cos(angleRad) * radius;
      const y = centerY + Math.sin(angleRad) * radius - 12;

      ctx.fillText(`${Math.round(percent)}%`, x, y);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Get polygon points for a profile
   *
   * Only shows pillars with scores > 5% (significant pillars).
   * Takes top 5 max to avoid visual clutter.
   * This naturally adapts as profiles mature:
   * - New profiles (evenly distributed): show 5+ pillars
   * - Focused profiles: show 2-3 dominant pillars
   */
  function getPolygonPoints(scores, topN = 5) {
    // Get all points with their scores
    const allPoints = RADAR_PILLARS.map(pillar => {
      const score = scores[pillar.key] || 0;
      const radius = (score / chartMax) * maxRadius; // Scale to dynamic max
      const angleRad = (pillar.angle - 90) * Math.PI / 180;

      return {
        x: centerX + Math.cos(angleRad) * radius,
        y: centerY + Math.sin(angleRad) * radius,
        score,
        pillarKey: pillar.key,
        angle: pillar.angle,
      };
    });

    // Filter pillars > 5%, sort by score descending, and take top N
    const topPoints = allPoints
      .filter(point => point.score > 5) // Only show significant pillars
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    // Sort back by angle to draw polygon in correct order
    return topPoints.sort((a, b) => a.angle - b.angle);
  }

  /**
   * Draw outer glow effect (multiple layered gradients that "leak" behind blob)
   */
  function drawOuterGlow(points) {
    if (points.length === 0) return;

    const glowRadius = maxRadius * 1.1;

    // Use multiply blend mode so grid lines show through
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    // Layer 1: Lavender glow leaking from top-right
    if (points.length > 0) {
      const topRight = points[Math.floor(points.length * 0.2)]; // ~20% around circle
      const glow2 = ctx.createRadialGradient(topRight.x, topRight.y, 0, topRight.x, topRight.y, glowRadius * 0.6);
      glow2.addColorStop(0, 'rgba(200, 181, 214, 0.3)');
      glow2.addColorStop(0.5, 'rgba(200, 181, 214, 0.15)');
      glow2.addColorStop(1, 'rgba(200, 181, 214, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, size, size);
    }

    // Layer 2: Peach glow leaking from bottom-left
    if (points.length > 2) {
      const bottomLeft = points[Math.floor(points.length * 0.7)]; // ~70% around circle
      const glow3 = ctx.createRadialGradient(bottomLeft.x, bottomLeft.y, 0, bottomLeft.x, bottomLeft.y, glowRadius * 0.55);
      glow3.addColorStop(0, 'rgba(232, 201, 169, 0.32)');
      glow3.addColorStop(0.5, 'rgba(232, 201, 169, 0.16)');
      glow3.addColorStop(1, 'rgba(232, 201, 169, 0)');
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, size, size);
    }

    // Layer 3: Coral glow leaking from left side
    if (points.length > 3) {
      const leftSide = points[Math.floor(points.length * 0.5)]; // ~50% around circle
      const glow4 = ctx.createRadialGradient(leftSide.x, leftSide.y, 0, leftSide.x, leftSide.y, glowRadius * 0.5);
      glow4.addColorStop(0, 'rgba(229, 173, 165, 0.28)');
      glow4.addColorStop(0.5, 'rgba(229, 173, 165, 0.14)');
      glow4.addColorStop(1, 'rgba(229, 173, 165, 0)');
      ctx.fillStyle = glow4;
      ctx.fillRect(0, 0, size, size);
    }

    ctx.restore();
  }

  /**
   * Draw filled polygon for profile with BEZIER CURVES (blob shape)
   */
  function drawProfilePolygon(scores, fillColor, strokeColor, fillAlpha = 0.15) {
    const basePoints = getPolygonPoints(scores, 5); // Always show top 5 for good visual shape

    if (basePoints.length === 0) {
      return;
    }

    // Apply wiggle motion to all points to create organic blob movement
    const wiggledPoints = basePoints.map((point, i) => {
      const phase = i * 1.2;
      const wiggleX = Math.sin(wiggleTime * 0.5 + phase) * 5;
      const wiggleY = Math.cos(wiggleTime * 0.4 + phase * 1.3) * 5;

      return {
        x: point.x + wiggleX,
        y: point.y + wiggleY,
        score: point.score,
        pillarKey: point.pillarKey,
        angle: point.angle,
        baseX: point.x, // Store original position for distance calculations
        baseY: point.y
      };
    });

    // Draw outer glow first (behind everything)
    drawOuterGlow(wiggledPoints);

    // Build the blob path using wiggled points
    ctx.beginPath();
    ctx.moveTo(wiggledPoints[0].x, wiggledPoints[0].y);

    // Draw smooth bezier curves through all wiggled points with adaptive tension
    for (let i = 0; i < wiggledPoints.length; i++) {
      const current = wiggledPoints[i];
      const next = wiggledPoints[(i + 1) % wiggledPoints.length];
      const prev = wiggledPoints[(i - 1 + wiggledPoints.length) % wiggledPoints.length];
      const nextnext = wiggledPoints[(i + 2) % wiggledPoints.length];

      // Calculate distances from center for tension adjustment (using base positions)
      const currentDist = Math.sqrt((current.baseX - centerX) ** 2 + (current.baseY - centerY) ** 2);
      const nextDist = Math.sqrt((next.baseX - centerX) ** 2 + (next.baseY - centerY) ** 2);
      const prevDist = Math.sqrt((prev.baseX - centerX) ** 2 + (prev.baseY - centerY) ** 2);

      // Adaptive tension: reduce curve strength when adjacent points are very different distances
      // This prevents spikes and overshoots
      const distRatio1 = Math.min(currentDist, prevDist) / Math.max(currentDist, prevDist, 1);
      const distRatio2 = Math.min(nextDist, currentDist) / Math.max(nextDist, currentDist, 1);
      const tension1 = 0.25 * (0.5 + 0.5 * distRatio1); // Scale between 0.125 and 0.25
      const tension2 = 0.25 * (0.5 + 0.5 * distRatio2);

      // Calculate tangent vectors with adaptive tension using wiggled positions
      const tangent1x = (next.x - prev.x) * tension1;
      const tangent1y = (next.y - prev.y) * tension1;
      const cp1x = current.x + tangent1x;
      const cp1y = current.y + tangent1y;

      const tangent2x = (nextnext.x - current.x) * tension2;
      const tangent2y = (nextnext.y - current.y) * tension2;
      const cp2x = next.x - tangent2x;
      const cp2y = next.y - tangent2y;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
    }
    ctx.closePath();

    // Multi-dimensional gradient with more color stops for depth
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 1.2);
    gradient.addColorStop(0, 'rgba(229, 173, 165, 0.45)'); // Coral center - warmest
    gradient.addColorStop(0.2, 'rgba(212, 165, 165, 0.42)'); // Pink - warm
    gradient.addColorStop(0.45, 'rgba(200, 181, 214, 0.38)'); // Lavender - transition
    gradient.addColorStop(0.7, 'rgba(125, 177, 209, 0.32)'); // Blue - cool
    gradient.addColorStop(1, 'rgba(125, 177, 209, 0.18)'); // Blue - coolest edge

    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.fill();

    // Add a secondary overlay gradient for extra dimension (slightly offset)
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const overlayGradient = ctx.createRadialGradient(
      centerX - maxRadius * 0.2,
      centerY - maxRadius * 0.2,
      0,
      centerX,
      centerY,
      maxRadius
    );
    overlayGradient.addColorStop(0, 'rgba(232, 201, 169, 0.25)'); // Peach highlight
    overlayGradient.addColorStop(0.6, 'rgba(232, 201, 169, 0.08)');
    overlayGradient.addColorStop(1, 'rgba(232, 201, 169, 0)');
    ctx.fillStyle = overlayGradient;
    ctx.fill();
    ctx.restore();

    // Stroke with multi-stop gradient (slightly darker)
    const strokeGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    strokeGradient.addColorStop(0, 'rgba(229, 173, 165, 0.65)'); // Coral
    strokeGradient.addColorStop(0.25, 'rgba(212, 165, 165, 0.6)'); // Pink
    strokeGradient.addColorStop(0.5, 'rgba(200, 181, 214, 0.55)'); // Lavender
    strokeGradient.addColorStop(1, 'rgba(125, 177, 209, 0.4)'); // Blue

    ctx.globalAlpha = 0.35; // Lighter border overall
    ctx.strokeStyle = strokeGradient;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data point dots with glow and gradient colors (using wiggled positions)
    wiggledPoints.forEach((point, i) => {
      // Use the already-wiggled position
      const dotX = point.x;
      const dotY = point.y;

      // Determine dot color based on base position (multi-stop gradient: Coral → Pink → Lavender → Blue)
      const distFromCenter = Math.sqrt((point.baseX - centerX) ** 2 + (point.baseY - centerY) ** 2);
      const gradientPosition = Math.min(1, distFromCenter / maxRadius);

      // Multi-stop color interpolation for dimensional effect
      let r, g, b;
      if (gradientPosition < 0.33) {
        // Coral to Pink
        const localPos = gradientPosition / 0.33;
        r = Math.round(229 + (212 - 229) * localPos);
        g = Math.round(173 + (165 - 173) * localPos);
        b = Math.round(165 + (165 - 165) * localPos);
      } else if (gradientPosition < 0.66) {
        // Pink to Lavender
        const localPos = (gradientPosition - 0.33) / 0.33;
        r = Math.round(212 + (200 - 212) * localPos);
        g = Math.round(165 + (181 - 165) * localPos);
        b = Math.round(165 + (214 - 165) * localPos);
      } else {
        // Lavender to Blue
        const localPos = (gradientPosition - 0.66) / 0.34;
        r = Math.round(200 + (125 - 200) * localPos);
        g = Math.round(181 + (177 - 181) * localPos);
        b = Math.round(214 + (209 - 214) * localPos);
      }

      // Draw dot glow (outer halo)
      const glowGradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 12);
      glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
      glowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
      glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.globalAlpha = 1;
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Draw dot itself (lighter, colored)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight for depth
      ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
      ctx.beginPath();
      ctx.arc(dotX - 1, dotY - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  /**
   * Draw pillar labels around the perimeter
   */
  function drawLabels() {
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = RADAR_COLORS.textSecondary;
    ctx.globalAlpha = 0.9;

    RADAR_PILLARS.forEach(pillar => {
      const labelRadius = maxRadius + 35;
      const angleRad = (pillar.angle - 90) * Math.PI / 180;
      const x = centerX + Math.cos(angleRad) * labelRadius;
      const y = centerY + Math.sin(angleRad) * labelRadius;

      // Handle multi-line labels
      const lines = pillar.label.split('\n');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (lines.length > 1) {
        // Multi-line (Fashion Forward)
        const lineHeight = 15;
        const startY = y - (lineHeight * (lines.length - 1)) / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, x, startY + i * lineHeight);
        });
      } else {
        // Single line
        ctx.fillText(pillar.label, x, y);
      }
    });

    ctx.globalAlpha = 1;
  }

  /**
   * Draw scale indicator
   */
  function drawScaleInfo() {
    // No scale text - keep chart clean

    // If showing before profile, add small legend
    if (showBeforeProfile) {
      ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      ctx.fillStyle = RADAR_COLORS.textTertiary;
      ctx.globalAlpha = 0.4;
      ctx.fillText('— previous', centerX - 40, 20);

      ctx.fillStyle = RADAR_COLORS.accentMain;
      ctx.globalAlpha = 0.7;
      ctx.fillText('— current', centerX + 40, 20);

      ctx.globalAlpha = 1;
    }
  }

  /**
   * Main render function
   */
  function render() {
    // Clear canvas with warm cream background
    ctx.fillStyle = RADAR_COLORS.background;
    ctx.fillRect(0, 0, size, size);

    // Draw layers (back to front)
    drawGrid();
    // drawScaleLabels(); // Removed - no percentage labels

    // Draw before profile (ghost outline) if enabled
    if (showBeforeProfile) {
      drawProfilePolygon(
        profileBefore,
        RADAR_COLORS.textTertiary,
        RADAR_COLORS.textTertiary,
        0.05
      );
    }

    // Draw current/after profile with gradient and glow
    drawProfilePolygon(
      currentScores,
      RADAR_COLORS.camelMain,
      RADAR_COLORS.camelDark,
      0.2
    );

    drawLabels();
    drawScaleInfo();
  }

  /**
   * Animation loop (handles both profile animation and continuous wiggle)
   */
  function animate(timestamp) {
    if (!animationStartTime) animationStartTime = timestamp;
    const elapsed = timestamp - animationStartTime;

    // Update wiggle time for continuous dot motion (always updating)
    wiggleTime = timestamp / 1000; // Convert to seconds for smooth motion

    // Calculate progress (0 to 1) for profile animation
    animationProgress = Math.min(1, elapsed / animateDuration);
    const eased = easeOutCubic(animationProgress);

    // Interpolate scores during initial animation
    if (animationProgress < 1) {
      RADAR_PILLARS.forEach(pillar => {
        const before = profileBefore[pillar.key] || 0;
        const after = profileAfter[pillar.key] || 0;
        currentScores[pillar.key] = before + (after - before) * eased;
      });
    } else {
      // Ensure we're at final state after animation completes
      RADAR_PILLARS.forEach(pillar => {
        currentScores[pillar.key] = profileAfter[pillar.key] || 0;
      });
    }

    render();

    // Continue animation forever for wiggle effect
    requestAnimationFrame(animate);
  }

  /**
   * Easing function
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Start animation
   */
  function startAnimation() {
    animationStartTime = null;
    animationProgress = 0;
    currentScores = { ...profileBefore };
    requestAnimationFrame(animate);
  }

  // Initial render
  render();

  // Auto-start animation after brief delay
  setTimeout(startAnimation, 300);

  // Return API
  return {
    render,
    replay: startAnimation,
  };
}

// Export for use
if (typeof window !== 'undefined') {
  window.StyleRadarChart = {
    render: renderStyleRadarChart,
  };
}
