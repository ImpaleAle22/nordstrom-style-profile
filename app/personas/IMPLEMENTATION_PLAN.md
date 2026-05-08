# Profile View - React Implementation

**Status:** In Progress - Building proper split-layout architecture
**Architecture:** Demo Controls (left) + Profile View (right) in split-layout

---

## Architecture

### Correct Structure (Split Layout)
```
/personas page
├── LEFT: Demo Controls Sidebar
│   ├── Demo header
│   ├── Current persona card
│   ├── Session navigation
│   ├── Activity feed
│   └── Keyboard shortcuts
└── RIGHT: Profile View (Full Nordstrom UI)
    ├── Top banner
    ├── Site header
    ├── Main nav
    ├── Account layout
    │   ├── Account sidebar
    │   └── Account content (profile sections)
    └── Overlaying Modal: Persona selector
```

### ✅ Complete - React Implementation Working
- ✅ Profile View component (right side) with Nordstrom UI
- ✅ All profile sections (hero, radar, pillar cards, patterns, cross-links)
- ✅ Demo Controls component (left sidebar) with visibility fixes
- ✅ Split-layout wrapper (.split-layout)
- ✅ Persona selector modal (inline styles, no Tailwind conflicts)
- ✅ ProfileStyleLoader (prevents FOUC, loads CSS+scripts)
- ✅ Body style overrides for /personas route
- ✅ Centralized CSS and script loading
- ✅ Radar chart renders correctly via StyleRadarChart library
- ✅ All text visibility fixed with explicit colors
- ✅ Data Page Link button (top right)
- ✅ NO IFRAME - Pure React implementation

### 🎯 Current State
- **Working:** Full profile view with radar chart, pillar bars, cards, patterns
- **Working:** Demo controls sidebar with persona card, session nav
- **Working:** Persona selector modal overlays correctly
- **Working:** All components use proper CSS classes from nordstrom-nav.css + styles.css

### ✨ Just Added (Phase 5.5 - Polish)
- ✅ PersonaModal extracted to separate component
- ✅ Escape key closes modal
- ✅ Enter key confirms selection
- ✅ Number keys (1-9) quick-select personas
- ✅ Keyboard shortcuts hint displayed in modal
- ✅ Number badges on persona cards
- ✅ Close button (×) in modal header
- ✅ Click outside to close modal

### 🔧 Future Improvements
- Session navigation (currently static 1/1)
- Activity feed (currently placeholder)
- Lifestyle image personalization (API integration - table empty)
- Left/Right arrow keys for session navigation
- Data page view (currently just a link)

---

## Implementation Checklist

### Phase 1: Core Layout ✅
- [x] Copy CSS files to app directory
- [x] Create `ProfileView.tsx` skeleton
- [x] Add feature flag system
- [x] Import Nordstrom header/nav
- [x] Import account sidebar

### Phase 2: Profile Content ✅
- [x] Editorial hero section with image cluster
- [x] Style profile overview (radar + list)
- [x] Radar chart integration (JS library)
- [x] Top pillars list with gradient bars
- [x] Pillar cards (top 3)
- [x] Style patterns section
- [x] Cross links section

### Phase 3: Dynamic Data ✅
- [x] Lifestyle image loading from API/JSON
- [x] Pillar data calculations
- [x] Color gradient matching
- [x] Image personalization by pillar/gender

### Phase 4: Demo Controls Integration ✅
- [x] Persona card in sidebar (handled by PersonaDemoUI)
- [x] Change Persona button hookup (handled by PersonaDemoUI)
- [x] Session navigation (not needed - single profile view)
- [x] Stats display (in persona selector modal)

### Phase 5: Testing & Polish (Current)
- [x] CSS loading strategy fixed (moved to parent)
- [x] Class names corrected (style-profile-section, etc.)
- [x] Radar chart script loading fixed
- [x] All 9 pillars added to config
- [x] Debug logging added
- [ ] Side-by-side comparison with iframe
- [ ] Color accuracy verification
- [ ] Layout pixel-perfect matching
- [ ] Responsive behavior
- [ ] Performance check
- [ ] Fix any remaining styling issues

---

## Key Files

### React Version (New)
```
app/personas/
├── ProfileView.tsx           # Main React component
├── styles/
│   ├── nordstrom.css        # Copied from public/profile-ui
│   └── nav.css              # Copied from public/profile-ui
└── IMPLEMENTATION_PLAN.md   # This file
```

### Iframe Version (Legacy/Fallback)
```
public/profile-ui/
├── index.html               # Original working HTML
├── styles.css               # Original CSS
├── app.js                   # Original JS
├── style-radar-chart.js     # Radar chart library
└── iframe-adapter.js        # postMessage handler
```

---

## How to Test

### Test Iframe Version (Current Default)
```typescript
// In PersonaDemoUI.tsx
const USE_REACT_VERSION = false;
```
Then visit: http://localhost:3002/personas

### Test React Version (Under Development)
```typescript
// In PersonaDemoUI.tsx
const USE_REACT_VERSION = true;
```
Then visit: http://localhost:3002/personas

---

## Critical Requirements

### Must Match Exactly
1. **Radar chart colors** - Coral → Pink → Lavender → Blue gradient
2. **Pillar bar colors** - Match dots on radar (using score/chartMax formula)
3. **Hero image cluster** - Top 3 pillars with lifestyle images
4. **Typography** - Exact fonts, sizes, weights from original
5. **Spacing** - Grid layouts, padding, margins identical

### Can Be Improved
- TypeScript types for better safety
- React hooks for lifecycle management
- Better error handling
- Cleaner code organization

---

## Radar Chart Integration

The trickiest part will be the radar chart. Options:

### Option A: Port Original JS
- Copy `style-radar-chart.js` logic
- Convert to TypeScript
- Use canvas API directly in React

### Option B: Use Existing Library
- Recharts radar chart component
- Customize to match colors
- May not get exact same look

### Option C: Load Original as Module
- Import the original JS file
- Call it from React component
- Similar to current but cleaner

**Recommendation:** Try Option C first, fall back to A if needed.

---

## Timeline

- **Phase 1:** ✅ Complete (30 min)
- **Phase 2:** 2-3 hours (profile content components)
- **Phase 3:** 1-2 hours (dynamic data)
- **Phase 4:** 1 hour (demo controls)
- **Phase 5:** 1-2 hours (testing/polish)

**Total Estimate:** 6-9 hours to complete React version

---

## Decision Points

### When to Switch to React Version?
- [ ] All features working
- [ ] Colors match exactly
- [ ] Layout pixel-perfect
- [ ] No bugs in testing
- [ ] Performance acceptable

### When to Keep Iframe Version?
- If React version not ready by May 7
- If any critical bugs found
- If performance issues
- If colors don't match exactly

---

## Notes

- The iframe works and looks perfect - keep it as fallback
- Don't rush the React version - quality over speed
- Test both versions side-by-side regularly
- Can ship with iframe if React isn't ready
- Deadline: May 8, 2026
