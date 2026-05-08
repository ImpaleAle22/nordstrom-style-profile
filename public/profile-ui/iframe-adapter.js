/**
 * Iframe Adapter - Receives profile data from parent window
 * and updates the UI accordingly
 */

// Listen for profile data from parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'LOAD_PROFILE') {
    const { profile, pillars } = event.data.data;
    console.log('Received profile data:', profile);

    // Update the profile display
    updateProfileDisplay(profile, pillars);
  }
});

function updateProfileDisplay(profile, pillars) {
  // Get first name only
  const firstName = profile.customer_name.split(' ')[0];

  // Update customer name in header
  const accountHeaders = document.querySelectorAll('.account-header-title span');
  accountHeaders.forEach(el => {
    el.textContent = `${firstName}'s Account`;
  });

  // Update site actions (top nav)
  const siteActions = document.querySelectorAll('.site-action-text');
  if (siteActions[0]) {
    siteActions[0].textContent = firstName;
  }

  // Update demo controls persona card
  const personaNameEl = document.getElementById('currentPersonaName');
  if (personaNameEl) {
    personaNameEl.textContent = profile.customer_name;
  }

  const personaTypeEl = document.getElementById('currentPersonaType');
  if (personaTypeEl) {
    personaTypeEl.textContent = profile.gender || '—';
  }

  // Update persona avatar with headshot image
  const personaAvatar = document.getElementById('personaAvatar');
  if (personaAvatar) {
    // Clear any existing content
    personaAvatar.innerHTML = '';

    // Create image element
    const img = document.createElement('img');
    img.src = `/personas/${encodeURIComponent(profile.customer_name)}.png`;
    img.alt = profile.customer_name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';

    // Fallback to initial if image fails
    img.onerror = function() {
      personaAvatar.textContent = firstName.charAt(0);
    };

    personaAvatar.appendChild(img);
  }

  // Update gender in stats
  const genderStatEl = document.getElementById('customerGender');
  if (genderStatEl) {
    genderStatEl.textContent = profile.gender || '—';
  }

  // Update sessions count
  const sessionsCountEl = document.getElementById('sessionsCount');
  if (sessionsCountEl) {
    sessionsCountEl.textContent = profile.sessions_processed || '0';
  }

  // Update hero stats
  const topPillars = Object.entries(pillars)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const heroStats = document.querySelectorAll('.hero-stat');
  if (heroStats[0]) {
    heroStats[0].querySelector('.hero-stat-value').textContent = `${topPillars[0][1]}%`;
    heroStats[0].querySelector('.hero-stat-label').textContent = capitalizeFirstLetter(topPillars[0][0]);
  }

  // Update hero image cluster with top 3 pillars
  updateHeroImageCluster(topPillars.slice(0, 3), profile.gender);

  // Update pillar list
  updatePillarsList(topPillars);

  // Update pillar cards
  updatePillarCards(topPillars);

  // Render the BEAUTIFUL radar chart!
  renderRadarChart(pillars);

  console.log('Profile display updated');
}

