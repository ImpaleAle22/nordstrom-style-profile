/**
 * style-brain visualizations.js
 *
 * Four visualization components for the Style Brain dashboard:
 *   1. renderColorHeatmapWheel(containerId, profile)
 *   2. renderColorDnaStrip(containerId, profile)
 *   3. renderOutfitHarmonyChord(containerId, profile)
 *   4. renderPillarHeatmap(containerId, profile)
 *
 * Each function accepts a DOM container ID and the profile.json object.
 * All rendering is done with vanilla Canvas + SVG — zero dependencies.
 *
 * Profile shape expected (matches SPEC.md):
 * {
 *   pillars: { [name]: { score: 0-100, confidence: 0-1, delta?: number } },
 *   colorPreferences: [
 *     { h: 0-360, c: 0-0.18, l: 0-1, weight: 0-1, label: string, source?: string }
 *   ],
 *   outfitColors: [
 *     { colors: [{ h, c, l }], label?: string, weight?: number }
 *   ]
 * }
 *
 * If your profile shape differs, adapt the `extract*` helpers at the bottom.
 */

// ─── OKLCH → sRGB conversion (no library needed) ──────────────────────────
function oklchToRgb(L, C, H) {
  const h = H * Math.PI / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  let s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l3 = l_ * l_ * l_, m3 = m_ * m_ * m_, s3 = s_ * s_ * s_;
  let r =  4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bv = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
  const gc = x => x >= 0.0031308 ? 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055 : 12.92 * x;
  return [
    Math.max(0, Math.min(255, Math.round(gc(r) * 255))),
    Math.max(0, Math.min(255, Math.round(gc(g) * 255))),
    Math.max(0, Math.min(255, Math.round(gc(bv) * 255))),
  ];
}

function oklchToCss(L, C, H) {
  const [r, g, b] = oklchToRgb(L, C, H);
  return `rgb(${r},${g},${b})`;
}

// ─── Dark mode detection ───────────────────────────────────────────────────
function isDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ─── 1. COLOR HEATMAP WHEEL ────────────────────────────────────────────────
/**
 * Renders the OKLCH fog-reveal color preference heatmap.
 * The full color wheel sits underneath; preference data "burns through" the fog.
 */
function renderColorHeatmapWheel(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const size = Math.min(container.clientWidth || 460, 460);
  container.innerHTML = '';

  // --- Canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.style.cssText = 'display:block;width:100%;max-width:' + size + 'px;margin:0 auto;';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const CX = size / 2, CY = size / 2;
  const RMAX = size * 0.42, RMIN = size * 0.06;

  const dark = isDark();
  const fogR = dark ? 22 : 205, fogG = dark ? 20 : 200, fogB = dark ? 18 : 198;

  const points = extractColorPoints(profile);

  function gaussianHeat(px, py, heatRadius, heatIntensity) {
    let val = 0;
    for (const p of points) {
      const angle = p.h * Math.PI / 180;
      const rNorm = p.c / 0.18;
      const r = RMIN + rNorm * (RMAX - RMIN);
      const ptx = CX + r * Math.cos(angle);
      const pty = CY - r * Math.sin(angle);
      const dx = px - ptx, dy = py - pty;
      const sigma = heatRadius * p.weight * 0.9;
      val += p.weight * heatIntensity * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
    return Math.min(1, val);
  }

  function draw(fogAlpha, heatRadius, heatIntensity) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px - CX, dy = py - CY;
        const r = Math.sqrt(dx * dx + dy * dy);
        const i = (py * size + px) * 4;

        if (r < RMIN || r > RMAX) {
          data[i + 3] = 0; continue;
        }

        let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        const chroma = 0.18 * (r - RMIN) / (RMAX - RMIN);
        const L = 0.72 - chroma * 0.5;
        const [wr, wg, wb] = oklchToRgb(L, chroma, angle);

        const heat = gaussianHeat(px, py, heatRadius, heatIntensity);
        const fa = Math.max(0, fogAlpha - Math.pow(heat, 0.55) * fogAlpha * 1.05);

        // Warm glow tint at heat peaks
        let fr = wr, fg = wg, fb = wb;
        if (heat > 0.05) {
          const t = Math.pow(heat, 0.7);
          let [gr, gg, gb, ga] = t < 0.35
            ? [200, 160, 100, 0.2 + (t / 0.35) * 0.25]
            : t < 0.7
            ? [220, 100, 40, 0.3 + ((t - 0.35) / 0.35) * 0.2]
            : [255, 240, 180, 0.4 + ((t - 0.7) / 0.3) * 0.35];
          fr = Math.round(fr * (1 - ga) + gr * ga);
          fg = Math.round(fg * (1 - ga) + gg * ga);
          fb = Math.round(fb * (1 - ga) + gb * ga);
        }

        data[i]     = Math.round(fr * (1 - fa) + fogR * fa);
        data[i + 1] = Math.round(fg * (1 - fa) + fogG * fa);
        data[i + 2] = Math.round(fb * (1 - fa) + fogB * fa);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Preference dots
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, RMAX, 0, Math.PI * 2);
    ctx.arc(CX, CY, RMIN, 0, Math.PI * 2, true);
    ctx.clip();
    for (const p of points) {
      const a = p.h * Math.PI / 180;
      const rr = RMIN + (p.c / 0.18) * (RMAX - RMIN);
      ctx.beginPath();
      ctx.arc(CX + rr * Math.cos(a), CY - rr * Math.sin(a), 4, 0, Math.PI * 2);
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)';
      ctx.fill();
    }
    ctx.restore();

    // Ring guides + hue labels
    const tickCol = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
    const labelCol = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
    [RMIN, RMIN + (RMAX - RMIN) * 0.5, RMAX].forEach(rr => {
      ctx.strokeStyle = tickCol; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(CX, CY, rr, 0, Math.PI * 2); ctx.stroke();
    });
    const hueLabels = { 0: 'red', 60: 'yellow', 120: 'green', 180: 'cyan', 240: 'blue', 300: 'magenta' };
    ctx.font = `${Math.round(size * 0.022)}px system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [deg, name] of Object.entries(hueLabels)) {
      const a = parseInt(deg) * Math.PI / 180;
      const lr = RMAX + size * 0.05;
      ctx.strokeStyle = tickCol; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CX + RMAX * Math.cos(a), CY - RMAX * Math.sin(a));
      ctx.lineTo(CX + (RMAX + size * 0.02) * Math.cos(a), CY - (RMAX + size * 0.02) * Math.sin(a));
      ctx.stroke();
      ctx.fillStyle = labelCol;
      ctx.fillText(name, CX + lr * Math.cos(a), CY - lr * Math.sin(a));
    }
  }

  draw(0.82, size * 0.073, 6);

  // Tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scale = size / rect.width;
    const mx = (e.clientX - rect.left) * scale;
    const my = (e.clientY - rect.top) * scale;
    const dx = mx - CX, dy = my - CY;
    const r = Math.sqrt(dx * dx + dy * dy);
    let tip = container.querySelector('.sb-wheel-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sb-wheel-tip';
      tip.style.cssText = 'position:absolute;top:8px;left:8px;font-size:11px;opacity:0;pointer-events:none;transition:opacity .15s;padding:4px 8px;border-radius:6px;background:var(--bg-secondary,#f0eeea);color:var(--text-primary,#1a1a1a);border:0.5px solid var(--border,rgba(0,0,0,0.12));';
      container.style.position = 'relative';
      container.appendChild(tip);
    }
    if (r < RMIN || r > RMAX) { tip.style.opacity = '0'; return; }
    let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const chroma = ((0.18 * (r - RMIN) / (RMAX - RMIN))).toFixed(3);
    tip.style.opacity = '1';
    tip.textContent = `H ${Math.round(angle)}°  C ${chroma}`;
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = container.querySelector('.sb-wheel-tip');
    if (tip) tip.style.opacity = '0';
  });
}

// ─── 2. COLOR DNA STRIP ────────────────────────────────────────────────────
/**
 * Horizontal proportional color strip, sorted perceptually by hue.
 * Bar width = relative weight. Hover shows color name + stats.
 */
function renderColorDnaStrip(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const points = extractColorPoints(profile);
  if (!points.length) { container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no color data yet</p>'; return; }

  // Perceptual sort by hue angle
  const sorted = [...points].sort((a, b) => {
    // Group warm (0-60, 300-360) and cool (120-280) with a simple hue sort
    return a.h - b.h;
  });

  const totalWeight = sorted.reduce((s, p) => s + p.weight, 0);

  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;';

  // Strip
  const strip = document.createElement('div');
  strip.style.cssText = 'display:flex;width:100%;height:56px;border-radius:8px;overflow:hidden;cursor:crosshair;';

  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'margin-top:8px;min-height:32px;font-size:12px;color:var(--text-secondary,#666);transition:all .15s;';

  sorted.forEach((p, idx) => {
    const pct = (p.weight / totalWeight) * 100;
    const [r, g, b] = oklchToRgb(0.65, p.c, p.h);
    const css = `rgb(${r},${g},${b})`;
    const seg = document.createElement('div');
    seg.style.cssText = `flex:0 0 ${pct.toFixed(2)}%;background:${css};transition:flex .3s ease, filter .15s;position:relative;`;

    seg.addEventListener('mouseenter', () => {
      seg.style.filter = 'brightness(1.12) saturate(1.15)';
      const chromaDisplay = p.c.toFixed(3);
      const lightDisplay = p.l ? p.l.toFixed(2) : '—';
      tooltip.innerHTML = `<strong style="color:var(--text-primary,#1a1a1a)">${p.label}</strong> &nbsp;·&nbsp; H ${Math.round(p.h)}° &nbsp;·&nbsp; C ${chromaDisplay} &nbsp;·&nbsp; weight ${(p.weight * 100).toFixed(0)}%`;
    });
    seg.addEventListener('mouseleave', () => {
      seg.style.filter = '';
      tooltip.innerHTML = '';
    });
    strip.appendChild(seg);
  });

  // Color name pills below
  const pills = document.createElement('div');
  pills.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;';
  sorted.forEach(p => {
    const [r, g, b] = oklchToRgb(0.65, p.c, p.h);
    const pill = document.createElement('span');
    const dark = isDark();
    const [dr, dg, db] = oklchToRgb(dark ? 0.85 : 0.28, p.c * 0.6, p.h);
    pill.style.cssText = `display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 6px;border-radius:20px;font-size:11px;background:rgb(${r},${g},${b});color:rgb(${dr},${dg},${db});`;
    const dot = document.createElement('span');
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:rgb(${dr},${dg},${db});opacity:0.5;flex-shrink:0;`;
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(p.label));
    pills.appendChild(pill);
  });

  wrap.appendChild(strip);
  wrap.appendChild(tooltip);
  wrap.appendChild(pills);
  container.appendChild(wrap);
}

