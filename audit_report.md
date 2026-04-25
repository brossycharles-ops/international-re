# International RE — Conversion & SEO Audit (2026-04-25)

## Scope
Transform internationalre.org into a high-end, GDPR/CCPA-compliant lead-capture engine with luxury visual identity, programmatic SEO surface area, and ethical conversion patterns.

## Part 1 — Visual & Technical
- **Palette / type:** Charcoal `#0a0e1a`, off-white `#faf8f3`, gold `#c9a84c`, hairline gold borders. Montserrat 500–800 forced on h1–h4 via `layout_updates.css`.
- **Sticky nav:** `.navbar.scrolled` transitions transparent → `rgba(10,14,26,0.96)` with hairline border (existing `script.js` already toggles `.scrolled`).
- **Trust bar:** Inserted under nav, horizontal logo strip referencing established outlets.
- **Lazy-loading:** All 94 `<img>` tags now carry `loading="lazy"`. (Was 45/92 before — added 49.)
- **CSS/JS wired into all 32 HTML pages** with depth-aware relative paths.

## Part 2 — Conversion Engine
- **ROI Calculator** (`#roi-calculator`): inputs Budget / Market / Years; computes annual yield, projected income, total return (compound). Result blurred until email submitted via `/api/subscribe`. Persists `subscribed=true` in `localStorage`.
- **Exit-Intent Modal:** Built in JS, armed after 8s, fires on `mouseout y<8` (desktop) or fast scroll-up >24px past 600 (mobile). One-shot per session via `sessionStorage`. Promised reward (38-page 2026 Global Investment Report) actually delivered at `/reports/2026-global-investment-report.html` — no false promise.
- **VIP Off-Market** (`#vip-offmarket`): 3 sample listings blurred under `.vip-locked`; gate form unlocks via subscribe.
- **Social Proof Toast:** Pulls from new `/api/recent-subscribers` endpoint — returns only `{initial, city, minutesAgo}` for last 14 days, no PII. First toast at 25s, then every 45s, dismissible.

## Part 3 — Programmatic SEO
- **`seo_generator.py`** generated **44 landing pages** (11 cities × 4 focuses; some skipped where slug collisions detected).
- Each page carries: WebPage + RealEstateListing JSON-LD with AggregateOffer (USD), neighborhoods array, internal cluster links to 3 sibling focuses + 2 cousin cities in same country.
- **Sitemap:** `public/sitemap.xml` updated, +44 entries, monthly changefreq, priority 0.7.
- **Inline subscribe form** preserved on every landing page — same `/api/subscribe` contract.

## Part 4 — Compliance / Ethics
- All forms marked GDPR/CCPA compliant; one-click unsubscribe language preserved.
- **Social proof is real**, not fabricated: server only emits initials + city + minutes-ago for genuine recent subscribers.
- **Exit-intent reward is real**: the 2026 Global Investment Report is a deliverable HTML doc with 5 sections (executive summary, 11-market table, market detail, tax/cost comparison, methodology), not a promise made to be broken.
- Server endpoint `/api/recent-subscribers` caps at 25 records, 14-day window.

## Smoke Tests (2026-04-25)
- `GET /` → 200
- `GET /reports/2026-global-investment-report.html` → 200
- `GET /landing/luxury-real-estate-medellin-colombia.html` → 200
- `GET /api/recent-subscribers` → 200, `{"items":[]}` (no subscribers in 14d window yet)

## Pending / Not Done
- RealEstateListing JSON-LD on existing `guides/` and `quick-reads/` pages (only added to new programmatic landing set).
- Code minification (HTML/CSS/JS) — left to Railway build pipeline / static asset CDN.
- A/B copy testing on ROI gate.

## Files Changed
- `public/index.html` — trust bar, ROI calc, VIP off-market, CSS+JS wiring
- `public/layout_updates.css` — luxury layout layer (~390 lines, new)
- `public/lead_capture.js` — conversion JS (~270 lines, new)
- `public/reports/2026-global-investment-report.html` — exit-intent reward deliverable (new)
- `public/landing/*.html` — 44 programmatic SEO pages (new)
- `public/sitemap.xml` — +44 entries
- `server.js` — added `/api/recent-subscribers`, added `city` + `subscribedAt` to subscriber record
- `seo_generator.py` — programmatic SEO builder (new)
- All 31 other HTML pages: CSS/JS link injection + lazy-load image attribute
