/**
 * Change Summary Bar
 * Full-width component below StyleSpaceMap showing identity, change, and stats
 */

function createChangeSummaryBar(config) {
  const {
    containerElement,
    customerName,
    identityLabel,
    changeLabel,
    topMovers = []
  } = config;

  const summaryBar = document.createElement('div');
  summaryBar.className = 'change-summary-bar';
  summaryBar.innerHTML = `
    <div class="summary-change" id="summaryChangeLabel">${changeLabel || 'Ready to watch your style evolve'}</div>
    <div class="summary-stats" id="summaryStats">${formatTopMovers(topMovers)}</div>
  `;

  containerElement.appendChild(summaryBar);

  function updateChangeLabel(label) {
    const el = document.getElementById('summaryChangeLabel');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = label || '—';
        el.style.opacity = '1';
      }, 150);
    }
  }

  function updateStats(movers) {
    const el = document.getElementById('summaryStats');
    if (el) {
      el.innerHTML = formatTopMovers(movers);
    }
  }

  function formatTopMovers(movers) {
    if (!movers || movers.length === 0) {
      return '<span class="stat-placeholder">No changes</span>';
    }

    return movers.slice(0, 3).map(m => {
      const icon = m.delta > 0 ? '▲' : '▼';
      const sign = m.delta > 0 ? '+' : '';
      const colorClass = m.delta > 0 ? 'stat-increase' : 'stat-decrease';
      return `<span class="summary-stat ${colorClass}">${icon} ${capitalize(m.pillar)} ${sign}${m.delta}</span>`;
    }).join('');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return {
    element: summaryBar,
    updateChangeLabel,
    updateStats
  };
}

// Inject styles
function injectChangeSummaryBarStyles() {
  if (document.getElementById('change-summary-bar-styles')) return;

  const style = document.createElement('style');
  style.id = 'change-summary-bar-styles';
  style.textContent = `
    .change-summary-bar {
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    .summary-change {
      font-size: 14px;
      color: #555;
      line-height: 1.4;
      transition: opacity 0.15s ease;
      flex: 1;
    }

    .summary-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      font-weight: 600;
    }

    .summary-stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-increase {
      color: #10b981;
    }

    .stat-decrease {
      color: #ef4444;
    }

    .stat-placeholder {
      color: #aaa;
      font-weight: 400;
    }
  `;

  document.head.appendChild(style);
}

// Auto-inject
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChangeSummaryBarStyles);
  } else {
    injectChangeSummaryBarStyles();
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ChangeSummaryBar = {
    create: createChangeSummaryBar
  };
}
