#!/bin/bash
# Weekly Blog Post Generator for International RE
# Runs via macOS LaunchAgent every Monday at 8am
# Uses Claude Code CLI to research and write a new blog post

# Ensure PATH includes Claude CLI and Node.js (LaunchAgents use minimal PATH)
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

cd ~/Desktop/my-project/Claude\ Newsletter

# Make sure Claude Desktop app is open and CLI is authenticated
if ! claude --print "hello" > /dev/null 2>&1; then
  open -a "Claude" 2>/dev/null
  sleep 20
fi

claude -p --dangerously-skip-permissions "You are writing a new weekly blog post for the International RE website at $(pwd).

INSTRUCTIONS:
1. Read public/blog.html to see which posts already exist and which market/writer was used most recently.
2. Pick the NEXT writer in rotation: Sofia Mendez, James Whitfield, Carolina Vega (check who wrote the most recent post and pick the next one).
3. Pick a market (Costa Rica, Nicaragua, Argentina, or Chile) that was NOT covered in the most recent 2 posts.
4. Research current real estate market data for that market using web search. Get real numbers: prices per sqm, rental yields, tourism stats, legal requirements, recent developments.
5. Create a new blog post HTML file in public/blog/ following the EXACT same template as existing posts (guanacaste-hottest-market-2026.html). Include: nav bar, hero image, full article with real data, subscribe banner, footer. Use an appropriate Unsplash image URL for the hero.
6. Update public/blog.html: move the current featured post into the grid (as the first grid item), and make the new post the featured article at the top.
7. Use today's date for the publish date.
8. The blog post should be 800-1200 words with real market data, specific numbers, and actionable insights.
9. Update public/sitemap.xml to add the new blog post URL with today's date as lastmod.
10. After creating the post, commit and push all changes to GitHub with a descriptive commit message."
