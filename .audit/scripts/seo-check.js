#!/usr/bin/env node
/**
 * seo-check.js — Audits HTML files for SEO/meta/heading issues
 * Usage: node seo-check.js --files-glob "**/*.html" --out report.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const glob = args['files-glob'] || '**/*.html';
const outFile = args.out || './seo-report.json';

// Find HTML files (no glob dep — use find)
const files = execSync(
  `find . -type f -name "*.html" \
    -not -path "*/node_modules/*" \
    -not -path "*/.audit/*" \
    -not -path "*/.audit-results/*"`
).toString().trim().split('\n').filter(Boolean);

const issues = [];
const summary = { files: files.length, issues: 0, byType: {} };

const log = (file, type, severity, msg) => {
  issues.push({ file, type, severity, msg });
  summary.byType[type] = (summary.byType[type] || 0) + 1;
  summary.issues++;
};

const get = (html, re) => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
};

const all = (html, re) => {
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
};

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');

  // ---- Title ----
  const title = get(html, /<title>([\s\S]*?)<\/title>/i);
  if (!title) log(file, 'title-missing', 'error', 'No <title> tag');
  else if (title.length < 30) log(file, 'title-short', 'warn', `Title only ${title.length} chars (aim for 50–60)`);
  else if (title.length > 65) log(file, 'title-long', 'warn', `Title ${title.length} chars (truncated in SERPs)`);

  // ---- Meta description ----
  const desc = get(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (!desc) log(file, 'meta-desc-missing', 'error', 'No meta description');
  else if (desc.length < 120) log(file, 'meta-desc-short', 'warn', `Meta desc only ${desc.length} chars (aim for 140–160)`);
  else if (desc.length > 165) log(file, 'meta-desc-long', 'warn', `Meta desc ${desc.length} chars (will truncate)`);

  // ---- Canonical ----
  if (!/<link\s+rel=["']canonical["']/i.test(html))
    log(file, 'canonical-missing', 'warn', 'No canonical link tag');

  // ---- Open Graph ----
  ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].forEach(p => {
    if (!new RegExp(`property=["']${p}["']`, 'i').test(html))
      log(file, `og-missing-${p}`, 'warn', `Missing ${p}`);
  });

  // ---- Twitter card ----
  if (!/name=["']twitter:card["']/i.test(html))
    log(file, 'twitter-card-missing', 'warn', 'No twitter:card meta');

  // ---- Heading hierarchy ----
  const h1s = all(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  if (h1s.length === 0) log(file, 'h1-missing', 'error', 'No <h1> on page');
  else if (h1s.length > 1) log(file, 'h1-multiple', 'warn', `${h1s.length} <h1> tags (should be 1)`);

  // Check skipped heading levels (h2 → h4 with no h3)
  const headings = [];
  const headRe = /<h([1-6])[^>]*>/gi;
  let m;
  while ((m = headRe.exec(html))) headings.push(parseInt(m[1]));
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      log(file, 'heading-skip', 'warn', `Heading jumps from h${headings[i - 1]} to h${headings[i]}`);
      break;
    }
  }

  // ---- Image alt text ----
  const imgs = all(html, /<img\s+([^>]+)>/gi);
  imgs.forEach((attrs, i) => {
    if (!/\balt\s*=/i.test(attrs)) log(file, 'img-no-alt', 'error', `Image #${i + 1} missing alt`);
    else if (/\balt\s*=\s*["']\s*["']/i.test(attrs)) {
      // Empty alt is OK only for decorative — flag as warn
      log(file, 'img-empty-alt', 'info', `Image #${i + 1} has empty alt (OK if decorative)`);
    }
  });

  // ---- Lang attr ----
  if (!/<html[^>]+lang=/i.test(html))
    log(file, 'html-no-lang', 'error', '<html> missing lang attribute');

  // ---- Schema.org JSON-LD ----
  if (!/application\/ld\+json/i.test(html))
    log(file, 'schema-missing', 'info', 'No JSON-LD structured data (recommended for SEO)');

  // ---- Viewport ----
  if (!/name=["']viewport["']/i.test(html))
    log(file, 'viewport-missing', 'error', 'No viewport meta tag');

  // ---- Favicon ----
  if (!/rel=["'](icon|shortcut icon)["']/i.test(html))
    log(file, 'favicon-missing', 'info', 'No favicon link');

  // ---- Inline CSS smell ----
  const inlineStyles = (html.match(/style=["'][^"']+["']/gi) || []).length;
  if (inlineStyles > 20)
    log(file, 'inline-css-heavy', 'warn', `${inlineStyles} inline style attributes (consider extracting)`);
}

// Write outputs
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ summary, issues }, null, 2));

// Console summary
console.log(`\nSEO Audit — ${summary.files} files, ${summary.issues} issues`);
console.log('By type:');
Object.entries(summary.byType)
  .sort((a, b) => b[1] - a[1])
  .forEach(([t, c]) => console.log(`  ${c.toString().padStart(4)}  ${t}`));

if (summary.issues > 0) {
  console.log('\nTop 10 issues:');
  issues.slice(0, 10).forEach(i =>
    console.log(`  [${i.severity}] ${i.file}: ${i.msg}`)
  );
}
console.log(`\nFull report: ${outFile}`);
