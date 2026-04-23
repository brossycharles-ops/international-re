#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — DAILY GROWTH AGENT
# Runs every day at 9am via macOS LaunchAgent
#
# Exactly 2 Claude calls per day — never more.
# Monthly/bimonthly tasks REPLACE the daily pair, not stack on top.
# Monday handles the weekly blog (generate-blog.sh eliminated).
# Markets: Costa Rica, Nicaragua, Argentina, Chile, Panama, Colombia,
#          Mexico, Uruguay, Ecuador, Peru, Brazil
# ═══════════════════════════════════════════════════════════════

export PATH="/Users/charlesbrossy/.local/bin:/Users/charlesbrossy/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/Users/charlesbrossy"

SITE_URL="https://www.internationalre.org"
PROJECT_DIR="/Users/charlesbrossy/Desktop/my-project/Claude Newsletter"
DATE=$(date +%Y-%m-%d)
MONTH_YEAR=$(date +"%B %Y")
DAY_OF_WEEK=$(date +%u)   # 1=Mon … 7=Sun
DAY_OF_MONTH=$(date +%-d) # 1-31 without leading zero
LOG_FILE="$PROJECT_DIR/growth-agent.log"
CLAUDE_BIN="/Users/charlesbrossy/.local/bin/claude"

cd "$PROJECT_DIR" || exit 1

log() { echo "$1" >> "$LOG_FILE"; }
claude_run() { "$CLAUDE_BIN" -p --dangerously-skip-permissions "$1" >> "$LOG_FILE" 2>&1; }

log ""
log "═══════════════════════════════════════════"
log "Growth Agent: $DATE (Day $DAY_OF_WEEK)"
log "═══════════════════════════════════════════"

# ── Auth check ──────────────────────────────────────────────
if ! "$CLAUDE_BIN" -p --dangerously-skip-permissions "reply with OK" > /dev/null 2>&1; then
  log "[WARN] Claude not authenticated — opening Claude Desktop..."
  open -a "Claude" 2>/dev/null
  sleep 30
  if ! "$CLAUDE_BIN" -p --dangerously-skip-permissions "reply with OK" > /dev/null 2>&1; then
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
  claude_run "$prompt"
  if [ $? -eq 0 ]; then log "  [OK] $label"; else log "  [FAIL] $label"; fi
}

# ══════════════════════════════════════════════════════════
# SPECIAL DAYS — exactly 1 Claude call, nothing else
# ══════════════════════════════════════════════════════════
if [ "$DAY_OF_MONTH" = "1" ]; then
  log "[MONTHLY] First of month — monthly market update"
  run_claude "Monthly market update" \
"Content writer for International RE (internationalre.org).

TASK: Write a monthly market update blog post covering multiple Latin American markets.
- Web search for the single most newsworthy real estate development this month ($MONTH_YEAR) in each: Costa Rica, Colombia, Panama, Mexico, Argentina, Chile, Uruguay.
- Use current data as of $DATE — prices per sqm, rental yields, notable developments.
- Write a 700-900 word HTML post in public/blog/ titled 'Latin America Real Estate — $MONTH_YEAR Market Update'. Publish date: $DATE.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add monthly update: $MONTH_YEAR' && git push"
  log "Growth Agent completed (monthly): $(date)"
  log "═══════════════════════════════════════════"
  exit 0
fi

if [ "$DAY_OF_MONTH" = "15" ]; then
  log "[BIMONTHLY] 15th — top-10 listicle"
  run_claude "Top-10 listicle" \
"Content writer for International RE (internationalre.org).

TASK: Write a top-10 listicle blog post about Latin American real estate.
- Run: ls public/blog/ — avoid duplicating any existing listicle.
- Pick an engaging topic not yet covered. Examples:
  '10 cheapest beach towns in Latin America $DATE', '10 mistakes expats make buying property abroad',
  'Top 10 neighborhoods for investors in Medellín', 'Top 10 reasons to buy in Panama in 2026',
  '10 Latin American cities with the highest rental yields'.
- Web search for real, current data ($DATE) to back each point.
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
#
# MARKETS TO ROTATE THROUGH:
#   Costa Rica | Nicaragua | Argentina | Chile | Panama | Colombia
#   Mexico | Uruguay | Ecuador | Peru | Brazil
# Always use web search for data current as of $DATE.
# ══════════════════════════════════════════════════════════

log "[1/2] Primary content (Day $DAY_OF_WEEK)..."
case $DAY_OF_WEEK in
  1) # Monday — weekly featured blog
    run_claude "Weekly featured blog" \
"Content writer for International RE (internationalre.org).

