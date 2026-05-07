#!/usr/bin/env bash
# audit.sh — Full audit pipeline for internationalre.org
# Run from repo root: ./.audit/scripts/audit.sh

set -euo pipefail

QUICK=false
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=true
  shift
fi

# -------- Config --------
SITE_URL="${SITE_URL:-https://www.internationalre.org}"
AUDIT_DIR="${AUDIT_DIR:-./.audit-results/$(date +%Y-%m-%d_%H%M%S)}"
ROOT="$(pwd)"

# Detect HTML files — in --quick mode, only audit files modified this week
if $QUICK; then
  HTML_FILES=$(git diff --name-only --diff-filter=ACMR HEAD~7 -- '*.html' 2>/dev/null \
    | grep -v node_modules | grep -v .audit || true)
  if [ -z "$HTML_FILES" ]; then
    echo "No HTML files modified in the last 7 days. Nothing to audit."
    exit 0
  fi
  log() { printf "\n\033[1;36m▶ %s (quick)\033[0m\n" "$1"; }
else
  HTML_FILES=$(find . -type f \( -name "*.html" -o -name "*.htm" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -not -path "*/.audit/*" \
    -not -path "*/.audit-results/*" \
    2>/dev/null || true)
fi

mkdir -p "$AUDIT_DIR"/{html,css,js,seo,a11y,visual,perf,links}

log() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$1"; }
ok() { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }

# -------- 1. HTML validation --------
log "1/7  HTML validation (htmlhint)"
if command -v htmlhint >/dev/null 2>&1; then
  echo "$HTML_FILES" | xargs -I {} htmlhint --format json "{}" > "$AUDIT_DIR/html/htmlhint.json" 2>&1 || true
  echo "$HTML_FILES" | xargs -I {} htmlhint "{}" > "$AUDIT_DIR/html/htmlhint.txt" 2>&1 || true
  ok "HTML report → $AUDIT_DIR/html/"
else
  warn "htmlhint not installed — skipping. Install: npm i -g htmlhint"
fi

# -------- 2. CSS validation --------
log "2/7  CSS / inline style audit (stylelint)"
if command -v stylelint >/dev/null 2>&1; then
  cat > /tmp/.stylelintrc.json <<'EOF'
{
  "rules": {
    "color-no-invalid-hex": true,
    "unit-no-unknown": true,
    "property-no-unknown": true,
    "block-no-empty": true,
    "declaration-block-no-duplicate-properties": true,
    "no-duplicate-selectors": true,
    "no-descending-specificity": null
  }
}
EOF
  stylelint --config /tmp/.stylelintrc.json \
    "**/*.css" "**/*.html" \
    --ignore-pattern "node_modules/**" \
    --ignore-pattern ".audit/**" \
    --ignore-pattern ".audit-results/**" \
    --formatter json > "$AUDIT_DIR/css/stylelint.json" 2>&1 || true
  ok "CSS report → $AUDIT_DIR/css/"
else
  warn "stylelint not installed — skipping. Install: npm i -g stylelint"
fi

# -------- 3. SEO + meta audit --------
log "3/7  SEO / meta / heading hierarchy"
node "$ROOT/.audit/scripts/seo-check.js" \
  --files-glob "**/*.html" \
  --out "$AUDIT_DIR/seo/seo-report.json" \
  2>&1 | tee "$AUDIT_DIR/seo/seo-report.txt" || warn "SEO check had issues"

# -------- 4. Accessibility (pa11y) --------
log "4/7  Accessibility — pa11y on live URLs"
if command -v pa11y >/dev/null 2>&1; then
  for path in "/" "/blog.html" "/guides.html" "/about.html" "/free-guide.html"; do
    safe=$(echo "$path" | sed 's|/|_|g; s|\.html||')
    pa11y --reporter json "$SITE_URL$path" \
      > "$AUDIT_DIR/a11y/pa11y_${safe:-home}.json" 2>&1 || true
  done
  ok "A11y report → $AUDIT_DIR/a11y/"
else
  warn "pa11y not installed. Install: npm i -g pa11y"
fi

# -------- 5. Broken links --------
log "5/7  Broken link check"
if command -v blc >/dev/null 2>&1; then
  blc "$SITE_URL" -ro --filter-level 3 \
    > "$AUDIT_DIR/links/broken-links.txt" 2>&1 || true
  grep -E "^(BROKEN|─.*BROKEN)" "$AUDIT_DIR/links/broken-links.txt" \
    > "$AUDIT_DIR/links/broken-only.txt" 2>/dev/null || true
  ok "Link report → $AUDIT_DIR/links/"
else
  warn "blc not installed. Install: npm i -g broken-link-checker"
fi

# -------- 6. Visual / responsive screenshot audit --------
if $QUICK; then
  log "6/7  Visual audit — SKIPPED (--quick mode)"
else
  log "6/7  Visual audit — screenshots × breakpoints"
  node "$ROOT/.audit/scripts/visual-audit.js" \
    --url "$SITE_URL" \
    --out "$AUDIT_DIR/visual" \
    2>&1 || warn "Visual audit had issues — ensure playwright is installed"
fi

# -------- 7. Performance — Lighthouse --------
if $QUICK; then
  log "7/7  Lighthouse — SKIPPED (--quick mode)"
else
  log "7/7  Lighthouse performance + SEO + best-practices"
  if command -v lighthouse >/dev/null 2>&1; then
    for path in "/" "/blog.html" "/free-guide.html"; do
      safe=$(echo "$path" | sed 's|/|_|g; s|\.html||')
      lighthouse "$SITE_URL$path" \
        --output=json --output=html \
        --output-path="$AUDIT_DIR/perf/lh_${safe:-home}" \
        --only-categories=performance,accessibility,best-practices,seo \
        --chrome-flags="--headless --no-sandbox" \
        --quiet 2>&1 || true
    done
    ok "Perf report → $AUDIT_DIR/perf/"
  else
    warn "lighthouse not installed. Install: npm i -g lighthouse"
  fi
fi

# -------- Summary --------
log "Audit complete"
echo "Results: $AUDIT_DIR"
echo ""
echo "Next steps:"
echo "  1. cd into the repo and open Claude Code"
echo "  2. Run prompt: .audit/prompts/01-audit-and-fix.md"
echo "  3. Pass in: $AUDIT_DIR"
