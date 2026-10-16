#!/usr/bin/env python3
"""Add or refresh a "Related reading" box on every indexed article.

Each article gets its city guide (when one exists) plus the closest articles by
city, then country, preferring pages that few others link to, so new and orphaned
pages get found. The box lives between <!-- related:start --> and
<!-- related:end --> and is rewritten on every run, so it is safe to re-run.

  python3 scripts/related_links.py           rewrite boxes
  python3 scripts/related_links.py --check   exit 1 if any box is missing or stale
"""
import html
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SECTIONS = ("blog", "guides", "quick-reads", "tips")
PER_PAGE = 5
START, END = "<!-- related:start -->", "<!-- related:end -->"
BOX = re.compile(re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)

# city slug fragment -> (city key, country key)
CITIES = {
    "buenos-aires": ("buenos-aires", "argentina"), "mendoza": ("mendoza", "argentina"),
    "medellin": ("medellin", "colombia"), "bogota": ("bogota", "colombia"), "cartagena": ("cartagena", "colombia"),
    "mexico-city": ("mexico-city", "mexico"), "tulum": ("tulum", "mexico"), "playa-del-carmen": ("playa-del-carmen", "mexico"),
    "merida": ("merida", "mexico"), "san-miguel": ("san-miguel", "mexico"),
    "montevideo": ("montevideo", "uruguay"), "punta-del-este": ("punta-del-este", "uruguay"),
    "cuenca": ("cuenca", "ecuador"), "quito": ("quito", "ecuador"),
    "lima": ("lima", "peru"), "miraflores": ("lima", "peru"),
    "sao-paulo": ("sao-paulo", "brazil"), "florianopolis": ("florianopolis", "brazil"),
    "santiago": ("santiago", "chile"),
    "granada": ("granada", "nicaragua"), "san-juan-del-sur": ("san-juan-del-sur", "nicaragua"),
    "san-jose": ("san-jose", "costa-rica"), "guanacaste": ("guanacaste", "costa-rica"), "tamarindo": ("guanacaste", "costa-rica"),
    "panama-city": ("panama-city", "panama"),
    "lisbon": ("lisbon", "portugal"), "tbilisi": ("tbilisi", "georgia"), "punta-cana": ("punta-cana", "dominican-republic"),
}
COUNTRIES = ["costa-rica", "nicaragua", "panama", "mexico", "colombia", "ecuador", "peru", "chile",
             "argentina", "uruguay", "brazil", "belize", "dominican-republic", "portugal", "georgia"]


def topics(slug):
    """Cities and countries a page is about, from its file name."""
    s = slug.replace("sao-paulo", "sao-paulo")
    cities, countries = set(), set()
    for frag, (city, country) in CITIES.items():
        if frag in s:
            cities.add(city)
            countries.add(country)
    for c in COUNTRIES:
        if c in s:
            countries.add(c)
    if "panama" in s and not cities & {"panama-city"}:
        countries.add("panama")
    return cities, countries


def page_title(text):
    m = re.search(r"(?is)<title>(.*?)</title>", text)
    t = html.unescape(m.group(1)).strip() if m else ""
    return re.sub(r"\s*[|—–-]\s*International RE\s*$", "", t)


def collect():
    pages = {}
    for sec in SECTIONS:
        for f in sorted((PUBLIC / sec).glob("*.html")):
            text = f.read_text(errors="ignore")
            if re.search(r'<meta name="robots" content="[^"]*noindex', text):
                continue
            cities, countries = topics(f.stem)
            pages[f"/{sec}/{f.name}"] = {"file": f, "text": text, "title": page_title(text), "sec": sec,
                                        "cities": cities, "countries": countries}
    return pages


def city_hubs():
    try:
        data = json.loads((ROOT / "data" / "cities.json").read_text())
    except (OSError, ValueError):
        return {}
    items = data if isinstance(data, list) else data.get("cities", [])
    hubs = {}
    for c in items:
        slug = c.get("slug", "")
        if not slug or not (PUBLIC / "cities" / slug / "index.html").exists():
            continue
        name = c.get("name") or c.get("city") or slug
        for frag, (city, _country) in CITIES.items():
            if slug.startswith(frag):
                hubs[city] = (f"/cities/{slug}/", f"{name} city guide")
    return hubs


def inbound_counts(pages):
    counts = defaultdict(int)
    for path, p in pages.items():
        body = BOX.sub("", p["text"])
        for h in set(re.findall(r'href="(/(?:%s)/[^"#?]+\.html)"' % "|".join(SECTIONS), body)):
            if h != path:
                counts[h] += 1
    return counts


def build(pages):
    hubs, inbound = city_hubs(), inbound_counts(pages)
    boxes = {}
    for path, p in pages.items():
        links = []
        for city in sorted(p["cities"]):
            if city in hubs:
                links.append(hubs[city])
        scored = []
        for other, q in pages.items():
            if other == path or not q["title"]:
                continue
            score = 3 * len(p["cities"] & q["cities"]) + 2 * len(p["countries"] & q["countries"])
            if score == 0:
                continue
            score += 0.5 if q["sec"] != p["sec"] else 0
            scored.append((-score, inbound[other], other))
        if not scored:
            # Region-wide pages: point at the least-linked articles so orphans get found.
            scored = [(0, inbound[o], o) for o, q in pages.items() if o != path and q["title"]]
        for _, _, other in sorted(scored)[: PER_PAGE - len(links)]:
            links.append((other, pages[other]["title"]))
        if not links:
            continue
        items = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in links)
        boxes[path] = (f'{START}\n<nav class="related-reading" aria-label="Related reading" '
                       f'style="margin:28px 0 8px;padding:18px 22px;background:#f7f5f0;border-radius:10px;">'
                       f'<p style="font-weight:600;margin:0 0 8px;color:#0a1628;">Related reading</p>'
                       f'<ul style="margin:0;padding-left:18px;line-height:1.8;">{items}</ul></nav>\n{END}\n')
    return boxes


def place(text, box):
    if START in text:
        return BOX.sub(lambda _m: box, text, count=1)
    m = re.search(r'<p class="report-error"', text)
    if m:
        return text[: m.start()] + box + text[m.start():]
    m = re.search(r"</article>", text)
    if m:
        return text[: m.start()] + box + text[m.start():]
    return text


def main():
    pages = collect()
    boxes = build(pages)
    stale = 0
    for path, box in boxes.items():
        p = pages[path]
        new = place(p["text"], box)
        if new != p["text"]:
            stale += 1
            if "--check" not in sys.argv:
                p["file"].write_text(new)
    verb = "stale or missing" if "--check" in sys.argv else "updated"
    print(f"[related_links] {len(boxes)} articles with related reading, {stale} {verb}")
    return 1 if ("--check" in sys.argv and stale) else 0


if __name__ == "__main__":
    sys.exit(main())
