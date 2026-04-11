#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — FULLY AUTONOMOUS GROWTH AGENT
# Runs daily at 9am via macOS LaunchAgent
# Every task publishes directly to the live site — zero manual steps
# ═══════════════════════════════════════════════════════════════

# Ensure PATH includes Claude CLI and Node.js (LaunchAgents use minimal PATH)
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

SITE_URL="https://www.internationalre.org"
PROJECT_DIR="$HOME/Desktop/my-project/Claude Newsletter"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
WEEK_OF_YEAR=$(date +%V)
LOG_FILE="$PROJECT_DIR/growth-agent.log"

cd "$PROJECT_DIR"

echo "" >> "$LOG_FILE"
echo "═══════════════════════════════════════════" >> "$LOG_FILE"
echo "Growth Agent Run: $DATE (Day $DAY_OF_WEEK, Week $WEEK_OF_YEAR)" >> "$LOG_FILE"
echo "═══════════════════════════════════════════" >> "$LOG_FILE"

# ──────────────────────────────────────────────
# PRE-CHECK: Make sure Claude CLI is authenticated
# If not, open Claude Desktop app and wait for it
# ──────────────────────────────────────────────
if ! claude --print "hello" > /dev/null 2>&1; then
  echo "[WARNING] Claude CLI not authenticated. Opening Claude Desktop app..." >> "$LOG_FILE"
  open -a "Claude" 2>/dev/null
  sleep 15
  if ! claude --print "hello" > /dev/null 2>&1; then
    echo "[ERROR] Claude CLI still not authenticated. Content tasks will be skipped." >> "$LOG_FILE"
    echo "[ERROR] Make sure Claude Desktop app is open and you are logged in." >> "$LOG_FILE"
  else
    echo "[OK] Claude CLI authenticated after opening app." >> "$LOG_FILE"
  fi
else
  echo "[OK] Claude CLI authenticated." >> "$LOG_FILE"
fi

# ──────────────────────────────────────────────
# DAILY: Ping search engines (runs every single day)
# ──────────────────────────────────────────────
echo "[DAILY] Pinging search engines..." >> "$LOG_FILE"
curl -s "https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
curl -s "https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
echo "  Google & Bing pinged." >> "$LOG_FILE"

# ──────────────────────────────────────────────────────────────
# DAILY: Auto-build and update the Guides index page
#        So visitors can browse all guides from one place
# ──────────────────────────────────────────────────────────────
echo "[DAILY] Rebuilding guides index page..." >> "$LOG_FILE"

claude --print "You are a web developer for International RE (internationalre.org).

