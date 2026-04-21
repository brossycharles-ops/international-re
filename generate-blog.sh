#!/bin/bash
# Weekly featured blog post — runs every Monday at 8am via LaunchAgent

export PATH="/Users/charlesbrossy/.local/bin:/Users/charlesbrossy/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

PROJECT_DIR="/Users/charlesbrossy/Desktop/my-project/Claude Newsletter"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$PROJECT_DIR/blog-generator.log"

cd "$PROJECT_DIR" || exit 1

echo "" >> "$LOG_FILE"
echo "Blog Generator: $DATE" >> "$LOG_FILE"

# Auth check
if ! /Users/charlesbrossy/.local/bin/claude -p --dangerously-skip-permissions "reply with OK" > /dev/null 2>&1; then
  open -a "Claude" 2>/dev/null
  sleep 30
  if ! /Users/charlesbrossy/.local/bin/claude -p --dangerously-skip-permissions "reply with OK" > /dev/null 2>&1; then
    echo "[ERROR] Claude CLI not authenticated. Aborting." >> "$LOG_FILE"
    echo "  Fix: open Claude desktop app and make sure you are logged in." >> "$LOG_FILE"
    exit 1
  fi
fi

/Users/charlesbrossy/.local/bin/claude -p --dangerously-skip-permissions \
"Content writer for International RE (internationalre.org).

TASK: Write the weekly featured blog post in public/blog/.
- Run: ls public/blog/ and read the last 2 blog post filenames to find recent market and writer.
- Next writer rotation: Sofia Mendez → James Whitfield → Carolina Vega → repeat.
- Pick a market NOT in the last 2 posts (Costa Rica, Nicaragua, Argentina, Chile).
- Web search for 3-5 real current data points (price/sqm, rental yield, one notable development).
- Write a 700-900 word HTML post matching public/blog/guanacaste-hottest-market-2026.html (nav, Unsplash hero, article, subscribe banner, footer). Publish date: $DATE.
- Update public/blog.html: move current featured post to grid, make new post featured.
- Add URL to public/sitemap.xml with lastmod $DATE.
- git add -A && git commit -m 'Add weekly blog: [title]' && git push" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "[OK] Weekly blog post created." >> "$LOG_FILE"
else
  echo "[ERROR] Blog post failed." >> "$LOG_FILE"
fi

echo "Completed: $(date)" >> "$LOG_FILE"
