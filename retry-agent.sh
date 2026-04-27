#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# INTERNATIONAL RE — RETRY AGENT
# Drains .pending-tasks.txt — failed daily tasks queued by growth-agent.
# Runs every 2 hours via LaunchAgent. No-op if queue is empty.
# ═══════════════════════════════════════════════════════════════

export PATH="/Users/charlesbrossy/.local/bin:/Users/charlesbrossy/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/Users/charlesbrossy"

PROJECT_DIR="/Users/charlesbrossy/repos/international-re"
PENDING_FILE="$PROJECT_DIR/.pending-tasks.txt"
CLAUDE_BIN="/Users/charlesbrossy/.local/bin/claude"

cd "$PROJECT_DIR" || exit 1

log() { echo "$1"; }

# ── Empty queue: silent exit ─────────────────────────────
if [ ! -s "$PENDING_FILE" ]; then
  exit 0
fi

log ""
log "═══════════════════════════════════════════"
log "Retry Agent: $(date)"
log "═══════════════════════════════════════════"

# ── Auth check ───────────────────────────────────────────
if ! "$CLAUDE_BIN" -p --dangerously-skip-permissions "reply with OK" > /dev/null 2>&1; then
  log "[WARN] Claude not authenticated — will retry next cycle."
  exit 0
fi

TMP="$PENDING_FILE.tmp.$$"
: > "$TMP"

while IFS= read -r line; do
  [ -z "$line" ] && continue
  label="${line%%|||*}"
  b64="${line#*|||}"
  prompt=$(printf '%s' "$b64" | base64 -d 2>/dev/null)
  if [ -z "$prompt" ]; then
    log "[skip] malformed entry: $label"
    continue
  fi
  log "[retry] $label..."
  err_file=$(mktemp)
  "$CLAUDE_BIN" -p --dangerously-skip-permissions "$prompt" 2>"$err_file" >/dev/null
  rc=$?
  err=$(cat "$err_file"); rm -f "$err_file"
  if [ $rc -ne 0 ] || echo "$err" | grep -qiE "^(API Error|Stream idle timeout|usage limit reached|rate limit exceeded)"; then
    log "  [STILL FAILING] $label (rc=$rc) ${err:0:120} — kept in queue"
    printf '%s\n' "$line" >> "$TMP"
  else
    log "  [OK] $label — removed from queue"
  fi
done < "$PENDING_FILE"

mv "$TMP" "$PENDING_FILE"
REMAINING=$(wc -l < "$PENDING_FILE" | tr -d ' ')
log "Retry done. $REMAINING task(s) still queued."
log "═══════════════════════════════════════════"