YOUR TASK: Rebuild the GUIDES INDEX page at public/guides.html (create it if it doesn't exist).

INSTRUCTIONS:
1. Read ALL files in public/guides/ to see every guide that exists.
2. Read public/blog.html for the exact HTML template to follow (same nav, hero banner, footer, subscribe banner, styles).
3. Create or update public/guides.html with:
   - A hero banner titled 'Real Estate Guides' with subtitle 'In-depth guides, FAQs, and resources for Latin American property buyers.'
   - A grid of cards linking to every guide in public/guides/, organized by type:
     * Location Guides
     * FAQs & Legal
     * Comparisons & Rankings
     * Resources & Tools
   - Each card shows: title, short description (extract from meta description), and country tag
4. Make sure public/guides.html is in public/sitemap.xml.
5. Make sure the navbar on ALL pages includes a 'Guides' link between 'Blog' and 'Gallery'. Check every HTML file in public/, public/blog/, and public/guides/ and add the link if missing.
6. If you made any changes, git add, commit, and push to GitHub.
7. If there are no guides yet, still create the index page with a message like 'Guides coming soon — subscribe to be notified.' so the nav link works." 2>> "$LOG_FILE"

echo "  Guides index rebuilt." >> "$LOG_FILE"

# ──────────────────────────────────────────────────────────────
# MONDAY: Location guide page
#         (blog post handled separately by generate-blog.sh at 8am)
# ──────────────────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "1" ]; then
  echo "[MON] Creating new location guide page..." >> "$LOG_FILE"

  claude --print "You are a content growth agent for International RE (internationalre.org), a Latin American real estate website.

YOUR TASK: Create a new SEO-optimized LOCATION GUIDE page that targets long-tail search keywords.

INSTRUCTIONS:
1. Read ALL existing files in public/blog/ and public/guides/ (if it exists) to see what content already exists. DO NOT duplicate a topic that already has a page.
2. Create the directory public/guides/ if it doesn't exist.
3. Pick ONE specific location/topic that does NOT already have a page. Rotate through these types:
   - City neighborhood guides: 'Best Neighborhoods in [City] for Expats'
   - Buyer how-to guides: 'How to Buy Property in [Country] as a Foreigner — Step by Step'
   - Comparison guides: '[City A] vs [City B] for Real Estate Investment'
   - Cost of living guides: 'Cost of Living in [City] — 2026 Breakdown'
   - Rental yield guides: 'Best Rental Yields in [Country] — Top 5 Areas'
   Focus on Costa Rica, Nicaragua, Argentina, and Chile.
4. Use web search to research REAL, current data for the guide. Include specific prices, neighborhoods, legal requirements, and practical tips.
5. Create the HTML page using the EXACT same template structure as the blog posts in public/blog/ (same nav, same footer, same CSS link to ../styles.css, same subscribe banner). Make the URL slug descriptive and keyword-rich.
6. Add the new page to public/sitemap.xml with today's date.
7. Add an internal link to the new guide from the MOST relevant existing blog post (edit that blog post's HTML to add a natural 'Related reading' or inline link).
8. Git add, commit with a descriptive message, and push to GitHub.

The page must be 1000-1500 words with real data, not generic filler. Write it like an expert who has actually been there." 2>> "$LOG_FILE"

  echo "  Location guide created and published." >> "$LOG_FILE"
fi

# ──────────────────────────────────────────────────────────────
# TUESDAY: FAQ page targeting People Also Ask / Featured Snippets
# ──────────────────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "2" ]; then
  echo "[TUE] Creating FAQ/answer page..." >> "$LOG_FILE"

  claude --print "You are a content growth agent for International RE (internationalre.org).

YOUR TASK: Create a new FAQ-style page that targets 'People Also Ask' search queries about Latin American real estate.

INSTRUCTIONS:
1. Read existing content in public/blog/ and public/guides/ to avoid duplication.
2. Create the directory public/guides/ if it doesn't exist.
3. Pick ONE topic and write a comprehensive FAQ page with 8-12 questions and detailed answers. Target topics like:
   - 'Buying Property in Costa Rica: Everything You Need to Know'
   - 'Argentina Real Estate FAQ: Prices, Laws & Tips for Foreign Buyers'
   - 'Nicaragua Property Investment: Common Questions Answered'
   - 'Chile Real Estate for Foreigners: Legal Guide & FAQ'
   - 'Latin America Real Estate Tax Guide for US Citizens'
   - 'Best Countries to Buy Beachfront Property in 2026'
   Pick whichever topic does NOT already have a page.
4. Use web search for REAL current data. Every answer must include specific numbers, laws, or practical details.
5. Use the same HTML template as blog posts (nav, footer, subscribe banner, ../styles.css).
6. Add FAQ structured data (JSON-LD FAQPage schema) so Google can show the answers directly in search results.
7. Add the page to public/sitemap.xml.
8. Add internal links FROM this FAQ page TO relevant blog posts, and add a link TO this page from at least one existing blog post.
9. Git add, commit, and push to GitHub." 2>> "$LOG_FILE"

  echo "  FAQ page created and published." >> "$LOG_FILE"
fi

# ──────────────────────────────────────────────────────────────
# WEDNESDAY: Market comparison page with data tables
# ──────────────────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "3" ]; then
  echo "[WED] Creating market comparison page..." >> "$LOG_FILE"

  claude --print "You are a content growth agent for International RE (internationalre.org).

YOUR TASK: Create a data-rich COMPARISON page targeting 'vs' search queries.

INSTRUCTIONS:
1. Read existing content in public/blog/ and public/guides/ to avoid duplication.
2. Create the directory public/guides/ if it doesn't exist.
3. Pick ONE comparison that does NOT already have a page. Rotate through:
   - Country vs Country: 'Costa Rica vs Nicaragua: Where to Buy Property in 2026'
   - City vs City: 'Buenos Aires vs Santiago: Best City for Property Investment'
   - Investment type: 'Beachfront vs City Condo: Latin America Investment Compared'
   - Lifestyle: 'Best Latin American Countries for Retirees — Ranked'
   - Value: 'Cheapest Places to Buy Property in Latin America — 2026 Rankings'
4. Use web search to research REAL current data. Build comparison tables with specific numbers: price per sqm, rental yields, cost of living, visa requirements, property taxes, internet speed, safety index.
5. Use the same HTML template as blog posts. Include at least 2 data tables styled with clean CSS.
6. Add the page to public/sitemap.xml.
7. Add internal links between this page and relevant existing content (both directions).
8. Git add, commit, and push to GitHub.

Make the tables genuinely useful — someone should be able to make a decision based on this data." 2>> "$LOG_FILE"

  echo "  Comparison page created and published." >> "$LOG_FILE"
fi

# ──────────────────────────────────────────────────────────────
# THURSDAY: Improve existing content + internal links + conversion
# ──────────────────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "4" ]; then
  echo "[THU] Improving existing content & internal links..." >> "$LOG_FILE"

  claude --print "You are an SEO content optimizer for International RE (internationalre.org).

YOUR TASK: Improve existing content to rank higher and convert better.

INSTRUCTIONS:
1. Read ALL HTML files in public/, public/blog/, and public/guides/.
2. Pick the 2-3 pages that need the most improvement and do ALL of the following:

CONTENT IMPROVEMENTS:
- Add 1-2 new sections with fresh data (use web search for current 2026 market data)
- Add a 'Related Articles' section at the bottom linking to 3 other pages on the site
- Make sure every page has at least 800 words of content
- Add relevant subheadings (H2/H3) for scannability

SEO IMPROVEMENTS:
- Verify every page has unique, keyword-rich title tags (under 60 chars)
- Verify every page has compelling meta descriptions (150-160 chars)
- Verify every page has Open Graph and Twitter Card tags
- Add JSON-LD Article structured data to any blog post missing it
- Verify all images have descriptive alt text

INTERNAL LINKING:
- Every blog post should link to at least 2 other pages on the site
- Every guide should link to at least 3 other pages
- Add contextual links within body text (not just 'Related' sections)
- Make sure the blog listing page (blog.html) includes links to any new guide pages

CONVERSION:
- Verify every page has the subscribe form/banner
- Make sure CTAs mention the free 2026 Market Entry Guide

3. Update public/sitemap.xml lastmod dates for any modified pages.
4. Git add, commit, and push to GitHub." 2>> "$LOG_FILE"

  echo "  Existing content improved and pushed." >> "$LOG_FILE"
fi

# ──────────────────────────────────────────────────────────────
# FRIDAY: Second blog post of the week
# ──────────────────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "5" ]; then
  echo "[FRI] Creating second weekly blog post..." >> "$LOG_FILE"

  claude --print "You are a blog writer for International RE (internationalre.org).

YOUR TASK: Write and publish a new blog post. This is the SECOND post this week (the first was Monday).

INSTRUCTIONS:
1. Read public/blog.html and all files in public/blog/ to see existing content.
2. Pick a topic that:
   - Has NOT been covered yet
   - Targets a DIFFERENT country/market than Monday's post
   - Rotates writers: Sofia Mendez, James Whitfield, Carolina Vega (pick whoever hasn't written recently)
3. Research current real estate data using web search. Get REAL numbers.
4. Write the blog post (800-1200 words) using the EXACT same HTML template as existing posts in public/blog/.
5. Update public/blog.html: move the current featured post into the grid, make the new post featured.
6. Add the post to public/sitemap.xml.
7. Add internal links: link FROM this post to 2 existing pages, and add a link TO this post from 1 existing page.
8. Use today's date.
9. Git add, commit, and push to GitHub.

Topic ideas to rotate through:
- 'How Digital Nomad Visas Are Changing [Country]'s Real Estate Market'
- 'The Safest Neighborhoods in [City] for Foreign Property Buyers'
- '[Country] Property Tax Guide: What Foreign Owners Pay'
- 'Airbnb vs Long-Term Rental: Where the Numbers Work in [Country]'
- 'New Infrastructure Projects Driving Property Values in [Region]'
- 'Best Time of Year to Buy Property in [Country]'
- 'How to Get Residency Through Real Estate in [Country]'" 2>> "$LOG_FILE"

  echo "  Second weekly blog post published." >> "$LOG_FILE"
fi

# ──────────────────────────────────────────────────────────────
# SATURDAY: Full SEO audit + broken link check + performance
# ──────────────────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "6" ]; then
  echo "[SAT] Running full SEO audit..." >> "$LOG_FILE"

  claude --print "You are a technical SEO auditor for International RE (internationalre.org).

YOUR TASK: Run a comprehensive SEO audit and fix everything automatically.

INSTRUCTIONS:
1. Read ALL HTML files across public/, public/blog/, and public/guides/.
2. Check and fix:

TECHNICAL SEO:
- Every page must have: unique title, meta description, canonical URL, OG tags, Twitter card
- Every page must have JSON-LD structured data (WebPage, Article, or FAQPage as appropriate)
- All internal links must point to valid pages (check for broken links to pages that don't exist)
- Sitemap must list every HTML page on the site with correct URLs

PAGE QUALITY:
- No thin content (every page should have 800+ words)
- All images must have descriptive alt text
- Check that mobile nav toggle works on every page (has the JS)

INDEXING:
- Verify robots.txt allows crawling
- Verify sitemap.xml is well-formed and complete
- Add any missing pages to the sitemap

3. Fix ALL issues you find by editing files directly.
4. Git add, commit, and push to GitHub.
5. Log a summary of what was fixed." 2>> "$LOG_FILE"

  echo "  SEO audit complete." >> "$LOG_FILE"
fi

# ──────────────────────────────────────────────────────────────
# SUNDAY: Evergreen resource page (glossaries, checklists, tools)
# ──────────────────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "7" ]; then
  echo "[SUN] Creating evergreen resource page..." >> "$LOG_FILE"

  claude --print "You are a content growth agent for International RE (internationalre.org).

YOUR TASK: Create a high-value EVERGREEN RESOURCE page — the kind of page people bookmark and share.

INSTRUCTIONS:
1. Read existing content in public/blog/ and public/guides/ to avoid duplication.
2. Create the directory public/guides/ if it doesn't exist.
3. Pick ONE resource type that does NOT already exist. Rotate through:
   - 'Latin America Real Estate Glossary — 100+ Terms Explained' (legal, financial, architectural terms)
   - 'Foreign Buyer Checklist: 15 Steps to Buy Property in Latin America'
   - 'Latin America Real Estate Market Map — Prices by Region 2026'
   - 'Complete Guide to Property Taxes in Latin America by Country'
   - 'Best Latin American Cities for Rental Income — Data-Backed Rankings'
   - 'Visa & Residency Options Through Real Estate Investment — Country by Country'
   - 'Currency Guide for Property Buyers: USD, Pesos, Colones & More'
4. Use web search for REAL data. These pages should be genuinely authoritative.
5. Use the same HTML template as blog posts (nav, footer, subscribe banner).
6. Add JSON-LD structured data appropriate to the content type.
7. Add the page to public/sitemap.xml.
8. Link to this resource from at least 2 existing blog posts (edit them to add a natural link).
9. Add a link to this resource from the About page's 'Explore' sidebar section.
10. Git add, commit, and push to GitHub.

These pages should be so useful that other websites would want to link to them." 2>> "$LOG_FILE"

  echo "  Evergreen resource page published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# DAILY: Homepage freshness — update the homepage with the
#        latest content so it never looks stale
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Updating homepage with latest content..." >> "$LOG_FILE"

claude --print "You are a web developer for International RE (internationalre.org).

YOUR TASK: Keep the homepage fresh by featuring the latest content.

INSTRUCTIONS:
1. Read public/index.html to see the current homepage.
2. Read public/blog.html to see the latest blog posts.
3. Read all files in public/guides/ to see the latest guides.
4. Check if the homepage already has a 'Latest from the Blog' section.
   - If it does NOT exist yet: add a new section after the 'Markets' section that shows the 3 most recent blog posts as cards (image, title, date, short excerpt, link). Use the same card styling as blog.html. Title the section 'Latest from the Blog'.
   - If it DOES already exist: update it to show the 3 most recent posts (check blog.html for the latest). Only make changes if the featured posts are outdated.
5. Check if the homepage has a 'Free Guides' or 'Resources' section.
   - If NOT and there are guides in public/guides/: add a small section after the blog section showing 2-3 featured guides as cards with links.
   - If it exists: update it to feature the most recent/best guides.
6. ONLY make changes if the homepage is actually outdated. If everything is current, do nothing.
7. If you made changes, git add, commit, and push to GitHub." 2>> "$LOG_FILE"

echo "  Homepage freshness check complete." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: Cross-link audit — make sure every new page is
#        connected to the rest of the site
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Running cross-link audit..." >> "$LOG_FILE"

claude --print "You are an internal linking specialist for International RE (internationalre.org).

YOUR TASK: Make sure every page on the site links to and from other relevant pages. Internal links are one of the strongest SEO signals — Google ranks well-connected pages higher.

INSTRUCTIONS:
1. Read ALL HTML files across public/, public/blog/, and public/guides/.
2. Build a mental map of which pages link to which other pages.
3. Find pages that are ORPHANED (no other page links to them) or UNDER-LINKED (only 1 page links to them).
4. For each under-linked page, add 2-3 contextual links to it from relevant existing pages. Insert links naturally within body text, not as a list dump.
5. Find pages that link OUT to very few other pages on the site, and add 2-3 relevant outbound internal links to them.
6. Goal: every page should have at least 3 inbound internal links and at least 2 outbound internal links.
7. ONLY make changes if there are actual linking gaps. If the site is well-linked, do nothing.
8. If you made changes, git add, commit, and push to GitHub." 2>> "$LOG_FILE"

echo "  Cross-link audit complete." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# WEEKLY (Sundays): Refresh stale data in old posts
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "7" ]; then
  echo "[SUN] Refreshing data in oldest content..." >> "$LOG_FILE"

  claude --print "You are a fact-checker and data updater for International RE (internationalre.org).

YOUR TASK: Find the OLDEST blog post or guide on the site and refresh its data so it stays accurate and ranks well.

INSTRUCTIONS:
1. Read all files in public/blog/ and public/guides/.
2. Find the post with the OLDEST date.
3. Use web search to check if any of the key statistics in that post are outdated (prices, yields, laws, regulations, tourism stats).
4. Update any stale data with current 2026 numbers. Add a note like 'Updated [today's date]' near the top of the article.
5. If the article has fewer than 3 internal links, add more.
6. Update the lastmod date in public/sitemap.xml.
7. Git add, commit, and push to GitHub.
8. If the data is still accurate, do nothing." 2>> "$LOG_FILE"

  echo "  Stale data refresh complete." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# BI-WEEKLY (Weeks 2, 4, 6...): Create a topic cluster pillar page
# These are comprehensive 2000+ word hub pages that link to
# all related content — Google LOVES these for topical authority
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "4" ] && [ $((WEEK_OF_YEAR % 2)) -eq 0 ]; then
  echo "[BI-WEEKLY] Creating topic cluster pillar page..." >> "$LOG_FILE"

  claude --print "You are a content strategist for International RE (internationalre.org).

YOUR TASK: Create a comprehensive PILLAR PAGE — a 2000+ word ultimate guide that serves as the hub for a topic cluster.

INSTRUCTIONS:
1. Read ALL content in public/blog/ and public/guides/ to understand what exists.
2. Identify which TOPIC CLUSTER has the most supporting content but no pillar page yet. Topic clusters:
   - 'Costa Rica Real Estate: The Complete Guide' (links to all CR posts/guides)
   - 'Argentina Real Estate: The Complete Guide' (links to all AR posts/guides)
   - 'Nicaragua Real Estate: The Complete Guide' (links to all NI posts/guides)
   - 'Chile Real Estate: The Complete Guide' (links to all CL posts/guides)
   - 'Latin America Real Estate Investment: The Ultimate Guide' (links to everything)
   - 'Expat Property Buying Guide: Latin America Edition'
3. Create the pillar page in public/guides/ with:
   - 2000-2500 words covering the topic comprehensively
   - Table of contents at the top with anchor links
   - Links to EVERY related blog post and guide on the site (embedded naturally in the text)
   - Real data researched via web search
   - JSON-LD Article structured data
   - The subscribe banner
4. Update EVERY blog post and guide that this pillar page covers — add a link back to the pillar page from each one (e.g., 'For our complete guide, see [Pillar Page Title]').
5. Add to sitemap, commit, and push to GitHub.

Pillar pages are the single most important SEO asset. Make this genuinely authoritative." 2>> "$LOG_FILE"

  echo "  Pillar page created." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# MONTHLY (1st of each month): Generate a 'Market Update' post
# summarizing the month's real estate trends across all 4 countries
# ══════════════════════════════════════════════════════════════
DAY_OF_MONTH=$(date +%d)
if [ "$DAY_OF_MONTH" = "01" ]; then
  echo "[MONTHLY] Creating monthly market update..." >> "$LOG_FILE"

  MONTH_NAME=$(date +%B)
  YEAR=$(date +%Y)

  claude --print "You are a market analyst for International RE (internationalre.org).

YOUR TASK: Create a MONTHLY MARKET UPDATE blog post summarizing real estate trends across all 4 countries.

INSTRUCTIONS:
1. Read existing blog posts in public/blog/ to avoid duplication and see the template.
2. Use web search to research the latest real estate news and data for Costa Rica, Nicaragua, Argentina, and Chile.
3. Write a blog post titled '$MONTH_NAME $YEAR Latin America Real Estate Market Update' (by Sofia Mendez).
4. Structure it as:
   - Executive summary (3-4 bullet points of the biggest takeaways)
   - Costa Rica update (prices, developments, regulatory changes)
   - Nicaragua update
   - Argentina update
   - Chile update
   - 'What We're Watching Next Month' section
5. Use the same HTML template as existing blog posts.
6. Update blog.html to feature this as the top post.
7. Add to sitemap.xml, commit, and push to GitHub.

Use REAL data from this month. This should feel like a professional market briefing." 2>> "$LOG_FILE"

  echo "  Monthly market update published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# DAILY: Auto-publish a 'Daily Tip' short-form page on the site
#        These are quick, shareable, social-media-style posts
#        that live on the website and get indexed by Google
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Publishing daily tip page..." >> "$LOG_FILE"

claude --print "You are a social media content creator for International RE (internationalre.org).

YOUR TASK: Create and publish a SHORT-FORM 'DAILY TIP' page directly on the website — like a social media post but on the site so Google indexes it.

INSTRUCTIONS:
1. Read existing files in public/tips/ to avoid duplication.
2. Create public/tips/ directory if it doesn't exist.
3. Create a daily-tip page with:
   - A bold, scroll-stopping headline (like a reel hook)
   - 150-300 words MAX — punchy, fast, visual
   - ONE key takeaway or stat that makes people want to share
   - Large, bold pull-quote or stat block styled for visual impact
   - Subscribe CTA at the bottom
   - Share buttons (Twitter, Facebook, LinkedIn, WhatsApp — use share URLs like https://twitter.com/intent/tweet?text=...&url=...)
   - Use the same nav/footer template as blog posts
   - Add Open Graph tags optimized for social sharing (large image, compelling title)
   - Add max-image-preview:large meta for Google Discover
4. Topic ideas (rotate daily):
   - 'Did you know? Foreigners have full property rights in Costa Rica'
   - 'Buenos Aires apartments cost \$1,200/sqm — Manhattan costs \$15,000'
   - 'Nicaragua rental yields hit 12% — here is where to invest'
   - '3 things your lawyer should check before buying in Chile'
   - 'The #1 mistake expats make buying property abroad'
   - 'This Costa Rica town has 10%+ Airbnb yields'
   - 'You can buy a beachfront lot in Nicaragua for \$45K'
   Use REAL data from web search. Never make up numbers.
5. File name: tip-${DATE}.html
6. Add to sitemap.xml.
7. Update a tips index page at public/tips.html (create if needed — grid of all tips, newest first).
8. Make sure the navbar includes a 'Tips' link on ALL pages.
9. Git add, commit, and push.

These tip pages are designed to be shared on social media — each one is a mini-post that drives traffic back to the site." 2>> "$LOG_FILE"

echo "  Daily tip published." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: Create Spanish-language version of newest content
#        Doubles the keyword surface — targets "bienes raices
#        Costa Rica", "comprar propiedad Argentina", etc.
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Creating Spanish content..." >> "$LOG_FILE"

claude --print "You are a bilingual content translator for International RE (internationalre.org).

YOUR TASK: Create a Spanish-language version of the most recent blog post or guide that does NOT already have a Spanish version.

INSTRUCTIONS:
1. Read all files in public/blog/ and public/guides/.
2. Check if a directory public/es/ exists. If not, create public/es/blog/ and public/es/guides/.
3. Find the most recent English page (by date) that does NOT have a corresponding file in public/es/blog/ or public/es/guides/.
4. Translate it into natural, fluent Latin American Spanish. Do NOT just machine-translate — write it like a native Spanish-speaking real estate journalist would.
5. Adapt SEO metadata for Spanish:
   - Spanish title tag targeting Spanish search queries
   - Spanish meta description with Spanish keywords
   - Spanish OG tags
   - Add hreflang tags to BOTH the English and Spanish versions (link them to each other)
6. Keep the same HTML template but change the nav to include both language options.
7. Add the Spanish page to public/sitemap.xml.
8. Git add, commit, and push to GitHub.
9. If ALL pages already have Spanish versions, do nothing.

Spanish real estate searches are a MASSIVE untapped keyword market." 2>> "$LOG_FILE"

echo "  Spanish content task complete." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: Generate micro-landing pages for hyper-specific
#        long-tail search queries that have almost zero competition
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Creating micro-landing page..." >> "$LOG_FILE"

claude --print "You are a long-tail SEO specialist for International RE (internationalre.org).

YOUR TASK: Create ONE hyper-specific micro-landing page targeting a long-tail search query with very low competition.

INSTRUCTIONS:
1. Read all files in public/blog/, public/guides/, and public/landing/ to see what exists.
2. Create public/landing/ directory if it doesn't exist.
3. Pick ONE very specific search query that a real buyer would type into Google. Examples:
   - 'How much does a 2 bedroom condo cost in Tamarindo Costa Rica'
   - 'Can a Canadian buy beachfront property in Nicaragua'
   - 'Best areas to buy rental property in Buenos Aires for Airbnb'
   - 'Costa Rica vs Panama for retirement real estate'
   - 'How to wire money to buy property in Argentina'
   - 'Property closing costs in Chile for foreigners'
   - 'Is it safe to buy property in Managua Nicaragua'
   - 'Average rental yield Valparaiso Chile 2026'
   - 'Do I need a lawyer to buy property in Costa Rica'
   - 'Best gated communities in Guanacaste for families'
   - 'How to get residency in Nicaragua through property investment'
   - 'Lake District Chile real estate prices per square meter'
   DO NOT duplicate any topic that already has a page.
4. Use web search to research REAL, specific data to answer that exact query.
5. Create a 600-900 word page that directly answers the query in the first paragraph (for Google Featured Snippets), then provides in-depth supporting detail.
6. Use the same HTML template as blog posts (nav, footer, subscribe banner).
7. Include JSON-LD structured data.
8. Add the page to public/sitemap.xml.
9. Link to this page from the most relevant existing blog post or guide.
10. Git add, commit, and push to GitHub.

These pages target queries that big real estate sites ignore — that's how a small site wins on Google." 2>> "$LOG_FILE"

echo "  Micro-landing page task complete." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: Create/update a 'Market Data Dashboard' page with
#        current prices, yields, and trends — the kind of page
#        investors bookmark and check weekly
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Updating market data dashboard..." >> "$LOG_FILE"

claude --print "You are a data analyst for International RE (internationalre.org).

YOUR TASK: Create or update a MARKET DATA DASHBOARD page at public/guides/market-data-dashboard.html.

INSTRUCTIONS:
1. Check if public/guides/market-data-dashboard.html exists. If not, create it.
2. Use web search to find the LATEST real estate market data for all 4 countries.
3. The page should contain data tables showing:
   - Average price per sqm by city (at least 3 cities per country)
   - Average rental yields by city
   - Year-over-year price change percentages
   - Average days on market
   - Foreign buyer restrictions summary
   - Currency exchange rates (USD to local currency)
4. If the page already exists, UPDATE the numbers with the freshest data available. Add a 'Last updated: [today's date]' timestamp at the top.
5. Use clean, styled HTML tables. Use the same template as other pages (nav, footer, subscribe).
6. Add JSON-LD Dataset structured data.
7. Add to sitemap if new. Update lastmod if updated.
8. Git add, commit, and push if changes were made.
9. If the data hasn't changed since last update, do nothing.

This is the single most bookmarkable page on the site — investors will return to it weekly." 2>> "$LOG_FILE"

echo "  Market data dashboard task complete." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# TUESDAY & THURSDAY: Generate 'investor case study' pages
#        Real-world-style investment scenarios with ROI math
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "2" ] || [ "$DAY_OF_WEEK" = "4" ]; then
  echo "[TUE/THU] Creating investor case study page..." >> "$LOG_FILE"

  claude --print "You are a real estate investment analyst for International RE (internationalre.org).

