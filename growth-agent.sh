#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — FULLY AUTONOMOUS GROWTH AGENT
# Runs daily at 9am via macOS LaunchAgent
# Every task publishes directly to the live site — zero manual steps
# ═══════════════════════════════════════════════════════════════

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

echo "[DONE] Growth Agent complete for $DATE" >> "$LOG_FILE"
