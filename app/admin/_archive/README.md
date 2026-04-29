# Archived Pages

This directory contains obsolete pages that have been replaced by better tools or consolidated into other pages.

**Archived on:** April 27, 2026

## Archived Pages

### tag-outfits
- **Reason:** Superseded by `/test-tagging`
- **Missing features:** Filtering, presets, department sorting, comprehensive analysis
- **Replacement:** `/test-tagging` is the complete, feature-rich version

### review-tagging
- **Reason:** Manual review workflow replaced by automatic analysis
- **Documentation:** "automatic analysis replaced manual review" (per latest learnings)
- **Replacement:** Gap analysis is now automatic in `/test-tagging`

### review-tags
- **Reason:** Duplicate of `/review-tagging`
- **Replacement:** Both superseded by automatic analysis in `/test-tagging`

### ingredients
- **Reason:** Mock data page, ingredients are embedded in recipes (not stored separately)
- **Note:** May be implemented later when ingredient deduplication/reuse is needed
- **Current:** Ingredients live inline within recipe slots

### manage (formerly cleanup-outfits)
- **Reason:** Bulk deletion by pillar/score threshold not useful
- **Problem:** Scoring didn't provide clear delete cutoff points
- **Replacement:** Need different approach for ensuring diverse coverage across pillars
- **Note:** Feature moved to validate page; link added to /outfits page

### outfits-import
- **Reason:** Was for one-time data cleanup task
- **Archived:** April 27, 2026
- **Note:** Can be accessed directly if needed but removed from navigation

### review-outfits
- **Reason:** All functionality ported to redesigned `/outfits` page
- **Archived:** April 27, 2026
- **Replacement:** `/outfits` now has full-width horizontal cards, comprehensive filtering (tag quality, activity, season, search), and all review-outfits features
- **Note:** Old `/outfits` page backed up as `page-OLD-BACKUP.tsx`

## Why Archive Instead of Delete?

These pages are moved to `_archive` (instead of deleted) for:
1. **Safety:** Can be restored if needed
2. **Reference:** Useful code patterns may exist
3. **History:** Documents evolution of the tool

## Next.js Behavior

Pages in `_archive` will **NOT** be accessible as routes because Next.js ignores directories starting with underscore.