YOUR TASK: Create a detailed INVESTOR CASE STUDY page showing a realistic property investment scenario.

INSTRUCTIONS:
1. Read existing content in public/blog/, public/guides/, and public/case-studies/ to avoid duplication.
2. Create public/case-studies/ directory if it doesn't exist.
3. Pick ONE specific investment scenario that hasn't been covered. Examples:
   - 'I Bought a 2BR Condo in Tamarindo for \$180K — Here's My Year 1 ROI'
   - 'Buenos Aires Rental Property: \$65K Investment, \$850/Month Income'
   - 'Building a Vacation Rental Portfolio in San Juan del Sur'
   - 'Buying a Vineyard Estate in Mendoza: Costs, Returns & Lifestyle'
   - 'Santiago Apartment Investment: Airbnb vs Long-Term Rental Numbers'
   - 'Retirement Property in Lake Atitlan: What \$150K Gets You'
   - 'Flipping Property in Nosara Costa Rica: 18-Month Case Study'
4. Use web search for REAL current prices, rental rates, and costs. Build a detailed financial breakdown:
   - Purchase price and closing costs
   - Monthly expenses (HOA, property tax, insurance, management, utilities)
   - Monthly rental income (high season, low season, occupancy rate)
   - Annual ROI calculation
   - 5-year appreciation projection
