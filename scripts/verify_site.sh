#!/bin/bash
# Quality gate for automated changes. Exit 0 = safe to ship, nonzero = block.
# Boots the server on a spare port and requests every sitemap URL.
cd "$(dirname "$0")/.." || exit 2

fail=0
check() { if "$@" > /tmp/verify_site_step.log 2>&1; then echo "  ok   $*"; else echo "  FAIL $*"; tail -15 /tmp/verify_site_step.log; fail=1; fi; }

echo "[verify] static checks"
check node -c server.js
check node scripts/test_server.js
check python3 scripts/check_links.py
check python3 scripts/validate_jsonld.py
check python3 scripts/audit_a11y.py
check python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parse('public/sitemap.xml')"
# Agents used to invent Unsplash IDs (Berlin, Athens, a sneaker... labelled as Latin American cities).
check python3 - <<'PY'
import json, re, sys
from pathlib import Path
lib = json.load(open("data/images.json"))
ok = {v["id"] for v in lib["places"].values()} | set(lib["generic"])
bad = {}
for f in Path("public").rglob("*.html"):
    for i in re.findall(r"images\.unsplash\.com/(photo-[A-Za-z0-9_-]+?)(?=[?'\")\s])", f.read_text(errors="ignore")):
        if i not in ok: bad.setdefault(i, []).append(str(f))
for i, fs in bad.items(): print(f"unapproved image {i} in {fs[:3]}")
sys.exit(1 if bad else 0)
PY

echo "[verify] live crawl"
PORT=$(( 40000 + RANDOM % 10000 ))
PORT=$PORT SUBSCRIBERS_FILE=/tmp/verify_site_subs.json node server.js > /tmp/verify_site_server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null; rm -f /tmp/verify_site_subs.json' EXIT
for _ in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 0.3; done

bad=0; total=0
for path in $(grep -o '<loc>[^<]*</loc>' public/sitemap.xml | sed -E 's|<loc>https?://[^/]+||; s|</loc>||'); do
  total=$((total + 1))
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$path")
  [ "$code" = "200" ] || { echo "  FAIL $code $path"; bad=$((bad + 1)); }
done
for path in / /blog.html /cities/ /quiz.html /newsletter.html /feed.xml /api/subscriber-count; do
  total=$((total + 1))
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$path")
  [ "$code" = "200" ] || { echo "  FAIL $code $path"; bad=$((bad + 1)); }
done
code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/definitely-not-a-page-xyz")
[ "$code" = "404" ] || { echo "  FAIL 404 handler returned $code"; bad=$((bad + 1)); }
echo "  crawled $total URLs, $bad failures"
[ "$bad" -eq 0 ] || fail=1

[ "$fail" -eq 0 ] && echo "[verify] PASS" || echo "[verify] BLOCKED"
exit $fail
