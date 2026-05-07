# Prompt 03 — SEO Content Engine

**Goal: turn Charles's expertise into a search-visible newsletter + blog flywheel.**

---

## Context

internationalre.org has 4-5 blog posts (Panama City, Medellín, Tbilisi, weekly roundup). Newsletter launches June 2026. The competitive moat is **primary-source data** — actual price/m², yields, legal updates — not aggregated content. Don't let Claude Code write generic AI fluff that Google penalizes.

## Your task

### Step 1 — Build a topic cluster map

Create `.audit/seo/topic-clusters.md` with:

- **Pillar 1: Country buying guides** — Costa Rica, Panama, Colombia, Mexico, Argentina, Chile, Nicaragua, Uruguay, DR, Ecuador, Peru, Brazil. Each pillar = one comprehensive 3000+ word guide.
- **Pillar 2: City-level market reports** — Medellín, Tulum, Buenos Aires, Santiago, San Juan del Sur, Lisbon, Tbilisi, etc. Updated quarterly with real numbers.
- **Pillar 3: Cross-cutting topics** — taxes, residency by investment, currency risk, financing for foreigners, vacation rental yields, foreign-ownership law.

For each cluster, list 8-12 long-tail blog topics (e.g., "Costa Rica property tax for foreigners 2026", "How to wire $300K to Argentina legally").

Use Google's "People also ask" patterns. Keywords should target buyer-intent, not awareness ("buy real estate Costa Rica" not "is Costa Rica nice").

### Step 2 — Build a blog post template

Create `templates/blog-post.html` matching the existing site's CSS. Include:
- Reading time, publish date, last-updated date (Google rewards freshness)
- Author byline with link to /about.html
- JSON-LD `Article` schema (title, datePublished, author, publisher, image)
- Table of contents auto-generated from H2s
- 2-3 inline newsletter CTAs at sensible scroll depths
- Internal-link callout: "Related: [3 most relevant other posts]"
- Sources/methodology section at bottom (this is the moat — Charles cites primary sources)
- Comments section is OFF (spam vector)

### Step 3 — Write ONE pillar post end-to-end as the model

Pick: **Costa Rica complete buying guide 2026**.

Outline → draft → revise. Include:
- Live data: median prices for Tamarindo, Manuel Antonio, Atenas, Escazú, Nosara
- Legal: corporation vs. fideicomiso, escribano process, transfer tax
- Tax: 0.25% property tax, capital gains, US-CR tax treaty
- Visa: rentista, inversionista, pensionado — minimum thresholds + timelines
- Pitfalls: maritime zone (200m), squatter rights, water concession
- Real numbers throughout — never "around" or "roughly". If you don't have a number, say "verify with local counsel" — never invent.

Length: 3000-4000 words. Save as `blog/costa-rica-buying-guide-2026.html`. Do not push live yet — Charles reviews first.

### Step 4 — Generate the editorial calendar

Create `.audit/seo/editorial-calendar.md`:
- 12 weeks of newsletter topics (matches June 2026 launch through August 2026)
- 24 blog posts queued (2/week, mix of pillar and quick-hit)
- Each entry has: target keyword, search volume estimate, intent (info/transactional), word count target

## Constraints

- **Never fabricate numbers.** If price-per-m² isn't verifiable, write "[verify Q3 2026]" so Charles fills it in. Fabricated stats kill credibility.
- Use plain English. Charles's audience includes US/Canada/UK retirees and remote workers — not finance pros.
- Cite sources inline as `[Source: <publication>, <date>]`. No bare claims.
- Don't repeat content across posts — each post must be uniquely useful.
- If the topic overlaps an existing newsletter issue, link to the issue. Don't compete with yourself.
