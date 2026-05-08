/**
 * Reusable Site Header Component (Correct Version from index.html)
 * Nordstrom branded header with stroke-based icons
 */

export function renderSiteHeader(options = {}) {
  const {
    userName = null, // null means "Sign in" link
    storeName = 'Stores',
    bannerMessage = 'Free shipping on orders $89+. <a href="#">See Details</a>',
    showBanner = true,
    showSearch = true
  } = options;

  const bannerHTML = showBanner ? `
    <div class="top-banner">
      ${bannerMessage}
    </div>
  ` : '';

  const userText = userName ? userName : 'Sign in';

  const searchHTML = showSearch ? `
    <div class="site-search">
      <input type="text" class="site-search-input" placeholder="Search for products and brands">
      <svg class="site-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
    </div>
  ` : '';

  return `
    ${bannerHTML}

    <!-- Site Header -->
    <header class="site-header">
      <a href="#" class="site-logo">NORDSTROM</a>

      ${searchHTML}

      <div class="site-actions">
        <a href="#" class="site-action">
          <svg class="site-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="site-action-text">${userText}</span>
        </a>

        <a href="#" class="site-action">
          <svg class="site-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span class="site-action-text">${storeName}</span>
        </a>

        <a href="#" class="site-action">
          <svg class="site-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="site-action-text">Purchases</span>
        </a>
      </div>
    </header>
  `;
}

export function renderMainNav(options = {}) {
  const {
    activeLink = '',
    links = [
      { text: 'Sale', href: '#', className: 'sale' },
      { text: 'Women', href: '#', className: '' },
      { text: 'Men', href: '#', className: '' },
      { text: 'Kids', href: '#', className: '' },
      { text: 'Designer', href: '#', className: '' },
      { text: 'Brands', href: '#', className: '' },
      { text: 'Young Adult', href: '#', className: '' },
      { text: 'Activewear', href: '#', className: '' },
      { text: 'Home', href: '#', className: '' },
      { text: 'Beauty', href: '#', className: '' },
      { text: 'Gifts', href: '#', className: '' }
    ]
  } = options;

  const navLinks = links.map(link => {
    const isActive = activeLink === link.text ? 'active' : '';
    const className = [link.className, isActive].filter(Boolean).join(' ');
    return `<a href="${link.href}" class="main-nav-link ${className}">${link.text}</a>`;
  }).join('\n        ');

  return `
    <nav class="main-nav">
      ${navLinks}
    </nav>
  `;
}

/**
 * Initialize site header after page load
 * Usage: Add <div id="site-header-container"></div> to your HTML
 * Then call: initSiteHeader({ userName: 'Brian' })
 */
export function initSiteHeader(options = {}) {
  const headerContainer = document.getElementById('site-header-container');
  if (headerContainer) {
    headerContainer.innerHTML = renderSiteHeader(options);
  }

  const navContainer = document.getElementById('main-nav-container');
  if (navContainer) {
    navContainer.innerHTML = renderMainNav(options);
  }
}

/**
 * Render complete header with nav
 */
export function renderCompleteHeader(options = {}) {
  return `
    ${renderSiteHeader(options)}
    ${renderMainNav(options)}
  `;
}
