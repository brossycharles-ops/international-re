#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — DAILY GROWTH AGENT
# Runs every day at 9am via macOS LaunchAgent
#
# Exactly 2 Claude calls per day — never more.
# Monthly/bimonthly tasks REPLACE the daily pair, not stack on top.
# Monday handles the weekly blog (generate-blog.sh eliminated).
# ═══════════════════════════════════════════════════════════════

export PATH="/Users/charlesbrossy/.local/bin:/Users/charlesbrossy/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

SITE_URL="https://www.internationalre.org"
PROJECT_DIR="/Users/charlesbrossy/Desktop/my-project/Claude Newsletter"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)   # 1=Mon … 7=Sun
DAY_OF_MONTH=$(date +%-d) # 1-31 without leading zero
LOG_FILE="$PROJECT_DIR/growth-agent.log"
CLAUDE="/Users/charlesbrossy/.local/bin/claude -p --dangerously-skip-permissions"

cd "$PROJECT_DIR" || exit 1

log() { echo "$1" >> "$LOG_FILE"; }

log ""
log "═══════════════════════════════════════════"
log "Growth Agent: $DATE (Day $DAY_OF_WEEK)"
log "═══════════════════════════════════════════"

# ── Auth check ──────────────────────────────────────────────
if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
  log "[WARN] Claude not authenticated — opening Claude Desktop..."
  open -a "Claude" 2>/dev/null
  sleep 30
  if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
    log "[ERROR] Claude not authenticated. Open the Claude app and log in, then it will run tomorrow at 9am."
    exit 1
  fi
fi
log "[OK] Claude ready."

# ── Always: ping search engines (no Claude cost) ──────────
log "[ping] Search engines..."
curl -s "https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
curl -s "https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
log "  Done."

# ── Helper ────────────────────────────────────────────────
run_claude() {
  local label="$1"; local prompt="$2"
  log "[run] $label..."
  $CLAUDE "$prompt" >> "$LOG_FILE" 2>&1
  if [ $? -eq 0 ]; then log "  [OK] $label"; else log "  [FAIL] $label"; fi
}

# ══════════════════════════════════════════════════════════
# SPECIAL DAYS — exactly 1 Claude call, nothing else
# ══════════════════════════════════════════════════════════
if [ "$DAY_OF_MONTH" = "1" ]; then
  log "[MONTHLY] First of month — monthly market update"
  run_claude "Monthly market update" \
"Content writer for International RE (internationalre.org).

TASK: Write a monthly market update blog post covering all 4 markets.
- Web search for the single most newsworthy real estate development this month in each: Costa Rica, Nicaragua, Argentina, Chile.
- Write a 600-800 word HTML post in public/blog/ titled 'Latin America Real Estate — [Month] 2026 Market Update'. Publish date: $DATE.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add monthly update: [month] 2026' && git push"
  log "Growth Agent completed (monthly): $(date)"
  log "═══════════════════════════════════════════"
  exit 0
fi

if [ "$DAY_OF_MONTH" = "15" ]; then
  log "[BIMONTHLY] 15th — top-10 listicle"
  run_claude "Top-10 listicle" \
"Content writer for International RE (internationalre.org).

TASK: Write a top-10 listicle blog post.
- Run: ls public/blog/ — avoid duplicating any existing listicle.
- Pick an engaging topic not yet covered (e.g. '10 cheapest beach towns in Latin America 2026', '10 mistakes expats make buying property abroad', 'Top 10 neighborhoods for investors in Buenos Aires').
- Web search for real data to back each point briefly.
- Write a 700-900 word HTML post in public/blog/. Publish date: $DATE.
- Update public/blog.html. Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add listicle: [title]' && git push"
  log "Growth Agent completed (bimonthly): $(date)"
  log "═══════════════════════════════════════════"
  exit 0
fi

# ══════════════════════════════════════════════════════════
# REGULAR DAYS — exactly 2 Claude calls
# Call 1: primary long-form content
# Call 2: short piece (quick-read on odd days, tip on even days)
# ══════════════════════════════════════════════════════════

log "[1/2] Primary content (Day $DAY_OF_WEEK)..."
case $DAY_OF_WEEK in
  1) # Monday — weekly featured blog (replaces generate-blog.sh)
    run_claude "Weekly featured blog" \
"Content writer for International RE (internationalre.org).

TASK: Write this week's featured blog post in public/blog/.
- Run: ls public/blog/ — check the last 2 filenames for recent market and writer.
- Next writer rotation: Sofia Mendez → James Whitfield → Carolina Vega → repeat.
- Pick a market NOT in the last 2 posts: Costa Rica, Nicaragua, Argentina, Chile.
- Web search for 3-5 real current data points (price/sqm, rental yield, one notable development).
- Write a 700-900 word HTML post matching public/blog/guanacaste-hottest-market-2026.html (nav, Unsplash hero, article, subscribe banner, footer). Publish date: $DATE.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add weekly blog: [title]' && git push"
    ;;

  2) # Tuesday — legal / FAQ guide
    run_claude "Legal FAQ guide" \
"Content writer for International RE (internationalre.org).

TASK: Create one new legal or FAQ guide in public/guides/.
- Run: ls public/guides/ — do NOT duplicate any existing topic.
- Pick an uncovered topic: property taxes, closing costs, residency through investment, or a 'Can foreigners buy in X?' guide for a country not yet covered (check existing guides first).
- Web search for the real current rules and numbers.
- Write a 600-800 word HTML guide matching existing guides (nav, Unsplash hero, article, subscribe banner, footer). Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add legal guide: [title]' && git push"
    ;;

  3) # Wednesday — market comparison
    run_claude "Market comparison" \
