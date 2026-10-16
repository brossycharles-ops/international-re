#!/usr/bin/env node
// Visual audit of the LIVE site in a real browser — catches what curl can't:
// broken third-party resources (map tiles, CDNs), CSP blocks, console errors,
// pages wider than a phone, a map that didn't draw, and stale copies served by
// Cloudflare or browsers after a fix.
//
//   npx -y playwright@1.48.2 install chromium   (once per machine)
//   NODE_PATH=$(npm root -g) node scripts/visual_audit.js [--base URL] [--out DIR] [--all]
//   --all checks every sitemap URL (screenshots only for pages with findings)
//
// Writes screenshots + report.json to --out (default /tmp/visual-audit) and
// prints a findings list. Exit 1 if any P0/P1 finding. Look at the screenshots.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('playwright not installed: npm i playwright@1.48.2 && npx playwright install chromium');
  process.exit(2);
}

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'https://www.internationalre.org').replace(/\/$/, '');
const OUT = arg('--out', '/tmp/visual-audit');
const ROOT = path.join(__dirname, '..');
fs.mkdirSync(OUT, { recursive: true });

// Key templates: one of each page type, plus whatever the sitemap lists newest.
const PAGES = ['/', '/about.html', '/contact.html', '/free-guide.html', '/guide/expat-starter-kit.html',
  '/blog.html', '/guides.html', '/cities/', '/cities/medellin-colombia/', '/newsletter.html', '/quiz.html', '/advisory.html'];
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 375, height: 812, isMobile: true }];
const findings = [];
const add = (sev, page, msg) => findings.push({ sev, page, msg });

async function newestFromSitemap() {
  try {
    const xml = await (await fetch(BASE + '/sitemap.xml')).text();
    const items = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
      .map(m => ({ url: m[1].replace(/^https?:\/\/[^/]+/, ''), d: m[2] }))
      .filter(x => /\/(blog|guides|quick-reads|tips)\//.test(x.url))
      .sort((a, b) => b.d.localeCompare(a.d));
    return items.slice(0, 3).map(x => x.url);
  } catch { return []; }
}

// Stale-cache check: what visitors get for each asset vs the repo copy.
async function checkLiveAssets() {
  const files = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'public'))) if (/\.(js|css)$/.test(f)) files.push('/' + f);
  if (fs.existsSync(path.join(ROOT, 'public/data'))) for (const f of fs.readdirSync(path.join(ROOT, 'public/data'))) files.push('/data/' + f);
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  for (const f of files) {
    const local = sha(fs.readFileSync(path.join(ROOT, 'public', f)));
    try {
      const r = await fetch(BASE + f);
      const live = sha(Buffer.from(await r.arrayBuffer()));
      if (live !== local) {
        add('P1', f, `live copy differs from the repo (cf-cache-status ${r.headers.get('cf-cache-status') || '-'}, age ${r.headers.get('age') || '-'}s). If the repo change is over ~1h old, Cloudflare or the server is serving a stale file — purge Cloudflare cache or bump ?v= on the links.`);
      }
    } catch (e) { add('P1', f, 'could not fetch live asset: ' + e.message); }
  }
}

