# Conversion Audit — internationalre.org
_Generated 2026-05-06_

## Subscribe Form Inventory

### 1. Homepage — Hero CTA (index.html)
- **Fields**: None (links to /free-guide.html)
- **CTA copy**: "Get Free Starter Kit" / "Explore Markets"
- **Placement**: Above the fold, first thing visitors see
- **Friction**: Low — link only, no form inline
- **Post-click**: Navigates to /free-guide.html

### 2. Homepage — ROI Calculator Gate (index.html #roi-calculator)
- **Fields**: First name, Last name, Email (3 fields)
- **CTA copy**: "Unlock Results"
- **Placement**: After value demonstrated (user sees calculator, adjusts inputs, then is gated)
- **Friction**: Medium — 3 fields, but high intent (user already engaged with calculator)
- **Post-submit**: Results revealed in-place, success message. Does NOT redirect to thankyou.html
- **Issue**: No post-unlock next step — missed opportunity to upsell advisory or guide

### 3. Homepage — VIP Off-Market Gate (index.html #vip-offmarket)
- **Fields**: First name, Last name, Email (3 fields)
- **CTA copy**: "Unlock VIP Listings"
- **Placement**: After listings preview (blurred cards shown first)
- **Friction**: Medium — same 3 fields
- **Post-submit**: Listings revealed in-place
- **Issue**: Same as ROI — no next step after unlock

### 4. Homepage — Main Subscribe Form (index.html #subscribe)
- **Fields**: First name, Last name, Email (3 fields)
- **CTA copy**: "Get Free Starter Kit + Subscribe"
- **Placement**: Deep in page (after all country sections, testimonials, newsletters)
- **Friction**: Low-medium — 3 fields but clear value prop with checklist
- **Post-submit**: Redirects to /thankyou.html

### 5. Homepage — Popup Modal (index.html #popupOverlay)
- **Fields**: First name, Last name, Email (3 fields)
- **CTA copy**: "Get Free Starter Kit + Subscribe"
- **Trigger**: 8-second timer + exit intent (mouse leaves viewport)
- **Friction**: Medium — modal + 3 fields
- **Post-submit**: Redirects to /thankyou.html

### 6. Homepage — Sticky CTA Bar (index.html #stickyCta)
- **Fields**: None (link to #subscribe)
- **CTA copy**: "Subscribe Free"
- **Placement**: Fixed bottom bar, appears after scrolling past hero
- **Friction**: Very low — just scrolls to form

### 7. Free Guide Page (free-guide.html)
- **Fields**: Email only (1 field) x4 forms
- **CTA copy**: "Send Me the Starter Kit" / "Unlock Full Table" / "Get the Full Checklist" / "Send Me the Kit"
- **Placement**: Hero + after preview table + after preview checklist + bottom
- **Friction**: Very low — email-only
- **Post-submit**: Redirects to /thankyou.html
- **Strength**: Best conversion page — value demonstrated with blurred previews, multiple entry points, email-only

### 8. Subscribe Page (subscribe.html)
- **Fields**: First name, Last name, Email (3 fields)
- **CTA copy**: "Get Free Access"
- **Placement**: Full-page dedicated form
- **Friction**: Low — clean design, social proof, checklist of benefits
- **Post-submit**: Redirects to /thankyou.html

### 9. Blog Posts — Sticky Subscribe Bar (via lead_capture.js)
- **Fields**: Email only (1 field)
- **CTA copy**: "Get Free Kit"
- **Trigger**: 60% scroll depth
- **Friction**: Very low
- **Post-submit**: Redirects to /thankyou.html

### 10. Blog Posts — Exit Intent Modal (via lead_capture.js)
- **Fields**: First name, Last name, Email (3 fields)
- **CTA copy**: "Send Me the Starter Kit"
- **Trigger**: Exit intent (mouse leave) or 45-second timer
- **Post-submit**: Redirects to /thankyou.html

### 11. Quiz Page (quiz.html)
- **Fields**: Email gated at results reveal
- **CTA copy**: Quiz results unlock
- **Friction**: High engagement before gate — user answers 5 questions, then sees gated results
- **Strength**: Highest intent signal — user actively engaged for 2+ minutes

## Key Findings

### What's working well
1. **Multiple entry points** — 10+ subscribe touchpoints across the site
2. **Value-first approach** — ROI calculator, quiz, and free guide all demonstrate value before asking for email
3. **Email-only on high-friction pages** — free-guide.html uses 1 field, reducing friction
4. **Social proof** — avatars + "12+ countries" throughout
5. **Clear privacy language** — "No spam. Unsubscribe anytime" on every form

### Conversion gaps
1. **Post-subscribe dead end** — thankyou.html has share buttons and explore links, but no advisory CTA or high-intent next step
2. **ROI calculator post-unlock** — reveals numbers but doesn't offer a next action (advisory call, deeper guide)
3. **VIP listings post-unlock** — reveals listings but no "want to act on these?" CTA
4. **3-field forms on homepage** — first name + last name + email on the main form; could test email-only
5. **No advisory funnel** — site captures newsletter subs but has zero path to paid services
6. **Homepage hero CTA** — "Get Free Starter Kit" links away from homepage to /free-guide.html; could capture email inline

## Three A/B Test Proposals

### Test 1: Homepage hero — inline email capture vs link to /free-guide.html
- **Hypothesis**: If we add an inline email field to the hero section (replacing or augmenting the "Get Free Starter Kit" button), newsletter signups will increase, because visitors won't need to navigate away from the homepage to subscribe
- **Variant A (control)**: Current — button links to /free-guide.html
- **Variant B**: Inline email field + "Get Free Starter Kit" submit button directly in hero
- **Metric**: Subscribe events from hero, measured via `plausible('Subscribe Click', {location: 'hero'})`
- **Expected lift**: 8-15% more homepage-originated signups (reducing one navigation step)

### Test 2: ROI calculator gate — email-only vs 3 fields
- **Hypothesis**: If we reduce the ROI unlock form from 3 fields (first name, last name, email) to 1 field (email only), the unlock rate will increase, because fewer fields = less friction at a high-intent moment
- **Variant A (control)**: First name + Last name + Email
- **Variant B**: Email only
- **Metric**: `plausible('ROI Calc Email Submitted')` conversion rate
- **Expected lift**: 10-15% more ROI unlocks (well-documented that reducing form fields increases conversion)

### Test 3: Post-subscribe page — add advisory soft CTA
- **Hypothesis**: If we add a soft advisory CTA ("Want personalized guidance? Book a strategy call") on the thank-you page, we will generate advisory inquiries from the highest-intent subscribers, because they just committed and are in action mode
- **Variant A (control)**: Current thankyou.html — guide download + share + explore
- **Variant B**: Add advisory card between guide download and share section
- **Metric**: `plausible('Advisory CTA Click', {location: 'thankyou'})` click rate
- **Expected lift**: 2-5% of new subscribers clicking through to advisory (conservative for a cold audience)
