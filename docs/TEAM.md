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
- Spend this week's new pages on the retirement cluster (Mexico, Ecuador, Costa Rica, Panama, Colombia retirement costs/visas) and Costa Rica buying — the topics people already read.
- Every new page: a topic-matched Starter Kit call to action after the first answer section, not only at the end.
- Link each new page from the top-traffic pages listed in /api/status `traffic.topPages`.

## Brief: research
- First: blog/retire-in-ecuador-2026.html (top retirement-cluster page, never verified; the Growth Engine already corrected its retiree-visa income threshold to $1,446 on Oct 20 — verify the rentista/investor amounts and living costs).
- Then: tips/medellin-property-vs-miami.html — indexed by Google with the headline claim '$1,200/sqm, 93% below Miami', never verified and no Sources section; the verified Medellín article uses different figures. Verify both numbers or rewrite the tip around sourced ones.
- When the queue allows: reports/2026-global-investment-report.html — indexed, figures for 11 markets, never verified (it sits outside content_quality.py's sections, so the queue never offers it).
- Verify the most-read pages first (traffic.topPages), starting with blog/best-places-retire-latin-america-2026.html and blog/best-places-retire-mexico-2026.html if not verified in the last 30 days: traffic pages must be the most accurate.

## Brief: freshness
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
- 2026-10-21 research: verified retire-in-ecuador (top retirement-cluster page), medellin-property-vs-miami tip and the Apr 14–18 weekly, 50 corrections, all checker-verified; biggest fixes: Ecuador "security improving" reversed (2025 record homicides), Ecuador foreign-income tax, Medellín "93% below Miami" → ~60%, weekly's false CR "$200K residency" claim; metric: retirement-cluster search visits and trust; suggestion: reports/2026-global-investment-report.html is still unverified and outside the queue, and latam-weekly-apr-21-25 still has unsourced claims (next in queue).
- 2026-10-20 owner's session: visitor counter now excludes fake-browser scrapers; first distribution kit (5 fact-checked pages) is on the dashboard for the owner to post — watch for reddit/forum referrers in traffic.topSources.
- 2026-10-20 owner's session: homepage hero now signs visitors up in one step (email field + what the kit contains) instead of a button to /free-guide.html; source tag 'homepage-hero' — compare its signups and the homepage conversion rate next Monday.
- 2026-10-20 growth: shipped Peru buying guide, Cuenca cost-of-living quick-read, Costa Rica pensionado tip (all checker-verified, topic-matched Starter Kit callout after the first answer), research-verified June market update, Montevideo city guide; fixed Ecuador retiree-visa threshold ($500 -> $1,446, 3 SBU) on retire-in-ecuador and Quito pages and 9 'International RE Research' bylines; metric: search visits to retirement cluster + signups; suggestion: retire-in-ecuador is a top-cluster page still unverified (rentista/investor amounts, costs) - give it to the Research Editor next.
