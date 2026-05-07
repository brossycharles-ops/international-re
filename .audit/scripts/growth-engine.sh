#!/usr/bin/env bash
# growth-engine.sh — Weekly content workflow runner
# Sets up the inputs file, then opens Claude Code with the right prompt.

set -euo pipefail

WEEK=$(date +%Y-%m-%d)
INPUTS_FILE=".audit/weekly-inputs-${WEEK}.md"

if [ ! -f "$INPUTS_FILE" ]; then
  cat > "$INPUTS_FILE" <<EOF
# Weekly Inputs — $WEEK

WEEK_OF: $WEEK
THIS_WEEK_TOPIC: <fill in — what's the single market story this week>
PRIMARY_MARKET: <one of: costa-rica, panama, colombia, mexico, argentina, chile, nicaragua, uruguay, dr, ecuador, peru, brazil>

DATA_POINTS:
  - <fresh stat 1 — e.g., "Medellín El Poblado average price: \$2,650/m², up 14% YoY per Galeria Inmobiliaria Q1 2026">
  - <fresh stat 2>
  - <fresh stat 3>
  - <fresh stat 4>

SOURCES:
  - <url 1>
  - <url 2>
  - <url 3>

TONE_NOTE: <anything special — somber/celebratory/cautious — or leave blank for default>
EOF
  echo "Created $INPUTS_FILE"
  echo ""
  echo "1. Fill in the inputs file with this week's data"
  echo "2. Open Claude Code in this repo"
  echo "3. Paste the contents of .audit/prompts/06-weekly-growth-loop.md"
  echo "4. When asked, paste the contents of $INPUTS_FILE"
  exit 0
fi

echo "Inputs file already exists: $INPUTS_FILE"
echo "Edit it, then run Claude Code with .audit/prompts/06-weekly-growth-loop.md"