5. Format with clear tables and numbers. Use the same HTML template.
6. Add JSON-LD Article structured data.
7. Add to sitemap. Add internal links to/from relevant content.
8. Git add, commit, and push.

Investors LOVE concrete numbers. These pages convert browsers into subscribers." 2>> "$LOG_FILE"

  echo "  Case study published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# MONDAY & WEDNESDAY & FRIDAY: Generate email newsletter and
#        auto-send to all subscribers via the server API
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "1" ] || [ "$DAY_OF_WEEK" = "3" ] || [ "$DAY_OF_WEEK" = "5" ]; then
  echo "[MWF] Generating subscriber email content..." >> "$LOG_FILE"

  mkdir -p "$PROJECT_DIR/growth-output"

  claude --print "You are an email marketing specialist for International RE (internationalre.org).

YOUR TASK: Generate a ready-to-send email newsletter that highlights the latest content and drives subscribers back to the site.

INSTRUCTIONS:
1. Read the 3 most recent blog posts in public/blog/ and the 2 most recent guides in public/guides/.
2. Write an engaging email newsletter (250-400 words) with:
   - A compelling subject line that drives opens (use curiosity, numbers, or urgency)
   - A personal opening hook (1-2 sentences, conversational)
   - Featured article: summarize the newest blog post with a 'Read More' link
   - Quick hits: 2-3 bullet points linking to other recent content
   - A market stat or fact that makes readers feel informed
   - CTA: 'Know someone investing in Latin America? Forward this email.'
   - PS: tease upcoming content
3. Format the output as a clean, simple HTML email with inline styles.
   - Single column, max-width 600px
   - Use the brand colors: navy (#0a1628), gold (#c9a84c), cream (#f8f5ef)
   - Mobile-friendly (no complex layouts)
   - Include the International RE logo text at top
   - Include unsubscribe placeholder at bottom
4. Save the file to: $PROJECT_DIR/growth-output/newsletter-$(date +%Y-%m-%d).html

This newsletter keeps subscribers engaged and drives repeat traffic to the site." > "$PROJECT_DIR/growth-output/newsletter-${DATE}.html" 2>> "$LOG_FILE"

  echo "  Newsletter draft saved." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# WEEKLY (Wednesdays): Create an interactive tool/calculator page
#        These get shared heavily and attract backlinks
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "3" ]; then
  echo "[WED] Creating interactive tool page..." >> "$LOG_FILE"

  claude --print "You are a web developer and real estate expert for International RE (internationalre.org).

YOUR TASK: Create an INTERACTIVE TOOL page with JavaScript that provides genuine utility to property buyers.

INSTRUCTIONS:
1. Read existing content in public/guides/ and public/tools/ to avoid duplication.
2. Create public/tools/ directory if it doesn't exist.
3. Pick ONE tool that doesn't already exist. Rotate through:
   - 'Rental Yield Calculator' — input purchase price, monthly rent, expenses → get gross & net yield
   - 'Property Investment ROI Calculator' — input price, down payment, rental income, appreciation rate → 5/10 year returns
   - 'Cost of Living Comparison Tool' — dropdown to compare 2 cities side by side across categories
   - 'Currency Converter for Property Buyers' — convert USD to CRC, NIO, ARS, CLP with property-specific context
   - 'Closing Cost Estimator by Country' — select country, input price → estimated total closing costs breakdown
   - 'Mortgage Affordability Calculator' — income, debts, rate → what you can afford in each country
   - 'Rental Income Estimator' — select city & property type → estimated monthly income range
4. Build the tool as a single HTML page with embedded JavaScript. No external dependencies.
5. Make it genuinely functional — real calculations, not just a form that goes nowhere.
6. Use the same page template (nav, footer, subscribe banner).
7. Style the tool with clean, modern CSS that matches the site's design.
8. Add JSON-LD SoftwareApplication structured data.
9. Add to sitemap. Link from at least 2 relevant blog posts/guides.
10. Git add, commit, and push.

