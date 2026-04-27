#!/usr/bin/env python3
"""Validate every <script type="application/ld+json"> block parses as JSON
and has a sensible @context + @type. Exits 1 if any fail."""
import json
import re
import sys
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
BLOCK_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)

errors = []
ok = 0
for path in PUB.rglob("*.html"):
    html = path.read_text(encoding="utf-8")
    for i, m in enumerate(BLOCK_RE.finditer(html)):
        raw = m.group(1).strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            errors.append(f"{path.relative_to(PUB)} block#{i}: JSON parse: {e}")
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                errors.append(f"{path.relative_to(PUB)} block#{i}: not an object")
                continue
            if item.get("@context") != "https://schema.org":
                errors.append(f"{path.relative_to(PUB)} block#{i}: bad @context: {item.get('@context')!r}")
            # @type may live at top level OR inside each @graph entry
            graph = item.get("@graph")
            if graph:
                for j, node in enumerate(graph):
                    if not isinstance(node, dict) or not node.get("@type"):
                        errors.append(f"{path.relative_to(PUB)} block#{i} @graph[{j}]: missing @type")
            elif not item.get("@type"):
                errors.append(f"{path.relative_to(PUB)} block#{i}: missing @type")
            ok += 1

print(f"\n{ok} JSON-LD items validated")
if errors:
    print(f"\n✗ {len(errors)} errors:")
    for e in errors:
        print(f"  {e}")
    sys.exit(1)
print("✓ all valid")
