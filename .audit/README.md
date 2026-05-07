# InternationalRE.org — Claude Code Audit & Growth System

A Claude Code workflow built specifically for **internationalre.org** — Charles's Latin American real estate advisory platform. This package audits formatting/visual issues, then drives a content + conversion engine to grow newsletter subscribers and advisory inquiries.

## What this does

1. **`audit.sh`** — One-shot full audit. HTML/CSS/JS validation, accessibility, SEO, broken links, visual screenshot diffing across breakpoints, performance.
2. **`prompts/`** — Reusable Claude Code prompt templates that maximize Pro account capacity (one prompt = one focused task, so you stay under context limits and can run many in parallel).
3. **`growth-engine.sh`** — Repeatable weekly workflow: research → newsletter draft → SEO blog post → social cuts → site updates → commit → PR.

## Setup (one-time, ~5 min)

```bash
# 1. Drop this folder at the repo root of internationalre.org
cd ~/path/to/internationalre.org
cp -r ~/Downloads/internationalre-audit ./.audit

# 2. Install audit deps (homebrew on macOS)
brew install node lighthouse linkchecker
npm i -g htmlhint stylelint pa11y broken-link-checker
npx playwright install chromium

# 3. Make scripts executable
chmod +x .audit/scripts/*.sh

# 4. Run from the repo root
.audit/scripts/audit.sh
```

## How to use with Claude Code (max-Pro workflow)

Open Claude Code in your repo and use the prompts in `prompts/` one at a time. Each prompt is scoped tight on purpose — Pro accounts get the most mileage when context windows aren't bloated. The order matters:

1. `01-audit-and-fix.md` — Run audit, fix issues found
2. `02-conversion-optimize.md` — Tune the signup forms, hero, CTAs
3. `03-seo-content-engine.md` — Spin up the weekly newsletter pipeline
4. `04-advisory-page.md` — Build the paid advisory landing + intake
5. `05-analytics-setup.md` — Wire up tracking so growth is measurable
6. `06-weekly-growth-loop.md` — The repeatable Monday morning prompt

## Files

```
.audit/
├── README.md                     ← you are here
├── scripts/
│   ├── audit.sh                  ← run the full audit
│   ├── visual-audit.js           ← Playwright screenshots × breakpoints
│   ├── seo-check.js              ← meta/schema/heading audit
│   └── growth-engine.sh          ← weekly content workflow
└── prompts/
    ├── 01-audit-and-fix.md
    ├── 02-conversion-optimize.md
    ├── 03-seo-content-engine.md
    ├── 04-advisory-page.md
    ├── 05-analytics-setup.md
    └── 06-weekly-growth-loop.md
```
