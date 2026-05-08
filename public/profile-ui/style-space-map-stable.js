/**
 * StyleSpaceMap - Camera-navigated 2D style profile visualization
 *
 * Renders a customer's style profile as a navigated view of semantic space.
 * Nine fixed pillar positions define the landscape. Camera centers on weighted
 * centroid with gentle fisheye projection. Animates before→after transitions.
 */

// Fixed pillar positions (custom layout optimized for wide containers)
// Coordinate system: x=0 (Traditional) to 100 (Contemporary)
//                    y=0 (Expressive) to 100 (Minimal/Structured)
const PILLAR_WORLD_POSITIONS = Object.freeze({
  classic: { x: 45.7, y: 22.4, hue: 220, mainstream: 0.85 },
  minimal: { x: 9.1, y: 35.4, hue: 210, mainstream: 0.70 },
  casual: { x: 32.6, y: 52.5, hue: 200, mainstream: 0.90 },
  athletic: { x: 17.4, y: 74.7, hue: 160, mainstream: 0.65 },
  utility: { x: 42.8, y: 93.4, hue: 40, mainstream: 0.40 },
  romantic: { x: 78.9, y: 27.4, hue: 350, mainstream: 0.45 },
  bohemian: { x: 82.3, y: 53.7, hue: 35, mainstream: 0.35 },
  fashionForward: { x: 70.0, y: 78.8, hue: 0, mainstream: 0.10 },
  maximal: { x: 99.0, y: 85.6, hue: 30, mainstream: 0.15 }
});

const PILLARS = Object.keys(PILLAR_WORLD_POSITIONS);

// Animation timing (milliseconds)
const ANIMATION_PHASES = {
  overview: { start: 0, end: 400 },
  traveling: { start: 400, end: 1600 },
  arrived: { start: 1600, end: 2300 },
  updating: { start: 2300, end: 4100 },
  done: 4100
};

// Easing functions
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Calculate weighted centroid of profile scores
function calculateCentroid(scores) {
  let tx = 0, ty = 0, total = 0;

  PILLARS.forEach(pillar => {
    const pos = PILLAR_WORLD_POSITIONS[pillar];
    const score = scores[pillar] || 0;
    tx += pos.x * score;
    ty += pos.y * score;
    total += score;
  });

  return total > 0 ? { x: tx / total, y: ty / total } : { x: 50, y: 50 };
}

// Calculate zoom level based on score concentration (entropy)
// DOLLY ZOOM: More concentrated = zoom IN (magnifying glass effect)
function calculateZoom(scores) {
  const total = PILLARS.reduce((sum, p) => sum + (scores[p] || 0), 0);
  if (total === 0) return 1.0;

  const normalized = PILLARS.map(p => (scores[p] || 0) / total);
  const entropy = -normalized.reduce((sum, prob) => {
    return prob > 0 ? sum + prob * Math.log(prob) : sum;
  }, 0);

  const maxEntropy = Math.log(PILLARS.length);
  const concentration = 1 - entropy / maxEntropy;

  return 1.0 + concentration * 0.65; // Dolly zoom: 1.0x (flat overview) → 1.65x (dramatic magnification)
}

// Calculate constrained camera position (keeps all pillars visible)
function constrainCamera(targetCx, targetCy, canvasWidth, canvasHeight) {
  // Find bounding box of all pillar world positions
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  PILLARS.forEach(pillar => {
    const pos = PILLAR_WORLD_POSITIONS[pillar];
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });

  // Calculate center of all pillars
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Very tight constraints - camera stays near center to prevent edge overflow
  // Allow only 12% movement to ensure magnifying glass effect keeps everything on screen
  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  const maxOffsetX = worldWidth * 0.12;
  const maxOffsetY = worldHeight * 0.12;

  const constrainedCx = Math.max(centerX - maxOffsetX, Math.min(centerX + maxOffsetX, targetCx));
  const constrainedCy = Math.max(centerY - maxOffsetY, Math.min(centerY + maxOffsetY, targetCy));

  return { cx: constrainedCx, cy: constrainedCy };
}

