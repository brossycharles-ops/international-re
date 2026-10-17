#!/usr/bin/env python3
"""Fail if a page relies on something the live CSP blocks.

server.js sends `script-src-attr 'none'` and `form-action 'self'` (helmet), so
in a real browser:
  - inline event-handler attributes (onclick=, onsubmit=, onload= ...) never run,
    including ones inside HTML strings that scripts inject with innerHTML;
  - a <form action="https://other-host/..."> silently does nothing.
Both used to leave signup forms and share buttons dead with no error on the
page. Attach handlers with addEventListener and post forms to this server.

Scans public/**/*.html and public/**/*.js. Prints file:line for each hit.
Run: python3 scripts/check_csp_inline.py      (also run by scripts/verify_site.sh)
     python3 scripts/check_csp_inline.py --self-test
"""
import re
import sys
from pathlib import Path

# An attribute named on<letters>= inside a tag: "<tag ... onclick=" with no '>' in between.
HANDLER = re.compile(r"<[a-zA-Z][\w:-]*\b[^<>]*?[\s\"'](on[a-z]+)\s*=", re.S)
# A form whose action is absolute or protocol-relative to another host.
FORM = re.compile(r"<form\b[^<>]*?\saction\s*=\s*[\"']?\s*((?:https?:)?//[^\"'\s>]+)", re.I | re.S)
OWN = re.compile(r"^(?:https?:)?//(?:www\.)?internationalre\.org(?:[/?#]|$)", re.I)


def scan(text):
    """Yield (offset, message) for every CSP-blocked construct in text."""
    for m in HANDLER.finditer(text):
        yield m.start(1), f"inline event handler {m.group(1)}= (blocked by script-src-attr 'none'; use addEventListener)"
    for m in FORM.finditer(text):
        if not OWN.match(m.group(1)):
            yield m.start(1), f"form posts to external {m.group(1)[:80]} (blocked by form-action 'self')"


def main():
    root = Path(__file__).resolve().parent.parent / "public"
    hits = []
    for f in sorted(p for ext in ("*.html", "*.js") for p in root.rglob(ext)):
        text = f.read_text(errors="ignore")
        for off, msg in scan(text):
            hits.append(f"{f.relative_to(root.parent)}:{text.count(chr(10), 0, off) + 1}: {msg}")
    for h in hits:
        print(h)
    files = len({h.split(":", 1)[0] for h in hits})
    print(f"[check_csp_inline] {len(hits)} CSP-blocked constructs in {files} files" if hits else "[check_csp_inline] ok")
    return 1 if hits else 0


def self_test():
    bad = [
        '<button class="x" onclick="copy()">Copy</button>',
        "<form\n  id=f onsubmit='return go(event)'>",
        "el.innerHTML = '<a href=\"#\" onclick=\"share()\">Share</a>';",
        '<form action="https://formspree.io/f/abc" method="POST">',
        "<form method=post action=//evil.example/x>",
    ]
    good = [
        '<button class="x" data-onclick="copy">Copy</button>',
        "btn.onclick = () => go(); if (a < b) el.onload = f;",
        '<form action="/api/subscribe" method="POST">',
        '<form action="https://www.internationalre.org/advisory-intake">',
        "<p>Click on = the button</p>",
    ]
    fails = [s for s in bad if not list(scan(s))] + [s for s in good if list(scan(s))]
    for s in fails:
        print("self-test FAIL:", s)
    print("[check_csp_inline] self-test", "FAILED" if fails else "passed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else main())
