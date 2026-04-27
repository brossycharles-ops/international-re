#!/usr/bin/env python3
"""Regenerate public/sitemap.xml from the actual files in public/.
Source of truth = filesystem. Pulls lastmod from file mtime."""
import datetime as dt
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
BASE = "https://www.internationalre.org"
EXCLUDE_DIRS = {"images", "landing"}
EXCLUDE_FILES = {"internationalre.txt", "robots.txt", "sitemap.xml"}

PRIORITY = {
    "index.html": ("1.0", "weekly"),
    "blog.html": ("0.9", "daily"),
    "guides.html": ("0.9", "weekly"),
    "gallery.html": ("0.7", "monthly"),
    "about.html": ("0.6", "monthly"),
}

def url_for(rel: Path) -> str:
    s = str(rel).replace("\\", "/")
    return f"{BASE}/{s}"

entries = []
for path in sorted(PUB.rglob("*.html")):
    rel = path.relative_to(PUB)
    if rel.parts and rel.parts[0] in EXCLUDE_DIRS:
        continue
    if rel.name in EXCLUDE_FILES:
        continue
    mtime = dt.date.fromtimestamp(path.stat().st_mtime).isoformat()
    name = rel.name
    if str(rel) in PRIORITY:
        prio, freq = PRIORITY[str(rel)]
    elif rel.parts[0] == "blog" and name != "blog.html":
        prio, freq = "0.8", "monthly"
    elif rel.parts[0] == "guides":
        prio, freq = "0.8", "monthly"
    elif rel.parts[0] in ("quick-reads", "tips"):
        prio, freq = "0.6", "monthly"
    elif rel.parts[0] == "landing":
        prio, freq = "0.7", "monthly"
    elif rel.parts[0] in ("guide", "reports"):
        prio, freq = "0.7", "monthly"
    else:
        prio, freq = "0.5", "monthly"
    entries.append((url_for(rel), mtime, freq, prio))

# Include landing pages even though dir was excluded check above? They are useful for SEO.
landing = PUB / "landing"
if landing.exists():
    for path in sorted(landing.rglob("*.html")):
        rel = path.relative_to(PUB)
        mtime = dt.date.fromtimestamp(path.stat().st_mtime).isoformat()
        entries.append((url_for(rel), mtime, "monthly", "0.7"))

# De-dupe
seen = set()
unique = []
for e in entries:
    if e[0] in seen:
        continue
    seen.add(e[0])
    unique.append(e)

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for url, lm, freq, prio in unique:
    lines.append(f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{lm}</lastmod>\n    <changefreq>{freq}</changefreq>\n    <priority>{prio}</priority>\n  </url>")
lines.append("</urlset>")

(PUB / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"✓ sitemap.xml rebuilt with {len(unique)} entries")