Interactive tools get shared on social media and linked to from other sites — they're backlink magnets." 2>> "$LOG_FILE"

  echo "  Interactive tool published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# WEEKLY (Saturdays): Create a 'news roundup' post pulling
#        the latest real estate headlines for all 4 countries
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "6" ]; then
  echo "[SAT] Creating weekly news roundup..." >> "$LOG_FILE"

  WEEK_START=$(date -v-6d +%B\ %d)
  WEEK_END=$(date +%B\ %d,\ %Y)

  claude --print "You are a real estate news curator for International RE (internationalre.org).

YOUR TASK: Create a weekly news roundup blog post covering the latest Latin American real estate news.

INSTRUCTIONS:
1. Read existing blog posts in public/blog/ for the template.
2. Use web search to find 8-12 real estate news stories from the past week about Costa Rica, Nicaragua, Argentina, and Chile. Search for:
   - New development projects announced
   - Government policy or regulation changes affecting property
   - Tourism statistics that impact rental markets
   - Infrastructure projects (airports, highways, ports)
   - Foreign investment trends
   - Notable property sales or market milestones
3. Write a blog post titled 'Latin America Real Estate News Roundup: $WEEK_START – $WEEK_END' (by Carolina Vega).
4. Structure: brief 2-3 sentence summary of each news item with context on why it matters to investors. Group by country.
5. Use the same blog post HTML template.
6. Update blog.html to feature as the top post.
7. Add to sitemap, commit, and push.

News roundups drive repeat weekly visits — readers come back every Saturday." 2>> "$LOG_FILE"

  echo "  Weekly news roundup published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# WEEKLY (Fridays): Generate a 'property spotlight' page
#        featuring a specific real listing or property type
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "5" ]; then
  echo "[FRI] Creating property spotlight page..." >> "$LOG_FILE"

  claude --print "You are a real estate content creator for International RE (internationalre.org).

YOUR TASK: Create a PROPERTY SPOTLIGHT page that showcases a specific type of property in one of our 4 markets.

INSTRUCTIONS:
1. Read existing content in public/blog/ and public/spotlights/ to avoid duplication.
2. Create public/spotlights/ directory if it doesn't exist.
3. Pick ONE property type + location combo. Examples:
   - 'Ocean-View Condos Under \$200K in Tamarindo, Costa Rica'
   - 'Colonial Homes in San Telmo, Buenos Aires — What \$100K Buys'
   - 'Beachfront Lots in San Juan del Sur Starting at \$50K'
   - 'Modern Apartments in Las Condes, Santiago — \$150K-\$300K'
   - 'Jungle Homes Near Nosara: Surf & Invest'
   - 'Vineyard Properties in Mendoza Under \$250K'
   - 'Lakefront Cabins in Chile\'s Lake District'
4. Use web search to find REAL current listings data — actual price ranges, sizes, amenities, neighborhoods.
5. Write 800-1000 words describing what buyers can expect: price ranges, typical features, neighborhood vibe, rental potential, lifestyle benefits.
6. Use the same blog post HTML template. Include Unsplash images for the hero.
7. Add JSON-LD RealEstateListing structured data.
8. Add to sitemap. Link from relevant blog posts.
9. Git add, commit, and push.

These pages target buyers who are ready to act — highest intent traffic." 2>> "$LOG_FILE"

  echo "  Property spotlight published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# MONTHLY (15th): Create a 'Top 10' or 'Best of' listicle
#        Listicles are the most shared content format on the internet
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_MONTH" = "15" ]; then
  echo "[MONTHLY] Creating Top 10 listicle..." >> "$LOG_FILE"

  claude --print "You are a content creator for International RE (internationalre.org).

YOUR TASK: Create a 'Top 10' or 'Best of' listicle blog post — the most shareable content format on the internet.

INSTRUCTIONS:
1. Read existing blog posts to avoid duplication.
2. Pick ONE listicle topic that hasn't been done. Rotate through:
   - '10 Best Beach Towns in Latin America to Buy Property in 2026'
   - '10 Cheapest Places to Buy a Home in Central & South America'
   - 'Top 10 Latin American Cities for Digital Nomads Who Want to Invest'
   - '10 Things I Wish I Knew Before Buying Property in Costa Rica'
   - '10 Best Neighborhoods in Buenos Aires for Foreign Investors'
   - 'Top 10 Mistakes Foreign Buyers Make in Latin American Real Estate'
   - '10 Latin American Properties Under \$100K That Are Actually Worth It'
3. Use web search for real data to back each item.
4. Write 1200-1500 words. Each item gets: a heading, 100-word description, key stats, and a link to relevant content on the site.
5. Use the same blog post HTML template.
6. Update blog.html, add to sitemap, commit, and push.

Listicles get shared on social media more than any other format." 2>> "$LOG_FILE"

  echo "  Listicle published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# DAILY: Generate social media reel scripts + short posts
#        Saved to growth-output/social/ — ready to copy-paste
#        or read directly into CapCut/Canva for reel creation
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Generating social media reel scripts & posts..." >> "$LOG_FILE"

mkdir -p "$PROJECT_DIR/growth-output/social"

claude --print "You are a viral social media content creator for International RE (internationalre.org).

YOUR TASK: Generate a FULL DAY's worth of social media content — reel scripts and short posts — ready to post across all platforms.

INSTRUCTIONS:
1. Read the 3 most recent blog posts in public/blog/ and guides in public/guides/ for content to repurpose.
2. Read existing files in growth-output/social/ to avoid repeating the same content.
3. Create ALL of the following and save them in one markdown file:

═══ INSTAGRAM/TIKTOK REELS (3 scripts) ═══
For each reel, provide:
- HOOK (first 2 seconds — the text that appears on screen to stop the scroll. Must be shocking, curious, or bold. Examples: 'You can buy a beach house for \$89K', 'This country lets Americans buy property with ZERO restrictions', 'I found apartments in Buenos Aires for \$45K')
- SCRIPT (15-30 seconds of voiceover text, punchy and fast-paced)
- TEXT OVERLAYS (exactly what text to show on screen at each moment)
- CAPTION (engaging caption with 20-30 hashtags)
- CTA ('Link in bio for our free guide' or 'Follow for more Latin America real estate tips')
- TRENDING AUDIO SUGGESTION (describe the vibe: upbeat, dramatic reveal, chill travel, etc.)

Reel topics to rotate through:
- 'What \$X gets you in [Country]' (show price comparisons)
- 'POV: You just bought property in [Country]' (lifestyle content)
- '3 things nobody tells you about buying in [Country]'
- 'This [Country] town has [X]% rental yields'
- 'I compared property prices in 4 countries — here's what I found'
- 'Why [Country] is the #1 place to invest right now'
- 'Rich people are quietly buying property here'
- 'Stop renting. Here's what a mortgage costs in [Country]'

═══ TWITTER/X POSTS (5 tweets) ═══
- Each under 280 characters
- Mix: 1 hot take, 1 data point, 1 question, 1 thread starter, 1 CTA
- Include hashtags: #RealEstate #LatinAmerica #PropertyInvestment #CostaRica #ExpatLife etc.
- Thread starter should have '1/' and set up a 5-part thread

═══ LINKEDIN POSTS (2 posts) ═══
- 100-200 words each, professional but engaging
- Start with a bold first line (LinkedIn shows first 2 lines before 'see more')
- Include a data-driven insight
- End with a question to drive comments
- Include link to blog post

═══ FACEBOOK POSTS (2 posts) ═══
- 50-150 words, conversational and shareable
- Include a question or 'tag someone who...' prompt
- Link to website

═══ PINTEREST PINS (3 descriptions) ═══
- 200-300 word descriptions (Pinterest is a search engine — longer = better)
- Include keywords: Latin America real estate, buy property abroad, expat living, beach house, investment property
- Suggest an image style (infographic, property photo, comparison chart, etc.)
- Each pin should link to a specific page on the site

═══ YOUTUBE SHORTS SCRIPTS (2 scripts) ═══
- 30-60 seconds each
- Same format as reel scripts but slightly longer
- Include suggested title, description, and tags

4. Use REAL data and specific numbers from the blog posts — never be vague.
5. Make the hooks SCROLL-STOPPING. Think about what makes someone pause on their phone.
6. Save to: growth-output/social/social-content-${DATE}.md" > "$PROJECT_DIR/growth-output/social/social-content-${DATE}.md" 2>> "$LOG_FILE"

echo "  Social media content pack generated." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: Generate PRODUCTION-READY TikTok/Reels video scripts
#        with scene-by-scene breakdowns so you can film or
#        use CapCut/Canva to produce them in minutes
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Generating TikTok/Reels video scripts..." >> "$LOG_FILE"

mkdir -p "$PROJECT_DIR/growth-output/videos"

claude --print "You are a viral TikTok and Instagram Reels video producer for International RE (internationalre.org).