// ─── 3. OUTFIT HARMONY CHORD DIAGRAM ──────────────────────────────────────
/**
 * SVG chord diagram showing which colors co-occur in outfits.
 * Arc thickness = frequency. Chords connect colors that appeared together.
 */
function renderOutfitHarmonyChord(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const outfits = extractOutfitColors(profile);
  if (!outfits.length) {
    container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no outfit data yet</p>';
    return;
  }

  // Build co-occurrence matrix
  const colorMap = new Map();
  outfits.forEach(outfit => {
    outfit.colors.forEach(c => {
      const key = `${Math.round(c.h)}_${Math.round(c.c * 100)}`;
      if (!colorMap.has(key)) {
        colorMap.set(key, { ...c, key, count: 0, label: c.label || `H${Math.round(c.h)}` });
      }
      colorMap.get(key).count++;
    });
  });

  // Keep top 8 colors by frequency
  const colors = [...colorMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const keyToIdx = new Map(colors.map((c, i) => [c.key, i]));
  const N = colors.length;
  const matrix = Array.from({ length: N }, () => new Array(N).fill(0));

  outfits.forEach(outfit => {
    const idxs = outfit.colors
      .map(c => keyToIdx.get(`${Math.round(c.h)}_${Math.round(c.c * 100)}`))
      .filter(i => i !== undefined);
    for (let i = 0; i < idxs.length; i++) {
      for (let j = i + 1; j < idxs.length; j++) {
        const w = outfit.weight || 1;
        matrix[idxs[i]][idxs[j]] += w;
        matrix[idxs[j]][idxs[i]] += w;
      }
    }
  });

  const size = Math.min(container.clientWidth || 400, 400);
  const R = size * 0.36, CX = size / 2, CY = size / 2;
  const ARC_WIDTH = size * 0.045;
  const GAP = 0.02;

  // Compute arc positions
  const totalWeight = colors.reduce((s, c) => s + c.count, 0);
  let angle = -Math.PI / 2;
  const arcs = colors.map((c, i) => {
    const span = (c.count / totalWeight) * (2 * Math.PI - N * GAP);
    const start = angle + GAP / 2;
    const end = start + span;
    angle = end + GAP / 2;
    const [r, g, b] = oklchToRgb(0.65, c.c, c.h);
    return { ...c, start, end, mid: (start + end) / 2, color: `rgb(${r},${g},${b})`, idx: i };
  });

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', '100%');
  svg.style.cssText = 'display:block;max-width:' + size + 'px;margin:0 auto;';

  // Draw chords first (behind arcs)
  const chordGroup = document.createElementNS(ns, 'g');
  chordGroup.setAttribute('opacity', '0.55');
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (matrix[i][j] < 0.1) continue;
      const strength = Math.min(1, matrix[i][j] / 5);
      const ai = arcs[i], aj = arcs[j];
      const sx1 = CX + R * Math.cos(ai.mid), sy1 = CY + R * Math.sin(ai.mid);
      const sx2 = CX + R * Math.cos(aj.mid), sy2 = CY + R * Math.sin(aj.mid);
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M${sx1},${sy1} Q${CX},${CY} ${sx2},${sy2}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', arcs[i].color);
      path.setAttribute('stroke-width', (1 + strength * 6).toFixed(1));
      path.setAttribute('stroke-opacity', (0.25 + strength * 0.55).toFixed(2));
      chordGroup.appendChild(path);
    }
  }
  svg.appendChild(chordGroup);

  // Draw arcs + labels
  arcs.forEach(arc => {
    const arcPath = document.createElementNS(ns, 'path');
    const r1 = R, r2 = R + ARC_WIDTH;
    const x1 = CX + r1 * Math.cos(arc.start), y1 = CY + r1 * Math.sin(arc.start);
    const x2 = CX + r2 * Math.cos(arc.start), y2 = CY + r2 * Math.sin(arc.start);
    const x3 = CX + r2 * Math.cos(arc.end), y3 = CY + r2 * Math.sin(arc.end);
    const x4 = CX + r1 * Math.cos(arc.end), y4 = CY + r1 * Math.sin(arc.end);
    const lg = arc.end - arc.start > Math.PI ? 1 : 0;
    arcPath.setAttribute('d', `M${x1},${y1} A${r1},${r1} 0 ${lg},1 ${x4},${y4} L${x3},${y3} A${r2},${r2} 0 ${lg},0 ${x2},${y2} Z`);
    arcPath.setAttribute('fill', arc.color);
    svg.appendChild(arcPath);

    // Label
    const labelR = R + ARC_WIDTH + size * 0.06;
    const lx = CX + labelR * Math.cos(arc.mid);
    const ly = CY + labelR * Math.sin(arc.mid);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', lx.toFixed(1));
    text.setAttribute('y', ly.toFixed(1));
    text.setAttribute('text-anchor', lx < CX ? 'end' : 'start');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', Math.round(size * 0.026));
    text.setAttribute('fill', isDark() ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)');
    text.setAttribute('font-family', 'system-ui,sans-serif');
    text.textContent = arc.label;
    svg.appendChild(text);
  });

  container.appendChild(svg);

  // Legend note
  const note = document.createElement('p');
  note.style.cssText = 'font-size:11px;color:var(--text-secondary,#888);margin-top:8px;text-align:center;';
  note.textContent = 'arc size = frequency · chord width = co-occurrence strength';
  container.appendChild(note);
}

