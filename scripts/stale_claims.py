#!/usr/bin/env python3
"""List time-sensitive claims whose date has passed.

Finds phrases like "expires October 15, 2026", "deadline: March 2026",
"until June 30, 2026", "on or before ...", "will rise in ..." on indexed pages
and prints the ones dated before today, so the page can be updated to state the
rule as it is now. Run by the daily auditor; the Research Editor fixes them.

  python3 scripts/stale_claims.py            print findings (exit 0)
  python3 scripts/stale_claims.py --strict   exit 1 if any finding
"""
import re
import sys
from datetime import date
from html import unescape
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"
MONTHS = {m: i for i, m in enumerate(
    "january february march april may june july august september october november december".split(), 1)}
TRIGGER = r"(?:expires?|expiring|deadline(?: is| of)?:?|until|on or before|no later than|before|ends?|will (?:rise|increase|change|end|take effect)(?: on| in)?|takes effect(?: on)?|scheduled for)"
PATTERN = re.compile(
    r"([^.]{0,100}\b" + TRIGGER + r"\s+((January|February|March|April|May|June|July|August|September|October|November|December)"
    r"(?:\s+(\d{1,2}))?,?\s+(20\d\d))[^.]{0,80})", re.I)


def main():
    today = date.today()
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
            if when >= today or m.group(2) in seen:
                continue
            seen.add(m.group(2))
            found += 1
            print(f"{f.relative_to(PUBLIC)} | {m.group(2)} | {m.group(1).strip()[:220]}")
    print(f"[stale_claims] {found} time-sensitive claim(s) dated in the past")
    return 1 if (found and "--strict" in sys.argv) else 0


if __name__ == "__main__":
    sys.exit(main())