YOUR TASK: Generate 5 PRODUCTION-READY video scripts for TikTok and Instagram Reels. These should be so detailed that someone can produce the video in 10 minutes using CapCut, Canva, or just their phone.

INSTRUCTIONS:
1. Read the 3 most recent blog posts in public/blog/ and guides in public/guides/ for real data.
2. Read existing files in growth-output/videos/ to avoid repeating topics.
3. Create 5 video scripts in one markdown file. For EACH video:

═══ VIDEO [number]: [Title] ═══

PLATFORM: TikTok + Instagram Reels + YouTube Shorts
DURATION: [15/30/60] seconds
FORMAT: Vertical 9:16

HOOK (0-2 seconds):
- ON-SCREEN TEXT: [exact bold text shown — this is what stops the scroll]
- VISUAL: [describe exactly what's on screen: stock footage of beach, text animation, face-to-camera, property photos, etc.]
- AUDIO: [voiceover line or trending sound description]

SCENE 1 (2-8 seconds):
- ON-SCREEN TEXT: [exact text overlay]
- VISUAL: [specific stock footage description or what to film — e.g., 'aerial beach drone shot', 'screenshot of property listing', 'text reveal animation']
- VOICEOVER: '[exact words to say]'

SCENE 2 (8-15 seconds):
- ON-SCREEN TEXT: [exact text overlay]
- VISUAL: [specific description]
- VOICEOVER: '[exact words]'

SCENE 3 (15-22 seconds):
- ON-SCREEN TEXT: [exact text overlay]
- VISUAL: [specific description]
- VOICEOVER: '[exact words]'

CTA SCENE (final 3-5 seconds):
- ON-SCREEN TEXT: 'Follow @RealEstate_IRE for more' + 'Link in bio: internationalre.org'
- VISUAL: [logo or subscribe animation]
- VOICEOVER: 'Follow for more and grab our free guide — link in bio.'

CAPTION: [full caption with line breaks and emojis for engagement]
HASHTAGS: [15-20 relevant hashtags]
BEST TIME TO POST: [specific time like '9am EST Tuesday' based on when real estate content performs best]
TRENDING AUDIO: [specific song name or describe the audio style]
ESTIMATED VIEWS: [what similar content typically gets]

═══ VIDEO TOPICS — rotate through these categories: ═══

1. PRICE REVEAL (highest engagement format):
   'What \$X buys you in [Country]' — show 3-4 properties at different price points
   Film: screenshot property listings or use Canva slides with Unsplash images

2. MYTH BUSTING (drives comments/shares):
   'STOP believing this about [Country] real estate' — debunk a common misconception
   Film: face-to-camera or text-on-screen

3. COMPARISON (very shareable):
   '[Country] vs [Country] — which is better for investors?'
   Film: split-screen comparison with text and numbers

4. STORYTIME/POV (builds connection):
   'POV: You just bought your dream property in [Country]'
   Film: lifestyle footage, property tours, sunset shots

5. DATA DROP (positions as expert):
   'The numbers nobody talks about in [Country] real estate'
   Film: animated stats, charts, or text reveals

═══ ALSO GENERATE: ═══

3 x TWITTER VIDEO DESCRIPTIONS (for posting video clips to Twitter):
- Under 280 chars + link to internationalre.org
- Designed to make people click through

2 x TIKTOK CAROUSEL IDEAS (static image slideshows — no filming needed):
- 5-7 slides each
- Exact text for each slide
- Topic + data from blog posts
- These are the EASIEST content to produce — just text on images in Canva

4. ALL numbers and data must be REAL — pulled from the blog posts.
5. Save to: growth-output/videos/video-scripts-${DATE}.md" > "$PROJECT_DIR/growth-output/videos/video-scripts-${DATE}.md" 2>> "$LOG_FILE"

echo "  TikTok/Reels video scripts generated." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: Auto-create a Twitter thread (long-form content that
#        gets massive reach on X/Twitter). Saved as ready-to-post.
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Generating Twitter thread..." >> "$LOG_FILE"

mkdir -p "$PROJECT_DIR/growth-output/threads"

claude --print "You are a viral Twitter/X thread writer for International RE (internationalre.org).

YOUR TASK: Write ONE viral Twitter thread (8-12 tweets) based on the latest blog content. Threads get 10x more reach than single tweets.

INSTRUCTIONS:
1. Read the 2 most recent blog posts in public/blog/ for real data.
2. Read existing files in growth-output/threads/ to avoid repeating topics.
3. Write a thread with this structure:

TWEET 1 (THE HOOK — most important tweet):
[Bold, curiosity-driving opening. Must make people click 'Show this thread'. Examples:]
- 'I analyzed property prices in 4 Latin American countries. Here's what I found (thread):'
- 'You can buy a beach house in Central America for less than a used car costs in the US. Here are the numbers:'
- 'Most Americans don't know they can buy property in these 4 countries with FULL ownership rights. A breakdown:'

TWEETS 2-10 (THE VALUE):
- One key insight per tweet
- Include specific numbers (\$ amounts, percentages, yields)
- Use line breaks for readability
- Add relevant images/charts description [in brackets]

TWEET 11 (THE CTA):
'If you found this useful:
1. Follow @RealEstate_IRE for weekly insights
2. Grab our free 2026 Market Guide: internationalre.org
3. RT tweet 1 to help others discover this'

TWEET 12 (THE ENGAGEMENT DRIVER):
[Ask a question to drive replies: 'Which country would YOU invest in? Reply below.']

FORMAT: Number each tweet clearly (1/, 2/, 3/, etc.)
HASHTAGS: Only on tweet 1 and the final tweet (3-5 max)
THREAD TOPIC: Rotate through — price analysis, country comparison, investment strategy, myth-busting, step-by-step guide

Save to: growth-output/threads/thread-${DATE}.md" > "$PROJECT_DIR/growth-output/threads/thread-${DATE}.md" 2>> "$LOG_FILE"

echo "  Twitter thread generated." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: MASSIVE KEYWORD EXPANSION — Create 5 keyword-targeted
#        pages per day across every major search engine worldwide
#        Google, Bing, Yahoo, Yandex, DuckDuckGo, Baidu, Naver,
#        Ecosia, Brave Search, AOL, Ask.com
#        = 35 new keyword pages per week = 1,800+ per year
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Starting massive keyword expansion (5 pages)..." >> "$LOG_FILE"

# ─── KEYWORD PAGE 1: Buyer Intent (people ready to purchase) ───
claude --print "You are a global SEO keyword strategist for International RE (internationalre.org).

YOUR TASK: Create ONE page targeting a BUYER INTENT keyword — someone who is ready to purchase property.

INSTRUCTIONS:
1. Read all existing files across public/blog/, public/guides/, public/landing/, public/case-studies/, public/spotlights/, public/tools/ to see what exists. DO NOT duplicate.
2. Create public/landing/ if it doesn't exist.
3. Target ONE of these buyer-intent keyword patterns (pick one that has NO page yet):
   - 'buy property in Costa Rica as American'
   - 'buy property in Nicaragua as foreigner'
   - 'buy apartment Buenos Aires as US citizen'
   - 'buy house in Chile as Canadian'
   - 'buy beachfront property Costa Rica'
   - 'buy rental property Buenos Aires'
   - 'invest in Costa Rica real estate 2026'
   - 'invest in Argentina real estate'
   - 'invest in Nicaragua real estate'
   - 'invest in Chile real estate 2026'
   - 'homes for sale Tamarindo Costa Rica under 200K'
   - 'condos for sale Buenos Aires under 100K'
   - 'beachfront property San Juan del Sur Nicaragua'
   - 'property for sale Santiago Chile foreigners'
   - 'buy land in Costa Rica foreigner'
   - 'buy condo Nosara Costa Rica'
   - 'cheap property Latin America for sale'
   - 'buy vacation home Costa Rica'
   - 'buy investment property Argentina cheap'
   - 'beach houses for sale Nicaragua'
   - 'buy vineyard Mendoza Argentina'
   - 'buy property abroad from USA'
   - 'overseas property investment for Americans'
   - 'international real estate for sale 2026'
   - 'buy property Central America best country'
   - 'buy property South America best country'
   - 'buy property in Latin America'
   - 'affordable international real estate'
   - 'buy property overseas with USD'
   - 'best country to buy property as American 2026'
4. Use web search for REAL current data. Include specific prices, legal requirements, and steps.
5. Create a 600-1000 word page in public/landing/.
6. Include: title tag with exact keyword, meta description, JSON-LD, OG tags, canonical URL, H1 matching keyword, first paragraph answers the query directly.
7. Internal links to 3+ other pages. Subscribe form. Add to sitemap.
8. Git add, commit, push." 2>> "$LOG_FILE"

echo "  Keyword page 1 (buyer intent) created." >> "$LOG_FILE"

# ─── KEYWORD PAGE 2: Nationality-specific (target different countries' buyers) ───
claude --print "You are a global SEO strategist for International RE (internationalre.org).

YOUR TASK: Create ONE page targeting buyers from a SPECIFIC NATIONALITY searching for Latin American property.

INSTRUCTIONS:
1. Read all existing content to avoid duplication.
2. Create a page in public/landing/ targeting ONE of these nationality-specific keywords (pick one with NO existing page):
   - 'buying property in Costa Rica as a British citizen'
   - 'buying property in Argentina as Australian'
   - 'buying property in Nicaragua as European'
   - 'buying property in Chile as German'
   - 'can British citizens buy property in Costa Rica'
   - 'can Canadians buy property in Argentina'
   - 'can Europeans buy property in Nicaragua'
   - 'can Australians buy property in Chile'
   - 'UK citizens buying property in Latin America'
   - 'Canadian buying property in Central America'
   - 'German investors buying property Costa Rica'
   - 'French buying property South America'
   - 'Dutch buying property Latin America'
   - 'Irish buying property abroad Latin America'
   - 'Scandinavian buying property Central America'
   - 'Japanese investors Latin American real estate'
   - 'Middle Eastern investors Latin American property'
   - 'South African buying property Costa Rica'
   - 'New Zealand citizens buying property abroad'
   - 'Israeli investors buying property Argentina'
   - 'Indian NRI buying property Latin America'
   - 'Chinese investors Latin American real estate 2026'
   - 'Korean investors buying property in Chile'
   - 'Swiss buying property in Costa Rica'
   - 'Singaporean investing in Latin America property'
3. Research the SPECIFIC legal requirements, tax implications, and considerations for that nationality.
4. Include: visa requirements, tax treaties, currency transfer rules, property rights for that nationality.
5. 600-1000 words. JSON-LD, OG tags, canonical URL, internal links, subscribe form.
6. Add to sitemap. Git add, commit, push." 2>> "$LOG_FILE"

echo "  Keyword page 2 (nationality-specific) created." >> "$LOG_FILE"

# ─── KEYWORD PAGE 3: City/Neighborhood level (hyperlocal SEO) ───
claude --print "You are a hyperlocal SEO specialist for International RE (internationalre.org).

YOUR TASK: Create ONE page targeting a SPECIFIC CITY or NEIGHBORHOOD keyword with very low competition.

INSTRUCTIONS:
1. Read all existing content to avoid duplication.
2. Create a page in public/landing/ targeting ONE hyperlocal keyword (pick one with NO existing page):

   COSTA RICA cities/neighborhoods:
   - 'real estate Tamarindo Costa Rica' / 'property prices Tamarindo'
   - 'real estate Nosara Costa Rica' / 'buy property Nosara'
   - 'real estate Santa Teresa Costa Rica'
   - 'real estate Jaco Costa Rica'
   - 'real estate Papagayo Costa Rica'
   - 'real estate Flamingo Beach Costa Rica'
   - 'real estate Playas del Coco Costa Rica'
   - 'real estate Ojochal Costa Rica'
   - 'real estate Atenas Costa Rica retire'
   - 'real estate Grecia Costa Rica'
   - 'real estate Escazu Costa Rica'
   - 'real estate San Ramon Costa Rica'

   NICARAGUA cities/neighborhoods:
   - 'real estate San Juan del Sur Nicaragua'
   - 'real estate Granada Nicaragua'
   - 'real estate Leon Nicaragua'
   - 'real estate Managua Nicaragua'
   - 'real estate Emerald Coast Nicaragua'
   - 'real estate Tola Nicaragua'
   - 'real estate Corn Islands Nicaragua'

   ARGENTINA cities/neighborhoods:
   - 'real estate Palermo Buenos Aires'
   - 'real estate Recoleta Buenos Aires'
   - 'real estate San Telmo Buenos Aires'
   - 'real estate Belgrano Buenos Aires'
   - 'real estate Mendoza city Argentina'
   - 'real estate Bariloche Argentina'
   - 'real estate Cordoba Argentina'
   - 'real estate Salta Argentina'
   - 'real estate Tigre Buenos Aires'
   - 'real estate Puerto Madero Buenos Aires'

   CHILE cities/neighborhoods:
   - 'real estate Providencia Santiago Chile'
   - 'real estate Las Condes Santiago'
   - 'real estate Vitacura Santiago'
   - 'real estate Nunoa Santiago Chile'
   - 'real estate Valparaiso Chile'
   - 'real estate Vina del Mar Chile'
   - 'real estate Pucon Chile'
   - 'real estate Puerto Varas Chile'
   - 'real estate La Serena Chile'
   - 'real estate Concepcion Chile'

3. Use web search for REAL data: price per sqm, typical property types, neighborhood character, rental yields, expat community, walkability, safety.
4. 600-1000 words. Include all SEO elements. Add to sitemap. Internal links. Subscribe form.
5. Git add, commit, push." 2>> "$LOG_FILE"

echo "  Keyword page 3 (hyperlocal) created." >> "$LOG_FILE"

# ─── KEYWORD PAGE 4: Question-based / How-to (Featured Snippet targets) ───
claude --print "You are a Featured Snippet SEO specialist for International RE (internationalre.org).

YOUR TASK: Create ONE page targeting a QUESTION-BASED keyword — optimized to win Google's Featured Snippet (position zero).

INSTRUCTIONS:
1. Read all existing content to avoid duplication.
2. Create a page in public/guides/ or public/landing/ targeting ONE question keyword (pick one with NO existing page):
   - 'how to buy property in Costa Rica step by step'
   - 'how to buy property in Argentina as foreigner'
   - 'how to buy property in Nicaragua'
   - 'how to buy property in Chile as American'
   - 'how much does it cost to buy property in Costa Rica'
   - 'how much does it cost to buy property in Argentina'
   - 'how much are closing costs in Costa Rica'
   - 'how much are closing costs in Chile'
   - 'what do I need to buy property in Costa Rica'
   - 'what documents do I need to buy property abroad'
   - 'is it safe to buy property in Nicaragua'
   - 'is it safe to invest in Argentina real estate'
   - 'is Costa Rica a good place to invest in real estate'
   - 'is Chile a good place to buy property'
   - 'where is the cheapest place to buy beachfront property'
   - 'where to buy property in Latin America 2026'
   - 'where to retire in Central America on a budget'
   - 'where to invest in real estate outside the US'
   - 'why are people buying property in Costa Rica'
   - 'why is Buenos Aires property so cheap'
   - 'when is the best time to buy property in Costa Rica'
   - 'when is the best time to buy property in Argentina'
   - 'how to get residency in Costa Rica through property'
   - 'how to get residency in Nicaragua'
   - 'how to send money to buy property in Argentina'
   - 'how to find a real estate lawyer in Costa Rica'
   - 'how to do due diligence on property in Latin America'
   - 'what are property taxes in Costa Rica'
   - 'what are the risks of buying property abroad'
   - 'what is the ROI on rental property in Costa Rica'
3. CRITICAL: The first paragraph MUST directly answer the question in 2-3 sentences (this is what Google shows in Featured Snippets).
4. Then provide detailed supporting content (600-1000 words).
5. Use FAQ structured data. Include all SEO elements. Add to sitemap. Internal links.
6. Git add, commit, push." 2>> "$LOG_FILE"

echo "  Keyword page 4 (question/how-to) created." >> "$LOG_FILE"

# ─── KEYWORD PAGE 5: Comparison / Alternative keywords ───
claude --print "You are a comparison SEO specialist for International RE (internationalre.org).

YOUR TASK: Create ONE page targeting a COMPARISON or ALTERNATIVE keyword — people weighing options before buying.

INSTRUCTIONS:
1. Read all existing content to avoid duplication.
2. Create a page in public/guides/ or public/landing/ targeting ONE comparison keyword (pick one with NO existing page):

   COUNTRY VS COUNTRY:
   - 'Costa Rica vs Mexico for real estate investment'
   - 'Costa Rica vs Panama property investment'
   - 'Costa Rica vs Colombia real estate'
   - 'Argentina vs Uruguay real estate investment'
   - 'Chile vs Peru real estate investment'
   - 'Nicaragua vs Honduras real estate'
   - 'Costa Rica vs Portugal real estate for Americans'
   - 'Latin America vs Southeast Asia real estate'
   - 'Latin America vs Europe for property investment'
   - 'Central America vs South America real estate'

   CITY VS CITY:
   - 'Tamarindo vs Nosara Costa Rica real estate'
   - 'Buenos Aires vs Montevideo property'
   - 'Santiago vs Lima real estate'
   - 'San Juan del Sur vs Tamarindo'
   - 'Mendoza vs Bariloche property'
   - 'Jaco vs Manuel Antonio Costa Rica'

   INVESTMENT TYPE:
   - 'Airbnb vs long term rental Latin America'
   - 'condo vs house investment Costa Rica'
   - 'land vs built property Latin America investment'
   - 'new construction vs resale property Costa Rica'
   - 'beach property vs city apartment Latin America'
   - 'managed rental vs self-managed property abroad'

   ALTERNATIVES:
   - 'alternatives to Florida real estate for investors'
   - 'alternatives to Hawaii for beachfront property'
   - 'alternatives to European real estate for Americans'
   - 'cheaper alternatives to US real estate market'
   - 'best alternatives to domestic real estate investing'
   - 'better ROI than US rental property'

3. Include data tables comparing both sides. Use web search for REAL numbers.
4. 800-1200 words. All SEO elements. FAQ structured data. Internal links. Subscribe form.
5. Add to sitemap. Git add, commit, push." 2>> "$LOG_FILE"

echo "  Keyword page 5 (comparison) created." >> "$LOG_FILE"
echo "  === All 5 keyword pages created ===" >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# DAILY: Submit sitemap to additional search engines beyond
#        Google and Bing — Yahoo, Yandex, DuckDuckGo use
#        Bing's index but some have their own submission tools
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Pinging additional search engines..." >> "$LOG_FILE"
# Yandex Webmaster ping
curl -s "https://blogs.yandex.ru/pings/?status=success&url=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
# IndexNow protocol (used by Bing, Yandex, Seznam, Naver)
# Ping with the latest page URL to trigger immediate indexing
LATEST_PAGE=$(grep -o '<loc>[^<]*</loc>' "$PROJECT_DIR/public/sitemap.xml" | tail -1 | sed 's/<[^>]*>//g')
if [ -n "$LATEST_PAGE" ]; then
  curl -s "https://api.indexnow.org/indexnow?url=${LATEST_PAGE}&key=internationalre" > /dev/null 2>&1
fi
echo "  Yandex & IndexNow pinged." >> "$LOG_FILE"

# ══════════════════════════════════════════════════════════════
# WEEKLY (Tuesdays): Create Portuguese-language content
#        Targets Brazilian investors searching in Portuguese
#        (Brazil is the largest economy in Latin America)
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "2" ]; then
  echo "[TUE] Creating Portuguese content for Brazilian market..." >> "$LOG_FILE"

  claude --print "You are a bilingual content creator for International RE (internationalre.org).

YOUR TASK: Create a Portuguese-language version of a popular blog post or guide to target Brazilian real estate investors.

INSTRUCTIONS:
1. Read all files in public/blog/ and public/guides/.
2. Check if public/pt/ directory exists. If not, create public/pt/blog/ and public/pt/guides/.
3. Find a high-value English page that does NOT have a Portuguese version in public/pt/.
4. Translate and ADAPT it for Brazilian readers:
   - Write in natural Brazilian Portuguese (not European Portuguese)
   - Adapt financial context (mention BRL currency, Brazilian tax implications)
   - Brazilian investors are a HUGE market for Latin American real estate
5. SEO metadata in Portuguese:
   - Portuguese title targeting 'investir em imoveis [country]', 'comprar propriedade [country]'
   - Portuguese meta description
   - Add hreflang tags linking English, Spanish, and Portuguese versions
6. Same HTML template. Add to sitemap. Git add, commit, push.
7. If all pages already have Portuguese versions, do nothing.

Brazil has 215 million people — Portuguese content is an enormous untapped market." 2>> "$LOG_FILE"

  echo "  Portuguese content task complete." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# WEEKLY (Thursdays): Create a 'Quick Read' short-form page
#        2-minute reads optimized for mobile, social sharing,
#        and Google Discover feed
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "4" ]; then
  echo "[THU] Creating quick-read short-form page..." >> "$LOG_FILE"

  claude --print "You are a short-form content specialist for International RE (internationalre.org).