// Project world coordinates with DOLLY ZOOM (magnifying glass effect)
function projectPoint(wx, wy, camera, canvasWidth, canvasHeight, padding) {
  // Use aspect-ratio aware scaling to fill wide containers
  // World coordinates are 0-100, map them to fill the canvas shape
  const worldSize = 110; // Balanced padding to prevent edge overflow

  // Calculate separate scales for X and Y based on canvas aspect ratio
  const canvasAspect = canvasWidth / canvasHeight;

  // Scale to fit height, then stretch X based on aspect ratio (make dots bigger overall)
  const baseScaleY = canvasHeight / worldSize;
  const baseScaleX = baseScaleY * canvasAspect * 0.9; // 0.9 factor makes dots bigger and fills space more

  // Canvas center
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Calculate position relative to camera center
  const relX = wx - camera.cx;
  const relY = wy - camera.cy;
  const distFromCenter = Math.sqrt(relX * relX + relY * relY);

  // DOLLY ZOOM: Distortion increases as we zoom in (magnifying glass effect)
  // zoom = 1.0 (flat) → no distortion
  // zoom = 1.65 (magnified) → dramatic perspective distortion with edge compression
  const fisheyeStrength = (camera.zoom - 1.0) / 0.65; // 0 to 1

  let distortedX = relX;
  let distortedY = relY;

  if (distFromCenter > 0.1) {
    // MAGNIFYING GLASS: Center expands, pushes middle dots OUT, then edges compress IN
    const normalizedDist = distFromCenter / 30; // 0-3+ range

    let distortionFactor;
    if (normalizedDist < 0.3) {
      // CENTER FOCUS AREA: Expand outward DRAMATICALLY (magnifying glass magnifies)
      distortionFactor = 1.0 + fisheyeStrength * 0.8 * (0.3 - normalizedDist) / 0.3;
    } else if (normalizedDist < 0.8) {
      // MIDDLE ZONE: PUSH OUTWARD (repelling force from center expansion)
      const middleT = (normalizedDist - 0.3) / 0.5;
      distortionFactor = 1.0 + fisheyeStrength * 0.2 * (1.0 - middleT); // Push out, fade to neutral
    } else if (normalizedDist < 1.2) {
      // TRANSITION: Neutral to compression
      const transT = (normalizedDist - 0.8) / 0.4;
      distortionFactor = 1.0 - fisheyeStrength * 0.1 * transT;
    } else {
      // EDGE ZONE: Strong compression toward edges (magnetic containment)
      const edgeFactor = Math.min(normalizedDist - 1.2, 1.2);
      distortionFactor = 1.0 - fisheyeStrength * (0.1 + 0.5 * (edgeFactor / 1.2));
    }

    distortedX = relX * distortionFactor;
    distortedY = relY * distortionFactor;
  }

  // Apply dolly zoom with aspect-aware scaling (make everything bigger overall)
  const scaleX = baseScaleX * (1.0 + fisheyeStrength * 0.35);
  const scaleY = baseScaleY * (1.0 + fisheyeStrength * 0.35);

  // Map to canvas coordinates using different scales for X and Y
  const canvasX = centerX + distortedX * scaleX;
  const canvasY = centerY + distortedY * scaleY;

  return {
    x: canvasX,
    y: canvasY,
    distFromCenter: distFromCenter, // For size scaling
    fisheyeStrength: fisheyeStrength
  };
}

// Get OKLCH color for pillar
function getPillarColor(pillar, opacity = 1) {
  const pos = PILLAR_WORLD_POSITIONS[pillar];
  const hue = pos.hue;
  const alpha = opacity < 1 ? ` / ${opacity}` : '';
  return `oklch(0.65 0.15 ${hue}${alpha})`;
}

