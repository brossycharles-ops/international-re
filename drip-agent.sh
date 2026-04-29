#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — DRIP EMAIL AGENT
# Runs daily at 10am via macOS LaunchAgent.
# Calls /api/drip-check on the local server to send scheduled
# follow-up emails (Day 3, 7, 14) to new subscribers.
# ═══════════════════════════════════════════════════════════════

export PATH="/Users/charlesbrossy/.local/bin:/Users/charlesbrossy/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/Users/charlesbrossy"

SERVER_URL="https://www.internationalre.org"
ADMIN_KEY="internationalre2026"
LOG_PREFIX="Drip Agent: $(date)"

echo ""
echo "═══════════════════════════════════════════"
echo "$LOG_PREFIX"
echo "═══════════════════════════════════════════"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SERVER_URL}/api/drip-check?key=${ADMIN_KEY}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "[OK] $BODY"
else
  echo "[FAIL] HTTP $HTTP_CODE — $BODY"
fi

echo "═══════════════════════════════════════════"
