const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const crypto = require('crypto');

const { Resend } = require('resend');

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://plausible.io'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https://images.unsplash.com', 'https://unpkg.com', 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com'],
      'connect-src': ["'self'", 'https://plausible.io'],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': [],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
const PORT = process.env.PORT || 3000;
// CRITICAL: on Railway / Fly / Render the container filesystem is ephemeral and
// every deploy wipes this file. Mount a persistent Volume in the platform
// dashboard (e.g. Railway → Volumes → mount at /data) and set
// SUBSCRIBERS_FILE=/data/subscribers.json so subscribers survive redeploys.
const SUBSCRIBERS_FILE = process.env.SUBSCRIBERS_FILE || path.join(__dirname, 'data', 'subscribers.json');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'International RE <onboarding@resend.dev>';

app.use(compression());
app.use(express.json({ limit: '50kb' }));

// ─── Built-in visitor counts ───
// Cookieless and private: a visitor is a hash of IP + user agent + a salt that
// changes daily and is never stored with the counts, so nobody can be tracked
// across days. Replaces the lapsed Plausible trial for the owner report and
// gives the agents a /api/stats/summary of what people actually read.
const TRAFFIC_FILE = path.join(path.dirname(SUBSCRIBERS_FILE), 'traffic.json');
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|uptime|curl|wget|python|node-fetch|axios|go-http|java\/|headless|lighthouse|pagespeed|semrush|ahrefs|scrapy|httpclient/i;
const OWN_HOST = /(^|\.)internationalre\.org$/i;
let traffic = (() => { try { return JSON.parse(fs.readFileSync(TRAFFIC_FILE, 'utf-8')); } catch { return { days: {} }; } })();
let trafficDirty = false;

function trafficDay(date) {
  if (!traffic.today || traffic.today.date !== date) {
    traffic.today = { date, salt: crypto.randomBytes(16).toString('hex'), seen: [] };
    const cutoff = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
    for (const d of Object.keys(traffic.days)) if (d < cutoff) delete traffic.days[d];
  }
  return (traffic.days[date] ||= { views: 0, visitors: 0, pages: {}, refs: {} });
}

function bump(map, key, limit) {
  if (key in map || Object.keys(map).length < limit) map[key] = (map[key] || 0) + 1;
}

function countPageview(req) {
  const ua = req.get('user-agent') || '';
  if (!ua || BOT_UA.test(ua) || /prefetch|prerender/i.test(req.get('sec-purpose') || req.get('purpose') || '')) return;
  const date = new Date().toISOString().slice(0, 10);
  const day = trafficDay(date);
  const ip = String(req.get('x-forwarded-for') || req.socket.remoteAddress || '').split(',')[0].trim();
  const id = crypto.createHash('sha256').update(traffic.today.salt + ip + ua).digest('hex').slice(0, 16);
  if (!traffic.today.seen.includes(id)) { traffic.today.seen.push(id); day.visitors++; }
  day.views++;
  bump(day.pages, req.path.replace(/index\.html$/, '').slice(0, 200), 500);
  let ref = '';
  try { ref = new URL(req.get('referer') || '').hostname.replace(/^www\./, ''); } catch {}
  if (ref && !OWN_HOST.test(ref)) bump(day.refs, ref.slice(0, 100), 200);
  trafficDirty = true;
}

function saveTraffic() {
  if (!trafficDirty) return;
  try { ensureDataDir(); fs.writeFileSync(TRAFFIC_FILE + '.tmp', JSON.stringify(traffic)); fs.renameSync(TRAFFIC_FILE + '.tmp', TRAFFIC_FILE); trafficDirty = false; }
  catch (err) { console.error('Traffic write failed:', err.message); }
}

// Totals for the last `days` days (including today); visitors are summed daily uniques.
function trafficSummary(days, top = 10) {
  const from = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
  const out = { days, since: from, visitors: 0, pageviews: 0, pages: {}, sources: {} };
  for (const [d, v] of Object.entries(traffic.days)) {
    if (d < from) continue;
    out.visitors += v.visitors; out.pageviews += v.views;
    for (const [k, n] of Object.entries(v.pages)) out.pages[k] = (out.pages[k] || 0) + n;
    for (const [k, n] of Object.entries(v.refs)) out.sources[k] = (out.sources[k] || 0) + n;
  }
  const rank = m => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, top);
  out.pages = rank(out.pages).map(([page, views]) => ({ page, views }));
  out.sources = rank(out.sources).map(([source, views]) => ({ source, views }));
  return out;
}

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && (/\/$|\.html$/.test(req.path) || !path.extname(req.path))) {
    res.on('finish', () => {
      if ((res.statusCode === 200 || res.statusCode === 304) && /html/.test(res.get('content-type') || 'text/html')) countPageview(req);
    });
  }
  next();
});

