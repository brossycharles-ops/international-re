#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# CATCHUP AGENT — missed tasks Apr 16-20
# Uses the same lean prompts as the updated growth-agent.sh
# ═══════════════════════════════════════════════════════════════

export PATH="/Users/charlesbrossy/.local/bin:/Users/charlesbrossy/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

PROJECT_DIR="/Users/charlesbrossy/Desktop/my-project/Claude Newsletter"
LOG_FILE="$PROJECT_DIR/catchup-agent.log"
CLAUDE="/Users/charlesbrossy/.local/bin/claude -p --dangerously-skip-permissions"

cd "$PROJECT_DIR" || exit 1

log() { echo "$1" >> "$LOG_FILE"; }

log ""
log "═══════════════════════════════════════════"
log "CATCHUP AGENT STARTED: $(date)"
log "═══════════════════════════════════════════"

# Auth check
if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
  open -a "Claude" 2>/dev/null
  sleep 30
  if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
    log "[ERROR] Claude CLI not authenticated. Aborting."
    exit 1
  fi
fi
log "[OK] Claude CLI ready."

run_task() {
  local label="$1"
  local prompt="$2"
  log ""
  log "── $label ──────────────────────────────────"
  $CLAUDE "$prompt" >> "$LOG_FILE" 2>&1
  if [ $? -eq 0 ]; then log "[OK] Done."; else log "[ERROR] Failed."; fi
}

# ── THU APR 16: SEO improvement ─────────────────────────────
run_task "Thu Apr 16 — SEO improvement" \
"SEO specialist for International RE (internationalre.org).

TASK: Improve the weakest existing page.
- Run: ls public/blog/ public/guides/ to see all pages.
- Read the two oldest or shortest files (check file sizes or dates in filenames).
- For the weakest one: add 150-200 words of updated data (web search for a current stat), improve the meta description, and add 2-3 internal links to other pages on the site.
- git add -A && git commit -m 'SEO: improve [filename]' && git push"

# ── THU APR 16: quick-read (odd day) ────────────────────────
run_task "Thu Apr 16 — Quick-read" \
"SEO writer for International RE (internationalre.org).

TASK: Create one short quick-read page (250-400 words) in public/quick-reads/.
- Run: ls public/quick-reads/ to see existing topics. Pick a NEW long-tail keyword not covered.
  Good targets: 'Airbnb income in [city]', 'property tax rate in [country]', 'how long to buy property in [country]', 'cost of living in [city] per month 2026'.
- Web search for one real current stat to anchor the page.
- Write a short focused HTML page (same structure as public/quick-reads/best-neighborhoods-medellin-for-expats.html: nav, short article, subscribe CTA, footer). Publish date: 2026-04-16.
- Add to public/sitemap.xml with lastmod 2026-04-16.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"

# ── FRI APR 17: blog post ────────────────────────────────────
run_task "Fri Apr 17 — Blog post" \
"Content writer for International RE (internationalre.org).

TASK: Write one blog post in public/blog/ dated April 17, 2026.
- Run: ls public/blog/ and read the filenames of the last 2 posts to see recent market and writer.
- Next writer rotation: Sofia Mendez → James Whitfield → Carolina Vega → repeat.
- Pick a market NOT in the last 2 posts (Costa Rica, Nicaragua, Argentina, Chile).
- Web search for 3-5 real current data points (price/sqm, rental yield, one notable development).
- Write a 700-900 word HTML post matching public/blog/guanacaste-hottest-market-2026.html structure (nav, Unsplash hero, article, subscribe banner, footer). Publish date: April 17, 2026.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod 2026-04-17.
- git add -A && git commit -m 'Add blog: [title]' && git push"

# ── FRI APR 17: social tip (even day) ───────────────────────
run_task "Fri Apr 17 — Social tip" \
"Social media writer for International RE (internationalre.org).

TASK: Create one short tip/stat page (150-250 words) in public/tips/.
- Run: ls public/tips/ to see existing tips. Pick a NEW punchy stat not yet covered.
  Examples: a surprising price comparison, a tax advantage, a legal right for foreign buyers.
- Web search to verify the stat is real and current.
- Write a short HTML page (same nav/footer as public/tips/medellin-property-vs-miami.html). Title must work as a tweet (under 200 chars). Publish date: April 17, 2026.
- Add to public/sitemap.xml with lastmod 2026-04-17.
- git add -A && git commit -m 'Add tip: [stat]' && git push"

# ── SAT APR 18: news roundup ─────────────────────────────────
run_task "Sat Apr 18 — Weekly news roundup" \
"Content writer for International RE (internationalre.org).

TASK: Create a weekly Latin America real estate news roundup blog post.
- Web search for 4-5 real recent news items about real estate across Costa Rica, Nicaragua, Argentina, Chile from the week of April 14-18, 2026.
- Write a 500-700 word HTML post in public/blog/ titled 'Latin America Real Estate Weekly — April 14-18, 2026'. Same structure as existing blog posts (nav, hero from Unsplash, article, subscribe banner, footer). Publish date: April 18, 2026.
- Update public/blog.html to feature this roundup.
- Add to public/sitemap.xml with lastmod 2026-04-18.
- git add -A && git commit -m 'Add weekly roundup: Apr 14-18' && git push"

