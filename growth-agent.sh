#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — DAILY GROWTH AGENT
# Runs daily at 9am via macOS LaunchAgent
# 2 focused tasks per day to stay well under usage limits
# ═══════════════════════════════════════════════════════════════

export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

SITE_URL="https://www.internationalre.org"
PROJECT_DIR="$HOME/Desktop/my-project/Claude Newsletter"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)   # 1=Monday … 7=Sunday
DAY_OF_MONTH=$(date +%d)
LOG_FILE="$PROJECT_DIR/growth-agent.log"
CLAUDE="claude -p --dangerously-skip-permissions"

cd "$PROJECT_DIR" || exit 1

log() { echo "$1" >> "$LOG_FILE"; }

log ""
log "═══════════════════════════════════════════"
log "Growth Agent: $DATE (Day $DAY_OF_WEEK)"
log "═══════════════════════════════════════════"

# ── Auth check ──────────────────────────────────────────────
if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
  log "[WARN] Claude CLI not authenticated — opening Claude Desktop..."
  open -a "Claude" 2>/dev/null
  sleep 30
  if ! $CLAUDE "reply with OK" > /dev/null 2>&1; then
    log "[ERROR] Claude CLI still not authenticated. Aborting."
    log "  Fix: open Claude desktop app and make sure you are logged in."
    exit 1
  fi
fi
log "[OK] Claude CLI ready."

# ── Task 1: ping search engines (no Claude needed) ──────────
log "[1/3] Pinging search engines..."
curl -s "https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
curl -s "https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
log "  Done."

# ── Task 2: PRIMARY content — one focused piece per day ─────
log "[2/3] Primary content task (Day $DAY_OF_WEEK)..."

run_claude() {
  local label="$1"
  local prompt="$2"
  $CLAUDE "$prompt" >> "$LOG_FILE" 2>&1
  if [ $? -eq 0 ]; then log "  [OK] $label"; else log "  [ERROR] $label failed"; fi
}

case $DAY_OF_WEEK in
  1) # Monday — location guide
    run_claude "Location guide" \
"Content writer for International RE (internationalre.org).

TASK: Create one new location guide in public/guides/.
- Run: ls public/guides/ public/blog/ to see existing topics. Do NOT duplicate.
- Pick one that doesn't exist: neighborhood guide, cost-of-living, or rental-yield page for a specific city in Costa Rica, Nicaragua, Argentina, or Chile.
- Web search for 3-5 real current data points (price/sqm, rental yield, one recent development).
- Write a focused 600-800 word HTML guide using the same structure as public/guides/can-foreigners-buy-property-costa-rica.html (nav, hero from Unsplash, article, subscribe banner, footer).
- Add the new URL to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add guide: [title]' && git push"
    ;;

  2) # Tuesday — legal / FAQ guide
    run_claude "Legal FAQ guide" \
"Content writer for International RE (internationalre.org).

TASK: Create one new legal or FAQ guide in public/guides/.
- Run: ls public/guides/ to see what exists. Do NOT duplicate.
- Pick one topic not yet covered: property taxes, closing costs, residency via investment, or a 'Can foreigners buy in X?' guide for a country not yet covered.
- Web search for the real current rules and numbers.
- Write a focused 600-800 word HTML guide matching the style of existing guides (nav, hero, article, subscribe banner, footer).
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add legal guide: [title]' && git push"
    ;;

  3) # Wednesday — market comparison
    run_claude "Market comparison" \
"Content writer for International RE (internationalre.org).

TASK: Create one market comparison page in public/guides/.
- Run: ls public/guides/ public/blog/ to avoid duplicating any existing comparison.
- Pick a pairing not yet covered: two cities, or two countries, or a 'best value' overview.
- Web search for real price data and rental yield numbers to include in a simple comparison table.
- Write a focused 600-800 word HTML page matching existing guide style (nav, hero, article with table, subscribe banner, footer).
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add comparison: [title]' && git push"
    ;;

  4) # Thursday — SEO improvement
    run_claude "SEO improvement" \
"SEO specialist for International RE (internationalre.org).

TASK: Improve the weakest existing page.
- Run: ls public/blog/ public/guides/ to see all pages.
- Read the two oldest or shortest files (check file sizes or dates).
- For the weakest one: add 150-200 words of updated data (web search for a current stat), improve the meta description, and add 2-3 internal links to other pages on the site.
- git add -A && git commit -m 'SEO: improve [filename]' && git push"
    ;;

  5) # Friday — blog post
    run_claude "Blog post" \
"Content writer for International RE (internationalre.org).

TASK: Write one new blog post in public/blog/.
- Run: ls public/blog/ and read the last 2 blog post filenames to see recent market/writer.
- Next writer rotation: Sofia Mendez → James Whitfield → Carolina Vega → repeat.
- Pick a market NOT in the last 2 posts (Costa Rica, Nicaragua, Argentina, Chile).
- Web search for 3-5 real current data points for that market.
- Write a 700-900 word HTML post matching public/blog/guanacaste-hottest-market-2026.html structure (nav, hero from Unsplash, article, subscribe banner, footer). Publish date: $DATE.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add blog: [title]' && git push"
    ;;

  6) # Saturday — weekly news roundup
    run_claude "Weekly news roundup" \
