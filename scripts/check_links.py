#!/usr/bin/env python3
"""Scan all internal href= links for broken targets. Exits 1 on any miss."""
import re
import sys
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)

def resolve(src: Path, href: str) -> Path | None:
    if href.startswith(("http://", "https://", "mailto:", "tel:", "#", "javascript:", "data:")):
        return None
    href = href.split("#", 1)[0].split("?", 1)[0]
    if not href:
        return None
    if href.startswith("/"):
        target = PUB / href.lstrip("/")
    else:
        target = (src.parent / href).resolve()
    if target.is_dir():
        target = target / "index.html"
    return target

broken: list[tuple[str, str]] = []
checked = 0
for path in PUB.rglob("*.html"):
    html = path.read_text(encoding="utf-8")
    for m in HREF_RE.finditer(html):
        href = m.group(1)
        target = resolve(path, href)
        if target is None:
            continue
        checked += 1
        if not target.exists():
            broken.append((str(path.relative_to(PUB)), href))

print(f"\n{checked} internal links checked")
if broken:
    print(f"\n✗ {len(broken)} broken:")
    for src, href in broken:
        print(f"  {src} → {href}")
    sys.exit(1)
print("✓ all internal links resolve")
