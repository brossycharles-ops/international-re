# Team Playbook

Rules every agent follows. The Sunday Strategy & CTO review rewrites this file from
evidence (traffic, blocked runs, regressions). Keep it under 30 rules.
Last rewritten: 2026-10-26.

Goal: 500+ organic visitors/month, then grow; every visitor offered the Expat Starter Kit.

## Team channel
0. At the start of every run read `docs/TEAM.md`: the team targets and the Growth Director's brief for your role (`## Brief: <your id>` — growth, research, freshness, design, newsletter, market, auditor, review). Follow it unless it conflicts with an accuracy, honesty or safety rule. At the end of your run add one line under "Reports to the Growth Director": what you shipped, the metric it should move, and one blocker or suggestion. (The Growth Director restores this rule if it goes missing.)

## Accuracy and trust
1. Every statistic needs a source found that day, linked in a `Sources` section. Never invent numbers, quotes or people.
2. Be honest about risk: official travel advisories, title disputes, currency controls. Readers make large financial decisions.
3. Only promise what exists. The free offer is the Expat Starter Kit (`/guide/expat-starter-kit.html`): 17-city comparison, residency routes for 10 countries, 47-item checklist, 6-month timeline. Never claim page counts, audience sizes or "data packs".
4. Images only from `data/images.json`, with their alt text.
5. Byline is always Charles Brossy (the real owner). Never invent authors, analysts, residents, interviews, testimonials or first-hand experiences.
6. A page is "research-verified" only after every number, legal claim and date is checked against a primary or authoritative source and logged in `data/research-ledger.json`. `scripts/content_quality.py` then holds it to the full standard forever.
7. Tax and visa figures come from the law, decree or government portal (La Gaceta, Panamá Digital, SAT, DGI, Hacienda), not from law-firm or relocation blogs; blogs may only point you to the primary source. The headline claim of a page (its title number) gets a second, independent check — false headlines found in October: Tbilisi "1% tax" (5%), Punta del Este "no capital gains tax" (12%), CONFOTUR "10 years" (15, first buyers only).
8. Never present projected appreciation or "total return" as a figure; quote sourced gross yields and say what they exclude (the ROI calculator compounded an unsourced 18%/yr until 2026-10-24).
9. When a rule changes (e.g. Uruguay Law 20.446 tax-residency thresholds from 2026-01-01), grep `public/` for every page that states the old rule and fix or queue them all in the same run.

## Content that ranks
10. One page = one specific long-tail query a foreign buyer actually types. Put it in the title (≤60 chars), H1, first 100 words and meta description (140–160 chars).
11. Answer the question in the first paragraph; depth after.
12. Every page ends with 3 FAQs plus FAQPage JSON-LD.
13. Prefer refreshing an outdated page over writing a near-duplicate; check `ls public/*/` before writing.
14. Traffic evidence (weeks of Oct 20 and Oct 26): retirement pages (Latin America, Mexico), Medellín, Cuenca/Ecuador and Costa Rica buying are what people read. Spend most new pages on retirement visas, cost of living and buying rules in those clusters; second, under-covered markets (Ecuador buying, Nicaragua, Brazil, Peru).
15. Verify the most-read pages before anything else: a top-10 page (`/api/stats/summary`) must never be unverified.
16. Each new page links to 3 related pages and its city guide, and is linked from at least 2 existing pages, at least one of them a top-10 page.

## Conversion
17. There is no shared inbox: never tell readers to email us or to reply to an email. Point them to `/contact.html` (it emails the owner).
18. Signup forms ask for email only (first name optional). Never add required fields.
19. Each article has one natural, topic-matched Starter Kit call to action after the first answer section — not more.
20. The newsletter ends with a one-line forward-to-a-friend ask.

## Engineering
21. Never add a third-party service that needs an account, key or paid plan. Prefer files served from this site.
22. When you change a .js or .css file, bump the ?v= query on every page that links it, including the templates and `scripts/generate_city_hubs.py`.
23. A statistic repeated across pages must be sourced on at least one of them; never copy a number from another page of this site without checking its source.
24. City guides are generated from `data/cities.json` by `scripts/generate_city_hubs.py`; edit the data, not the HTML.
25. Nothing ships unless `bash scripts/verify_site.sh` prints PASS. Tests wait for the server to answer; never use fixed sleeps.
26. Never touch `SUBSCRIBERS_FILE` handling, `data/subscribers.json`, or delete pages.
27. Google/Bing sitemap pings are dead; IndexNow covers Bing/Yandex. The sitemap lists canonical URLs (`/`, `/cities/<slug>/`), never `index.html`.
28. Traffic counts can be polluted by scrapers (a /contact.html spike is the tell). Report search-engine referrals separately and judge growth by them.
