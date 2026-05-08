# Reusable UI Components

This directory contains reusable JavaScript modules for Nordstrom UI components with official iconography.

## Components

### 1. Account Navigation (`account-nav.js`)

Left sidebar account navigation with all menu items and official Nordstrom icons.

**Usage:**

```html
<!-- Add container to your HTML -->
<div id="account-nav-container"></div>

<!-- Import and initialize in your script -->
<script type="module">
  import { initAccountNav } from './components/account-nav.js';

  initAccountNav({
    activeItem: 'your-style',  // Highlights the active menu item
    userName: 'Brian',
    rewardsAmount: '$9.91',
    lastPaymentDigits: '5687',
    primaryAddress: 'USA My Adrs Pl',
    storeName: 'Nordstrom Michigan Avenue'
  });
</script>
```

**Or render manually:**

```javascript
import { renderAccountNav } from './components/account-nav.js';

const navHTML = renderAccountNav({ activeItem: 'your-style' });
document.getElementById('account-nav-container').innerHTML = navHTML;
```

**Active item values:**
- `account-info`
- `purchases`
- `wishlists`
- `rewards`
- `payment`
- `shipping`
- `personal-info`
- `communications`
- `your-store`
- `your-brands`
- `your-sizes`
- `your-style`
- `appointments`

---

### 2. Site Header (`site-header.js`)

Top site header with logo, search, user actions, and main navigation.

**Usage:**

```html
<!-- Add container to your HTML -->
<div id="site-header-container"></div>
<div id="main-nav-container"></div>

<!-- Import and initialize in your script -->
<script type="module">
  import { initSiteHeader } from './components/site-header.js';

  initSiteHeader({
    userName: 'Brian',
    userStatus: 'Member',
    storeName: 'Michigan Avenue',
    bannerMessage: 'Free shipping on orders of $89+. <a href="#">Shop Now</a>',
    showBanner: true,
    activeLink: 'Women'  // Highlights active nav link
  });
</script>
```

**Or use the complete header:**

```javascript
import { renderCompleteHeader } from './components/site-header.js';

const headerHTML = renderCompleteHeader({
  userName: 'Sarah',
  storeName: 'Downtown Seattle'
});
document.body.insertAdjacentHTML('afterbegin', headerHTML);
```

**Custom navigation links:**

```javascript
initSiteHeader({
  links: [
    { text: 'New & Now', href: '/new', className: '' },
    { text: 'Sale', href: '/sale', className: 'sale' },
    { text: 'Women', href: '/women', className: '' },
    // ... more links
  ]
});
```

---

## Icons Included

All components use official Nordstrom icons from `/Iconography/`:

- **person.svg** - Account/profile icon
- **box.svg** - Purchases/orders
- **heart.svg** - Wish lists
- **nordy-club.svg** - Nordy Club rewards
- **nordstrom-card.svg** - Payment methods (Nordstrom card)
- **location.svg** - Shipping addresses, store locations
- **mail.svg** - Communications/email
- **shopping-bag.svg** - Shopping bag/cart

Icons are embedded directly in the components with proper viewBox, clipPaths, and `fill="currentColor"` for CSS color control.

---

## Benefits

1. **Single source of truth** - Update icons in one place, affects all pages
2. **Consistency** - Same markup and styling everywhere
3. **Maintainability** - Easy to update without touching every HTML file
4. **Type safety** - Clear options interfaces for customization
5. **Official branding** - All icons match Nordstrom design system

---

## Migration Guide

### Existing files using inline HTML:

**Before:**
```html
<aside class="account-sidebar">
  <div class="account-header">
    <!-- ... inline SVGs and HTML ... -->
  </div>
  <!-- ... more inline HTML ... -->
</aside>
```

**After:**
```html
<div id="account-nav-container"></div>

<script type="module">
  import { initAccountNav } from './components/account-nav.js';
  initAccountNav({ activeItem: 'your-style' });
</script>
```

### For pages that need the header:

**Before:**
```html
<div class="top-banner">...</div>
<header class="site-header">...</header>
<nav class="main-nav">...</nav>
```

**After:**
```html
<div id="site-header-container"></div>
<div id="main-nav-container"></div>

<script type="module">
  import { initSiteHeader } from './components/site-header.js';
  initSiteHeader();
</script>
```

---

## CSS Requirements

Components expect the following CSS classes to be defined:

- `.account-sidebar`, `.account-nav-item`, `.account-nav-icon`, `.account-nav-title`
- `.site-header`, `.site-logo`, `.site-search`, `.site-action`, `.site-action-icon`
- `.main-nav`, `.main-nav-link`
- `.top-banner`

All existing styles in your HTML files should work without modification.

---

## Next Steps

1. Update `style-profile-advanced-v2.html` to use components
2. Update `style-profile-v2.html` to use components
3. Update `swipe-ui.html` to use site header component
4. Create shared CSS file for component styles (optional)
5. Add TypeScript definitions (optional)
