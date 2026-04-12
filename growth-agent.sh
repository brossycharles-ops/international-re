#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — AGGRESSIVE GROWTH AGENT
# Runs daily at 9am via macOS LaunchAgent
# 2-3 content pieces per day + social media + SEO + search pings
# ═══════════════════════════════════════════════════════════════

export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

SITE_URL="https://www.internationalre.org"
PROJECT_DIR="$HOME/Desktop/my-project/Claude Newsletter"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)
LOG_FILE="$PROJECT_DIR/growth-agent.log"

cd "$PROJECT_DIR"

echo "" >> "$LOG_FILE"
echo "═══════════════════════════════════════════" >> "$LOG_FILE"
echo "Growth Agent: $DATE (Day $DAY_OF_WEEK)" >> "$LOG_FILE"
echo "═══════════════════════════════════════════" >> "$LOG_FILE"

# ── Pre-check: Claude CLI authentication ──
if ! claude --print "hello" > /dev/null 2>&1; then
  echo "[WARN] Claude CLI not authenticated. Opening Claude Desktop..." >> "$LOG_FILE"
  open -a "Claude" 2>/dev/null
  sleep 20
  if ! claude --print "hello" > /dev/null 2>&1; then
    echo "[ERROR] Claude CLI still not authenticated. Aborting." >> "$LOG_FILE"
    exit 1
  fi
fi
echo "[OK] Claude CLI ready." >> "$LOG_FILE"

# ── TASK 1: Ping search engines (every day, no Claude needed) ──
echo "[1/5] Pinging search engines..." >> "$LOG_FILE"
curl -s "https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
curl -s "https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"www.internationalre.org\",\"key\":\"internationalre\",\"urlList\":[\"${SITE_URL}\"]}" > /dev/null 2>&1
echo "  Done." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# TASK 2: PRIMARY CONTENT — one long-form piece per day
# ══════════════════════════════════════════════════════════════
echo "[2/5] Creating primary content..." >> "$LOG_FILE"

CONTENT_PROMPT=""

case $DAY_OF_WEEK in
  1) # Monday — Location guide
    CONTENT_PROMPT="You are the content writer for International RE (internationalre.org), a Latin American real estate site.

CREATE A NEW LOCATION GUIDE:
1. Read public/guides/ and public/blog/ to see existing content. Do NOT duplicate any topic.
2. Create public/guides/ directory if needed.
3. Pick a specific location guide that doesn't exist yet. Rotate through: Costa Rica, Nicaragua, Argentina, Chile. Types: neighborhood guide, buyer how-to, cost of living, rental yield analysis.
4. Use web search for REAL current data — prices per sqm, rental yields, legal requirements.
5. Create the HTML file in public/guides/ following the same template as existing blog posts (nav, hero image from Unsplash, full article 800-1200 words with real data, subscribe banner, footer).
6. Update public/sitemap.xml with the new page URL.
7. Git add, commit, and push with a descriptive message."
    ;;

  2) # Tuesday — FAQ / legal guide
    CONTENT_PROMPT="You are the content writer for International RE (internationalre.org).

CREATE A NEW FAQ OR LEGAL GUIDE:
1. Read public/guides/ and public/blog/ to see existing content. Do NOT duplicate.
2. Pick a topic that answers common buyer questions. Examples: 'Can foreigners buy property in [Country]?', 'Property taxes in [Country] explained', 'Residency through real estate investment in [Country]', 'Closing costs breakdown for [Country]'.
3. Use web search for REAL current legal requirements, tax rates, and procedures.
4. Create the HTML file in public/guides/ (same template as blog posts, 800-1200 words, real data).
5. Update public/sitemap.xml. Git add, commit, push."
    ;;

  3) # Wednesday — Market comparison
    CONTENT_PROMPT="You are the content writer for International RE (internationalre.org).

CREATE A MARKET COMPARISON PAGE:
1. Read existing content in public/guides/ and public/blog/. Do NOT duplicate.
2. Pick a comparison that doesn't exist yet. Examples: '[City] vs [City] for investment', 'Beach property: Costa Rica vs Nicaragua', 'Best value markets in Latin America 2026'.
3. Use web search for REAL current price data, rental yields, cost of living comparisons.
4. Create the HTML file in public/guides/ (same template, 800-1200 words, include comparison tables with real numbers).
5. Update public/sitemap.xml. Git add, commit, push."
    ;;

  4) # Thursday — Improve existing content + internal links
    CONTENT_PROMPT="You are the SEO specialist for International RE (internationalre.org).

