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

// RSS Feed endpoint — social media tools (Buffer, IFTTT, Zapier) can
// auto-post from this feed. Also helps with Google News indexing.
app.get('/feed.xml', (req, res) => {
  const blogDir = path.join(__dirname, 'public', 'blog');
  const files = fs.existsSync(blogDir) ? fs.readdirSync(blogDir).filter(f => f.endsWith('.html')) : [];

  let items = files.map(file => {
    const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
    const titleMatch = content.match(/<title>([^<|]*)/);
    const descMatch = content.match(/<meta name="description" content="([^"]*)"/);
    const dateMatch = content.match(/<span class="blog-post-date">([^<]*)<\/span>/);
    return {
      title: titleMatch ? titleMatch[1].trim() : file,
      description: descMatch ? descMatch[1] : '',
      link: `https://www.internationalre.org/blog/${file}`,
      date: dateMatch ? dateMatch[1].trim() : ''
    };
  });

  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>International RE — Latin America Real Estate</title>
    <link>https://www.internationalre.org</link>
    <description>Weekly market intelligence on Costa Rica, Nicaragua, Argentina &amp; Chile real estate.</description>
    <language>en-us</language>
    <atom:link href="https://www.internationalre.org/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.map(item => `<item>
      <title>${item.title.replace(/&/g, '&amp;')}</title>
      <link>${item.link}</link>
      <description>${item.description.replace(/&/g, '&amp;')}</description>
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