"Content writer for International RE (internationalre.org).

TASK: Create one market comparison page in public/guides/.
- Run: ls public/guides/ public/blog/ — do NOT duplicate any existing comparison.
- Pick an uncovered pairing: two cities, two countries, or a 'best value' overview.
- Web search for real price data and rental yields to include in a simple comparison table.
- Write a 600-800 word HTML page matching existing guide style (nav, hero, article with table, subscribe banner, footer). Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add comparison: [title]' && git push"
    ;;

  4) # Thursday — SEO improvement (no new file, improve existing)
    run_claude "SEO improvement" \
"SEO specialist for International RE (internationalre.org).

TASK: Improve the weakest existing page.
- Run: ls -lS public/blog/ public/guides/ to find the smallest files (weakest content).
- Pick the smallest one. Read it.
- Add 150-200 words of updated data (web search for one current stat), improve the meta description to be more compelling, add 2-3 internal links to related pages.
- git add -A && git commit -m 'SEO: strengthen [filename]' && git push"
    ;;

  5) # Friday — location guide
    run_claude "Location guide" \
"Content writer for International RE (internationalre.org).

TASK: Create one new location guide in public/guides/.
- Run: ls public/guides/ public/blog/ — do NOT duplicate any existing topic.
- Pick one not yet covered: neighborhood guide, cost-of-living breakdown, or rental-yield analysis for a specific city in Costa Rica, Nicaragua, Argentina, or Chile.
- Web search for 3-5 real current data points (price/sqm, rental yield, one recent development).
- Write a 600-800 word HTML guide matching public/guides/can-foreigners-buy-property-costa-rica.html (nav, Unsplash hero, article, subscribe banner, footer). Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add guide: [title]' && git push"
    ;;

  6) # Saturday — weekly news roundup
    run_claude "Weekly news roundup" \
"Content writer for International RE (internationalre.org).

TASK: Create a weekly Latin America real estate news roundup post.
- Web search for 4-5 real recent news items about real estate across Costa Rica, Nicaragua, Argentina, Chile. Find actual headlines with sources.
- Write a 500-700 word HTML post in public/blog/ titled 'Latin America Real Estate Weekly — [date range]'. Same structure as existing posts (nav, Unsplash hero, article, subscribe banner, footer). Publish date: $DATE.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add weekly roundup: [date range]' && git push"
    ;;

  7) # Sunday — refresh oldest content
    run_claude "Content refresh" \
"Content specialist for International RE (internationalre.org).

TASK: Refresh the single oldest page on the site with current data.
- Run: ls -lt public/blog/ public/guides/ | tail -6 to find the oldest files.
- Pick the oldest one. Read it.
- Web search for one or two updates for that topic as of $DATE.
- Add 100-150 words of fresh data, update the 'Updated' date to $DATE, add one internal link to a recently created page.
- git add -A && git commit -m 'Refresh: [filename] with $(date +%B) 2026 data' && git push"
    ;;
esac

# ── Call 2: short piece ────────────────────────────────────
log "[2/2] Short piece..."
if [ $(( DAY_OF_WEEK % 2 )) -eq 1 ]; then
  # Odd day (Mon/Wed/Fri/Sun) → quick-read
  run_claude "Quick-read" \
"SEO writer for International RE (internationalre.org).

TASK: Create one short quick-read page (250-400 words) in public/quick-reads/.
- Run: ls public/quick-reads/ — pick a NEW long-tail keyword not yet covered.
  Good targets: 'Airbnb income in [city]', 'property tax in [country]', 'cost of living in [city] per month 2026', 'how long does it take to buy property in [country]', 'best time to buy in [country]'.
- Web search for one real current stat to anchor the page.
- Write a short focused HTML page (same structure as existing quick-reads: nav, short article, subscribe CTA, footer). Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"
else
  # Even day (Tue/Thu/Sat) → social tip
  run_claude "Social tip" \
"Social media writer for International RE (internationalre.org).

TASK: Create one short tip/stat page (150-250 words) in public/tips/.
- Run: ls public/tips/ — pick a NEW punchy stat not yet covered there.
  Good examples: a surprising price comparison, a tax advantage, a legal right for foreign buyers, a rental yield fact.
- Web search to confirm the stat is real and current.
- Write a short HTML page (same structure as public/tips/medellin-property-vs-miami.html). Title under 200 chars — must work as a standalone social post. Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add tip: [stat]' && git push"
fi

# ── IndexNow: ping for new pages created today ─────────────
NEW_FILES=$(find public/blog public/guides public/quick-reads public/tips \
  -name "*.html" -newer public/sitemap.xml 2>/dev/null | head -5)
if [ -n "$NEW_FILES" ]; then
  URLS=""
  for f in $NEW_FILES; do
    PAGE=$(echo "$f" | sed 's|^public/||')
    URLS="${URLS}\"${SITE_URL}/${PAGE}\","
  done
  URLS="${URLS%,}"
  curl -s -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json" \
    -d "{\"host\":\"www.internationalre.org\",\"key\":\"internationalre\",\"urlList\":[${URLS}]}" \
    > /dev/null 2>&1
  log "  IndexNow pinged."
fi

log "Growth Agent completed: $(date)"
log "═══════════════════════════════════════════"
