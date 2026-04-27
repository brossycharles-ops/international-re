#!/usr/bin/env python3
"""Add loading=lazy + decoding=async to all <img> tags except the first per page (LCP hero).
Idempotent — only touches tags missing the attributes."""
import re
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
IMG_RE = re.compile(r"<img\b([^>]*?)/?>", re.IGNORECASE)

def process(html: str) -> tuple[str, int]:
    matches = list(IMG_RE.finditer(html))
    if not matches:
        return html, 0
    out = []
    last = 0
    edits = 0
    for i, m in enumerate(matches):
        attrs = m.group(1)
        is_first = (i == 0)
        new_attrs = attrs
        if not is_first and "loading=" not in new_attrs:
            new_attrs = " loading=\"lazy\"" + new_attrs
            edits += 1
        if "decoding=" not in new_attrs:
            new_attrs = " decoding=\"async\"" + new_attrs
            edits += 1
        if is_first and "fetchpriority=" not in new_attrs:
            new_attrs = " fetchpriority=\"high\"" + new_attrs
            edits += 1
        out.append(html[last:m.start()])
        out.append(f"<img{new_attrs}>")
        last = m.end()
    out.append(html[last:])
    return "".join(out), edits

total_edits = 0
files_changed = 0
for path in PUB.rglob("*.html"):
    html = path.read_text(encoding="utf-8")
    new, edits = process(html)
    if edits and new != html:
        path.write_text(new, encoding="utf-8")
        files_changed += 1
        total_edits += edits
        print(f"  {path.relative_to(PUB)}: {edits} edits")

print(f"\n✓ {files_changed} files, {total_edits} attribute additions")
