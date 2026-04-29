#!/usr/bin/env python3
"""
Replace RealEstateListing schema with proper Article/BlogPosting schema
on all blog posts, and fix inline form redirect to /thankyou.html.
"""
import os, re, json

BLOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'blog')

# Per-file metadata: (datePublished, dateModified, description, image)
META = {
    'buenos-aires-best-value-2026.html': {
        'date': '2026-04-10', 'mod': '2026-04-29',
        'headline': 'Buenos Aires Is the Best-Value Capital City in the World',
        'desc': 'World-class apartments at $2,800/sqm, 7.3% gross yields, capital controls gone, and UVA mortgages returning.',
        'img': 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1200&q=80',
        'keywords': 'Buenos Aires real estate, Argentina property investment, buy apartment Buenos Aires',
    },
    'granada-nicaraguas-colonial-gem-2026.html': {
        'date': '2026-04-08', 'mod': '2026-04-29',
        'headline': 'Granada, Nicaragua: The Colonial City Quietly Becoming Latin America\'s Top Value Play',
        'desc': 'Prices from $1,300/sqm, rental yields of 8–11%, 2 million tourists in 2024, and a $5.2B infrastructure push.',
        'img': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcb1f?w=1200&q=80',
        'keywords': 'Granada Nicaragua real estate, Nicaragua property, colonial city investment',
    },
    'guanacaste-hottest-market-2026.html': {
        'date': '2026-04-15', 'mod': '2026-04-29',
        'headline': 'Why Guanacaste Is the Hottest Property Market in Central America',
        'desc': 'LIR airport just hit its busiest quarter ever. Rental yields 9–11%, post-correction entry prices, and a $1.2B development underway.',
        'img': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
        'keywords': 'Guanacaste real estate, Costa Rica property investment, Tamarindo beachfront',
    },
    'latam-weekly-apr-14-18-2026.html': {
        'date': '2026-04-18', 'mod': '2026-04-18',
        'headline': 'Latin America Real Estate Weekly — April 14–18, 2026',
        'desc': 'Costa Rica raises its residency investment bar, Argentina\'s mortgage revival accelerates, Nicaragua\'s coast heats up.',
        'img': 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=1200&q=80',
        'keywords': 'Latin America real estate news, weekly roundup, LatAm property market',
    },
    'latam-weekly-apr-21-25-2026.html': {
        'date': '2026-04-25', 'mod': '2026-04-25',
        'headline': 'Latin America Real Estate Weekly — April 21–25, 2026',
        'desc': 'Panama\'s Metro boom lifts suburban values, Argentina\'s UVA mortgage wave deepens, Peru\'s Lima market tightens.',
        'img': 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=1200&q=80',
        'keywords': 'Latin America real estate news, Panama Metro, Buenos Aires yields, Medellin property',
    },
    'latam-weekly-apr-26-may-2-2026.html': {
        'date': '2026-04-29', 'mod': '2026-04-29',
        'headline': 'Latin America Real Estate Weekly — April 26 – May 2, 2026',
        'desc': 'Mexico\'s beach markets hit 12% price growth, Colombia\'s renters outnumber owners, Brazil\'s weak real opens a foreign-buyer window.',
        'img': 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=1200&q=80',
        'keywords': 'Latin America real estate news, Mexico beach property, Colombia rental market',
    },
    'medellin-real-estate-2026.html': {
        'date': '2026-04-12', 'mod': '2026-04-29',
        'headline': 'Medellín Real Estate in 2026: Latin America\'s Smartest Value Play',
        'desc': 'Apartments from $1,500/sqm, 6.5–9% rental yields, 8,300 digital nomads arriving monthly.',
        'img': 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1200&q=80',
        'keywords': 'Medellin real estate, Colombia property investment, buy apartment Medellin',
    },
    'mendoza-wine-country-estates.html': {
        'date': '2026-04-05', 'mod': '2026-04-29',
        'headline': 'Mendoza Wine Country: Vineyard Estates From $200K',
        'desc': '1.59 million wine tourists, 28% rental growth, and vineyard properties at a fraction of Napa prices.',
        'img': 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=1200&q=80',
        'keywords': 'Mendoza real estate, Argentina wine country property, vineyard investment',
    },
    'panama-city-real-estate-2026.html': {
        'date': '2026-04-20', 'mod': '2026-04-29',
        'headline': 'Panama City in 2026: Latin America\'s Most Underrated Dollar-Denominated Yield Play',
        'desc': 'Apartments from $1,900/sqm, gross rental yields of 6.5–9%, zero currency risk, and Metro Line 3 reshaping western suburbs.',
        'img': 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=80',
        'keywords': 'Panama City real estate, Panama property investment, buy apartment Panama',
    },
    'san-juan-del-sur-affordable-beach.html': {
        'date': '2026-04-03', 'mod': '2026-04-29',
        'headline': 'San Juan del Sur: Central America\'s Last Affordable Beach Town',
        'desc': 'Beachfront lots from $21K, 7–10% annual appreciation, and a cost of living under $1,500/month.',
        'img': 'https://images.unsplash.com/photo-1505881502353-a1986add3762?w=1200&q=80',
        'keywords': 'San Juan del Sur real estate, Nicaragua beachfront property, affordable beach town',
    },
    'santiago-supply-squeeze-2026.html': {
        'date': '2026-04-17', 'mod': '2026-04-29',
        'headline': "Santiago's Housing Shortage Is the Best News for Real Estate Investors in 2026",
        'desc': 'Building permits down 25%, rents rising 5% year-over-year, and two new metro lines under construction.',
        'img': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&q=80',
        'keywords': 'Santiago real estate, Chile property investment, Santiago housing market 2026',
    },
    'santiago-vs-lake-district.html': {
        'date': '2026-04-06', 'mod': '2026-04-29',
        'headline': 'Santiago vs. The Lake District: Where Should You Buy in Chile?',
        'desc': 'Urban condos with 4.9% yields vs. mountain retreats appreciating at nearly 15%. Chile\'s two best investor markets compared.',
        'img': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&q=80',
        'keywords': 'Chile real estate, Santiago vs Lake District, where to buy in Chile',
    },
    'tbilisi-georgia-1-percent-tax-2026.html': {
        'date': '2026-04-22', 'mod': '2026-04-29',
        'headline': 'Tbilisi, Georgia in 2026: The 1% Tax Loophole Quietly Drawing Global Investors',
        'desc': '$800/sqm freehold ownership for foreigners, 8.5–12% rental yields, a 1% small-business tax on rental income.',
        'img': 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=1200&q=80',
        'keywords': 'Tbilisi real estate, Georgia property investment, buy apartment Tbilisi',
    },
}