# ── SAT APR 18: quick-read (odd day) ────────────────────────
run_task "Sat Apr 18 — Quick-read" \
"SEO writer for International RE (internationalre.org).

TASK: Create one short quick-read page (250-400 words) in public/quick-reads/.
- Run: ls public/quick-reads/ to see existing topics. Pick a NEW long-tail keyword not covered.
  Good targets: property taxes, residency rules, buying process timeline, or rental income expectations in a specific Latin American country or city.
- Web search for one real current stat.
- Write a short focused HTML page. Publish date: April 18, 2026.
- Add to public/sitemap.xml with lastmod 2026-04-18.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"

# ── SUN APR 19: content refresh ──────────────────────────────
run_task "Sun Apr 19 — Content refresh" \
"Content specialist for International RE (internationalre.org).

TASK: Refresh the single oldest page on the site.
- Run: ls -lt public/blog/ public/guides/ | tail -5 to find the oldest files.
- Pick the oldest one. Web search for one or two current updates for that topic (April 2026 data).
- Add 100-150 words of fresh data, update the 'Updated' date to April 19, 2026, and add one internal link to a newer page.
- git add -A && git commit -m 'Refresh: update [filename] with April 2026 data' && git push"

# ── SUN APR 19: social tip (even day) ───────────────────────
run_task "Sun Apr 19 — Social tip" \
"Social media writer for International RE (internationalre.org).

TASK: Create one short tip/stat page (150-250 words) in public/tips/.
- Run: ls public/tips/ to see existing tips. Pick a NEW stat for a market not yet featured.
- Web search to verify the stat is real and current.
- Write a short HTML page matching existing tips style. Title under 200 chars. Publish date: April 19, 2026.
- Add to public/sitemap.xml with lastmod 2026-04-19.
- git add -A && git commit -m 'Add tip: [stat]' && git push"

# ── MON APR 20: weekly featured blog (generate-blog equivalent) ─
run_task "Mon Apr 20 — Weekly featured blog" \
"Content writer for International RE (internationalre.org).

TASK: Write the weekly featured blog post dated April 20, 2026.
- Run: ls public/blog/ and read the last 2 blog post filenames to find recent market and writer.
- Next writer rotation: Sofia Mendez → James Whitfield → Carolina Vega → repeat.
- Pick a market NOT in the last 2 posts (Costa Rica, Nicaragua, Argentina, Chile).
- Web search for 3-5 real current data points.
- Write a 700-900 word HTML post matching public/blog/guanacaste-hottest-market-2026.html (nav, Unsplash hero, article, subscribe banner, footer). Publish date: April 20, 2026.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod 2026-04-20.
- git add -A && git commit -m 'Add weekly blog: [title]' && git push"

# ── MON APR 20: location guide ───────────────────────────────
run_task "Mon Apr 20 — Location guide" \
"Content writer for International RE (internationalre.org).

TASK: Create one new location guide in public/guides/.
- Run: ls public/guides/ public/blog/ to see existing topics. Do NOT duplicate.
- Pick one not yet covered: neighborhood guide, cost-of-living, or rental-yield page for a specific city in Costa Rica, Nicaragua, Argentina, or Chile.
- Web search for 3-5 real current data points (price/sqm, rental yield, one recent development).
- Write a focused 600-800 word HTML guide matching public/guides/can-foreigners-buy-property-costa-rica.html structure (nav, Unsplash hero, article, subscribe banner, footer). Publish date: April 20, 2026.
- Add to public/sitemap.xml with lastmod 2026-04-20.
- git add -A && git commit -m 'Add guide: [title]' && git push"

# ── MON APR 20: quick-read (odd day) ────────────────────────
run_task "Mon Apr 20 — Quick-read" \
"SEO writer for International RE (internationalre.org).

TASK: Create one short quick-read page (250-400 words) in public/quick-reads/.
- Run: ls public/quick-reads/ to see existing topics. Pick a NEW long-tail keyword not covered.
- Web search for one real current stat.
- Write a short focused HTML page. Publish date: April 20, 2026.
- Add to public/sitemap.xml with lastmod 2026-04-20.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"

# ── Final sitemap ping ───────────────────────────────────────
log ""
log "── Pinging search engines..."
curl -s "https://www.google.com/ping?sitemap=https://www.internationalre.org/sitemap.xml" > /dev/null 2>&1
curl -s "https://www.bing.com/ping?sitemap=https://www.internationalre.org/sitemap.xml" > /dev/null 2>&1
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{"host":"www.internationalre.org","key":"internationalre","urlList":["https://www.internationalre.org"]}' > /dev/null 2>&1
log "  Done."

log ""
log "CATCHUP COMPLETED: $(date)"
log "═══════════════════════════════════════════"