function updateHeroImageCluster(top3Pillars, gender) {
  const imageCluster = document.querySelector('.hero-image-cluster');
  if (!imageCluster) return;

  const cards = imageCluster.querySelectorAll('.hero-image-card');

  top3Pillars.forEach(([pillarName, weight], index) => {
    const card = cards[index];
    if (!card) return;

    const displayName = pillarName === 'fashionForward' ? 'Fashion Forward' : capitalizeFirstLetter(pillarName);

    // Get image from lifestyle images if available
    let imageUrl = null;
    if (window.lifestyleImages && window.lifestyleImages.length > 0) {
      // Map pillar names to match lifestyle image format
      const pillarKey = pillarName === 'fashionForward' ? 'fashion_forward' : pillarName.toLowerCase();

      console.log(`Looking for lifestyle image: pillar=${pillarKey}, gender=${gender}`);

      // Filter by pillar and gender
      let matchingImages = window.lifestyleImages.filter(img => {
        const imgPillar = img.finalPillar || img.pillar;
        return imgPillar === pillarKey;
      });

      console.log(`Found ${matchingImages.length} images for pillar ${pillarKey}`);

      // Filter by gender if available
      if (gender) {
        const genderFiltered = matchingImages.filter(img => img.gender === gender);
        console.log(`After gender filter (${gender}): ${genderFiltered.length} images`);
        if (genderFiltered.length > 0) {
          matchingImages = genderFiltered;
        }
      }

      // Pick a random image from matches
      if (matchingImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * matchingImages.length);
        const selectedImage = matchingImages[randomIndex];
        imageUrl = selectedImage.imageUrl || selectedImage.url || selectedImage.image_url;
        console.log(`Selected image: ${imageUrl}`);
      }
    } else {
      console.warn('No lifestyle images loaded yet');
    }

    // Fallback images if no lifestyle image found
    if (!imageUrl) {
      const fallbackImages = {
        classic: 'https://images.pexels.com/photos/8483769/pexels-photo-8483769.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        romantic: 'https://images.pexels.com/photos/36888252/pexels-photo-36888252.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        minimal: 'https://images.pexels.com/photos/15758653/pexels-photo-15758653.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        casual: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=800',
        athletic: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
        utility: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
        bohemian: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
        maximal: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
        fashionForward: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800'
      };
      imageUrl = fallbackImages[pillarName] || fallbackImages.classic;
    }

    // Update image and label
    const img = card.querySelector('img');
    const label = card.querySelector('.hero-image-label');

    if (img) img.src = imageUrl;
    if (label) label.textContent = displayName.toUpperCase();
  });

  console.log('✨ Hero image cluster updated with top 3 pillars');
}

function updatePillarsList(topPillars) {
  const pillarsList = document.getElementById('topPillarsList');
  if (!pillarsList) {
    console.warn('topPillarsList element not found');
    return;
  }

  // Calculate chart max (rounded up to nearest 5) - SAME as radar chart
  const allScores = topPillars.map(([, w]) => w);
  const maxScore = Math.max(...allScores);
  const chartMax = Math.ceil(maxScore / 5) * 5;

  // Calculate gradient colors - EXACT match to radar chart dot colors
  // From style-radar-chart.js lines 359-382
  function getGradientColor(score, chartMax) {
    // Calculate position the SAME way the radar chart does:
    // radius = (score / chartMax) * maxRadius
    // gradientPosition = radius / maxRadius = score / chartMax
    const gradientPosition = Math.min(1, score / chartMax);

    // EXACT color interpolation from radar chart (lines 364-381)
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

    return `rgb(${r}, ${g}, ${b})`;
  }

  pillarsList.innerHTML = topPillars.map(([name, weight]) => {
    const displayName = name === 'fashionForward' ? 'Fashion Forward' : capitalizeFirstLetter(name);
    // Color gradient uses score/chartMax EXACTLY like radar dot color
    const gradient = getGradientColor(weight, chartMax);
    // Bar width stays at actual percentage (38% = 38% wide)
    const barWidth = weight;

    return `
      <div class="pillar-item">
        <div class="pillar-item-left">
          <span class="pillar-name">${displayName}</span>
        </div>
        <div class="pillar-bar-container">
          <div class="pillar-bar-fill" style="width: ${barWidth}%; background: ${gradient};"></div>
          <span class="pillar-percentage">${weight}%</span>
        </div>
      </div>
    `;
  }).join('');

  console.log('✨ Pillar bars rendered:', topPillars.length, 'items with chartMax:', chartMax);
}

function updatePillarCards(topPillars) {
  const pillarGrid = document.querySelector('.pillar-grid');
  if (!pillarGrid) return;

  const top3 = topPillars.slice(0, 3);
  const cards = pillarGrid.querySelectorAll('.pillar-card');

  cards.forEach((card, index) => {
    if (top3[index]) {
      const [name, weight] = top3[index];
      card.querySelector('.pillar-card-name').textContent = `● ${capitalizeFirstLetter(name)}`;
      card.querySelector('.pillar-card-percentage').textContent = `${weight}%`;
      card.querySelector('.pillar-card-strength-fill').style.width = `${weight}%`;

      // Update button text
      const buttons = card.querySelectorAll('.profile-btn');
      if (buttons[0]) buttons[0].textContent = `Shop ${capitalizeFirstLetter(name)}`;
    }
  });
}

