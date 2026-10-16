#!/usr/bin/env python3
"""List time-sensitive claims whose date has passed.

Finds phrases like "expires October 15, 2026", "deadline: March 2026",
"until June 30, 2026", "on or before ...", "will rise in ..." on indexed pages
and prints the ones dated before today, so the page can be updated to state the
rule as it is now. Run by the daily auditor; the Research Editor fixes them.

  python3 scripts/stale_claims.py            print findings (exit 0)
  python3 scripts/stale_claims.py --strict   exit 1 if any finding
"""
import json
import re
import sys
from datetime import date
from html import unescape
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"
LEDGER = PUBLIC.parent / "data" / "research-ledger.json"


def verified_dates():
    """{page: last research-verified date}. A claim dated before the page's last
    verification was reviewed by a fact-checker (e.g. a historical cutoff stated
    correctly), so it is not reported again."""
    try:
        led = json.loads(LEDGER.read_text())
    except Exception:
        return {}
    items = led.items() if isinstance(led, dict) else ((e.get("page"), e) for e in led)
    out = {}
    for page, e in items:
        if page and isinstance(e, dict) and e.get("verified"):
            out[page.replace("public/", "", 1)] = str(e["verified"])[:10]
    return out
MONTHS = {m: i for i, m in enumerate(
    "january february march april may june july august september october november december".split(), 1)}
TRIGGER = r"(?:expires?|expiring|deadline(?: is| of)?:?|until|on or before|no later than|before|ends?|will (?:rise|increase|change|end|take effect)(?: on| in)?|takes effect(?: on)?|scheduled for)"
PATTERN = re.compile(
    r"([^.]{0,100}\b" + TRIGGER + r"\s+((January|February|March|April|May|June|July|August|September|October|November|December)"
    r"(?:\s+(\d{1,2}))?,?\s+(20\d\d))[^.]{0,80})", re.I)


def stale_pages(today=None):
    """{relative page path: [matched date phrases]} for indexed pages with passed deadlines."""
    today = today or date.today()
    checked = verified_dates()
    out = {}
    for f in sorted(PUBLIC.rglob("*.html")):
        html = f.read_text(errors="ignore")
        if re.search(r'<meta name="robots" content="[^"]*noindex', html):
            continue
        text = re.sub(r"\s+", " ", unescape(re.sub(r"(?s)<(script|style)\b.*?</\1>|<[^>]+>", " ", html)))
        for m in PATTERN.finditer(text):
            month, year = MONTHS[m.group(3).lower()], int(m.group(5))
            try:
                when = date(year, month, int(m.group(4)) if m.group(4) else 28)
            except ValueError:
                continue
            if when < today and checked.get(str(f.relative_to(PUBLIC)), "") < str(when):
                out.setdefault(str(f.relative_to(PUBLIC)), []).append(m.group(2))
    return out


def main():
    today = date.today()
    checked = verified_dates()
    found = 0
    for f in sorted(PUBLIC.rglob("*.html")):
        html = f.read_text(errors="ignore")
        if re.search(r'<meta name="robots" content="[^"]*noindex', html):
            continue
        text = unescape(re.sub(r"(?s)<(script|style)\b.*?</\1>|<[^>]+>", " ", html))
        text = re.sub(r"\s+", " ", text)
        seen = set()
        for m in PATTERN.finditer(text):
            month, day, year = MONTHS[m.group(3).lower()], int(m.group(4) or 28), int(m.group(5))
            try:
                when = date(year, month, min(day, 28) if not m.group(4) else day)
            except ValueError:
                continue
            if when >= today or m.group(2) in seen or checked.get(str(f.relative_to(PUBLIC)), "") >= str(when):
                continue
            seen.add(m.group(2))
            found += 1
            print(f"{f.relative_to(PUBLIC)} | {m.group(2)} | {m.group(1).strip()[:220]}")
    print(f"[stale_claims] {found} time-sensitive claim(s) dated in the past")
    return 1 if (found and "--strict" in sys.argv) else 0


if __name__ == "__main__":
    sys.exit(main())