IMPROVE EXISTING CONTENT:
1. Read ALL HTML files in public/blog/ and public/guides/.
2. Find the oldest or weakest page (shortest content, missing meta descriptions, no internal links).
3. Improve it: add 200-400 words of new data (use web search for current stats), add internal links to 3-5 related pages on the site, improve the meta description for SEO.
4. Check that every page has proper: title tag, meta description, Open Graph tags.
5. Add cross-links between related content pages (e.g., if a blog post mentions Costa Rica, link to the Costa Rica guide).
6. Git add, commit, push."
    ;;

  5) # Friday — Blog post (second weekly post; Monday's is from generate-blog.sh)
    CONTENT_PROMPT="You are the content writer for International RE (internationalre.org).

CREATE A NEW BLOG POST:
1. Read public/blog.html and public/blog/ to see existing posts and the most recent writer/market.
2. Pick the NEXT writer in rotation: Sofia Mendez, James Whitfield, Carolina Vega.
3. Pick a market NOT covered in the last 2 posts: Costa Rica, Nicaragua, Argentina, Chile.
4. Use web search for REAL current market data — prices, trends, recent developments.
5. Create the HTML file in public/blog/ (same template as existing posts, 800-1200 words, Unsplash hero image).
6. Update public/blog.html: move current featured post to grid, make new post featured.
7. Update public/sitemap.xml with today's date.
8. Git add, commit, push."
    ;;

  6) # Saturday — SEO audit + news roundup
    CONTENT_PROMPT="You are the SEO specialist for International RE (internationalre.org).

WEEKLY SEO AUDIT + NEWS ROUNDUP:
1. Read ALL HTML files across public/, public/blog/, public/guides/.
2. SEO AUDIT: Check every page for: proper title tags, meta descriptions, internal links, image alt text. Fix any issues.
3. NEWS ROUNDUP: Create a weekly roundup post in public/blog/ titled 'Latin America Real Estate Weekly — [date range]'. Use web search to find 5-7 real recent news items about real estate in Costa Rica, Nicaragua, Argentina, Chile. Summarize each with a link to the source.
4. Update public/blog.html to feature the roundup.
5. Update public/sitemap.xml. Git add, commit, push."
    ;;

  7) # Sunday — Data refresh on oldest content
    CONTENT_PROMPT="You are the content specialist for International RE (internationalre.org).

REFRESH OUTDATED CONTENT:
1. Read ALL HTML files in public/blog/ and public/guides/.
2. Find the 2 oldest pages (by publish date or last modified).
3. Use web search to get CURRENT data for those topics — updated prices, new regulations, recent market changes.
4. Update the pages with fresh data, update the 'Updated' date, and add 100-200 words of new insights.
5. Make sure all internal links still work and add new cross-links to any recently created content.
6. Git add, commit, push."
    ;;
esac

if [ -n "$CONTENT_PROMPT" ]; then
  claude --print "$CONTENT_PROMPT" >> "$LOG_FILE" 2>&1
  RESULT=$?
  if [ $RESULT -eq 0 ]; then
    echo "  Primary content created." >> "$LOG_FILE"
  else
    echo "  [ERROR] Primary content failed (exit $RESULT)." >> "$LOG_FILE"
  fi
fi

# ══════════════════════════════════════════════════════════════
# TASK 3: QUICK-READ PAGE — short SEO-targeted content
# A quick 300-500 word page targeting a specific long-tail keyword
# These stack up fast and capture search traffic
# ══════════════════════════════════════════════════════════════
echo "[3/5] Creating quick-read SEO page..." >> "$LOG_FILE"

claude --print "You are the SEO content writer for International RE (internationalre.org).

CREATE A QUICK-READ SEO PAGE (300-500 words):
1. Read ALL existing files in public/blog/, public/guides/, and public/quick-reads/ to avoid duplicating topics.
2. Create public/quick-reads/ directory if it doesn't exist.
3. Target ONE specific long-tail search keyword that people actually Google. Pick from types like:
   - 'How much does a house cost in [specific city]?'
   - 'Is it safe to buy property in [country]?'
   - 'Best neighborhoods in [city] for expats'
   - '[Country] property tax rates for foreigners'
   - 'Airbnb rental income in [city] — what to expect'
   - 'Cost of living in [city] per month 2026'
   - 'How to get residency in [country] through real estate'
   - 'Best time to buy property in [country]'
4. Use web search for real current data.
5. Create a short, focused HTML page in public/quick-reads/ using the same template as blog posts.
6. Include a strong CTA linking to the free guide and subscribe form.
7. Add internal links to 2-3 related pages on the site.
8. Update public/sitemap.xml. Git add, commit, push." >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "  Quick-read page created." >> "$LOG_FILE"
else
  echo "  [ERROR] Quick-read page failed." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# TASK 4: SOCIAL MEDIA CONTENT for RSS → dlvr.it → Twitter
