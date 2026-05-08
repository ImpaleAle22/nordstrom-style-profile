/**
 * HUD Card Component
 *
 * Floating label overlay for StyleSpaceMap showing customer name,
 * identity label, and animated change label.
 */

function createHudCard(config) {
  const {
    containerElement,
    customerName,
    identityLabel,
    changeLabel,
    onTransitionTrigger // Callback when animation reaches 50% of updating phase
  } = config;

  // Create DOM structure
  const hudCard = document.createElement('div');
  hudCard.className = 'hud-card';
  hudCard.innerHTML = `
    <div class="hud-card-name">${customerName}</div>
    <div class="hud-card-label" id="hudLabel">${identityLabel}</div>
  `;

  containerElement.appendChild(hudCard);

  let hasTransitioned = false;
  let currentLabel = identityLabel;

  /**
   * Trigger the label transition (identity → change)
   */
  function transitionToChangeLabel() {
    if (hasTransitioned) return;
    hasTransitioned = true;

    const labelEl = document.getElementById('hudLabel');
    if (!labelEl || !changeLabel) return;

    // Fade out current label
    labelEl.style.transition = 'opacity 200ms ease-out';
    labelEl.style.opacity = '0';

    setTimeout(() => {
      // Swap text content
      labelEl.textContent = changeLabel;
      currentLabel = changeLabel;

      // Fade in new label
      labelEl.style.transition = 'opacity 300ms ease-in';
      labelEl.style.opacity = '1';
    }, 200);
  }

  /**
   * Reset to identity label (for replay)
   */
  function reset() {
    hasTransitioned = false;
    const labelEl = document.getElementById('hudLabel');
    if (!labelEl) return;

    // Instant reset, no animation
    labelEl.style.transition = 'none';
    labelEl.textContent = identityLabel;
    labelEl.style.opacity = '1';
    currentLabel = identityLabel;

    // Re-enable transitions for next animation
    setTimeout(() => {
      labelEl.style.transition = '';
    }, 50);
  }

  /**
   * Update animation progress (0 to 1)
   * Triggers transition at 50% of updating phase
   */
  function updateProgress(phase, phaseProgress) {
    if (phase === 'updating' && phaseProgress > 0.5 && !hasTransitioned) {
      transitionToChangeLabel();
    }
  }

  /**
   * Destroy component
   */
  function destroy() {
    if (hudCard && hudCard.parentNode) {
      hudCard.parentNode.removeChild(hudCard);
    }
  }

  return {
    element: hudCard,
    transitionToChangeLabel,
    reset,
    updateProgress,
    destroy
  };
}

// CSS for HUD card (inject into document)
function injectHudCardStyles() {
  if (document.getElementById('hud-card-styles')) return;

  const style = document.createElement('style');
  style.id = 'hud-card-styles';
  style.textContent = `
    .hud-card {
      position: fixed;
      top: 180px;
      left: 260px;
      background: rgba(255, 255, 255, 0.95);
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 12px 16px;
      max-width: 260px;
      pointer-events: auto;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      z-index: 100;
    }

    .hud-card-name {
      font-size: 14px;
      font-weight: 500;
      color: #1a1a1a;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .hud-card-label {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      min-height: 18px;
      transition: opacity 300ms ease;
    }

    /* Dark mode (if needed) */
    @media (prefers-color-scheme: dark) {
      .hud-card {
        background: rgba(30, 30, 30, 0.92);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .hud-card-name {
        color: #ffffff;
      }

      .hud-card-label {
        color: #aaaaaa;
      }
    }
  `;

  document.head.appendChild(style);
}

// Auto-inject styles on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHudCardStyles);
  } else {
    injectHudCardStyles();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.HudCard = {
    create: createHudCard,
    injectStyles: injectHudCardStyles
  };
}
