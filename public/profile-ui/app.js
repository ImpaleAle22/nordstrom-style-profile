/**
 * Main App Logic
 * Handles data loading, session scrubbing, and panel coordination
 */

let history = [];
let currentIndex = 0;
let viewMode = 'sessions'; // 'sessions' or 'coldStart'
let personas = null;
let currentPersona = null;
let currentDesign = 'current'; // 'current', 'refined', 'editorial', 'minimal'
let lifestyleImages = null;

// Style Brain Data Point Weights
const DATA_WEIGHTS = {
  // Quiz & Surveys
  quiz_answer: 8,
  style_preference: 10,

  // Product Interactions
  product_like: 2,
  product_dislike: -1,
  product_purchase: 15,
  product_return: -8,

  // Browse Behavior
  browse_dwell_short: 0.5,
  browse_dwell_medium: 2,
  browse_dwell_long: 4,

  // Swipes & Outfit Feedback
  swipe_like: 1,
  swipe_dislike: -0.5,
  outfit_feedback_love: 3,
  outfit_feedback_hate: -2,

  // Content & Search
  search_query: 1,
  category_browse: 1,

  // Assisted Shopping
  stylist_note: 8,
  ral_form: 5,
  chat_message: 2,
};

// Profile Confidence States
const PROFILE_STATES = {
  COLD_START: {
    id: 'cold_start',
    threshold: 0,
    maxPoints: 20,
    label: 'Brand New',
    description: 'Just getting started',
    ui: 'discovery'
  },
  EMERGING: {
    id: 'emerging',
    threshold: 21,
    maxPoints: 60,
    label: 'Getting to Know You',
    description: 'Early signals forming',
    ui: 'partial'
  },
  DEVELOPING: {
    id: 'developing',
    threshold: 61,
    maxPoints: 120,
    label: 'Building Confidence',
    description: 'Profile taking shape',
    ui: 'growing'
  },
  ESTABLISHED: {
    id: 'established',
    threshold: 121,
    maxPoints: Infinity,
    label: 'High Confidence',
    description: 'Well-established profile',
    ui: 'full'
  }
};

// Initialize app on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load personas and lifestyle images
    await loadPersonas();
    await loadLifestyleImages();

    // Load default history
    await loadHistory();
    if (history.length > 0) {
      currentIndex = 0; // Start at first session
      render();
    } else {
      showEmptyState();
    }
  } catch (error) {
    showError(error);
  }

  // Setup event listeners
  document.getElementById('prevBtn').addEventListener('click', goToPrevious);
  document.getElementById('nextBtn').addEventListener('click', goToNext);
  document.getElementById('changePersonaBtn')?.addEventListener('click', openPersonaModal);

  // Setup design tab navigation
  setupDesignTabs();
});

/**
 * Load personas from JSON
 */
async function loadPersonas() {
  try {
    const response = await fetch('../data/customer-personas.json');
    if (!response.ok) {
      console.warn('Personas file not found, continuing without personas');
      return;
    }
    const data = await response.json();
    personas = data.personas;
  } catch (error) {
    console.warn('Error loading personas:', error);
  }
}

/**
 * Load lifestyle images from JSON
 */
async function loadLifestyleImages() {
  try {
    const response = await fetch('../data/lifestyle-images.json');
    if (!response.ok) {
      console.warn('Lifestyle images file not found');
      return;
    }
    const data = await response.json();

    // Use only 'live' images (filter out candidates and rejected)
    lifestyleImages = data.results.filter(img => {
      const status = img.status || 'live'; // Default to 'live' if status not set
      return status === 'live';
    });

    console.log(`✓ Loaded ${lifestyleImages.length} live lifestyle images`);
  } catch (error) {
    console.warn('Error loading lifestyle images:', error);
  }
}

/**
 * Get lifestyle images for a specific pillar, optionally filtered by gender
 */
function getImagesByPillar(pillarKey, gender = null) {
  if (!lifestyleImages) return [];

  // Map fashionForward to fashion_forward for JSON lookup
  const jsonPillarKey = pillarKey === 'fashionForward' ? 'fashion_forward' : pillarKey;

  let filtered = lifestyleImages.filter(img => img.finalPillar === jsonPillarKey);

  // Filter by gender if specified (images now have gender field from original data)
  if (gender) {
    const genderFiltered = filtered.filter(img => img.gender === gender);

    // Only use gender-filtered results if we have enough images
    if (genderFiltered.length > 0) {
      filtered = genderFiltered;
    }
  }

  return filtered;
}

/**
 * Simple string hash function for deterministic selection
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a deterministic image for a pillar based on persona name
 * This ensures the same persona always gets the same images
 * Excludes already-used image IDs to prevent duplicates
 */
function getImageForPillar(pillarKey, personaName, index = 0, gender = null, usedImageIds = new Set()) {
  const images = getImagesByPillar(pillarKey, gender);
  if (images.length === 0) return null;

  // Filter out already-used images
  const availableImages = images.filter(img => !usedImageIds.has(img.imageId));

  // If all images for this pillar have been used, use all images
  const imagesToChooseFrom = availableImages.length > 0 ? availableImages : images;

  // Create a deterministic index based on persona name + pillar + position
  const seed = hashString(`${personaName}_${pillarKey}_${index}`);
  const imageIndex = seed % imagesToChooseFrom.length;

  const selectedImage = imagesToChooseFrom[imageIndex];

  // Mark this image as used
  usedImageIds.add(selectedImage.imageId);

  // Use imageUrl field from the curated data
  return selectedImage.imageUrl;
}

/**
 * Load history.json from server
 */
async function loadHistory() {
  try {
    const response = await fetch('../data/history.json');
    if (!response.ok) {
      throw new Error('Failed to load history.json');
    }
    history = await response.json();
  } catch (error) {
    console.error('Error loading history:', error);
    throw error;
  }
}

/**
 * Calculate total data points from events
 */
function calculateDataPoints(events) {
  if (!events || events.length === 0) return 0;

  let total = 0;
  events.forEach(event => {
    const weight = DATA_WEIGHTS[event.type] || 0;
    const count = event.count || 1;
    total += weight * count;
  });

  return Math.max(0, total); // Never negative
}

/**
 * Determine confidence state based on data points
 */
function getConfidenceState(dataPoints) {
  if (dataPoints <= PROFILE_STATES.COLD_START.maxPoints) {
    return PROFILE_STATES.COLD_START;
  } else if (dataPoints <= PROFILE_STATES.EMERGING.maxPoints) {
    return PROFILE_STATES.EMERGING;
  } else if (dataPoints <= PROFILE_STATES.DEVELOPING.maxPoints) {
    return PROFILE_STATES.DEVELOPING;
  } else {
    return PROFILE_STATES.ESTABLISHED;
  }
}

/**
 * Calculate progress within current state
 */
