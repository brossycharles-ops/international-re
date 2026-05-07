# Prompt 04 — Build the Advisory Page

**Goal: monetize. Build `/advisory.html` — the page that converts newsletter readers into paid clients.**

---

## Context

Charles wants to do international real estate advisory. Newsletter is the funnel; advisory is the revenue. This page needs to position him as credible, scope what he sells clearly, and make booking frictionless. He's not a licensed financial advisor in most markets — be careful with language.

## Your task

### Step 1 — Define the offering structure

Read `/about.html` to understand Charles's positioning. Then propose a tiered service structure in `.audit/advisory-offerings.md`:

- **Tier 1 — Strategy Call** ($X for 60 min): one-time, country shortlist + buyer profile fit
- **Tier 2 — Market Deep-Dive** ($X for 2-week engagement): one country, deal screening criteria, broker intros, neighborhood-level data
- **Tier 3 — Deal Sourcing & Closing Support** ($X retainer + success fee): full-cycle, multiple deals reviewed

Don't lock in prices — leave them as `[$TBD by Charles]`. This is a strawman for him to react to.

### Step 2 — Build `/advisory.html`

Match the existing site CSS exactly. Page structure:

1. **Hero** — "Personalized advisory for international real estate buyers" with subhead emphasizing what makes him different (newsletter has 100+ subs by then, real-deal experience at IceCap, lived/visited 30+ countries).
2. **Who this is for** — three buyer personas: pre-retirement diversifier, remote-work relocator, portfolio-seeking investor. Each persona = a card with their profile and what advisory delivers.
3. **What you get** — the three tiers from step 1, side-by-side cards. "Most popular" badge on Tier 2.
4. **Process** — 4-step visual: Apply → Discovery call → Engagement → Deliverables.
5. **Credentials section** — Charles's IceCap role, prior firms (Newmark, Armada, Cochran Booth), countries visited, lived experience. NOT a CV dump — three credibility blocks max.
6. **FAQ** — 8 honest questions: "Are you a licensed advisor?", "Do you take referral fees from brokers?" (he should answer no), "What if I want a country you don't cover?", "Refund policy", "How is this different from the free newsletter?".
7. **Application form** — Calendly-style intake. Fields: name, email, target country, budget range (5 buckets: <$200K, $200-500K, $500K-1M, $1-3M, $3M+), timeline (3 months / 6 months / 12 months / exploring), what's prompting this now (free text), tier interest. The form is qualifier — Charles reviews before booking.
8. **Footer CTA** — "Not ready? Subscribe to the newsletter and revisit when you are."

### Step 3 — Compliance language

In the FAQ and footer, include:
> International RE provides educational research and introduction services. We are not a licensed real estate broker, attorney, tax advisor, or investment advisor in any jurisdiction. All transactions require local licensed counsel. Past performance of covered markets does not predict future results.

This isn't optional. Different countries treat unlicensed advisory differently — Charles needs this on every page that mentions paid services. Don't soften the language.

### Step 4 — Wire the form

Form should POST to a placeholder endpoint `/advisory-intake` — Charles plugs in his real handler (Formspree, Netlify Forms, Mailchimp, or his existing newsletter provider's form API). Add a `success.html` confirmation page that says "Charles will review and reply within 2 business days. In the meantime, here's [most relevant pillar guide]."

### Step 5 — Add advisory CTAs to existing pages

Per prompt 02 — wire the soft CTAs already added in step 4 of prompt 02 to point to this new page.

## Constraints

- **No financial advice language.** Don't say "investment advice", "best investment", or imply guaranteed returns. Use "research", "introductions", "market analysis", "buyer support".
- Don't fabricate testimonials. The advisory line is new — testimonials section is empty until Charles has clients.
- Don't claim certifications Charles doesn't have. The about page is the source of truth.
- Mobile-first — most form submits will be from phones.
