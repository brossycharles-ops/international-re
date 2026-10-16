# Team Playbook

Rules every agent follows. The Sunday Strategy & CTO review rewrites this file from
evidence (traffic, blocked runs, regressions). Keep it under 30 rules.

Goal: 500+ organic visitors/month, then grow; every visitor offered the Expat Starter Kit.

## Accuracy and trust
1. Every statistic needs a source found that day, linked in a `Sources` section. Never invent numbers, quotes or people.
2. Be honest about risk: official travel advisories, title disputes, currency controls. Readers make large financial decisions.
3. Only promise what exists. The free offer is the Expat Starter Kit (`/guide/expat-starter-kit.html`): 17-city comparison, residency routes for 10 countries, 47-item checklist, 6-month timeline. Never claim page counts, audience sizes or "data packs".
4. Images only from `data/images.json`, with their alt text.

## Content that ranks
5. One page = one specific long-tail query a foreign buyer actually types. Put it in the title (≤60 chars), H1, first 100 words and meta description (140–160 chars).
6. Answer the question in the first paragraph; depth after.
7. Every page ends with 3 FAQs plus FAQPage JSON-LD.
8. Prefer refreshing an outdated page over writing a near-duplicate.
9. Rotate the 11 markets; favour under-covered ones (check `ls public/*/`).
10. Each new page links to 3 related pages and its city guide, and is linked from at least 2 existing pages.

## Conversion
11. Signup forms ask for email only (first name optional). Never add required fields.
12. Each article has one natural Starter Kit or newsletter call to action — not more.
13. The newsletter ends with a one-line forward-to-a-friend ask.

## Engineering
14. City guides are generated from `data/cities.json` by `scripts/generate_city_hubs.py`; edit the data, not the HTML.
15. Nothing ships unless `bash scripts/verify_site.sh` prints PASS.
16. Never touch `SUBSCRIBERS_FILE` handling, `data/subscribers.json`, or delete pages.
17. Google/Bing sitemap pings are dead; IndexNow covers Bing/Yandex.