YOUR TASK: Create a QUICK READ page — a punchy, 2-minute article optimized for mobile readers and social sharing.

INSTRUCTIONS:
1. Read existing content to avoid duplication.
2. Create public/quick-reads/ directory if it doesn't exist.
3. Pick ONE topic that's perfect for a quick, scrollable read. Format ideas:
   - '5 Facts About [Country] Real Estate That Will Surprise You'
   - '[City] in Numbers: Property Prices, Yields & Lifestyle Stats'
   - 'The 60-Second Guide to Buying Property in [Country]'
   - 'What \$100K Buys You in 4 Latin American Countries'
   - '3 Latin American Markets That Outperformed the S&P 500'
   - 'The #1 Mistake Americans Make When Buying Abroad'
   - 'Why [City] Is Trending Among Property Investors Right Now'
4. Write 300-500 words MAX. Use:
   - Bold stats and numbers
   - Short paragraphs (1-2 sentences each)
   - Bullet points and visual breaks
   - One clear CTA at the end
5. Use the same HTML template but optimize the CSS for mobile-first reading:
   - Larger font size for body text
   - Extra padding on mobile
   - Full-width images
6. Add max-image-preview:large meta tag for Google Discover eligibility.
7. Add to sitemap. Link from relevant content. Git add, commit, push.

