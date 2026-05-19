#!/usr/bin/env python3
"""
Ensures every content page has full social card meta tags so dlvr.it / Twitter
posts a large-image card instead of a text-only fallback.

Adds (if missing):
  - og:title, og:description, og:image, og:url, og:type
  - twitter:card=summary_large_image, twitter:title, twitter:description, twitter:image

Pulls fallback values from:
  - <title>...</title>                     -> og:title / twitter:title
  - <meta name="description" content=...>  -> og:description / twitter:description
  - First <img ... src="https://..."> in the file -> og:image / twitter:image
"""

import os
import re

BASE = os.path.join(os.path.dirname(__file__), '..', 'public')
SITE = 'https://www.internationalre.org'
DIRS = ['blog', 'guides', 'quick-reads', 'tips', 'landing', 'case-studies',
        'spotlights', 'tools', 'stories']

def extract(pattern, html, default=''):
    m = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else default

def first_external_image(html):
    # Prefer Unsplash hero (largest, sized for social)
    m = re.search(r'<img[^>]+src="(https://images\.unsplash\.com/[^"]+)"', html)
    if m:
        url = m.group(1)
        # Strip any &w=400 etc, force 1200 wide for social cards
        url = re.sub(r'[&?]w=\d+', '', url)
        url = re.sub(r'[&?]q=\d+', '', url)
        sep = '&' if '?' in url else '?'
        return f'{url}{sep}w=1200&q=80'
    # Fall back to any external image
    m = re.search(r'<img[^>]+src="(https://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"', html)
    return m.group(1) if m else ''

def has_tag(html, tag, attr_name, attr_val):
    pattern = rf'<meta\s+{attr_name}="{re.escape(attr_val)}"'
    return bool(re.search(pattern, html, re.IGNORECASE))

def insert_before_head_close(html, block):
    if '</head>' not in html:
        return html
    return html.replace('</head>', block + '\n</head>', 1)

def esc(s):
    return s.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')

changed_files = 0
skipped_files = 0
issues = []

for d in DIRS:
    dir_path = os.path.join(BASE, d)
    if not os.path.isdir(dir_path):
        continue
    for fname in sorted(os.listdir(dir_path)):
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(dir_path, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            html = f.read()

        page_url = f'{SITE}/{d}/{fname}'
        title = extract(r'<title>([^<]+)</title>', html)
        meta_desc = extract(r'<meta\s+name="description"\s+content="([^"]+)"', html)
        og_title = extract(r'<meta\s+property="og:title"\s+content="([^"]+)"', html)
        og_desc = extract(r'<meta\s+property="og:description"\s+content="([^"]+)"', html)
        og_image = extract(r'<meta\s+property="og:image"\s+content="([^"]+)"', html)

        # Determine final values
        final_title = og_title or title.split('|')[0].strip()
        final_desc = og_desc or meta_desc
        final_image = og_image or first_external_image(html)

        if not final_title:
            issues.append(f'NO TITLE: {d}/{fname}')
            continue
        if not final_image:
            issues.append(f'NO IMAGE: {d}/{fname}')
            # Use site default
            final_image = f'{SITE}/favicon.svg'

        tags_to_add = []

        if not og_title:
            tags_to_add.append(f'  <meta property="og:title" content="{esc(final_title)}">')
        if not og_desc and final_desc:
            tags_to_add.append(f'  <meta property="og:description" content="{esc(final_desc)}">')
        if not og_image:
            tags_to_add.append(f'  <meta property="og:image" content="{final_image}">')
        if 'og:url' not in html:
            tags_to_add.append(f'  <meta property="og:url" content="{page_url}">')
        if 'og:type' not in html:
            tags_to_add.append(f'  <meta property="og:type" content="article">')

        if 'twitter:card' not in html:
            tags_to_add.append('  <meta name="twitter:card" content="summary_large_image">')
        if 'twitter:title' not in html:
            tags_to_add.append(f'  <meta name="twitter:title" content="{esc(final_title)}">')
        if 'twitter:description' not in html and final_desc:
            tags_to_add.append(f'  <meta name="twitter:description" content="{esc(final_desc[:200])}">')
        if 'twitter:image' not in html and final_image:
            tags_to_add.append(f'  <meta name="twitter:image" content="{final_image}">')

        if tags_to_add:
            block = '\n'.join(tags_to_add)
            html = insert_before_head_close(html, block)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(html)
            changed_files += 1
            print(f'  FIXED ({len(tags_to_add)} tags): {d}/{fname}')
        else:
            skipped_files += 1

print()
print(f'Done. {changed_files} files updated, {skipped_files} already complete.')
if issues:
    print(f'\nIssues ({len(issues)}):')
    for i in issues:
        print(f'  - {i}')
