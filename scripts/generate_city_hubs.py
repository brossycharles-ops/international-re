#!/usr/bin/env python3
"""
Generates programmatic SEO city-hub pages at /cities/[slug]/index.html.
Each hub aggregates existing blog/guides/quick-reads/tips/landing content
that matches the city, with structured stats, internal links, and a
subscribe CTA. Idempotent — safe to re-run.

Also generates /cities/index.html (the hub-of-hubs).
"""

import json
import os
import re

BASE = os.path.join(os.path.dirname(__file__), '..')
PUBLIC = os.path.join(BASE, 'public')
DATA = os.path.join(BASE, 'data', 'cities.json')
SITE = 'https://www.internationalre.org'

with open(DATA) as f:
    cities = json.load(f)['cities']

# Build a master list of all existing content pages
def scan_content():
    pages = []
    for d in ['blog', 'guides', 'quick-reads', 'tips', 'landing']:
        dir_path = os.path.join(PUBLIC, d)
        if not os.path.isdir(dir_path):
            continue
        for fname in sorted(os.listdir(dir_path)):
            if not fname.endswith('.html'):
                continue
            fp = os.path.join(dir_path, fname)
            with open(fp) as f:
                html = f.read()
            title_match = re.search(r'<title>([^<|]+)', html)
            desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html)
            title = title_match.group(1).strip() if title_match else fname.replace('.html', '').replace('-', ' ').title()
            desc = desc_match.group(1).strip() if desc_match else ''
            pages.append({
                'path': f'/{d}/{fname}',
                'filename_lc': fname.lower(),
                'title': title,
                'description': desc,
                'kind': d
            })
    return pages

ALL_PAGES = scan_content()

def find_related(city):
    """Find existing pages whose filename contains any of the city's match slugs."""
    slugs = [s.lower() for s in city['matchSlugs']]
    out = []
    seen = set()
    for p in ALL_PAGES:
        for slug in slugs:
            if slug in p['filename_lc'] and p['path'] not in seen:
                seen.add(p['path'])
                out.append(p)
                break
    # Rank: blog first, then guides, then quick-reads, then tips, then landing
    kind_order = {'blog': 0, 'guides': 1, 'quick-reads': 2, 'tips': 3, 'landing': 4}
    out.sort(key=lambda p: (kind_order.get(p['kind'], 9), p['title']))
    return out[:12]  # cap at 12 to keep page focused

def kind_label(kind):
    return {
        'blog': 'In-Depth Analysis',
        'guides': 'Legal & Buying Guides',
        'quick-reads': 'Quick Reads',
        'tips': 'Market Tips',
        'landing': 'Sector Reports'
    }.get(kind, kind.title())

def group_related(related):
    groups = {}
    for r in related:
        groups.setdefault(r['kind'], []).append(r)
    return groups

