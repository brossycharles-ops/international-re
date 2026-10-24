#!/usr/bin/env node
// Server behaviour tests with a mocked email provider. No network, no real email.
// Run: node scripts/test_server.js   (also run by scripts/verify_site.sh)
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const sent = [];
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'resend') return { Resend: class { constructor() { this.emails = { send: async m => { sent.push(m); return { id: 'test' }; } }; } } };
  return origLoad.call(this, req, ...rest);
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ire-test-'));
const day = n => new Date(Date.now() - n * 864e5).toISOString();
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(dir, 'subscribers.json'), JSON.stringify([
  { email: 'old@realmail.io', firstName: 'Old', subscribedAt: day(200), drip: ['day1', 'day3', 'day7', 'day14', 'day21', 'day30'] },
  { email: 'new@realmail.io', firstName: 'New', subscribedAt: day(1.5), drip: [] },
]));
const nlDir = path.join(__dirname, '..', 'data', 'newsletters');
const nlFile = path.join(nlDir, `${today}.json`);
const createdNl = !fs.existsSync(nlFile);
if (createdNl) { fs.mkdirSync(nlDir, { recursive: true }); fs.writeFileSync(nlFile, JSON.stringify({ subject: 'Test issue', html: '<p>Hi {{firstName}}</p>' + 'x'.repeat(250) })); }
const nlSubject = JSON.parse(fs.readFileSync(nlFile, 'utf8')).subject;

// Audit-report fixtures: a market report newer than the latest daily audit.
const ctoDir = path.join(dir, 'cto-reports');
const yday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
fs.mkdirSync(ctoDir);
fs.writeFileSync(path.join(ctoDir, `${yday}.md`), '# Audit\n\n## Status\n\nAll systems green\n');
fs.writeFileSync(path.join(ctoDir, `${today}-market.md`), '# Market data\n\n## Status\n\nNot an audit\n');

