#!/usr/bin/env node
// Visual audit of the LIVE site in a real browser — catches what curl can't:
// broken third-party resources (map tiles, CDNs), CSP blocks, console errors,
// pages wider than a phone, a map that didn't draw, and stale copies served by
// Cloudflare or browsers after a fix.
//
//   NODE_PATH=$(npm root -g) node scripts/visual_audit.js [--base URL] [--out DIR] [--all]
//   Works with whichever playwright resolves (the cloud audit image has a global
//   playwright 1.56 + browsers in /opt/pw-browsers, so NODE_PATH=$(npm root -g) is
//   enough there). Elsewhere: npm i -g playwright && npx playwright install chromium.
//   If the bundled browser revision is missing, it retries with $PLAYWRIGHT_CHROMIUM
//   or /opt/pw-browsers/chromium-*/chrome-linux/chrome.
//   --all checks every sitemap URL (screenshots only for pages with findings)
//
// Writes screenshots + report.json to --out (default /tmp/visual-audit) and
// prints a findings list. Exit 1 if any P0/P1 finding. Look at the screenshots.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('playwright not found: run with NODE_PATH=$(npm root -g), or npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'https://www.internationalre.org').replace(/\/$/, '');
const OUT = arg('--out', '/tmp/visual-audit');
const ROOT = path.join(__dirname, '..');
fs.mkdirSync(OUT, { recursive: true });

// Key templates: one of each page type, plus the newest articles (see newestFromSitemap).
const PAGES = ['/', '/about.html', '/contact.html', '/free-guide.html', '/guide/expat-starter-kit.html',
  '/blog.html', '/guides.html', '/cities/', '/cities/medellin-colombia/', '/newsletter.html', '/quiz.html', '/advisory.html'];
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 375, height: 812, isMobile: true }];
const findings = [];
const add = (sev, page, msg) => findings.push({ sev, page, msg });

// The pinned/global playwright may expect a browser revision that isn't installed
// (e.g. playwright 1.48 wants chromium-1140, the image ships chromium-1194). Fall
// back to an explicit executable rather than failing the whole audit.
async function launchBrowser() {
  try { return await chromium.launch(); } catch (err) {
    const candidates = [process.env.PLAYWRIGHT_CHROMIUM];
    try {
      const base = '/opt/pw-browsers';
      for (const d of fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => b.split('-')[1] - a.split('-')[1])) {
        candidates.push(path.join(base, d, 'chrome-linux', 'chrome'));
      }
    } catch {}
    for (const exe of candidates.filter(Boolean)) {
      if (!fs.existsSync(exe)) continue;
      try {
        const b = await chromium.launch({ executablePath: exe });
        console.error(`[visual_audit] default chromium launch failed; using ${exe}`);
        return b;
      } catch (e) { console.error(`[visual_audit] ${exe} failed: ${e.message.split('\n')[0]}`); }
    }
    throw err;
  }
}

// Scroll through the page so IntersectionObserver fade-ins and lazy images
// render before the screenshot, then return to the top.
async function revealPage(page) {
  await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const to = top => window.scrollTo({ top, behavior: 'instant' }); // styles.css sets scroll-behavior: smooth
    const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
    for (let y = 0, n = 0; y < document.documentElement.scrollHeight && n < 60; y += step, n++) { to(y); await wait(120); }
    to(document.documentElement.scrollHeight);
    await wait(300);
    to(0);
    await wait(400);
  });
}

// Articles to add to the key templates: the 3 newest by sitemap <lastmod> (recent
// edits) plus the 3 most recently PUBLISHED — lastmod alone picked old pages that
// were just refreshed and missed a brand-new article. Publish dates come from
// "datePublished" in the repo copy's JSON-LD; only URLs the live sitemap lists are
// used, so an undeployed page is never audited. At most 6 extra pages.
function datePublished(url) {
  try {
    const file = path.join(ROOT, 'public', decodeURIComponent(url).replace(/\/$/, '/index.html'));
    if (!file.startsWith(path.join(ROOT, 'public') + path.sep)) return '';
    const m = fs.readFileSync(file, 'utf8').match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  } catch { return ''; }
}

async function newestFromSitemap() {
  try {
    const xml = await (await fetch(BASE + '/sitemap.xml')).text();
    const items = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
      .map(m => ({ url: m[1].replace(/^https?:\/\/[^/]+/, ''), d: m[2] }))
      .filter(x => /\/(blog|guides|quick-reads|tips)\//.test(x.url));
    const byLastmod = [...items].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 3).map(x => x.url);
    const byPublished = items.map(x => ({ url: x.url, p: datePublished(x.url) })).filter(x => x.p)
      .sort((a, b) => b.p.localeCompare(a.p) || a.url.localeCompare(b.url)).slice(0, 3).map(x => x.url);
    return [...new Set([...byPublished, ...byLastmod])];
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
  let pages = [...new Set([...PAGES, ...(await newestFromSitemap())])];
  if (ALL) {
    const xml = await (await fetch(BASE + '/sitemap.xml')).text();
    pages = [...new Set([...pages, ...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, ''))])];
  }
  await checkLiveAssets();
  const browser = await launchBrowser();
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
      await revealPage(page).catch(() => {});
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
