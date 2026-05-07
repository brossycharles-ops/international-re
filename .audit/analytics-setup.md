# Analytics Setup Guide — Plausible

## Why Plausible
- $9/mo, EU-hosted, no cookies, GDPR/CCPA compliant without a cookie banner
- ~1KB script — no performance impact
- Aligns with "no ads, independent, privacy-respecting" brand positioning
- Simple dashboard, custom event tracking, goal funnels

## Setup Steps

### 1. Create Plausible Account
1. Go to plausible.io and sign up ($9/mo plan)
2. Add site: `internationalre.org`
3. The tracking script is already installed on all pages:
   ```html
   <script defer data-domain="internationalre.org" src="https://plausible.io/js/script.js"></script>
   ```

### 2. Create Goals in Plausible Dashboard
Go to Settings > Goals > Add Goal for each:

| Goal Name | Type | Properties |
|-----------|------|------------|
| Subscribe Click | Custom Event | location |
| Subscribe Success | Custom Event | location |
| ROI Calc Started | Custom Event | — |
| ROI Calc Email Submitted | Custom Event | market |
| Advisory CTA Click | Custom Event | location |
| Advisory Form Started | Custom Event | — |
| Advisory Form Submitted | Custom Event | tier, budget |
| Blog Post Read | Custom Event | post, percent |
| Outbound Link | Custom Event | url |

### 3. Verify Installation
After creating goals, visit the site and:
1. Check Plausible dashboard — you should see a pageview within 5 minutes
2. Click a subscribe CTA — "Subscribe Click" should appear in goals
3. Use the ROI calculator — "ROI Calc Started" should fire
4. Open a blog post and scroll to bottom — "Blog Post Read" with percent=100 should fire

### 4. UTM Tracking
All newsletter signup forms now auto-capture UTM parameters from the URL into hidden fields. When sharing links to the site, use UTM tags:
```
https://www.internationalre.org/free-guide.html?utm_source=twitter&utm_medium=social&utm_campaign=launch
```
The UTM values are sent to the subscribe API alongside the email, so your ESP can segment by acquisition channel.

## Custom Events Reference

All events are fired from `/js/analytics.js`. The file is safe — all tracking is wrapped in try/catch so analytics failures never break forms or navigation.

### Subscribe Events
- `Subscribe Click` — fired when any subscribe form is submitted or CTA clicked
  - `location`: hero, modal, footer, roi-gate, vip, sticky, blog-inline, nav, other

### ROI Calculator
- `ROI Calc Started` — fired on first interaction with budget/market inputs
- `ROI Calc Email Submitted` — fired when email unlock form is submitted
  - `market`: costa-rica, panama, colombia, etc.

### Advisory Funnel
- `Advisory CTA Click` — fired when any link to /advisory.html is clicked
  - `location`: roi-results, vip, nav, thankyou, other
- `Advisory Form Started` — fired on first focus into advisory intake form
- `Advisory Form Submitted` — fired on form submission
  - `tier`: strategy, deepdive, sourcing
  - `budget`: Under $200K, $200K-$500K, etc.

### Content Engagement
- `Blog Post Read` — fired at scroll depth milestones
  - `post`: URL slug (e.g., "panama-city-real-estate-2026")
  - `percent`: 50, 75, or 100
- `Outbound Link` — fired when clicking any external link
  - `url`: full href
