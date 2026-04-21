#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# CATCHUP AGENT — remaining tasks only
# Completed: Thu Apr 16 (SEO + quick-read), Fri Apr 17 (blog + tip)
# Remaining: Sat Apr 18, Sun Apr 19, Mon Apr 20
# ═══════════════════════════════════════════════════════════════

export PATH="/Users/charlesbrossy/.local/bin:/Users/charlesbrossy/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

PROJECT_DIR="/Users/charlesbrossy/Desktop/my-project/Claude Newsletter"
LOG_FILE="$PROJECT_DIR/catchup-agent.log"
CLAUDE="/Users/charlesbrossy/.local/bin/claude -p --dangerously-skip-permissions"

cd "$PROJECT_DIR" || exit 1
log() { echo "$1" >> "$LOG_FILE"; }

log ""
log "═══════════════════════════════════════════"
log "CATCHUP (remaining): $(date)"
log "═══════════════════════════════════════════"

if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
  open -a "Claude" 2>/dev/null; sleep 30
  if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
    log "[ERROR] Claude not authenticated. Aborting."; exit 1
  fi
fi
log "[OK] Claude ready."

run() {
  local label="$1"; local prompt="$2"
  log ""; log "── $label"
  $CLAUDE "$prompt" >> "$LOG_FILE" 2>&1
  [ $? -eq 0 ] && log "[OK]" || log "[FAIL]"
}

run "Sat Apr 18 — news roundup" \
"Content writer for International RE (internationalre.org).
TASK: Create a weekly Latin America real estate news roundup post.
- Web search for 4-5 real recent news items about real estate across Costa Rica, Nicaragua, Argentina, Chile from mid-April 2026.
- Write a 500-700 word HTML post in public/blog/ titled 'Latin America Real Estate Weekly — April 14-18, 2026'. Same structure as existing posts (nav, Unsplash hero, article, subscribe banner, footer). Publish date: 2026-04-18.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod 2026-04-18.
- git add -A && git commit -m 'Add weekly roundup: Apr 14-18, 2026' && git push"

run "Sat Apr 18 — social tip" \
"Social media writer for International RE (internationalre.org).
TASK: Create one short tip/stat page (150-250 words) in public/tips/.
- Run: ls public/tips/ — pick a NEW stat not yet covered there.
- Web search to confirm the stat is real and current.
- Write a short HTML page (same structure as public/tips/medellin-property-vs-miami.html). Title under 200 chars. Publish date: 2026-04-18.
- Add to public/sitemap.xml with lastmod 2026-04-18.
- git add -A && git commit -m 'Add tip: [stat]' && git push"

run "Sun Apr 19 — content refresh" \
"Content specialist for International RE (internationalre.org).
TASK: Refresh the single oldest page on the site with current data.
- Run: ls -lt public/blog/ public/guides/ | tail -6 to find the oldest files.
- Pick the oldest. Read it. Web search for one or two updates for that topic as of April 2026.
- Add 100-150 words of fresh data, update the 'Updated' date to 2026-04-19, add one internal link to a recently created page.
- git add -A && git commit -m 'Refresh: [filename] with April 2026 data' && git push"

run "Sun Apr 19 — quick-read" \
"SEO writer for International RE (internationalre.org).
TASK: Create one short quick-read page (250-400 words) in public/quick-reads/.
- Run: ls public/quick-reads/ — pick a NEW long-tail keyword not yet covered.
  Good targets: cost of living breakdown, property buying timeline, rental income expectations in a specific city.
- Web search for one real current stat to anchor the page.
- Write a short focused HTML page (same structure as existing quick-reads: nav, short article, subscribe CTA, footer). Publish date: 2026-04-19.
- Add to public/sitemap.xml with lastmod 2026-04-19.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"

run "Mon Apr 20 — weekly blog" \
"Content writer for International RE (internationalre.org).
TASK: Write the weekly featured blog post dated April 20, 2026.
- Run: ls public/blog/ — check the last 2 filenames for recent market and writer.
- Next writer rotation: Sofia Mendez → James Whitfield → Carolina Vega → repeat.
- Pick a market NOT in the last 2 posts: Costa Rica, Nicaragua, Argentina, Chile.
- Web search for 3-5 real current data points (price/sqm, rental yield, one notable development).
- Write a 700-900 word HTML post matching public/blog/guanacaste-hottest-market-2026.html (nav, Unsplash hero, article, subscribe banner, footer). Publish date: 2026-04-20.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod 2026-04-20.
- git add -A && git commit -m 'Add weekly blog: [title]' && git push"

run "Mon Apr 20 — quick-read" \
"SEO writer for International RE (internationalre.org).
TASK: Create one short quick-read page (250-400 words) in public/quick-reads/.
- Run: ls public/quick-reads/ — pick a NEW long-tail keyword not yet covered.
- Web search for one real current stat.
- Write a short focused HTML page. Publish date: 2026-04-20.
- Add to public/sitemap.xml with lastmod 2026-04-20.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"

log ""; log "── Final pings..."
curl -s "https://www.google.com/ping?sitemap=https://www.internationalre.org/sitemap.xml" > /dev/null 2>&1
curl -s "https://www.bing.com/ping?sitemap=https://www.internationalre.org/sitemap.xml" > /dev/null 2>&1
log "  Done."
log ""; log "CATCHUP COMPLETE: $(date)"
log "═══════════════════════════════════════════"
