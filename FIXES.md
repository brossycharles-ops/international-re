# Audit Fixes — 2026-05-06

## Summary

| Status | Count |
|--------|-------|
| Issues found | 10 |
| Fixed (P0) | 5 |
| Fixed (P1) | 2 |
| Deferred (P2) | 3 |

## P0 Fixes (applied)

### 1. Mobile hamburger button too small (styles.css)
- **Was**: 32x24px — failed WCAG 2.5.8 minimum target size
- **Fix**: Added `min-width: 44px; min-height: 44px; padding: 10px` to `.mobile-toggle`
- **Now**: 44x44px

### 2. Nine form inputs missing accessible labels (index.html)
- **Was**: ROI unlock form (3 inputs), VIP gate form (3 inputs), popup form (3 inputs) had no `<label>` or `aria-label` — screen readers could not identify signup fields
- **Fix**: Added `aria-label` attributes to all 9 inputs
- **Now**: All form inputs are labeled

### 3. Newsletter "Read Issue" links too small (styles.css)
- **Was**: `.newsletter-tag` had `padding: 4px 12px` — rendered at 30px height
- **Fix**: Changed to `padding: 11px 16px; min-height: 44px`
- **Now**: 44px height — meets tap target minimum

### 4. VIP gate form inputs under 44px (layout_updates.css)
- **Was**: `.vip-gate-form input` and `button` rendered at 42px
- **Fix**: Added `min-height: 44px` to both selectors
- **Now**: 44px height

### 5. ROI calculator says "8 covered markets" but dropdown has 17 (index.html)
- **Was**: Section description text said "8 covered markets"
- **Fix**: Updated to "17 covered markets" to match actual dropdown count

## P1 Fixes (applied)

### 6. Gallery lightbox empty src attribute (gallery.html)
- **Was**: `<img src="" alt="">` — htmlhint validation error
- **Fix**: Changed to transparent 1x1 data URI with `alt="Gallery image"`

### 7. Map SVG overflow (investigated — no fix needed)
- Leaflet SVG renders slightly wider than container, but `.map-container` already has `overflow: hidden` — no visible overflow. Reclassified from P1 to informational.

## Files changed

- `public/styles.css` — hamburger tap target, newsletter tag padding
- `public/layout_updates.css` — VIP form min-height
- `public/index.html` — aria-labels on 9 inputs, ROI market count text
- `public/gallery.html` — lightbox img src and alt
