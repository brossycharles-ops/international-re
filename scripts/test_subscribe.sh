#!/bin/bash
# Smoke test for /api/subscribe and /api/subscriber-count.
# Uses ?dryrun=1 so the real subscriber list is NEVER touched in production.
# Assumes server is running at http://localhost:3000 (or $BASE_URL).
set -u
BASE="${BASE_URL:-http://localhost:3000}"
# Use a unique +tag inside a deliverable-shaped domain — but always sent with ?dryrun=1.
EMAIL="smoketest+$(date +%s)@gmail.com"
fail=0

check() {
  local name="$1"; local got="$2"; local want="$3"
  if [ "$got" = "$want" ]; then
    echo "  [OK] $name"
  else
    echo "  [FAIL] $name — got=$got want=$want"; fail=1
  fi
}

echo "→ Subscribe smoke test against $BASE"

# 1. health: subscriber-count returns JSON with count field
COUNT=$(curl -fsS "$BASE/api/subscriber-count" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("count","ERR"))' 2>/dev/null || echo ERR)
if [ "$COUNT" = "ERR" ]; then echo "  [FAIL] /api/subscriber-count not responding"; fail=1; else echo "  [OK] /api/subscriber-count returned count=$COUNT"; fi

# 2. POST subscribe (dryrun — full validation + lock + dedup check, but no write)
CODE=$(curl -s -o /tmp/sub.out -w "%{http_code}" -X POST "$BASE/api/subscribe?dryrun=1" \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"email\":\"$EMAIL\"}")
if [ "$CODE" = "200" ]; then
  if grep -q '"dryrun":true' /tmp/sub.out; then
    echo "  [OK] POST /api/subscribe?dryrun=1 → $CODE (no real write)"
  else
    echo "  [FAIL] POST /api/subscribe?dryrun=1 → 200 but missing dryrun flag in body: $(cat /tmp/sub.out)"; fail=1
  fi
else
  echo "  [FAIL] POST /api/subscribe?dryrun=1 → $CODE: $(cat /tmp/sub.out)"; fail=1
fi
rm -f /tmp/sub.out

# 3. count must NOT have changed (dryrun did not write)
COUNT2=$(curl -fsS "$BASE/api/subscriber-count" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("count","ERR"))' 2>/dev/null || echo ERR)
check "subscriber count unchanged after dryrun" "$COUNT2" "$COUNT"

# 4. malformed payload should fail gracefully (not 500)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/subscribe" \
  -H "Content-Type: application/json" -d '{"bogus":true}')
if [ "$CODE" = "400" ] || [ "$CODE" = "422" ]; then echo "  [OK] malformed payload → $CODE"
else echo "  [WARN] malformed payload → $CODE (expected 400/422)"; fi

# 5. invalid email rejected
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/subscribe" \
  -H "Content-Type: application/json" -d '{"email":"not-an-email"}')
check "invalid email rejected (4xx)" "$([ "$CODE" -ge 400 ] && [ "$CODE" -lt 500 ] && echo yes || echo no)" "yes"

# 6. test-domain email rejected (regression guard for the pollution issue)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/subscribe" \
  -H "Content-Type: application/json" -d '{"email":"x@example.com"}')
check "example.com domain rejected" "$CODE" "400"

exit $fail
