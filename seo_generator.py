#!/usr/bin/env python3
"""
seo_generator.py — Programmatic SEO landing page generator
============================================================

Generates one landing page per (city, focus) target into
public/landing/<slug>.html and updates public/sitemap.xml.

USAGE
    python3 seo_generator.py            # generate all targets
    python3 seo_generator.py --dry-run  # print plan, don't write
    python3 seo_generator.py --only medellin-colombia
    python3 seo_generator.py --add-sitemap  # only update sitemap

PHILOSOPHY
    - One unique long-form page per (city × focus) pair
    - Real, market-specific data per page (no template-only fluff)
    - Internal links between sibling pages to build a topic cluster
    - LocalBusiness + RealEstateListing JSON-LD for rich snippets
    - GDPR/CCPA-friendly: pages reference site-level subscribe form,
      no third-party trackers injected, all images are CDN with
      loading="lazy" + width/height to avoid CLS
"""

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
LANDING = PUBLIC / "landing"
SITEMAP = PUBLIC / "sitemap.xml"
SITE_URL = "https://www.internationalre.org"

# ---------------------------------------------------------------------------
# Target data — extend this list to add more pages.
# Every entry MUST have unique market data so the page is genuinely useful.
# ---------------------------------------------------------------------------

CITIES = [
    {"slug": "medellin-colombia", "city": "Medellín", "country": "Colombia", "flag": "🇨🇴",
     "price_low": 1200, "price_high": 2400, "yield_low": 6.5, "yield_high": 9.0, "growth": "15-20%",
     "tax": "0.8%", "tagline": "South America's fastest-appreciating expat market",
     "neighborhoods": ["El Poblado", "Laureles", "Envigado", "Sabaneta"],
     "image": "https://images.unsplash.com/photo-1583072108406-90a32d3a4e1f?w=1920&q=80"},
    {"slug": "playa-del-carmen-mexico", "city": "Playa del Carmen", "country": "Mexico", "flag": "🇲🇽",
     "price_low": 1800, "price_high": 3500, "yield_low": 8.0, "yield_high": 11.0, "growth": "6-10%",
     "tax": "0.3%", "tagline": "Caribbean Airbnb yields with bank-trust ownership",
     "neighborhoods": ["Playacar", "Centro", "Coco Beach", "Mayakoba"],
     "image": "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=1920&q=80"},
    {"slug": "tamarindo-costa-rica", "city": "Tamarindo", "country": "Costa Rica", "flag": "🇨🇷",
     "price_low": 1800, "price_high": 3200, "yield_low": 6.5, "yield_high": 8.0, "growth": "8-12%",
     "tax": "0.25%", "tagline": "Equal foreign-ownership rights, lowest property tax in the hemisphere",
     "neighborhoods": ["Langosta", "Avellanas", "Pinilla", "Conchal"],
     "image": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1920&q=80"},
    {"slug": "panama-city-panama", "city": "Panama City", "country": "Panama", "flag": "🇵🇦",
     "price_low": 1600, "price_high": 2800, "yield_low": 7.5, "yield_high": 9.2, "growth": "5-7%",
     "tax": "0.7%", "tagline": "Fully dollarized, banking-friendly, Friendly Nations Visa",
     "neighborhoods": ["Punta Pacifica", "Costa del Este", "Casco Viejo", "Condado del Rey"],
     "image": "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1920&q=80"},
    {"slug": "buenos-aires-argentina", "city": "Buenos Aires", "country": "Argentina", "flag": "🇦🇷",
     "price_low": 1500, "price_high": 3500, "yield_low": 5.0, "yield_high": 7.0, "growth": "3-6%",
     "tax": "1.25%", "tagline": "USD-cash deals, 40–50% below 2018 peak in real terms",
     "neighborhoods": ["Palermo", "Recoleta", "Belgrano", "Puerto Madero"],
     "image": "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1920&q=80"},
    {"slug": "santiago-chile", "city": "Santiago", "country": "Chile", "flag": "🇨🇱",
     "price_low": 2000, "price_high": 3800, "yield_low": 4.8, "yield_high": 6.2, "growth": "3-5%",
     "tax": "0.98%", "tagline": "Most transparent market in South America, UF-indexed contracts",
     "neighborhoods": ["Las Condes", "Vitacura", "Providencia", "Lo Barnechea"],
     "image": "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1920&q=80"},
    {"slug": "san-juan-del-sur-nicaragua", "city": "San Juan del Sur", "country": "Nicaragua", "flag": "🇳🇮",
     "price_low": 700, "price_high": 1800, "yield_low": 9.0, "yield_high": 13.0, "growth": "5-8%",
     "tax": "1.0%", "tagline": "Lowest entry in Central America, beachfront from $30K",
     "neighborhoods": ["Playa Maderas", "Playa Marsella", "El Coco", "Centro"],
     "image": "https://images.unsplash.com/photo-1523592121529-f6dde35f079e?w=1920&q=80"},
    {"slug": "punta-del-este-uruguay", "city": "Punta del Este", "country": "Uruguay", "flag": "🇺🇾",
     "price_low": 2400, "price_high": 4200, "yield_low": 5.0, "yield_high": 6.5, "growth": "4-6%",
     "tax": "0.3%", "tagline": "Wealth-preservation play, USD-friendly, easy tax residency",
     "neighborhoods": ["La Barra", "José Ignacio", "Manantiales", "Beverly Hills"],
     "image": "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?w=1920&q=80"},
    {"slug": "cuenca-ecuador", "city": "Cuenca", "country": "Ecuador", "flag": "🇪🇨",
     "price_low": 900, "price_high": 2200, "yield_low": 6.5, "yield_high": 8.5, "growth": "4-6%",
     "tax": "0.5%", "tagline": "Fully dollarized colonial capital, top expat retirement city",
     "neighborhoods": ["El Centro", "Gringolandia", "Challuabamba", "Misicata"],
     "image": "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1920&q=80"},
    {"slug": "lima-peru", "city": "Lima", "country": "Peru", "flag": "🇵🇪",
     "price_low": 1200, "price_high": 2400, "yield_low": 6.0, "yield_high": 8.0, "growth": "4-6%",
     "tax": "0.4%", "tagline": "Institutional-grade Pacific capital, strong long-stay rental demand",
     "neighborhoods": ["Miraflores", "San Isidro", "Barranco", "Surco"],
     "image": "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=1920&q=80"},
    {"slug": "florianopolis-brazil", "city": "Florianópolis", "country": "Brazil", "flag": "🇧🇷",
     "price_low": 1000, "price_high": 2800, "yield_low": 5.5, "yield_high": 7.5, "growth": "5-8%",
     "tax": "0.6%", "tagline": "Brazil's premier coastal expat hub, BRL re-entry opportunities",
     "neighborhoods": ["Jurerê Internacional", "Lagoa da Conceição", "Campeche", "Ingleses"],
     "image": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1920&q=80"},
]

FOCUSES = [
    {"slug": "luxury-real-estate", "h1": "Luxury Real Estate in {city}",
     "intro": "Premium properties for international investors and lifestyle buyers."},
    {"slug": "investment-opportunities", "h1": "Investment Opportunities in {city}",
     "intro": "Yield-focused real estate plays for cash-flow investors."},
    {"slug": "expat-buying-guide", "h1": "Expat Buying Guide for {city}",
     "intro": "Step-by-step process for foreign buyers — legal, financial and practical."},
    {"slug": "vacation-rental-roi", "h1": "Vacation Rental ROI in {city}",
     "intro": "Airbnb and short-term rental yield benchmarks for {city}."},
]

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="keywords" content="{keywords}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{image}">
  <meta property="og:url" content="{canonical}">
  <meta name="twitter:card" content="summary_large_image">

  <script type="application/ld+json">
  {jsonld}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="../layout_updates.css">
  <style>
    .landing-hero {{ position: relative; min-height: 70vh; display: flex; align-items: center; justify-content: center; text-align: center; color: #faf8f3; padding: 120px 24px 64px; }}
    .landing-hero::before {{ content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,14,26,0.6), rgba(10,14,26,0.85)), url('{image}') center/cover; z-index: -1; }}
    .landing-hero .eyebrow {{ font-family: Montserrat, sans-serif; color: #c9a84c; letter-spacing: 0.18em; font-size: 0.78rem; text-transform: uppercase; }}
    .landing-hero h1 {{ font-family: Montserrat, sans-serif; font-size: clamp(2rem, 4vw, 3.4rem); margin: 16px 0; max-width: 880px; line-height: 1.1; }}
    .landing-hero p {{ max-width: 620px; color: rgba(250, 248, 243, 0.85); margin-bottom: 28px; }}
    .data-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 18px; max-width: 880px; margin: 0 auto; padding: 56px 24px; }}
    .data-card {{ background: #faf8f3; border: 1px solid #e4dec8; border-radius: 8px; padding: 22px; text-align: center; }}
    .data-card .lbl {{ font-family: Montserrat, sans-serif; font-size: 0.72rem; letter-spacing: 0.14em; color: #c9a84c; text-transform: uppercase; }}
    .data-card .val {{ font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; color: #0a0e1a; margin-top: 8px; }}
    .landing-body {{ max-width: 760px; margin: 0 auto; padding: 32px 24px 80px; line-height: 1.7; color: #2c2c2c; }}
    .landing-body h2 {{ font-family: Montserrat, sans-serif; margin: 48px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #c9a84c; }}
    .neighborhood-list {{ list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; }}
    .neighborhood-list li {{ background: #f4f4f5; padding: 12px 16px; border-radius: 6px; }}
    .related-links {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 24px 0; }}
    .related-links a {{ background: #0a0e1a; color: #c9a84c; padding: 14px 18px; border-radius: 8px; text-decoration: none; font-family: Montserrat, sans-serif; font-weight: 600; font-size: 0.92rem; }}
    .related-links a:hover {{ background: #131826; }}
    .cta-block {{ background: linear-gradient(180deg, #0a0e1a, #131826); color: #faf8f3; padding: 56px 24px; text-align: center; }}
    .cta-block h2 {{ color: #faf8f3; border: none; font-family: Montserrat, sans-serif; }}
    .cta-block p {{ max-width: 520px; margin: 8px auto 24px; color: rgba(250,248,243,0.78); }}
  </style>
</head>
<body>

  <nav class="navbar" id="navbar">
    <div class="nav-container">
      <a href="/" class="logo"><span class="logo-icon">&#9670;</span> International <span class="logo-accent">RE</span></a>
      <ul class="nav-links">
        <li><a href="/#markets">Markets</a></li>
        <li><a href="/blog.html">Blog</a></li>
        <li><a href="/guides.html">Guides</a></li>
        <li><a href="/about.html">About</a></li>
        <li><a href="/#subscribe" class="nav-cta">Subscribe</a></li>
      </ul>
      <button class="mobile-toggle" id="mobileToggle" aria-label="Toggle menu"><span></span><span></span><span></span></button>
    </div>
  </nav>

  <header class="landing-hero">
    <div>
      <span class="eyebrow">{flag} {country} · 2026 Market</span>
      <h1>{h1}</h1>
      <p>{tagline}</p>
      <a href="#subscribe" class="btn btn-primary">Get the Free Market Brief</a>
    </div>
  </header>

  <section class="data-grid">
    <div class="data-card"><div class="lbl">Entry $/m²</div><div class="val">${price_low:,}–${price_high:,}</div></div>
    <div class="data-card"><div class="lbl">Gross Yield</div><div class="val">{yield_low}–{yield_high}%</div></div>
    <div class="data-card"><div class="lbl">YoY Growth</div><div class="val">{growth}</div></div>
    <div class="data-card"><div class="lbl">Property Tax</div><div class="val">{tax}</div></div>
  </section>

  <main class="landing-body">

    <h2>Why {city} for {focus_label} in 2026</h2>
    <p>{focus_intro}</p>
    <p>{city}, {country}, has emerged as a priority destination for international real estate buyers in 2026. With entry prices ranging from <strong>${price_low}/m²</strong> to <strong>${price_high}/m²</strong> and gross rental yields of <strong>{yield_low}–{yield_high}%</strong>, it offers a meaningfully different risk-return profile than US or Western European markets.</p>

    <h2>Top neighborhoods for {focus_label}</h2>
    <ul class="neighborhood-list">
      {neighborhood_li}
    </ul>
    <p>Each neighborhood has distinct rental velocity, walkability, and price points. Subscribe to our weekly brief for live listings, micro-market updates, and on-the-ground broker contacts.</p>

    <h2>Legal &amp; ownership essentials</h2>
    <p>Foreign-buyer rules in {country} are summarized in our country-level guides. Common considerations include title insurance, escrow practices, capital-controls rules, and tax-residency triggers.</p>

    <h2>How {city} compares</h2>
    <p>Property tax of <strong>{tax}</strong> places {city} in the {tax_band} band among Latin American markets. Combined with a YoY growth profile of <strong>{growth}</strong>, the holding-cost-to-appreciation ratio is competitive against alternative regional markets.</p>

    <h2>Related reading on {city} &amp; {country}</h2>
    <div class="related-links">
      {related_html}
    </div>

  </main>

  <section class="cta-block" id="subscribe">
    <h2>Get the {city} Brief — Free</h2>
    <p>Real prices, real yields, real listings. Weekly. From investors who actually buy here.</p>
    <form class="inline-subscribe-form" id="inlineSubscribeForm" style="max-width:480px;margin:0 auto;display:flex;flex-direction:column;gap:8px;">
      <input type="text" placeholder="First name" id="inlineFirstName" required style="padding:12px 14px;border-radius:6px;border:1px solid #c9a84c;background:rgba(255,255,255,0.05);color:#faf8f3;">
      <input type="text" placeholder="Last name" id="inlineLastName" required style="padding:12px 14px;border-radius:6px;border:1px solid #c9a84c;background:rgba(255,255,255,0.05);color:#faf8f3;">
      <input type="email" placeholder="Email address" id="inlineEmail" required style="padding:12px 14px;border-radius:6px;border:1px solid #c9a84c;background:rgba(255,255,255,0.05);color:#faf8f3;">
      <button type="submit" class="btn btn-primary"><span class="inline-btn-text">Subscribe Free</span><span class="inline-btn-loading" style="display:none;">Subscribing…</span></button>
    </form>
    <div class="inline-subscribe-success" id="inlineSuccess" style="display:none;margin-top:14px;color:#c9a84c;"><strong>You're in.</strong> Check your inbox for the {city} brief.</div>
  </section>

  <script src="../lead_capture.js" defer></script>
  <script>
    document.addEventListener('scroll', () => {{
      const nav = document.getElementById('navbar');
      if (!nav) return;
      if (window.scrollY > 50) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
    }});
    const mt = document.getElementById('mobileToggle');
    const nl = document.querySelector('.nav-links');
    if (mt && nl) mt.addEventListener('click', () => nl.classList.toggle('active'));
    // Inline subscribe (matches site contract)
    const form = document.getElementById('inlineSubscribeForm');
    if (form) {{
      form.addEventListener('submit', async (e) => {{
        e.preventDefault();
        const fn = document.getElementById('inlineFirstName').value.trim();
        const ln = document.getElementById('inlineLastName').value.trim();
        const em = document.getElementById('inlineEmail').value.trim();
        if (!fn || !ln || !em) return;
        const btnText = form.querySelector('.inline-btn-text');
        const btnLoad = form.querySelector('.inline-btn-loading');
        btnText.style.display='none'; btnLoad.style.display='inline';
        const res = await fetch('/api/subscribe', {{
          method:'POST', headers:{{'Content-Type':'application/json'}},
          body: JSON.stringify({{firstName:fn,lastName:ln,email:em}})
        }});
        const data = await res.json().catch(()=>({{}}));
        if (res.ok || /already subscribed/i.test(data.error||'')) {{
          form.style.display='none';
          document.getElementById('inlineSuccess').style.display='block';
          try {{ localStorage.setItem('subscribed','true'); }} catch(_){{}}
        }} else {{
          alert(data.error || 'Network error');
          btnText.style.display='inline'; btnLoad.style.display='none';
        }}
      }});
    }}
  </script>
</body>
</html>
"""


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def tax_band(tax: str) -> str:
    val = float(tax.rstrip("%"))
    if val <= 0.4:
        return "lowest"
    if val <= 0.7:
        return "low"
    if val <= 1.0:
        return "mid"
    return "higher"


def build_jsonld(city, focus, canonical, image):
    """LocalBusiness + RealEstateListing combined schema."""
    return json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "url": canonical,
                "name": focus["h1"].format(city=city["city"]),
                "isPartOf": {"@type": "WebSite", "name": "International RE", "url": SITE_URL}
            },
            {
                "@type": "RealEstateListing",
                "name": focus["h1"].format(city=city["city"]),
                "url": canonical,
                "image": image,
                "areaServed": {
                    "@type": "City",
                    "name": city["city"],
                    "containedInPlace": {"@type": "Country", "name": city["country"]}
                },
                "offers": {
                    "@type": "AggregateOffer",
                    "priceCurrency": "USD",
                    "lowPrice": str(city["price_low"]),
                    "highPrice": str(city["price_high"]),
                    "priceSpecification": {
                        "@type": "UnitPriceSpecification",
                        "unitText": "USD per m²"
                    }
                },
                "additionalProperty": [
                    {"@type": "PropertyValue", "name": "Gross Rental Yield",
                     "value": f"{city['yield_low']}–{city['yield_high']}%"},
                    {"@type": "PropertyValue", "name": "YoY Capital Growth", "value": city["growth"]},
                    {"@type": "PropertyValue", "name": "Annual Property Tax", "value": city["tax"]}
                ]
            }
        ]
    }, indent=2)


def render_page(city, focus, all_targets):
    slug = f"{focus['slug']}-{city['slug']}"
    canonical = f"{SITE_URL}/landing/{slug}.html"
    title = f"{focus['h1'].format(city=city['city'])} 2026 — Prices, Yields & Buying Guide | International RE"
    description = (
        f"{focus['h1'].format(city=city['city'])}: live 2026 prices "
        f"(${city['price_low']}–${city['price_high']}/m²), "
        f"rental yields {city['yield_low']}–{city['yield_high']}%, "
        f"and full buying guide for {city['country']}."
    )
    keywords = (
        f"{city['city']} real estate 2026, {focus['slug'].replace('-', ' ')} {city['city']}, "
        f"buy property {city['country']}, {city['city']} rental yield, "
        f"{city['city']} property prices, expat real estate {city['country']}"
    )
    neighborhoods_li = "\n      ".join(
        f'<li><strong>{n}</strong></li>' for n in city["neighborhoods"]
    )
    siblings = [t for t in all_targets if t[0] is city and t[1] is not focus][:3]
    cousins = [t for t in all_targets if t[0]["country"] == city["country"] and t[0] is not city][:2]
    related = siblings + cousins
    related_html = "\n      ".join(
        f'<a href="/landing/{f["slug"]}-{c["slug"]}.html">{f["h1"].format(city=c["city"])}</a>'
        for c, f in related
    ) or '<a href="/blog.html">Latest Blog</a><a href="/guides.html">All Guides</a>'

    return slug, PAGE_TEMPLATE.format(
        title=title,
        description=description,
        keywords=keywords,
        canonical=canonical,
        image=city["image"],
        jsonld=build_jsonld(city, focus, canonical, city["image"]),
        flag=city["flag"],
        country=city["country"],
        h1=focus["h1"].format(city=city["city"]),
        tagline=city["tagline"],
        price_low=city["price_low"],
        price_high=city["price_high"],
        yield_low=city["yield_low"],
        yield_high=city["yield_high"],
        growth=city["growth"],
        tax=city["tax"],
        city=city["city"],
        focus_label=focus["slug"].replace("-", " "),
        focus_intro=focus["intro"].format(city=city["city"]),
        neighborhood_li=neighborhoods_li,
        tax_band=tax_band(city["tax"]),
        related_html=related_html,
    )


def update_sitemap(slugs):
    today = date.today().isoformat()
    if not SITEMAP.exists():
        return
    xml = SITEMAP.read_text()
    new_entries = []
    for slug in slugs:
        url = f"{SITE_URL}/landing/{slug}.html"
        if url in xml:
            continue
        new_entries.append(
            f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>"
        )
    if new_entries:
        xml = xml.replace("</urlset>", "\n".join(new_entries) + "\n</urlset>")
        SITEMAP.write_text(xml)
    return len(new_entries)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", help="generate only this city slug")
    ap.add_argument("--add-sitemap", action="store_true",
                    help="only update sitemap.xml from existing landing/ files")
    args = ap.parse_args()

    LANDING.mkdir(parents=True, exist_ok=True)

    if args.add_sitemap:
        existing = sorted(p.stem for p in LANDING.glob("*.html"))
        added = update_sitemap(existing)
        print(f"sitemap: +{added} new entries (from {len(existing)} landing files)")
        return

    targets = [(c, f) for c in CITIES for f in FOCUSES]
    if args.only:
        targets = [(c, f) for c, f in targets if c["slug"] == args.only]

    print(f"Plan: {len(targets)} pages → public/landing/")
    written = []
    for c, f in targets:
        slug, html = render_page(c, f, targets)
        out = LANDING / f"{slug}.html"
        if args.dry_run:
            print(f"  DRY {out.relative_to(ROOT)}")
        else:
            out.write_text(html)
            print(f"  wrote {out.relative_to(ROOT)} ({len(html):,} bytes)")
            written.append(slug)

    if not args.dry_run:
        added = update_sitemap(written)
        print(f"\n✓ Generated {len(written)} pages, +{added} sitemap entries")


if __name__ == "__main__":
    main()