// Render gradient background using canvas radial gradients (simple & fast)
function renderGradientBackground(ctx, width, height, projected, scores, totalScore) {
  // Fill with light background
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, width, height);

  // Draw radial gradients for each pillar with fisheye scaling
  PILLARS.forEach(pillar => {
    const score = scores[pillar] || 0;
    if (score < 1) return; // Skip negligible scores for background

    const pos = projected[pillar];
    const worldPos = PILLAR_WORLD_POSITIONS[pillar];
    const scoreRatio = score / totalScore;

    // Base radius from score
    const baseRadius = 100 + scoreRatio * 300;

    // MAGNIFYING GLASS: Scale gradients with distance
    const normalizedDist = pos.distFromCenter / 30;
    let distScale;
    if (normalizedDist < 0.3) {
      distScale = 1.0 + pos.fisheyeStrength * 1.6 * (0.3 - normalizedDist) / 0.3;
    } else if (normalizedDist < 0.8) {
      const middleT = (normalizedDist - 0.3) / 0.5;
      distScale = 1.0 + pos.fisheyeStrength * 0.3 * (1.0 - middleT);
    } else if (normalizedDist < 1.2) {
      const transT = (normalizedDist - 0.8) / 0.4;
      distScale = 1.0 - pos.fisheyeStrength * 0.2 * transT;
    } else {
      const edgeFactor = Math.min(normalizedDist - 1.2, 1.2);
      distScale = 1.0 - pos.fisheyeStrength * (0.2 + 0.5 * (edgeFactor / 1.2));
    }
    const radius = baseRadius * Math.max(0.3, Math.min(2.5, distScale));

    // Create radial gradient
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);

    // Convert hue to RGB for gradient
    const hue = worldPos.hue;
    const innerColor = `hsla(${hue}, 45%, 80%, ${scoreRatio * 0.4})`;
    const outerColor = `hsla(${hue}, 30%, 90%, 0)`;

    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });
}