# Create a short social-optimized page that dlvr.it auto-posts
# ══════════════════════════════════════════════════════════════
echo "[4/5] Creating social media content for auto-posting..." >> "$LOG_FILE"

claude --print "You are the social media content creator for International RE (internationalre.org).

CREATE A SOCIAL-OPTIMIZED SHORT POST PAGE:
This page will be picked up by our RSS feed and auto-posted to Twitter/X via dlvr.it.

1. Read existing content in public/blog/ and public/tips/ to avoid duplicates.
2. Create public/tips/ directory if it doesn't exist.
3. Create a short, punchy page in public/tips/ — think 'daily tip' or 'market stat of the day'. Examples:
   - '🏠 Did You Know? Foreigners can own property in Costa Rica with FULL ownership rights.'
   - '📊 Market Stat: Buenos Aires apartments cost \$1,500/sqm — that is 80% less than Miami.'
   - '💡 Investor Tip: Nicaragua has 0% capital gains tax on property sales.'
   - '🌴 Expat Insight: Costa Rica property taxes are capped at just 0.25% per year.'
4. The page title should be attention-grabbing and work as a tweet (under 200 chars).
5. The meta description should be compelling and include relevant hashtags concepts (dlvr.it adds hashtags from content).
6. Keep the page body SHORT — 150-300 words max. Include one eye-catching stat, a brief explanation, and a CTA to subscribe or download the free guide.
7. Use the same HTML template as blog posts but shorter.
8. Include keywords: #LatinAmericaRealEstate #InvestAbroad #ExpatLife #PropertyInvestment naturally in the text.
9. Update public/sitemap.xml. Git add, commit, push." >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "  Social content created." >> "$LOG_FILE"
else
  echo "  [ERROR] Social content failed." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# TASK 5: IndexNow ping for all new pages
# ══════════════════════════════════════════════════════════════
echo "[5/5] IndexNow ping for new content..." >> "$LOG_FILE"

# Find HTML files modified today and ping them
NEW_FILES=$(find public/blog public/guides public/quick-reads public/tips -name "*.html" -mtime 0 2>/dev/null | head -10)
if [ -n "$NEW_FILES" ]; then
  URLS=""
  for f in $NEW_FILES; do
    PAGE_PATH=$(echo "$f" | sed 's|^public/||')
    URLS="${URLS}\"${SITE_URL}/${PAGE_PATH}\","
  done
  URLS="${URLS%,}"
  curl -s -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json" \
    -d "{\"host\":\"www.internationalre.org\",\"key\":\"internationalre\",\"urlList\":[${URLS}]}" > /dev/null 2>&1
  echo "  Pinged IndexNow for: $NEW_FILES" >> "$LOG_FILE"
else
  echo "  No new pages to ping." >> "$LOG_FILE"
fi

# ── MONTHLY: First of month — market update ──
if [ "$DAY_OF_MONTH" = "01" ]; then
  echo "[MONTHLY] Creating monthly market update..." >> "$LOG_FILE"
  claude --print "You are the content writer for International RE (internationalre.org).

CREATE A MONTHLY MARKET UPDATE:
1. Read existing blog posts in public/blog/ to avoid duplicating.
2. Use web search to research CURRENT real estate market conditions across Costa Rica, Nicaragua, Argentina, and Chile.
3. Create a comprehensive monthly update blog post in public/blog/ covering: price trends, new developments, regulatory changes, investment opportunities across all 4 markets. Include real numbers and sources.
4. Make it the featured post on public/blog.html.
5. Update public/sitemap.xml. Git add, commit, push." >> "$LOG_FILE" 2>&1
  echo "  Monthly update done." >> "$LOG_FILE"
fi

# ── TWICE MONTHLY: 15th — Top 10 listicle for search traffic ──
if [ "$DAY_OF_MONTH" = "15" ]; then
  echo "[BIMONTHLY] Creating Top 10 listicle..." >> "$LOG_FILE"
  claude --print "You are the content writer for International RE (internationalre.org).

CREATE A TOP 10 LISTICLE BLOG POST:
1. Read existing content to avoid duplicates.
2. Pick an engaging listicle topic: 'Top 10 cheapest beach towns in Latin America', '10 mistakes expats make buying property abroad', 'Top 10 neighborhoods in Buenos Aires for investment', '10 reasons to buy property in Costa Rica in 2026'.
3. Use web search for real data.
4. Create a long-form blog post (1500+ words) in public/blog/ — listicles rank well in search.
5. Update public/blog.html. Update public/sitemap.xml. Git add, commit, push." >> "$LOG_FILE" 2>&1
  echo "  Listicle done." >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
echo "Growth Agent completed: $(date)" >> "$LOG_FILE"
echo "═══════════════════════════════════════════" >> "$LOG_FILE"