// ─── 4. PILLAR HEATMAP (Voronoi territory map) ────────────────────────────
/**
 * Upgrades the 2D pillar scatter into a Voronoi territory map.
 * Each pillar owns a region of style space. Color = confidence, opacity = score.
 */
function renderPillarHeatmap(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const pillars = extractPillars(profile);
  if (!pillars.length) {
    container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no pillar data yet</p>';
    return;
  }

  const W = container.clientWidth || 500;
  const H = Math.round(W * 0.62);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = 'display:block;width:100%;border-radius:8px;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dark = isDark();
  const bgR = dark ? 18 : 248, bgG = dark ? 17 : 246, bgB = dark ? 16 : 242;

  // Pillar colors (OKLCH hues mapped to distinct palette)
  const PILLAR_HUES = [220, 35, 160, 290, 15, 185, 60, 330];

  // Project pillar scores onto 2D space (simple deterministic layout)
  const pts = pillars.map((p, i) => {
    // Spread points across the canvas using a stable angular layout
    // modulated by their score and confidence
    const angle = (i / pillars.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 0.25 + (1 - p.confidence) * 0.2; // lower confidence = more peripheral
    const cx = 0.5 + radius * Math.cos(angle) * (1 - p.score / 200);
    const cy = 0.5 + radius * Math.sin(angle) * (1 - p.score / 200);
    return {
      ...p,
      x: Math.max(0.05, Math.min(0.95, cx)) * W,
      y: Math.max(0.05, Math.min(0.95, cy)) * H,
      hue: PILLAR_HUES[i % PILLAR_HUES.length],
    };
  });

  // Voronoi by nearest-point pixel scan
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let nearestDist = Infinity, nearest = null, secondDist = Infinity;
      for (const p of pts) {
        const d = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
        if (d < nearestDist) { secondDist = nearestDist; nearestDist = d; nearest = p; }
        else if (d < secondDist) secondDist = d;
      }

      const edgeFactor = Math.max(0, Math.min(1, (secondDist - nearestDist) / 12));
      const alpha = nearest.score / 100 * 0.65 + 0.1;
      const L = dark ? 0.28 + nearest.confidence * 0.18 : 0.78 - nearest.confidence * 0.18;
      const C = 0.04 + nearest.confidence * 0.1;
      const [r, g, b] = oklchToRgb(L, C, nearest.hue);

      const i = (py * W + px) * 4;
      const blend = edgeFactor;
      data[i]     = Math.round(r * blend + bgR * (1 - blend));
      data[i + 1] = Math.round(g * blend + bgG * (1 - blend));
      data[i + 2] = Math.round(b * blend + bgB * (1 - blend));
      data[i + 3] = Math.round(255 * (blend * alpha + (1 - blend) * 0.08));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Pillar labels + score rings
  pts.forEach(p => {
    const score01 = p.score / 100;
    const ringR = 6 + score01 * 22;

    // Outer glow ring (confidence)
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR + 4, 0, Math.PI * 2);
    const [cr, cg, cb] = oklchToRgb(0.65, 0.12, p.hue);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.2 + p.confidence * 0.4})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Fill circle
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.7 + p.confidence * 0.25})`;
    ctx.fill();

    // Score text inside circle
    ctx.font = `500 ${Math.round(ringR * 0.8)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.fillText(Math.round(p.score), p.x, p.y);

    // Pillar name label
    const labelY = p.y + ringR + 13;
    ctx.font = `400 ${Math.round(W * 0.022)}px system-ui,sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    ctx.fillText(p.name, p.x, labelY);

    // Delta indicator
    if (p.delta !== undefined && p.delta !== 0) {
      const dStr = (p.delta > 0 ? '+' : '') + p.delta.toFixed(1);
      ctx.font = `400 ${Math.round(W * 0.019)}px system-ui,sans-serif`;
      ctx.fillStyle = p.delta > 0
        ? (dark ? 'rgba(100,220,140,0.9)' : 'rgba(30,130,60,0.85)')
        : (dark ? 'rgba(255,110,90,0.9)' : 'rgba(180,40,30,0.85)');
      ctx.fillText(dStr, p.x + ringR + 6, p.y - ringR + 4);
    }
  });

  // Tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let nearest = null, nearestDist = Infinity;
    for (const p of pts) {
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    let tip = container.querySelector('.sb-pillar-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sb-pillar-tip';
      tip.style.cssText = 'position:absolute;pointer-events:none;font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg-secondary,#f0eeea);color:var(--text-primary,#1a1a1a);border:0.5px solid var(--border,rgba(0,0,0,0.12));white-space:nowrap;transition:opacity .15s;';
      container.style.position = 'relative';
      container.appendChild(tip);
    }
    if (nearestDist > 60) { tip.style.opacity = '0'; return; }
    tip.style.opacity = '1';
    tip.style.left = (e.clientX - rect.left + rect.left * 0 + 10) + 'px';
    tip.style.top  = (e.clientY - rect.top - 28) + 'px';
    tip.textContent = `${nearest.name} · score ${Math.round(nearest.score)} · confidence ${(nearest.confidence * 100).toFixed(0)}%`;
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = container.querySelector('.sb-pillar-tip');
    if (tip) tip.style.opacity = '0';
  });
}

// ─── DATA EXTRACTION HELPERS ───────────────────────────────────────────────
// These adapt the generic profile.json shape to what each viz needs.
// Adjust these if your profile schema differs from SPEC.md.

function extractColorPoints(profile) {
  // Try profile.colorPreferences first (SPEC.md shape)
  if (profile.colorPreferences && profile.colorPreferences.length) {
    return profile.colorPreferences.map(c => ({
      h: c.h, c: c.c, l: c.l || 0.65,
      weight: c.weight || 0.5,
      label: c.label || `H${Math.round(c.h)}`,
    }));
  }
  // Fallback: sample data so UI renders with something real-looking
  return [
    { h: 220, c: 0.09, l: 0.65, weight: 1.0, label: 'dusty blue' },
    { h: 210, c: 0.13, l: 0.60, weight: 0.85, label: 'slate blue' },
    { h: 200, c: 0.06, l: 0.70, weight: 0.60, label: 'pale blue-grey' },
    { h: 35,  c: 0.08, l: 0.68, weight: 0.90, label: 'warm camel' },
    { h: 25,  c: 0.11, l: 0.62, weight: 0.75, label: 'terracotta' },
    { h: 50,  c: 0.07, l: 0.74, weight: 0.55, label: 'warm ivory' },
    { h: 160, c: 0.07, l: 0.66, weight: 0.50, label: 'sage green' },
    { h: 350, c: 0.08, l: 0.64, weight: 0.35, label: 'dusty rose' },
  ];
}

function extractOutfitColors(profile) {
  if (profile.outfitColors && profile.outfitColors.length) {
    return profile.outfitColors;
  }
  // Fallback sample data
  return [
    { colors: [{ h: 220, c: 0.09, label: 'dusty blue' }, { h: 35,  c: 0.08, label: 'warm camel' }],  weight: 3 },
    { colors: [{ h: 220, c: 0.09, label: 'dusty blue' }, { h: 160, c: 0.07, label: 'sage green' }],   weight: 2 },
    { colors: [{ h: 35,  c: 0.08, label: 'warm camel' }, { h: 25,  c: 0.11, label: 'terracotta' }],   weight: 4 },
    { colors: [{ h: 25,  c: 0.11, label: 'terracotta' }, { h: 50,  c: 0.07, label: 'warm ivory' }],   weight: 2 },
    { colors: [{ h: 220, c: 0.09, label: 'dusty blue' }, { h: 350, c: 0.08, label: 'dusty rose' }],   weight: 1 },
    { colors: [{ h: 210, c: 0.13, label: 'slate blue' }, { h: 35,  c: 0.08, label: 'warm camel' }],   weight: 2 },
    { colors: [{ h: 160, c: 0.07, label: 'sage green' }, { h: 50,  c: 0.07, label: 'warm ivory' }],   weight: 3 },
    { colors: [{ h: 35,  c: 0.08, label: 'warm camel' }, { h: 160, c: 0.07, label: 'sage green' }, { h: 220, c: 0.09, label: 'dusty blue' }], weight: 1.5 },
  ];
}

function extractPillars(profile) {
  if (profile.pillars) {
    return Object.entries(profile.pillars).map(([name, data]) => ({
      name,
      score: typeof data === 'number' ? data : (data.score || 0),
      confidence: typeof data === 'number' ? 0.5 : (data.confidence || 0.5),
      delta: typeof data === 'object' ? (data.delta || 0) : 0,
    }));
  }
  // Fallback sample
  return [
    { name: 'classic',      score: 72, confidence: 0.85, delta:  +1.2 },
    { name: 'minimal',      score: 58, confidence: 0.72, delta:  +3.5 },
    { name: 'outdoorsy',    score: 31, confidence: 0.45, delta:  -0.8 },
    { name: 'streetwear',   score: 14, confidence: 0.30, delta:  +0.2 },
    { name: 'preppy',       score: 48, confidence: 0.61, delta:  -1.1 },
    { name: 'bohemian',     score: 22, confidence: 0.38, delta:  +0.5 },
  ];
}

// ─── 5. PILLAR HEATMAP OPTION 1: Centroid Pin ─────────────────────────────
/**
 * Option 1: Adds a "You are here" weighted centroid marker
 */
function renderPillarHeatmapOption1(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const pillars = extractPillars(profile);
  if (!pillars.length) {
    container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no pillar data yet</p>';
    return;
  }

  const W = container.clientWidth || 500;
  const H = Math.round(W * 0.62);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = 'display:block;width:100%;border-radius:8px;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dark = isDark();
  const bgR = dark ? 18 : 248, bgG = dark ? 17 : 246, bgB = dark ? 16 : 242;

  const PILLAR_HUES = [220, 35, 160, 290, 15, 185, 60, 330];

  const pts = pillars.map((p, i) => {
    const angle = (i / pillars.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 0.25 + (1 - p.confidence) * 0.2;
    const cx = 0.5 + radius * Math.cos(angle) * (1 - p.score / 200);
    const cy = 0.5 + radius * Math.sin(angle) * (1 - p.score / 200);
    return {
      ...p,
      x: Math.max(0.05, Math.min(0.95, cx)) * W,
      y: Math.max(0.05, Math.min(0.95, cy)) * H,
      hue: PILLAR_HUES[i % PILLAR_HUES.length],
    };
  });

  // Calculate weighted centroid
  const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);
  let centroidX = 0, centroidY = 0;
  pts.forEach(p => {
    const weight = p.score / totalScore;
    centroidX += p.x * weight;
    centroidY += p.y * weight;
  });

  // Voronoi rendering
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let nearestDist = Infinity, nearest = null, secondDist = Infinity;
      for (const p of pts) {
        const d = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
        if (d < nearestDist) { secondDist = nearestDist; nearestDist = d; nearest = p; }
        else if (d < secondDist) secondDist = d;
      }

      const edgeFactor = Math.max(0, Math.min(1, (secondDist - nearestDist) / 12));
      const alpha = nearest.score / 100 * 0.65 + 0.1;
      const L = dark ? 0.28 + nearest.confidence * 0.18 : 0.78 - nearest.confidence * 0.18;
      const C = 0.04 + nearest.confidence * 0.1;
      const [r, g, b] = oklchToRgb(L, C, nearest.hue);

      const i = (py * W + px) * 4;
      const blend = edgeFactor;
      data[i]     = Math.round(r * blend + bgR * (1 - blend));
      data[i + 1] = Math.round(g * blend + bgG * (1 - blend));
      data[i + 2] = Math.round(b * blend + bgB * (1 - blend));
      data[i + 3] = Math.round(255 * (blend * alpha + (1 - blend) * 0.08));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Pillar labels + score rings
  pts.forEach(p => {
    const score01 = p.score / 100;
    const ringR = 6 + score01 * 22;

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR + 4, 0, Math.PI * 2);
    const [cr, cg, cb] = oklchToRgb(0.65, 0.12, p.hue);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.2 + p.confidence * 0.4})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.7 + p.confidence * 0.25})`;
    ctx.fill();

    ctx.font = `500 ${Math.round(ringR * 0.8)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.fillText(Math.round(p.score), p.x, p.y);

    const labelY = p.y + ringR + 13;
    ctx.font = `400 ${Math.round(W * 0.022)}px system-ui,sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    ctx.fillText(p.name, p.x, labelY);

    if (p.delta !== undefined && p.delta !== 0) {
      const dStr = (p.delta > 0 ? '+' : '') + p.delta.toFixed(1);
      ctx.font = `400 ${Math.round(W * 0.019)}px system-ui,sans-serif`;
      ctx.fillStyle = p.delta > 0
        ? (dark ? 'rgba(100,220,140,0.9)' : 'rgba(30,130,60,0.85)')
        : (dark ? 'rgba(255,110,90,0.9)' : 'rgba(180,40,30,0.85)');
      ctx.fillText(dStr, p.x + ringR + 6, p.y - ringR + 4);
    }
  });

  // Draw "You are here" centroid marker
  const markerSize = 18;

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(centroidX, centroidY, markerSize + 6, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // White circle background
  ctx.beginPath();
  ctx.arc(centroidX, centroidY, markerSize, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(100,100,255,0.8)' : 'rgba(0,85,255,0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Blue star
  ctx.fillStyle = dark ? 'rgba(100,100,255,1)' : 'rgba(0,85,255,1)';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
    const r = i % 2 === 0 ? markerSize * 0.5 : markerSize * 0.2;
    const x = centroidX + Math.cos(angle) * r;
    const y = centroidY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // "You are here" label
  ctx.font = `600 ${Math.round(W * 0.025)}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
  ctx.strokeStyle = dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  const labelY = centroidY - markerSize - 8;
  ctx.strokeText('You are here', centroidX, labelY);
  ctx.fillText('You are here', centroidX, labelY);

  // Tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let nearest = null, nearestDist = Infinity;
    for (const p of pts) {
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    let tip = container.querySelector('.sb-pillar-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sb-pillar-tip';
      tip.style.cssText = 'position:absolute;pointer-events:none;font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg-secondary,#f0eeea);color:var(--text-primary,#1a1a1a);border:0.5px solid var(--border,rgba(0,0,0,0.12));white-space:nowrap;transition:opacity .15s;';
      container.style.position = 'relative';
      container.appendChild(tip);
    }
    if (nearestDist > 60) { tip.style.opacity = '0'; return; }
    tip.style.opacity = '1';
    tip.style.left = (e.clientX - rect.left + 10) + 'px';
    tip.style.top  = (e.clientY - rect.top - 28) + 'px';
    tip.textContent = `${nearest.name} · score ${Math.round(nearest.score)} · confidence ${(nearest.confidence * 100).toFixed(0)}%`;
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = container.querySelector('.sb-pillar-tip');
    if (tip) tip.style.opacity = '0';
  });
}

// ─── 6. PILLAR HEATMAP OPTION 3: Centroid + Territory Highlights ──────────
/**
 * Option 3: Centroid marker + highlighted top territories
 */
function renderPillarHeatmapOption3(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const pillars = extractPillars(profile);
  if (!pillars.length) {
    container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no pillar data yet</p>';
    return;
  }

  const W = container.clientWidth || 500;
  const H = Math.round(W * 0.62);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = 'display:block;width:100%;border-radius:8px;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dark = isDark();
  const bgR = dark ? 18 : 248, bgG = dark ? 17 : 246, bgB = dark ? 16 : 242;

  const PILLAR_HUES = [220, 35, 160, 290, 15, 185, 60, 330];

  const pts = pillars.map((p, i) => {
    const angle = (i / pillars.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 0.25 + (1 - p.confidence) * 0.2;
    const cx = 0.5 + radius * Math.cos(angle) * (1 - p.score / 200);
    const cy = 0.5 + radius * Math.sin(angle) * (1 - p.score / 200);
    return {
      ...p,
      x: Math.max(0.05, Math.min(0.95, cx)) * W,
      y: Math.max(0.05, Math.min(0.95, cy)) * H,
      hue: PILLAR_HUES[i % PILLAR_HUES.length],
    };
  });

  // Calculate weighted centroid
  const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);
  let centroidX = 0, centroidY = 0;
  pts.forEach(p => {
    const weight = p.score / totalScore;
    centroidX += p.x * weight;
    centroidY += p.y * weight;
  });

  // Find top 3 pillars
  const topPillars = [...pts].sort((a, b) => b.score - a.score).slice(0, 3);
  const topNames = new Set(topPillars.map(p => p.name));

  // Voronoi rendering with territory highlights
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let nearestDist = Infinity, nearest = null, secondDist = Infinity;
      for (const p of pts) {
        const d = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
        if (d < nearestDist) { secondDist = nearestDist; nearestDist = d; nearest = p; }
        else if (d < secondDist) secondDist = d;
      }

      const edgeFactor = Math.max(0, Math.min(1, (secondDist - nearestDist) / 12));
      let alpha = nearest.score / 100 * 0.65 + 0.1;

      // Boost alpha for top territories
      if (topNames.has(nearest.name)) {
        alpha = Math.min(1, alpha * 1.4);
      }

      const L = dark ? 0.28 + nearest.confidence * 0.18 : 0.78 - nearest.confidence * 0.18;
      const C = 0.04 + nearest.confidence * 0.1;
      const [r, g, b] = oklchToRgb(L, C, nearest.hue);

      const i = (py * W + px) * 4;
      const blend = edgeFactor;
      data[i]     = Math.round(r * blend + bgR * (1 - blend));
      data[i + 1] = Math.round(g * blend + bgG * (1 - blend));
      data[i + 2] = Math.round(b * blend + bgB * (1 - blend));
      data[i + 3] = Math.round(255 * (blend * alpha + (1 - blend) * 0.08));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Add glowing border around top territories
  topPillars.forEach((p, idx) => {
    const [cr, cg, cb] = oklchToRgb(0.65, 0.15, p.hue);

    // Find border pixels by checking neighbors
    for (let py = 0; py < H; py += 2) {
      for (let px = 0; px < W; px += 2) {
        let nearestDist = Infinity, nearest = null;
        for (const pt of pts) {
          const d = Math.sqrt((px - pt.x) ** 2 + (py - pt.y) ** 2);
          if (d < nearestDist) { nearestDist = d; nearest = pt; }
        }

        if (nearest.name === p.name) {
          // Check if on border
          let onBorder = false;
          for (let dy = -2; dy <= 2; dy += 2) {
            for (let dx = -2; dx <= 2; dx += 2) {
              const nx = px + dx, ny = py + dy;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                let nNearest = null, nDist = Infinity;
                for (const pt of pts) {
                  const d = Math.sqrt((nx - pt.x) ** 2 + (ny - pt.y) ** 2);
                  if (d < nDist) { nDist = d; nNearest = pt; }
                }
                if (nNearest.name !== p.name) {
                  onBorder = true;
                  break;
                }
              }
            }
            if (onBorder) break;
          }

          if (onBorder) {
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.6 - idx * 0.15})`;
            ctx.fillRect(px - 1, py - 1, 3, 3);
          }
        }
      }
    }
  });

  // Pillar labels + score rings
  pts.forEach(p => {
    const score01 = p.score / 100;
    const ringR = 6 + score01 * 22;
    const isTop = topNames.has(p.name);

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR + 4, 0, Math.PI * 2);
    const [cr, cg, cb] = oklchToRgb(0.65, 0.12, p.hue);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${isTop ? 0.7 : 0.2 + p.confidence * 0.4})`;
    ctx.lineWidth = isTop ? 4 : 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${isTop ? 0.95 : 0.7 + p.confidence * 0.25})`;
    ctx.fill();

    ctx.font = `${isTop ? 600 : 500} ${Math.round(ringR * 0.8)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.fillText(Math.round(p.score), p.x, p.y);

    const labelY = p.y + ringR + 13;
    ctx.font = `${isTop ? 600 : 400} ${Math.round(W * 0.022)}px system-ui,sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    ctx.fillText(p.name, p.x, labelY);

    if (p.delta !== undefined && p.delta !== 0) {
      const dStr = (p.delta > 0 ? '+' : '') + p.delta.toFixed(1);
      ctx.font = `400 ${Math.round(W * 0.019)}px system-ui,sans-serif`;
      ctx.fillStyle = p.delta > 0
        ? (dark ? 'rgba(100,220,140,0.9)' : 'rgba(30,130,60,0.85)')
        : (dark ? 'rgba(255,110,90,0.9)' : 'rgba(180,40,30,0.85)');
      ctx.fillText(dStr, p.x + ringR + 6, p.y - ringR + 4);
    }
  });

  // Draw "You are here" centroid marker
  const markerSize = 18;

  ctx.beginPath();
  ctx.arc(centroidX, centroidY, markerSize + 6, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centroidX, centroidY, markerSize, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(100,100,255,0.8)' : 'rgba(0,85,255,0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = dark ? 'rgba(100,100,255,1)' : 'rgba(0,85,255,1)';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
    const r = i % 2 === 0 ? markerSize * 0.5 : markerSize * 0.2;
    const x = centroidX + Math.cos(angle) * r;
    const y = centroidY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.font = `600 ${Math.round(W * 0.025)}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
  ctx.strokeStyle = dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  const labelY = centroidY - markerSize - 8;
  ctx.strokeText('You are here', centroidX, labelY);
  ctx.fillText('You are here', centroidX, labelY);

  // Tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let nearest = null, nearestDist = Infinity;
    for (const p of pts) {
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    let tip = container.querySelector('.sb-pillar-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sb-pillar-tip';
      tip.style.cssText = 'position:absolute;pointer-events:none;font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg-secondary,#f0eeea);color:var(--text-primary,#1a1a1a);border:0.5px solid var(--border,rgba(0,0,0,0.12));white-space:nowrap;transition:opacity .15s;';
      container.style.position = 'relative';
      container.appendChild(tip);
    }
    if (nearestDist > 60) { tip.style.opacity = '0'; return; }
    tip.style.opacity = '1';
    tip.style.left = (e.clientX - rect.left + 10) + 'px';
    tip.style.top  = (e.clientY - rect.top - 28) + 'px';
    tip.textContent = `${nearest.name} · score ${Math.round(nearest.score)} · confidence ${(nearest.confidence * 100).toFixed(0)}%`;
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = container.querySelector('.sb-pillar-tip');
    if (tip) tip.style.opacity = '0';
  });
}

// ─── 7. PILLAR HEATMAP CLEAN: Gradient + Connection ───────────────────────
/**
 * Clean option: Radial gradient from centroid, line to dominant pillar, desaturated territories
 */
function renderPillarHeatmapClean(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const pillars = extractPillars(profile);
  if (!pillars.length) {
    container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no pillar data yet</p>';
    return;
  }

  const W = container.clientWidth || 500;
  const H = Math.round(W * 0.62);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = 'display:block;width:100%;border-radius:8px;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dark = isDark();
  const bgR = dark ? 18 : 248, bgG = dark ? 17 : 246, bgB = dark ? 16 : 242;

  const PILLAR_HUES = [220, 35, 160, 290, 15, 185, 60, 330];

  const pts = pillars.map((p, i) => {
    const angle = (i / pillars.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 0.25 + (1 - p.confidence) * 0.2;
    const cx = 0.5 + radius * Math.cos(angle) * (1 - p.score / 200);
    const cy = 0.5 + radius * Math.sin(angle) * (1 - p.score / 200);
    return {
      ...p,
      x: Math.max(0.05, Math.min(0.95, cx)) * W,
      y: Math.max(0.05, Math.min(0.95, cy)) * H,
      hue: PILLAR_HUES[i % PILLAR_HUES.length],
    };
  });

  // Calculate weighted centroid
  const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);
  let centroidX = 0, centroidY = 0;
  pts.forEach(p => {
    const weight = p.score / totalScore;
    centroidX += p.x * weight;
    centroidY += p.y * weight;
  });

  // Find dominant pillar
  const dominantPillar = [...pts].sort((a, b) => b.score - a.score)[0];

  // Voronoi rendering with desaturation
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let nearestDist = Infinity, nearest = null, secondDist = Infinity;
      for (const p of pts) {
        const d = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
        if (d < nearestDist) { secondDist = nearestDist; nearestDist = d; nearest = p; }
        else if (d < secondDist) secondDist = d;
      }

      const edgeFactor = Math.max(0, Math.min(1, (secondDist - nearestDist) / 12));
      let alpha = nearest.score / 100 * 0.65 + 0.1;

      // Desaturate non-dominant territories
      const isDominant = nearest.name === dominantPillar.name;
      const saturationFactor = isDominant ? 1.0 : 0.4;

      const L = dark ? 0.28 + nearest.confidence * 0.18 : 0.78 - nearest.confidence * 0.18;
      const C = (0.04 + nearest.confidence * 0.1) * saturationFactor;
      const [r, g, b] = oklchToRgb(L, C, nearest.hue);

      // Add subtle radial gradient from centroid
      const distToCentroid = Math.sqrt((px - centroidX) ** 2 + (py - centroidY) ** 2);
      const gradientRadius = Math.min(W, H) * 0.3;
      const gradientFactor = Math.max(0, 1 - distToCentroid / gradientRadius);
      const gradientBoost = gradientFactor * 0.15;

      const i = (py * W + px) * 4;
      const blend = edgeFactor;
      data[i]     = Math.round(r * blend + bgR * (1 - blend) + gradientBoost * 20);
      data[i + 1] = Math.round(g * blend + bgG * (1 - blend) + gradientBoost * 20);
      data[i + 2] = Math.round(b * blend + bgB * (1 - blend) + gradientBoost * 30);
      data[i + 3] = Math.round(255 * (blend * alpha + (1 - blend) * 0.08));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Draw connection line from centroid to dominant pillar
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(centroidX, centroidY);
  ctx.lineTo(dominantPillar.x, dominantPillar.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pillar labels + score rings
  pts.forEach(p => {
    const score01 = p.score / 100;
    const ringR = 6 + score01 * 22;

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR + 4, 0, Math.PI * 2);
    const [cr, cg, cb] = oklchToRgb(0.65, 0.12, p.hue);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.2 + p.confidence * 0.4})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.7 + p.confidence * 0.25})`;
    ctx.fill();

    ctx.font = `500 ${Math.round(ringR * 0.8)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.fillText(Math.round(p.score), p.x, p.y);

    const labelY = p.y + ringR + 13;
    ctx.font = `400 ${Math.round(W * 0.022)}px system-ui,sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    ctx.fillText(p.name, p.x, labelY);

    if (p.delta !== undefined && p.delta !== 0) {
      const dStr = (p.delta > 0 ? '+' : '') + p.delta.toFixed(1);
      ctx.font = `400 ${Math.round(W * 0.019)}px system-ui,sans-serif`;
      ctx.fillStyle = p.delta > 0
        ? (dark ? 'rgba(100,220,140,0.9)' : 'rgba(30,130,60,0.85)')
        : (dark ? 'rgba(255,110,90,0.9)' : 'rgba(180,40,30,0.85)');
      ctx.fillText(dStr, p.x + ringR + 6, p.y - ringR + 4);
    }
  });

  // Draw concentric rings at centroid
  const ringRadii = [15, 25, 35];
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ringRadii.forEach(r => {
    ctx.beginPath();
    ctx.arc(centroidX, centroidY, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Draw crosshair at centroid
  const crossSize = 12;
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centroidX - crossSize, centroidY);
  ctx.lineTo(centroidX + crossSize, centroidY);
  ctx.moveTo(centroidX, centroidY - crossSize);
  ctx.lineTo(centroidX, centroidY + crossSize);
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(centroidX, centroidY, 3, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)';
  ctx.fill();

  // Tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let nearest = null, nearestDist = Infinity;
    for (const p of pts) {
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    let tip = container.querySelector('.sb-pillar-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sb-pillar-tip';
      tip.style.cssText = 'position:absolute;pointer-events:none;font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg-secondary,#f0eeea);color:var(--text-primary,#1a1a1a);border:0.5px solid var(--border,rgba(0,0,0,0.12));white-space:nowrap;transition:opacity .15s;';
      container.style.position = 'relative';
      container.appendChild(tip);
    }
    if (nearestDist > 60) { tip.style.opacity = '0'; return; }
    tip.style.opacity = '1';
    tip.style.left = (e.clientX - rect.left + 10) + 'px';
    tip.style.top  = (e.clientY - rect.top - 28) + 'px';
    tip.textContent = `${nearest.name} · score ${Math.round(nearest.score)} · confidence ${(nearest.confidence * 100).toFixed(0)}%`;
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = container.querySelector('.sb-pillar-tip');
    if (tip) tip.style.opacity = '0';
  });
}