function getStateProgress(dataPoints, state) {
  const range = state.maxPoints - state.threshold;
  const progress = dataPoints - state.threshold;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

/**
 * Open persona selection modal
 */
function openPersonaModal() {
  if (!personas || !window.PersonaModal) return;

  window.PersonaModal.create(personas, (personaId) => {
    selectPersona(personaId);
  });
}

/**
 * Select a persona by ID
 */
function selectPersona(personaId) {
  if (!personas) return;

  // Find persona
  const persona = personas.find(p => p.id === personaId);
  if (!persona) return;

  currentPersona = persona;

  // Convert persona sessions to history format
  history = persona.sessions.map((session, idx) => ({
    session: session.session,
    timestamp: session.timestamp,
    profile: {
      customerId: persona.id,
      customerName: persona.name,
      gender: persona.gender,
      sessionsProcessed: idx + 1,
      pillars: session.pillars,
      confidence: {
        overall: 3,
        label: '⭐⭐⭐'
      }
    }
  }));

  currentIndex = 0;
  render();
}

/**
 * Navigate to previous session
 */
function goToPrevious() {
  if (currentIndex > 0) {
    currentIndex--;
    render();
  }
}

/**
 * Navigate to next session
 */
function goToNext() {
  if (currentIndex < history.length - 1) {
    currentIndex++;
    render();
  }
}

/**
 * Render current session state
 */
function render() {
  const currentSnapshot = history[currentIndex];
  const previousSnapshot = currentIndex > 0 ? history[currentIndex - 1] : null;

  // Calculate data points and determine confidence state
  const sessionEvents = currentSnapshot.events || [];
  const dataPoints = calculateDataPoints(sessionEvents);
  const confidenceState = getConfidenceState(dataPoints);
  const stateProgress = getStateProgress(dataPoints, confidenceState);

  // Store state info on snapshot for easy access
  currentSnapshot.dataPoints = dataPoints;
  currentSnapshot.confidenceState = confidenceState;
  currentSnapshot.stateProgress = stateProgress;

  console.log('🧠 Style Brain State:', {
    dataPoints,
    state: confidenceState.label,
    ui: confidenceState.ui,
    progress: `${Math.round(stateProgress)}%`
  });

  // Update header
  updateHeader(currentSnapshot);

  // Update scrubber controls
  updateScrubber();

  // Update activity feed
  updateActivityFeed(currentSnapshot);

  // TEMPORARILY DISABLED: Auto-apply confidence state UIs
  // For now, always render full UI to avoid breaking layout
  // TODO: Enable these views manually in demo or fix layout conflicts

  // Route to appropriate UI based on confidence state
  // switch(confidenceState.ui) {
  //   case 'discovery':
  //     renderDiscoveryUI(currentSnapshot, previousSnapshot);
  //     break;
  //   case 'partial':
  //     renderPartialUI(currentSnapshot, previousSnapshot);
  //     break;
  //   case 'growing':
  //     renderGrowingUI(currentSnapshot, previousSnapshot);
  //     break;
  //   case 'full':
  //   default:
  //     renderFullUI(currentSnapshot, previousSnapshot);
  //     break;
  // }

  // Always render full UI for now
  renderFullUI(currentSnapshot, previousSnapshot);

  // Dispatch event for multi-space tab initialization
  window.dispatchEvent(new Event('profileRendered'));
}

/**
 * Render Full/Established Profile UI (existing functionality)
 */
function renderFullUI(currentSnapshot, previousSnapshot) {

  // Clean up and restore all sections from other states

  // Remove all temporary overlays
  document.querySelectorAll('.cold-start-overlay, .partial-profile-indicator, .radar-confidence-overlay').forEach(el => el.remove());

  // Restore visibility of main sections
  const radarSection = document.querySelector('.style-profile-section');
  if (radarSection) radarSection.style.display = 'block';

  const heroSection = document.querySelector('.editorial-hero');
  if (heroSection) heroSection.style.display = 'grid';

  const radarContainer = document.getElementById('styleRadarChart');
  if (radarContainer) {
    radarContainer.style.opacity = '1';
    if (radarContainer.parentElement) {
      radarContainer.parentElement.style.display = 'block';
      radarContainer.parentElement.style.position = '';
    }
  }

  const topPillarsList = document.getElementById('topPillarsList');
  if (topPillarsList && topPillarsList.parentElement) {
    topPillarsList.parentElement.style.display = 'block';
  }

  const pillarGrid = document.querySelector('.pillar-grid');
  if (pillarGrid) {
    pillarGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  }

  // Restore section title
  const pillarSectionTitle = document.querySelector('.profile-section-title');
  if (pillarSectionTitle) {
    pillarSectionTitle.textContent = 'The pillars that define your style';
  }

  // Render Style Radar Chart (compact overview at top)
  try {
    if (window.StyleRadarChart) {
      const beforeProfile = previousSnapshot ? previousSnapshot.profile.pillars : {
        romantic: 11, bohemian: 11, casual: 11, classic: 11,
        minimal: 12, maximal: 11, fashionForward: 11, athletic: 11, utility: 11
      };

      window.StyleRadarChart.render('styleRadarChart', {
        profileBefore: beforeProfile,
        profileAfter: currentSnapshot.profile.pillars,
        showBeforeProfile: previousSnapshot ? true : false,
        animateDuration: 1000
      });
    }
  } catch (error) {
    console.error('StyleRadarChart render error:', error);
  }

  // Render Editorial Hero
  renderEditorialHero(currentSnapshot.profile);

  // Update hero images and stats (track used image IDs)
  const usedImageIds = new Set();
  updateHeroImages(currentSnapshot.profile, usedImageIds);
  updateHeroStats(currentSnapshot.profile);

  // Update pillar cards section (pass used image IDs to prevent duplicates)
  updatePillarCards(currentSnapshot.profile, usedImageIds);

  // Render Top Pillars List (right column)
  renderTopPillarsList(currentSnapshot.profile);

  // Render both panels (pass full history for vector space and session history)
  renderBrainPanel(currentSnapshot.profile, previousSnapshot?.profile, history, currentIndex);
  renderProfilePanel(currentSnapshot.profile, previousSnapshot?.profile, history.slice(0, currentIndex + 1));

  // Update alternate design headers
  updateAlternateDesignHeaders();

  // If refined design is currently visible, update it too
  if (currentDesign === 'refined') {
    renderRefinedDesign();
  }

  // Render visualizations
  if (window.StyleBrainViz) {
    StyleBrainViz.renderColorHeatmapWheel('viz-color-wheel', currentSnapshot.profile);
    StyleBrainViz.renderColorDnaStrip('viz-color-dna', currentSnapshot.profile);
    StyleBrainViz.renderOutfitHarmonyChord('viz-outfit-chord', currentSnapshot.profile);
  }
}

/**
 * Render Discovery UI (Cold Start - Brand New Account)
 */
function renderDiscoveryUI(currentSnapshot, previousSnapshot) {
  console.log('🎨 Rendering Discovery UI (Cold Start)');

  const profile = currentSnapshot.profile;
  const firstName = profile.customerName.split(' ')[0];

  // First, ensure we're starting clean
  document.querySelectorAll('.cold-start-overlay').forEach(el => el.remove());

  // Hide standard sections
  const radarSection = document.querySelector('.style-profile-section');
  if (radarSection) radarSection.style.display = 'none';

  // Hide existing hero
  const heroSection = document.querySelector('.editorial-hero');
  if (heroSection) heroSection.style.display = 'none';

  // Create and insert cold start overlay BEFORE the hero
  const coldStartOverlay = document.createElement('div');
  coldStartOverlay.className = 'cold-start-overlay';
  coldStartOverlay.innerHTML = `
    <div class="cold-start-hero">
      <div class="cold-start-content">
        <div class="cold-start-badge">Welcome to Your Style Profile</div>
        <h1 class="cold-start-title">Hi, ${firstName}. Let's discover your style.</h1>
        <p class="cold-start-description">
          Your style is as unique as you are. Answer a few quick questions, save items you love,
          or browse by style to help us understand what makes you feel your best.
        </p>
        <div class="cold-start-actions">
          <button class="cold-start-btn cold-start-btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
            </svg>
            Take 2-Minute Style Quiz
          </button>
          <button class="cold-start-btn cold-start-btn-secondary">
            Browse by Style
          </button>
        </div>
      </div>
      <div class="cold-start-illustration">
        <div class="cold-start-placeholder">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="5,5"/>
            <circle cx="100" cy="100" r="60" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="5,5"/>
            <circle cx="100" cy="100" r="40" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="5,5"/>
            <text x="100" y="105" text-anchor="middle" fill="#9CA3AF" font-size="14">Building Your Profile</text>
          </svg>
        </div>
      </div>
    </div>
  `;

  if (heroSection && heroSection.parentNode) {
    heroSection.parentNode.insertBefore(coldStartOverlay, heroSection);
  }

  // Replace pillar cards with discovery cards (all 9 pillars)
  const pillarGrid = document.querySelector('.pillar-grid');
  if (pillarGrid) {
    pillarGrid.innerHTML = generateDiscoveryPillarCards();
    pillarGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  }

  const pillarSectionTitle = document.querySelector('.profile-section-title');
  if (pillarSectionTitle) {
    pillarSectionTitle.textContent = 'Explore All Style Pillars';
  }
}

/**
 * Render Partial UI (Emerging Profile - Some Data)
 */
function renderPartialUI(currentSnapshot, previousSnapshot) {
  console.log('🎨 Rendering Partial UI (Emerging Profile)');

  const profile = currentSnapshot.profile;
  const dataPoints = currentSnapshot.dataPoints;
  const stateProgress = currentSnapshot.stateProgress;
  const firstName = profile.customerName.split(' ')[0];

  // Show confidence indicator at top
  const heroSection = document.querySelector('.editorial-hero');
  if (heroSection) {
    const indicator = document.createElement('div');
    indicator.className = 'partial-profile-indicator';
    indicator.innerHTML = `
      <div class="partial-profile-icon">📊</div>
      <div class="partial-profile-content">
        <div class="partial-profile-title">Your Style Profile is Emerging</div>
        <div class="partial-profile-description">
          We're learning about ${firstName}'s style. Keep engaging to unlock your full profile!
        </div>
      </div>
      <div class="partial-profile-progress">
        <div class="partial-profile-progress-fill" style="width: ${stateProgress}%"></div>
      </div>
    `;

    // Insert before hero
    heroSection.parentNode.insertBefore(indicator, heroSection);
  }

  // Render radar chart with confidence overlay
  try {
    if (window.StyleRadarChart) {
      const beforeProfile = previousSnapshot ? previousSnapshot.profile.pillars : {
        romantic: 11, bohemian: 11, casual: 11, classic: 11,
        minimal: 12, maximal: 11, fashionForward: 11, athletic: 11, utility: 11
      };

      const radarContainer = document.getElementById('styleRadarChart');
      if (radarContainer) {
        radarContainer.style.opacity = '0.6';
        radarContainer.parentElement.style.position = 'relative';
      }

      window.StyleRadarChart.render('styleRadarChart', {
        profileBefore: beforeProfile,
        profileAfter: currentSnapshot.profile.pillars,
        showBeforeProfile: previousSnapshot ? true : false,
        animateDuration: 1000
      });

      // Add confidence overlay
      if (radarContainer && radarContainer.parentElement) {
        const overlay = document.createElement('div');
        overlay.className = 'radar-confidence-overlay';
        overlay.innerHTML = `
          <div class="radar-confidence-title">⚡ Gaining Confidence</div>
          <div class="radar-confidence-description">${dataPoints} data points collected</div>
        `;
        radarContainer.parentElement.appendChild(overlay);
      }
    }
  } catch (error) {
    console.error('StyleRadarChart render error:', error);
  }

  // Render hero with early signals badge
  renderEditorialHero(currentSnapshot.profile);

  // Get top 2 emerging pillars
  const topPillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .filter(([_, score]) => score > 15); // Only show if meaningful

  // Update pillar cards to show "Early Signal" badges
  const usedImageIds = new Set();
  updateHeroImages(currentSnapshot.profile, usedImageIds);
  updateHeroStats(currentSnapshot.profile);
  updatePartialPillarCards(currentSnapshot.profile, usedImageIds, topPillars);

  // Show top pillars list with badges
  renderTopPillarsList(currentSnapshot.profile);

  // Add early signal badges to top pillars
  setTimeout(() => {
    const pillarItems = document.querySelectorAll('#topPillarsList .pillar-item');
    pillarItems.forEach((item, index) => {
      if (index < 2) {
        const nameEl = item.querySelector('.pillar-name');
        if (nameEl) {
          const badge = document.createElement('span');
          badge.className = 'early-signal-badge';
          badge.innerHTML = '<span class="early-signal-dot"></span>Early Signal';
          nameEl.appendChild(badge);
          nameEl.style.display = 'flex';
          nameEl.style.alignItems = 'center';
          nameEl.style.gap = '8px';
        }
      }
    });
  }, 100);
}

/**
 * Render Growing UI (Developing Profile - Building Confidence)
 */
function renderGrowingUI(currentSnapshot, previousSnapshot) {
  console.log('🎨 Rendering Growing UI (Developing Profile)');

  const profile = currentSnapshot.profile;
  const dataPoints = currentSnapshot.dataPoints;
  const stateProgress = currentSnapshot.stateProgress;
  const pointsToEstablished = PROFILE_STATES.ESTABLISHED.threshold - dataPoints;

  // Show progress indicator
  const heroSection = document.querySelector('.editorial-hero');
  if (heroSection) {
    const indicator = document.createElement('div');
    indicator.className = 'partial-profile-indicator';
    indicator.style.background = 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)';
    indicator.style.borderColor = '#3B82F6';
    indicator.innerHTML = `
      <div class="partial-profile-icon">🎯</div>
      <div class="partial-profile-content">
        <div class="partial-profile-title" style="color: #1E40AF;">Building Your Profile</div>
        <div class="partial-profile-description" style="color: #1E3A8A;">
          ${pointsToEstablished} more data points to unlock full confidence
        </div>
      </div>
      <div class="partial-profile-progress">
        <div class="partial-profile-progress-fill" style="background: linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%); width: ${stateProgress}%"></div>
      </div>
    `;
    heroSection.parentNode.insertBefore(indicator, heroSection);
  }

  // Render full UI
  renderFullUI(currentSnapshot, previousSnapshot);

  // Add confidence indicator to section title
  const sectionTitle = document.querySelector('.style-profile-header-title');
  if (sectionTitle) {
    const badge = document.createElement('span');
    badge.className = 'early-signal-badge';
    badge.style.marginLeft = '12px';
    badge.style.background = '#DBEAFE';
    badge.style.borderColor = '#93C5FD';
    badge.style.color = '#1E40AF';
    badge.innerHTML = '<span class="early-signal-dot" style="background: #3B82F6;"></span>Building Confidence';
    sectionTitle.appendChild(badge);
  }
}