function renderRadarChart(pillars) {
  // Wait for StyleRadarChart to be loaded
  if (typeof window.StyleRadarChart === 'undefined') {
    console.warn('StyleRadarChart not loaded yet, retrying...');
    setTimeout(() => renderRadarChart(pillars), 100);
    return;
  }

  try {
    // Normalize pillar names (handle different formats)
    const normalizedPillars = {};
    for (const [key, value] of Object.entries(pillars)) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === 'fashion_forward' || normalizedKey === 'fashionforward') {
        normalizedPillars.fashionForward = value;
      } else {
        normalizedPillars[key] = value;
      }
    }

    // Ensure all expected pillars exist with at least 0 value
    const completePillars = {
      romantic: 0,
      bohemian: 0,
      casual: 0,
      classic: 0,
      minimal: 0,
      maximal: 0,
      fashionForward: 0,
      athletic: 0,
      utility: 0,
      ...normalizedPillars
    };

    // Default "before" profile (all equal at ~11%)
    const beforeProfile = {
      romantic: 11,
      bohemian: 11,
      casual: 11,
      classic: 11,
      minimal: 12,
      maximal: 11,
      fashionForward: 11,
      athletic: 11,
      utility: 11
    };

    console.log('Rendering radar chart with pillars:', completePillars);

    window.StyleRadarChart.render('styleRadarChart', {
      profileBefore: beforeProfile,
      profileAfter: completePillars,
      showBeforeProfile: false,
      animateDuration: 1000
    });

    console.log('✨ Radar chart rendered!');
  } catch (error) {
    console.error('Error rendering radar chart:', error);
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getPillarColor(pillar) {
  const colors = {
    classic: '#2C3E50',
    romantic: '#E8B4B8',
    minimal: '#95A5A6',
    casual: '#3498DB',
    fashionForward: '#9B59B6',
    bohemian: '#D4A574',
    edgy: '#34495E',
    preppy: '#27AE60'
  };
  return colors[pillar] || '#95A5A6';
}

// Load lifestyle images from API or fallback to local JSON
async function loadLifestyleImagesFromAPI() {
  try {
    // Try API first (Supabase)
    const response = await fetch('/api/lifestyle-images');
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        window.lifestyleImages = data.results;
        console.log(`✓ Loaded ${data.results.length} lifestyle images from Supabase`);
        return true;
      }
    }
  } catch (error) {
    console.warn('API not available:', error);
  }

  // Fallback to local JSON
  try {
    console.log('Falling back to local JSON file...');
    const response = await fetch('./data/lifestyle-images.json');
    if (!response.ok) {
      console.warn('Local lifestyle images file not found');
      return false;
    }
    const data = await response.json();

    // Use only 'live' images (filter out candidates and rejected)
    window.lifestyleImages = data.results.filter(img => {
      const status = img.status || 'live';
      return status === 'live';
    });

    console.log(`✓ Loaded ${window.lifestyleImages.length} lifestyle images from local JSON`);
    return true;
  } catch (error) {
    console.warn('Error loading lifestyle images:', error);
    return false;
  }
}

// Try to load from API when iframe loads
loadLifestyleImagesFromAPI();

// Wire up Change Persona button
document.addEventListener('DOMContentLoaded', () => {
  const changePersonaBtn = document.getElementById('changePersonaBtn');
  if (changePersonaBtn) {
    changePersonaBtn.addEventListener('click', () => {
      // Send message to parent to show persona selector
      window.parent.postMessage({ type: 'CHANGE_PERSONA' }, '*');
    });
  }
});

// Notify parent that iframe is ready
window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
