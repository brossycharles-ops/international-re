# How internationalre.org runs

Everything below runs without the owner's computer. The Mac is only needed for
local development.

## Schedule (New York time)

| When | What | Runs on |
|---|---|---|
| Daily 0:00 & 17:00 | **Research Editor**: fact-checks 3 existing articles per run against official sources with an independent checker subagent, adds Sources/FAQs, corrects or removes unverifiable claims, logs them in `data/research-ledger.json`, link-checks citations; then re-verifies the stalest pages forever (every 90 days) | Anthropic cloud routine |
| Daily 6:00 | **Cloud Site Auditor**: checks every live page, images, SEO, security; 3 workers open fix PRs; writes `docs/cto-reports/<date>.md` | Anthropic cloud routine |
| Daily 10:00 & 15:00 | **Email schedule**: welcome/drip sequence and the Monday newsletter | Railway server (`server.js`) |
| Daily 13:00 | **Cloud Growth Engine**: publishes the day's content (each page fact-checked by an independent subagent), research-verifies one older page, FAQ and city queues, internal links, IndexNow | Anthropic cloud routine |
| Monday (first email run) | **Weekly owner report**: subscribers, growth, traffic, CSV backup to `BACKUP_EMAIL` | Railway server |
| Sunday 15:00 | **Strategy & CTO review**: reviews traffic, research quality and auditor PRs, re-checks the fact-checkers' work, updates `docs/PLAYBOOK.md` and `docs/IDEAS.md`, writes `docs/reports/weekly-<date>.md` | Anthropic cloud routine |

Routines are managed at https://claude.ai/code/routines.

## How content ships
1. The Growth Engine writes pages under `public/` and data under `data/`.
2. `scripts/verify_site.sh` must pass: server tests, links, JSON-LD, accessibility,
   approved images, the research standard (`scripts/content_quality.py`: new pages and
   every page in the research ledger need sources, FAQ, depth and clean metadata),
   sitemap, and a crawl of every sitemap URL on a local server.
3. It pushes to `main`; Railway deploys automatically.

Code changes from the auditor's workers go through pull requests that a human merges.

## Key files
- `data/images.json` — the only photos pages may use (location-verified).
- `data/cities.json` — source for the 17 city guides (`scripts/generate_city_hubs.py`
  renders them; never edit `public/cities/*` by hand).
- `data/newsletters/<YYYY-MM-DD>.json` — newsletter issues; the server emails the newest
  one dated within 3 days, once per subscriber.
- `docs/PLAYBOOK.md` — rules every agent follows. `docs/IDEAS.md` — topic queue.
- `data/research-ledger.json` — which articles were fact-checked, when, and what was corrected.
  `docs/QUALITY.md` — scorecard of every article (`python3 scripts/content_quality.py --report`).
- Traffic: the server counts cookieless visits itself (`/data/traffic.json`); aggregate
  numbers at `/api/stats/summary`.

## Server environment (Railway variables)
| Variable | Purpose |
|---|---|
| `SUBSCRIBERS_FILE=/data/subscribers.json` | Subscriber list on the persistent volume. **Never remove** — without it every deploy wipes the list. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email sending (domain `internationalre.org` is verified in Resend). |
| `ADMIN_KEY` | Admin endpoints. |
| `BACKUP_EMAIL` | Weekly owner report + CSV backup. |
| `PLAUSIBLE_API_KEY` (optional) | Use Plausible instead of the built-in counts in the weekly report (the Plausible trial has lapsed). |
| `DRIP_HOURS_UTC` (optional) | Email run hours, default `14,19`. `ENABLE_EMAIL_SCHEDULER=0` turns it off. |

## Recovery
- **Subscriber list lost:** take the latest weekly report CSV and restore it with
  `POST /api/admin/restore-subscribers` (admin key; sends no emails, keeps drip history).
- **Publishing stopped:** the auditor raises a P0 alert when `main` has no new pages for
  3+ days. Check the Growth Engine's run log at claude.ai/code/routines.
- **A bad change went live:** revert the commit on GitHub; Railway redeploys.

## Local development
```
npm install
npm start          # http://localhost:3000
npm test           # full publish gate (server tests + site checks)
```
