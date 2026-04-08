#!/bin/bash
# Growth Agent for International RE
# Runs daily via macOS LaunchAgent
# Drives organic traffic through legitimate SEO and content marketing tactics

SITE_URL="https://www.internationalre.org"
PROJECT_DIR="$HOME/Desktop/my-project/Claude Newsletter"
OUTPUT_DIR="$PROJECT_DIR/growth-output"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday

cd "$PROJECT_DIR"

mkdir -p "$OUTPUT_DIR"

echo "=== Growth Agent Run: $DATE ==="

# ──────────────────────────────────────────────
# 1. PING SEARCH ENGINES WITH SITEMAP (daily)
#    Tells Google & Bing to re-crawl the site
# ──────────────────────────────────────────────
echo "[1] Pinging search engines with sitemap..."
curl -s "https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
curl -s "https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml" > /dev/null 2>&1
echo "    Done — Google and Bing pinged."

# ──────────────────────────────────────────────
# 2. GENERATE SOCIAL MEDIA CONTENT (Wednesdays & Fridays)
#    Creates ready-to-post content for Twitter/X, LinkedIn, Instagram
#    Saved to growth-output/ for user to copy-paste
# ──────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "3" ] || [ "$DAY_OF_WEEK" = "5" ]; then
  echo "[2] Generating social media content pack..."

  claude --print "You are a social media content creator for International RE (internationalre.org), a free weekly newsletter about Latin American real estate (Costa Rica, Nicaragua, Argentina, Chile).

INSTRUCTIONS:
1. Read the blog posts in public/blog/ to find the latest content.
2. Create a social media content pack with 5 posts for EACH platform:

TWITTER/X (5 posts):
- Short, punchy, under 280 characters
- Include relevant hashtags (#LatinAmericaRealEstate #CostaRica #PropertyInvestment etc.)
- Include a call to action linking to the blog post or subscribe page
- Mix: 2 blog promotion posts, 1 market stat/fact, 1 question to drive engagement, 1 subscriber testimonial style

LINKEDIN (3 posts):
- Professional tone, 100-200 words each
- Data-driven insights from the blog posts
- End with a question or CTA to drive comments
- Include link to the relevant blog post

INSTAGRAM CAPTIONS (3 posts):
- Engaging, visual language describing Latin American properties/markets
- 30 relevant hashtags per post
- CTA to check link in bio (internationalre.org)

Format the output as clean markdown. For each post, include the platform, the post text, and which blog post it promotes (if any).

Write the output to: $OUTPUT_DIR/social-media-${DATE}.md" > "$OUTPUT_DIR/social-media-${DATE}.md" 2>&1

  echo "    Social media pack saved to growth-output/social-media-${DATE}.md"
fi

# ──────────────────────────────────────────────
# 3. GENERATE QUORA/REDDIT ANSWERS (Tuesdays)
#    Creates helpful answers to common real estate questions
#    that naturally reference the blog content
# ──────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "2" ]; then
  echo "[3] Generating forum answer templates..."

  claude --print "You are a content marketer for International RE (internationalre.org).

INSTRUCTIONS:
1. Read the blog posts in public/blog/ to know what content exists.
2. Generate 5 helpful, detailed answers to questions people commonly ask on Quora and Reddit about buying property in Latin America. These should be GENUINELY HELPFUL answers first, with a natural mention of the blog article as a source.

For each answer provide:
- The question (something real people search for, like 'Can Americans buy property in Costa Rica?' or 'What are the cheapest beach towns in Central America?')
- Which subreddit or Quora topic it fits (e.g., r/expats, r/realestateinvesting, r/digitalnomad)
- A 150-250 word answer that is genuinely helpful and informative
- A natural mention of the relevant blog post as a source (not spammy)

IMPORTANT: These must be HELPFUL FIRST. The value should stand on its own even without the link. Generic or spammy answers hurt more than they help.

Format as clean markdown." > "$OUTPUT_DIR/forum-answers-${DATE}.md" 2>&1

  echo "    Forum answers saved to growth-output/forum-answers-${DATE}.md"
fi

# ──────────────────────────────────────────────
# 4. GENERATE EMAIL NEWSLETTER DRAFT (Thursdays)
#    Creates a newsletter draft the user can send to subscribers
#    summarizing the latest blog content + market updates
# ──────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "4" ]; then
  echo "[4] Generating email newsletter draft..."

  claude --print "You are writing a weekly email newsletter for International RE subscribers.

INSTRUCTIONS:
1. Read the blog posts in public/blog/ to find the 2 most recent posts.
2. Write a short, engaging email newsletter (300-500 words) that:
   - Has a compelling subject line
   - Opens with a personal, conversational hook about Latin American real estate
   - Summarizes the key insights from the 2 most recent blog posts with links
   - Includes 1-2 interesting market stats or facts
   - Ends with a CTA to share the newsletter with a friend
   - Has a PS line with a teaser for next week
3. Format it as clean HTML email (inline styles, simple layout, mobile-friendly).
4. The tone should be: expert but approachable, like a smart friend who knows real estate.

Save the output as a complete HTML file." > "$OUTPUT_DIR/newsletter-draft-${DATE}.html" 2>&1

  echo "    Newsletter draft saved to growth-output/newsletter-draft-${DATE}.html"
fi

# ──────────────────────────────────────────────
# 5. SEO AUDIT & IMPROVEMENT (Saturdays)
#    Checks pages for SEO issues and fixes them
# ──────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "6" ]; then
  echo "[5] Running SEO audit and improvements..."

  claude --print "You are an SEO specialist for International RE (internationalre.org).

INSTRUCTIONS:
1. Read ALL HTML files in public/ and public/blog/
2. Check each page for SEO issues:
   - Missing or duplicate title tags
   - Missing or weak meta descriptions (should be 150-160 chars, include keywords)
   - Missing Open Graph tags
   - Missing structured data (JSON-LD)
   - Missing alt text on images
   - Internal linking opportunities (blog posts should link to each other)
   - Missing canonical URLs
3. Read public/sitemap.xml and verify all pages are listed
4. FIX any issues you find by editing the files directly
5. If you made changes, update the sitemap lastmod dates, commit and push to GitHub
6. Write a brief report of what you found and fixed

Be conservative — only fix genuine SEO problems, don't rewrite content." > "$OUTPUT_DIR/seo-audit-${DATE}.md" 2>&1

  echo "    SEO audit saved to growth-output/seo-audit-${DATE}.md"
fi

echo "=== Growth Agent Complete ==="
