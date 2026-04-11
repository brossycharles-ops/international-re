const express = require('express');
const path = require('path');
const fs = require('fs');

const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const SUBSCRIBERS_FILE = path.join(__dirname, 'data', 'subscribers.json');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

    subscribers.push({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      dateSubscribed: new Date().toISOString().split('T')[0]
    });

    writeSubscribers(subscribers);
    console.log(`New subscriber: ${firstName} ${lastName} <${normalizedEmail}> (total: ${subscribers.length})`);

    // Send welcome email (non-blocking — don't fail the subscribe if email fails)
    if (resend) {
      resend.emails.send({
        from: 'International RE <newsletter@internationalre.org>',
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

// ─── Subscriber list (for sending newsletters — protected by simple key) ───

app.get('/api/subscribers', (req, res) => {
  const key = req.query.key;
  if (key !== process.env.ADMIN_KEY && key !== 'internationalre2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(readSubscribers());
});

// ─── Send newsletter to all subscribers ───

app.post('/api/send-newsletter', async (req, res) => {
  const key = req.query.key || req.body.key;
  if (key !== process.env.ADMIN_KEY && key !== 'internationalre2026') {
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
        from: 'International RE <newsletter@internationalre.org>',
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