def render_city_hub(city):
    related = find_related(city)
    groups = group_related(related)
    page_url = f"{SITE}/cities/{city['slug']}/"
    hero_img = f"{city['heroImage']}?w=1920&q=80"
    social_img = f"{city['heroImage']}?w=1200&q=80"
    related_sections = ''
    for kind in ['blog', 'guides', 'quick-reads', 'tips', 'landing']:
        items = groups.get(kind, [])
        if not items:
            continue
        cards = '\n'.join(
            f'''        <a class="hub-card" href="{p["path"]}">
          <h3>{p["title"]}</h3>
          <p>{(p["description"] or "Read more")[:160]}</p>
          <span class="hub-card-cta">Read →</span>
        </a>'''
            for p in items
        )
        related_sections += f'''
    <section class="hub-section">
      <h2 class="hub-section-h2">{kind_label(kind)}</h2>
      <div class="hub-grid">
{cards}
      </div>
    </section>
'''

    stat_blocks = '\n'.join(
        f'        <div class="hub-stat"><div class="hub-stat-label">{label}</div><div class="hub-stat-value">{value}</div></div>'
        for label, value in [
            ('Price / m²', city['stats']['pricePerSqm']),
            ('Rental Yield', city['stats']['rentalYield']),
            ('Cost of Living', city['stats']['costOfLiving']),
            ('Currency', city['stats']['currency']),
        ]
    )

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{city["city"]}, {city["country"]} Real Estate Guide 2026 | International RE</title>
  <meta name="description" content="{city["metaDescription"]}">
  <link rel="canonical" href="{page_url}">
  <meta property="og:title" content="{city["city"]}, {city["country"]} Real Estate Guide 2026">
  <meta property="og:description" content="{city["metaDescription"]}">
  <meta property="og:image" content="{social_img}">
  <meta property="og:url" content="{page_url}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{city["city"]}, {city["country"]} Real Estate Guide 2026">
  <meta name="twitter:description" content="{city["metaDescription"][:200]}">
  <meta name="twitter:image" content="{social_img}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/layout_updates.css">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "{city["city"]}, {city["country"]} Real Estate Guide 2026",
    "description": "{city["metaDescription"]}",
    "image": "{social_img}",
    "datePublished": "2026-05-20",
    "dateModified": "2026-05-20",
    "author": {{ "@type": "Organization", "name": "International RE" }},
    "publisher": {{
      "@type": "Organization",
      "name": "International RE",
      "logo": {{ "@type": "ImageObject", "url": "{SITE}/favicon.svg" }}
    }}
  }}
  </script>
  <style>
    body {{ background: #fff; }}
    .hub-hero {{
      background:
        linear-gradient(180deg, rgba(10,22,40,0.35), rgba(10,22,40,0.75)),
        url('{hero_img}') center/cover;
      color: #fff;
      padding: 100px 24px 80px;
      text-align: center;
    }}
    .hub-flag {{ font-size: 2.4rem; margin-bottom: 16px; }}
    .hub-country {{
      font-family: 'Montserrat', sans-serif;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-size: 0.78rem;
      color: #c9a84c;
      font-weight: 700;
      margin-bottom: 14px;
    }}
    .hub-hero h1 {{
      font-family: 'Playfair Display', serif;
      font-size: clamp(2rem, 5vw, 3.6rem);
      max-width: 900px;
      margin: 0 auto 18px;
      line-height: 1.15;
    }}
    .hub-tagline {{
      max-width: 720px;
      margin: 0 auto;
      font-size: 1.05rem;
      opacity: 0.92;
      line-height: 1.6;
    }}
    .hub-stats {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      max-width: 980px;
      margin: -40px auto 0;
      padding: 0 24px;
      position: relative;
      z-index: 2;
    }}
    .hub-stat {{
      background: #fff;
      border-radius: 12px;
      padding: 22px 18px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(10,22,40,0.12);
    }}
    .hub-stat-label {{
      font-family: 'Montserrat', sans-serif;
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #888;
      font-weight: 600;
      margin-bottom: 8px;
    }}
    .hub-stat-value {{
      font-family: 'Playfair Display', serif;
      font-size: 1.3rem;
      color: #0a1628;
      font-weight: 600;
    }}
    .hub-body {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 80px 24px;
    }}
    .hub-section + .hub-section {{ margin-top: 64px; }}
    .hub-section-h2 {{
      font-family: 'Playfair Display', serif;
      font-size: 1.7rem;
      color: #0a1628;
      margin-bottom: 24px;
      border-bottom: 2px solid #c9a84c;
      padding-bottom: 10px;
      display: inline-block;
    }}
    .hub-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }}
    .hub-card {{
      display: block;
      background: #fff;
      border: 1px solid #e8e3d9;
      border-radius: 12px;
      padding: 22px;
      text-decoration: none;
      color: inherit;
      transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    }}
    .hub-card:hover {{
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(10,22,40,0.10);
      border-color: #c9a84c;
      text-decoration: none;
    }}
    .hub-card h3 {{
      font-family: 'Playfair Display', serif;
      font-size: 1.05rem;
      color: #0a1628;
      margin: 0 0 10px;
      line-height: 1.35;
    }}
    .hub-card p {{
      color: #555;
      font-size: 0.88rem;
      line-height: 1.55;
      margin: 0 0 12px;
    }}
    .hub-card-cta {{
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      color: #c9a84c;
      font-size: 0.82rem;
      letter-spacing: 0.05em;
    }}
    .hub-cta {{
      background: linear-gradient(160deg, #0a1628 0%, #132039 60%, #0d1e38 100%);
      color: #fff;
      padding: 80px 24px;
      text-align: center;
    }}
    .hub-cta h2 {{
      font-family: 'Playfair Display', serif;
      font-size: clamp(1.6rem, 3vw, 2.2rem);
      max-width: 720px;
      margin: 0 auto 16px;
    }}
    .hub-cta p {{ max-width: 600px; margin: 0 auto 28px; opacity: 0.85; }}
    .hub-cta-form {{ display: flex; gap: 10px; max-width: 480px; margin: 0 auto; flex-wrap: wrap; }}
    .hub-cta-form input {{
      flex: 1; min-width: 220px;
      padding: 14px 16px; border-radius: 8px;
      border: none; font-family: inherit; font-size: 0.95rem;
    }}
    .hub-cta-form button {{
      padding: 14px 24px;
      background: linear-gradient(180deg, #d4b05a, #c9a84c);
      color: #0a1628;
      border: none; border-radius: 8px;
      font-weight: 700; cursor: pointer; font-family: inherit;
    }}
    .hub-nav {{
      background: #fff;
      border-bottom: 1px solid #e8e3d9;
      padding: 14px 24px;
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 0; z-index: 50;
    }}
    .hub-nav a.logo {{ font-weight: 700; color: #0a1628; text-decoration: none; font-size: 1rem; }}
    .hub-nav a.logo span {{ color: #c9a84c; }}
    .hub-nav-links a {{
      color: #555; text-decoration: none; margin-left: 22px; font-size: 0.92rem;
    }}
    .hub-nav-links a:hover {{ color: #0a1628; }}
    @media (max-width: 700px) {{
      .hub-nav-links a {{ margin-left: 14px; font-size: 0.85rem; }}
      .hub-nav-links a:nth-child(n+4) {{ display: none; }}
    }}
  </style>
  <script defer src="/js/analytics.js"></script>
  <script async src="https://plausible.io/js/pa-CY3wf_vdX8_H8IwOCHT4z.js"></script>
  <script>
    window.plausible=window.plausible||function(){{(plausible.q=plausible.q||[]).push(arguments)}},plausible.init=plausible.init||function(i){{plausible.o=i||{{}}}};
    plausible.init()
  </script>
</head>
<body>
  <nav class="hub-nav">
    <a class="logo" href="/"><span>&#9670;</span> International RE</a>
    <div class="hub-nav-links">
      <a href="/">Markets</a>
      <a href="/newsletter.html">Newsletters</a>
      <a href="/blog.html">Blog</a>
      <a href="/guides.html">Guides</a>
      <a href="/cities/">Cities</a>
      <a href="/about.html">About</a>
    </div>
  </nav>

  <header class="hub-hero">
    <div class="hub-flag" aria-hidden="true">{city["countryFlag"]}</div>
    <div class="hub-country">{city["country"]}</div>
    <h1>{city["city"]} Real Estate — 2026 Guide</h1>
    <p class="hub-tagline">{city["tagline"]}</p>
  </header>

  <section class="hub-stats" aria-label="Key market stats">
{stat_blocks}
  </section>

  <main class="hub-body">
    <section class="hub-section">
      <h2 class="hub-section-h2">About {city["city"]} for Foreign Buyers</h2>
      <p style="max-width:760px;color:#444;line-height:1.75;font-size:1.02rem;">
        {city["city"]}, {city["country"]} is one of the markets we track closely at International RE.
        This page aggregates everything we've published — in-depth market analysis, legal &amp; visa
        guides, current rental-yield data, and cost-of-living breakdowns — so you can build a
        complete picture before you fly out, hire a lawyer, or wire a deposit.
        Below: the latest analysis, organized by depth.
      </p>
    </section>
{related_sections}
  </main>

  <section class="hub-cta">
    <h2>Get the free 2026 Latin America Starter Kit</h2>
    <p>38 pages — prices per m², rental yields, visa rules, and a 47-item relocation checklist across 12 markets.</p>
    <form class="hub-cta-form" id="hubSubForm">
      <input type="email" name="email" placeholder="Your email" required aria-label="Email address">
      <button type="submit">Send It Free</button>
    </form>
  </section>

  <footer style="background:#0a1628;color:rgba(255,255,255,0.5);padding:40px 24px;text-align:center;font-size:0.85rem;">
    <a href="/" style="color:#c9a84c;font-weight:700;text-decoration:none;">&#9670; International RE</a>
    <p style="margin:14px 0 6px;">Independent research by Charles Brossy. No broker commissions.</p>
    <p style="margin:0;">
      <a href="/privacy.html" style="color:rgba(255,255,255,0.5);">Privacy</a> ·
      <a href="/terms.html" style="color:rgba(255,255,255,0.5);">Terms</a> ·
      <a href="/about.html" style="color:rgba(255,255,255,0.5);">About</a> ·
      <a href="/unsubscribe.html" style="color:rgba(255,255,255,0.5);">Unsubscribe</a>
    </p>
  </footer>

  <script>
    document.getElementById('hubSubForm').addEventListener('submit', async function(e) {{
      e.preventDefault();
      const btn = this.querySelector('button');
      btn.disabled = true; btn.textContent = 'Sending…';
      try {{
        const res = await fetch('/api/subscribe', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ email: this.email.value.trim(), source: 'city-hub-{city["slug"]}' }})
        }});
        const data = await res.json();
        if (res.ok || /already subscribed/i.test(data.error || '')) {{
          localStorage.setItem('subscribed', 'true');
          window.location.href = '/thankyou.html';
        }} else {{
          alert(data.error || 'Something went wrong.');
          btn.disabled = false; btn.textContent = 'Send It Free';
        }}
      }} catch {{
        alert('Network error.');
        btn.disabled = false; btn.textContent = 'Send It Free';
      }}
    }});
  </script>
  <script src="/lead_capture.js" defer></script>
</body>
</html>
'''

def render_index(cities_list):
    cards = '\n'.join(
        f'''      <a class="city-card" href="/cities/{c["slug"]}/">
        <div class="city-card-img" style="background-image:url('{c["heroImage"]}?w=800&q=80');"></div>
        <div class="city-card-body">
          <span class="city-card-country">{c["countryFlag"]} {c["country"]}</span>
          <h2>{c["city"]}</h2>
          <p>{c["tagline"][:140]}</p>
        </div>
      </a>'''
        for c in cities_list
    )
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Latin America City Real Estate Guides 2026 | International RE</title>
  <meta name="description" content="Comprehensive city-by-city Latin American real estate guides — Medellín, Panama City, Buenos Aires, São Paulo, Mexico City, and 12 more markets.">
  <link rel="canonical" href="{SITE}/cities/">
  <meta property="og:title" content="Latin America City Real Estate Guides 2026">
  <meta property="og:description" content="Comprehensive city-by-city Latin American real estate guides — 17 markets across 9 countries.">
  <meta property="og:image" content="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80">
  <meta property="og:url" content="{SITE}/cities/">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Latin America City Real Estate Guides 2026">
  <meta name="twitter:description" content="17 city-by-city guides across 9 Latin American markets.">
  <meta name="twitter:image" content="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/layout_updates.css">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Latin America City Real Estate Guides 2026",
    "description": "Comprehensive city-by-city Latin American real estate guides covering 17 markets across 9 countries.",
    "url": "{SITE}/cities/",
    "isPartOf": {{
      "@type": "WebSite",
      "name": "International RE",
      "url": "{SITE}"
    }},
    "publisher": {{
      "@type": "Organization",
      "name": "International RE",
      "logo": {{ "@type": "ImageObject", "url": "{SITE}/favicon.svg" }}
    }}
  }}
  </script>
  <style>
    body {{ background: #f7f5f0; }}
    .cities-hero {{
      background: linear-gradient(160deg, #0a1628 0%, #132039 60%, #0d1e38 100%);
      color: #fff;
      padding: 80px 24px;
      text-align: center;
    }}
    .cities-hero h1 {{
      font-family: 'Playfair Display', serif;
      font-size: clamp(2rem, 4.5vw, 3.2rem);
      margin: 0 0 16px;
    }}
    .cities-hero p {{ max-width: 700px; margin: 0 auto; opacity: 0.85; }}
    .cities-grid {{
      max-width: 1240px;
      margin: 60px auto;
      padding: 0 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 22px;
    }}
    .city-card {{
      display: block; background: #fff; border-radius: 14px;
      overflow: hidden; text-decoration: none; color: inherit;
      box-shadow: 0 6px 22px rgba(10,22,40,0.07);
      transition: transform 0.18s, box-shadow 0.18s;
    }}
    .city-card:hover {{ transform: translateY(-3px); box-shadow: 0 14px 36px rgba(10,22,40,0.14); text-decoration: none; }}
    .city-card-img {{ height: 180px; background-size: cover; background-position: center; }}
    .city-card-body {{ padding: 20px; }}
    .city-card-country {{
      font-family: 'Montserrat', sans-serif;
      letter-spacing: 0.12em; text-transform: uppercase;
      font-size: 0.7rem; color: #888; font-weight: 700;
    }}
    .city-card h3 {{
      font-family: 'Playfair Display', serif;
      font-size: 1.3rem; color: #0a1628; margin: 8px 0;
    }}
    .city-card p {{ color: #555; font-size: 0.9rem; margin: 0; line-height: 1.5; }}
    .cities-nav {{
      background: #fff; border-bottom: 1px solid #e8e3d9;
      padding: 14px 24px; display: flex; align-items: center; justify-content: space-between;
    }}
    .cities-nav a.logo {{ font-weight: 700; color: #0a1628; text-decoration: none; }}
    .cities-nav a.logo span {{ color: #c9a84c; }}
    .cities-nav-links a {{ color: #555; text-decoration: none; margin-left: 22px; font-size: 0.92rem; }}
  </style>
  <script defer src="/js/analytics.js"></script>
  <script async src="https://plausible.io/js/pa-CY3wf_vdX8_H8IwOCHT4z.js"></script>
  <script>
    window.plausible=window.plausible||function(){{(plausible.q=plausible.q||[]).push(arguments)}},plausible.init=plausible.init||function(i){{plausible.o=i||{{}}}};
    plausible.init()
  </script>
</head>
<body>
  <nav class="cities-nav">
    <a class="logo" href="/"><span>&#9670;</span> International RE</a>
    <div class="cities-nav-links">
      <a href="/">Home</a>
      <a href="/blog.html">Blog</a>
      <a href="/guides.html">Guides</a>
      <a href="/about.html">About</a>
    </div>
  </nav>

  <header class="cities-hero">
    <h1>Latin America City Real Estate Guides</h1>
    <p>17 markets across 9 countries. Each guide aggregates our market analysis, legal guides, rental-yield data, and cost-of-living breakdowns for foreign buyers.</p>
  </header>

  <main class="cities-grid">
{cards}
  </main>

  <footer style="background:#0a1628;color:rgba(255,255,255,0.5);padding:40px 24px;text-align:center;font-size:0.85rem;">
    <a href="/" style="color:#c9a84c;font-weight:700;text-decoration:none;">&#9670; International RE</a>
    <p style="margin:14px 0 6px;">Independent research by Charles Brossy.</p>
  </footer>
  <script src="/lead_capture.js" defer></script>
</body>
</html>
'''

# Generate
out_dir = os.path.join(PUBLIC, 'cities')
os.makedirs(out_dir, exist_ok=True)

generated = []
for city in cities:
    city_dir = os.path.join(out_dir, city['slug'])
    os.makedirs(city_dir, exist_ok=True)
    out_path = os.path.join(city_dir, 'index.html')
    related_count = len(find_related(city))
    with open(out_path, 'w') as f:
        f.write(render_city_hub(city))
    generated.append((city['slug'], related_count))
    print(f"  ✓ /cities/{city['slug']}/ — {related_count} related pages linked")

# Index page
with open(os.path.join(out_dir, 'index.html'), 'w') as f:
    f.write(render_index(cities))
print(f"  ✓ /cities/ — index page with {len(cities)} cities")

print(f"\nDone. Generated {len(generated) + 1} pages.")