let PORT, B;
const post = (p, body, raw) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) });
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : '  ' + detail}`); if (!ok) failures++; };

(async () => {
  // Ask the OS for a free port (a random pick could collide with a parallel run),
  // then wait until the server answers: a fixed 400 ms sleep lost the race on a
  // busy machine and the first fetch died with ECONNREFUSED 127.0.0.1:<port>.
  PORT = await new Promise((res, rej) => { const s = require('net').createServer().once('error', rej).listen(0, '0.0.0.0', () => { const p = s.address().port; s.close(() => res(p)); }); });
  B = `http://127.0.0.1:${PORT}`;
  Object.assign(process.env, {
    PORT: String(PORT), ADMIN_KEY: 'test-admin-key', RESEND_API_KEY: 'test', SUBSCRIBERS_FILE: path.join(dir, 'subscribers.json'),
    ENABLE_EMAIL_SCHEDULER: '0', BACKUP_EMAIL: '', CTO_REPORTS_DIR: ctoDir,
  });
  require(path.join(__dirname, '..', 'server.js'));
  for (let i = 0; ; i++) {
    try { await fetch(B + '/robots.txt', { signal: AbortSignal.timeout(2000) }); break; }
    catch (e) { if (i >= 100) throw new Error(`server did not start on port ${PORT}`); await new Promise(r => setTimeout(r, 100)); }
  }
  // Subscribe validation
  check('rejects reserved test domains', (await post('/api/subscribe', { email: 'a@example.com' })).status === 400);
  check('rejects malformed email', (await post('/api/subscribe', { email: 'nope' })).status === 400);
  sent.length = 0;
  check('accepts email-only signup', (await post('/api/subscribe', { email: 'fresh@realmail.io' })).status === 200);
  await new Promise(r => setTimeout(r, 100));
  check('sends a welcome email linking the Starter Kit', sent.some(m => m.to === 'fresh@realmail.io' && /expat-starter-kit/.test(m.html)));
  check('malformed JSON gets a clean 400', (await post('/api/subscribe', null, '{bad')).status === 400);

  // Admin auth
  check('drip-check needs the admin key', (await post('/api/drip-check', { key: 'wrong' })).status === 401);
  check('restore needs the admin key', (await post('/api/admin/restore-subscribers', { key: 'wrong', subscribers: [] })).status === 401);
  for (const [m, p] of [['GET', '/api/subscribers'], ['GET', '/api/admin/traffic'], ['POST', '/api/send-newsletter'], ['POST', '/api/admin/cleanup-test-subscribers']]) {
    const res = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.40' }, body: m === 'POST' ? '{}' : undefined });
    check(`${m} ${p} needs the admin key`, res.status === 401, String(res.status));
  }

  // A corrupt subscriber file must be set aside, not overwritten by the next signup.
  const subsFile = process.env.SUBSCRIBERS_FILE;
  const goodList = fs.readFileSync(subsFile, 'utf8');
  const garbage = goodList.slice(0, Math.floor(goodList.length / 2)); // a half-written file
  fs.writeFileSync(subsFile, garbage);
  check('signup still works when the subscriber file is corrupt', (await post('/api/subscribe', { email: 'after-corrupt@realmail.io' })).status === 200);
  const aside = fs.readdirSync(dir).filter(f => f.startsWith('subscribers.json.corrupt-'));
  check('corrupt subscriber file is kept for recovery', aside.length === 1 && fs.readFileSync(path.join(dir, aside[0]), 'utf8') === garbage, aside.join());
  check('subscriber writes leave no temp files', !fs.readdirSync(dir).some(f => f.endsWith('.tmp')));
  aside.forEach(f => fs.unlinkSync(path.join(dir, f)));
  fs.writeFileSync(subsFile, goodList);

  // Drip + newsletter
  sent.length = 0;
  let r = await (await post('/api/drip-check', { key: 'test-admin-key' })).json();
  const to = e => sent.filter(m => m.to === e).map(m => m.subject);
  check('new subscriber gets exactly the day-1 drip', to('new@realmail.io').filter(s => s !== nlSubject).length === 1, JSON.stringify(to('new@realmail.io')));
  check('old subscriber gets no backfilled drips', to('old@realmail.io').filter(s => s !== nlSubject).length === 0, JSON.stringify(to('old@realmail.io')));
  check('newsletter goes to every subscriber', r.newsletterSent === 3, JSON.stringify(r));
  sent.length = 0;
  r = await (await post('/api/drip-check', { key: 'test-admin-key' })).json();
  check('second run sends nothing (idempotent)', sent.length === 0, JSON.stringify(sent.map(m => m.to + ':' + m.subject)));

  // Restore
  const sub = [{ email: 'Restored@Realmail.io', subscribedAt: day(10), drip: ['day1', 'day3', 'bogus'] }, { email: 'bad' }];
  r = await (await post('/api/admin/restore-subscribers', { key: 'test-admin-key', subscribers: sub })).json();
  check('restore adds valid records and rejects invalid', r.added === 1 && r.rejected.length === 1, JSON.stringify(r));
  r = await (await post('/api/admin/restore-subscribers', { key: 'test-admin-key', subscribers: sub })).json();
  check('restore is idempotent', r.added === 0, JSON.stringify(r));
  const stored = JSON.parse(fs.readFileSync(process.env.SUBSCRIBERS_FILE)).find(s => s.email === 'restored@realmail.io');
  check('restore normalises email and filters unknown drip ids', !!stored && stored.drip.join() === 'day1,day3', JSON.stringify(stored));

  // Built-in visitor counts
  const browser = { 'User-Agent': 'Mozilla/5.0 (Macintosh) Safari/605', 'X-Forwarded-For': '203.0.113.7', 'Accept-Language': 'en-US,en;q=0.9', 'Sec-Fetch-Mode': 'navigate' };
  const stats = async () => (await (await fetch(B + '/api/stats/summary')).json()).last7;
  // Node's fetch always sends Sec-Fetch-Mode: cors, so page loads use http.get like a browser navigation.
  const load = (p, headers) => new Promise((res) => require('http').get(B + p, { headers }, (r) => { r.resume(); r.on('end', res); }));
  const before = await stats();
  await load('/', { ...browser, Referer: 'https://www.google.com/' });
  await load('/free-guide.html', browser);
  await load('/', { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' });
  await load('/styles.css', browser);
  await load('/no-such-page.html', browser);
  await load('/contact.html', { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', 'X-Forwarded-For': '203.0.113.99' }); // fake-browser scraper
  await new Promise(r => setTimeout(r, 100));
  const after = await stats();
  check('counts real browser page views only (not bots, fake-browser scrapers, assets, 404s)', after.pageviews - before.pageviews === 2, JSON.stringify(after));
  check('counts one visitor for two pages', after.visitors - before.visitors === 1, JSON.stringify(after));
  check('records referring site and top pages', after.sources.some(s => s.source === 'google.com') && after.pages.some(p => p.page === '/free-guide.html'), JSON.stringify(after));

  // RSS feed: page titles/descriptions are already HTML-escaped and must be escaped once, not twice.
  let res = await fetch(B + '/feed.xml');
  const feed = await res.text();
  const dbl = feed.match(/&amp;(#x?[0-9a-f]+|[a-z]+);/i);
  check('feed.xml does not double-escape entities (homepage cards showed "&#x27;")', res.status === 200 && !dbl, dbl && dbl[0]);
  const bare = feed.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)[^\s]{0,12}/i);
  check('feed.xml has no bare ampersands', !bare, bare && bare[0]);

  // Errors: fixed JSON messages, no stack traces or parser internals.
  res = await fetch(B + '/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=bogus-9', 'X-Forwarded-For': '192.0.2.90' }, body: '{}' });
  let txt = await res.text();
  check('unsupported charset gets a 4xx "Invalid request." without internals', res.status === 415 && JSON.parse(txt).error === 'Invalid request.' && !/at |node_modules|Error/.test(txt), `${res.status} ${txt}`);
  res = await post('/api/subscribe', null, '{bad');
  txt = await res.text();
  check('malformed JSON response leaks no stack or paths', !/SyntaxError|node_modules|server\.js|at /.test(txt), txt);
  check('security headers present, X-Powered-By hidden', !!res.headers.get('content-security-policy') && !res.headers.get('x-powered-by') && res.headers.get('x-frame-options') === 'SAMEORIGIN', JSON.stringify([...res.headers]));

  // Contact form
  sent.length = 0;
  process.env.CONTACT_EMAIL = 'owner@realmail.io';
  check('contact rejects missing email', (await post('/api/contact', { message: 'The tax rate on this page is out of date.' })).status === 400);
  check('contact rejects a too-short message', (await post('/api/contact', { email: 'reader@realmail.io', message: 'hi' })).status === 400);
  r = await post('/api/contact', { email: 'Reader@Realmail.io', kind: 'correction', page: '/guides/x.html', message: 'The <b>tax</b> rate here changed in 2026.' });
  check('contact accepts a valid message', r.status === 200);
  const mail = sent.find(m => m.to === 'owner@realmail.io');
  check('contact emails the owner with reply-to and escaped HTML', !!mail && mail.replyTo === 'reader@realmail.io' && /&lt;b&gt;tax/.test(mail.html), JSON.stringify(mail));
  sent.length = 0;
  check('contact honeypot pretends success but sends nothing', (await post('/api/contact', { email: 'bot@realmail.io', message: 'Buy cheap things now!!!', website: 'x' })).status === 200 && sent.length === 0);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'messages.json')));
  check('contact keeps a copy on the volume', saved.some(m => m.email === 'reader@realmail.io' && m.kind === 'correction'));

  // Contact must not claim "sent" when the message reached neither the volume nor an inbox.
  const msgFile = path.join(dir, 'messages.json');
  const contactAs = (ip) => fetch(B + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify({ email: 'reader2@realmail.io', message: 'Is the 2026 rate still current?' }) });
  fs.renameSync(msgFile, msgFile + '.bak'); fs.mkdirSync(msgFile); // makes the save fail
  delete process.env.CONTACT_EMAIL;
  res = await contactAs('192.0.2.80');
  check('contact returns 500 when neither save nor email worked', res.status === 500 && /try again/i.test((await res.json()).error), String(res.status));
  process.env.CONTACT_EMAIL = 'owner@realmail.io';
  sent.length = 0;
  res = await contactAs('192.0.2.81');
  check('contact still succeeds when only the email went out', res.status === 200 && sent.some(m => m.to === 'owner@realmail.io'), String(res.status));
  fs.rmdirSync(msgFile); fs.renameSync(msgFile + '.bak', msgFile);
  delete process.env.CONTACT_EMAIL;
  res = await contactAs('192.0.2.82');
  check('contact succeeds when saved but no recipient is configured', res.status === 200 && JSON.parse(fs.readFileSync(msgFile)).some(m => m.email === 'reader2@realmail.io'), String(res.status));
  process.env.CONTACT_EMAIL = 'owner@realmail.io';

  sent.length = 0;
  await fetch(B + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.77' }, body: JSON.stringify({ kind: 'advisory', name: 'A', email: 'client@realmail.io', message: 'ADVISORY APPLICATION\nTier: Strategy Call' }) });
  check('advisory applications reach the owner, labelled', sent.some(m => m.to === 'owner@realmail.io' && /Advisory application/.test(m.subject)), JSON.stringify(sent.map(m => m.subject)));

  // A forged leftmost X-Forwarded-For entry must not reset the rate limit.
  const spoof = async n => (await fetch(B + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.0.${n}, 198.51.100.9` }, body: JSON.stringify({ email: 'r@realmail.io', message: 'Testing the rate limit here.' }) })).status;
  const codes = []; for (let n = 0; n < 6; n++) codes.push(await spoof(n));
  check('rate limit keys on the proxy-added IP, not a forged one', codes[5] === 429, codes.join(','));
  check('admin key accepted from the X-Admin-Key header', (await fetch(B + '/api/drip-check', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': 'test-admin-key' }, body: '{}' })).status === 200);

  // Input validation: wrong JSON types must get a 400, never a 500 or a hung request.
  const postT = (p, body) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.10' }, body: JSON.stringify(body), signal: AbortSignal.timeout(3000) });
  check('subscribe rejects a non-string email with 400', (await postT('/api/subscribe', { email: ['arr@realmail.io'] })).status === 400);
  check('subscribe rejects an over-long email', (await postT('/api/subscribe', { email: 'a'.repeat(250) + '@realmail.io' })).status === 400);
  check('subscribe tolerates a non-string first name', (await postT('/api/subscribe', { email: 'num@realmail.io', firstName: 5 })).status === 200);
  sent.length = 0;
  await postT('/api/subscribe', { email: 'html@realmail.io', firstName: '<a href="https://evil.example">Verify</a>' });
  await new Promise(r => setTimeout(r, 100));
  const welcome = sent.find(m => m.to === 'html@realmail.io');
  check('welcome email escapes the subscriber-supplied name', !!welcome && !/<a href="https:\/\/evil/.test(welcome.html) && /&lt;a href/.test(welcome.html));
  let st = 0; try { st = (await postT('/api/unsubscribe', { email: 5 })).status; } catch (e) { st = 'hung'; }
  check('unsubscribe rejects a non-string email with 400 (used to hang)', st === 400, String(st));
  await postT('/api/contact', { email: 'proto@realmail.io', kind: 'toString', message: 'Prototype key as the kind field.' });
  check('contact maps unknown/prototype kinds to other', JSON.parse(fs.readFileSync(path.join(dir, 'messages.json'))).find(m => m.email === 'proto@realmail.io')?.kind === 'other');

  // No-JS fallback for the advisory form: plain urlencoded POST, 303 redirect.
  const form = (fields, ip = '192.0.2.20') => fetch(B + '/advisory-intake', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Forwarded-For': ip }, body: new URLSearchParams(fields).toString() });
  const adv = { name: 'Ana Client', email: 'Ana@Realmail.io', target_country: 'Panama', budget_range: '$200K-$500K', timeline: '3-6 months', tier_interest: 'Strategy Call', motivation: 'Retiring in 2027.' };
  sent.length = 0;
  r = await form(adv);
  check('advisory-intake redirects 303 to the success page', r.status === 303 && r.headers.get('location') === '/advisory-success.html', `${r.status} ${r.headers.get('location')}`);
  const advMail = sent.find(m => m.to === 'owner@realmail.io');
  check('advisory-intake emails the same ADVISORY APPLICATION message as the JS', !!advMail && /Advisory application/.test(advMail.subject) && advMail.replyTo === 'ana@realmail.io'
    && advMail.html.includes('ADVISORY APPLICATION\nTier: Strategy Call\nTarget country: Panama\nBudget: $200K-$500K\nTimeline: 3-6 months\n\nGoals:\nRetiring in 2027.'), JSON.stringify(advMail));
  check('advisory-intake keeps a copy on the volume', JSON.parse(fs.readFileSync(path.join(dir, 'messages.json'))).some(m => m.email === 'ana@realmail.io' && m.kind === 'advisory' && m.page === '/advisory.html'));
  r = await form({ ...adv, timeline: '' }, '192.0.2.21');
  check('advisory-intake sends a missing field back to the form', r.status === 303 && /^\/advisory\.html\?error=1/.test(r.headers.get('location')), `${r.status} ${r.headers.get('location')}`);
  r = await form({ ...adv, email: 'not-an-email' }, '192.0.2.21');
  check('advisory-intake sends a bad email back to the form', r.status === 303 && /^\/advisory\.html\?error=1/.test(r.headers.get('location')));
  sent.length = 0;
  r = await form({ ...adv, website: 'spam' }, '192.0.2.22');
  check('advisory-intake honeypot pretends success but sends nothing', r.status === 303 && r.headers.get('location') === '/advisory-success.html' && sent.length === 0);
  const advCodes = []; for (let n = 0; n < 6; n++) advCodes.push((await form(adv, '192.0.2.23')).headers.get('location'));
  check('advisory-intake shares the contact rate limit', advCodes[4] === '/advisory-success.html' && /error=rate/.test(advCodes[5]), advCodes.join(','));
  r = await fetch(B + '/advisory-intake', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'motivation=' + 'x'.repeat(30000) });
  check('advisory-intake caps the form body size', r.status === 413, String(r.status));

  // Signups are credited to the page they came from (same-site Referer only).
  await fetch(B + '/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://www.internationalre.org/guides/x.html', 'X-Forwarded-For': '198.51.100.40' }, body: JSON.stringify({ email: 'reader2@realmail.io', source: 'guides-x-inline' }) });
  await fetch(B + '/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://evil.example/guides/x.html', 'X-Forwarded-For': '198.51.100.41' }, body: JSON.stringify({ email: 'reader3@realmail.io' }) });
  const subsNow = JSON.parse(fs.readFileSync(process.env.SUBSCRIBERS_FILE));
  check('signup records its same-site page only', subsNow.find(x => x.email === 'reader2@realmail.io')?.page === '/guides/x.html' && !subsNow.find(x => x.email === 'reader3@realmail.io')?.page, JSON.stringify(subsNow.slice(-2)));
  const gst = await (await fetch(B + '/api/status')).json();
  check('status reports signups by page', gst.growth && gst.growth.byPage.some(r => r.page === '/guides/x.html' && r.signups === 1) && gst.growth.signups28 >= 2, JSON.stringify(gst.growth));
  check('status lists the Growth Director', gst.agents.some(a => a.id === 'director'));
  check('status audit ignores non-audit reports (e.g. YYYY-MM-DD-market.md)', gst.audit && gst.audit.file === `${yday}.md` && gst.audit.status === 'All systems green', JSON.stringify(gst.audit));

  if (createdNl) fs.unlinkSync(nlFile);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(failures ? `[test_server] ${failures} FAILED` : '[test_server] all passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); if (createdNl) try { fs.unlinkSync(nlFile); } catch {} process.exit(1); });
