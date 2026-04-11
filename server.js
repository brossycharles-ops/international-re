const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SUBSCRIBERS_FILE = path.join(__dirname, 'data', 'subscribers.json');

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
