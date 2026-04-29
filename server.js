const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');

const { Resend } = require('resend');

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https://images.unsplash.com', 'https://unpkg.com', 'https://*.tile.openstreetmap.org'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': [],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
const PORT = process.env.PORT || 3000;
const SUBSCRIBERS_FILE = path.join(__dirname, 'data', 'subscribers.json');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'International RE <onboarding@resend.dev>';

app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (/\.(css|js|png|jpe?g|webp|svg|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

// ─── Subscriber Storage (JSON file, persists across deploys via git) ───

function ensureDataDir() {
  const dataDir = path.join(__dirname, 'data');
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

// ─── Subscribe endpoint ───

app.post('/api/subscribe', async (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  await acquireLock();
  try {
    const subscribers = readSubscribers();
    const normalizedEmail = email.trim().toLowerCase();

    if (subscribers.some(s => s.email === normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already subscribed.' });
    }

    const now = new Date();
    subscribers.push({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      dateSubscribed: now.toISOString().split('T')[0],
      subscribedAt: now.toISOString(),
      city: (req.body.city && String(req.body.city).trim().slice(0, 64)) || null
    });

    writeSubscribers(subscribers);
    console.log(`New subscriber: ${firstName} ${lastName} <${normalizedEmail}> (total: ${subscribers.length})`);

    // Send welcome email (non-blocking — don't fail the subscribe if email fails)
    if (resend) {
      resend.emails.send({
        from: EMAIL_FROM,
        to: normalizedEmail,
        subject: 'Welcome to International RE — Your Free Guide Is Ready',
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
            <div style="background:#1a1a2e;padding:30px;text-align:center;">
              <h1 style="color:#c9a84c;margin:0;font-size:24px;">&#9670; International RE</h1>
            </div>
            <div style="padding:30px;background:#fff;">
              <h2 style="color:#1a1a2e;">Welcome, ${firstName.trim()}!</h2>
              <p>Thanks for subscribing to International RE. You've joined a growing community of investors exploring Latin American real estate.</p>
              <h3 style="color:#c9a84c;">Your Free Guide Is Ready</h3>
              <p>Download your <strong>2026 Latin America Market Entry Guide</strong> — covering Costa Rica, Nicaragua, Argentina & Chile with real price data, legal processes, and investment strategies.</p>
              <p style="text-align:center;margin:25px 0;">
                <a href="https://www.internationalre.org/guide/2026-market-entry-guide.html" style="background:#c9a84c;color:#1a1a2e;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">Download Free Guide &rarr;</a>
              </p>
              <h3>What to Expect</h3>
              <ul>
                <li>Weekly market intelligence on 4 Latin American markets</li>
                <li>Real price data, rental yields, and investment analysis</li>
                <li>Legal updates and buyer guides</li>
              </ul>
              <p>Your first newsletter arrives this week.</p>
              <div style="background:#f7f5f0;border-radius:8px;padding:16px 20px;margin:20px 0;">
                <p style="margin:0;font-size:13px;color:#555;">&#128279; <strong>Know someone researching Latin American real estate?</strong> Forward this email or share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — they'll get the same free guide.</p>
              </div>
              <p style="color:#666;font-size:13px;margin-top:30px;border-top:1px solid #eee;padding-top:15px;">
                You're receiving this because you subscribed at internationalre.org.<br>
                <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit our website</a>
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
  const key = req.query.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(readSubscribers());
});

// ─── Send newsletter to all subscribers ───

app.post('/api/send-newsletter', async (req, res) => {
  const key = req.query.key || req.body.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

  // Send in batches of 10 to stay under rate limits
  for (let i = 0; i < subscribers.length; i += 10) {
    const batch = subscribers.slice(i, i + 10);
    const promises = batch.map(sub =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: sub.email,
        subject,
        html: html.replace(/{{firstName}}/g, sub.firstName)
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

app.get('/feed.xml', (req, res) => {
  const contentDirs = [
    { dir: 'blog', urlPrefix: 'blog' },
    { dir: 'guides', urlPrefix: 'guides' },
    { dir: 'tips', urlPrefix: 'tips' },
    { dir: 'landing', urlPrefix: 'landing' },
    { dir: 'case-studies', urlPrefix: 'case-studies' },
    { dir: 'spotlights', urlPrefix: 'spotlights' },
    { dir: 'tools', urlPrefix: 'tools' },
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
        const dateMatch = content.match(/<span class="blog-post-date">([^<]*)<\/span>/) ||
                          content.match(new RegExp('<meta property="article:published_time" content="([^"]*)"')) ||
                          content.match(/Updated\s+(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';
        const fileStat = fs.statSync(path.join(fullPath, file));

        items.push({
          title: titleMatch ? titleMatch[1].trim() : file.replace('.html', ''),
          description: descMatch ? descMatch[1] : '',
          link: `https://www.internationalre.org/${urlPrefix}/${file}`,
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
      <title>${item.title.replace(/&/g, '&amp;').replace(/[<]/g, '&lt;')}</title>
      <link>${item.link}</link>
      <description>${item.description.replace(/&/g, '&amp;').replace(/[<]/g, '&lt;')}</description>
      <pubDate>${item.date ? new Date(item.date).toUTCString() : ''}</pubDate>
      <guid>${item.link}</guid>
    </item>`).join('\n    ')}
  </channel>
</rss>`;

  res.type('application/xml').send(rss);
});

// ─── Email drip sequence ───
//
// 3 emails sent automatically after subscription:
//   Day 3  — "3 things to know before you buy"
//   Day 7  — "Market spotlight: best entry right now"
//   Day 14 — "Your complete buying checklist"
//
// Triggered by drip-agent.sh (daily LaunchAgent at 10am).
// Each subscriber gets a `drip` array tracking sent email IDs.

const DRIP_EMAILS = [
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
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a><br>
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
            <a href="https://www.internationalre.org/blog/panama-city-2026-dollar-yield.html" style="background:#c9a84c;color:#1a1a2e;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;">Read the Panama Deep-Dive &rarr;</a>
          </p>
          <p>Also worth checking: our <a href="https://www.internationalre.org/quiz.html" style="color:#c9a84c;">5-question market quiz</a> will match you to the market that fits your budget and goals.</p>
          <p>More next week,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a><br>
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
          <p>You'll now receive our regular weekly newsletter. Reply to any email — we read them all.</p>
          <p>Best,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a><br>
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
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a><br>
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
              <p style="margin:6px 0 0;color:#555;font-size:0.88sf;">Every expat zone looks great at noon on a Saturday. Go back Tuesday night at 10pm. Walk the surrounding blocks. You'll learn more in 20 minutes than in 10 site visits.</p>
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
          <p>If you can answer all five clearly — you're ready. If not, reply to this email and tell us where you're stuck. We read every reply.</p>
          <div style="background:#0a1628;color:#fff;padding:20px 24px;border-radius:8px;margin:24px 0;text-align:center;">
            <p style="margin:0 0 12px;color:rgba(255,255,255,0.85);font-size:0.95rem;">Not sure which market fits your situation?</p>
            <a href="https://www.internationalre.org/quiz.html" style="background:#c9a84c;color:#0a1628;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:700;display:inline-block;">Take the 5-Question Market Quiz</a>
          </div>
          <p>Best,<br><strong>International RE</strong></p>
          <p style="color:#aaa;font-size:0.78rem;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you subscribed at internationalre.org. <a href="https://www.internationalre.org" style="color:#c9a84c;">Visit site</a><br>
            &#128279; Know someone exploring Latin American real estate? Share <a href="https://www.internationalre.org/subscribe.html" style="color:#c9a84c;">internationalre.org/subscribe</a> — free, no spam.
          </p>
        </div>
      </div>`
  }
];

app.post('/api/drip-check', async (req, res) => {
  const key = req.query.key || req.body.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!resend) {
    return res.status(500).json({ error: 'Email not configured.' });
  }

  const subscribers = readSubscribers();
  const now = Date.now();
  let sent = 0;
  let skipped = 0;
  const updated = [];

  for (const sub of subscribers) {
    const subTime = sub.subscribedAt
      ? new Date(sub.subscribedAt).getTime()
      : sub.dateSubscribed
        ? new Date(sub.dateSubscribed + 'T12:00:00Z').getTime()
        : null;

    if (!subTime || !sub.email || !sub.firstName) { updated.push(sub); continue; }

    const daysSince = (now - subTime) / (1000 * 60 * 60 * 24);
    const dripSent = sub.drip || [];
    const newDrip = [...dripSent];

    for (const email of DRIP_EMAILS) {
      if (dripSent.includes(email.id)) { skipped++; continue; }
      if (daysSince >= email.dayOffset) {
        try {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: sub.email,
            subject: email.subject,
            html: email.html(sub.firstName)
          });
          newDrip.push(email.id);
          sent++;
          console.log(`Drip ${email.id} sent to ${sub.email}`);
        } catch (err) {
          console.error(`Drip ${email.id} failed for ${sub.email}:`, err.message);
        }
      }
    }

    updated.push({ ...sub, drip: newDrip });
  }

  await acquireLock();
  try { writeSubscribers(updated); } finally { releaseLock(); }

  console.log(`Drip check complete: ${sent} sent, ${skipped} already sent`);
  res.json({ sent, skipped, total: subscribers.length });
});

// ─── 404 handler ───

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
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
  server.close(() => {
    console.log('  Server closed.');
    process.exit(0);
  });
}

// ─── Start server ───

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  International RE is running at http://0.0.0.0:${PORT}`);
  console.log(`  Subscribers: ${readSubscribers().length}\n`);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