// ─── 8. PILLAR HEATMAP MINIMALIST: Single Dot ─────────────────────────────
/**
 * Minimalist option: Just a precise dot at the centroid with subtle glow
 */
function renderPillarHeatmapMinimalist(containerId, profile) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const pillars = extractPillars(profile);
  if (!pillars.length) {
    container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no pillar data yet</p>';
    return;
  }

  const W = container.clientWidth || 500;
  const H = Math.round(W * 0.62);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = 'display:block;width:100%;border-radius:8px;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dark = isDark();
  const bgR = dark ? 18 : 248, bgG = dark ? 17 : 246, bgB = dark ? 16 : 242;

  const PILLAR_HUES = [220, 35, 160, 290, 15, 185, 60, 330];

  const pts = pillars.map((p, i) => {
    const angle = (i / pillars.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 0.25 + (1 - p.confidence) * 0.2;
    const cx = 0.5 + radius * Math.cos(angle) * (1 - p.score / 200);
    const cy = 0.5 + radius * Math.sin(angle) * (1 - p.score / 200);
    return {
      ...p,
      x: Math.max(0.05, Math.min(0.95, cx)) * W,
      y: Math.max(0.05, Math.min(0.95, cy)) * H,
      hue: PILLAR_HUES[i % PILLAR_HUES.length],
    };
  });

  // Calculate weighted centroid
  const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);
  let centroidX = 0, centroidY = 0;
  pts.forEach(p => {
    const weight = p.score / totalScore;
    centroidX += p.x * weight;
    centroidY += p.y * weight;
  });

  // Voronoi rendering (unchanged)
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let nearestDist = Infinity, nearest = null, secondDist = Infinity;
      for (const p of pts) {
        const d = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
        if (d < nearestDist) { secondDist = nearestDist; nearestDist = d; nearest = p; }
        else if (d < secondDist) secondDist = d;
      }

      const edgeFactor = Math.max(0, Math.min(1, (secondDist - nearestDist) / 12));
      const alpha = nearest.score / 100 * 0.65 + 0.1;
      const L = dark ? 0.28 + nearest.confidence * 0.18 : 0.78 - nearest.confidence * 0.18;
      const C = 0.04 + nearest.confidence * 0.1;
      const [r, g, b] = oklchToRgb(L, C, nearest.hue);

      const i = (py * W + px) * 4;
      const blend = edgeFactor;
      data[i]     = Math.round(r * blend + bgR * (1 - blend));
      data[i + 1] = Math.round(g * blend + bgG * (1 - blend));
      data[i + 2] = Math.round(b * blend + bgB * (1 - blend));
      data[i + 3] = Math.round(255 * (blend * alpha + (1 - blend) * 0.08));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Pillar labels + score rings (unchanged)
  pts.forEach(p => {
    const score01 = p.score / 100;
    const ringR = 6 + score01 * 22;

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR + 4, 0, Math.PI * 2);
    const [cr, cg, cb] = oklchToRgb(0.65, 0.12, p.hue);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.2 + p.confidence * 0.4})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.7 + p.confidence * 0.25})`;
    ctx.fill();

    ctx.font = `500 ${Math.round(ringR * 0.8)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.fillText(Math.round(p.score), p.x, p.y);

    const labelY = p.y + ringR + 13;
    ctx.font = `400 ${Math.round(W * 0.022)}px system-ui,sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    ctx.fillText(p.name, p.x, labelY);

    if (p.delta !== undefined && p.delta !== 0) {
      const dStr = (p.delta > 0 ? '+' : '') + p.delta.toFixed(1);
      ctx.font = `400 ${Math.round(W * 0.019)}px system-ui,sans-serif`;
      ctx.fillStyle = p.delta > 0
        ? (dark ? 'rgba(100,220,140,0.9)' : 'rgba(30,130,60,0.85)')
        : (dark ? 'rgba(255,110,90,0.9)' : 'rgba(180,40,30,0.85)');
      ctx.fillText(dStr, p.x + ringR + 6, p.y - ringR + 4);
    }
  });

  // Draw minimalist centroid marker
  // Subtle outer glow
  const gradient = ctx.createRadialGradient(centroidX, centroidY, 0, centroidX, centroidY, 20);
  gradient.addColorStop(0, dark ? 'rgba(100,150,255,0.3)' : 'rgba(0,85,255,0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centroidX, centroidY, 20, 0, Math.PI * 2);
  ctx.fill();

  // Thin circle outline
  ctx.beginPath();
  ctx.arc(centroidX, centroidY, 8, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Precise dot
  ctx.beginPath();
  ctx.arc(centroidX, centroidY, 4, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)';
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(centroidX - 1, centroidY - 1, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)';
  ctx.fill();

  // Tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let nearest = null, nearestDist = Infinity;
    for (const p of pts) {
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    let tip = container.querySelector('.sb-pillar-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sb-pillar-tip';
      tip.style.cssText = 'position:absolute;pointer-events:none;font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg-secondary,#f0eeea);color:var(--text-primary,#1a1a1a);border:0.5px solid var(--border,rgba(0,0,0,0.12));white-space:nowrap;transition:opacity .15s;';
      container.style.position = 'relative';
      container.appendChild(tip);
    }
    if (nearestDist > 60) { tip.style.opacity = '0'; return; }
    tip.style.opacity = '1';
    tip.style.left = (e.clientX - rect.left + 10) + 'px';
    tip.style.top  = (e.clientY - rect.top - 28) + 'px';
    tip.textContent = `${nearest.name} · score ${Math.round(nearest.score)} · confidence ${(nearest.confidence * 100).toFixed(0)}%`;
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = container.querySelector('.sb-pillar-tip');
    if (tip) tip.style.opacity = '0';
  });
}

// ─── 9. PILLAR HEATMAP SEMANTIC: Overlapping Gradients ────────────────────
/**
 * Semantic positioning with soft gradient blending
 * X-axis: Traditional ← → Contemporary
 * Y-axis: Minimal/Structured ← → Expressive/Maximal
 */
function renderPillarHeatmapSemantic(containerId, profile, customPositions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const pillars = extractPillars(profile);
  if (!pillars.length) {
    container.innerHTML = '<p style="color:var(--text-secondary,#888);font-size:13px;padding:12px 0;">no pillar data yet</p>';
    return;
  }

  const W = container.clientWidth || 500;
  const H = Math.round(W * 0.7);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = 'display:block;width:100%;border-radius:8px;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dark = isDark();
  const bgR = dark ? 18 : 248, bgG = dark ? 17 : 246, bgB = dark ? 16 : 242;

  // Semantic positioning based on pillar attribute ratings
  // X-axis: Traditional (0) ↔ Contemporary (10)
  // Y-axis: Minimal/Practical (0) ↔ Expressive/Decorative (10)
  //
  // Ratings based on Sparked pillar definitions:
  // romantic: traditional(3), decorated(8), aesthetic(8) -> expressive
  // bohemian: contemporary(6), decorated(8), expressive(7)
  // casual: neutral(5), moderate(4), practical(3) -> everyday center
  // classic: traditional(2), clean(3), conservative(2) -> minimal-ish
  // minimal: contemporary(6), minimal(1), intentional(5) -> very minimal
  // maximal: contemporary(8), decorated(10), bold(9) -> very expressive
  // fashionForward: cutting-edge(9), bold(9), aesthetic(8)
  // athletic: contemporary(7), minimal(2), practical(1) -> functional
  // utility: timeless(4), minimal(2), practical(0) -> most practical
  const DEFAULT_POSITIONS = {
    'romantic': { x: 0.30, y: 0.23, hue: 350 },       // traditional, highly expressive
    'bohemian': { x: 0.60, y: 0.20, hue: 35 },        // contemporary, expressive
    'casual': { x: 0.50, y: 0.50, hue: 200 },         // center - everyday versatile
    'classic': { x: 0.20, y: 0.67, hue: 220 },        // traditional, structured/minimal
    'minimal': { x: 0.60, y: 0.67, hue: 210 },        // contemporary, clean - between athletic and casual
    'maximal': { x: 0.80, y: 0.10, hue: 30 },         // contemporary, maximally expressive
    'fashionForward': { x: 0.90, y: 0.28, hue: 0 },   // cutting edge, bold
    'athletic': { x: 0.40, y: 0.90, hue: 160 },       // functional/performance (swapped with utility)
    'utility': { x: 0.70, y: 0.83, hue: 40 }          // practical/functional (swapped with athletic)
  };

  // Use custom positions if provided, otherwise use defaults
  const SEMANTIC_POSITIONS = customPositions || DEFAULT_POSITIONS;

  // Map pillars to canvas positions
  const pts = pillars.map(p => {
    const pos = SEMANTIC_POSITIONS[p.name] || { x: 0.5, y: 0.5, hue: 180 };
    return {
      ...p,
      x: pos.x * W,
      y: pos.y * H,
      hue: pos.hue,
    };
  });

  // Calculate weighted centroid
  const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);
  let centroidX = 0, centroidY = 0;
  pts.forEach(p => {
    const weight = p.score / totalScore;
    centroidX += p.x * weight;
    centroidY += p.y * weight;
  });

  // Render with soft gradient blending
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  const INFLUENCE_RADIUS = Math.min(W, H) * 0.35;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let totalInfluence = 0;
      let blendedR = 0, blendedG = 0, blendedB = 0;

      // Calculate influence from each pillar
      for (const p of pts) {
        const dist = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);

        // Gaussian falloff with score weighting
        const sigma = INFLUENCE_RADIUS * (0.5 + p.confidence * 0.5);
        const influence = (p.score / 100) * Math.exp(-(dist * dist) / (2 * sigma * sigma));

        if (influence > 0.001) {
          totalInfluence += influence;

          const L = dark ? 0.35 + p.confidence * 0.15 : 0.75 - p.confidence * 0.15;
          const C = 0.08 + p.confidence * 0.08;
          const [r, g, b] = oklchToRgb(L, C, p.hue);

          blendedR += r * influence;
          blendedG += g * influence;
          blendedB += b * influence;
        }
      }

      const i = (py * W + px) * 4;

      if (totalInfluence > 0.01) {
        // Normalize and blend with background
        const normR = blendedR / totalInfluence;
        const normG = blendedG / totalInfluence;
        const normB = blendedB / totalInfluence;

        const alpha = Math.min(0.9, totalInfluence * 2);
        data[i]     = Math.round(normR * alpha + bgR * (1 - alpha));
        data[i + 1] = Math.round(normG * alpha + bgG * (1 - alpha));
        data[i + 2] = Math.round(normB * alpha + bgB * (1 - alpha));
        data[i + 3] = 255;
      } else {
        // Background
        data[i] = bgR;
        data[i + 1] = bgG;
        data[i + 2] = bgB;
        data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Draw axis labels
  ctx.font = `400 ${Math.round(W * 0.022)}px system-ui,sans-serif`;
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  ctx.textAlign = 'left';
  ctx.fillText('Traditional', 10, H - 10);
  ctx.textAlign = 'right';
  ctx.fillText('Contemporary', W - 10, H - 10);
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(15, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Minimal / Structured', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(W - 15, H / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('Expressive / Maximal', 0, 0);
  ctx.restore();

  // Pillar labels + markers
  pts.forEach(p => {
    const score01 = p.score / 100;
    // Square root sizing: dominant pillars become much larger
    // 45% -> 35px, 35% -> 31px, 15% -> 19px, 5% -> 11px
    const ringR = 6 + Math.sqrt(score01) * 45;

    // Outer glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR + 3, 0, Math.PI * 2);
    const [cr, cg, cb] = oklchToRgb(0.65, 0.14, p.hue);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.3 + p.confidence * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Main circle
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.85})`;
    ctx.fill();
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Score text
    ctx.font = `600 ${Math.round(ringR * 0.7)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.8)';
    ctx.fillText(Math.round(p.score), p.x, p.y);

    // Label below
    const labelY = p.y + ringR + 12;
    ctx.font = `500 ${Math.round(W * 0.02)}px system-ui,sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';

    // Add background for readability
    const labelText = p.name;
    const labelMetrics = ctx.measureText(labelText);
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
    ctx.fillRect(p.x - labelMetrics.width / 2 - 4, labelY - 10, labelMetrics.width + 8, 16);

    ctx.fillStyle = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)';
    ctx.fillText(labelText, p.x, labelY);

    // Delta indicator
    if (p.delta !== undefined && p.delta !== 0) {
      const dStr = (p.delta > 0 ? '+' : '') + p.delta.toFixed(1);
      ctx.font = `400 ${Math.round(W * 0.018)}px system-ui,sans-serif`;
      ctx.fillStyle = p.delta > 0
        ? (dark ? 'rgba(100,220,140,0.9)' : 'rgba(30,130,60,0.85)')
        : (dark ? 'rgba(255,110,90,0.9)' : 'rgba(180,40,30,0.85)');
      ctx.fillText(dStr, p.x + ringR + 5, p.y - ringR + 3);
    }
  });

  // Draw centroid marker (minimalist dot)
  const gradient = ctx.createRadialGradient(centroidX, centroidY, 0, centroidX, centroidY, 20);
  gradient.addColorStop(0, dark ? 'rgba(100,150,255,0.4)' : 'rgba(0,85,255,0.3)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centroidX, centroidY, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centroidX, centroidY, 9, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centroidX, centroidY, 5, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centroidX - 1.5, centroidY - 1.5, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)';
  ctx.fill();

  // Tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let nearest = null, nearestDist = Infinity;
    for (const p of pts) {
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    let tip = container.querySelector('.sb-pillar-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sb-pillar-tip';
      tip.style.cssText = 'position:absolute;pointer-events:none;font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg-secondary,#f0eeea);color:var(--text-primary,#1a1a1a);border:0.5px solid var(--border,rgba(0,0,0,0.12));white-space:nowrap;transition:opacity .15s;';
      container.style.position = 'relative';
      container.appendChild(tip);
    }
    if (nearestDist > 60) { tip.style.opacity = '0'; return; }
    tip.style.opacity = '1';
    tip.style.left = (e.clientX - rect.left + 10) + 'px';
    tip.style.top  = (e.clientY - rect.top - 28) + 'px';
    tip.textContent = `${nearest.name} · score ${Math.round(nearest.score)} · confidence ${(nearest.confidence * 100).toFixed(0)}%`;
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = container.querySelector('.sb-pillar-tip');
    if (tip) tip.style.opacity = '0';
  });
}

// ─── EXPORTS ───────────────────────────────────────────────────────────────
// Supports both ES module and script-tag global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderColorHeatmapWheel,
    renderColorDnaStrip,
    renderOutfitHarmonyChord,
    renderPillarHeatmap,
    renderPillarHeatmapOption1,
    renderPillarHeatmapOption3,
    renderPillarHeatmapClean,
    renderPillarHeatmapMinimalist,
    renderPillarHeatmapSemantic,
  };
} else {
  window.StyleBrainViz = {
    renderColorHeatmapWheel,
    renderColorDnaStrip,
    renderOutfitHarmonyChord,
    renderPillarHeatmap,
    renderPillarHeatmapOption1,
    renderPillarHeatmapOption3,
    renderPillarHeatmapClean,
    renderPillarHeatmapMinimalist,
    renderPillarHeatmapSemantic,
  };
}
