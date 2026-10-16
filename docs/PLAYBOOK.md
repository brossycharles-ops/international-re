# Team Playbook

Rules every agent follows. The Sunday Strategy & CTO review rewrites this file from
evidence (traffic, blocked runs, regressions). Keep it under 30 rules.

Goal: 500+ organic visitors/month, then grow; every visitor offered the Expat Starter Kit.

## Accuracy and trust
1. Every statistic needs a source found that day, linked in a `Sources` section. Never invent numbers, quotes or people.
2. Be honest about risk: official travel advisories, title disputes, currency controls. Readers make large financial decisions.
3. Only promise what exists. The free offer is the Expat Starter Kit (`/guide/expat-starter-kit.html`): 17-city comparison, residency routes for 10 countries, 47-item checklist, 6-month timeline. Never claim page counts, audience sizes or "data packs".
4. Images only from `data/images.json`, with their alt text.
5. Byline is always Charles Brossy (the real owner). Never invent authors, analysts, residents, interviews, testimonials or first-hand experiences — nine fake bylines were removed on 2026-10-16.
6. A page is "research-verified" only after every number, legal claim and date is checked against a primary or authoritative source and logged in `data/research-ledger.json`. `scripts/content_quality.py` then holds it to the full standard forever.

## Content that ranks
7. One page = one specific long-tail query a foreign buyer actually types. Put it in the title (≤60 chars), H1, first 100 words and meta description (140–160 chars).
8. Answer the question in the first paragraph; depth after.
9. Every page ends with 3 FAQs plus FAQPage JSON-LD.
10. Prefer refreshing an outdated page over writing a near-duplicate.
11. Rotate the 11 markets; favour under-covered ones (check `ls public/*/`).
12. Each new page links to 3 related pages and its city guide, and is linked from at least 2 existing pages.

## Conversion
13. There is no shared inbox: never tell readers to email us or to reply to an email. Point them to `/contact.html` (it emails the owner).
14. Signup forms ask for email only (first name optional). Never add required fields.
15. Each article has one natural Starter Kit or newsletter call to action — not more.
16. The newsletter ends with a one-line forward-to-a-friend ask.

## Engineering
17. Never add a third-party service that needs an account, key or paid plan (the CARTO map tiles broke this way). Prefer files served from this site.
18. When you change a .js or .css file, bump the ?v= query on every page that links it — Cloudflare and browsers cache those files.
19. A statistic repeated across pages must be sourced on at least one of them; never copy a number from another page of this site without checking its source.
20. City guides are generated from `data/cities.json` by `scripts/generate_city_hubs.py`; edit the data, not the HTML.
21. Nothing ships unless `bash scripts/verify_site.sh` prints PASS.
22. Never touch `SUBSCRIBERS_FILE` handling, `data/subscribers.json`, or delete pages.
23. Google/Bing sitemap pings are dead; IndexNow covers Bing/Yandex.
