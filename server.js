const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const EXCEL_FILE = path.join(__dirname, 'newsletter_subscribers.xlsx');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Excel file if it doesn't exist
function initExcel() {
  if (!fs.existsSync(EXCEL_FILE)) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['First Name', 'Last Name', 'Email', 'Date Subscribed']]);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Subscribers');
    XLSX.writeFile(wb, EXCEL_FILE);
    console.log('Created newsletter_subscribers.xlsx');
  }
}

// Simple write lock to prevent concurrent Excel file corruption
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
    const next = writeQueue.shift();
    next();
  } else {
    writeLock = false;
  }
}

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  await acquireLock();
  try {
    const wb = XLSX.readFile(EXCEL_FILE);
    const ws = wb.Sheets['Subscribers'];
    const data = XLSX.utils.sheet_to_json(ws);

    // Check for duplicate email
    const duplicate = data.find(row => row['Email'] && row['Email'].toLowerCase() === email.toLowerCase());
    if (duplicate) {
      return res.status(409).json({ error: 'This email is already subscribed.' });
    }

    // Add new subscriber
    const newRow = {
      'First Name': firstName.trim(),
      'Last Name': lastName.trim(),
      'Email': email.trim().toLowerCase(),
      'Date Subscribed': new Date().toISOString().split('T')[0]
    };
    data.push(newRow);

    const newWs = XLSX.utils.json_to_sheet(data);
    newWs['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 22 }];
    wb.Sheets['Subscribers'] = newWs;
    XLSX.writeFile(wb, EXCEL_FILE);

    console.log(`New subscriber: ${firstName} ${lastName} <${email}>`);
    res.json({ message: 'Successfully subscribed!' });
  } catch (err) {
    console.error('Error saving subscriber:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  } finally {
    releaseLock();
  }
});

// Subscriber count endpoint for social proof
app.get('/api/subscriber-count', (req, res) => {
  try {
    const wb = XLSX.readFile(EXCEL_FILE);
    const ws = wb.Sheets['Subscribers'];
    const data = XLSX.utils.sheet_to_json(ws);
    res.json({ count: data.length });
  } catch {
    res.json({ count: 0 });
  }
});

// RSS Feed endpoint — scans ALL content directories so dlvr.it
// auto-posts every new page to Twitter and TikTok daily
app.get('/feed.xml', (req, res) => {
  // Scan all content directories — every new page becomes a social post
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
    { dir: 'es/blog', urlPrefix: 'es/blog' },
    { dir: 'es/guides', urlPrefix: 'es/guides' },
    { dir: 'pt/blog', urlPrefix: 'pt/blog' },
    { dir: 'pt/guides', urlPrefix: 'pt/guides' },
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
        // Try multiple date formats used across different page types
        const dateMatch = content.match(/<span class="blog-post-date">([^<]*)<\/span>/) ||
                          content.match(/<meta property="article:published_time" content="([^"]*)"/>) ||
                          content.match(/Updated\s+(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';
        // Use file modification time as fallback
        const fileStat = fs.statSync(path.join(fullPath, file));

        items.push({
          title: titleMatch ? titleMatch[1].trim() : file.replace('.html', ''),
          description: descMatch ? descMatch[1] : '',
          link: `https://www.internationalre.org/${urlPrefix}/${file}`,
          date: dateStr || fileStat.mtime.toISOString().split('T')[0]
        });
      } catch (e) {
        // Skip files that can't be parsed
      }
    });
  });

  // Sort newest first
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Limit to 50 most recent items
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
      <title>${item.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
      <link>${item.link}</link>
      <description>${item.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</description>
      <pubDate>${item.date ? new Date(item.date).toUTCString() : ''}</pubDate>
      <guid>${item.link}</guid>
    </item>`).join('\n    ')}
  </channel>
</rss>`;

  res.type('application/xml').send(rss);
});

// API endpoint to serve latest social media content as JSON
// Automation tools can poll this to get ready-to-post content
app.get('/api/social-content', (req, res) => {
  const socialDir = path.join(__dirname, 'growth-output', 'social');
  if (!fs.existsSync(socialDir)) return res.json({ posts: [] });

  const files = fs.readdirSync(socialDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();

  if (files.length === 0) return res.json({ posts: [] });

  const latest = fs.readFileSync(path.join(socialDir, files[0]), 'utf-8');
  res.json({ date: files[0], content: latest });
});

// Prevent crashes from unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n  ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('  Server closed.');
    process.exit(0);
  });
}

// Start server
initExcel();
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  International RE is running at http://0.0.0.0:${PORT}\n`);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
