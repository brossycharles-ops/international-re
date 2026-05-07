#!/usr/bin/env node
/**
 * visual-audit.js — Captures full-page screenshots at multiple breakpoints
 * and detects common visual issues (overflow, clipped text, layout shift)
 *
 * Usage: node visual-audit.js --url https://www.internationalre.org --out ./out
 * Requires: npm i playwright
 */

const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const baseUrl = args.url || 'https://www.internationalre.org';
const outDir = args.out || './visual-audit';
fs.mkdirSync(outDir, { recursive: true });

let chromium;
try {
  chromium = require('playwright').chromium;
} catch {
  console.error('Playwright not installed. Run: npm i playwright && npx playwright install chromium');
  process.exit(1);
}

const breakpoints = [
  { name: 'mobile-iphone-se', width: 375, height: 667 },
  { name: 'mobile-iphone-14',  width: 390, height: 844 },
  { name: 'tablet-ipad',       width: 768, height: 1024 },
  { name: 'laptop-13in',       width: 1280, height: 800 },
  { name: 'desktop-1440',      width: 1440, height: 900 },
  { name: 'desktop-1920',      width: 1920, height: 1080 },
];

const pages = [
  { name: 'home', path: '/' },
  { name: 'blog', path: '/blog.html' },
  { name: 'guides', path: '/guides.html' },
  { name: 'about', path: '/about.html' },
  { name: 'free-guide', path: '/free-guide.html' },
];

const findings = [];

(async () => {
  const browser = await chromium.launch();

  for (const page of pages) {
    for (const bp of breakpoints) {
      const ctx = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        deviceScaleFactor: 1,
      });
      const p = await ctx.newPage();
      const url = baseUrl + page.path;

      // Collect console errors
      const consoleErrors = [];
      p.on('pageerror', err => consoleErrors.push(err.message));
      p.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      try {
        await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        const fname = `${page.name}_${bp.name}.png`;
        await p.screenshot({
          path: path.join(outDir, fname),
          fullPage: true,
        });

        // Detect horizontal overflow (common mobile bug)
        const overflowEls = await p.evaluate(() => {
          const out = [];
          const docW = document.documentElement.clientWidth;
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > docW + 1 || r.left < -1) {
              out.push({
                tag: el.tagName,
                cls: (el.className || '').toString().slice(0, 80),
                id: el.id || '',
                right: Math.round(r.right),
                docW,
              });
            }
          });
          return out.slice(0, 20);
        });

        // Detect tiny tap targets (mobile only)
        let tapIssues = [];
        if (bp.width <= 480) {
          tapIssues = await p.evaluate(() => {
            const out = [];
            document.querySelectorAll('a, button, input, [role="button"]').forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
                out.push({
                  tag: el.tagName,
                  text: (el.innerText || el.value || '').slice(0, 40),
                  w: Math.round(r.width),
                  h: Math.round(r.height),
                });
              }
            });
            return out.slice(0, 15);
          });
        }

        // Detect clipped text (text-overflow / overflow:hidden cutting content)
        const clippedText = await p.evaluate(() => {
          const out = [];
          document.querySelectorAll('h1, h2, h3, p, a, button, span').forEach(el => {
            if (el.scrollWidth > el.clientWidth + 2 &&
                getComputedStyle(el).overflow !== 'visible') {
              out.push({
                tag: el.tagName,
                text: (el.innerText || '').slice(0, 60),
              });
            }
          });
          return out.slice(0, 10);
        });

        findings.push({
          page: page.name, breakpoint: bp.name, url,
          screenshot: fname,
          overflowCount: overflowEls.length,
          overflow: overflowEls,
          tapTargetIssuesCount: tapIssues.length,
          tapTargets: tapIssues,
          clippedTextCount: clippedText.length,
          clippedText,
          consoleErrorCount: consoleErrors.length,
          consoleErrors: consoleErrors.slice(0, 10),
        });

        const flag = overflowEls.length || tapIssues.length || clippedText.length || consoleErrors.length;
        const symbol = flag ? '⚠' : '✓';
        console.log(`  ${symbol} ${page.name} @ ${bp.name}` +
          (overflowEls.length ? ` overflow:${overflowEls.length}` : '') +
          (tapIssues.length ? ` tap:${tapIssues.length}` : '') +
          (clippedText.length ? ` clip:${clippedText.length}` : '') +
          (consoleErrors.length ? ` err:${consoleErrors.length}` : ''));

      } catch (e) {
        console.log(`  ✗ ${page.name} @ ${bp.name} — ${e.message}`);
        findings.push({ page: page.name, breakpoint: bp.name, url, error: e.message });
      }

      await ctx.close();
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(outDir, 'findings.json'),
    JSON.stringify(findings, null, 2)
  );

  // Summary
  const totalOverflow = findings.reduce((s, f) => s + (f.overflowCount || 0), 0);
  const totalTap = findings.reduce((s, f) => s + (f.tapTargetIssuesCount || 0), 0);
  const totalClip = findings.reduce((s, f) => s + (f.clippedTextCount || 0), 0);
  const totalErr = findings.reduce((s, f) => s + (f.consoleErrorCount || 0), 0);

  console.log(`\nVisual audit complete: ${outDir}`);
  console.log(`  Horizontal overflow: ${totalOverflow}`);
  console.log(`  Tap target issues: ${totalTap}`);
  console.log(`  Clipped text: ${totalClip}`);
  console.log(`  Console errors: ${totalErr}`);
})();
