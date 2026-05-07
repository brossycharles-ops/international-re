# Prompt 06 — Weekly Growth Loop (Monday Morning)

**Use this every Monday. Same prompt, different week. Designed to run in ~2 hours of Charles's time + Claude Code doing the heavy lifting.**

---

You are running the weekly content + growth cycle for **internationalre.org**.

## Inputs Charles provides at start

```
WEEK_OF: 2026-MM-DD
THIS_WEEK_TOPIC: <e.g., "Mexico City rent control changes 2026">
PRIMARY_MARKET: <one of the 11 covered markets>
DATA_POINTS: <Charles pastes 3-5 fresh data points he has — prices, transactions, legal updates>
SOURCES: <list of source URLs to cite>
```

## Your sequence

### 1. Newsletter draft (target: 700-1200 words)

Write the weekly newsletter issue using the data points provided. Format:
- Subject line (3 versions to A/B test) — specific outcome over generic
- One-line preview text (renders in inbox)
- Lead with the single most actionable insight
- "What's happening" (the news)
- "What it means for buyers" (the so-what)
- "Numbers that matter" (the data, formatted as a small table)
- "Action items this week" (3 bullets max — things readers do, not just read)
- Soft footer CTA — vary across "Reply with questions" / "Forward to a friend" / "Book advisory call" — never the same CTA two weeks in a row

Save as `newsletters/<YYYY-MM-DD>-<slug>.md` AND `newsletters/<YYYY-MM-DD>-<slug>.html` (the html version matches the existing newsletter template if one exists, otherwise mirror the blog post template).

### 2. Companion blog post (1500-2500 words)

Take the newsletter and expand it for SEO. The newsletter is for inbox readers; the blog post is for search. Different format:
- Add: target keyword in H1 + first 100 words + URL slug
- Add: TOC, internal links to 2-3 related posts, JSON-LD `Article` schema
- Add: a methodology / sources section
- Update the dataset claim if you cite "covered 11 markets"
- Add 2 inline subscribe CTAs at logical scroll depths

Save as `blog/<slug>.html`. Update `blog.html` index page to list it.

### 3. Update the homepage "Latest" tile

In `index.html`, find the "Newsletters" section. Update the "Latest" card to point to this week's blog post. Move the previously-latest card down to "Recent". Drop the oldest visible card.

### 4. Social cuts (3 platforms)

Create `.audit/social/<YYYY-MM-DD>-cuts.md` with:
- **LinkedIn post** (Charles's target audience hangs here): 1200-char professional take, 3-4 line paragraphs, 1-2 relevant hashtags only (not 15), end with one question to drive comments
- **Twitter/X thread** (5-7 tweets): Hook tweet → data → context → buyer implication → "Full breakdown: [link]"
- **One image-friendly insight**: pull the single best stat as a quote-card spec (not the actual image — describe it: "1080x1080, dark background, centered stat: '8.2% — Panama City gross yields, Q1 2026', byline 'internationalre.org / weekly'")

### 5. Internal-linking pass

Re-read the new blog post and find 3 places where it could link to existing posts. Then re-read 3 existing related posts and add a single contextual link from each back to the new post (reciprocal but tasteful — only if genuinely useful for the reader).

### 6. Sitemap & RSS

Update `sitemap.xml` and `rss.xml` (or generate if absent). For RSS, only newsletter issues + blog posts, not internal pages.

### 7. Pre-flight check

Run:
```bash
.audit/scripts/audit.sh --quick
```

(`--quick` skips full Lighthouse, runs only HTML/SEO/visual on changed pages. If audit.sh doesn't yet support `--quick`, add that flag — only re-audit files modified this week.)

Report any P0/P1 from the new files. If clean, proceed.

### 8. Commit

Stage everything. Show a single squash-friendly commit message:

```
weekly: <YYYY-MM-DD> — <topic>

- Newsletter issue: <slug>
- Blog post: <slug>
- Homepage Latest tile updated
- 3 internal links added
- Social cuts in .audit/social/
```

Don't push. Charles reviews `git diff`, then ships.

## Constraints

- **Never invent numbers.** Use only what Charles provided in `DATA_POINTS`. If you need a stat the data points don't cover, write `[verify]` and surface it in your final summary as "Charles to fill in before publish."
- **Never reuse last week's structure.** If last week opened with a headline stat, this week opens with a question or a story. Variety prevents reader fatigue.
- **Keep the newsletter scannable.** Most readers skim on phones in 90 seconds.
- **One topic per issue.** Don't try to cover Mexico, Argentina, and Chile in the same email. Discipline = retention.
- The newsletter and blog post share data, but the *framing* should differ — newsletter is conversational, blog is reference.

## Final output to Charles

A summary message:
```
Week of <date> — ready for review.

Newsletter: <subject A> | <subject B> | <subject C>
Blog: /blog/<slug>.html (~<wordcount> words)
Homepage: updated
Social: 3 platforms drafted in .audit/social/
Audit: <clean | N issues to address>

Items needing your input:
  - <list anything marked [verify]>
  - <pricing/numbers Charles must confirm>

To publish: review with `git diff`, then `git push`.
```
