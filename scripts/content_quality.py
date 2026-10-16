#!/usr/bin/env python3
"""Article quality scorecard and research gate.

  python3 scripts/content_quality.py            gate (used by verify_site.sh)
  python3 scripts/content_quality.py --report   rewrite docs/QUALITY.md
  python3 scripts/content_quality.py --queue N  print the N pages most in need of research

The gate enforces the full research standard on every page that should already
meet it: pages first published on or after STANDARD_SINCE, and every page the
Research Editor has signed off in data/research-ledger.json (so a verified page
can never quietly regress). Older pages are scored and queued, not blocked.
"""
import json
import re
import sys
from datetime import date
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
LEDGER = ROOT / "data" / "research-ledger.json"
STANDARD_SINCE = "2026-10-16"
SECTIONS = {"blog": 900, "guides": 900, "quick-reads": 250, "tips": 150}
MIN_SOURCES = {"blog": 3, "guides": 3, "quick-reads": 2, "tips": 1}
REVERIFY_DAYS = 90
OWN = re.compile(r"internationalre\.org|unsplash\.com|fonts\.(googleapis|gstatic)|unpkg\.com|plausible\.io|schema\.org|twitter\.com/intent|facebook\.com/sharer|linkedin\.com/share|wa\.me|pinterest\.com/pin")
PLACEHOLDER = re.compile(r"lorem ipsum|\bTODO\b|\[insert|\bTBD\b|XX%|\$X{2,}|placeholder text", re.I)


def load_ledger():
    try:
        return json.loads(LEDGER.read_text())
    except (OSError, ValueError):
        return {}


def text_of(html):
    body = re.sub(r"(?is)<(script|style|nav|footer|header)\b.*?</\1>", " ", html)
    return unescape(re.sub(r"(?s)<[^>]+>", " ", body))


def analyse(path):
    html = path.read_text(errors="ignore")
    rel = str(path.relative_to(PUBLIC))
    section = rel.split("/")[0]
    article = re.search(r"(?is)<article\b.*?</article>", html)
    words = len(re.findall(r"[A-Za-zÀ-ÿ0-9][\w'’-]*", text_of(article.group(0) if article else html)))
    src = re.search(r"(?is)<h2[^>]*>\s*Sources\s*</h2>(.*?)(?:<h2|</article>|<div class=\"blog-author-box)", html)
    links = set()
    if src:
        links = {u for u in re.findall(r'href="(https://[^"]+)"', src.group(1)) if not OWN.search(u)}
    title = re.search(r"(?is)<title>(.*?)</title>", html)
    desc = re.search(r'<meta name="description" content="([^"]*)"', html)
    pub = re.search(r'"datePublished":\s*"(\d{4}-\d{2}-\d{2})', html)
    mod = re.search(r'"dateModified":\s*"(\d{4}-\d{2}-\d{2})', html)
    return {
        "page": rel,
        "section": section,
        "noindex": bool(re.search(r'<meta name="robots" content="[^"]*noindex', html)),
        "words": words,
        "sources": len(links),
        "faq": "FAQPage" in html,
        "h1": bool(re.search(r"(?i)<h1\b", html)),
        "byline": "Charles Brossy" in html,
        "other_byline": bool(re.search(r"By <strong>(?!Charles Brossy<)[^<]+</strong>", html)),
        "title_len": len(unescape(title.group(1)).strip()) if title else 0,
        "desc_len": len(unescape(desc.group(1))) if desc else 0,
        "published": pub.group(1) if pub else "",
        "modified": mod.group(1) if mod else (pub.group(1) if pub else ""),
        "placeholder": bool(PLACEHOLDER.search(text_of(html))),
    }


def problems(a):
    p = []
    if a["sources"] < MIN_SOURCES[a["section"]]:
        p.append(f"needs a Sources section with {MIN_SOURCES[a['section']]}+ external https links (has {a['sources']})")
    if a["section"] != "tips" and not a["faq"]:
        p.append("missing FAQ + FAQPage JSON-LD")
    if a["words"] < SECTIONS[a["section"]]:
        p.append(f"thin: {a['words']} words (min {SECTIONS[a['section']]})")
    if not a["h1"]:
        p.append("no <h1>")
    if not a["byline"]:
        p.append("no byline")
    if a["other_byline"]:
        p.append("byline is not Charles Brossy (never invent authors)")
    if not 1 <= a["title_len"] <= 65:
        p.append(f"title length {a['title_len']} (max 65)")
    if not 110 <= a["desc_len"] <= 165:
        p.append(f"meta description length {a['desc_len']} (110-165)")
    if not a["published"]:
        p.append("no datePublished in JSON-LD")
    if a["modified"] and a["published"] and a["modified"] < a["published"]:
        p.append("dateModified earlier than datePublished")
    if a["placeholder"]:
        p.append("placeholder text")
    return p