/**
 * Update pillar cards for partial profile (show top 2 with early signal badges)
 */
function updatePartialPillarCards(profile, usedImageIds, topPillars) {
  if (topPillars.length === 0) {
    // If no strong signals yet, show discovery cards
    const pillarGrid = document.querySelector('.pillar-grid');
    if (pillarGrid) {
      pillarGrid.innerHTML = generateDiscoveryPillarCards();
    }
    return;
  }

  // Show only top 2 pillars with early signal indicators
  const personaName = profile.customerName;
  const gender = profile.gender;

  const pillarData = {
    minimal: { description: 'Clean lines and understated elegance', tags: ['Understated', 'Modern', 'Refined'] },
    classic: { description: 'Timeless, polished pieces that transcend seasons', tags: ['Tailored', 'Sophisticated', 'Timeless'] },
    romantic: { description: 'Soft, feminine details with flowing silhouettes', tags: ['Delicate', 'Feminine', 'Graceful'] },
    bohemian: { description: 'Free-spirited, eclectic mix with artisan touches', tags: ['Eclectic', 'Artisan', 'Layered'] },
    maximal: { description: 'Bold patterns and statement-making pieces', tags: ['Bold', 'Expressive', 'Vibrant'] },
    fashionForward: { description: 'Contemporary trends with modern edge', tags: ['Modern', 'Trend-aware', 'Edge'] },
    casual: { description: 'Relaxed, versatile pieces for everyday comfort', tags: ['Relaxed', 'Versatile', 'Comfortable'] },
    athletic: { description: 'Performance-driven style with functional design', tags: ['Active', 'Functional', 'Performance'] },
    utility: { description: 'Practical, purposeful design with structural details', tags: ['Practical', 'Structured', 'Functional'] }
  };

  const pillarGrid = document.querySelector('.pillar-grid');
  if (!pillarGrid) return;

  // Change grid to 2 columns for partial profile
  pillarGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';

  pillarGrid.innerHTML = topPillars.map(([pillarKey, score], cardIndex) => {
    const displayName = pillarKey === 'fashionForward' ? 'Fashion Forward' : capitalize(pillarKey);
    const data = pillarData[pillarKey] || { description: 'Your unique style', tags: ['Unique'] };
    const imageUrl = getImageForPillar(pillarKey, personaName, cardIndex + 3, gender, usedImageIds);
    const percentage = Math.round(score);

    return `
      <div class="pillar-card">
        <div class="early-signal-badge" style="position: absolute; top: 16px; right: 16px; z-index: 2;">
          <span class="early-signal-dot"></span>Early Signal
        </div>
        <img src="${imageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'}"
             alt="${displayName} style"
             class="pillar-card-image">
        <div class="pillar-card-content">
          <div class="pillar-card-header">
            <div class="pillar-card-name">● ${displayName}</div>
            <div class="pillar-card-percentage">${percentage}%</div>
          </div>
          <p class="pillar-card-description">
            ${data.description}
          </p>
          <div class="pillar-card-tags">
            ${data.tags.map(tag => `<span class="pillar-tag">${tag}</span>`).join('')}
          </div>
          <div class="pillar-card-strength">
            <div class="pillar-card-strength-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="pillar-card-actions">
            <a href="#" class="profile-btn profile-btn-secondary">See Outfits</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Generate discovery pillar cards (all 9 pillars)
 */
function generateDiscoveryPillarCards() {
  const allPillars = [
    { key: 'classic', name: 'Classic', description: 'Timeless, polished pieces that transcend seasons', icon: '👔' },
    { key: 'minimal', name: 'Minimal', description: 'Clean lines and understated elegance', icon: '⚪' },
    { key: 'romantic', name: 'Romantic', description: 'Soft, feminine details with flowing silhouettes', icon: '🌸' },
    { key: 'bohemian', name: 'Bohemian', description: 'Free-spirited, eclectic mix with artisan touches', icon: '🌿' },
    { key: 'maximal', name: 'Maximal', description: 'Bold patterns and statement-making pieces', icon: '✨' },
    { key: 'fashionForward', name: 'Fashion Forward', description: 'Contemporary trends with modern edge', icon: '🔥' },
    { key: 'casual', name: 'Casual', description: 'Relaxed, versatile pieces for everyday comfort', icon: '👕' },
    { key: 'athletic', name: 'Athletic', description: 'Performance-driven style with functional design', icon: '⚡' },
    { key: 'utility', name: 'Utility', description: 'Practical, purposeful design with structural details', icon: '🔧' }
  ];

  return allPillars.map(pillar => `
    <div class="discovery-pillar-card">
      <div class="discovery-pillar-icon">${pillar.icon}</div>
      <div class="discovery-pillar-name">${pillar.name}</div>
      <div class="discovery-pillar-description">${pillar.description}</div>
      <button class="discovery-pillar-explore">Explore ${pillar.name}</button>
    </div>
  `).join('');
}

/**
 * Get customer image path from name or persona
 */
function getCustomerImagePath(customerName) {
  // Map customer names to image paths
  const imageMap = {
    'Sarah Martinez': '../customers/Sarah Martinez.png',
    'Marcus Thompson': '../customers/Marcus Thompson.png',
    'Elena Rodriguez': '../customers/Elena Rodriguez.png',
    'James Wilson': '../customers/James Wilson.png',
    'Aisha Patel': '../customers/Aisha Patel.png',
    'Tyler Chen': '../customers/Tyler Chen.png',
    'Priya Sharma': '../customers/Priya Sharma.png',
    'Derek Johnson': '../customers/Derek Johnson.png',
    'Alex Chen': null, // Cold start - no image
    'New Customer': null // Cold start - no image
  };

  return imageMap[customerName] || null;
}

/**
 * Generate change label for StyleSpaceMap
 */
function generateChangeLabel(beforeProfile, afterProfile) {
  const before = beforeProfile.pillars;
  const after = afterProfile.pillars;

  // Calculate biggest changes
  const changes = [];
  for (const pillar in after) {
    const delta = after[pillar] - (before[pillar] || 0);
    if (Math.abs(delta) > 5) {
      changes.push({ pillar, delta });
    }
  }

  // Sort by absolute magnitude
  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  if (changes.length === 0) {
    return 'Style profile updated';
  }

  const top = changes[0];
  if (top.delta > 0) {
    return `Shifted toward ${top.pillar} (+${top.delta})`;
  } else {
    return `Moved away from ${top.pillar} (${top.delta})`;
  }
}

/**
 * Update header with customer info
 */
function updateHeader(snapshot) {
  const profile = snapshot.profile;

  // Update identity header above map
  const identityName = document.getElementById('identityName');
  const identityLabel = document.getElementById('identityLabel');
  if (identityName) identityName.textContent = profile.customerName;
  if (identityLabel) {
    const label = generateIdentityLabelFromPillars(profile.pillars);
    identityLabel.textContent = label;
  }

  // Update persona card in sidebar
  const personaName = document.getElementById('currentPersonaName');
  const personaType = document.getElementById('currentPersonaType');
  if (personaName) personaName.textContent = profile.customerName;
  if (personaType) personaType.textContent = currentPersona ? currentPersona.type : 'Default Profile';

  // Update persona avatar image
  const personaAvatar = document.getElementById('personaAvatar');
  if (personaAvatar) {
    const imagePath = getCustomerImagePath(profile.customerName);
    if (imagePath) {
      personaAvatar.style.backgroundImage = `url('${imagePath}')`;
      personaAvatar.style.backgroundSize = 'cover';
      personaAvatar.style.backgroundPosition = 'center';
    } else {
      personaAvatar.style.backgroundImage = '';
    }
  }

  // Update account navigation header
  const accountHeaderName = document.getElementById('accountHeaderName');
  if (accountHeaderName) {
    const firstName = profile.customerName.split(' ')[0];
    accountHeaderName.textContent = `${firstName}'s Account`;
  }

  // Update site header sign in to show customer name
  const siteHeaderName = document.getElementById('siteHeaderName');
  if (siteHeaderName) {
    const firstName = profile.customerName.split(' ')[0];
    siteHeaderName.textContent = `Hi, ${firstName}`;
  }

  // Update gender display
  const genderEl = document.getElementById('customerGender');
  if (genderEl) {
    const genderLabel = profile.gender === 'womenswear' || profile.gender === 'women' ? 'womenswear' : 'menswear';
    genderEl.textContent = genderLabel;
  }

  document.getElementById('sessionsCount').textContent = profile.sessionsProcessed;
}

/**
 * Generate identity label from pillars
 */
function generateIdentityLabelFromPillars(pillars) {
  const sorted = Object.entries(pillars)
    .sort((a, b) => b[1] - a[1])
    .filter(p => p[1] > 5);

  if (sorted.length === 0) return 'Exploring your style';
  if (sorted.length === 1) return capitalize(sorted[0][0]);

  return `${capitalize(sorted[0][0])} / ${capitalize(sorted[1][0])}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Update session scrubber controls
 */
function updateScrubber() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === history.length - 1;

  document.getElementById('currentSession').textContent = currentIndex + 1;
  document.getElementById('totalSessions').textContent = history.length;

  const date = new Date(history[currentIndex].timestamp);
  document.getElementById('sessionDate').textContent = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Update activity feed with session summary
 */
function updateActivityFeed(snapshot) {
  const container = document.getElementById('activityFeed');

  // If using persona, show change description
  if (currentPersona) {
    const session = currentPersona.sessions[currentIndex];
    if (session && session.change) {
      container.innerHTML = `<div class="activity-tag new">${session.change}</div>`;
      return;
    }
  }

  // Otherwise load from session file
  const sessionId = snapshot.session;
  loadSessionEvents(sessionId)
    .then(events => {
      const tags = summarizeEvents(events);
      container.innerHTML = tags
        .map(tag => `<div class="activity-tag new">${tag}</div>`)
        .join('');
    })
    .catch(error => {
      console.error('Error loading session:', error);
      container.innerHTML = `<div class="activity-placeholder">${sessionId}</div>`;
    });
}

/**
 * Load session file to get events
 */
async function loadSessionEvents(sessionId) {
  try {
    const response = await fetch(`../data/sessions/${sessionId}.json`);
    if (!response.ok) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const session = await response.json();
    return session.events;
  } catch (error) {
    console.error('Error loading session events:', error);
    return [];
  }
}

/**
 * Summarize events into activity tags
 */
function summarizeEvents(events) {
  const tags = [];
  const eventCounts = {};

  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  // Create human-readable tags
  if (eventCounts.quiz_answer) {
    tags.push('📋 Style quiz taken');
  }

  if (eventCounts.purchase) {
    const count = eventCounts.purchase;
    tags.push(`🛍️ ${count} purchase${count > 1 ? 's' : ''}`);
  }

  if (eventCounts.browse_dwell) {
    const browseEvents = events.filter(e => e.type === 'browse_dwell');
    const totalMinutes = browseEvents.reduce((sum, e) =>
      sum + (e.payload.durationSeconds / 60), 0
    );
    tags.push(`👀 Browsed ${Math.round(totalMinutes)}min`);
  }

  if (eventCounts.swipe_like) {
    tags.push(`❤️ ${eventCounts.swipe_like} likes`);
  }

  if (eventCounts.swipe_dislike) {
    tags.push(`👎 ${eventCounts.swipe_dislike} dislikes`);
  }

  if (eventCounts.chat_message) {
    const count = eventCounts.chat_message;
    tags.push(`💬 ${count} message${count > 1 ? 's' : ''}`);
  }

  if (eventCounts.ral_form) {
    tags.push('✨ Request a Look');
  }

  if (eventCounts.search_query) {
    tags.push(`🔍 ${eventCounts.search_query} search${eventCounts.search_query > 1 ? 'es' : ''}`);
  }

  if (eventCounts.stylist_note) {
    tags.push('📝 Stylist note');
  }

  return tags;
}

/**
 * Show empty state
 */
function showEmptyState() {
  document.getElementById('customerName').textContent = 'No Data';
  document.getElementById('customerId').textContent = '—';
  document.getElementById('customerGender').textContent = '—';
  document.getElementById('sessionsCount').textContent = '0';
  document.getElementById('currentSession').textContent = '0';
  document.getElementById('totalSessions').textContent = '0';
  document.getElementById('sessionDate').textContent = '—';

  const feed = document.getElementById('activityFeed');
  feed.innerHTML = '<div class="activity-placeholder">No sessions found</div>';

  document.getElementById('brainPanel').innerHTML = '';
  document.getElementById('profilePanel').innerHTML =
    '<div class="profile-dashboard"><div class="empty-state" style="padding: 100px 20px;"><div class="empty-state-icon">👤</div><div class="empty-state-text" style="font-size: 18px;">Run <code>node index.js apply session_01</code> to start</div></div></div>';
}

/**
 * Show error state
 */
function showError(error) {
  document.getElementById('customerName').textContent = 'Error';
  document.getElementById('customerId').textContent = '—';
  document.getElementById('customerGender').textContent = '—';
  document.getElementById('sessionsCount').textContent = '0';

  const feed = document.getElementById('activityFeed');
  feed.innerHTML = `<div class="activity-placeholder">Error: ${error.message}</div>`;

  document.getElementById('brainPanel').innerHTML = '';
  document.getElementById('profilePanel').innerHTML =
    `<div class="profile-dashboard"><div class="empty-state" style="padding: 100px 20px;"><div class="empty-state-icon">⚠️</div><div class="empty-state-text" style="font-size: 18px;">${error.message}</div></div></div>`;
}

/**
 * Show cold start view (0 data profile)
 */
function showColdStart() {
  viewMode = 'coldStart';

  // Hide session controls
  document.querySelector('.demo-section:has(#prevBtn)').style.display = 'none';
  document.getElementById('coldStartBtn').style.display = 'none';
  document.getElementById('backToSessionsBtn').style.display = 'block';

  // Update customer info to show cold start
  document.getElementById('customerName').textContent = 'New Customer';
  document.getElementById('customerId').textContent = 'new_user_123';
  document.getElementById('customerGender').textContent = 'womenswear';
  document.getElementById('sessionsCount').textContent = '0';

  // Clear activity feed
  const feed = document.getElementById('activityFeed');
  feed.innerHTML = '<div class="activity-placeholder">No activity yet</div>';

  // Hide brain panel
  document.getElementById('brainPanel').innerHTML = '';

  // Render cold start profile
  renderColdStartProfile();
}

/**
 * Back to sessions view
 */
function backToSessions() {
  viewMode = 'sessions';

  // Show session controls
  document.querySelector('.demo-section:has(#prevBtn)').style.display = 'block';
  document.getElementById('coldStartBtn').style.display = 'block';
  document.getElementById('backToSessionsBtn').style.display = 'none';

  // Re-render current session
  render();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (viewMode !== 'sessions') return;

  if (e.key === 'ArrowLeft') {
    goToPrevious();
  } else if (e.key === 'ArrowRight') {
    goToNext();
  }

  // Manual confidence state preview (for demo)
  // Shift + 1 = Cold Start, Shift + 2 = Partial, Shift + 3 = Growing, Shift + 4 = Full
  if (e.shiftKey && ['1', '2', '3', '4'].includes(e.key)) {
    const currentSnapshot = history[currentIndex];
    const previousSnapshot = currentIndex > 0 ? history[currentIndex - 1] : null;

    switch(e.key) {
      case '1':
        console.log('🎨 Manual trigger: Cold Start UI');
        renderDiscoveryUI(currentSnapshot, previousSnapshot);
        break;
      case '2':
        console.log('🎨 Manual trigger: Partial UI');
        renderPartialUI(currentSnapshot, previousSnapshot);
        break;
      case '3':
        console.log('🎨 Manual trigger: Growing UI');
        renderGrowingUI(currentSnapshot, previousSnapshot);
        break;
      case '4':
        console.log('🎨 Manual trigger: Full UI');
        renderFullUI(currentSnapshot, previousSnapshot);
        break;
    }
  }
});

/**
 * Setup design tab navigation
 */
function setupDesignTabs() {
  const navLinks = document.querySelectorAll('.nord-menu a[data-design]');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const design = link.getAttribute('data-design');
      switchDesign(design);

      // Update active state
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

/**
 * Switch between design versions
 */
function switchDesign(design) {
  currentDesign = design;

  // Hide all design containers
  document.getElementById('currentDesign').style.display = 'none';
  document.getElementById('refinedDesign').style.display = 'none';
  document.getElementById('editorialDesign').style.display = 'none';
  document.getElementById('minimalDesign').style.display = 'none';

  // Show selected design
  const designMap = {
    'current': 'currentDesign',
    'refined': 'refinedDesign',
    'editorial': 'editorialDesign',
    'minimal': 'minimalDesign'
  };

  const containerId = designMap[design];
  if (containerId) {
    document.getElementById(containerId).style.display = 'block';
  }

  // If on current design, re-render
  if (design === 'current' && history.length > 0) {
    render();
  } else if (design !== 'current' && history.length > 0) {
    // Update and render alternate designs
    updateAlternateDesignHeaders();

    if (design === 'refined') {
      renderRefinedDesign();
    }
  }
}

/**
 * Update headers for alternate designs
 */
function updateAlternateDesignHeaders() {
  if (history.length === 0) return;

  const currentSnapshot = history[currentIndex];
  const profile = currentSnapshot.profile;
  const label = generateIdentityLabelFromPillars(profile.pillars);

  // Update each design's header
  ['Refined', 'Editorial', 'Minimal'].forEach(designType => {
    const nameEl = document.getElementById(`identityName${designType}`);
    const labelEl = document.getElementById(`identityLabel${designType}`);
    if (nameEl) nameEl.textContent = profile.customerName;
    if (labelEl) labelEl.textContent = label;
  });
}

/**
 * Render the Refined Brand Design
 */
function renderRefinedDesign() {
  if (history.length === 0) return;

  const currentSnapshot = history[currentIndex];
  const previousSnapshot = currentIndex > 0 ? history[currentIndex - 1] : null;
  const profile = currentSnapshot.profile;

  // Update insight cards
  document.getElementById('refinedSessionCount').textContent = profile.sessionsProcessed || currentIndex + 1;

  const topPillar = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])[0];
  document.getElementById('refinedTopPillar').textContent = capitalize(topPillar[0]);

  const confidenceLabel = profile.confidence?.label || '⭐⭐⭐';
  document.getElementById('refinedConfidence').textContent = confidenceLabel;

  // Render StyleSpaceMap in refined container
  if (previousSnapshot && window.StyleSpaceMap) {
    let changeLabel = generateChangeLabel(previousSnapshot.profile, currentSnapshot.profile);
    if (currentPersona) {
      const session = currentPersona.sessions[currentIndex];
      changeLabel = session?.change || changeLabel;
    }

    window.StyleSpaceMap.render('styleSpaceMapContainerRefined', {
      profileBefore: previousSnapshot.profile.pillars,
      profileAfter: currentSnapshot.profile.pillars,
      customerName: currentSnapshot.profile.customerName,
      customerImagePath: getCustomerImagePath(currentSnapshot.profile.customerName),
      changeLabel: changeLabel,
      autoPlay: false
    });
  } else if (currentIndex === 0 && window.StyleSpaceMap) {
    const coldStart = {
      romantic: 11, bohemian: 11, casual: 11, classic: 11,
      minimal: 12, maximal: 11, fashionForward: 11, athletic: 11, utility: 11
    };

    let changeLabel = 'Initial style profile established';
    if (currentPersona) {
      const session = currentPersona.sessions[0];
      changeLabel = session?.change || changeLabel;
    }

    window.StyleSpaceMap.render('styleSpaceMapContainerRefined', {
      profileBefore: coldStart,
      profileAfter: currentSnapshot.profile.pillars,
      customerName: currentSnapshot.profile.customerName,
      customerImagePath: getCustomerImagePath(currentSnapshot.profile.customerName),
      changeLabel: changeLabel,
      autoPlay: false
    });
  }

  // Render visualizations with refined styling
  if (window.StyleBrainViz) {
    StyleBrainViz.renderColorHeatmapWheel('viz-color-wheel-refined', profile);
    StyleBrainViz.renderPillarHeatmapClean('viz-pillar-heatmap-refined', profile);
    StyleBrainViz.renderOutfitHarmonyChord('viz-outfit-chord-refined', profile);
  }

  // Render profile panel data
  renderProfilePanel(profile, previousSnapshot?.profile, history.slice(0, currentIndex + 1), 'profilePanelRefined');
}

/**
 * Render Top Pillars List (right column next to radar chart)
 */
function renderTopPillarsList(profile) {
  const container = document.getElementById('topPillarsList');
  if (!container) return;

  // Get all pillars sorted by score
  const allPillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1]);

  // Get actual pillars (with score > 0)
  const actualPillars = allPillars.filter(([_, score]) => score > 0);

  // Get suggested pillars (with score = 0)
  const suggestedPillars = allPillars.filter(([_, score]) => score === 0);

  // Build top 5 list
  const top5 = [];

  // Add actual pillars (up to 5)
  actualPillars.slice(0, 5).forEach(([pillar, score]) => {
    top5.push({
      pillar,
      score,
      type: 'actual'
    });
  });

  // If we have less than 5 actual pillars, add suggestions
  if (top5.length < 5) {
    const needSuggestions = 5 - top5.length;
    suggestedPillars.slice(0, needSuggestions).forEach(([pillar, _]) => {
      top5.push({
        pillar,
        score: 0,
        type: 'suggested'
      });
    });
  }

  // Calculate dynamic chart max (same logic as radar chart)
  const allScores = Object.values(profile.pillars);
  const maxScore = Math.max(...allScores);
  const chartMax = Math.ceil(maxScore / 5) * 5; // Round up to nearest 5%

  // Function to generate gradient color based on normalized position on radar
  // This matches the radial gradient in the radar chart (warm center to cool edge)
  const getGradientColor = (percentage) => {
    // Normalize percentage relative to dynamic chart max (same as radar chart)
    const gradientPosition = Math.min(1, percentage / chartMax);

    let r, g, b;

    // Multi-stop color interpolation matching radar chart gradient
    // Coral → Pink → Lavender → Blue
    if (gradientPosition < 0.33) {
      // Coral to Pink (0-33% distance from center)
      const localPos = gradientPosition / 0.33;
      r = Math.round(229 + (212 - 229) * localPos);
      g = Math.round(173 + (165 - 173) * localPos);
      b = Math.round(165 + (165 - 165) * localPos);
    } else if (gradientPosition < 0.66) {
      // Pink to Lavender (33-66% distance)
      const localPos = (gradientPosition - 0.33) / 0.33;
      r = Math.round(212 + (200 - 212) * localPos);
      g = Math.round(165 + (181 - 165) * localPos);
      b = Math.round(165 + (214 - 165) * localPos);
    } else {
      // Lavender to Blue (66-100% distance)
      const localPos = (gradientPosition - 0.66) / 0.34;
      r = Math.round(200 + (125 - 200) * localPos);
      g = Math.round(181 + (177 - 181) * localPos);
      b = Math.round(214 + (209 - 214) * localPos);
    }

    // Create a subtle gradient for depth
    const colorStart = `rgb(${r}, ${g}, ${b})`;
    const colorEnd = `rgb(${Math.min(255, r + 10)}, ${Math.min(255, g + 10)}, ${Math.min(255, b + 10)})`;

    return `linear-gradient(90deg, ${colorStart} 0%, ${colorEnd} 100%)`;
  };

  // Render the list
  const pillarItems = top5.map((item, index) => {
    const rank = index + 1;
    const displayName = capitalize(item.pillar === 'fashionForward' ? 'Fashion Forward' : item.pillar);

    if (item.type === 'actual') {
      const percentage = Math.round(item.score);
      const gradient = getGradientColor(percentage);
      return `
        <div class="pillar-item">
          <div class="pillar-item-left">
            <span class="pillar-rank">${rank}</span>
            <span class="pillar-name">${displayName}</span>
          </div>
          <div class="pillar-bar-container">
            <div class="pillar-bar-fill" style="width: ${percentage}%; background: ${gradient};">
            </div>
            <span class="pillar-percentage">${percentage}%</span>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="pillar-item">
          <div class="pillar-item-left">
            <span class="pillar-rank">${rank}</span>
            <span class="pillar-name suggested">${displayName}</span>
          </div>
          <div class="pillar-bar-container">
            <div class="pillar-bar-fill suggested" style="width: 20%;">
            </div>
            <span class="pillar-percentage suggested">—</span>
          </div>
          <span class="pillar-suggestion-label">We think you might like this</span>
        </div>
      `;
    }
  }).join('');

  container.innerHTML = `
    <div class="top-pillars-header">
      <h3 class="top-pillars-title">Your Style Profile</h3>
      <div class="top-pillars-subtitle">Top style pillars and recommendations</div>
    </div>
    <div class="top-pillars-list">
      ${pillarItems}
    </div>
  `;

  console.log('✅ Top Pillars List rendered with bars:', container.querySelectorAll('.pillar-bar-fill').length);

  // Animate bars
  setTimeout(() => {
    const bars = container.querySelectorAll('.pillar-bar-fill');
    console.log('🎬 Animating bars:', bars.length);
    bars.forEach((bar, index) => {
      const targetWidth = bar.style.width;
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.width = targetWidth;
      }, 100 + (index * 100));
    });
  }, 100);
}

/**
 * Update hero images based on top 3 pillars
 */
function updateHeroImages(profile, usedImageIds = new Set()) {
  // Get top 3 pillars
  const topPillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (!lifestyleImages || topPillars.length < 3) return usedImageIds;

  const personaName = profile.customerName;
  const gender = profile.gender; // womenswear or menswear

  // Update large image (top pillar)
  const largeImageCard = document.querySelector('.hero-image-large img');
  const largeImageLabel = document.querySelector('.hero-image-large .hero-image-label');
  if (largeImageCard && topPillars[0]) {
    const imageUrl = getImageForPillar(topPillars[0][0], personaName, 0, gender, usedImageIds);
    if (imageUrl) {
      largeImageCard.src = imageUrl;
      largeImageLabel.textContent = capitalize(topPillars[0][0] === 'fashionForward' ? 'Fashion Forward' : topPillars[0][0]);
    }
  }

  // Update small images (2nd and 3rd pillars)
  const smallImageCards = document.querySelectorAll('.hero-image-small');
  smallImageCards.forEach((card, index) => {
    if (topPillars[index + 1]) {
      const img = card.querySelector('img');
      const label = card.querySelector('.hero-image-label');
      const imageUrl = getImageForPillar(topPillars[index + 1][0], personaName, index + 1, gender, usedImageIds);
      if (img && imageUrl) {
        img.src = imageUrl;
        label.textContent = capitalize(topPillars[index + 1][0] === 'fashionForward' ? 'Fashion Forward' : topPillars[index + 1][0]);
      }
    }
  });

  return usedImageIds;
}

/**
 * Update hero stats
 */
function updateHeroStats(profile) {
  // Get top pillar
  const topPillar = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])[0];

  // Count active pillars (score > 0)
  const activePillarCount = Object.values(profile.pillars).filter(score => score > 0).length;

  // Update stat values
  const statValues = document.querySelectorAll('.hero-stat-value');
  const statLabels = document.querySelectorAll('.hero-stat-label');

  if (statValues[0] && topPillar) {
    statValues[0].textContent = `${Math.round(topPillar[1])}%`;
  }
  if (statLabels[0] && topPillar) {
    statLabels[0].textContent = capitalize(topPillar[0] === 'fashionForward' ? 'Fashion Forward' : topPillar[0]);
  }

  // Saved Outfits - generate a reasonable number based on sessions
  if (statValues[1]) {
    const savedOutfits = Math.floor(profile.sessionsProcessed * 3 + Math.random() * 20);
    statValues[1].textContent = savedOutfits;
  }

  // Active pillars count
  if (statValues[2]) {
    statValues[2].textContent = activePillarCount;
  }
}

/**
 * Update pillar cards section with top 3 pillars
 */
function updatePillarCards(profile, usedImageIds = new Set()) {
  // Get top 3 pillars
  const topPillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (!lifestyleImages || topPillars.length < 3) return;

  const personaName = profile.customerName;

  // Pillar descriptions and tags
  const pillarData = {
    minimal: {
      description: 'Clean lines and understated elegance',
      tags: ['Understated', 'Modern', 'Refined']
    },
    classic: {
      description: 'Timeless, polished pieces that transcend seasons',
      tags: ['Tailored', 'Sophisticated', 'Timeless']
    },
    romantic: {
      description: 'Soft, feminine details with flowing silhouettes',
      tags: ['Delicate', 'Feminine', 'Graceful']
    },
    bohemian: {
      description: 'Free-spirited, eclectic mix with artisan touches',
      tags: ['Eclectic', 'Artisan', 'Layered']
    },
    maximal: {
      description: 'Bold patterns and statement-making pieces',
      tags: ['Bold', 'Expressive', 'Vibrant']
    },
    fashionForward: {
      description: 'Contemporary trends with modern edge',
      tags: ['Modern', 'Trend-aware', 'Edge']
    },
    casual: {
      description: 'Relaxed, versatile pieces for everyday comfort',
      tags: ['Relaxed', 'Versatile', 'Comfortable']
    },
    athletic: {
      description: 'Performance-driven style with functional design',
      tags: ['Active', 'Functional', 'Performance']
    },
    utility: {
      description: 'Practical, purposeful design with structural details',
      tags: ['Practical', 'Structured', 'Functional']
    }
  };

  const pillarGrid = document.querySelector('.pillar-grid');
  if (!pillarGrid) return;

  const gender = profile.gender; // womenswear or menswear

  pillarGrid.innerHTML = topPillars.map(([pillarKey, score], cardIndex) => {
    const displayName = pillarKey === 'fashionForward' ? 'Fashion Forward' : capitalize(pillarKey);
    const data = pillarData[pillarKey] || { description: 'Your unique style', tags: ['Unique'] };
    // Use usedImageIds to prevent duplicates with hero images
    const imageUrl = getImageForPillar(pillarKey, personaName, cardIndex + 3, gender, usedImageIds);
    const percentage = Math.round(score);

    return `
      <div class="pillar-card">
        <img src="${imageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'}"
             alt="${displayName} style"
             class="pillar-card-image">
        <div class="pillar-card-content">
          <div class="pillar-card-header">
            <div class="pillar-card-name">● ${displayName}</div>
            <div class="pillar-card-percentage">${percentage}%</div>
          </div>
          <p class="pillar-card-description">
            ${data.description}
          </p>
          <div class="pillar-card-tags">
            ${data.tags.map(tag => `<span class="pillar-tag">${tag}</span>`).join('')}
          </div>
          <div class="pillar-card-strength">
            <div class="pillar-card-strength-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="pillar-card-actions">
            <a href="#" class="profile-btn profile-btn-secondary">See Outfits</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Editorial Hero with dynamic style summary
 */
function renderEditorialHero(profile) {
  // Get top 3 pillars
  const topPillars = Object.entries(profile.pillars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const firstName = profile.customerName.split(' ')[0];

  // Generate style descriptors based on top pillars
  const styleDescriptors = generateStyleDescriptors(topPillars);

  // Update hero image if customer image exists
  const heroImageEl = document.getElementById('heroImage');
  const imagePath = getCustomerImagePath(profile.customerName);
  if (heroImageEl && imagePath) {
    heroImageEl.style.backgroundImage = `url('${imagePath}')`;
    heroImageEl.style.backgroundSize = 'cover';
    heroImageEl.style.backgroundPosition = 'center';
  }

  // Update hero elements
  const greetingEl = document.getElementById('heroGreeting');
  const headlineEl = document.getElementById('heroHeadline');
  const supportingEl = document.getElementById('heroSupportingText');

  if (greetingEl) {
    greetingEl.textContent = `Hi, ${firstName}`;
  }

  if (headlineEl) {
    headlineEl.innerHTML = `
      <span class="hero-headline-display">Your style is</span>
      <span class="hero-headline-emphasis">${styleDescriptors.adjectives},</span>
      <span class="hero-headline-display">and built on</span>
      <span class="hero-headline-emphasis">${styleDescriptors.foundation}.</span>
    `;
  }

  if (supportingEl) {
    supportingEl.textContent = styleDescriptors.supporting;
  }
}

/**
 * Generate style descriptors based on pillar data
 */
function generateStyleDescriptors(topPillars) {
  const pillarDescriptors = {
    minimal: {
      adjectives: 'refined, intentional',
      foundation: 'timeless foundations',
      supporting: 'You gravitate toward pieces that feel effortless yet considered, with a clear point of view that balances simplicity and sophistication.'
    },
    classic: {
      adjectives: 'polished, enduring',
      foundation: 'wardrobe essentials',
      supporting: 'You value quality and longevity, building a wardrobe around versatile pieces that transcend trends and feel authentic to who you are.'
    },
    romantic: {
      adjectives: 'soft, feminine',
      foundation: 'graceful details',
      supporting: 'You\'re drawn to delicate textures and flowing silhouettes, creating looks that feel effortlessly elegant and timelessly romantic.'
    },
    bohemian: {
      adjectives: 'free-spirited, eclectic',
      foundation: 'artisan influences',
      supporting: 'You embrace individuality through rich textures, layered looks, and pieces with a story, creating a style that\'s uniquely yours.'
    },
    maximal: {
      adjectives: 'bold, expressive',
      foundation: 'statement pieces',
      supporting: 'You\'re confident in making an impact, drawn to vibrant patterns and eye-catching details that showcase your creative energy.'
    },
    fashionForward: {
      adjectives: 'modern, trend-aware',
      foundation: 'contemporary edge',
      supporting: 'You stay ahead of the curve, mixing current trends with personal style to create looks that feel fresh, confident, and distinctly now.'
    },
    casual: {
      adjectives: 'relaxed, approachable',
      foundation: 'everyday comfort',
      supporting: 'You prioritize ease and versatility, building a wardrobe of go-to pieces that work seamlessly across all aspects of your life.'
    },
    athletic: {
      adjectives: 'active, functional',
      foundation: 'performance-driven design',
      supporting: 'You value movement and versatility, choosing pieces that support an active lifestyle while maintaining a streamlined, purposeful aesthetic.'
    },
    utility: {
      adjectives: 'practical, purposeful',
      foundation: 'functional design',
      supporting: 'You\'re drawn to thoughtful construction and utilitarian details, building a wardrobe that works as hard as you do with effortless style.'
    }
  };

  // Get descriptor for primary pillar
  const primaryPillar = topPillars[0][0];
  const descriptor = pillarDescriptors[primaryPillar] || pillarDescriptors.minimal;

  return descriptor;
}