TASK: Write this week's featured blog post in public/blog/.
- Run: ls public/blog/ — check the last 3 filenames for recent markets covered.
- Next writer rotation: Sofia Mendez → James Whitfield → Carolina Vega → repeat.
- Pick a market NOT in the last 3 posts. Rotate across: Costa Rica, Nicaragua, Argentina, Chile, Panama, Colombia (Medellín or Cartagena), Mexico (Playa del Carmen, CDMX, or Tulum), Uruguay, Ecuador, Peru, Brazil.
- Web search for 3-5 real current data points as of $DATE (price/sqm, rental yield, one notable development, USD exchange context).
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
- Pick an uncovered topic. Good options: property taxes, closing costs, residency through investment, or a 'Can foreigners buy in X?' guide for a country not yet covered. Countries to consider: Panama, Colombia, Mexico, Uruguay, Ecuador, Peru, Brazil, Nicaragua, Argentina, Chile, Costa Rica.
- Web search for the real current rules and numbers as of $DATE.
- Write a 600-800 word HTML guide matching existing guides (nav, Unsplash hero, article, subscribe banner, footer). Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add legal guide: [title]' && git push"
    ;;

  3) # Wednesday — market comparison
    run_claude "Market comparison" \
"Content writer for International RE (internationalre.org).

TASK: Create one market comparison page in public/guides/.
- Run: ls public/guides/ public/blog/ — do NOT duplicate any existing comparison.
- Pick an uncovered pairing. Examples: 'Medellín vs Buenos Aires for expat investors', 'Panama City vs San José', 'Mexico Beach Towns vs Costa Rica', 'Uruguay vs Chile for retirees', 'Best value beach markets: Nicaragua, Ecuador, or Brazil'.
- Web search for real price data and rental yields as of $DATE to include in a simple comparison table.
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
- Web search for one current stat as of $DATE relevant to that page's topic.
- Add 150-200 words of updated data, improve the meta description to be more compelling, add 2-3 internal links to related pages.
- git add -A && git commit -m 'SEO: strengthen [filename]' && git push"
    ;;

  5) # Friday — location guide
    run_claude "Location guide" \
"Content writer for International RE (internationalre.org).

TASK: Create one new location guide in public/guides/.
- Run: ls public/guides/ public/blog/ — do NOT duplicate any existing topic.
- Pick one not yet covered. Rotate across: Costa Rica, Nicaragua, Argentina, Chile, Panama, Colombia, Mexico, Uruguay, Ecuador, Peru, Brazil. Types: neighborhood guide, cost-of-living breakdown, or rental-yield analysis for a specific city.
- Web search for 3-5 real current data points as of $DATE (price/sqm, rental yield, one recent development).
- Write a 600-800 word HTML guide matching public/guides/can-foreigners-buy-property-costa-rica.html (nav, Unsplash hero, article, subscribe banner, footer). Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add guide: [title]' && git push"
    ;;

  6) # Saturday — weekly news roundup
    run_claude "Weekly news roundup" \
"Content writer for International RE (internationalre.org).

TASK: Create a weekly Latin America real estate news roundup post.
- Web search for 4-5 real recent news items (as of $DATE) about real estate across Latin America — cover at least 3 different countries from: Costa Rica, Nicaragua, Argentina, Chile, Panama, Colombia, Mexico, Uruguay, Ecuador, Peru, Brazil.
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
- Web search for one or two updates for that topic as of $DATE — new prices, policy changes, market shifts.
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
  Target countries to expand into: Panama, Colombia, Mexico, Uruguay, Ecuador, Peru, Brazil (plus existing: Costa Rica, Nicaragua, Argentina, Chile).
  Good targets: 'Airbnb income in [city] $DATE', 'property tax in [country] for foreigners', 'cost of living in [city] per month', 'how long does it take to buy property in [country]', 'best neighborhoods in [city] for expats'.
- Web search for one real current stat as of $DATE to anchor the page.
- Write a short focused HTML page (same structure as existing quick-reads: nav, short article, subscribe CTA, footer). Publish date: $DATE.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"
else
  # Even day (Tue/Thu/Sat) → social tip
  run_claude "Social tip" \
"Social media writer for International RE (internationalre.org).

TASK: Create one short tip/stat page (150-250 words) in public/tips/.
- Run: ls public/tips/ — pick a NEW punchy stat not yet covered there.
  Good examples: a surprising price comparison, a tax advantage, a legal right for foreign buyers, a rental yield fact. Cover new countries: Panama, Colombia, Mexico, Uruguay, Ecuador, Peru, Brazil — not just the ones already covered.
- Web search to confirm the stat is real and current as of $DATE.
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