(async () => {
  const ALL = process.argv.includes('--all');
  let pages = [...PAGES, ...(await newestFromSitemap())];
  if (ALL) {
    const xml = await (await fetch(BASE + '/sitemap.xml')).text();
    pages = [...new Set([...pages, ...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, ''))])];
  }
  await checkLiveAssets();
  const browser = await chromium.launch();
  const report = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, deviceScaleFactor: 1 });
    for (const p of pages) {
      const page = await ctx.newPage();
      const errors = [], failed = [], thirdParty = {};
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
      page.on('pageerror', e => errors.push('JS exception: ' + e.message.slice(0, 300)));
      page.on('requestfailed', r => failed.push(`${r.failure()?.errorText || 'failed'} ${r.url().slice(0, 150)}`));
      page.on('response', r => {
        const u = new URL(r.url());
        if (!/internationalre\.org$/.test(u.hostname)) thirdParty[u.hostname] = Math.max(thirdParty[u.hostname] || 0, r.status());
        if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 150)}`);
      });
      let status = 0;
      try {
        const resp = await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 45000 });
        status = resp ? resp.status() : 0;
      } catch (e) { add('P0', p, `${vp.name}: page did not load (${e.message.slice(0, 120)})`); await page.close(); continue; }
      await page.evaluate(() => { document.getElementById('stickyCta')?.remove(); });
      if (status >= 400) add('P0', p, `${vp.name}: HTTP ${status}`);
      const info = await page.evaluate(() => {
        const out = { overflow: document.documentElement.scrollWidth - window.innerWidth };
        const map = document.getElementById('worldMap');
        if (map) {
          map.scrollIntoView();
          out.map = { paths: map.querySelectorAll('path').length, tiles: map.querySelectorAll('img.leaflet-tile').length, text: map.innerText.slice(0, 200) };
        }
        out.brokenImages = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src).map(i => i.src.slice(0, 120)).slice(0, 5);
        out.h1 = document.querySelector('h1')?.innerText.slice(0, 100) || '';
        return out;
      });
      if (info.overflow > 2) add('P1', p, `${vp.name}: page is ${info.overflow}px wider than the screen (horizontal scroll)`);
      if (info.map) {
        await page.waitForTimeout(1500);
        const m = await page.evaluate(() => { const el = document.getElementById('worldMap'); return { paths: el.querySelectorAll('path').length, tiles: el.querySelectorAll('img.leaflet-tile').length, text: el.innerText.slice(0, 200) }; });
        if (m.paths < 100) add('P0', p, `${vp.name}: travel map did not draw (only ${m.paths} shapes). Text: ${m.text}`);
        if (m.tiles > 0) add('P1', p, `${vp.name}: travel map loaded ${m.tiles} third-party tiles — it should draw from /data/world-110m.geojson`);
      }
      if (info.brokenImages.length) add('P1', p, `${vp.name}: broken images: ${info.brokenImages.join(', ')}`);
      if (!info.h1) add('P2', p, `${vp.name}: no <h1>`);
      for (const e of errors) add(/Content Security Policy/.test(e) ? 'P1' : 'P1', p, `${vp.name}: console error: ${e}`);
      for (const f of [...new Set(failed)]) if (!/plausible\.io|cloudflareinsights|google-analytics/.test(f)) add('P1', p, `${vp.name}: request failed: ${f}`);
      const shot = path.join(OUT, `${vp.name}${p.replace(/[^a-z0-9]+/gi, '_') || '_home'}.png`);
      const hadFinding = findings.some(f => f.page === p && f.msg.startsWith(vp.name));
      if (!ALL || hadFinding) await page.screenshot({ path: shot, fullPage: false });
      // Popups opened by scrolling get their own screenshot, then are closed so the map is visible.
      if (await page.locator('.popup-overlay.active').count()) {
        await page.screenshot({ path: shot.replace('.png', '_popup.png') });
        await page.evaluate(() => { document.querySelectorAll('.popup-overlay.active').forEach(el => el.classList.remove('active')); document.body.style.overflow = ''; });
      }
      if (info.map) { await page.locator('#worldMap').screenshot({ path: shot.replace('.png', '_map.png') }).catch(() => {}); }
      report.push({ page: p, viewport: vp.name, status, thirdParty, screenshot: shot });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ base: BASE, at: new Date().toISOString(), findings, pages: report }, null, 2));
  const order = { P0: 0, P1: 1, P2: 2 };
  findings.sort((a, b) => order[a.sev] - order[b.sev]);
  for (const f of findings) console.log(`${f.sev} ${f.page} — ${f.msg}`);
  const tp = {}; report.forEach(r => Object.entries(r.thirdParty).forEach(([h, s]) => { tp[h] = Math.max(tp[h] || 0, s); }));
  console.log('\nThird-party hosts used:', Object.entries(tp).map(([h, s]) => `${h} (${s})`).join(', ') || 'none');
  console.log(`[visual_audit] ${report.length} page views, ${findings.length} findings. Screenshots in ${OUT} — open and look at them.`);
  process.exit(findings.some(f => f.sev !== 'P2') ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