RELATED = {
    'buenos-aires-best-value-2026.html':   ['mendoza-wine-country-estates.html', 'medellin-real-estate-2026.html', 'panama-city-real-estate-2026.html'],
    'granada-nicaraguas-colonial-gem-2026.html': ['san-juan-del-sur-affordable-beach.html', 'guanacaste-hottest-market-2026.html', 'panama-city-real-estate-2026.html'],
    'guanacaste-hottest-market-2026.html':  ['granada-nicaraguas-colonial-gem-2026.html', 'san-juan-del-sur-affordable-beach.html', 'medellin-real-estate-2026.html'],
    'latam-weekly-apr-14-18-2026.html':     ['latam-weekly-apr-21-25-2026.html', 'guanacaste-hottest-market-2026.html', 'buenos-aires-best-value-2026.html'],
    'latam-weekly-apr-21-25-2026.html':     ['latam-weekly-apr-26-may-2-2026.html', 'latam-weekly-apr-14-18-2026.html', 'panama-city-real-estate-2026.html'],
    'latam-weekly-apr-26-may-2-2026.html':  ['latam-weekly-apr-21-25-2026.html', 'medellin-real-estate-2026.html', 'buenos-aires-best-value-2026.html'],
    'medellin-real-estate-2026.html':       ['buenos-aires-best-value-2026.html', 'panama-city-real-estate-2026.html', 'santiago-supply-squeeze-2026.html'],
    'mendoza-wine-country-estates.html':    ['buenos-aires-best-value-2026.html', 'santiago-vs-lake-district.html', 'medellin-real-estate-2026.html'],
    'panama-city-real-estate-2026.html':    ['guanacaste-hottest-market-2026.html', 'medellin-real-estate-2026.html', 'san-juan-del-sur-affordable-beach.html'],
    'san-juan-del-sur-affordable-beach.html': ['granada-nicaraguas-colonial-gem-2026.html', 'guanacaste-hottest-market-2026.html', 'buenos-aires-best-value-2026.html'],
    'santiago-supply-squeeze-2026.html':    ['santiago-vs-lake-district.html', 'medellin-real-estate-2026.html', 'buenos-aires-best-value-2026.html'],
    'santiago-vs-lake-district.html':       ['santiago-supply-squeeze-2026.html', 'buenos-aires-best-value-2026.html', 'mendoza-wine-country-estates.html'],
    'tbilisi-georgia-1-percent-tax-2026.html': ['medellin-real-estate-2026.html', 'panama-city-real-estate-2026.html', 'buenos-aires-best-value-2026.html'],
}

