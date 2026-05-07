# Prompt 01 — Audit & Fix

**Use this with Claude Code immediately after `audit.sh` finishes.**

---

You are auditing **internationalre.org**, a static HTML real estate newsletter and advisory site. The audit results are in `.audit-results/<latest-timestamp>/`.

## Your task

Work through the audit findings in order of impact-to-effort. Don't fix everything blindly — explain trade-offs as you go.

### Step 1 — Read the audit reports

Read these files in this order:
1. `.audit-results/<latest>/seo/seo-report.json` — meta/heading issues
2. `.audit-results/<latest>/visual/findings.json` — overflow/tap/clip/console errors
3. `.audit-results/<latest>/html/htmlhint.json` — HTML validity
4. `.audit-results/<latest>/css/stylelint.json` — CSS issues
5. `.audit-results/<latest>/a11y/*.json` — accessibility violations
6. `.audit-results/<latest>/perf/lh_home.report.html` — performance scores
7. `.audit-results/<latest>/links/broken-only.txt` — broken links

### Step 2 — Group issues by severity & blast radius

Make a markdown table with columns: **Severity** (P0/P1/P2) | **Page** | **Issue** | **Fix approach** | **Estimated impact**.

Severity rules:
- **P0**: Anything breaking on mobile (overflow, tap targets), broken links to subscribe forms, console errors on the home page, missing meta description on home, accessibility errors blocking screen reader signup.
- **P1**: SEO issues on indexable pages (heading hierarchy, missing OG tags), Lighthouse score under 80 on home, CSS issues affecting layout.
- **P2**: Best-practice nits, decorative-image alts, perf wins under 200ms.

### Step 3 — Fix P0 and P1 only

Don't fix P2 yet. For each fix:
1. Show me the diff before applying.
2. Use surgical edits — only change what's needed for the issue.
3. After the batch, run a quick sanity check: re-read the affected file and confirm the fix is in place.

### Step 4 — Output

When done, give me:
- A summary table: issues found / fixed / deferred / why
- A `FIXES.md` file in repo root with what changed
- A list of P2 issues to revisit later

## Constraints

- This is a static HTML site. Don't introduce a build step or framework.
- Preserve the existing visual design — Charles built the brand. Fix layout bugs, don't restyle.
- The site uses Unsplash hero images. Don't replace image URLs.
- Subscribe forms are critical — if you touch them, manually verify the form action/endpoint is unchanged.
- Don't commit. Leave changes staged so I can review with `git diff`.
