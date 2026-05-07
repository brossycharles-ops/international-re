# Prompt 05 — Analytics Setup

**Goal: measure what matters so Charles can grow with data, not vibes.**

---

## What to measure (in priority order)

1. **Newsletter signups** — by source (organic, direct, referral, specific blog post)
2. **Advisory inquiries** — form starts vs completes vs qualified
3. **ROI calculator usage** — completes (email gate hit) by selected market
4. **Blog engagement** — scroll depth 50/75/100, time on page, internal click-through
5. **Funnel** — landed → scrolled past hero → CTA click → form view → form submit

## Your task

### Step 1 — Pick one analytics stack

Charles values speed and privacy. Recommend ONE of:
- **Plausible** ($9/mo, EU-hosted, no cookies, GDPR-clean) — fits the "no spam, privacy-respecting" brand
- **Fathom** (similar to Plausible, slight feature differences)
- **GA4** (free, but requires cookie banner under GDPR/CCPA — adds friction)

Default recommendation: Plausible. State your reasoning, then implement Plausible. Total script weight: ~1KB.

### Step 2 — Wire pageview + custom events

Add the script to `<head>` of every HTML file. Then instrument these custom events:

```js
// Newsletter signup attempts
plausible('Subscribe Click', { props: { location: 'hero' | 'modal' | 'footer' | 'roi-gate' | 'vip' } });
plausible('Subscribe Success', { props: { location: '...' } });

// ROI calculator
plausible('ROI Calc Started');
plausible('ROI Calc Email Submitted', { props: { market: 'costa-rica' | ... } });

// Advisory funnel
plausible('Advisory CTA Click', { props: { location: 'roi-results' | 'vip' | 'nav' } });
plausible('Advisory Form Started');
plausible('Advisory Form Submitted', { props: { tier: 'strategy' | 'deepdive' | 'sourcing', budget: '<200K' | ... } });

// Content engagement
plausible('Blog Post Read', { props: { post: '<slug>', percent: 50 | 75 | 100 } });
plausible('Outbound Link', { props: { url: '<href>' } });
```

Use a tiny IIFE in `js/analytics.js` (no framework, no deps). Import once per page.

### Step 3 — Set up Plausible Goals

In `.audit/analytics-setup.md`, give Charles a checklist of goals to create in the Plausible dashboard with exact event names matching what you instrumented. Include screenshot-able step-by-step.

### Step 4 — Server-side: UTM landing tracking

Update the newsletter signup form to capture UTM params from the URL (`utm_source`, `utm_medium`, `utm_campaign`) into hidden fields so Charles can see in his ESP what acquisition channel each subscriber came from. This is more reliable than client-side analytics for attribution.

### Step 5 — Build a simple dashboard view

Create `.audit/dashboard-queries.md` with the exact filters/segments Charles should set up in Plausible to monitor weekly:

- Newsletter signups by source (last 7 days)
- ROI calc → newsletter conversion rate
- Advisory CTA click → form submit conversion rate
- Top 10 blog posts by signups generated
- Mobile vs desktop signup rate

### Step 6 — Verify

Add a `.audit/scripts/verify-analytics.js` Playwright script that:
1. Loads each main page
2. Confirms the Plausible script loads with the right domain
3. Triggers a test event and confirms it fires
4. Reports any pages missing the snippet

Run it. Show output.

## Constraints

- No GA, no FB Pixel, no third-party trackers unless Charles explicitly asks. The site's "no ads, independent" positioning matters.
- Cookie banner only if absolutely required. Plausible doesn't need one.
- All event firing must be `try/catch`-safe — analytics failure must never break the form.
