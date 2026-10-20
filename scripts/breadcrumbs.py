#!/usr/bin/env python3
"""Add BreadcrumbList structured data to every indexed article, guide and city page.

Google shows the trail ("internationalre.org › Guides › ...") in search results
instead of a raw URL. The block sits between <!-- breadcrumbs:start/end --> markers
just before </head> and is rewritten in place, so running this again is safe.
Runs from rebuild_sitemap.py before every publish (after city hubs are generated).
"""
import html
import json
import re
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"
SITE = "https://www.internationalre.org"
# section -> (label, landing page). Quick reads and tips are listed on guides.html.
PARENTS = {
    "blog": ("Blog", "/blog.html"),
    "guides": ("Guides", "/guides.html"),
    "guide": ("Guides", "/guides.html"),
    "quick-reads": ("Guides", "/guides.html"),
    "tips": ("Guides", "/guides.html"),
    "cities": ("City Guides", "/cities/"),
}
BLOCK = re.compile(r"\n?\s*<!-- breadcrumbs:start -->.*?<!-- breadcrumbs:end -->", re.S)


def page_name(text):
    m = re.search(r'<meta property="og:title" content="([^"]*)"', text) or re.search(r"(?is)<title>(.*?)</title>", text)
    name = html.unescape(m.group(1)).strip() if m else ""
    return re.sub(r"\s*[|—–-]\s*International RE.*$", "", name).strip()


def main():
    changed = total = 0
    for f in sorted(PUBLIC.rglob("*.html")):
        rel = f.relative_to(PUBLIC)
        section = rel.parts[0] if len(rel.parts) > 1 else None
        if section not in PARENTS or (section == "cities" and rel.name == "index.html" and len(rel.parts) == 2):
            continue
        text = f.read_text(errors="ignore")
        if re.search(r'<meta name="robots" content="[^"]*noindex', text) or "</head>" not in text:
            continue
        canon = re.search(r'<link rel="canonical" href="([^"]+)"', text)
        name = page_name(text)
        if not (canon and name):
            continue
        label, landing = PARENTS[section]
        data = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": label, "item": SITE + landing},
                {"@type": "ListItem", "position": 3, "name": name, "item": canon.group(1)},
            ],
        }
        block = ('  <!-- breadcrumbs:start -->\n  <script type="application/ld+json">'
                 + json.dumps(data, ensure_ascii=False) + "</script>\n  <!-- breadcrumbs:end -->\n")
        # Keep anything another tool placed inside the old block (e.g. an FAQPage
        # script inserted next to it): only the BreadcrumbList is ours to replace.
        kept = []
        for old in BLOCK.findall(text):
            for tag in re.findall(r"<script\b[^>]*>.*?</script>", old, re.S):
                if '"BreadcrumbList"' not in tag:
                    kept.append("  " + tag.strip() + "\n")
        new = BLOCK.sub("", text).replace("</head>", "".join(kept) + block + "</head>", 1)
        total += 1
        if new != text:
            f.write_text(new)
            changed += 1
    print(f"[breadcrumbs] {total} pages have breadcrumb data ({changed} updated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