TITLES = {f: m['headline'] for f, m in META.items()}

def make_article_schema(fname, m, url_base='https://www.internationalre.org/blog/'):
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": m['headline'],
        "description": m['desc'],
        "image": m['img'],
        "datePublished": m['date'],
        "dateModified": m['mod'],
        "author": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
        "publisher": {
            "@type": "Organization",
            "name": "International RE",
            "url": "https://www.internationalre.org",
            "logo": {"@type": "ImageObject", "url": "https://www.internationalre.org/favicon.ico"}
        },
        "mainEntityOfPage": {"@type": "WebPage", "@id": url_base + fname},
        "keywords": m['keywords'],
    }

def make_related_block(fname):
    related = RELATED.get(fname, [])
    if not related:
        return ''
    cards = ''
    for r in related:
        title = TITLES.get(r, r.replace('-', ' ').replace('.html', '').title())
        cards += f'''
    <a class="related-card" href="/blog/{r}">
      <span class="related-card-label">Related</span>
      <span class="related-card-title">{title}</span>
      <span class="related-card-arrow">&rarr;</span>
    </a>'''
    return f'''
  <!-- Related Articles -->
  <section class="related-articles">
    <div class="container">
      <h4 class="related-heading">More Market Intelligence</h4>
      <div class="related-grid">{cards}
      </div>
    </div>
  </section>
'''

RELATED_CSS = """
  <style>
    .related-articles { padding: 40px 0; border-top: 1px solid #e8e3d9; background: #f7f5f0; }
    .related-heading { font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; color: #aaa; font-weight: 600; margin: 0 0 18px; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .related-card {
      display: flex; flex-direction: column; gap: 6px;
      background: #fff; border: 1px solid #e8e3d9; border-radius: 10px;
      padding: 18px 20px; text-decoration: none; color: #0a1628;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .related-card:hover { border-color: #c9a84c; box-shadow: 0 4px 16px rgba(10,22,40,0.08); }
    .related-card-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #c9a84c; }
    .related-card-title { font-size: 0.9rem; font-weight: 600; line-height: 1.4; flex: 1; }
    .related-card-arrow { font-size: 1rem; color: #c9a84c; }
  </style>"""

for fname in sorted(os.listdir(BLOG_DIR)):
    if not fname.endswith('.html') or fname not in META:
        continue
    fpath = os.path.join(BLOG_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        html = f.read()

    m = META[fname]
    changed = False

    # 1. Replace old schema with Article schema
    schema_json = json.dumps(make_article_schema(fname, m), indent=2, ensure_ascii=False)
    new_schema_tag = f'<script type="application/ld+json">\n{schema_json}\n</script>'

    old_schema_pat = r'<script type="application/ld\+json">.*?</script>'
    if re.search(old_schema_pat, html, re.DOTALL):
        html = re.sub(old_schema_pat, new_schema_tag, html, count=1, flags=re.DOTALL)
        changed = True
        print(f'  SCHEMA upgraded: {fname}')
    elif '<head>' in html:
        html = html.replace('</head>', new_schema_tag + '\n</head>', 1)
        changed = True
        print(f'  SCHEMA added: {fname}')

    # 2. Fix inline subscribe form redirect to /thankyou.html
    OLD_INLINE = "if (res.ok) { inlineForm.style.display = 'none'; document.getElementById('inlineSuccess').style.display = 'flex'; localStorage.setItem('subscribed', 'true'); }"
    NEW_INLINE = "if (res.ok) { localStorage.setItem('subscribed', 'true'); window.location.href = '/thankyou.html'; }"
    if OLD_INLINE in html:
        html = html.replace(OLD_INLINE, NEW_INLINE)
        changed = True
        print(f'  INLINE form redirect fixed: {fname}')

    # 3. Add related articles section before footer (if not already present)
    if 'related-articles' not in html and '<footer' in html:
        related_block = make_related_block(fname)
        if related_block:
            html = html.replace('<footer', related_block + '\n  <footer', 1)
            # Inject related CSS into <head>
            html = html.replace('</head>', RELATED_CSS + '\n</head>', 1)
            changed = True
            print(f'  RELATED articles added: {fname}')

    if changed:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(html)
    else:
        print(f'  NO CHANGE: {fname}')

print('\nDone.')