Quick reads get shared more than long articles — they're perfect for social media traffic." 2>> "$LOG_FILE"

  echo "  Quick-read page published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# WEEKLY (Sundays): Create a 'voice search optimized' page
#        Targets Siri, Alexa, Google Assistant queries
#        (20%+ of searches are now voice)
# ══════════════════════════════════════════════════════════════
if [ "$DAY_OF_WEEK" = "7" ]; then
  echo "[SUN] Creating voice-search optimized page..." >> "$LOG_FILE"

  claude --print "You are a voice search SEO specialist for International RE (internationalre.org).

YOUR TASK: Create a page optimized for VOICE SEARCH queries — the way people ask Siri, Alexa, or Google Assistant.

INSTRUCTIONS:
1. Read existing content to avoid duplication.
2. Create the page in public/guides/ or public/landing/.
3. Voice searches are CONVERSATIONAL and question-based. Target queries like:
   - 'Hey Google, can I buy a house in Costa Rica as an American?'
   - 'Alexa, what's the cheapest country to buy beachfront property?'
   - 'Siri, how much does it cost to buy an apartment in Buenos Aires?'
   - 'What country in Latin America is best for real estate investment?'
   - 'How do I buy property in another country?'
   - 'What are the best places to retire in Central America?'
   - 'Is it safe to buy property in Nicaragua?'
4. Structure the page with:
   - Each H2 is a full question (exactly how someone would say it out loud)
   - Each answer starts with a direct, concise 1-2 sentence response (this is what voice assistants read aloud)
   - Then follow with 100-200 words of supporting detail
   - Add speakable structured data (JSON-LD) so Google knows which parts to read aloud
5. Add FAQPage structured data covering ALL questions on the page.
6. Use the same HTML template. Add to sitemap.
7. Link from relevant content. Git add, commit, push.

20% of all searches are now voice — and almost nobody optimizes for it." 2>> "$LOG_FILE"

  echo "  Voice-search page published." >> "$LOG_FILE"
fi

# ══════════════════════════════════════════════════════════════
# DAILY: Generate a 'Google Web Story' — visual, tap-through
#        slideshows that appear in Google Discover and Search
# ══════════════════════════════════════════════════════════════
echo "[DAILY] Creating Google Web Story..." >> "$LOG_FILE"

claude --print "You are a Google Web Stories creator for International RE (internationalre.org).

YOUR TASK: Create a Google Web Story — a visual, swipeable, full-screen slideshow that appears in Google Discover and Google Search results.

INSTRUCTIONS:
1. Read existing files in public/stories/ to avoid duplication.
2. Create public/stories/ directory if it doesn't exist.
3. Pick ONE topic that works as a visual story (5-10 slides). Examples:
   - 'What \$150K Buys in 4 Latin American Countries'
   - 'Top 5 Beach Towns for Property Investors'
   - '3 Countries Where Americans Can Buy Property Easily'
   - 'Inside a \$200K Condo in Tamarindo, Costa Rica'
   - 'The Cheapest Beachfront Property in Central America'
4. Create a valid AMP Web Story HTML file following Google's Web Story format:
   - Use <amp-story> with <amp-story-page> for each slide
   - Each slide: full-screen background image (Unsplash), large text overlay, minimal words
   - 5-10 slides total
   - Last slide: CTA to visit internationalre.org or subscribe
   - Include required AMP boilerplate and Web Story metadata
5. Add Web Story structured data (JSON-LD).
6. Add to sitemap.
7. Git add, commit, push.
8. If a story on this topic already exists, pick a different one.

Web Stories appear in Google Discover (phone feeds) and drive massive mobile traffic." 2>> "$LOG_FILE"

echo "  Web Story created." >> "$LOG_FILE"

echo "[DONE] Growth Agent complete for $DATE" >> "$LOG_FILE"