// Render the StyleSpaceMap visualization
function renderStyleSpaceMap(containerId, config) {
  const {
    profileBefore,
    profileAfter,
    customerName = 'Customer',
    changeLabel = 'Style updated',
    autoPlay = true,
    onAnimationComplete = () => {},
    customPositions = null // Allow position overrides for sandbox
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error('StyleSpaceMap: Container not found:', containerId);
    return;
  }

  // Use custom positions if provided (for sandbox), otherwise use defaults
  const WORLD_POSITIONS = customPositions || PILLAR_WORLD_POSITIONS;

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Canvas sizing
  const containerWidth = container.clientWidth;
  const containerHeight = 460; // Fixed height per spec
  canvas.width = containerWidth * dpr;
  canvas.height = containerHeight * dpr;
  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${containerHeight}px`;
  ctx.scale(dpr, dpr);

  // State
  let camera = { cx: 50, cy: 50, zoom: 1.0 };
  let targetCamera = { cx: 50, cy: 50, zoom: 1.0 };
  let currentScores = { ...profileBefore };
  let animationProgress = 0;
  let isAnimating = false;
  let isOverviewMode = false;
  let animationStartTime = 0;
  let hasUpdatedSummary = false;

  // Calculate targets
  const beforeCentroidRaw = calculateCentroid(profileBefore);
  const afterCentroidRaw = calculateCentroid(profileAfter);
  const beforeCentroid = constrainCamera(beforeCentroidRaw.x, beforeCentroidRaw.y, containerWidth, containerHeight);
  const afterCentroid = constrainCamera(afterCentroidRaw.x, afterCentroidRaw.y, containerWidth, containerHeight);
  const beforeZoom = calculateZoom(profileBefore);
  const afterZoom = calculateZoom(profileAfter);

  // MAGNIFYING GLASS: Always zoom IN during animation, never zoom OUT
  // Use the maximum zoom between before/after to ensure progressive magnification
  const maxZoom = Math.max(beforeZoom, afterZoom);

  // HUD container (minimal - just holds controls and progress bar)
  const hudContainer = document.createElement('div');
  hudContainer.className = 'style-space-hud';
  hudContainer.innerHTML = `
    <div class="hud-top-right">
      <button class="hud-btn" id="replayBtn" title="Replay animation">↻</button>
      <button class="hud-btn" id="viewModeBtn" title="Toggle view">🎯</button>
    </div>
    <div class="hud-bottom-left">
      <div class="zoom-indicator" id="zoomIndicator"></div>
    </div>
    <div class="progress-bar" id="progressBar"></div>
  `;

  // Build UI
  container.innerHTML = '';
  container.style.position = 'relative';
  container.appendChild(canvas);
  container.appendChild(hudContainer);

  // Create Change Summary Bar (below the map)
  const identityLabel = generateIdentityLabel(profileAfter);
  const topMovers = calculateTopMovers(profileBefore, profileAfter);
  let summaryBar = null;

  if (window.ChangeSummaryBar) {
    summaryBar = window.ChangeSummaryBar.create({
      containerElement: container,
      customerName: customerName,
      identityLabel: identityLabel,
      changeLabel: changeLabel,
      topMovers: topMovers
    });
  }

  // Generate identity label from top 2 pillars
  function generateIdentityLabel(scores) {
    const sorted = Object.entries(scores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b - a)
      .filter(p => p.score > 5);

    if (sorted.length === 0) return 'Exploring your style';
    if (sorted.length === 1) return capitalize(sorted[0].name);

    return `${capitalize(sorted[0].name)} / ${capitalize(sorted[1].name)}`;
  }

  // Calculate top movers for summary stats
  function calculateTopMovers(before, after) {
    const movers = [];
    PILLARS.forEach(pillar => {
      const delta = (after[pillar] || 0) - (before[pillar] || 0);
      if (Math.abs(delta) >= 3) {
        movers.push({ pillar, delta });
      }
    });
    movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return movers;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Update zoom indicator
  function updateZoomIndicator() {
    const indicatorEl = document.getElementById('zoomIndicator');
    if (!indicatorEl) return;

    if (isOverviewMode) {
      indicatorEl.textContent = 'overview';
    } else {
      indicatorEl.textContent = `${camera.zoom.toFixed(1)}x`;
    }
  }

  // Update progress bar
  function updateProgressBar(progress) {
    const barEl = document.getElementById('progressBar');
    if (!barEl) return;
    barEl.style.width = `${progress * 100}%`;
  }

  // Get animation phase progress
  function getPhaseProgress(elapsed) {
    if (elapsed < ANIMATION_PHASES.overview.end) {
      return { phase: 'overview', t: elapsed / ANIMATION_PHASES.overview.end };
    } else if (elapsed < ANIMATION_PHASES.traveling.end) {
      const start = ANIMATION_PHASES.traveling.start;
      const duration = ANIMATION_PHASES.traveling.end - start;
      return { phase: 'traveling', t: (elapsed - start) / duration };
    } else if (elapsed < ANIMATION_PHASES.arrived.end) {
      const start = ANIMATION_PHASES.arrived.start;
      const duration = ANIMATION_PHASES.arrived.end - start;
      return { phase: 'arrived', t: (elapsed - start) / duration };
    } else if (elapsed < ANIMATION_PHASES.updating.end) {
      const start = ANIMATION_PHASES.updating.start;
      const duration = ANIMATION_PHASES.updating.end - start;
      return { phase: 'updating', t: (elapsed - start) / duration };
    } else {
      return { phase: 'done', t: 1 };
    }
  }

  // Animation loop
  function animate(timestamp) {
    if (!isAnimating) return;

    const elapsed = timestamp - animationStartTime;
    const { phase, t } = getPhaseProgress(elapsed);

    // Update camera target based on phase
    if (phase === 'overview') {
      targetCamera = { cx: 50, cy: 50, zoom: 1.0 };
      updateProgressBar(0);
    } else if (phase === 'traveling') {
      const eased = easeInOut(t);
      targetCamera = {
        cx: lerp(50, beforeCentroid.cx, eased),
        cy: lerp(50, beforeCentroid.cy, eased),
        zoom: lerp(1.0, maxZoom, eased) // Always zoom to max (magnify in)
      };
      updateProgressBar(t * 0.4); // 0-40%
    } else if (phase === 'arrived') {
      targetCamera = {
        cx: beforeCentroid.cx,
        cy: beforeCentroid.cy,
        zoom: maxZoom // Stay at max zoom (fully magnified)
      };
      currentScores = { ...profileBefore };
      updateProgressBar(0.4 + t * 0.2); // 40-60%
    } else if (phase === 'updating') {
      const eased = easeOut(t);

      // Interpolate scores
      PILLARS.forEach(pillar => {
        currentScores[pillar] = lerp(
          profileBefore[pillar] || 0,
          profileAfter[pillar] || 0,
          eased
        );
      });

      // Camera follows interpolated centroid but stays at max zoom (magnifying glass stays focused)
      const interpCentroidRaw = calculateCentroid(currentScores);
      const interpCentroid = constrainCamera(interpCentroidRaw.x, interpCentroidRaw.y, containerWidth, containerHeight);
      targetCamera = {
        cx: interpCentroid.cx,
        cy: interpCentroid.cy,
        zoom: maxZoom // Keep max zoom throughout update (magnifying glass stays magnified)
      };

      updateProgressBar(0.6 + t * 0.4); // 60-100%

      // Update summary bar at 50% (only once)
      if (t >= 0.5 && !hasUpdatedSummary && summaryBar) {
        hasUpdatedSummary = true;
        if (changeLabel) summaryBar.updateChangeLabel(changeLabel);
        summaryBar.updateStats(topMovers);
      }
    } else if (phase === 'done') {
      targetCamera = {
        cx: afterCentroid.cx,
        cy: afterCentroid.cy,
        zoom: maxZoom // End at max zoom (stay magnified)
      };
      currentScores = { ...profileAfter };
      updateProgressBar(1);
      isAnimating = false;
      onAnimationComplete();
    }

    // Lerp camera toward target (smooth following)
    camera.cx = lerp(camera.cx, targetCamera.cx, 0.06);
    camera.cy = lerp(camera.cy, targetCamera.cy, 0.06);
    camera.zoom = lerp(camera.zoom, targetCamera.zoom, 0.06);

    updateZoomIndicator();
    render();

    if (isAnimating) {
      requestAnimationFrame(animate);
    }
  }

  // Start animation
  function startAnimation() {
    isAnimating = true;
    animationStartTime = performance.now();
    currentScores = { ...profileBefore };
    camera = { cx: 50, cy: 50, zoom: 1.0 };
    hasUpdatedSummary = false;

    // Reset summary bar
    if (summaryBar) {
      summaryBar.updateChangeLabel('');
      summaryBar.updateStats([]);
    }

    requestAnimationFrame(animate);
  }

  // Toggle overview/focus mode
  function toggleViewMode() {
    isOverviewMode = !isOverviewMode;

    if (isOverviewMode) {
      targetCamera = { cx: 50, cy: 50, zoom: 1.0 };
    } else {
      const centroidRaw = calculateCentroid(currentScores);
      const centroid = constrainCamera(centroidRaw.x, centroidRaw.y, containerWidth, containerHeight);
      const zoom = calculateZoom(currentScores);
      targetCamera = { cx: centroid.cx, cy: centroid.cy, zoom };
    }

    // Smooth transition
    function smoothTransition() {
      camera.cx = lerp(camera.cx, targetCamera.cx, 0.06);
      camera.cy = lerp(camera.cy, targetCamera.cy, 0.06);
      camera.zoom = lerp(camera.zoom, targetCamera.zoom, 0.06);

      updateZoomIndicator();
      render();

      const diff = Math.abs(camera.cx - targetCamera.cx) +
                   Math.abs(camera.cy - targetCamera.cy) +
                   Math.abs(camera.zoom - targetCamera.zoom);

      if (diff > 0.1) {
        requestAnimationFrame(smoothTransition);
      }
    }

    smoothTransition();
  }

  // Render frame
  function render() {
    const w = containerWidth;
    const h = containerHeight;
    const padding = 40;

    // Clear with white background
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, w, h);

    // Calculate total score for normalization
    const totalScore = PILLARS.reduce((sum, p) => sum + (currentScores[p] || 0), 0);

    // Project all pillars
    const projected = {};
    PILLARS.forEach(pillar => {
      const world = WORLD_POSITIONS[pillar];
      projected[pillar] = projectPoint(world.x, world.y, camera, w, h, padding);
    });

    // === GRADIENT BACKGROUND LAYER ===
    renderGradientBackground(ctx, w, h, projected, currentScores, totalScore);

    // Draw glows for dominant pillars (score > 0.15)
    PILLARS.forEach(pillar => {
      const score = (currentScores[pillar] || 0) / totalScore;
      if (score > 0.15) {
        const pos = projected[pillar];

        // MAGNIFYING GLASS: Scale glows with distance
        const normalizedDist = pos.distFromCenter / 30;
        let distScale;
        if (normalizedDist < 0.3) {
          distScale = 1.0 + pos.fisheyeStrength * 1.8 * (0.3 - normalizedDist) / 0.3;
        } else if (normalizedDist < 0.8) {
          const middleT = (normalizedDist - 0.3) / 0.5;
          distScale = 1.0 + pos.fisheyeStrength * 0.4 * (1.0 - middleT);
        } else if (normalizedDist < 1.2) {
          const transT = (normalizedDist - 0.8) / 0.4;
          distScale = 1.0 - pos.fisheyeStrength * 0.2 * transT;
        } else {
          const edgeFactor = Math.min(normalizedDist - 1.2, 1.2);
          distScale = 1.0 - pos.fisheyeStrength * (0.2 + 0.6 * (edgeFactor / 1.2));
        }
        const radius = (6 + score * 120) * Math.max(0.15, Math.min(2.8, distScale));

        const gradient = ctx.createRadialGradient(pos.x, pos.y, radius, pos.x, pos.y, radius + 12);
        const color = getPillarColor(pillar, 0.13);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 12, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw pillar circles - show all 9 pillars with fisheye scaling
    PILLARS.forEach(pillar => {
      const score = (currentScores[pillar] || 0) / totalScore;
      const pos = projected[pillar];

      // Base radius from score
      const baseRadius = Math.max(6, 6 + score * 120);

      // MAGNIFYING GLASS: Center HUGE, middle grows (repelling), edges shrink
      const normalizedDist = pos.distFromCenter / 30;
      let distScale;
      if (normalizedDist < 0.3) {
        // CENTER: Grow HUGE (magnifying glass focus)
        distScale = 1.0 + pos.fisheyeStrength * 1.8 * (0.3 - normalizedDist) / 0.3;
      } else if (normalizedDist < 0.8) {
        // MIDDLE: Grow slightly (pushed by center expansion - repelling force)
        const middleT = (normalizedDist - 0.3) / 0.5;
        distScale = 1.0 + pos.fisheyeStrength * 0.4 * (1.0 - middleT);
      } else if (normalizedDist < 1.2) {
        // TRANSITION: Back to normal size
        const transT = (normalizedDist - 0.8) / 0.4;
        distScale = 1.0 - pos.fisheyeStrength * 0.2 * transT;
      } else {
        // EDGES: Shrink (compressed/contained)
        const edgeFactor = Math.min(normalizedDist - 1.2, 1.2);
        distScale = 1.0 - pos.fisheyeStrength * (0.2 + 0.6 * (edgeFactor / 1.2));
      }
      const radius = baseRadius * Math.max(0.15, Math.min(2.8, distScale));

      // Fade out very low scores but keep all visible
      const opacity = Math.max(0.2, Math.min(1, score * 8));

      ctx.fillStyle = getPillarColor(pillar, opacity);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw customer centroid dot
    const centroid = calculateCentroid(currentScores);
    const centroidProj = projectPoint(centroid.x, centroid.y, camera, w, h, padding);

    // Outer ring
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(centroidProj.x, centroidProj.y, 9, 0, Math.PI * 2);
    ctx.fill();

    // Inner dot
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(centroidProj.x, centroidProj.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw labels - show all 9 pillars with fisheye scaling
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    PILLARS.forEach(pillar => {
      const score = (currentScores[pillar] || 0) / totalScore;
      const pos = projected[pillar];

      // MAGNIFYING GLASS: Calculate radius with distance-based scaling
      const baseRadius = Math.max(6, 6 + score * 120);
      const normalizedDist = pos.distFromCenter / 30;
      let distScale;
      if (normalizedDist < 0.3) {
        distScale = 1.0 + pos.fisheyeStrength * 1.8 * (0.3 - normalizedDist) / 0.3;
      } else if (normalizedDist < 0.8) {
        const middleT = (normalizedDist - 0.3) / 0.5;
        distScale = 1.0 + pos.fisheyeStrength * 0.4 * (1.0 - middleT);
      } else if (normalizedDist < 1.2) {
        const transT = (normalizedDist - 0.8) / 0.4;
        distScale = 1.0 - pos.fisheyeStrength * 0.2 * transT;
      } else {
        const edgeFactor = Math.min(normalizedDist - 1.2, 1.2);
        distScale = 1.0 - pos.fisheyeStrength * (0.2 + 0.6 * (edgeFactor / 1.2));
      }
      const radius = baseRadius * Math.max(0.15, Math.min(2.8, distScale));

      // Scale font size with magnification
      const baseFontSize = Math.max(9, 9 + score * 4); // 9-13px range
      const fontSize = baseFontSize * Math.max(0.5, Math.min(1.8, distScale));

      // Fade label opacity with distance (far labels fade more)
      const baseOpacity = Math.max(0.25, Math.min(0.8, score * 6));
      const labelOpacity = baseOpacity * Math.max(0.3, Math.min(1, distScale));

      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = `rgba(0, 0, 0, ${labelOpacity})`;

      const label = pillar === 'fashionForward' ? 'fashFwd' : pillar;
      ctx.fillText(label, pos.x, pos.y - radius - 4);

      // Show percentage if score > 0.08 (always show since effect is subtle)
      if (score > 0.08) {
        ctx.font = `400 ${fontSize - 1}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillText(`${Math.round(score * 100)}%`, pos.x, pos.y - radius - 4 - fontSize);
      }
    });
  }

  // Event listeners
  document.getElementById('replayBtn')?.addEventListener('click', startAnimation);
  document.getElementById('viewModeBtn')?.addEventListener('click', toggleViewMode);

  // Initial render - start at overview (zoom 1.0) to match animation start
  currentScores = { ...profileAfter };
  camera = { cx: 50, cy: 50, zoom: 1.0 };
  render();

  // Auto-play
  if (autoPlay) {
    setTimeout(() => startAnimation(), 100);
  }

  // Return control API
  return {
    replay: startAnimation,
    toggleView: toggleViewMode,
    setScores: (scores) => {
      currentScores = { ...scores };
      const centroidRaw = calculateCentroid(scores);
      const centroid = constrainCamera(centroidRaw.x, centroidRaw.y, containerWidth, containerHeight);
      const zoom = calculateZoom(scores);
      camera = { cx: centroid.cx, cy: centroid.cy, zoom };
      render();
    },
    render
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.StyleSpaceMap = {
    render: renderStyleSpaceMap,
    PILLAR_POSITIONS: PILLAR_WORLD_POSITIONS
  };
}
