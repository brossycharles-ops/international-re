#!/usr/bin/env python3
"""Add srcset to Unsplash <img> tags for responsive loading.
Unsplash supports ?w=N — generate a srcset across 640/1024/1600/1920."""
import re
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
WIDTHS = [640, 1024, 1600, 1920]
IMG_RE = re.compile(r'<img\b([^>]*?)\bsrc="(https://images\.unsplash\.com/[^"]+?)"([^>]*)>', re.IGNORECASE)
W_PARAM = re.compile(r"[?&]w=\d+")


def build_srcset(base_url: str) -> str:
    # Strip existing w= so we can substitute
    clean = W_PARAM.sub("", base_url)
    sep = "&" if "?" in clean else "?"
    return ", ".join(f"{clean}{sep}w={w}&q=80 {w}w" for w in WIDTHS)


changed = 0
edits = 0
for path in PUB.rglob("*.html"):
    html = path.read_text(encoding="utf-8")

    def sub(m: re.Match) -> str:
        pre, url, post = m.group(1), m.group(2), m.group(3)
        full = pre + post
        if "srcset=" in full:
            return m.group(0)
        srcset = build_srcset(url)
        # Default sizes — full-width hero on mobile, contained beyond
        return f'<img{pre}src="{url}" srcset="{srcset}" sizes="(max-width: 768px) 100vw, 1200px"{post}>'

    new, n = IMG_RE.subn(sub, html)
    if n:
        path.write_text(new, encoding="utf-8")
        changed += 1
        edits += n
        print(f"  {path.relative_to(PUB)}: {n} imgs")

print(f"\n✓ {changed} files, {edits} <img> tags got srcset")