def score(a, ledger):
    s = 100 - 12 * len(problems(a))
    v = ledger.get(a["page"], {}).get("verified")
    if not v:
        s -= 25
    elif (date.today() - date.fromisoformat(v)).days > REVERIFY_DAYS:
        s -= 15
    return max(0, s)


def collect():
    out = []
    for section in SECTIONS:
        for f in sorted((PUBLIC / section).glob("*.html")):
            a = analyse(f)
            if not a["noindex"]:
                out.append(a)
    return out


def main():
    ledger = load_ledger()
    pages = collect()
    for a in pages:
        a["score"] = score(a, ledger)
        a["verified"] = ledger.get(a["page"], {}).get("verified", "")

    if "--queue" in sys.argv:
        n = int(sys.argv[sys.argv.index("--queue") + 1])
        # Pages with a deadline that has passed come first (they state a rule that is
        # no longer true), then never-verified (worst score first), then the stalest.
        try:
            sys.path.insert(0, str(Path(__file__).resolve().parent))
            from stale_claims import stale_pages
            stale = stale_pages()
        except Exception:
            stale = {}
        for a in pages:
            if a["page"] in stale:
                a["stale"] = stale[a["page"]]
        todo = sorted(pages, key=lambda a: (a["page"] not in stale or (a["verified"] or "") >= str(date.today()), bool(a["verified"]), a["verified"] or "", a["score"]))
        # Stale pages outside the article sections (e.g. /guide/) still need fixing first.
        known = {a["page"] for a in pages}
        for page, phrases in sorted(stale.items()):
            if page not in known:
                print(f"{page}\tscore=n/a\tverified=n/a\tdeadline passed: " + ", ".join(phrases))
        for a in todo[:n]:
            extra = ["deadline passed: " + ", ".join(a["stale"])] if a.get("stale") else []
            print(f"{a['page']}\tscore={a['score']}\tverified={a['verified'] or 'never'}\t" + "; ".join(extra + problems(a)))
        return 0

    if "--report" in sys.argv:
        verified = sum(1 for a in pages if a["verified"])
        avg = round(sum(a["score"] for a in pages) / max(1, len(pages)))
        lines = [
            "# Article quality scorecard",
            "",
            f"Generated {date.today()} by scripts/content_quality.py. {len(pages)} indexed articles, "
            f"average score {avg}/100, {verified} research-verified ({round(100 * verified / max(1, len(pages)))}%), "
            f"{sum(1 for a in pages if a['sources'])} with a Sources section, {sum(1 for a in pages if a['faq'])} with an FAQ.",
            "",
            "Score: 100, minus 12 per problem, minus 25 if never research-verified (minus 15 if the last check is over 90 days old).",
            "",
            "| Score | Page | Verified | Words | Sources | Problems |",
            "|---|---|---|---|---|---|",
        ]
        for a in sorted(pages, key=lambda a: a["score"]):
            lines.append(f"| {a['score']} | {a['page']} | {a['verified'] or '—'} | {a['words']} | {a['sources']} | {'; '.join(problems(a)) or 'none'} |")
        (ROOT / "docs").mkdir(exist_ok=True)
        (ROOT / "docs" / "QUALITY.md").write_text("\n".join(lines) + "\n")
        print(f"wrote docs/QUALITY.md: {len(pages)} pages, average {avg}, {verified} verified")
        return 0

    failed = 0
    # Site-wide rules that apply to every page, old or new.
    for f in PUBLIC.rglob("*.html"):
        html = f.read_text(errors="ignore")
        if '"RealEstateListing"' in html:
            print(f"FAIL {f.relative_to(PUBLIC)}: RealEstateListing structured data describes listings that do not exist")
            failed += 1
    for a in pages:
        if a["other_byline"]:
            print(f"FAIL {a['page']}: byline is not Charles Brossy (never invent authors)")
            failed += 1
    for a in pages:
        bound = a["published"] >= STANDARD_SINCE or a["page"] in ledger
        if bound and problems(a):
            why = "verified in research ledger" if a["page"] in ledger else f"published {a['published']}"
            print(f"FAIL {a['page']} ({why}): " + "; ".join(problems(a)))
            failed += 1
    for page, entry in ledger.items():
        if not (PUBLIC / page).exists():
            print(f"FAIL research ledger lists missing page {page}")
            failed += 1
        elif not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(entry.get("verified", ""))):
            print(f"FAIL research ledger entry for {page} has no valid 'verified' date")
            failed += 1
    print(f"[content_quality] {len(pages)} articles, {len(ledger)} verified, {failed} failing the research standard")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
