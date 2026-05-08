/**
 * Persona Selection Modal
 * Shows all available customer personas with details and data simulation info
 */

function createPersonaModal(personas, onSelectPersona) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'persona-modal-overlay';
  overlay.innerHTML = `
    <div class="persona-modal">
      <div class="persona-modal-header">
        <h2>Select Customer Persona</h2>
        <button class="persona-modal-close" id="closePersonaModal">✕</button>
      </div>
      <div class="persona-modal-body" id="personaList"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Populate persona list
  const personaList = document.getElementById('personaList');

  personas.forEach(persona => {
    const sessionCount = persona.sessions.length;
    const firstSession = persona.sessions[0];
    const lastSession = persona.sessions[sessionCount - 1];

    const personaCard = document.createElement('div');
    personaCard.className = 'persona-modal-card';

    // Build avatar element
    const avatarHTML = persona.imagePath
      ? `<img src="${persona.imagePath}" class="persona-avatar-image" alt="${persona.name}">`
      : `<div class="persona-avatar-placeholder">${getInitials(persona.name)}</div>`;

    personaCard.innerHTML = `
      <div class="persona-card-header">
        <div class="persona-avatar-container">
          ${avatarHTML}
        </div>
        <div class="persona-info">
          <h3>${persona.name}</h3>
          <div class="persona-type">${persona.type}</div>
        </div>
      </div>
      <div class="persona-description">${persona.description}</div>
      <div class="persona-stats">
        <div class="persona-stat">
          <span class="stat-label">Sessions:</span>
          <span class="stat-value">${sessionCount}</span>
        </div>
        <div class="persona-stat">
          <span class="stat-label">Gender:</span>
          <span class="stat-value">${persona.gender}</span>
        </div>
      </div>
      <div class="persona-journey">
        <div class="journey-label">Style Journey</div>
        <div class="journey-pillars">
          ${formatTopPillars(firstSession.pillars)} → ${formatTopPillars(lastSession.pillars)}
        </div>
      </div>
      <button class="persona-select-btn" data-persona-id="${persona.id}">
        Select ${persona.name.split(' ')[0]}
      </button>
    `;

    personaCard.querySelector('.persona-select-btn').addEventListener('click', () => {
      onSelectPersona(persona.id);
      closeModal();
    });

    personaList.appendChild(personaCard);
  });

  // Close handlers
  function closeModal() {
    overlay.classList.add('closing');
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 200);
  }

  document.getElementById('closePersonaModal').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('open');
  });
}

function formatTopPillars(pillars) {
  const sorted = Object.entries(pillars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  return sorted.map(([name, score]) => `${name} ${score}%`).join(', ');
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Inject modal styles
function injectPersonaModalStyles() {
  if (document.getElementById('persona-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'persona-modal-styles';
  style.textContent = `
    .persona-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .persona-modal-overlay.open {
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
    }

    .persona-modal-overlay.closing {
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
    }

    .persona-modal {
      background: white;
      border-radius: 16px;
      max-width: 900px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: scale(0.95);
      opacity: 0;
      transition: all 0.3s ease;
    }

    .persona-modal-overlay.open .persona-modal {
      transform: scale(1);
      opacity: 1;
    }

    .persona-modal-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .persona-modal-header h2 {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0;
    }

    .persona-modal-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: #f5f5f5;
      color: #666;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .persona-modal-close:hover {
      background: #e0e0e0;
      color: #1a1a1a;
    }

    .persona-modal-body {
      padding: 24px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 16px;
    }

    .persona-modal-card {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
      cursor: pointer;
    }

    .persona-modal-card:hover {
      background: #f0f2f5;
      border-color: #0055ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 85, 255, 0.1);
    }

    .persona-card-header {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .persona-avatar-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: #f0f0f0;
    }

    .persona-avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .persona-avatar-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: 600;
    }

    .persona-info h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 4px 0;
    }

    .persona-type {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .persona-description {
      font-size: 13px;
      line-height: 1.5;
      color: #555;
      margin-bottom: 12px;
    }

    .persona-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }

    .persona-stat {
      display: flex;
      gap: 6px;
      font-size: 12px;
    }

    .stat-label {
      color: #888;
    }

    .stat-value {
      color: #1a1a1a;
      font-weight: 600;
    }

    .persona-journey {
      margin-bottom: 12px;
    }

    .journey-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #888;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .journey-pillars {
      font-size: 12px;
      color: #555;
      font-family: 'Courier New', monospace;
    }

    .persona-select-btn {
      width: 100%;
      padding: 10px;
      background: #0055ff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .persona-select-btn:hover {
      background: #0044cc;
      transform: translateY(-1px);
    }
  `;

  document.head.appendChild(style);
}

// Auto-inject styles
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPersonaModalStyles);
  } else {
    injectPersonaModalStyles();
  }
}

// Export
if (typeof window !== 'undefined') {
  window.PersonaModal = {
    create: createPersonaModal
  };
}
