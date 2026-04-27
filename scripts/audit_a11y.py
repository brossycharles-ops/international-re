#!/usr/bin/env python3
"""Basic a11y audit: missing/empty alt text on <img>, missing <h1>, multiple <h1>,
heading order skips (e.g. h1 → h3). Reports issues; non-zero exit if any found."""
import re
import sys
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
IMG_RE = re.compile(r"<img\b([^>]*?)/?>", re.IGNORECASE)
ALT_RE = re.compile(r'\balt\s*=\s*"([^"]*)"', re.IGNORECASE)
H_RE = re.compile(r"<h([1-6])\b", re.IGNORECASE)
FOOTER_RE = re.compile(r"<footer\b.*?</footer>", re.IGNORECASE | re.DOTALL)

issues: list[str] = []
for path in PUB.rglob("*.html"):
    html = path.read_text(encoding="utf-8")
    rel = str(path.relative_to(PUB))
    body_html = FOOTER_RE.sub("", html)  # strip footer for heading + img audit

    for m in IMG_RE.finditer(body_html):
        attrs = m.group(1)
        alt = ALT_RE.search(attrs)
        # JS-populated images (empty src + id) are conventionally OK with alt=""
        if 'src=""' in attrs and "id=" in attrs:
            continue
        if not alt:
            issues.append(f"{rel}: <img> missing alt — {attrs[:80]}")
        elif not alt.group(1).strip():
            issues.append(f"{rel}: <img> empty alt (use alt='' only for decorative)")

    h_levels = [int(x) for x in H_RE.findall(body_html)]
    h1_count = h_levels.count(1)
    if h1_count == 0:
        issues.append(f"{rel}: no <h1>")
    elif h1_count > 1:
        issues.append(f"{rel}: {h1_count} <h1> tags (should be 1)")
    prev = 0
    for lvl in h_levels:
        if prev and lvl > prev + 1:
            issues.append(f"{rel}: heading skip h{prev}→h{lvl}")
            break
        prev = lvl

print(f"scanned {sum(1 for _ in PUB.rglob('*.html'))} pages")
if issues:
    print(f"\n✗ {len(issues)} issues:")
    for i in issues[:80]:
        print(f"  {i}")
    if len(issues) > 80:
        print(f"  … and {len(issues)-80} more")
    sys.exit(1)
print("✓ no a11y issues")
