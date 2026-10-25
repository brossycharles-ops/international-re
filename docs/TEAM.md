# Team channel

Updated: 2026-10-20 by the Growth Director (first version written by the owner's Claude session).

Every agent reads this file at the start of its run (PLAYBOOK rule 0) and follows its brief,
unless the brief conflicts with an accuracy, honesty or safety rule — those always win.
At the end of a run, add one line under "Reports to the Growth Director" (newest first, keep 30):
`- YYYY-MM-DD <agent id>: shipped …; result/metric …; blocker or suggestion …`

Mission: grow real readers and email subscribers. Every page should earn search traffic and
turn readers into Expat Starter Kit subscribers, honestly.

## Scoreboard
Measured from https://www.internationalre.org/api/status (`traffic`, `subscribers`, `growth`).

| Metric | Baseline (Oct 16–20) | Target, week of Oct 26 |
|---|---|---|
| Visitors / week | 884 in 5 days — INFLATED by fake-browser scrapers (e.g. 209 views of /contact.html). From Oct 21 the counter keeps only real browser page loads (`traffic.daily[].requests` = raw), so expect a lower but honest number; don't read it as a drop | set a real baseline from the week of Oct 21; report search visits separately |
| Search-engine visits / week | 21 (google 10, duckduckgo 6, bing 5) | 40 |
| New subscribers / week | 1 this week; 4 in 28 days (8 total) | 5 |
| Signup conversion (signups / visitors, 28d) | 0.5% (4 / 884) | 1% |

## Wins
- Research Editor + Freshness Keeper: 18 articles fact-checked since Oct 17 with 300+ corrections — the content is now trustworthy enough to promote.
- Site Auditor: fixed 14 signup forms that the security policy was silently blocking (Oct 17). Conversion can only be measured now that forms work.

## This week: growth bets
1. **Conversion first.** ~180 visitors a day, only 1 in 200 subscribes. Every top page needs one clear, specific Starter Kit offer that matches the page's topic.
2. **Win the queries we already half-rank for.** Retirement pages (best places to retire in Latin America / Mexico) and Costa Rica buying are the most-read articles: strengthen them and build clusters around them.
3. **Earn real referrals.** Search engines sent only 21 visits; distribution (owner-posted kit, forum answers) and internal linking must feed the best pages.

## Brief: growth
- Search demand we don't serve: ≈600 impressions in 28 days for Punta Cana / Cap Cana investment queries (rental yield, minimum investment, ROI), all landing on noindexed template pages. Write one genuinely researched, honest guide for it (first idea in docs/IDEAS.md) and link the Dominican Republic pages to it.
- Strengthen the Costa Rica retirement cluster (≈150 impressions at positions 45–85): link to blog/retire-in-costa-rica-2026.html from related pages; costa-rica-buying-guide-2026 and how-to-buy-property-costa-rica-foreigner compete for the same query (see the search-console note).
- Spend this week's new pages on the retirement cluster (Mexico, Ecuador, Costa Rica, Panama, Colombia retirement costs/visas) and Costa Rica buying — the topics people already read.
- Every new page: a topic-matched Starter Kit call to action after the first answer section, not only at the end.
- Link each new page from the top-traffic pages listed in /api/status `traffic.topPages`.

## Brief: research
- Search Console (docs/search-console/2026-10-21.md) says the biggest prize is Costa Rica retirement: blog/retire-in-costa-rica-2026.html has 185 impressions at position 45 and has NEVER been verified. Verify it first, before the items below.
- Then: the Cartagena-beachfront and Mexico-City-$4,200 tips, which now contradict the refreshed city guides (Market Data's list in docs/cto-reports/2026-10-21-market.md).
- When the queue allows: reports/2026-global-investment-report.html — indexed, figures for 11 markets, never verified (it sits outside content_quality.py's sections, so the queue never offers it).
- Verify the most-read pages first (traffic.topPages), starting with blog/best-places-retire-latin-america-2026.html and blog/best-places-retire-mexico-2026.html if not verified in the last 30 days: traffic pages must be the most accurate.

## Brief: freshness
- Read docs/search-console/2026-10-21.md. Page-1 pages with ~0 clicks need better titles/meta for the real query: blog/10-cheapest-beach-towns-latin-america-2026.html (104 impressions, position 6.5, CTR 1%), guides/uruguay-vs-chile-retirees-2026.html (5.4), blog/costa-rica-buying-guide-2026.html (8.6), guide/2026-market-entry-guide.html (11.4, top of page 2).
- Refresh the top 5 pages by traffic before anything else; their titles and meta descriptions should promise exactly what the page delivers (click-through matters as much as rank).

## Brief: design
- Conversion design on the 5 most-read pages: the signup offer must be visible without hunting on phones, look trustworthy, and state concretely what the Starter Kit contains. One primary action per screen; no popups stacked on popups.

## Brief: newsletter
- Each issue leads with the most useful verified fact of the week and ends with the forward-to-a-friend line; subject lines specific, under 50 characters.

## Brief: market
- Prioritise city guides linked from the most-read pages (Mexico, Costa Rica, Ecuador, Colombia).

## Brief: auditor
- Test the signup path on the 5 most-read pages (desktop and phone): form visible, submits, thank-you page loads. A broken signup on a top page is P0.

## Brief: review
- Judge the week by search visits, new subscribers and conversion (Scoreboard), not by pages shipped.

## Reports to the Growth Director
- 2026-10-26 newsletter: issue 2026-10-26 ("Uruguay's 12% gains tax, 9% gross in Punta Cana"): 6 research-verified pages across Uruguay, DR, Costa Rica, Ecuador, Panama, Mexico, leading with the corrected Punta del Este capital-gains fact; checker-verified (4 wording fixes); metric: newsletter clicks into the retirement/residency cluster; suggestion: the Cuenca neighborhood guide (4th most-read article, 77 views/28d) is still not research-verified, so the newsletter can't feature it — Research Editor should take it next.
- 2026-10-24 auditor: fixed a misleading homepage ROI calculator (compounded unsourced 18%/yr appreciation; now sourced gross yields only) and quiz growth/yield figures, removed unsourced numbers from 68 landing pages, 13 bylines to Charles Brossy, canonical sitemap URLs; all signup forms tested working on the top 5 pages (desktop + phone); metric: trust and signups on the homepage/quiz; blocker: 0 signups since Oct 18 although every form works, so conversion is an offer/traffic problem, not a bug. Research Editor should verify the Cuenca neighborhood guide (5th most-read, no Sources).
- 2026-10-23 growth: shipped Punta Cana investment guide (first IDEAS item, ≈600 impressions/28d with no indexable page), Costa Rica property-tax quick-read, CONFOTUR tip (all checker-verified; Punta Cana yield updated to GPG Q3 2026 9.07%, CONFOTUR IPI limited to first individual buyers), research-verified santiago-supply-squeeze (25 fixes: peso weakened ~14%, not +7%; copper ~23% not a third), Santiago city guide researched, FAQs on 2 Airbnb quick-reads, fixed false "10-year CONFOTUR" claim on the DR overview; metric: Punta Cana search impressions → clicks; suggestion: blog/dominican-republic-real-estate-2026.html is unverified and still claims 8–14% yields, 27% capital gains (now 10% under Law 30-26) and an outdated residency menu — give it to the Research Editor next.
- 2026-10-23 research: verified retire-in-costa-rica (brief's top Search Console page) and the auditor-flagged Cartagena and Playa del Carmen vs Miami tips, 36 corrections + 31 removals, all checker-verified; biggest fixes: Miami Beach baseline is ~$6,800/m² (Redfin), not $11–13k, so gaps are ~40%/~60% not 68%/70%; no source for 8–12% yields; rentista $60k deposit route abolished in 2023 (fixed on 3 more CR pages). Should lift CR retirement page quality for its 185 impressions. Suggestion: cost-of-living-costa-rica-expats-2026 has no Sources and other CR pages still quote unsourced CCSS rates — queue them.
- 2026-10-22 growth: shipped Ecuador pensioner-visa quick-read and Panama Pensionado $750 tip (retirement cluster, both checker-verified, linked from retire-in-ecuador/retire-in-panama/cuenca-vs-medellín/pensionado guide); Thursday strengthen rewrote the Tbilisi post (its headline '1% tax on rent' was false: rent is 5%) and research-verified Punta del Este (it claimed zero capital gains tax: it is 12%); São Paulo city guide researched; FAQs on 2 pages; metric: retirement-cluster impressions + fewer false claims on indexed pages; suggestion: the Punta Cana guide (first IDEAS item) is still unwritten — Friday/Monday run should take it.
- 2026-10-22 design: 11 retirement/cost-of-living articles moved onto the standard header+footer (they showed an unstyled logo and no phone menu); exit-intent modal no longer stacks with the sticky bar, fits phones and drops its 210 KB photo there; city hubs lose ~250px gaps and 0.5–0.9 MB of hero image on phones; Starter Kit page 1.04 MB → 0.29 MB on phones; metric: signup rate and bounce on the retirement cluster; suggestion: Growth Engine should emit srcset on article heroes (templates/blog-post.html {{HERO_IMAGE}}), and retire-in-argentina's byline still says 'International RE'.
- 2026-10-21 growth: shipped Cuenca-vs-Medellín retiree comparison, Mexico temporary-residency income quick-read (current UMA rule), Colombia pension-visa tip (all checker-verified), research-verified panama-vs-costa-rica (29 corrections, 25 removals), Tulum city guide researched, FAQs on 2 guides, retirement-cluster links to retire-in-costa-rica; metric: retirement-cluster search visits + signups; suggestion: blog/best-places-retire-mexico-2026.html still quotes Washington's old minimum-wage figures (MXN 83,640) as the rule — the official July 2025 Lineamientos use 680 UMA days (~MXN 79,771); Research Editor should align it.
- 2026-10-21 owner's session: Search Console exported to docs/search-console/2026-10-21.md (4 clicks, 1,980 impressions, avg position 25.9, 181 pages indexed). Ask the owner's session for a fresh export when this one is over a week old.
- 2026-10-21 market: refreshed headline stats for Medellín, Cartagena, San José, Guanacaste, Mexico City, Playa del Carmen (checker-confirmed, every stat sourced on the guide); removed unsupported Guanacaste 9–11% and Playa 7–10% yields and cut Cartagena's yield to GPG's 5.2%; metric: trust and dwell time on city guides; suggestion: Research Editor should fix the Cartagena-beachfront and Mexico-City-$4,200 tips, which now contradict the guides (list in docs/cto-reports/2026-10-21-market.md).
- 2026-10-21 research: verified retire-in-ecuador (top retirement-cluster page), medellin-property-vs-miami tip and the Apr 14–18 weekly, 50 corrections, all checker-verified; biggest fixes: Ecuador "security improving" reversed (2025 record homicides), Ecuador foreign-income tax, Medellín "93% below Miami" → ~60%, weekly's false CR "$200K residency" claim; metric: retirement-cluster search visits and trust; suggestion: reports/2026-global-investment-report.html is still unverified and outside the queue, and latam-weekly-apr-21-25 still has unsourced claims (next in queue).
- 2026-10-20 owner's session: visitor counter now excludes fake-browser scrapers; first distribution kit (5 fact-checked pages) is on the dashboard for the owner to post — watch for reddit/forum referrers in traffic.topSources.
- 2026-10-20 owner's session: homepage hero now signs visitors up in one step (email field + what the kit contains) instead of a button to /free-guide.html; source tag 'homepage-hero' — compare its signups and the homepage conversion rate next Monday.
- 2026-10-20 growth: shipped Peru buying guide, Cuenca cost-of-living quick-read, Costa Rica pensionado tip (all checker-verified, topic-matched Starter Kit callout after the first answer), research-verified June market update, Montevideo city guide; fixed Ecuador retiree-visa threshold ($500 -> $1,446, 3 SBU) on retire-in-ecuador and Quito pages and 9 'International RE Research' bylines; metric: search visits to retirement cluster + signups; suggestion: retire-in-ecuador is a top-cluster page still unverified (rentista/investor amounts, costs) - give it to the Research Editor next.
