#!/usr/bin/env python3
"""Rewrite the homepage's "Latest" cards from the newest indexed articles.

The homepage also refreshes these cards from /feed.xml in the browser, but the
HTML itself is what search engines and slow phones see first, so it should never
show months-old articles. Runs from rebuild_sitemap.py before every publish.
"""
import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
INDEX = PUBLIC / "index.html"
SECTIONS = {"blog": "Article", "guides": "Guide", "quick-reads": "Quick Read", "tips": "Tip"}
GRID = re.compile(r'(<div class="newsletter-preview-grid" id="latestGrid">\n)(.*?)(\n        </div>\n        <script>)', re.S)


def meta(text, name):
    m = re.search(r'<meta name="%s" content="([^"]*)"' % name, text)
    return html.unescape(m.group(1)) if m else ""


def articles():
    out = []
    for sec, badge in SECTIONS.items():
        for f in (PUBLIC / sec).glob("*.html"):
            t = f.read_text(errors="ignore")
            if re.search(r'<meta name="robots" content="[^"]*noindex', t):
                continue
            pub = None
            for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, re.S):
                m = re.search(r'"datePublished":\s*"(\d{4}-\d{2}-\d{2})', block)
                if m:
                    pub = m.group(1)
                    break
            title = re.search(r"(?is)<title>(.*?)</title>", t)
            if not (pub and title):
                continue
            out.append({
                "date": pub, "badge": badge, "url": f"/{sec}/{f.name}",
                "title": re.sub(r"\s*[|—–-]\s*International RE\s*$", "", html.unescape(title.group(1)).strip()),
                "desc": meta(t, "description"),
            })
    rank = {"Guide": 3, "Article": 2, "Quick Read": 1, "Tip": 0}
    return sorted(out, key=lambda a: (a["date"], rank[a["badge"]], a["url"]), reverse=True)


def card(a, first):
    d = date.fromisoformat(a["date"])
    desc = a["desc"] if len(a["desc"]) <= 150 else a["desc"][:147].rsplit(" ", 1)[0] + "…"
    e = html.escape
    return (
        '          <div class="newsletter-preview-card">\n'
        f'            <div class="newsletter-issue-badge">{"Latest" if first else e(a["badge"])}</div>\n'
        f'            <h3>{e(a["title"])}</h3>\n'
        f'            <p class="newsletter-date">{d.strftime("%B")} {d.day}, {d.year}</p>\n'
        f'            <p>{e(desc)}</p>\n'
        f'            <a href="{e(a["url"])}" class="newsletter-tag" style="text-decoration:none;cursor:pointer;">Read &rarr;</a>\n'
        '          </div>'
    )


def main():
    text = INDEX.read_text()
    m = GRID.search(text)
    if not m:
        print("[latest_cards] latestGrid block not found; skipped")
        return 0
    newest = articles()[:4]
    body = "\n".join(card(a, i == 0) for i, a in enumerate(newest))
    new = text[: m.start(2)] + body + text[m.end(2):]
    if new != text:
        INDEX.write_text(new)
    print(f"[latest_cards] homepage shows {', '.join(a['date'] for a in newest)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
