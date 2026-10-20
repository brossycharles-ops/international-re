# How internationalre.org runs

Everything below runs without the owner's computer. The Mac is only needed for
local development.

## Schedule (New York time)

| When | What | Runs on |
|---|---|---|
| Sunday 22:00 (Mon 02:00 UTC) | **Growth Director** (team lead, marketing): measures traffic, search visits, signups and conversion per page (`/api/status` → `growth`), does hands-on conversion/click-through/internal-link work, writes the distribution kit and outreach drafts for the owner, and briefs every agent with targets in `docs/TEAM.md` (agents read their brief via PLAYBOOK rule 0 and report back there); report in `docs/growth/<date>.md` | Anthropic cloud routine |
| Mon, Wed, Fri 0:00 | **Research Editor**: fact-checks 3 existing articles per run against official sources with an independent checker subagent, adds Sources/FAQs, corrects or removes unverifiable claims, logs them in `data/research-ledger.json`, link-checks citations; then re-verifies the stalest pages forever (every 90 days) | Anthropic cloud routine |
| Tue & Sat 6:00 | **Cloud Site Auditor** (the free daily GitHub checks below cover the mechanical part every day): checks every live page, images, SEO, security, cross-page contradictions; 3 workers fix what they find — content fixes go straight to main after the gate passes, code fixes go to a PR; flags pages for the Research Editor; writes `docs/cto-reports/<date>.md` | Anthropic cloud routine |
| Daily 10:00 & 15:00 | **Email schedule**: welcome/drip sequence and the Monday newsletter | Railway server (`server.js`) |
| Weekdays 13:00 | **Cloud Growth Engine**: publishes the day's content (each page fact-checked by an independent subagent), research-verifies one older page, FAQ and city queues, internal links, IndexNow | Anthropic cloud routine |
| Monday (first email run) | **Weekly owner report**: subscribers, growth, traffic, CSV backup to `BACKUP_EMAIL` | Railway server |
| Sunday 20:30 (Mon 00:30 UTC, just after the weekly usage reset) | **Strategy & CTO review**: reviews traffic, research quality and auditor PRs, re-checks the fact-checkers' work, updates `docs/PLAYBOOK.md` and `docs/IDEAS.md`, writes `docs/reports/weekly-<date>.md` | Anthropic cloud routine |
| Sunday 19:00 | **Newsletter Editor**: writes and fact-checks Monday's issue (`data/newsletters/<Monday>.json` + web version); the server emails it Monday 10:00 | Anthropic cloud routine |
| Wednesday 4:00 | **Market Data Refresher**: refreshes price/m², yields, cost of living for the 6 stalest city guides (`stats`, `statsSources`, `statsUpdated` in `data/cities.json`) | Anthropic cloud routine |
| Paused | **Distribution Kit** (paused to fit the Pro plan; re-enable at claude.ai/code/routines): ready-to-post X, LinkedIn, Pinterest and forum copy for the week's articles (`data/distribution/<date>.json`, shown on the dashboard with Copy buttons) | Anthropic cloud routine |
| Tuesday 9:00 | **Freshness Keeper**: rewrites passed deadlines, re-checks ageing figures on the most-read pages, replaces dead source links, fixes drifting site-wide counts and orphaned pages; handles the January retitling of year-stamped pages (`docs/freshness/<date>.md`) | Anthropic cloud routine |
| Thursday 9:00 | **Design Director**: full-page screenshots of every page type on desktop and phone plus speed metrics; ships the 3 highest-impact look/consistency/speed improvements in shared CSS and the article template (`docs/design/<date>.md`) | Anthropic cloud routine |
| Daily 5:20 | **Daily site checks**: the publish gate, passed-deadline claims and a real-browser visual audit of the live site (every sitemap URL on Sundays); opens/updates a "Daily checks failed" GitHub issue on failure, closes it when green (`.github/workflows/daily-checks.yml`) | GitHub Actions (free) |
| Every 30 min | **Uptime watchdog**: loads the homepage, status API and a city guide; opens a "Site down" GitHub issue (emailed to the owner) if they fail twice 2 minutes apart, closes it when back (`.github/workflows/uptime.yml`) | GitHub Actions (free) |

Usage budget: the account is on the Claude Pro plan, whose weekly allowance (resets Sunday 23:00 UTC) is shared by all routines and interactive sessions. In the week of 2026-10-12 it ran out on Saturday and every run stopped for 19 hours, so the schedule was cut to ~16 cloud runs a week, the most important ones early in the week, and mechanical checks moved to free GitHub Actions. Do not add Claude routines without removing others.

Live status for all agents: the Mission Control dashboard (Claude artifact, reads `/api/status`).

Routines are managed at https://claude.ai/code/routines.

## How content ships
1. The Growth Engine writes pages under `public/` and data under `data/`.
2. `scripts/verify_site.sh` must pass: server tests, links, JSON-LD, accessibility,
   approved images, the research standard (`scripts/content_quality.py`: new pages and
   every page in the research ledger need sources, FAQ, depth and clean metadata),
   sitemap, and a crawl of every sitemap URL on a local server.
3. It pushes to `main`; Railway deploys automatically.

Code changes (server.js, scripts/) from the auditor go through pull requests; content fixes ship directly once the gate passes.

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
| `BACKUP_EMAIL` | Weekly owner report + CSV backup; also receives contact-form messages unless `CONTACT_EMAIL` is set. |
| `CONTACT_EMAIL` (optional) | Where `/contact.html` messages go (Reply-To is the reader). There is no shared inbox — never publish an email address. |
| `PLAUSIBLE_API_KEY` (optional) | Use Plausible instead of the built-in counts in the weekly report (the Plausible trial has lapsed). |
| `DRIP_HOURS_UTC` (optional) | Email run hours, default `14,19`. `ENABLE_EMAIL_SCHEDULER=0` turns it off. |

## Recovery
- **Subscriber list lost:** take the latest weekly report CSV and restore it with
  `POST /api/admin/restore-subscribers` (admin key; sends no emails, keeps drip history).
- **Publishing stopped:** the auditor raises a P0 alert when `main` has no new pages for
  3+ days. Check the Growth Engine's run log at claude.ai/code/routines.
- **A bad change went live:** revert the commit on GitHub; Railway redeploys.
- **'Deployment crashed' emails right after a deploy:** the old copy didn't exit when Railway stopped it. server.js shutdown() must keep exiting 0 within 5 s (it drops Cloudflare's idle keep-alive connections).

## Local development
```
npm install
npm start          # http://localhost:3000
npm test           # full publish gate (server tests + site checks)
```