"Content writer for International RE (internationalre.org).

TASK: Create a weekly Latin America real estate news roundup blog post.
- Web search for 4-5 real recent news items about real estate across Costa Rica, Nicaragua, Argentina, Chile. Get real headlines and sources.
- Write a 500-700 word HTML post in public/blog/ titled 'Latin America Real Estate Weekly — [date range]'. Same template as existing posts. Publish date: $DATE.
- Update public/blog.html to feature this roundup.
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add weekly roundup: [date range]' && git push"
    ;;

  7) # Sunday — refresh oldest content
    run_claude "Content refresh" \
"Content specialist for International RE (internationalre.org).

TASK: Refresh the single oldest page on the site.
- Run: ls -lt public/blog/ public/guides/ | tail -5 to find the oldest files.
- Pick the oldest one. Web search for one or two current updates for that topic.
- Add 100-150 words of fresh data, update the 'Updated' date to $DATE, and add one internal link to a newer page.
- git add -A && git commit -m 'Refresh: update [filename] with current data' && git push"
    ;;
esac

# ── Task 3: SHORT PIECE — quick-read (odd days) or tip (even days) ──
log "[3/3] Short content piece..."

if [ $((DAY_OF_WEEK % 2)) -eq 1 ]; then
  # Odd day → quick-read
  run_claude "Quick-read SEO page" \
"SEO writer for International RE (internationalre.org).

TASK: Create one short quick-read page (250-400 words) in public/quick-reads/.
- Run: ls public/quick-reads/ to see existing topics. Pick a NEW long-tail keyword not yet covered.
  Good examples: 'Airbnb income in [city]', 'property tax rate in [country]', 'how long to buy property in [country]', 'cost of living in [city] per month'.
- Web search for one real current stat to anchor the page.
- Write a SHORT focused HTML page (same template as existing pages: nav, short article, subscribe CTA, footer).
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add quick-read: [topic]' && git push"
else
  # Even day → social tip
  run_claude "Social tip page" \
"Social media writer for International RE (internationalre.org).

TASK: Create one short tip/stat page (150-250 words) in public/tips/.
- Run: ls public/tips/ to see existing tips. Pick a NEW punchy stat not yet covered.
  Examples: a surprising price comparison, a tax advantage, a legal right for foreign buyers.
- Web search to verify the stat is real and current.
- Write a SHORT HTML page (same nav/footer template as existing tips). Title must work as a tweet (under 200 chars).
- Add to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add tip: [stat]' && git push"
fi

# ── Monthly: 1st of month — market update ───────────────────
if [ "$DAY_OF_MONTH" = "01" ]; then
  log "[MONTHLY] Monthly market update..."
  run_claude "Monthly market update" \
"Content writer for International RE (internationalre.org).

TASK: Write one monthly market update blog post covering all 4 markets.
- Web search for the single most important recent development in each: Costa Rica, Nicaragua, Argentina, Chile.
- Write a 600-800 word HTML post in public/blog/ titled 'Latin America Real Estate — [Month] 2026 Market Update'. Publish date: $DATE.
- Update public/blog.html to feature it. Add to public/sitemap.xml.
- git add -A && git commit -m 'Add monthly update: [month] 2026' && git push"
fi

# ── Bi-monthly: 15th — top-10 listicle ──────────────────────
if [ "$DAY_OF_MONTH" = "15" ]; then
  log "[BIMONTHLY] Top-10 listicle..."
  run_claude "Top-10 listicle" \
"Content writer for International RE (internationalre.org).

TASK: Write one top-10 listicle blog post.
- Run: ls public/blog/ to avoid duplicating an existing listicle topic.
- Pick an engaging topic (e.g. '10 cheapest beach towns in Latin America', '10 mistakes expats make buying abroad').
- Web search for real data to back each point briefly.
- Write a 700-900 word HTML post in public/blog/. Publish date: $DATE.
- Update public/blog.html. Add to public/sitemap.xml.
- git add -A && git commit -m 'Add listicle: [title]' && git push"
fi

# ── IndexNow ping for pages created today ───────────────────
NEW_FILES=$(find public/blog public/guides public/quick-reads public/tips -name "*.html" -newer public/sitemap.xml 2>/dev/null | head -5)
if [ -n "$NEW_FILES" ]; then
  URLS=""
  for f in $NEW_FILES; do
    PAGE=$(echo "$f" | sed 's|^public/||')
    URLS="${URLS}\"${SITE_URL}/${PAGE}\","
  done
  URLS="${URLS%,}"
  curl -s -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json" \
    -d "{\"host\":\"www.internationalre.org\",\"key\":\"internationalre\",\"urlList\":[${URLS}]}" > /dev/null 2>&1
  log "  IndexNow pinged for new pages."
fi

log ""
log "Growth Agent completed: $(date)"
log "═══════════════════════════════════════════"