app.get('/api/stats/summary', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ last7: trafficSummary(7), last28: trafficSummary(28), note: 'Built-in cookieless counts; bots excluded. Visitors are daily unique visitors summed over the period.' });
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (/\.html$/i.test(filePath)) {
      // Revalidate HTML on every visit (cheap 304s) so new articles show up at
      // once and every page view reaches the visitor counter.
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (/\.(css|js)$/i.test(filePath)) {
      // No immutable — filenames aren't content-hashed, so must revalidate daily
      res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    } else if (/\.(png|jpe?g|webp|svg|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

// ─── Subscriber Storage ───
// On Railway/Fly/Render, mount a persistent Volume and set SUBSCRIBERS_FILE
// to a path on it (e.g. /data/subscribers.json), otherwise subscribers get
// wiped on every redeploy because the container fs is ephemeral.

function ensureDataDir() {
  const dataDir = path.dirname(SUBSCRIBERS_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readSubscribers() {
  ensureDataDir();
  if (!fs.existsSync(SUBSCRIBERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSubscribers(subscribers) {
  ensureDataDir();
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

// Simple write lock to prevent concurrent file corruption
let writeLock = false;
const writeQueue = [];

function acquireLock() {
  return new Promise((resolve) => {
    if (!writeLock) {
      writeLock = true;
      resolve();
    } else {
      writeQueue.push(resolve);
    }
  });
}

function releaseLock() {
  if (writeQueue.length > 0) {
    writeQueue.shift()();
  } else {
    writeLock = false;
  }
}

// ─── Simple in-memory rate limiter (no extra dep) ───

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
// 5 was too tight — shared NATs / corporate networks could lock out legitimate
// users in a few minutes. 20 still blocks rapid bot enumeration but leaves
// headroom for retries, mistyped emails, and multiple users behind one IP.
const RATE_LIMIT_MAX = 20;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  return entry.count <= RATE_LIMIT_MAX;
}

// ─── Admin auth: constant-time key compare + its own (tighter) rate limit ───
// The admin key guards subscriber export, newsletter send, drip-check, and
// traffic stats — a brute-force or timing attack here is worse than on
// public endpoints, so it gets its own stricter budget and a constant-time
// compare instead of `!==` (which short-circuits on the first differing byte).

const adminRateLimitMap = new Map();
const ADMIN_RATE_LIMIT_MAX = 10;

function checkAdminRateLimit(ip) {
  const now = Date.now();
  const entry = adminRateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  }
  entry.count++;
  adminRateLimitMap.set(ip, entry);
  return entry.count <= ADMIN_RATE_LIMIT_MAX;
}

function constantTimeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // still spend the time, don't leak length early
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Returns true and lets the caller proceed, or sends the error response and
// returns false. Callers must `if (!requireAdminKey(...)) return;`.
function requireAdminKey(req, res, providedKey) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
  if (!checkAdminRateLimit(ip)) {
    res.status(429).json({ error: 'Too many admin requests. Please try again later.' });
    return false;
  }
  if (!process.env.ADMIN_KEY || !constantTimeEqual(providedKey, process.env.ADMIN_KEY)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ─── Subscribe endpoint ───

app.post('/api/subscribe', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { firstName, lastName, email, source } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Reject reserved test/example domains so smoke tests and bots don't
  // pollute the real subscriber list. RFC 2606 (.test/.example/.invalid/.localhost)
  // plus the common @example.com/.org/.net and @test.com sentinels.
  const TEST_DOMAIN_RE = /@(?:example\.(?:com|org|net)|test\.com|localhost|.+\.(?:test|example|invalid|localhost))$/i;
  if (TEST_DOMAIN_RE.test(email)) {
    return res.status(400).json({ error: 'Please use a real email address.' });
  }

  // ?dryrun=1 — validate everything end-to-end without writing or sending.
  // Used by scripts/test_subscribe.sh to verify the pipeline without polluting prod.
  const dryrun = req.query.dryrun === '1' || req.query.dryrun === 'true';

  await acquireLock();
  try {
    const subscribers = readSubscribers();
    const normalizedEmail = email.trim().toLowerCase();

    if (subscribers.some(s => s.email === normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already subscribed.' });
    }

    if (dryrun) {
      // finally{} at end of this try-block releases the lock; no double release here.
      return res.json({ message: 'Dryrun OK — validation passed, no write.', dryrun: true });
    }

    const now = new Date();
    subscribers.push({
      firstName: (firstName && firstName.trim()) || '',
      lastName: (lastName && lastName.trim()) || '',
      email: normalizedEmail,
      source: (source && String(source).trim().slice(0, 64)) || null,
      dateSubscribed: now.toISOString().split('T')[0],
      subscribedAt: now.toISOString(),
      city: (req.body.city && String(req.body.city).trim().slice(0, 64)) || null
    });

    writeSubscribers(subscribers);
    const displayName = (firstName && firstName.trim()) || 'there';
    console.log(`New subscriber: ${displayName} <${normalizedEmail}> (total: ${subscribers.length})`);

    // Send welcome email (non-blocking — don't fail the subscribe if email fails)
    if (resend) {
      resend.emails.send({
        from: EMAIL_FROM,
        to: normalizedEmail,
        subject: 'Your Latin America Expat Starter Kit is ready',
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
            <div style="background:#1a1a2e;padding:30px;text-align:center;">
              <h1 style="color:#c9a84c;margin:0;font-size:24px;">&#9670; International RE</h1>
            </div>
            <div style="padding:30px;background:#fff;">
              <h2 style="color:#1a1a2e;">Welcome, ${displayName}!</h2>
              <p>Thanks for subscribing to International RE.</p>
              <h3 style="color:#c9a84c;">Your Expat Starter Kit</h3>
              <p>A 17-city market comparison, residency routes for 10 countries, a 47-item relocation checklist and a six-month buying timeline — all on one page you can print or save.</p>
              <p style="text-align:center;margin:25px 0;">
                <a href="https://www.internationalre.org/guide/expat-starter-kit.html" style="background:#c9a84c;color:#1a1a2e;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">Open the Starter Kit &rarr;</a>
              </p>
              <p style="font-size:14px;color:#555;">Also yours: the <a href="https://www.internationalre.org/guide/2026-market-entry-guide.html" style="color:#c9a84c;">2026 Market Entry Guide</a>, and our <a href="https://www.internationalre.org/quiz.html" style="color:#c9a84c;">5-question market quiz</a> if you haven't picked a country yet.</p>
              <h3>What to Expect</h3>
              <ul>
                <li>Weekly market intelligence on 11 Latin American markets</li>
                <li>Real price data, rental yields, and investment analysis</li>
                <li>Legal updates and buyer guides</li>
              </ul>
              <p>Our newsletter arrives every Monday. Questions? Send them through our <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">contact form</a> — we read every message.</p>
              <div style="background:#f7f5f0;border-radius:8px;padding:16px 20px;margin:20px 0;">
                <p style="margin:0;font-size:13px;color:#555;">&#128279; <strong>Know someone researching Latin American real estate?</strong> Forward this email or share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — they'll get the same free Starter Kit.</p>
              </div>
              <p style="color:#666;font-size:13px;margin-top:30px;border-top:1px solid #eee;padding-top:15px;">
                You're receiving this because you subscribed at internationalre.org.<br>
                <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit our website</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a>
              </p>
            </div>
          </div>`
      }).catch(err => console.error('Welcome email failed:', err));
    }

    res.json({ message: 'Successfully subscribed!' });
  } catch (err) {
    console.error('Error saving subscriber:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  } finally {
    releaseLock();
  }
});

// ─── Unsubscribe endpoint ───

app.post('/api/unsubscribe', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const normalizedEmail = email.trim().toLowerCase();
  await acquireLock();
  try {
    const subscribers = readSubscribers();
    const idx = subscribers.findIndex(s => s.email === normalizedEmail);
    if (idx !== -1) {
      subscribers.splice(idx, 1);
      writeSubscribers(subscribers);
      console.log(`Unsubscribed: ${normalizedEmail} (remaining: ${subscribers.length})`);
    } else {
      console.log(`Unsubscribe attempt for non-existent email (intentionally returning 200 to prevent enumeration)`);
    }
    // Always return 200 regardless of whether the email was on the list — otherwise
    // a 404 vs 200 mismatch lets a third party probe subscriber existence.
    res.json({ message: 'If that email was on our list, it has been removed.' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  } finally {
    releaseLock();
  }
});

// ─── Contact / corrections form ───
// There is no shared inbox, so messages go by email to CONTACT_EMAIL (or the
// owner's BACKUP_EMAIL) with Reply-To set to the sender, and a copy is kept on
// the volume in case sending fails. The owner's address is never shown publicly.
const CONTACT_FILE = path.join(path.dirname(SUBSCRIBERS_FILE), 'messages.json');
const contactRateLimitMap = new Map();
const CONTACT_KINDS = { correction: 'Correction', question: 'Question', privacy: 'Data / privacy request', other: 'Other' };

app.post('/api/contact', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
  const now = Date.now();
  const rl = contactRateLimitMap.get(ip) || { count: 0, resetAt: now + 60 * 60 * 1000 };
  if (now > rl.resetAt) { rl.count = 0; rl.resetAt = now + 60 * 60 * 1000; }
  rl.count++;
  contactRateLimitMap.set(ip, rl);
  if (rl.count > 5) return res.status(429).json({ error: 'Too many messages. Please try again later.' });

  const { name, email, page, kind, message, website } = req.body || {};
  if (website) return res.json({ message: 'Thanks — your message has been sent.' }); // honeypot: pretend success
  const em = String(email || '').trim().toLowerCase();
  const msg = String(message || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || em.length > 200) return res.status(400).json({ error: 'Please enter a valid email address so we can reply.' });
  if (msg.length < 10) return res.status(400).json({ error: 'Please write a little more detail.' });
  if (msg.length > 5000) return res.status(400).json({ error: 'Please keep your message under 5,000 characters.' });
  const entry = {
    at: new Date().toISOString(),
    kind: CONTACT_KINDS[kind] ? kind : 'other',
    name: String(name || '').trim().slice(0, 100),
    email: em,
    page: String(page || '').trim().slice(0, 300),
    message: msg,
  };

  try {
    ensureDataDir();
    let all = [];
    try { all = JSON.parse(fs.readFileSync(CONTACT_FILE, 'utf-8')); } catch {}
    all.push(entry);
    fs.writeFileSync(CONTACT_FILE, JSON.stringify(all.slice(-500), null, 2));
  } catch (err) { console.error('Contact save failed:', err.message); }

  const to = process.env.CONTACT_EMAIL || process.env.BACKUP_EMAIL;
  if (resend && to) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to,
        replyTo: entry.email,
        subject: `[internationalre.org] ${CONTACT_KINDS[entry.kind]}: ${entry.message.replace(/\s+/g, ' ').slice(0, 60)}`,
        html: `<div style="font-family:Inter,Arial,sans-serif;max-width:600px">
          <p><strong>${CONTACT_KINDS[entry.kind]}</strong> from ${escapeHtml(entry.name || 'a reader')} &lt;${escapeHtml(entry.email)}&gt;</p>
          ${entry.page ? `<p>Page: ${escapeHtml(entry.page)}</p>` : ''}
          <p style="white-space:pre-wrap;border-left:3px solid #c9a84c;padding-left:12px">${escapeHtml(entry.message)}</p>
          <p style="color:#888;font-size:13px">Reply to this email to answer the reader directly.</p></div>`,
      });
    } catch (err) { console.error('Contact email failed:', err.message); }
  }
  console.log(`Contact message (${entry.kind}) from ${entry.email}`);
  res.json({ message: 'Thanks — your message has been sent. We reply within a few days.' });
});

// ─── Subscriber count endpoint ───

app.get('/api/subscriber-count', (req, res) => {
  try {
    const subscribers = readSubscribers();
    res.json({ count: subscribers.length });
  } catch {
    res.json({ count: 0 });
  }
});

// ─── Recent subscribers (for social-proof toast — privacy-safe shape) ───
//
//   Returns ONLY: { initial, city, minutesAgo } per subscriber.
//   - initial = first letter of firstName (no full name, no email)
//   - city    = stored coarse location if present, else "" (skipped client-side)
//   - minutesAgo = minutes since signup, capped to last 14 days
//   This is intentionally minimal so the toast is honest social proof
//   (real signups, real recency) without leaking PII.

app.get('/api/recent-subscribers', (req, res) => {
  try {
    const subs = readSubscribers();
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const items = subs
      .map(s => {
        const t = s.subscribedAt ? new Date(s.subscribedAt).getTime()
                : s.dateSubscribed ? new Date(s.dateSubscribed + 'T12:00:00Z').getTime()
                : 0;
        return { s, t };
      })
      .filter(x => x.t >= cutoff && x.s.firstName)
      .sort((a, b) => b.t - a.t)
      .slice(0, 25)
      .map(({ s, t }) => ({
        initial: s.firstName.charAt(0).toUpperCase(),
        city: s.city || s.location || 'a verified subscriber',
        minutesAgo: Math.max(1, Math.round((Date.now() - t) / 60000))
      }));
    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

// ─── Subscriber list (for sending newsletters — protected by simple key) ───

app.get('/api/subscribers', (req, res) => {
  if (!requireAdminKey(req, res, req.query.key)) return;
  res.json(readSubscribers());
});

// ─── One-shot cleanup: remove test/sentinel emails the smoke test or audits
//      accidentally seeded into the real list. Admin-only. ───
//   POST /api/admin/cleanup-test-subscribers?key=ADMIN_KEY
//   Optional ?dryrun=1 → returns what WOULD be removed without writing.
const CLEANUP_PATTERNS = [
  /@example\.(com|org|net)$/i,
  /@test\.com$/i,
  /@.+\.(test|example|invalid|localhost)$/i,
  /^smoketest\+/i,
  /^audit-test-/i,
];
async function handleCleanupTestSubscribers(req, res) {
  if (!requireAdminKey(req, res, req.query.key || req.body?.key)) return;
  const dryrun = req.query.dryrun === '1' || req.query.dryrun === 'true';
  await acquireLock();
  try {
    const subs = readSubscribers();
    const isTest = (s) => CLEANUP_PATTERNS.some(re => re.test(s.email || ''));
    const removed = subs.filter(isTest).map(s => s.email);
    const kept = subs.filter(s => !isTest(s));
    if (!dryrun && removed.length) writeSubscribers(kept);
    return res.json({ dryrun, before: subs.length, removed: removed.length, after: kept.length, removed_emails: removed });
  } finally {
    releaseLock();
  }
}
app.post('/api/admin/cleanup-test-subscribers', handleCleanupTestSubscribers);

// ─── Restore subscribers (admin-only, sends no email) ───
//   POST /api/admin/restore-subscribers  { key, subscribers: [{ email, firstName,
//   lastName?, subscribedAt, drip?: [ids], newsletters?: [ids] }], dryrun? }
// Adds records that aren't already on the list, keeping their original
// signup date and drip history so the welcome sequence resumes rather than
// restarting. Existing emails are never overwritten.
app.post('/api/admin/restore-subscribers', async (req, res) => {
  if (!requireAdminKey(req, res, req.body?.key)) return;
  const incoming = Array.isArray(req.body?.subscribers) ? req.body.subscribers : null;
  if (!incoming || incoming.length === 0 || incoming.length > 5000) {
    return res.status(400).json({ error: 'subscribers must be a non-empty array (max 5000).' });
  }
  const dripIds = new Set(DRIP_EMAILS.map(e => e.id));
  const clean = [];
  const rejected = [];
  for (const s of incoming) {
    const email = typeof s?.email === 'string' ? s.email.trim().toLowerCase() : '';
    const when = new Date(s?.subscribedAt);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || isNaN(when.getTime()) || when.getTime() > Date.now()) {
      rejected.push(email || '(missing email)');
      continue;
    }
    clean.push({
      email,
      firstName: String(s.firstName || '').trim().slice(0, 80),
      lastName: String(s.lastName || '').trim().slice(0, 80),
      subscribedAt: when.toISOString(),
      drip: Array.isArray(s.drip) ? s.drip.filter(id => dripIds.has(id)) : [],
      newsletters: Array.isArray(s.newsletters) ? s.newsletters.filter(id => /^\d{4}-\d{2}-\d{2}$/.test(id)) : [],
      restored: true
    });
  }
  await acquireLock();
  try {
    const current = readSubscribers();
    const existing = new Set(current.map(s => (s.email || '').toLowerCase()));
    const toAdd = clean.filter(s => !existing.has(s.email) && existing.add(s.email));
    if (!req.body?.dryrun && toAdd.length) writeSubscribers([...current, ...toAdd]);
    console.log(`Restore: ${toAdd.length} added, ${clean.length - toAdd.length} already present, ${rejected.length} rejected${req.body?.dryrun ? ' (dry run)' : ''}`);
    res.json({ dryrun: !!req.body?.dryrun, added: toAdd.length, alreadyPresent: clean.length - toAdd.length, rejected, total: current.length + (req.body?.dryrun ? 0 : toAdd.length) });
  } finally {
    releaseLock();
  }
});

// ─── Plausible traffic snapshot (admin-only) ───
// Set PLAUSIBLE_API_KEY in env. Hit: /api/admin/traffic?key=ADMIN_KEY&period=30d
// period: 7d | 30d | 6mo | 12mo (Plausible API values)
app.get('/api/admin/traffic', async (req, res) => {
  if (!requireAdminKey(req, res, req.query.key)) return;
  if (!process.env.PLAUSIBLE_API_KEY) {
    return res.status(503).json({ error: 'PLAUSIBLE_API_KEY not configured. Generate one at plausible.io/settings/api-keys' });
  }

  const site = process.env.PLAUSIBLE_SITE_ID || 'internationalre.org';
  const period = ['7d','30d','6mo','12mo'].includes(req.query.period) ? req.query.period : '30d';
  const base = 'https://plausible.io/api/v1/stats';
  const auth = { Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}` };

  try {
    const [aggR, srcR, pageR] = await Promise.all([
      fetch(`${base}/aggregate?site_id=${site}&period=${period}&metrics=visitors,pageviews,bounce_rate,visit_duration`, { headers: auth }),
      fetch(`${base}/breakdown?site_id=${site}&period=${period}&property=visit:source&limit=10`, { headers: auth }),
      fetch(`${base}/breakdown?site_id=${site}&period=${period}&property=event:page&limit=10`, { headers: auth }),
    ]);
    if (!aggR.ok) return res.status(aggR.status).json({ error: `Plausible aggregate ${aggR.status}: ${await aggR.text()}` });
    const [agg, src, pages] = await Promise.all([aggR.json(), srcR.json(), pageR.json()]);
    res.json({
      site, period,
      summary: agg.results,
      top_sources: src.results || [],
      top_pages: pages.results || [],
      subscribers_total: readSubscribers().length,
    });
  } catch (err) {
    res.status(502).json({ error: `Plausible fetch failed: ${err.message}` });
  }
});

// ─── Send newsletter to all subscribers ───

app.post('/api/send-newsletter', async (req, res) => {
  if (!requireAdminKey(req, res, req.body.key)) return;

  if (!resend) {
    return res.status(500).json({ error: 'Email not configured. Set RESEND_API_KEY environment variable.' });
  }

  const { subject, html } = req.body;
  if (!subject || !html) {
    return res.status(400).json({ error: 'subject and html fields are required.' });
  }

  const subscribers = readSubscribers();
  if (subscribers.length === 0) {
    return res.status(400).json({ error: 'No subscribers to send to.' });
  }

  let sent = 0;
  let failed = 0;

  // Send in batches of 10 with a 1-second pause between batches
  for (let i = 0; i < subscribers.length; i += 10) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000));
    const batch = subscribers.slice(i, i + 10);
    const promises = batch.map(sub =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: sub.email,
        subject,
        html: html.replace(/{{firstName}}/g, sub.firstName || 'there')
      }).then(() => { sent++; }).catch(err => {
        console.error(`Failed to send to ${sub.email}:`, err);
        failed++;
      })
    );
    await Promise.all(promises);
  }

  console.log(`Newsletter sent: ${sent} delivered, ${failed} failed`);
  res.json({ message: `Newsletter sent to ${sent} subscribers.`, sent, failed });
});

// ─── RSS Feed — scans all content directories for dlvr.it auto-posting ───

app.get('/rss.xml', (req, res) => res.redirect(301, '/feed.xml'));
app.get('/feed.xml', (req, res) => {
  // NOTE: 'landing' is deliberately excluded — those are conversion pages with
  // no publish date; they all inherit the same file mtime, flood the top of the
  // date-sorted feed, and dlvr.it ends up tweeting landing pages instead of
  // actual articles.
  const contentDirs = [
    { dir: 'blog', urlPrefix: 'blog' },
    { dir: 'guides', urlPrefix: 'guides' },
    { dir: 'tips', urlPrefix: 'tips' },
    { dir: 'case-studies', urlPrefix: 'case-studies' },
    { dir: 'spotlights', urlPrefix: 'spotlights' },
    { dir: 'quick-reads', urlPrefix: 'quick-reads' },
    { dir: 'stories', urlPrefix: 'stories' },
  ];

  let items = [];

  contentDirs.forEach(({ dir, urlPrefix }) => {
    const fullPath = path.join(__dirname, 'public', dir);
    if (!fs.existsSync(fullPath)) return;
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.html'));

    files.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(fullPath, file), 'utf-8');
        const titleMatch = content.match(/<title>([^<|]*)/);
        const descMatch = content.match(/<meta name="description" content="([^"]*)"/);
        const dateMatch = content.match(new RegExp('<meta property="article:published_time" content="([^"]*)"')) ||
                          content.match(/"datePublished"\s*:\s*"([^"]+)"/) ||
                          content.match(/<span class="blog-post-date">([^<]*)<\/span>/) ||
                          content.match(/Updated\s+(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';
        const fileStat = fs.statSync(path.join(fullPath, file));

        const baseLink = `https://www.internationalre.org/${urlPrefix}/${file}`;
        items.push({
          title: titleMatch ? titleMatch[1].trim() : file.replace('.html', ''),
          description: descMatch ? descMatch[1] : '',
          link: `${baseLink}?utm_source=rss&utm_medium=social&utm_campaign=dlvr`,
          guid: baseLink,
          date: dateStr || fileStat.mtime.toISOString().split('T')[0]
        });
      } catch (e) { /* skip */ }
    });
  });

  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  items = items.slice(0, 50);

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>International RE — Latin America Real Estate</title>
    <link>https://www.internationalre.org</link>
    <description>Daily market intelligence on Costa Rica, Nicaragua, Argentina &amp; Chile real estate.</description>
    <language>en-us</language>
    <atom:link href="https://www.internationalre.org/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.map(item => `<item>
      <title>${item.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
      <link>${item.link.replace(/&/g, '&amp;')}</link>
      <description>${item.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</description>
      <pubDate>${item.date ? new Date(item.date).toUTCString() : ''}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
    </item>`).join('\n    ')}
  </channel>
</rss>`;

  res.type('application/xml').send(rss);
});

// ─── Email drip sequence ───
//
// Emails sent automatically after subscription:
//   Day 1  — "Welcome — what to expect"
//   Day 3  — "3 things to know before you buy"
//   Day 7  — "Market spotlight: best entry right now"
//   Day 14 — "Your complete buying checklist"
//   Day 21 — "If I had $200K today"
//   Day 30 — "One month in — 5 questions to answer"
//   Day 45 — "The permit/visa paths nobody explains clearly"
//   Day 60 — "Two months in — case study of a real close"
//   Day 90 — "Still deciding? Here's what changed this quarter"
//
// Triggered by drip-agent.sh (daily LaunchAgent at 10am).
// Each subscriber gets a `drip` array tracking sent email IDs.

const DRIP_EMAILS = [
  {
    id: 'day1',
    dayOffset: 1,
    subject: 'Start here: what\'s coming over the next two weeks',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">START HERE · DAY 1</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, here's what's coming your way</h2>
          <p>Thanks for subscribing. Over the next few weeks we'll send a short, focused sequence — no daily spam, just the things that actually matter when buying property abroad:</p>
          <ul style="padding-left:20px;color:#333;line-height:1.9;">
            <li><strong>Day 3</strong> — the three things most buyers learn too late</li>
            <li><strong>Day 7</strong> — the market we're watching closely right now</li>
            <li><strong>Day 14</strong> — a complete step-by-step buying checklist</li>
            <li>After that — a weekly market intelligence email on 11 Latin American markets</li>
          </ul>
          <p>In the meantime, if you already know roughly what you're looking for, our <a href="https://www.internationalre.org/quiz.html" style="color:#c9a84c;">5-question market quiz</a> will point you at the city that fits your budget and goals.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://www.internationalre.org/cities/" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Browse All 17 Markets &rarr;</a>
          </p>
          <p>Talk soon,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day3',
    dayOffset: 3,
    subject: '3 things to know before you buy property abroad',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">MARKET INTELLIGENCE · DAY 3</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, 3 things most buyers learn too late</h2>
          <p>You've been subscribed for a few days. Before you go any further in your research, here are the three things that trip up foreign buyers most often:</p>
          <h3 style="color:#c9a84c;">1. Currency risk is the silent killer</h3>
          <p>Most Latin American markets price in USD, but local costs (maintenance, taxes, management fees) are in local currency. In Argentina and Colombia, this works in your favour. In Brazil, it can surprise you. Always model your returns in USD.</p>
          <h3 style="color:#c9a84c;">2. Gross yield ≠ net yield</h3>
          <p>A "9% yield" headline usually means gross. Deduct property management (10–15%), vacancy (8–15%), maintenance (1–2%), and local taxes. Net yield is typically 30–40% lower. Still excellent — but model it honestly.</p>
          <h3 style="color:#c9a84c;">3. The lawyer matters more than the agent</h3>
          <p>In Costa Rica, Panama, and Mexico, the notary/lawyer is legally central to the transaction. Hire your own — never use the seller's. Budget $1,500–$3,000 for a competent bilingual attorney. It's the best money you'll spend.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://www.internationalre.org/guide/2026-market-entry-guide.html" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Read the Full Market Entry Guide &rarr;</a>
          </p>
          <p>More next week,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day7',
    dayOffset: 7,
    subject: 'This week\'s best market entry — our current top pick',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">MARKET SPOTLIGHT · DAY 7</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, one market we're watching closely right now</h2>
          <p>Every week we track 11 Latin American markets. Right now, <strong>Panama City</strong> stands out as the strongest risk-adjusted entry.</p>
          <div style="background:#f7f5f0;border-left:4px solid #c9a84c;padding:20px 24px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0 0 8px;font-weight:700;color:#0a1628;">Panama City — April 2026</p>
            <p style="margin:0;color:#555;font-size:0.9rem;">Avg. yield: <strong>7–10%</strong> · Price/m²: <strong>$1,500–$3,000</strong> · Currency: <strong>USD (zero risk)</strong><br>Rental demand driven by multinationals and regional HQs. Transactions at 5-year high.</p>
          </div>
          <p>Why Panama right now? Three reasons: (1) it's the only major Latin American city fully dollarised, (2) the new metro line is pushing valuations in Casco Viejo and El Cangrejo, and (3) transaction volume is at a 5-year high — meaning liquidity if you want to exit.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://www.internationalre.org/blog/panama-city-real-estate-2026.html" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Read the Panama Deep-Dive &rarr;</a>
          </p>
          <p>Also worth checking: our <a href="https://www.internationalre.org/quiz.html" style="color:#c9a84c;">5-question market quiz</a> will match you to the market that fits your budget and goals.</p>
          <p>More next week,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day14',
    dayOffset: 14,
    subject: 'Your step-by-step buying checklist (save this)',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">BUYING GUIDE · DAY 14</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, your step-by-step buying checklist</h2>
          <p>Two weeks in. Here's the checklist we give every first-time foreign buyer before they wire a single dollar:</p>
          <ol style="padding-left:20px;color:#333;line-height:2;">
            <li><strong>Define your market</strong> — use our <a href="https://www.internationalre.org/quiz.html" style="color:#c9a84c;">market quiz</a> if you haven't already</li>
            <li><strong>Set a realistic budget</strong> — purchase price + 5–8% for closing costs + 3 months reserve</li>
            <li><strong>Hire a local attorney before you tour</strong> — not after you fall in love with a property</li>
            <li><strong>Run a title search</strong> — verify no liens, encumbrances, or ownership disputes</li>
            <li><strong>Open a local bank account</strong> — required in Panama and Costa Rica; recommended everywhere</li>
            <li><strong>Understand the tax treaty</strong> — most Latin American countries have no treaty with the US; you'll report rental income domestically</li>
            <li><strong>Visit before you buy</strong> — two trips minimum: one to explore, one to negotiate</li>
            <li><strong>Model net yield, not gross</strong> — management (12%), vacancy (10%), maintenance (2%) = subtract ~24%</li>
          </ol>
          <div style="background:#0a1628;color:#fff;padding:20px 24px;border-radius:8px;margin:24px 0;text-align:center;">
            <p style="margin:0 0 12px;font-size:1rem;">Ready to go deeper?</p>
            <a href="https://www.internationalre.org/guide/2026-market-entry-guide.html" style="background:#c9a84c;color:#0a1628;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:700;display:inline-block;">Download the Full Market Entry Guide</a>
          </div>
          <p>You'll now receive our regular weekly newsletter. Questions? Use our <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">contact form</a> — we read every message.</p>
          <p>Best,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day21',
    dayOffset: 21,
    subject: 'The market I\'d buy in today (if I had $200K)',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">MARKET PICK · DAY 21</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, if I had $200K today — here's where I'd put it</h2>
          <p>Three weeks in, so let me be direct. Based on the data we track every week, here's the honest answer:</p>
          <div style="background:#f7f5f0;border-left:4px solid #c9a84c;padding:20px 24px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0 0 6px;font-weight:700;color:#0a1628;">&#127464;&#127476; Medellín, Colombia — El Poblado or Laureles</p>
            <p style="margin:0;color:#555;font-size:0.9rem;line-height:1.7;">
              <strong>Why:</strong> $1,500–1,800/sqm buys a 100–130sqm apartment in a walkable, high-demand neighborhood.
              8,300 digital nomads arriving monthly. Gross yield 7–9%. City of Eternal Spring climate.
              No currency risk for the buyer (USD buys COP at favorable rates). 18% price appreciation in El Poblado in 2024.<br><br>
              <strong>Budget allocation:</strong> $150K property + $12K closing costs + $20K reserve + $18K furnish for short-term rental = $200K total.<br><br>
              <strong>Expected year-1 income:</strong> $12,000–15,000 gross STR / $9,500–11,000 gross LTR.
            </p>
          </div>
          <p>The runner-up is <strong>Panama City (Casco Viejo)</strong> — higher certainty, lower yield, fully dollarized. If you want less volatility, Panama wins. If you want more upside, Medellín wins.</p>
          <p>Check our <a href="https://www.internationalre.org/blog/medellin-real-estate-2026.html" style="color:#c9a84c;">full Medellín deep-dive</a> for the neighborhood breakdown.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://www.internationalre.org/quiz.html" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Find Your Best Market Match &rarr;</a>
          </p>
          <p>Best,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day30',
    dayOffset: 30,
    subject: 'One month in — the 5 questions to answer before you buy',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">ONE MONTH · DAY 30</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, 5 questions to answer before you buy anything</h2>
          <p>You've been with us for a month. By now you've read about several markets. Before you take the next step, make sure you can answer these five questions clearly:</p>
          <div style="margin:20px 0;">
            <div style="border:1px solid #e8e3d9;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
              <p style="margin:0;font-weight:700;color:#0a1628;">1. What is this property's net yield?</p>
              <p style="margin:6px 0 0;color:#555;font-size:0.88rem;">Gross yield minus management (12%), vacancy (10%), maintenance (2%), taxes. If you can't model this, you're not ready to buy.</p>
            </div>
            <div style="border:1px solid #e8e3d9;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
              <p style="margin:0;font-weight:700;color:#0a1628;">2. Who is your attorney — and is it yours, not the seller's?</p>
              <p style="margin:6px 0 0;color:#555;font-size:0.88rem;">Never use the seller's lawyer or the agent's recommended lawyer. Hire your own. Budget $1,500–3,000.</p>
            </div>
            <div style="border:1px solid #e8e3d9;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
              <p style="margin:0;font-weight:700;color:#0a1628;">3. Have you visited the neighborhood at night?</p>
              <p style="margin:6px 0 0;color:#555;font-size:0.88rem;">Every expat zone looks great at noon on a Saturday. Go back Tuesday night at 10pm. Walk the surrounding blocks. You'll learn more in 20 minutes than in 10 site visits.</p>
            </div>
            <div style="border:1px solid #e8e3d9;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
              <p style="margin:0;font-weight:700;color:#0a1628;">4. Who will manage the property, and what does it cost?</p>
              <p style="margin:6px 0 0;color:#555;font-size:0.88rem;">If you're renting short-term, you need a local co-host or property manager. Get quotes from 3 providers before you close. Rates: 10–20% of revenue.</p>
            </div>
            <div style="border:1px solid #e8e3d9;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
              <p style="margin:0;font-weight:700;color:#0a1628;">5. What is your exit strategy?</p>
              <p style="margin:6px 0 0;color:#555;font-size:0.88rem;">Markets like Panama, Medellín, and Guanacaste have real liquidity. Markets like rural Nicaragua or the Dominican Republic interior do not. Know how long it takes to sell before you buy.</p>
            </div>
          </div>
          <p>If you can answer all five clearly — you're ready. If not, tell us where you're stuck through our <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">contact form</a>. We read every message.</p>
          <div style="background:#0a1628;color:#fff;padding:20px 24px;border-radius:8px;margin:24px 0;text-align:center;">
            <p style="margin:0 0 12px;color:rgba(255,255,255,0.85);font-size:0.95rem;">Not sure which market fits your situation?</p>
            <a href="https://www.internationalre.org/quiz.html" style="background:#c9a84c;color:#0a1628;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:700;display:inline-block;">Take the 5-Question Market Quiz</a>
          </div>
          <p>Best,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day45',
    dayOffset: 45,
    subject: 'The residency/visa question nobody explains clearly',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">LEGAL &amp; RESIDENCY · DAY 45</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, does buying property get you residency?</h2>
          <p>This is the single most-asked question we get, and the honest answer is: <strong>it depends entirely on the country</strong>, and a real estate agent is usually the wrong person to ask.</p>
          <p>Some countries tie residency directly to a minimum property investment. Others separate the two completely — you can own property as a pure foreigner with zero residency rights, or get residency through a route that has nothing to do with real estate (pension income, remote-work income, or a rentista visa).</p>
          <p>Before you buy with residency in mind, get the current minimum investment thresholds and processing times confirmed by an immigration attorney in that specific country — these rules change, and general guides (ours included) can lag behind the latest regulation.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://www.internationalre.org/guides/" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Browse Our Country-Specific Legal Guides &rarr;</a>
          </p>
          <p>More next week,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day60',
    dayOffset: 60,
    subject: 'Two months in — still on the fence?',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">CHECK-IN · DAY 60</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, two months in — where are you in the process?</h2>
          <p>You've had two months of market data, checklists, and guides. At this point most readers are in one of three places:</p>
          <ol style="padding-left:20px;color:#333;line-height:1.9;">
            <li><strong>Still comparing markets</strong> — if this is you, the <a href="https://www.internationalre.org/quiz.html" style="color:#c9a84c;">market quiz</a> narrows it down in five questions.</li>
            <li><strong>Have a market, need a property</strong> — read our city-specific hub pages for neighborhood-level detail and current listings context.</li>
            <li><strong>Have a property, working the legal side</strong> — tell us what you're stuck on through our <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">contact form</a>. We read every message and will point you to the right guide.</li>
          </ol>
          <p>Whichever stage you're at, the biggest mistake we see is rushing the attorney step to "keep momentum" on a deal. Slow that part down — everything else can move fast.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://www.internationalre.org/cities/" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Browse City-Specific Market Data &rarr;</a>
          </p>
          <p>Best,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  },
  {
    id: 'day90',
    dayOffset: 90,
    subject: 'One quarter later — what actually changed',
    html: (firstName) => `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:30px;text-align:center;">
          <h1 style="color:#c9a84c;margin:0;font-size:22px;">&#9670; International RE</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">QUARTERLY REVIEW · DAY 90</p>
          <h2 style="color:#0a1628;margin:0 0 16px;font-size:1.5rem;">Hi ${firstName}, still deciding? Here's what's worth re-checking</h2>
          <p>Three months is long enough that the specific numbers you first read may have moved. Before you make a final call on a market, re-verify three things rather than relying on your first impression:</p>
          <ul style="padding-left:20px;color:#333;line-height:1.9;">
            <li><strong>Price per sqm</strong> in your target neighborhood — ask a local agent for this week's comparables, not a national average.</li>
            <li><strong>Currency movement</strong> against the USD since you started looking, if the market isn't dollarized.</li>
            <li><strong>Any new rule changes</strong> on foreign ownership, residency thresholds, or short-term rental licensing in that city.</li>
          </ul>
          <p>We keep our market pages updated, but a 15-minute call with a local contact beats any website the week before you wire money.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://www.internationalre.org/newsletter.html" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Browse Past Newsletter Issues &rarr;</a>
          </p>
          <p>You'll keep getting our regular weekly newsletter after this. Questions any time? Use our <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">contact form</a>.</p>
          <p>Best,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  }
];

const DRIP_SEND_WINDOW_DAYS = 7;

// ─── Weekly newsletter ───
// The content agents write each Monday issue to data/newsletters/YYYY-MM-DD.json
// as {"subject": "...", "html": "..."}. The daily drip-check sends the newest
// issue dated within the last NEWSLETTER_WINDOW_DAYS once per subscriber
// (tracked in sub.newsletters, like sub.drip), so a missed day still goes out
// and a redeploy never resends.
const NEWSLETTER_DIR = path.join(__dirname, 'data', 'newsletters');
const NEWSLETTER_WINDOW_DAYS = 3;

function dueNewsletter(now) {
  if (!fs.existsSync(NEWSLETTER_DIR)) return null;
  const ids = fs.readdirSync(NEWSLETTER_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map(f => f.slice(0, 10))
    .sort()
    .reverse();
  for (const id of ids) {
    const ageDays = (now - new Date(id + 'T00:00:00Z').getTime()) / 864e5;
    if (ageDays < 0) continue;
    if (ageDays > NEWSLETTER_WINDOW_DAYS) return null;
    try {
      const issue = JSON.parse(fs.readFileSync(path.join(NEWSLETTER_DIR, id + '.json'), 'utf-8'));
      if (typeof issue.subject !== 'string' || typeof issue.html !== 'string' || !issue.subject.trim() || issue.html.length < 200) {
        console.error(`Newsletter ${id} skipped: needs a subject and html`);
        return null;
      }
      return { id, subject: issue.subject.slice(0, 150), html: issue.html };
    } catch (err) {
      console.error(`Newsletter ${id} unreadable:`, err.message);
      return null;
    }
  }
  return null;
}

function newsletterEmail(issue, firstName) {
  const body = issue.html.replace(/{{firstName}}/g, firstName || 'there');
  return `${body}
      <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;font-family:Inter,Arial,sans-serif;text-align:center;">
        You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org/newsletter.html" style="color:#c9a84c;">Past issues</a> · <a href="https://www.internationalre.org/contact.html" style="color:#c9a84c;">Questions? Contact us</a> · <a href="https://www.internationalre.org/unsubscribe.html" style="color:#999;">Unsubscribe</a>
      </p>`;
}

let dripRunning = false;

// Sends due drip steps and the current newsletter issue. Idempotent: every
// send is recorded per subscriber, so overlapping or repeated runs are safe.
async function runDripCheck(source) {
  if (dripRunning) return { skippedRun: 'already running' };
  dripRunning = true;
  try { return await dripCheckOnce(source); } finally { dripRunning = false; }
}

async function dripCheckOnce(source) {
  const subscribers = readSubscribers();
  const now = Date.now();
  const issue = dueNewsletter(now);
  let sent = 0;
  let skipped = 0;
  let newsletterSent = 0;
  const progress = new Map(); // email -> { drip, newsletters }

  for (const sub of subscribers) {
    const subTime = sub.subscribedAt
      ? new Date(sub.subscribedAt).getTime()
      : sub.dateSubscribed
        ? new Date(sub.dateSubscribed + 'T12:00:00Z').getTime()
        : null;

    if (!subTime || !sub.email) continue;

    const daysSince = (now - subTime) / (1000 * 60 * 60 * 24);
    const dripSent = sub.drip || [];
    const newDrip = [...dripSent];
    const newsletters = [...(sub.newsletters || [])];

    for (const email of DRIP_EMAILS) {
      if (dripSent.includes(email.id)) { skipped++; continue; }
      // Only send inside a window after the offset, and at most one email per
      // subscriber per run — otherwise adding a new step to the sequence would
      // blast every older subscriber with all the steps they "missed" at once.
      if (daysSince >= email.dayOffset && daysSince < email.dayOffset + DRIP_SEND_WINDOW_DAYS) {
        try {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: sub.email,
            subject: email.subject,
            html: email.html(sub.firstName || 'there')
          });
          newDrip.push(email.id);
          sent++;
          console.log(`Drip ${email.id} sent to ${sub.email}`);
        } catch (err) {
          console.error(`Drip ${email.id} failed for ${sub.email}:`, err.message);
        }
        break;
      }
    }

    if (issue && !newsletters.includes(issue.id)) {
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: sub.email,
          subject: issue.subject,
          html: newsletterEmail(issue, sub.firstName)
        });
        newsletters.push(issue.id);
        newsletterSent++;
      } catch (err) {
        console.error(`Newsletter ${issue.id} failed for ${sub.email}:`, err.message);
      }
    }

    progress.set(sub.email, { drip: newDrip, newsletters });
  }

  // Merge into the current file rather than writing back the list read at the
  // start — sending can take a while and a signup in between must not be lost.
  await acquireLock();
  try {
    const current = readSubscribers();
    writeSubscribers(current.map(s => progress.has(s.email) ? { ...s, ...progress.get(s.email) } : s));
  } finally { releaseLock(); }

  console.log(`Drip check (${source}) complete: ${sent} drip sent, ${skipped} already sent, newsletter ${issue ? issue.id : 'none due'}: ${newsletterSent} sent`);
  return { sent, skipped, total: subscribers.length, newsletter: issue ? issue.id : null, newsletterSent };
}

app.post('/api/drip-check', async (req, res) => {
  if (!requireAdminKey(req, res, req.body.key)) return;
  if (!resend) {
    return res.status(500).json({ error: 'Email not configured.' });
  }
  res.json(await runDripCheck('api'));
});

// ─── Built-in email schedule ───
// The drip/newsletter check used to depend on a LaunchAgent on the owner's Mac
// (drip-agent.sh), so nothing went out when the Mac was off. The server now
// runs it itself at DRIP_HOURS_UTC (default 14,19 = 10am and 3pm New York), and
// on Mondays emails a subscriber backup CSV to BACKUP_EMAIL if that is set.
const DRIP_HOURS_UTC = (process.env.DRIP_HOURS_UTC || '14,19').split(',').map(Number).filter(h => h >= 0 && h < 24);
const BACKUP_WEEKDAY_UTC = Number(process.env.BACKUP_WEEKDAY_UTC ?? 1); // 1 = Monday
const STATE_FILE = path.join(path.dirname(SUBSCRIBERS_FILE), 'scheduler-state.json');
const onRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);
const schedulerEnabled = () => !!resend && (onRailway || process.env.ENABLE_EMAIL_SCHEDULER === '1') && process.env.ENABLE_EMAIL_SCHEDULER !== '0';

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; }
}
function writeState(state) {
  try { ensureDataDir(); fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (err) { console.error('Scheduler state write failed:', err.message); }
}

function csvCell(v) {
  const t = Array.isArray(v) ? v.join(' ') : String(v ?? '');
  return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

// Plausible snapshot for the owner report; null when no API key is configured.
async function trafficSnapshot(period) {
  if (!process.env.PLAUSIBLE_API_KEY) {
    const t = trafficSummary(period === '7d' ? 7 : 30, 5);
    return { visitors: t.visitors, pageviews: t.pageviews, pages: t.pages.map(r => ({ page: r.page, visitors: r.views })), sources: t.sources.map(r => ({ source: r.source, visitors: r.views })) };
  }
  const site = process.env.PLAUSIBLE_SITE_ID || 'internationalre.org';
  const base = 'https://plausible.io/api/v1/stats';
  const headers = { Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}` };
  const get = async (q) => { const r = await fetch(`${base}/${q}`, { headers }); if (!r.ok) throw new Error(`Plausible ${r.status}`); return r.json(); };
  const [agg, pages, sources] = await Promise.all([
    get(`aggregate?site_id=${site}&period=${period}&metrics=visitors,pageviews`),
    get(`breakdown?site_id=${site}&period=${period}&property=event:page&limit=5`),
    get(`breakdown?site_id=${site}&period=${period}&property=visit:source&limit=5`),
  ]);
  return { visitors: agg.results.visitors.value, pageviews: agg.results.pageviews.value, pages: pages.results || [], sources: sources.results || [] };
}

function escapeHtml(t) {
  return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// One line from the scorecard the agents regenerate (docs/QUALITY.md), if present.
function researchSummary() {
  try {
    const m = fs.readFileSync(path.join(__dirname, 'docs', 'QUALITY.md'), 'utf-8')
      .match(/(\d+) indexed articles, average score (\d+)\/100, (\d+) research-verified \((\d+)%\)/);
    if (!m) return '';
    return `<h3>Article quality</h3><p><strong>${m[3]} of ${m[1]}</strong> articles fact-checked against sources (${m[4]}%) · average quality score <strong>${m[2]}/100</strong>.</p>`;
  } catch { return ''; }
}

// Monday owner report: growth + traffic, with the full list attached as a backup.
async function sendSubscriberBackup(today) {
  const to = process.env.BACKUP_EMAIL;
  if (!to) return 'BACKUP_EMAIL not set';
  const subs = readSubscribers();
  const weekAgo = Date.now() - 7 * 864e5;
  const joined = subs.filter(s => new Date(s.subscribedAt || s.dateSubscribed || 0).getTime() >= weekAgo).length;
  let trafficHtml = '<p style="color:#888">Traffic unavailable.</p>';
  let headline = '';
  try {
    const [w, m] = await Promise.all([trafficSnapshot('7d'), trafficSnapshot('30d')]);
    if (w && m) {
      headline = `, ${w.visitors} visitors this week`;
      const list = rows => rows.map(r => `<li>${escapeHtml(r.page || r.source)} — ${r.visitors}</li>`).join('') || '<li>none yet</li>';
      trafficHtml = `<h3>Traffic</h3><p><strong>${w.visitors}</strong> visitors this week (${w.pageviews} page views) · <strong>${m.visitors}</strong> in the last 30 days.</p>
        <p><strong>Top pages (7 days, views)</strong></p><ul>${list(w.pages)}</ul><p><strong>Top referring sites (7 days)</strong></p><ul>${list(w.sources)}</ul>`;
    }
  } catch (err) { trafficHtml = `<p style="color:#888">Traffic unavailable (${escapeHtml(err.message)}).</p>`; }
  const cols = ['email', 'firstName', 'lastName', 'subscribedAt', 'drip', 'newsletters'];
  const csv = [cols.join(','), ...subs.map(s => cols.map(c => csvCell(s[c] ?? (c === 'subscribedAt' ? s.dateSubscribed : ''))).join(','))].join('\n');
  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `International RE weekly report — ${subs.length} subscribers (+${joined})${headline}`,
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:600px">
      <h2>Weekly report — ${today}</h2>
      <h3>Subscribers</h3><p><strong>${subs.length}</strong> total · <strong>+${joined}</strong> joined in the last 7 days.</p>
      ${trafficHtml}
      ${researchSummary()}
      <p style="color:#888;font-size:13px;border-top:1px solid #eee;padding-top:12px">The full subscriber list is attached as a CSV backup. Keep this email: if the server's list is ever lost, it can be restored from this file.</p></div>`,
    attachments: [{ filename: `internationalre-subscribers-${today}.csv`, content: Buffer.from(csv, 'utf-8') }]
  });
  return `report sent (${subs.length} subscribers, +${joined})`;
}

async function schedulerTick() {
  if (!schedulerEnabled()) return;
  const now = new Date();
  const hour = now.getUTCHours();
  if (!DRIP_HOURS_UTC.includes(hour)) return;
  const today = now.toISOString().slice(0, 10);
  const slot = `${today}T${String(hour).padStart(2, '0')}`;
  const state = readState();
  if (state.lastDripSlot === slot) return;
  writeState({ ...state, lastDripSlot: slot });
  try { await runDripCheck('schedule'); } catch (err) { console.error('Scheduled drip check failed:', err.message); }
  if (now.getUTCDay() === BACKUP_WEEKDAY_UTC && state.lastBackupDate !== today) {
    try {
      const result = await sendSubscriberBackup(today);
      console.log(`Subscriber backup: ${result}`);
      writeState({ ...readState(), lastBackupDate: today });
    } catch (err) { console.error('Subscriber backup failed:', err.message); }
  }
}

// ─── 404 handler ───

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Express's default error page includes a stack trace with server file paths.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('Unhandled error:', err);
  res.status(status).json({ error: status === 400 ? 'Invalid request.' : status === 413 ? 'Request too large.' : 'Server error.' });
});

// ─── Error handling ───

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// ─── Graceful shutdown ───

function shutdown(signal) {
  console.log(`\n  ${signal} received. Shutting down gracefully...`);
  saveTraffic();
  server.close(() => {
    console.log('  Server closed.');
    process.exit(0);
  });
}

// ─── Start server ───

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  International RE is running at http://0.0.0.0:${PORT}`);
  const isEphemeralPath = !process.env.SUBSCRIBERS_FILE;
  console.log(`  Subscribers file: ${SUBSCRIBERS_FILE}${isEphemeralPath ? '  (⚠ ephemeral — set SUBSCRIBERS_FILE to a volume path on Railway)' : ''}`);
  console.log(`  Subscribers: ${readSubscribers().length}`);
  console.log(`  Email schedule: ${schedulerEnabled() ? 'on at ' + DRIP_HOURS_UTC.join(',') + ' UTC' : 'off'}${process.env.BACKUP_EMAIL ? ', weekly backup on' : ''}\n`);
  setInterval(schedulerTick, 5 * 60 * 1000).unref();
  setInterval(saveTraffic, 5 * 60 * 1000).unref();
  setTimeout(schedulerTick, Number(process.env.SCHEDULER_FIRST_TICK_MS || 30000)).unref();
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
