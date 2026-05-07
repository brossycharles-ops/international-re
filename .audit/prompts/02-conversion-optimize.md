# Prompt 02 — Conversion Optimization

**Run this AFTER `01-audit-and-fix.md` is complete and committed.**

---

You are optimizing **internationalre.org** for newsletter signups and advisory inquiry conversions. Charles wants to grow subscribers and eventually convert a fraction into paid advisory clients.

## Current state (from live site recon)

- Hero: "Unlock Latin America's Real Estate Potential" — emoji bar, dual CTA (Get Free Starter Kit / Explore Markets)
- ROI calculator gated by email — strong intent signal
- 4 country market deep-dives (CR, NI, AR, CL) with snapshots
- VIP off-market listings section (gated)
- Multiple subscribe forms (header, hero, modal, footer)
- Social proof: 4 testimonials, "12+ countries"

## Your task

### Step 1 — Audit the conversion path
Read all HTML files. For each page that has a subscribe form or CTA, document:
- Form fields requested (fewer = higher conversion; question every field)
- CTA copy (specific outcomes beat generic "Subscribe")
- Form placement (above-the-fold? after value demonstrated?)
- Friction points (captcha, email confirm, multi-step)
- What happens post-submit (does success state set up the next ask?)

Output a markdown audit at `.audit/CONVERSION-AUDIT.md`.

### Step 2 — Propose three concrete A/B test ideas

Each test must have:
- Hypothesis ("If we change X, then Y will increase, because Z")
- Variant A vs B mockup (in HTML or described)
- Metric + how to measure (likely event in your analytics setup)
- Expected lift range (be conservative — 5-15% on signup conversion is realistic)

Pick tests with high signal: hero headline, CTA copy on the ROI calculator gate, and the modal trigger timing/copy.

### Step 3 — Implement the highest-impact change now

Pick the single change you have highest confidence in. Implement it in a feature branch:
```
git checkout -b conv/[short-name]
```

Show diff. Don't merge.

### Step 4 — Build a "high-intent" advisory CTA

Charles wants to do paid international RE advisory. Currently the site only captures newsletter subs. Add a soft advisory CTA:
- After the ROI calculator results, add: "Want a custom analysis? Book a 30-min advisory call → [link to /advisory.html]"
- In the VIP listings section, add: "Personalized property sourcing available → [link]"
- Don't be pushy. The newsletter is still the primary funnel.

The `/advisory.html` page itself comes in prompt 04 — for now just wire the CTAs to that path.

## Constraints

- Don't add tracking pixels or third-party scripts without listing them. Charles values speed and privacy.
- All copy edits should be reviewable as small commits.
- No dark patterns. No urgency timers. No fake "X people viewing now."
- Keep mobile-first — most newsletter sub traffic comes from phones.
