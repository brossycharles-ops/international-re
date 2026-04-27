#!/usr/bin/env python3
"""Unified JSON-LD injector. Replaces inject_listing_jsonld.py + inject_misc_jsonld.py.

Two modes per page (auto-applied):
- "listing": maps page → city slug → builds RealEstateListing schema from seo_generator.CITIES
- "misc": uses an inline schema dict

Idempotent — skips pages whose target schema type is already present."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
sys.path.insert(0, str(ROOT))
from seo_generator import CITIES  # noqa: E402

CITY_BY_SLUG = {c["slug"]: c for c in CITIES}

# page_rel → city slug (RealEstateListing)
LISTING_PAGES = {
    "guides/can-foreigners-buy-property-costa-rica.html": "tamarindo-costa-rica",
    "guides/medellin-neighborhood-guide-property-buyers-2026.html": "medellin-colombia",
    "guides/montevideo-rental-yield-analysis-2026.html": "punta-del-este-uruguay",
    "guides/panama-city-vs-san-jose-expat-investors-2026.html": "panama-city-panama",
    "quick-reads/airbnb-income-cartagena-colombia-2026.html": "medellin-colombia",
    "quick-reads/airbnb-income-playa-del-carmen.html": "playa-del-carmen-mexico",
    "quick-reads/airbnb-income-san-jose-costa-rica.html": "tamarindo-costa-rica",
    "quick-reads/best-neighborhoods-medellin-for-expats.html": "medellin-colombia",
    "quick-reads/cost-of-living-panama-city-per-month.html": "panama-city-panama",
    "blog/buenos-aires-best-value-2026.html": "buenos-aires-argentina",
    "blog/granada-nicaraguas-colonial-gem-2026.html": "san-juan-del-sur-nicaragua",
    "blog/guanacaste-hottest-market-2026.html": "tamarindo-costa-rica",
    "blog/medellin-real-estate-2026.html": "medellin-colombia",
    "blog/mendoza-wine-country-estates.html": "buenos-aires-argentina",
    "blog/san-juan-del-sur-affordable-beach.html": "san-juan-del-sur-nicaragua",
    "blog/santiago-supply-squeeze-2026.html": "santiago-chile",
    "blog/santiago-vs-lake-district.html": "santiago-chile",
    "tips/ecuador-dollar-beachfront.html": "cuenca-ecuador",
    "tips/medellin-property-vs-miami.html": "medellin-colombia",
    "tips/panama-no-capital-gains-tax.html": "panama-city-panama",
    "guide/panama-foreign-buyer-legal-guide.html": "panama-city-panama",
}

MISC_PAGES = {
    "blog.html": {"@context": "https://schema.org", "@type": "Blog",
        "name": "International RE Blog",
        "url": "https://www.internationalre.org/blog.html",
        "description": "Weekly deep-dives into Latin American and international real estate markets.",
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"}},
    "guides.html": {"@context": "https://schema.org", "@type": "CollectionPage",
        "name": "International RE Buying Guides",
        "url": "https://www.internationalre.org/guides.html",
        "description": "Step-by-step buying guides for foreign property buyers across Latin America."},
    "gallery.html": {"@context": "https://schema.org", "@type": "ImageGallery",
        "name": "International RE Photo Gallery",
        "url": "https://www.internationalre.org/gallery.html",
        "description": "Property and travel photography across Latin America."},
}


def build_listing(c: dict, page_path: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": f"{c['city']} ({c['country']}) — Representative Property Listings",
        "url": f"https://www.internationalre.org/{page_path}",
        "description": f"Representative price and yield range for residential property in {c['city']}, {c['country']}. {c['tagline']}",
        "address": {"@type": "PostalAddress", "addressLocality": c["city"], "addressCountry": c["country"]},
        "image": c["image"],
        "offers": {"@type": "AggregateOffer", "priceCurrency": "USD",
                   "lowPrice": c["price_low"], "highPrice": c["price_high"], "offerCount": 25},
        "additionalProperty": [
            {"@type": "PropertyValue", "name": "Rental Yield Low",  "value": f"{c['yield_low']}%"},
            {"@type": "PropertyValue", "name": "Rental Yield High", "value": f"{c['yield_high']}%"},
            {"@type": "PropertyValue", "name": "Annual Appreciation", "value": f"{c['growth']}%"},
            {"@type": "PropertyValue", "name": "Property Tax", "value": f"{c['tax']}%"},
        ],
    }


def inject(rel: str, schema: dict, marker: str) -> str:
    p = PUB / rel
    if not p.exists():
        return f"missing {rel}"
    html = p.read_text(encoding="utf-8")
    if marker in html:
        return f"skip {rel} (has {marker})"
    block = '<script type="application/ld+json">\n' + json.dumps(schema, indent=2) + "\n</script>"
    new = html.replace("</head>", block + "\n</head>", 1)
    if new == html:
        return f"no </head>: {rel}"
    p.write_text(new, encoding="utf-8")
    return f"injected {rel}"


changed = 0
for rel, slug in LISTING_PAGES.items():
    msg = inject(rel, build_listing(CITY_BY_SLUG[slug], rel), "RealEstateListing")
    print(" ", msg)
    if msg.startswith("injected"):
        changed += 1

for rel, schema in MISC_PAGES.items():
    msg = inject(rel, schema, f'"@type": "{schema["@type"]}"')
    print(" ", msg)
    if msg.startswith("injected"):
        changed += 1

print(f"\n✓ {changed} pages updated")
