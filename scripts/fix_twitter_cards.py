#!/usr/bin/env python3
"""Add twitter:card tags and enrich thin og:description tags across all blog posts."""

import os
import re

BLOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'blog')

# Map filename -> enriched og:description (only for posts with thin OG descriptions)
OG_UPGRADES = {
    'buenos-aires-best-value-2026.html':
        'World-class apartments at $2,800/sqm, 7.3% gross yields, capital controls gone, and UVA mortgages returning. Updated April 2026: prices up 8% YTD. Why Buenos Aires leads global value.',
    'mendoza-wine-country-estates.html':
        '1.59 million wine tourists, 28% rental growth, and vineyard estates from $200K — a fraction of Napa prices. Inside Mendoza, Argentina\'s best-kept real estate secret.',
    'guanacaste-hottest-market-2026.html':
        'LIR airport hit its busiest quarter ever (+12% YoY). Rental yields 9–11%, post-correction entry prices, and a $1.2B development pipeline. Why Guanacaste is Central America\'s top market in 2026.',
    'medellin-real-estate-2026.html':
        'Apartments from $1,500/sqm, 6.5–9% rental yields, 8,300 digital nomads arriving monthly, and a peso still giving USD buyers a 15% edge. The numbers make the case for Medellín.',
    'santiago-vs-lake-district.html':
        'Santiago condos yield 4.9% with stable expat tenants. The Lake District appreciates at nearly 15% annually on tourism demand. How to choose between Chile\'s two best investor markets.',
}

for fname in sorted(os.listdir(BLOG_DIR)):
    if not fname.endswith('.html'):
        continue
    fpath = os.path.join(BLOG_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        html = f.read()

    changed = False

    # Skip if already has twitter:card
    if 'twitter:card' in html:
        print(f'  SKIP (already has twitter:card): {fname}')
        continue

    # Pull og:title and og:description and og:image for the twitter tags
    og_title = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    og_desc  = re.search(r'<meta property="og:description" content="([^"]+)"', html)
    og_image = re.search(r'<meta property="og:image" content="([^"]+)"', html)

    if not og_title:
        print(f'  SKIP (no og:title): {fname}')
        continue

    title_val = og_title.group(1)
    desc_val  = og_desc.group(1) if og_desc else ''
    image_val = og_image.group(1) if og_image else ''

    # Upgrade thin og:description if in our map
    if fname in OG_UPGRADES and og_desc:
        new_desc = OG_UPGRADES[fname]
        old_tag = f'<meta property="og:description" content="{og_desc.group(1)}">'
        new_tag = f'<meta property="og:description" content="{new_desc}">'
        if old_tag in html:
            html = html.replace(old_tag, new_tag)
            desc_val = new_desc
            changed = True
            print(f'  UPGRADED og:description: {fname}')

    # Build twitter card block
    twitter_block = f'''  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title_val}">
  <meta name="twitter:description" content="{desc_val[:200]}">'''
    if image_val:
        twitter_block += f'\n  <meta name="twitter:image" content="{image_val}">'

    # Insert before </head>
    if '</head>' in html:
        html = html.replace('</head>', twitter_block + '\n</head>', 1)
        changed = True
        print(f'  ADDED twitter:card: {fname}')

    if changed:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(html)

print('Done.')
